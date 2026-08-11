import json
import logging
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend import database, models
from src.backend.api.v1.router import api_v1_router, v1_router
from src.backend.core.exceptions import register_exception_handlers
from src.backend.core.metrics import setup_metrics_router

# AI modules — optional, only available when [ai] extras are installed
try:
    import numpy as np

    from src.backend.ct2_translator import is_ct2_available, preload_models
    from src.backend.realtime_stt import (
        SAMPLE_RATE,
        clean_and_analyze,
        get_whisper_model,
        is_speech,
        process_full_translation_pipeline,
        process_full_translation_pipeline_streaming,
    )

    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    logging.warning(
        "AI packages not installed. STT/Translation features disabled. Install with: uv pip install .[ai]"
    )

database.Base.metadata.create_all(bind=database.engine)

from contextlib import asynccontextmanager

from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.security import hash_password


def seed_dev_data():
    with database.SessionLocal() as db:
        admin_email = "admin@axiom.com"
        admin = db.query(models.User).filter(models.User.email == admin_email).first()
        if not admin:
            logging.info("Seeding default admin user: admin@axiom.com / password123")
            admin = models.User(
                email=admin_email,
                password_hash=hash_password("password123"),
                full_name="System Admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

            org = models.Organization(
                name="Axiom Local Dev",
                created_by_id=admin.id,
            )
            db.add(org)
            db.commit()
            db.refresh(org)

            owner_role = models.Role(
                name="Owner",
                organization_id=org.id,
                scope=models.RoleScopeEnum.ORGANIZATION,
                is_system=True,
            )
            db.add(owner_role)
            db.commit()
            db.refresh(owner_role)

            member = models.OrganizationMember(
                organization_id=org.id,
                user_id=admin.id,
                role_id=owner_role.id,
                status=models.OrgMemberStatusEnum.ACTIVE,
            )
            db.add(member)
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if AI_AVAILABLE:
        preload_models(vi_en=True, en_vi=True)
    seed_dev_data()
    yield


app = FastAPI(title="Smart Meeting AI API", lifespan=lifespan)

# Register exception handlers, metrics, and V1 API routers
register_exception_handlers(app)
setup_metrics_router(app)
app.include_router(v1_router)
app.include_router(api_v1_router)

# Setup CORS cho Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranslateRequest(BaseModel):
    text: str


@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Meeting AI Backend (DX-OS)"}


@app.get("/api/stt/status")
def stt_status():
    """Report availability of STT backend services for frontend auto-detection."""
    if not AI_AVAILABLE:
        return {
            "whisper_available": False,
            "vad_available": False,
            "ollama_available": False,
            "ct2_available": False,
            "ai_installed": False,
        }
    from src.backend.realtime_stt import check_ollama_online, get_silero_vad, get_whisper_model

    return {
        "whisper_available": get_whisper_model() is not None,
        "vad_available": get_silero_vad() is not None,
        "ollama_available": check_ollama_online(),
        "ct2_available": is_ct2_available(),
        "ai_installed": True,
    }


@app.post("/api/stt/translate")
def translate_text(req: TranslateRequest):
    if not AI_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI packages not installed")
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")

    result = process_full_translation_pipeline(req.text)
    if not result:
        raise HTTPException(status_code=500, detail="Lỗi khi xử lý luồng STT translation")
    return result


@app.websocket("/ws/realtime-stt")
async def websocket_realtime_stt(websocket: WebSocket):
    if not AI_AVAILABLE:
        await websocket.accept()
        await websocket.send_json({"error": "AI packages not installed. STT unavailable."})
        await websocket.close()
        return

    await websocket.accept()
    logging.info("WebSocket Client connected for Real-Time STT")
    audio_buffer = np.array([], dtype=np.float32)

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            if "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                    if data.get("type") == "translate" and data.get("text"):
                        await process_full_translation_pipeline_streaming(
                            data.get("text"), websocket.send_json
                        )
                except WebSocketDisconnect:
                    logging.info("WebSocket disconnected during streaming")
                    break
                except Exception as e:
                    logging.error(f"Error handling JSON websocket message: {e}")
                    try:
                        await websocket.send_json({"error": str(e)})
                    except Exception:
                        break

            elif "bytes" in message and message["bytes"]:
                raw_bytes = message["bytes"]
                try:
                    chunk = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                    audio_buffer = np.append(audio_buffer, chunk)

                    if len(audio_buffer) >= SAMPLE_RATE * 2:
                        speech_detected, energy = is_speech(audio_buffer)
                        if speech_detected:
                            whisper = get_whisper_model()
                            if whisper is not None:
                                vi_segs, _ = whisper.transcribe(
                                    audio_buffer, beam_size=1, language="vi", task="transcribe"
                                )
                                vi_text = " ".join([s.text for s in vi_segs]).strip()

                                en_segs, _ = whisper.transcribe(
                                    audio_buffer, beam_size=1, language="vi", task="translate"
                                )
                                en_text = " ".join([s.text for s in en_segs]).strip()

                                if vi_text or en_text:
                                    import uuid

                                    analysis = clean_and_analyze(vi_text) if vi_text else {}
                                    polished_vi = analysis.get("polished_text", vi_text)
                                    tech_terms = analysis.get("technical_terms", [])
                                    lang = analysis.get("language_detected", "Vietnamese")

                                    await websocket.send_json(
                                        {
                                            "type": "bilingual_translation_stream",
                                            "id": str(uuid.uuid4())[:8],
                                            "original_text": vi_text,
                                            "polished_text": polished_vi,
                                            "detected_lang": lang,
                                            "context_summary": "",
                                            "technical_terms": tech_terms,
                                            "en_text": en_text,
                                            "vi_text": polished_vi,
                                            "validation_notes": "Whisper translate",
                                            "is_final": True,
                                        }
                                    )
                            else:
                                logging.info("VAD detected speech chunk, whisper unavailable")
                        audio_buffer = np.array([], dtype=np.float32)
                except WebSocketDisconnect:
                    logging.info("WebSocket disconnected during audio streaming")
                    break
                except Exception as e:
                    logging.error(f"Error processing audio binary bytes: {e}")
                    audio_buffer = np.array([], dtype=np.float32)

    except WebSocketDisconnect:
        logging.info("WebSocket Client disconnected")
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
