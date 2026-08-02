# Design Specification — Phase 3: Platform Infrastructure, Real-Time Meeting Lifecycle & Task Sync Engine

> **Version:** 1.0 · **Date:** 2026-08-03 · **Author:** Principal Architect  
> **Status:** APPROVED · **Target Branch:** `develop`

---

## 1. Executive Summary

Phase 3 builds the core **Platform Infrastructure and Real-Time Control System** for Axiom DX-OS. It equips the project with live WebRTC lifecycle handling via LiveKit Webhooks, real-time Server-Sent Events (SSE) notifications, multi-tenant Task/Action Item management, meeting document attachment services, and clear AI Ingestion interfaces for downstream AI model pipelines (Whisper STT & Llama-3 RAG).

---

## 2. Architecture & Data Schema

### 2.1 Database Models (`src/backend/models.py`)

#### 1. Updated `Meeting` Model
- `status`: Enum (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) — Default `SCHEDULED`.
- `started_at`: Optional ISO timestamp of actual meeting start.
- `ended_at`: Optional ISO timestamp of actual meeting end.
- `recording_url`: Optional string for LiveKit Egress recording URL.

#### 2. New `Task` Model (Action Items)
- `id`: String (UUID PK).
- `workspace_id`: String (FK -> `workspaces.id`, `nullable=False`, indexed).
- `meeting_id`: String (FK -> `meetings.id`, `nullable=True`, indexed).
- `created_by_id`: String (FK -> `users.id`, `nullable=False`).
- `assignee_id`: Optional String (FK -> `users.id`, `nullable=True`).
- `title`: String (10-255 chars).
- `description`: Text (optional).
- `priority`: Enum (`LOW`, `MEDIUM`, `HIGH`) — Default `MEDIUM`.
- `status`: Enum (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `COMPLETED`) — Default `TODO`.
- `due_date`: Optional ISO timestamp.

#### 3. New `MeetingInvitation` Model
- `id`: String (UUID PK).
- `meeting_id`: String (FK -> `meetings.id`, `nullable=False`, indexed).
- `email`: String (lowercase, indexed).
- `role`: Enum (`ATTENDEE`, `PRESENTER`, `MODERATOR`).
- `token`: String (unique UUID token).
- `status`: Enum (`PENDING`, `ACCEPTED`, `DECLINED`).

#### 4. New `MeetingFile` Model
- `id`: String (UUID PK).
- `meeting_id`: String (FK -> `meetings.id`, `nullable=False`, indexed).
- `uploaded_by_id`: String (FK -> `users.id`, `nullable=False`).
- `filename`: String (original filename).
- `file_path`: String (stored path in `storage/meetings/`).
- `file_size`: Integer (bytes).
- `content_type`: String (e.g. `application/pdf`).

---

## 3. Backend API Specification (`src/backend/api/v1/`)

### 3.1 LiveKit Webhook Handler (`/api/v1/webhooks/livekit`)
- `POST /api/v1/webhooks/livekit`
  - Validates LiveKit HMAC Authorization header.
  - Event Handlers:
    - `room_started`: Updates meeting `status = IN_PROGRESS`, sets `started_at = utcnow()`.
    - `room_finished`: Updates meeting `status = COMPLETED`, sets `ended_at = utcnow()`.
    - `participant_joined` / `participant_left`: Tracks room active participant count.

### 3.2 Real-Time SSE Notification Engine (`/api/v1/notifications/stream`)
- `GET /api/v1/notifications/stream`
  - Auth: `get_current_user` (Bearer Token).
  - Streams Server-Sent Events (`text/event-stream`) for:
    - `MEETING_STATUS_CHANGED`
    - `TASK_ASSIGNED`
    - `INVITATION_RECEIVED`

### 3.3 Task / Action Item Management (`/api/v1/tasks`)
- `GET /api/v1/tasks`: Lists tasks isolated by active `workspace_id`. Optional filters: `meeting_id`, `status`, `assignee_id`.
- `POST /api/v1/tasks`: Creates a new task.
- `GET /api/v1/tasks/{id}`: Fetches single task details.
- `PUT /api/v1/tasks/{id}`: Updates task status, assignee, priority, or due date.
- `DELETE /api/v1/tasks/{id}`: Deletes a task.

### 3.4 Meeting Invitations (`/api/v1/meetings/{id}/invitations`)
- `POST /api/v1/meetings/{id}/invitations`: Invites email addresses with a specific role.
- `GET /api/v1/invitations/verify/{token}`: Verifies invitation token and returns meeting details.
- `POST /api/v1/invitations/respond`: Accepts or declines invitation.

### 3.5 File Upload Service (`/api/v1/meetings/{id}/files`)
- `POST /api/v1/meetings/{id}/files`: Uploads multipart document (`.pdf`, `.docx`, `.txt`, `.png`).
- `GET /api/v1/meetings/{id}/files`: Lists all uploaded files for a meeting.

### 3.6 External AI Partner Integration Ingestion Hooks
- `POST /api/v1/meetings/{id}/transcript`: Ingests speech-to-text segments from AI partner service.
- `POST /api/v1/meetings/{id}/summary`: Ingests generated Minutes of Meeting (MoM) summary.

---

## 4. Frontend UI & State Bindings

- **Kanban Board (`/tasks`)**: Connected directly to `/api/v1/tasks` with drag-and-drop state sync.
- **Meeting Room Right Panel (`/meetings/[id]`)**:
  - Live Process Gate checklist binding.
  - File attachments list with direct download links.
  - Live AI Transcript feed listener.
- **Header Notification Bell**: Subscribes to SSE stream (`/api/v1/notifications/stream`) displaying live toast alerts.

---

## 5. Verification & Test Plan

1. **Alembic Database Migration**:
   - Migration script `add_phase3_tables` creates `tasks`, `meeting_invitations`, `meeting_files` with SQLite batch mode support.
2. **Pytest Integration Suite**:
   - `test_tasks_api.py`: Task CRUD, status updates, tenant isolation.
   - `test_invitations_api.py`: Token generation & verification.
   - `test_files_api.py`: File upload & retrieval.
   - `test_livekit_webhooks.py`: LiveKit webhook event handlers.
3. **Frontend Build Verification**:
   - `npm run build` passes with 0 errors.
