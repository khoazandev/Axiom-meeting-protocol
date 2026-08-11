# Axiom Meeting Protocol — Progress Report

> Last updated: 2026-08-11T13:10 (UTC+7)

---

## Pipeline Overview

```
🎙️ User speaks in meeting
      │
      ▼
┌─────────────────────┐
│ 1. AUDIO CAPTURE    │  Frontend: mic → WebAudio API → PCM chunks
│    (Frontend)       │
└────────┬────────────┘
         │ WebSocket /ws/realtime-stt
         ▼
┌─────────────────────┐
│ 2. SPEECH-TO-TEXT   │  Backend: Whisper (faster-whisper large-v3)
│    (STT)            │  Audio → Text (Vietnamese/English)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 3. LIVE SUBTITLES   │  WebSocket → Frontend displays realtime subtitles
│    (Realtime)       │  + Save to DB: transcript_segments
└────────┬────────────┘
         │
         │  Meeting ends (status → COMPLETED)
         ▼
┌─────────────────────┐
│ 4. AI EXTRACTION    │  Ollama qwen3:0.6b analyzes transcript
│    (Action Items)   │  → task / owner / due_date / priority / status
│    ✅ DONE          │  → Save to DB: action_items
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 5. AI SUMMARY       │  LLM summarizes entire meeting
│    (Meeting Notes)  │  → key decisions, summary
│    ❌ NOT STARTED    │  → Save to DB: meeting_summaries
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 6. POST-MEETING UI  │  Frontend displays:
│    (Dashboard)      │  - Full transcript
│    ❌ NOT STARTED    │  - Action items (kanban board)
└─────────────────────┘  - Meeting summary
```

---

## Step-by-Step Status

### Step 1: Audio Capture (Frontend → WebSocket)

| Item                | Status             | File                                                         | Notes                                                                        |
| ------------------- | ------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| VAD Controller      | ✅ Wired & Working | `src/frontend/src/hooks/useVADController.ts`                 | Mic capture + VAD logic connected to WebSocket (fixed duplicate transcripts) |
| Translation Socket  | ✅ Wired & Working | `src/frontend/src/hooks/useTranslationSocket.ts`             | WebSocket hook configured and active                                         |
| Meeting Room Client | ✅ Done            | `src/frontend/src/app/meetings/[id]/meeting-room-client.tsx` | LiveKit video works, audio→STT fully connected                               |
| Agenda Removal      | ✅ Done            | `create/page.tsx`, `meeting-room-client.tsx`                 | Removed Agenda inputs and panels in favor of AI RAG Chatbox                  |

---

### Step 2: Speech-to-Text (Whisper STT)

| Item                    | Status    | File                            | Notes                                           |
| ----------------------- | --------- | ------------------------------- | ----------------------------------------------- |
| Whisper Model           | ✅ Loaded | Docker container                | `faster-whisper large-v3` on CPU (int8)         |
| STT WebSocket           | ✅ Tested | `src/backend/realtime_stt.py`   | `/ws/realtime-stt` — E2E tested with real audio |
| VAD (Silero)            | ✅ Loaded | `src/backend/realtime_stt.py`   | Voice Activity Detection works                  |
| CTranslate2 Translation | ✅ Loaded | `src/backend/ct2_translator.py` | EN↔VI translation engine loaded                 |

---

### Step 3: Live Subtitles (Realtime Display)

| Item                   | Status       | File                                           | Notes                                                  |
| ---------------------- | ------------ | ---------------------------------------------- | ------------------------------------------------------ |
| LiveSubtitle Component | ✅ Working   | `src/frontend/src/components/LiveSubtitle.tsx` | UI component displays realtime transcripts from socket |
| Transcript Save        | ✅ API ready | `src/backend/api/v1/meeting_content.py`        | POST/GET transcript segments working                   |

---

### Step 4: AI Action Item Extraction ✅ COMPLETE

| Item                 | Status        | File                                              | Notes                                                                |
| -------------------- | ------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| Extraction Service   | ✅ Done       | `src/backend/services/action_item_extractor.py`   | LLM (Ollama qwen3:0.6b) + heuristic fallback                         |
| System Prompt        | ✅ Done       | `src/backend/core/config.py`                      | PM-style prompt, configurable via env var                            |
| Manual Trigger API   | ✅ Done       | `src/backend/api/v1/meeting_content.py`           | `POST /meetings/{id}/extract-action-items`                           |
| Auto-Trigger         | ✅ Done       | `src/backend/api/v1/meetings_v2.py`               | Fires on PATCH status → COMPLETED                                    |
| JSON Parser          | ✅ Done       | `action_item_extractor.py`                        | Handles `<think>` tags, markdown blocks, raw JSON                    |
| Heuristic Fallback   | ✅ Done       | `action_item_extractor.py`                        | EN/VI keyword patterns when LLM offline                              |
| Deduplication        | ✅ Done       | `action_item_extractor.py`                        | Prevents duplicates on re-extraction                                 |
| Chunking             | ✅ Done       | `action_item_extractor.py`                        | Splits long transcripts to fit context window                        |
| Config (no hardcode) | ✅ Done       | `src/backend/core/config.py`                      | `EXTRACTION_MODEL`, `EXTRACTION_TIMEOUT`, `EXTRACTION_SYSTEM_PROMPT` |
| Unit Tests           | ✅ 25/25 pass | `src/backend/tests/test_action_item_extractor.py` | JSON parsing, heuristic, pipeline, API, auto-trigger                 |
| E2E Test             | ✅ Pass       | `src/backend/tests/test_extraction_e2e.py`        | Full flow with real Ollama                                           |

**E2E Test Result (2026-08-10):**

```
✅ Extracted 5 action items:
#   Task                                     Owner        Priority Due
1   Update API documentation                 Khoa         HIGH     Friday
2   Fix login page bug                       Unassigned   MEDIUM   Not specified
3   Review security audit report             Minh         MEDIUM   Not specified
4   Deploy staging environment               Unassigned   LOW      Not specified
5   Add monitoring to production servers     Unassigned   MEDIUM   Not specified

✅ Auto-trigger: 1 item created on meeting COMPLETED
```

---

### Step 5: AI Meeting Summary

| Item                       | Status         | Notes                                                              |
| -------------------------- | -------------- | ------------------------------------------------------------------ |
| Summary Generation Service | ❌ Not started | No code to call LLM for summarization                              |
| Summary API                | ✅ CRUD exists | `meeting_content.py` has POST/GET summary — but no auto-generation |
| Summary Auto-Trigger       | ❌ Not started | Should trigger alongside action item extraction                    |

---

### Step 6: Post-Meeting UI

| Item                 | Status               | Notes                                                               |
| -------------------- | -------------------- | ------------------------------------------------------------------- |
| Meeting Detail Page  | ❌ Not started       | No page to view meeting results after it ends                       |
| Transcript Viewer    | ❌ Not started       | No UI to display full transcript                                    |
| Action Items Display | ⚠️ Tasks page exists | `/tasks` page fetches from API but shows all tasks, not per-meeting |
| Summary Display      | ❌ Not started       | No UI for meeting summary                                           |

---

## Infrastructure Status

| Component     | Status        | Details                                                 |
| ------------- | ------------- | ------------------------------------------------------- |
| Docker Stack  | ✅ Running    | Backend + Frontend + Postgres + Redis + LiveKit         |
| Backend API   | ✅ Running    | FastAPI at port 8000, all core routes working           |
| Frontend      | ✅ Running    | Next.js at port 3000, proxy to backend working          |
| Auth (JWT)    | ✅ Working    | Login/Register/Me endpoints functional                  |
| Admin Account | ✅ Seeded     | `admin@axiom.com / password123` auto-created on startup |
| Organizations | ✅ Working    | CRUD + Departments + Roles/Permissions                  |
| Meetings v2   | ✅ Working    | CRUD + Members + LiveKit tokens                         |
| Tasks API     | ✅ Re-enabled | Maps to ActionItem model                                |
| Ollama        | ✅ Connected  | `host.docker.internal:11434`, qwen3:0.6b active         |
| Database      | ✅ PostgreSQL | 17 tables, all migrations applied                       |

---

## Database Schema (17 tables)

```
users, organizations, org_members, departments,
roles, permissions, role_permissions,
meetings, meeting_members, organization_invitations,
meeting_documents, transcript_segments, meeting_summaries,
action_items, knowledge_chunks, meeting_chat_messages, audit_logs
```

---

## Key Files Reference

| Category              | File                                                         |
| --------------------- | ------------------------------------------------------------ |
| Backend Config        | `src/backend/core/config.py`                                 |
| Models (17 tables)    | `src/backend/models.py`                                      |
| API Router            | `src/backend/api/v1/router.py`                               |
| Meetings API          | `src/backend/api/v1/meetings_v2.py`                          |
| Meeting Content API   | `src/backend/api/v1/meeting_content.py`                      |
| Action Item Extractor | `src/backend/services/action_item_extractor.py`              |
| Realtime STT          | `src/backend/realtime_stt.py`                                |
| Ollama Service        | `src/backend/services/ollama_service.py`                     |
| Frontend API Client   | `src/frontend/src/lib/api.ts`                                |
| Meeting Room          | `src/frontend/src/app/meetings/[id]/meeting-room-client.tsx` |
| Docker Compose        | `docker-compose.yml`                                         |
| Project Rules         | `.agents/AGENTS.md`                                          |

---

## Next Steps (Priority Order)

1. **Build Step 5**: AI Summary generation (similar pipeline to action item extraction)
2. **Build Step 6**: Post-meeting UI (transcript viewer, action items per meeting, summary display)
3. **Re-enable disabled routes**: notifications, files, mom, knowledge (11 routes still disabled in router.py)
