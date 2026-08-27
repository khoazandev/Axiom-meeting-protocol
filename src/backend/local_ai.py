import asyncio
import io
import edge_tts
import av
import numpy as np
from typing import Optional, Union, List
from livekit import rtc
from livekit.agents import stt
from faster_whisper import WhisperModel

class FasterWhisperSTT(stt.STT):
    def __init__(self, model_size="tiny", language="vi"):
        super().__init__(capabilities=stt.STTCapabilities(streaming=False, interim_results=False))
        # Use int8 quantization on CPU for fast execution
        self._model = WhisperModel(model_size, device="cpu", compute_type="int8")
        self._language = language

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
                alternatives=[stt.SpeechData(text="", language=language or self._language, confidence=0.0)]
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
        logger.info(f"Received {len(frames)} frames. First frame size: {len(frames[0].data) if frames else 0}. Resampled to {len(resampled_frames)} frames. Bytes: {len(audio_data)}")
        
        # Run transcription in a thread to not block event loop
        loop = asyncio.get_event_loop()
        def transcribe():
            logger.info("Transcribe thread starting...")
            segments, info = self._model.transcribe(audio_float32, beam_size=1, language=lang_code, condition_on_previous_text=False)
            res = " ".join([segment.text for segment in segments]).strip()
            logger.info(f"Transcribe thread finished: '{res}'")
            return res
            
        text = await loop.run_in_executor(None, transcribe)
        logger.info(f"Transcribe executor returned: '{text}'")

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(
                    text=text,
                    language=lang_code,
                    confidence=1.0
                )
            ]
        )


async def synthesize_edge_tts(text: str, target_lang: str, audio_source: rtc.AudioSource):
    """
    Synthesize text using Edge-TTS and push directly to AudioSource.
    """
    voice_map = {
        "vi": "vi-VN-HoaiMyNeural",
        "en": "en-US-AriaNeural",
        "ja": "ja-JP-NanamiNeural",
        "ko": "ko-KR-SunHiNeural",
        "zh": "zh-CN-XiaoxiaoNeural"
    }
    voice = voice_map.get(target_lang, "en-US-AriaNeural")
    
    communicate = edge_tts.Communicate(text, voice)
    mp3_data = b''
    async for chunk in communicate.stream():
        if chunk['type'] == 'audio':
            mp3_data += chunk['data']
            
    if not mp3_data:
        return
        
    container = av.open(io.BytesIO(mp3_data))
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format='s16', layout='mono', rate=24000)
    
    pcm_data = b''
    for frame in container.decode(stream):
        frame.pts = None
        for r_frame in resampler.resample(frame):
            pcm_data += r_frame.to_ndarray().tobytes()
            
    for r_frame in resampler.resample(None):
        pcm_data += r_frame.to_ndarray().tobytes()
        
    # Chunk PCM data to audio frames
    bytes_per_sample = 2
    # Standard chunk is 10ms at 24000Hz = 240 samples = 480 bytes
    chunk_size = 240 * bytes_per_sample
    
    for i in range(0, len(pcm_data), chunk_size):
        chunk = pcm_data[i:i+chunk_size]
        if len(chunk) < chunk_size:
            # Pad with zeros
            chunk += b'\x00' * (chunk_size - len(chunk))
        
        frame = rtc.AudioFrame(
            data=chunk,
            sample_rate=24000,
            num_channels=1,
            samples_per_channel=240
        )
        await audio_source.capture_frame(frame)


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
            while True:
                await asyncio.sleep(0.5)  # Every 500ms
                if self._is_speaking and len(self._speech_buffer) > 0:
                    # Make a copy of the current buffer
                    current_frames = list(self._speech_buffer)
                    # Don't transcribe if buffer is too short (e.g. less than 0.5s)
                    # Assuming 10ms frames, 50 frames = 500ms
                    if len(current_frames) < 30:
                        continue
                        
                    merged_frames = utils.merge_frames(current_frames)
                    try:
                        t_event = await self._wrapped_stt.recognize(
                            buffer=merged_frames,
                            language=self._language,
                            conn_options=self._wrapped_stt_conn_options,
                        )
                        if len(t_event.alternatives) > 0 and t_event.alternatives[0].text:
                            text = t_event.alternatives[0].text.strip()
                            if text and text != self._latest_interim:
                                self._latest_interim = text
                                self._event_ch.send_nowait(
                                    SpeechEvent(
                                        type=SpeechEventType.INTERIM_TRANSCRIPT,
                                        alternatives=[t_event.alternatives[0]],
                                    )
                                )
                    except Exception as e:
                        import logging
                        logging.getLogger("realtime-stt").warning(f"Interim error: {e}")

        async def _recognize_vad() -> None:
            """recognize speech from vad events"""
            async for event in vad_stream:
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
