# Realtime STT Translation Design Spec

## Overview
This feature provides ultra-low latency real-time Speech-to-Text (STT) and Bilingual Translation (Vietnamese to English) for the Axiom meeting platform. It leverages Web-based Voice Activity Detection (VAD) coupled with the native browser Web Speech API for efficient STT, and routes the raw transcripts to a backend WebSocket server for polishing and real-time CTranslate2 stream translation.

## Architecture & Data Flow
1. **Microphone Capture**: The browser requests microphone permissions and captures the audio stream.
2. **Web VAD (`@ricky0123/vad-web`)**:
   - Analyzes audio frames locally using an ONNX model.
   - Triggers `onSpeechStart` and `onSpeechEnd` events.
3. **Web Speech API**:
   - `onSpeechStart`: Calls `recognition.start()`.
   - `onSpeechEnd`: Calls `recognition.stop()`, forcing the API to flush a final transcript (with `isFinal: true`).
4. **WebSocket Transmission**:
   - The frontend packages the final transcript and sends it to the backend WebSocket server (`ws://backend:8765/`).
5. **Backend Processing (CTranslate2)**:
   - Receives the raw transcript.
   - Cleans the transcript (removes stutters, adds punctuation).
   - Translates using the high-performance CTranslate2 engine.
   - Streams the translation back to the frontend character-by-character.
6. **UI Rendering**:
   - The frontend receives the streaming updates and renders a dynamic subtitle overlay.

## Components (Frontend)
- **`useVAD` Hook**: Manages the lifecycle of `@ricky0123/vad-web`. Requires ONNX model assets in the Next.js `public` folder.
- **`useWebSpeech` Hook**: Manages the native `window.SpeechRecognition` or `window.webkitSpeechRecognition` API. Handles fallback logic if the browser lacks support.
- **`useTranslationSocket` Hook**: Manages the WebSocket connection to the backend, parses streaming JSON payloads, and handles auto-reconnects.
- **`LiveSubtitle` Component**: Displays the streaming bilingual text in the meeting UI.

## Components (Backend)
*(Note: The backend CTranslate2 translation pipeline `realtime_stt.py` is largely pre-existing, but its integration points are defined here)*
- **WebSocket Listener**: Listens on port 8765.
- **Streaming Pipeline (`process_full_translation_pipeline_streaming`)**: Emits JSON payloads sequentially as tokens arrive from the CTranslate2 model.

## WebSocket Payload Format
**Client -> Server (Request)**:
```json
{
  "type": "translate",
  "text": "Xin chào, chúng ta bắt đầu cuộc họp."
}
```

**Server -> Client (Response Stream)**:
```json
{
  "type": "bilingual_translation_stream",
  "id": "uuid-1234",
  "original_text": "Xin chào, chúng ta bắt đầu cuộc họp.",
  "vi_text": "Xin chào, chúng ta bắt đầu cuộc họp.",
  "en_text": "Hello, let's start the...",
  "is_final": false // Changes to true when translation completes
}
```

## Error Handling
- **Browser Unsupported**: If Web Speech API is not supported (e.g., Firefox without flags), the UI will display a graceful warning.
- **WebSocket Disconnection**: The `useTranslationSocket` hook will attempt exponential backoff reconnection.
- **Backend Translation Failure**: The backend will fallback to echoing the original text if the CTranslate2 model is unavailable, ensuring subtitles still function (monolingual mode).

## Future Scope / Limitations
- Web Speech API relies on the browser's cloud service (e.g., Google's STT servers for Chrome), which requires an internet connection and may have usage quotas on the client side.
- Currently, VAD ONNX models (~2MB) must be downloaded by the client on page load.
