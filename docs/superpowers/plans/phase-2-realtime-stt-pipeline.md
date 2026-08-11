# Phase 2 — Realtime STT Pipeline (Mic → Whisper → Live Subtitles)

> **Goal:** Wire the existing frontend audio capture → backend STT WebSocket → live subtitle display into a working E2E flow.
> **Priority:** 🔴 CRITICAL — This is the core product experience.
> **Estimated effort:** Medium (all pieces exist, need connection + testing)

---

## Context

All individual components exist but are not connected:

- Frontend: `useVADController.ts` (mic + VAD), `useTranslationSocket.ts` (WebSocket hook), `LiveSubtitle.tsx` (display)
- Backend: `realtime_stt.py` (Whisper + VAD + WebSocket endpoint), `ct2_translator.py` (EN↔VI)
- Infrastructure: Whisper large-v3 loaded in Docker, STT port 8765 exposed

**The problem:** No audio data flows from frontend → backend. WebSocket URL not configured. Proxy not tested for `/ws/*`.

---

## Tasks

### Task 1: WebSocket Proxy Configuration

**Files:**

- `src/frontend/src/proxy.ts` — Add WebSocket upgrade support for `/ws/*`
- `docker-compose.yml` — Verify port 8765 is accessible

**Steps:**

1. Test if Next.js standalone proxy supports WebSocket upgrade
2. If not, configure frontend to connect directly to `ws://localhost:8765` for STT
3. Add `NEXT_PUBLIC_STT_WS_URL` env var (configurable, no hardcode)

### Task 2: Frontend Audio → WebSocket Wiring

**Files:**

- `src/frontend/src/hooks/useTranslationSocket.ts` — Fix WebSocket URL, add reconnection
- `src/frontend/src/hooks/useVADController.ts` — Verify PCM format matches backend expectation
- `src/frontend/src/app/meetings/[id]/meeting-room-client.tsx` — Connect hooks together

**Steps:**

1. In meeting room, when user joins: start mic capture via `useVADController`
2. VAD detects speech → send PCM audio chunks via `useTranslationSocket`
3. Receive STT results from WebSocket → display in `LiveSubtitle` component
4. Save transcript segments to DB via `POST /meetings/{id}/transcripts`

### Task 3: Backend STT Endpoint Verification

**Files:**

- `src/backend/realtime_stt.py` — Verify `/ws/realtime-stt` accepts audio and returns text
- `src/backend/main.py` — Ensure WebSocket route is registered

**Steps:**

1. Write a Python test client that sends WAV audio over WebSocket
2. Verify Whisper processes audio and returns transcription
3. Test with Vietnamese and English audio samples
4. Verify translation (EN↔VI) works via CTranslate2

### Task 4: Transcript Persistence

**Steps:**

1. After STT returns text, frontend calls `POST /meetings/{id}/transcripts` to save
2. Each segment includes: `content`, `start_time`, `end_time`, `sequence`, `speaker_id`
3. Verify segments appear in GET endpoint

---

## Verification

### Manual Test

1. Login → Create meeting → Join room
2. Speak into microphone (Vietnamese or English)
3. See live subtitles appearing in real-time
4. End meeting → verify transcript saved in DB
5. Action items auto-extracted (Phase 1 pipeline)

### Automated Tests

```bash
# WebSocket STT test
python src/backend/tests/test_stt_websocket.py

# Frontend build
cd src/frontend && npm run build
```

---

## Dependencies

- Whisper model loaded ✅
- VAD model loaded ✅
- CTranslate2 translation loaded ✅
- Meeting CRUD working ✅
- Transcript API working ✅
