import asyncio
import json
import logging
import os
from typing import Dict, Optional, Set
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
        # Map participant_identity -> language_used_in_call
        self.participant_langs: Dict[str, str] = {}
        # Map participant_identity -> { "translation_enabled": bool, "translation_source": str }
        self.participant_prefs: Dict[str, dict] = {}
        
        # TTS Audio sources per target language
        self.tts_sources: Dict[str, rtc.AudioSource] = {}
        self.tts_tracks: Dict[str, rtc.LocalAudioTrack] = {}
        
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        if not ollama_url.endswith("/v1"):
            ollama_url = f"{ollama_url.rstrip('/')}/v1"
            
        self.llm_plugin = openai.LLM(
            model="translategemma:4b",
            base_url=ollama_url,
            api_key="ollama"
        )
        
        # To avoid overlapping TTS in the same language, we could use queues, 
        # but for simplicity we'll just await a lock per target language
        self.tts_locks: Dict[str, asyncio.Lock] = {}

    async def get_or_create_tts_track(self, lang: str) -> rtc.AudioSource:
        if lang not in self.tts_sources:
            logger.info(f"Creating new AudioSource for {lang}")
            audio_source = rtc.AudioSource(24000, 1)
            agent_track = rtc.LocalAudioTrack.create_audio_track(f"tts_{lang}", audio_source)
            options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
            logger.info(f"Publishing track for {lang}")
            await self.ctx.room.local_participant.publish_track(agent_track, options)
            logger.info(f"Successfully published track for {lang}")
            self.tts_sources[lang] = audio_source
            self.tts_tracks[lang] = agent_track
            self.tts_locks[lang] = asyncio.Lock()
        return self.tts_sources[lang]


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
    """Translate and play TTS for a specific target language using TranslateGemma structure"""
    logger.info(f"Translating ({source_lang} -> {target_lang}): {source_text}")

    source_lang_name, source_lang_code = LANGUAGE_MAP.get(source_lang, (source_lang.capitalize(), source_lang))
    target_lang_name, target_lang_code = LANGUAGE_MAP.get(target_lang, (target_lang.capitalize(), target_lang))

    # 1. Translate using TranslateGemma Prompt Format
    prompt = (
        f"You are a professional {source_lang_name} ({source_lang_code}) to {target_lang_name} ({target_lang_code}) translator. "
        f"Your goal is to accurately convey the meaning and nuances of the original {source_lang_name} text while adhering to {target_lang_name} grammar, vocabulary, and cultural sensitivities.\n"
        f"Produce only the {target_lang_name} translation, without any additional explanations or commentary. "
        f"Please translate the following {source_lang_name} text into {target_lang_name}:\n\n\n"
        f"{source_text}"
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
        
        translated_text = translated_text.strip()
        logger.info(f"Translated to {target_lang}: {translated_text}")
        
        # 2. Get TTS Source and lock
        logger.info(f"Getting TTS track for {target_lang}...")
        audio_source = await state.get_or_create_tts_track(target_lang)
        logger.info(f"Got TTS track for {target_lang}...")
        lock = state.tts_locks[target_lang]

        async with lock:
            # 3. Fire tts_started event via DataChannel
            start_payload = {
                "type": "tts_started",
                "track": f"tts_{target_lang}",
                "source_participant_id": source_participant.identity,
                "target_language": target_lang
            }
            logger.info(f"Publishing tts_started data...")
            await state.ctx.room.local_participant.publish_data(
                json.dumps(start_payload).encode("utf-8"),
                topic="translation_events"
            )
            
            # 4. Synthesize and play using Edge-TTS
            await local_ai.synthesize_edge_tts(translated_text, target_lang, audio_source)
            
            # Allow a tiny buffer before ending
            await asyncio.sleep(0.5)
            
            # 5. Fire tts_ended event
            end_payload = {
                "type": "tts_ended",
                "track": f"tts_{target_lang}",
                "source_participant_id": source_participant.identity,
                "target_language": target_lang
            }
            await state.ctx.room.local_participant.publish_data(
                json.dumps(end_payload).encode("utf-8"),
                topic="translation_events"
            )
            
    except Exception as e:
        logger.error(f"Translation Pipeline Error for {target_lang}: {e}")

async def entrypoint(ctx: JobContext):
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    load_dotenv(dotenv_path, override=True)
    logger.info(f"Babel Fish Agent starting... API KEY starts with: {os.getenv('OPENAI_API_KEY', '')[:10]}")
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    state = AgentState(ctx)

    # Initialize preferences for participants already in the room
    logger.info(f"Agent connected. Remote participants: {len(ctx.room.remote_participants)}")
    for p in ctx.room.remote_participants.values():
        logger.info(f"Found participant: {p.identity}, attributes: {p.attributes}, metadata: {p.metadata}")
        if p.attributes:
            enabled = p.attributes.get("translation_enabled") == "true"
            source = p.attributes.get("translation_source", "")
            state.participant_prefs[p.identity] = {
                "translation_enabled": enabled,
                "translation_source": source
            }
            logger.info(f"Initial prefs for {p.identity}: {state.participant_prefs[p.identity]}")

    def get_participant_language(p: rtc.RemoteParticipant) -> str:
        """Extract language from participant metadata or fallback to 'vi'"""
        try:
            if p.metadata:
                meta = json.loads(p.metadata)
                return meta.get("language_used_in_call", "vi")
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
        lang = get_participant_language(participant)
        logger.info(f"Participant {participant.identity} using language: {lang}")
        
        audio_stream = rtc.AudioStream(track)
        # Create STT plugin specific to this user's language using local Faster-Whisper
        stt_plugin = local_ai.RealtimeStreamAdapter(
            stt=local_ai.FasterWhisperSTT(model_size="large-v3", language=lang),
            vad=silero.VAD.load(min_silence_duration=2.5)
        )
        stt_stream = stt_plugin.stream()
        
        async def feed_stt():
            async for event in audio_stream:
                stt_stream.push_frame(event.frame)
            stt_stream.end_input()
                
        asyncio.create_task(feed_stt())

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
                
                detected_lang = getattr(event.alternatives[0], "language", None) or lang

                # 1. Pipeline 1: Original Transcript -> Records
                record_payload = {
                    "type": "original_transcript",
                    "participant_identity": participant.identity,
                    "original_text": text,
                    "language": detected_lang,
                    "is_final": is_final
                }
                await ctx.room.local_participant.publish_data(
                    json.dumps(record_payload).encode("utf-8"),
                    topic="records"
                )
                
                # 2. Pipeline 2: Speech Translation (ONLY when finalized)
                if is_final:
                    # Find all users who want translation FROM this language
                    target_langs = set()
                    logger.info(f"Checking targets for lang {detected_lang}. Prefs: {state.participant_prefs}")
                    for pid, pref in state.participant_prefs.items():
                        if pref.get("translation_enabled") and pref.get("translation_source") == detected_lang:
                            # What is their target language?
                            p = ctx.room.remote_participants.get(pid)
                            if p:
                                t_lang = get_participant_language(p)
                                logger.info(f"Participant {pid} wants translation. Target lang: {t_lang}")
                                # Only translate if target != source
                                if t_lang != detected_lang:
                                    target_langs.add(t_lang)
                            else:
                                logger.warning(f"Participant {pid} not found in remote_participants!")
                    
                    logger.info(f"Target languages found: {target_langs}")
                    for t_lang in target_langs:
                        logger.info(f"Dispatching translation ({detected_lang} -> {t_lang})")
                        asyncio.create_task(process_translation(state, text, participant, t_lang, source_lang=detected_lang))

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
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
