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
            "Chào mọi người, trong cuộc họp hôm nay chúng ta sẽ review tiến độ sprint, "
            "thảo luận các task trên Jira và bàn về kế hoạch triển khai dự án. "
            "Let's start the meeting and review the updates."
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
            peak = float(np.max(np.abs(audio_float32))) if len(audio_float32) > 0 else 0.0
            if rms < 0.012 or dur_sec < 0.40 or peak < 0.035:
                logger.info(f"Audio energy too low (RMS={rms:.5f}, peak={peak:.4f}, dur={dur_sec:.2f}s), skipping silence.")
                return "", "vi"

            # Normalize audio with max 5.0x gain to prevent amplifying background hiss
            gain = min(0.89 / peak, 5.0) if peak > 0 else 1.0
            normalized_audio = audio_float32 * gain

            # Quick bilingual language determination: STRICTLY between 'vi' and 'en'
            try:
                if lang_code in ("vi", "en"):
                    target_lang = lang_code
                    vi_prob, en_prob = (1.0, 0.0) if lang_code == "vi" else (0.0, 1.0)
                else:
                    _, _, all_probs = self._model.detect_language(normalized_audio)
                    prob_dict = dict(all_probs)
                    vi_prob = prob_dict.get("vi", 0.0)
                    en_prob = prob_dict.get("en", 0.0)
                    
                    if en_prob > 0.35 and en_prob > vi_prob * 1.5:
                        target_lang = "en"
                    elif vi_prob > 0.15:
                        target_lang = "vi"
                    elif en_prob > vi_prob:
                        target_lang = "en"
                    else:
                        target_lang = "vi"

                logger.info(f"Bilingual STT selected language: '{target_lang}' (vi_prob={vi_prob:.2f}, en_prob={en_prob:.2f}, hint={lang_code}, dur={dur_sec:.2f}s, RMS={rms:.4f})")

                # Transcribe constrained strictly to target_lang (vi or en)
                segments, info = self._model.transcribe(
                    normalized_audio,
                    beam_size=1,
                    best_of=1,
                    temperature=0.0,
                    language=target_lang,
                    condition_on_previous_text=False,
                    vad_filter=False,
                    no_speech_threshold=0.5,
                    log_prob_threshold=-0.8,
                    compression_ratio_threshold=2.2,
                    initial_prompt=self._initial_prompt
                )
                detected = target_lang

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
                "thank you very much",
                "thank you",
                "good day",
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
            clean_token = re.sub(r'[^\w\s]', '', lower_res).strip()
            if any(h == lower_res or lower_res.startswith(h) for h in hallucinations) or clean_token in ["thank you", "good day", "you", "bye"]:
                if rms < 0.045:
                    logger.info(f"Suppressed silence hallucination: '{res}' (RMS={rms:.4f})")
                    return "", detected


            # Filter out single characters or punctuation
            cleaned = re.sub(r'[^\w\s]', '', res).strip()
            if len(cleaned) <= 1:
                logger.info(f"Suppressed single char / punctuation hallucination: '{res}'")
                return "", detected

            logger.info(f"Transcribe thread finished (detected={detected}, vi={vi_prob:.2f}, en={en_prob:.2f}): '{res}'")
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
from collections import deque
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
        self._pre_buffer = deque(maxlen=25)  # ~500ms pre-speech audio buffer to preserve initial syllables
        self._is_speaking = False
        self._latest_interim = ""
        self._stt_lock = asyncio.Lock()

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
                else:
                    self._pre_buffer.append(input)

            vad_stream.end_input()

        async def _recognize_interim_loop() -> None:
            """periodically recognize speech from the buffer while speaking (sub-second interim updates)"""
            import logging
            interim_logger = logging.getLogger("local-ai.interim")
            while True:
                await asyncio.sleep(0.45)
                if not self._is_speaking or not self._speech_buffer:
                    continue

                if self._stt_lock.locked():
                    continue

                total_samples = sum(f.samples_per_channel for f in self._speech_buffer)
                sample_rate = self._speech_buffer[0].sample_rate if self._speech_buffer else 16000
                dur_sec = total_samples / float(sample_rate) if sample_rate > 0 else 0
                if dur_sec < 0.6:
                    continue

                # Skip if speech buffer contains only silence or dead mic (RMS < 15)
                raw_bytes = b"".join(f.data for f in self._speech_buffer[-15:])
                pcm16 = np.frombuffer(raw_bytes, dtype=np.int16)
                buf_rms = float(np.sqrt(np.mean(pcm16.astype(np.float32)**2))) if len(pcm16) > 0 else 0
                if buf_rms < 15.0:
                    continue

                # 1. Check 5-second forced segmentation cap (prevents audio buffer bloat on long speech)
                if dur_sec >= 5.0:
                    async with self._stt_lock:
                        try:
                            frames_to_finalize = list(self._speech_buffer)
                            merged = utils.merge_frames(frames_to_finalize)
                            t_event = await self._wrapped_stt.recognize(
                                buffer=merged,
                                language=self._language,
                                conn_options=self._wrapped_stt_conn_options,
                            )
                            if t_event.alternatives and t_event.alternatives[0].text.strip():
                                interim_logger.info(f"5s cap finalized: '{t_event.alternatives[0].text}'")
                                self._event_ch.send_nowait(
                                    SpeechEvent(
                                        type=SpeechEventType.FINAL_TRANSCRIPT,
                                        alternatives=[t_event.alternatives[0]],
                                    )
                                )
                            # Keep last 300ms overlap to ensure phoneme continuity for next segment
                            keep_samples = int(sample_rate * 0.3)
                            trimmed = []
                            acc = 0
                            for f in reversed(self._speech_buffer):
                                trimmed.insert(0, f)
                                acc += f.samples_per_channel
                                if acc >= keep_samples:
                                    break
                            self._speech_buffer = trimmed
                            self._latest_interim = ""
                        except Exception as e:
                            interim_logger.error(f"Error in 5s cap finalization: {e}", exc_info=True)
                    continue

                # 2. Normal interim update: stream partial text to UI
                async with self._stt_lock:
                    try:
                        frames_to_use = list(self._speech_buffer)
                        merged = utils.merge_frames(frames_to_use)
                        t_event = await self._wrapped_stt.recognize(
                            buffer=merged,
                            language=self._language,
                            conn_options=self._wrapped_stt_conn_options,
                        )
                        if t_event.alternatives and t_event.alternatives[0].text.strip():
                            text = t_event.alternatives[0].text.strip()
                            if text != self._latest_interim:
                                self._latest_interim = text
                                self._event_ch.send_nowait(
                                    SpeechEvent(
                                        type=SpeechEventType.INTERIM_TRANSCRIPT,
                                        alternatives=[t_event.alternatives[0]],
                                    )
                                )
                    except Exception as e:
                        interim_logger.error(f"Error recognizing interim speech: {e}", exc_info=True)

        async def _recognize_vad() -> None:
            """recognize speech from vad events"""
            import logging
            vad_logger = logging.getLogger("local-ai.vad")
            async for event in vad_stream:
                if event.type != VADEventType.INFERENCE_DONE:
                    vad_logger.info(f"VAD Event received: type={event.type}")
                if event.type == VADEventType.START_OF_SPEECH:
                    self._is_speaking = True
                    # Pre-populate speech buffer with the pre-buffer frames to catch initial syllables
                    self._speech_buffer = list(self._pre_buffer)
                    self._latest_interim = ""
                    self._event_ch.send_nowait(SpeechEvent(SpeechEventType.START_OF_SPEECH))
                elif event.type == VADEventType.END_OF_SPEECH:
                    self._is_speaking = False
                    self._latest_interim = ""
                    self._event_ch.send_nowait(
                        SpeechEvent(
                            type=SpeechEventType.END_OF_SPEECH,
                        )
                    )

                    frames_to_finalize = list(self._speech_buffer) if self._speech_buffer else (list(event.frames) if event.frames else [])
                    self._speech_buffer = []

                    if not frames_to_finalize:
                        continue

                    total_samples = sum(f.samples_per_channel for f in frames_to_finalize)
                    sample_rate = frames_to_finalize[0].sample_rate if frames_to_finalize else 16000
                    dur_sec = total_samples / float(sample_rate) if sample_rate > 0 else 0
                    if dur_sec < 0.3:
                        vad_logger.info(f"Ignoring END_OF_SPEECH: duration {dur_sec:.2f}s is too short")
                        continue

                    async with self._stt_lock:
                        try:
                            merged_frames = utils.merge_frames(frames_to_finalize)
                            t_event = await self._wrapped_stt.recognize(
                                buffer=merged_frames,
                                language=self._language,
                                conn_options=self._wrapped_stt_conn_options,
                            )

                            if len(t_event.alternatives) == 0 or not t_event.alternatives[0].text.strip():
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
