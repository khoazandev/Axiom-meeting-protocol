import json
import logging
import numpy as np
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend import database, models
from src.backend.api.v1.router import api_v1_router, v1_router
from src.backend.core.exceptions import register_exception_handlers
from src.backend.core.metrics import setup_metrics_router
from src.backend.realtime_stt import (
    SAMPLE_RATE,
    clean_and_analyze,
    get_whisper_model,
    is_speech,
    process_full_translation_pipeline,
    process_full_translation_pipeline_streaming,
)
from src.backend.ct2_translator import preload_models, is_ct2_available

database.Base.metadata.create_all(bind=database.engine)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    preload_models(vi_en=True, en_vi=True)
    yield

app = FastAPI(title="Smart Meeting AI API", lifespan=lifespan)
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


class MeetingCreate(BaseModel):
    title: str
    agenda: str
    duration_minutes: int


class MeetingResponse(MeetingCreate):
    id: int
    is_active: bool

    model_config = {"from_attributes": True}


class TranslateRequest(BaseModel):
    text: str


@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Meeting AI Backend (DX-OS)"}


@app.get("/api/stt/status")
def stt_status():
    """Report availability of STT backend services for frontend auto-detection."""
    from src.backend.realtime_stt import get_whisper_model, get_silero_vad, check_ollama_online
    return {
        "whisper_available": get_whisper_model() is not None,
        "vad_available": get_silero_vad() is not None,
        "ollama_available": check_ollama_online(),
        "ct2_available": is_ct2_available(),
    }


@app.post("/api/meetings/", response_model=MeetingResponse)
def create_meeting(meeting: MeetingCreate, db: Session = Depends(database.get_db)):
    if not meeting.agenda or len(meeting.agenda.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="Quy trình lỗi: Bắt buộc phải có Agenda chi tiết (ít nhất 20 ký tự) để tạo lịch họp.",
        )

    db_meeting = models.Meeting(**meeting.dict())
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


@app.get("/api/meetings/", response_model=List[MeetingResponse])
def read_meetings(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    meetings = db.query(models.Meeting).offset(skip).limit(limit).all()
    return meetings


@app.post("/api/stt/translate")
def translate_text(req: TranslateRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")
    
    result = process_full_translation_pipeline(req.text)
    if not result:
        raise HTTPException(status_code=500, detail="Lỗi khi xử lý luồng STT translation")
    return result


@app.websocket("/ws/realtime-stt")
async def websocket_realtime_stt(websocket: WebSocket):
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

                                    await websocket.send_json({
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
                                    })
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


# ---------------------------------------------------------------------------
# Meeting Events WebSocket — per-room event broadcasting
# ---------------------------------------------------------------------------
@app.websocket("/ws/meeting-events/{meeting_id}")
async def websocket_meeting_events(websocket: WebSocket, meeting_id: str):
    """
    WebSocket for meeting room events.

    Clients connect to receive real-time events:
    - `tasks_preview`: New follow-up tasks extracted by AI
    - `meeting_ended`: Meeting has been ended by host (includes summary)
    """
    from src.backend.services.meeting_events import meeting_events_manager

    await meeting_events_manager.connect(meeting_id, websocket)
    try:
        while True:
            # Keep connection alive — client sends pings, we just wait
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break
    except WebSocketDisconnect:
        logging.info("Meeting events WS disconnected: meeting=%s", meeting_id)
    except Exception as e:
        logging.error("Meeting events WS error for %s: %s", meeting_id, e)
    finally:
        meeting_events_manager.disconnect(meeting_id, websocket)
        try:
            await websocket.close()
        except Exception:
            pass
