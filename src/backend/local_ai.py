import asyncio
import io
import edge_tts
import av
import numpy as np
from typing import Optional, Union, List
from livekit import rtc
from livekit.agents import stt
from faster_whisper import WhisperModel

import os

_global_whisper_model = None
_global_vad = None

def preload_models():
    """Load models in a separate thread to avoid blocking event loop"""
    global _global_whisper_model, _global_vad
    model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
    cpu_threads = int(os.getenv("WHISPER_CPU_THREADS", "6"))
    if _global_whisper_model is None:
        _global_whisper_model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=cpu_threads)
    if _global_vad is None:
        from livekit.plugins import silero
        _global_vad = silero.VAD.load(
            min_speech_duration=0.25,
            min_silence_duration=0.5,
            activation_threshold=0.6,
        )

def get_vad():
    global _global_vad
    if _global_vad is None:
        preload_models()
    return _global_vad

class FasterWhisperSTT(stt.STT):
    def __init__(self, model_size: Optional[str] = None, language: Optional[str] = None):
        super().__init__(capabilities=stt.STTCapabilities(streaming=False, interim_results=False))
        self._language = language
        self._initial_prompt = (
            "Cuộc họp trao đổi công việc, dự án công nghệ, báo cáo tiến độ, sprint Jira. "
            "Song ngữ tiếng Việt và English. Giao tiếp rõ ràng, chính xác."
        )
        
        target_model = model_size or os.getenv("WHISPER_MODEL_SIZE", "small")
        cpu_threads = int(os.getenv("WHISPER_CPU_THREADS", "6"))
        global _global_whisper_model
        if _global_whisper_model is None:
            _global_whisper_model = WhisperModel(target_model, device="cpu", compute_type="int8", cpu_threads=cpu_threads)
        self._model = _global_whisper_model

    async def _recognize_impl(
        self,
        buffer,
        *,
        language: Optional[str] = None,
        conn_options = None,
    ) -> stt.SpeechEvent:
        if isinstance(buffer, list):
            frames = buffer
        else:
            frames = [buffer]
            
        if not frames:
            # Handle empty buffer
            return stt.SpeechEvent(
                type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                alternatives=[stt.SpeechData(text="", language=language or self._language or "vi", confidence=0.0)]
            )
            
        input_rate = frames[0].sample_rate
        resampler = rtc.AudioResampler(input_rate, 16000, num_channels=1)
        resampled_frames = []
        for f in frames:
            resampled_frames.extend(resampler.push(f))
        resampled_frames.extend(resampler.flush())
        
        audio_data = b"".join(f.data for f in resampled_frames)
        pcm_s16 = np.frombuffer(audio_data, dtype=np.int16)
        audio_float32 = pcm_s16.astype(np.float32) / 32768.0

        lang_code = language or self._language
        
        import logging
        logger = logging.getLogger("local-ai")
        
        # Run transcription in a thread to not block event loop
        loop = asyncio.get_event_loop()
        def transcribe():
            dur_sec = len(audio_float32) / 16000.0
            rms = float(np.sqrt(np.mean(audio_float32**2))) if len(audio_float32) > 0 else 0.0
            if rms < 0.008 or dur_sec < 0.35:
                logger.info(f"Audio energy too low or too short (RMS={rms:.5f}, dur={dur_sec:.2f}s), skipping silence.")
                return "", "vi"

            logger.info(f"Transcribe thread starting (duration: {dur_sec:.2f}s, RMS={rms:.4f}, lang_hint={lang_code})...")
            try:
                segments, info = self._model.transcribe(
                    audio_float32,
                    beam_size=1,
                    best_of=1,
                    temperature=0.0,
                    language=lang_code,
                    condition_on_previous_text=False,
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=350),
                    no_speech_threshold=0.5,
                    log_prob_threshold=-0.8,
                    compression_ratio_threshold=2.2,
                    initial_prompt=self._initial_prompt
                )
                
                # Check bilingual language: STRICTLY 'vi' or 'en'
                detected_raw = getattr(info, "language", None) or lang_code or "vi"
                all_probs = dict(getattr(info, "all_language_probs", []) or [])
                vi_prob = all_probs.get("vi", 0.0)
                en_prob = all_probs.get("en", 0.0)
                
                if detected_raw in ("vi", "en"):
                    detected = detected_raw
                else:
                    # Detected other language (e.g., 'zh', 'fr', 'ja', 'cy', 'ko')
                    if max(vi_prob, en_prob) < 0.20:
                        logger.info(f"Discarding foreign/hallucinated speech (detected={detected_raw}, vi_prob={vi_prob:.2f}, en_prob={en_prob:.2f})")
                        return "", "vi"
                    detected = "vi" if vi_prob >= en_prob else "en"

                valid_segments = []
                for segment in segments:
                    if getattr(segment, "no_speech_prob", 0) > 0.5:
                        continue
                    valid_segments.append(segment.text)
                res = " ".join(valid_segments).strip()
            except Exception as e:
                logger.error(f"Error in transcribe: {e}", exc_info=True)
                return "", "vi"

            # 1. Script filter: discard any CJK, Cyrillic, Arabic scripts immediately
            import re
            if re.search(r'[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff]', res):
                logger.info(f"Discarded non-Latin/Vietnamese script: '{res}'")
                return "", detected

            # 2. Hallucination filter for silence in Vietnamese & English
            hallucinations = [
                "hãy subscribe cho kênh ghiền mì gõ",
                "hãy subscribe cho kênh",
                "cảm ơn các bạn đã theo dõi",
                "chúc các bạn xem video vui vẻ",
                "thank you for watching",
                "thanks for watching",
                "subtitles by",
                "see you next time",
                "see you in the next",
                "see you again",
                "oh god damn",
                "oh, god, damn",
                "oh my god",
                "c'est lui",
                "bye",
                "bye!",
                "bye bye",
                "you",
            ]
            lower_res = res.lower().strip()
            if any(h == lower_res or lower_res.startswith(h) for h in hallucinations) and rms < 0.035:
                logger.info(f"Suppressed silence hallucination: '{res}'")
                return "", detected

            # Filter out single characters or punctuation
            cleaned = re.sub(r'[^\w\s]', '', res).strip()
            if len(cleaned) <= 1:
                logger.info(f"Suppressed single char / punctuation hallucination: '{res}'")
                return "", detected

            logger.info(f"Transcribe thread finished (detected={detected}, raw={detected_raw}, vi={vi_prob:.2f}, en={en_prob:.2f}): '{res}'")
            return res, detected
            
        text, detected_lang = await loop.run_in_executor(None, transcribe)
        logger.info(f"Transcribe executor returned: text='{text}', lang='{detected_lang}'")

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(
                    text=text,
                    language=detected_lang,
                    confidence=1.0
                )
            ]
        )


import asyncio
from typing import Optional, Any, AsyncIterable
from livekit import rtc
from livekit.agents import utils
from livekit.agents.vad import VAD, VADEventType
from livekit.agents.stt import STT, RecognizeStream, SpeechEvent, SpeechEventType, STTCapabilities
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions, NotGivenOr, NOT_GIVEN

class RealtimeStreamAdapterWrapper(RecognizeStream):
    def __init__(
        self,
        stt: STT,
        *,
        vad: VAD,
        wrapped_stt: STT,
        language: NotGivenOr[str],
        conn_options: APIConnectOptions,
    ) -> None:
        super().__init__(stt=stt, conn_options=conn_options)
        self._vad = vad
        self._wrapped_stt = wrapped_stt
        self._wrapped_stt_conn_options = conn_options
        self._language = language
        self._speech_buffer = []
        self._is_speaking = False
        self._latest_interim = ""

    async def _metrics_monitor_task(self, event_aiter: AsyncIterable[SpeechEvent]) -> None:
        async for _ in event_aiter:
            pass

    async def _run(self) -> None:
        vad_stream = self._vad.stream()

        async def _forward_input() -> None:
            """forward input to vad and accumulate speech buffer"""
            async for input in self._input_ch:
                if isinstance(input, self._FlushSentinel):
                    vad_stream.flush()
                    continue
                vad_stream.push_frame(input)
                
                if self._is_speaking:
                    self._speech_buffer.append(input)

            vad_stream.end_input()

        async def _recognize_interim_loop() -> None:
            """periodically recognize speech from the buffer while speaking"""
            # Disabled as per user request to only translate/transcribe when stopping speech (reduces CPU load)
            pass

        async def _recognize_vad() -> None:
            """recognize speech from vad events"""
            import logging
            vad_logger = logging.getLogger("local-ai.vad")
            async for event in vad_stream:
                if event.type != VADEventType.INFERENCE_DONE:
                    vad_logger.info(f"VAD Event received: type={event.type}")
                if event.type == VADEventType.START_OF_SPEECH:
                    self._is_speaking = True
                    self._speech_buffer = []
                    self._latest_interim = ""
                    self._event_ch.send_nowait(SpeechEvent(SpeechEventType.START_OF_SPEECH))
                elif event.type == VADEventType.END_OF_SPEECH:
                    self._is_speaking = False
                    self._speech_buffer = []
                    self._event_ch.send_nowait(
                        SpeechEvent(
                            type=SpeechEventType.END_OF_SPEECH,
                        )
                    )

                    if not event.frames:
                        continue

                    total_samples = sum(f.samples_per_channel for f in event.frames)
                    sample_rate = event.frames[0].sample_rate
                    dur_sec = total_samples / float(sample_rate) if sample_rate > 0 else 0
                    if dur_sec < 0.3:
                        vad_logger.info(f"Ignoring END_OF_SPEECH: duration {dur_sec:.2f}s is too short")
                        continue

                    try:
                        merged_frames = utils.merge_frames(event.frames)
                        t_event = await self._wrapped_stt.recognize(
                            buffer=merged_frames,
                            language=self._language,
                            conn_options=self._wrapped_stt_conn_options,
                        )

                        if len(t_event.alternatives) == 0:
                            continue
                        elif not t_event.alternatives[0].text:
                            continue

                        self._event_ch.send_nowait(
                            SpeechEvent(
                                type=SpeechEventType.FINAL_TRANSCRIPT,
                                alternatives=[t_event.alternatives[0]],
                            )
                        )
                    except Exception as err:
                        vad_logger.error(f"Error recognizing speech event: {err}", exc_info=True)

        tasks = [
            asyncio.create_task(_forward_input(), name="forward_input"),
            asyncio.create_task(_recognize_vad(), name="recognize_vad"),
            asyncio.create_task(_recognize_interim_loop(), name="recognize_interim"),
        ]
        try:
            await asyncio.gather(*tasks)
        finally:
            await utils.aio.cancel_and_wait(*tasks)
            await vad_stream.aclose()


class RealtimeStreamAdapter(STT):
    def __init__(self, *, stt: STT, vad: VAD) -> None:
        super().__init__(
            capabilities=STTCapabilities(
                streaming=True,
                interim_results=True,  # We support interim now!
                diarization=False,
                keyterms=stt.capabilities.keyterms,
                chat_context=stt.capabilities.chat_context,
            )
        )
        self._vad = vad
        self._stt = stt

    @property
    def wrapped_stt(self) -> STT:
        return self._stt

    @property
    def model(self) -> str:
        return self._stt.model

    @property
    def provider(self) -> str:
        return self._stt.provider

    async def _recognize_impl(
        self,
        buffer: utils.AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> SpeechEvent:
        return await self._stt.recognize(
            buffer=buffer, language=language, conn_options=conn_options
        )

    def stream(
        self,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> RecognizeStream:
        return RealtimeStreamAdapterWrapper(
            self,
            vad=self._vad,
            wrapped_stt=self._stt,
            language=language,
            conn_options=conn_options,
        )

    async def aclose(self) -> None:
        pass
