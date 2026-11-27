# Axiom Meeting Protocol — Progress Report

> Last updated: 2026-11-27T21:35 (UTC+7)
> Current Active Branch: `feature/replace-mock-with-real-apis`

---

## 1. Pipeline Overview

```
🎙️ User speaks in meeting
      │
      ▼
┌─────────────────────┐
│ 1. AUDIO CAPTURE    │  Frontend: mic → WebAudio API → PCM chunks
│    (Frontend)       │  ✅ COMPLETED
└────────┬────────────┘
         │ WebSocket /ws/realtime-stt
         ▼
┌─────────────────────┐
│ 2. SPEECH-TO-TEXT   │  Backend: Whisper (faster-whisper large-v3)
│    (STT)            │  Audio → Text (Vietnamese/English)
└────────┬────────────┘  ✅ COMPLETED
         │
         ▼
┌─────────────────────┐
│ 3. LIVE SUBTITLES   │  WebSocket → Frontend displays realtime subtitles
│    (Realtime)       │  + Save to DB: transcript_segments
└────────┬────────────┘  ✅ COMPLETED
         │
         │  Meeting ends (status → COMPLETED)
         ▼
┌─────────────────────┐
│ 4. AI EXTRACTION    │  Ollama qwen3:0.6b analyzes transcript
│    (Action Items)   │  → task / owner / due_date / priority / status
│    ✅ COMPLETED     │  → Save to DB: action_items, follow_up_tasks
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 5. AI SUMMARY       │  Meeting End Service orchestrates synthesis
│    (Meeting Notes)  │  → key points, decisions, executive summary
│    ✅ COMPLETED     │  → Save to DB: meeting_summaries
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 6. POST-MEETING UI  │  Archive Repository & Meeting Detail Modal:
│    (Dashboard)      │  - Full transcript viewer with timestamps
│    ✅ COMPLETED     │  - Action items sync to MiniJira Kanban
└─────────────────────┘  - Exportable MOM & Executive Summary
```

---

## 2. Step-by-Step Status & Completed Milestones

### Step 1: Audio Capture (Frontend → WebSocket)
| Item | Status | File | Notes |
|---|---|---|---|
| VAD Controller | ✅ Wired & Working | `src/frontend/src/hooks/useVADController.ts` | Mic capture + Silero VAD logic connected to WebSocket |
| Translation Socket | ✅ Wired & Working | `src/frontend/src/hooks/useTranslationSocket.ts` | WebSocket hook configured and active |
| Meeting Room Client | ✅ Done | `src/frontend/src/app/meetings/[id]/meeting-room-client.tsx` | LiveKit video/audio + STT fully connected |
| AI RAG Meeting Chat | ✅ Done | `meeting-room-client.tsx` | Realtime meeting Q&A assistant |

---

### Step 2: Speech-to-Text & Subtitles
| Item | Status | File | Notes |
|---|---|---|---|
| Whisper Model | ✅ Loaded | Docker container | `faster-whisper large-v3` on CPU (int8) |
| STT WebSocket | ✅ Tested | `src/backend/realtime_stt.py` | `/ws/realtime-stt` — E2E tested with real audio |
| CTranslate2 Translation | ✅ Loaded | `src/backend/ct2_translator.py` | EN↔VI bidirectional translation engine |
| LiveSubtitle Component | ✅ Working | `src/frontend/src/components/LiveSubtitle.tsx` | Realtime display of transcripts |

---

### Step 3: AI Intelligence Layer & Meeting End Pipeline
| Item | Status | File | Notes |
|---|---|---|---|
| Action Item Extractor | ✅ Complete | `src/backend/services/action_item_extractor.py` | Heuristic + LLM Ollama extraction |
| Meeting End Service | ✅ Complete | `src/backend/services/meeting_end_service.py` | Auto-synthesizes transcript + agenda into meeting summary |
| Punctuation Restorer | ✅ Complete | `src/backend/services/punctuation_restorer.py` | Capitalization & punctuation cleanup for raw ASR transcripts |
| Decision Extractor | ✅ Complete | `src/backend/services/decision_extractor.py` | Identifies binding corporate decisions |

---

### Step 4: Recruitment & Candidate Assessment Pipeline
| Item | Status | File | Notes |
|---|---|---|---|
| Candidate Discovery Portal | ✅ Complete | `src/frontend/src/app/(candidate)/candidate/discovery/page.tsx` | Public job listings & direct candidate application flow |
| Auto-Assessment Engine | ✅ Complete | `src/backend/services/assessment_service.py` | Dynamic coding/theory assessment generation & evaluation |
| AI Scorecard & Dossier | ✅ Complete | `src/frontend/src/components/recruitment/CandidateSplitDossierModal.tsx` | Side-by-side evaluation, radar charts & hiring decision gate |
| Candidate Meeting Room | ✅ Complete | `src/frontend/src/app/(candidate)/candidate/layout.tsx` | Secure candidate-specific meeting room access |

---

### Step 5: Mock to Real API Integration (Enterprise Multi-Tenant)
| Item | Status | File | Notes |
|---|---|---|---|
| Governance Policies | ✅ Real API | `src/backend/api/v1/organizations.py` | DB-backed policies (`organization_policies`) with admin controls |
| Issue Attachments | ✅ Real API | `src/backend/api/v1/jira.py` | Multi-part file upload up to 25MB stored in `/app/storage/attachments` |
| Starred Jira Spaces | ✅ Real API | `src/backend/api/v1/jira.py` | Multi-user project stars in `user_project_stars` |
| Profile Bio Sync | ✅ Real API | `src/backend/api/v1/auth.py` | `bio` column added to `users` and synced across profiles |
| SOC Security Summary | ✅ Real API | `src/backend/api/v1/admin.py` | Computed dynamically from real `AuditLog` records (no pseudo-mocks) |
| LocalStorage Elimination | ✅ 100% Clean | All tabs & modals | All mock storage replaced with authenticated database endpoints |

---

### Step 6: UI Hardening, Stability & Responsive Layout
| Item | Status | File | Notes |
|---|---|---|---|
| Kanban 4-Column Single Row | ✅ Complete | `ManagerKanbanTaskTab.tsx`, `MemberJiraWorkspaceTab.tsx` | All 4 columns on single horizontal line, independent scroll, fits container width |
| Responsive Weekly Calendar | ✅ Complete | `ManagerCalendarTab.tsx`, `MemberCalendarTab.tsx` | 7-column grid auto-fits 100% desktop width without horizontal scrollbars |
| Quick Horizontal Pill Bar | ✅ Complete | `manager/page.tsx`, `member/page.tsx` | Compact icon-only buttons with Radix UI hover tooltips (zero CLS) |
| Fixed Dimension Locking | ✅ Complete | All triggers & select bars | Dimension locking prevents cumulative layout shift (CLS) |

---

## 3. Database Schema Overview (21+ Core Tables)

```
Organizations & Users:
  - users, organizations, org_members, departments, roles, permissions, role_permissions, organization_invitations
Governance & Audit:
  - organization_policies, audit_logs
Meetings & Transcripts:
  - meetings, meeting_members, meeting_documents, transcript_segments, meeting_summaries, meeting_chat_messages
Tasks & Jira Workspace:
  - jira_projects, jira_issues, jira_sprints, action_items, follow_up_tasks, issue_attachments, user_project_stars
Recruitment & Candidate Portal:
  - job_openings, candidates, candidate_applications, assessment_attempts, interview_sessions, candidate_evaluations
Knowledge Base:
  - knowledge_chunks, knowledge_documents
```

---

## 4. Key Files Reference

| Category | File | Description |
|---|---|---|
| Backend Config | `src/backend/core/config.py` | Central environment & service settings |
| Backend Routers | `src/backend/api/v1/router.py` | Aggregates all active API v1 routers |
| Meeting Pipeline | `src/backend/services/meeting_end_service.py` | End-of-meeting summary & action item orchestration |
| Realtime STT | `src/backend/realtime_stt.py` | Faster-Whisper + Silero VAD WebSocket server |
| Frontend API Client | `src/frontend/src/lib/api.ts` | Fully typed Axios client for all backend endpoints |
| Manager Workspace | `src/frontend/src/app/manager/page.tsx` | Department management, team, Kanban, and calendar |
| Member Workspace | `src/frontend/src/app/member/page.tsx` | Personal sprint tasks, meeting schedule, and settings |
| Docker Stack | `docker-compose.yml` | Multi-container setup (frontend, backend, postgres, redis, livekit, agent) |

---

## 5. Next Steps (Priority Order — Upcoming Milestones)

1. **Git Merge & Release (Immediate)**:
   - Create and merge Pull Request for `feature/replace-mock-with-real-apis` into `develop`.
   - Verify continuous integration & regression tests.

2. **Re-enable & Refactor Analytics API**:
   - Update `src/backend/api/v1/analytics.py` from legacy workspace schema to `organization_id` multi-tenant schema.
   - Re-enable `analytics_router` in `src/backend/api/v1/router.py`.
   - Connect executive analytics charts (productivity, meeting density, task resolution rate) to real database records.

3. **Realtime WebSocket Notification System**:
   - Implement live notification broadcasts when tasks are assigned, @mentions occur in meeting chats, or invitations are received.
   - Provide toast notifications and in-app bell counter syncing in real-time.

4. **Attachment Storage Hardening & Backup Policy**:
   - Implement storage quota monitoring and automated file retention policies for `/app/storage/attachments`.
   - Perform load and virus/MIME sanitization checks for user-uploaded documents.

5. **Semantic Hybrid Search in Knowledge Base**:
   - Integrate vector embeddings (`embedding_service.py`) with PostgreSQL text search for intelligent retrieval of meeting transcripts and corporate SOPs.
