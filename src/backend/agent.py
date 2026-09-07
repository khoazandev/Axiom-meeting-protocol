import asyncio
import json
import logging
import os
from typing import Dict, Optional, Set
import numpy as np
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import AutoSubscribe, JobContext, JobRequest, WorkerOptions, cli, stt
from livekit.agents.stt import StreamAdapter
from livekit import rtc
from livekit.plugins import openai, silero
from src.backend import local_ai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("babel-fish-agent")
logger.setLevel(logging.INFO)

class AgentState:
    def __init__(self, ctx: JobContext):
        self.ctx = ctx
        self.participant_langs: Dict[str, str] = {}
        self.participant_prefs: Dict[str, dict] = {}
        
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        if not ollama_url.endswith("/v1"):
            ollama_url = f"{ollama_url.rstrip('/')}/v1"
            
        self.llm_plugin = openai.LLM(
            model=os.getenv("TRANSLATION_MODEL", "translategemma:4b"),
            base_url=ollama_url,
            api_key="ollama",
            temperature=0.0,
            timeout=15.0
        )


LANGUAGE_MAP = {
    "en": ("English", "en"),
    "vi": ("Vietnamese", "vi"),
    "ja": ("Japanese", "ja"),
    "ko": ("Korean", "ko"),
    "zh": ("Chinese", "zh"),
    "fr": ("French", "fr"),
    "de": ("German", "de"),
    "es": ("Spanish", "es"),
    "ru": ("Russian", "ru"),
    "it": ("Italian", "it"),
    "pt": ("Portuguese", "pt"),
    "th": ("Thai", "th"),
    "id": ("Indonesian", "id"),
    "hi": ("Hindi", "hi"),
    "ar": ("Arabic", "ar"),
}

async def process_translation(state: AgentState, source_text: str, source_participant: rtc.RemoteParticipant, target_lang: str, source_lang: str = "en"):
    """Translate text quickly for realtime subtitles without TTS overhead"""
    source_lang_name, _ = LANGUAGE_MAP.get(source_lang, (source_lang.capitalize(), source_lang))
    target_lang_name, _ = LANGUAGE_MAP.get(target_lang, (target_lang.capitalize(), target_lang))
    logger.info(f"Translating ({source_lang} -> {target_lang}): {source_text}")

    prompt = (
        f"You are a professional realtime subtitle translator. Directly translate the input text to {target_lang_name}.\n"
        f"Output ONLY the direct translation without quotes, greetings, or explanations:\n\n{source_text}"
    )
    try:
        from livekit.agents.llm import ChatContext
        chat_ctx = ChatContext()
        chat_ctx.add_message(role="user", content=prompt)
        stream = state.llm_plugin.chat(chat_ctx=chat_ctx)
        
        translated_text = ""
        async for chunk in stream:
            if chunk.delta and chunk.delta.content:
                translated_text += chunk.delta.content
        
        translated_text = translated_text.strip().strip('"').strip("'")
        if not translated_text:
            return

        # Publish translation to frontend via DataChannel
        translation_payload = {
            "type": "translation",
            "original_text": source_text,
            "translated_text": translated_text,
            "from_language": source_lang,
            "to_language": target_lang,
            "participant_identity": source_participant.identity,
            "participant_name": source_participant.name or source_participant.identity
        }
        await state.ctx.room.local_participant.publish_data(
            json.dumps(translation_payload).encode("utf-8"),
            topic="translations"
        )
        
        # Also broadcast to 'records' topic so Records tab and subtitles show translation immediately
        record_update = {
            "type": "translation_record",
            "participant_identity": source_participant.identity,
            "participant_name": source_participant.name or source_participant.identity,
            "original_text": source_text,
            "translated_text": translated_text,
            "from_language": source_lang,
            "to_language": target_lang,
            "is_final": True
        }
        await state.ctx.room.local_participant.publish_data(
            json.dumps(record_update).encode("utf-8"),
            topic="records"
        )
        logger.info(f"Translation finished ({source_lang}->{target_lang}): '{translated_text}'")
    except Exception as e:
        logger.error(f"Translation Pipeline Error for {target_lang}: {e}")

async def entrypoint(ctx: JobContext):
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    load_dotenv(dotenv_path, override=True)
    logger.info(f"Babel Fish Agent starting... API KEY starts with: {os.getenv('OPENAI_API_KEY', '')[:10]}")
    
    # Connect immediately to prevent LiveKit 10s watchdog timeout
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    state = AgentState(ctx)

    models_ready = asyncio.Event()
    async def load_models_task():
        logger.info("Preloading STT and VAD models in background thread...")
        await asyncio.to_thread(local_ai.preload_models)
        models_ready.set()
        logger.info("Models preloaded successfully.")
        
    asyncio.create_task(load_models_task())

    # Initialize preferences for participants already in the room
    logger.info(f"Agent connected. Remote participants: {len(ctx.room.remote_participants)}")
    for p in ctx.room.remote_participants.values():
        if (
            p.identity.startswith("agent-")
            or "agent" in p.identity.lower()
            or getattr(p, "kind", None) == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT
        ):
            logger.info(f"Skipping agent participant: {p.identity}")
            continue

        logger.info(f"Found participant: {p.identity}, attributes: {p.attributes}, metadata: {p.metadata}")
        if p.attributes:
            enabled = p.attributes.get("translation_enabled") == "true"
            source = p.attributes.get("translation_source", "")
            state.participant_prefs[p.identity] = {
                "translation_enabled": enabled,
                "translation_source": source
            }
            logger.info(f"Initial prefs for {p.identity}: {state.participant_prefs[p.identity]}")

    # target_lang: Ngôn ngữ user đang sử dụng và là ngôn ngữ đích muốn dịch ra
    def get_participant_language(p: rtc.RemoteParticipant) -> str:
        """Extract language from participant metadata or fallback to 'vi'"""
        try:
            if p and p.metadata:
                meta = json.loads(p.metadata)
                return meta.get("target_lang", "vi")
        except:
            pass
        return "vi"

    @ctx.room.on("participant_attributes_changed")
    def on_attributes_changed(changed_attributes: dict, participant: rtc.RemoteParticipant):
        attrs = participant.attributes
        enabled = attrs.get("translation_enabled") == "true"
        source = attrs.get("translation_source", "")
        state.participant_prefs[participant.identity] = {
            "translation_enabled": enabled,
            "translation_source": source
        }
        logger.info(f"Updated preferences for {participant.identity}: {state.participant_prefs[participant.identity]}")

    async def handle_track(track: rtc.Track, participant: rtc.RemoteParticipant):
        logger.info(f"Waiting for AI models to finish loading before processing track from {participant.identity}...")
        await models_ready.wait()
        
        lang = get_participant_language(participant)
        logger.info(f"Participant {participant.identity} using language: {lang}")
        audio_stream = rtc.AudioStream(track)
        
        # Create STT plugin with automatic language detection (language=None)
        stt_plugin = local_ai.RealtimeStreamAdapter(
            stt=local_ai.FasterWhisperSTT(language=None),
            vad=local_ai.get_vad()
        )
        stt_stream = stt_plugin.stream()
        
        async def feed_stt():
            try:
                frame_count = 0
                async for event in audio_stream:
                    if frame_count == 0:
                        logger.info(f"Received first audio frame. Sample rate: {event.frame.sample_rate}, Channels: {event.frame.num_channels}")
                    frame_count += 1
                    if frame_count % 100 == 0:
                        pcm = np.frombuffer(event.frame.data, dtype=np.int16)
                        rms = float(np.sqrt(np.mean(pcm.astype(np.float32)**2))) if len(pcm) > 0 else 0.0
                        max_amp = int(np.max(np.abs(pcm))) if len(pcm) > 0 else 0
                        logger.info(f"Pushed {frame_count} frames to STT for {participant.identity} (frame RMS={rms:.2f}, peak={max_amp})")
                    stt_stream.push_frame(event.frame)
                stt_stream.end_input()
            except Exception as e:
                logger.error(f"Error in feed_stt for {participant.identity}: {e}", exc_info=True)
                
        asyncio.create_task(feed_stt())

        try:
            async for event in stt_stream:
                is_final = event.type == stt.SpeechEventType.FINAL_TRANSCRIPT
                is_interim = event.type == stt.SpeechEventType.INTERIM_TRANSCRIPT
                
                if is_final or is_interim:
                    if not event.alternatives:
                        continue
                    text = event.alternatives[0].text
                    
                    logger.info(f"STT Event: type={event.type}, text='{text}'")
                    
                    if not text.strip():
                        continue
                    
                    detected_lang = getattr(event.alternatives[0], "language", None) or lang or "vi"
                    if detected_lang not in ("vi", "en"):
                        detected_lang = "vi"

                    # 1. Pipeline 1: Original Transcript -> Records
                    record_payload = {
                        "type": "original_transcript",
                        "participant_identity": participant.identity,
                        "participant_name": participant.name or participant.identity,
                        "original_text": text,
                        "language": detected_lang,
                        "is_final": is_final
                    }
                    logger.info(f"Publishing record via DataChannel (topic=records): {record_payload}")
                    await ctx.room.local_participant.publish_data(
                        json.dumps(record_payload).encode("utf-8"),
                        topic="records"
                    )
                    
                    # 2. Pipeline 2: Speech Translation (Automatic Bilingual: vi <-> en)
                    if is_final:
                        target_lang = "en" if detected_lang == "vi" else "vi"
                        logger.info(f"Auto-translating for {participant.identity}: {detected_lang} -> {target_lang}")
                        asyncio.create_task(
                            process_translation(state, text, participant, target_lang, detected_lang)
                        )
        except Exception as e:
            logger.error(f"Error in stt_stream processing for {participant.identity}: {e}", exc_info=True)


    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        # Strictly ignore audio tracks from any agent or TTS track to prevent feedback loops
        if (
            participant.identity.startswith("agent-")
            or "agent" in participant.identity.lower()
            or getattr(participant, "kind", None) == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT
        ):
            logger.info(f"Ignoring audio from agent participant: {participant.identity}")
            return

        if publication and publication.name and (publication.name.startswith("tts_") or "tts" in publication.name.lower()):
            logger.info(f"Ignoring TTS publication track: {publication.name}")
            return

        if track.kind == rtc.TrackKind.KIND_AUDIO:
            logger.info(f"Subscribed to audio track from {participant.identity}")
            
            # Initial setup of prefs if they have any
            attrs = participant.attributes
            if attrs:
                enabled = attrs.get("translation_enabled") == "true"
                source = attrs.get("translation_source", "")
                state.participant_prefs[participant.identity] = {
                    "translation_enabled": enabled,
                    "translation_source": source
                }
                
            asyncio.create_task(handle_track(track, participant))

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
