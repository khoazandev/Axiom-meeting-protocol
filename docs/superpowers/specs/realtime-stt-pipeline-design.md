# Spec: Realtime STT Pipeline — Technical Design

> Companion spec for: `phase-2-realtime-stt-pipeline.md`

---

## Architecture

```
┌─────────────┐     WebSocket (binary PCM)     ┌──────────────────┐
│  Browser    │ ──────────────────────────────▶ │  Backend         │
│  (Next.js)  │                                 │  (FastAPI)       │
│             │ ◀────────────────────────────── │                  │
│  LiveSubtitle│    WebSocket (JSON text)       │  realtime_stt.py │
└──────┬──────┘                                 └────────┬─────────┘
       │                                                 │
       │ getUserMedia()                                  │
       ▼                                                 ▼
┌──────────────┐                                ┌──────────────────┐
│ WebAudio API │                                │ Whisper          │
│ → PCM 16kHz  │                                │ (faster-whisper) │
│ → VAD filter │                                │ large-v3, int8   │
└──────────────┘                                │ CPU              │
                                                └────────┬─────────┘
                                                         │
                                                         ▼
                                                ┌──────────────────┐
                                                │ CTranslate2      │
                                                │ EN↔VI translation│
                                                └──────────────────┘
```

---

## Data Flow

### 1. Audio Capture (Frontend)

```typescript
// useVADController.ts
navigator.mediaDevices.getUserMedia({ audio: true })
  → AudioContext (sampleRate: 16000)
  → ScriptProcessorNode / AudioWorklet
  → VAD filter (Silero or simple energy-based)
  → PCM Int16 chunks (500ms each = 16000 samples)
  → WebSocket.send(pcmBuffer)  // binary
```

**PCM Format:**

- Sample rate: 16000 Hz
- Channels: 1 (mono)
- Bit depth: 16-bit signed integer (Int16)
- Chunk size: 500ms = 8000 samples = 16000 bytes

### 2. WebSocket Protocol

**Client → Server (binary):**

```
Raw PCM Int16 bytes, 16kHz mono, 500ms chunks
```

**Server → Client (JSON text):**

```json
{
  "type": "transcript",
  "text": "Khoa sẽ cập nhật tài liệu API",
  "text_en": "Khoa will update the API documentation",
  "is_final": true,
  "confidence": 0.92,
  "start_time": "00:01:15",
  "end_time": "00:01:22"
}
```

**Server → Client (translation):**

```json
{
  "type": "translation",
  "original": "Khoa sẽ cập nhật tài liệu API",
  "translated": "Khoa will update the API documentation",
  "direction": "vi_to_en"
}
```

### 3. STT Processing (Backend)

```python
# realtime_stt.py — existing pipeline
async def handle_stt_websocket(websocket):
    buffer = AudioBuffer(sample_rate=16000)

    while True:
        pcm_data = await websocket.recv()  # binary
        buffer.append(pcm_data)

        # VAD check — only process when speech detected
        if silero_vad.is_speech(buffer):
            # Whisper transcribe
            segments, info = whisper_model.transcribe(
                buffer.to_numpy(),
                language="vi",  # or auto-detect
                beam_size=5,
            )
            text = " ".join(seg.text for seg in segments)

            # Translate if needed
            text_en = translate_vi_to_en(text)

            await websocket.send(json.dumps({
                "type": "transcript",
                "text": text,
                "text_en": text_en,
                "is_final": True,
            }))

            buffer.clear()
```

---

## Frontend Component Wiring

```
meeting-room-client.tsx
  ├── LiveKitRoom (video/audio)
  ├── useVADController()          ← mic capture + VAD
  │     └── sends PCM to ──────▶ useTranslationSocket()
  │                                └── WebSocket to backend
  │                                └── receives JSON ──▶ LiveSubtitle
  ├── LiveSubtitle                ← displays realtime text
  └── TranscriptHistory          ← scrollable past utterances
```

---

## Configuration (env vars)

| Variable                 | Default               | Description                         |
| ------------------------ | --------------------- | ----------------------------------- |
| `NEXT_PUBLIC_STT_WS_URL` | `ws://localhost:8765` | STT WebSocket URL for frontend      |
| `STT_SAMPLE_RATE`        | `16000`               | Audio sample rate                   |
| `STT_CHUNK_DURATION`     | `0.5`                 | Chunk duration in seconds           |
| `STT_LANGUAGE`           | `vi`                  | Default STT language                |
| `WHISPER_MODEL_SIZE`     | `large-v3`            | Whisper model variant               |
| `WHISPER_COMPUTE_TYPE`   | `int8`                | Whisper compute type (int8/float16) |
| `WHISPER_DEVICE`         | `cpu`                 | Whisper device (cpu/cuda)           |

---

## Error Handling

| Scenario                     | Behavior                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| WebSocket disconnect         | Frontend: auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)   |
| Whisper model not loaded     | Backend: return `{"type": "error", "message": "STT model not available"}` |
| No speech detected (VAD)     | Backend: don't process, wait for next chunk                               |
| Audio format mismatch        | Backend: log warning, attempt resample                                    |
| Ollama offline (translation) | Backend: skip translation, return original text only                      |

---

## Performance Targets

| Metric                      | Target               | Notes                         |
| --------------------------- | -------------------- | ----------------------------- |
| Latency (speech → subtitle) | < 2s                 | On CPU with large-v3 int8     |
| Audio chunk processing      | < 1s per 500ms chunk | Must be faster than real-time |
| Memory usage                | < 4GB                | Whisper large-v3 int8 + VAD   |
| Concurrent sessions         | 1-2                  | CPU-bound, limited by Whisper |
