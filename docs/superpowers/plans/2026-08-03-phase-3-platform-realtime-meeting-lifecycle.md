# Phase 3 Platform Infrastructure & Real-Time Meeting Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the event-driven platform infrastructure, LiveKit webhooks, real-time SSE notifications, persistent Task CRUD, file attachment service, and AI ingestion hooks for Axiom DX-OS.

**Architecture:** Extend FastAPI backend with event-driven Webhook receiver, SSE notification stream, multi-tenant Task/File/Invitation models, and expose REST hooks for downstream AI partner integration. The Next.js frontend connects via Zustand stores and SSE listeners.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, SQLite/PostgreSQL, Pytest, PyJWT, Next.js 16, Zustand, Lucide React.

## Global Constraints

- TDD Rules: Write failing tests before implementation code for all backend endpoints.
- Strict multi-tenant isolation: All queries filter by `workspace_id`.
- Zero placeholder code: Every file must contain complete runnable code.
- Frontend build clean: `npm run build` must succeed without TypeScript or Turbopack errors.

---

### Task 1: Database Models & Alembic Migration for Phase 3

**Files:**

- Modify: `src/backend/models.py`
- Create: `src/backend/alembic/versions/a1b2c3d4e5f6_add_phase3_tables.py`
- Test: `src/backend/tests/test_models_phase3.py`

**Interfaces:**

- Consumes: `Base`, `User`, `Workspace`, `Meeting` from `src/backend/models.py`.
- Produces: `Task`, `TaskStatusEnum`, `TaskPriorityEnum`, `MeetingInvitation`, `InvitationRoleEnum`, `InvitationStatusEnum`, `MeetingFile`, updated `MeetingStatusEnum`.

- [ ] **Step 1: Write failing test for Phase 3 models**

```python
# src/backend/tests/test_models_phase3.py
import pytest
from src.backend import models

def test_phase3_models_creation(db_session):
    user = models.User(email="taskuser@company.com", password_hash="hash", full_name="Task User")
    workspace = models.Workspace(name="Task WS", slug="task-ws")
    db_session.add_all([user, workspace])
    db_session.commit()

    meeting = models.Meeting(
        title="Architecture Sync",
        agenda="12345678901234567890",
        workspace_id=workspace.id,
        created_by_id=user.id,
        status=models.MeetingStatusEnum.IN_PROGRESS
    )
    db_session.add(meeting)
    db_session.commit()

    task = models.Task(
        workspace_id=workspace.id,
        meeting_id=meeting.id,
        created_by_id=user.id,
        assignee_id=user.id,
        title="Finalize Webhook Handler",
        priority=models.TaskPriorityEnum.HIGH,
        status=models.TaskStatusEnum.IN_PROGRESS
    )
    db_session.add(task)
    db_session.commit()

    assert task.id is not None
    assert task.status == models.TaskStatusEnum.IN_PROGRESS
    assert meeting.status == models.MeetingStatusEnum.IN_PROGRESS
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_models_phase3.py -v`  
Expected: FAIL with AttributeError (`MeetingStatusEnum` or `Task` not defined).

- [ ] **Step 3: Update `src/backend/models.py` with Phase 3 models**

Add `MeetingStatusEnum`, `TaskStatusEnum`, `TaskPriorityEnum`, `InvitationRoleEnum`, `InvitationStatusEnum` and models `Task`, `MeetingInvitation`, `MeetingFile`, plus `status`, `started_at`, `ended_at`, `recording_url` fields on `Meeting`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest src/backend/tests/test_models_phase3.py -v`  
Expected: PASS.

- [ ] **Step 5: Create Alembic Migration script `a1b2c3d4e5f6_add_phase3_tables.py`**

Generate and test migration script with batch mode support.

- [ ] **Step 6: Commit**

```bash
git add src/backend/models.py src/backend/alembic/versions/ src/backend/tests/test_models_phase3.py
git commit -m "feat(db): add Phase 3 Task, MeetingInvitation, MeetingFile models and Alembic migration"
```

---

### Task 2: Action Items & Task Management API (`/api/v1/tasks`)

**Files:**

- Create: `src/backend/schemas/task.py`
- Create: `src/backend/api/v1/tasks.py`
- Modify: `src/backend/api/v1/router.py`
- Test: `src/backend/tests/test_tasks_api.py`

**Interfaces:**

- Consumes: `get_current_user`, `get_current_workspace_member` from `src/backend/api/deps.py`.
- Produces: `GET /api/v1/tasks`, `POST /api/v1/tasks`, `GET /api/v1/tasks/{id}`, `PUT /api/v1/tasks/{id}`, `DELETE /api/v1/tasks/{id}`.

- [ ] **Step 1: Write failing test for Task CRUD endpoints**

```python
# src/backend/tests/test_tasks_api.py
def test_create_and_list_tasks(client, auth_headers, default_workspace):
    payload = {
        "title": "Build LiveKit Webhook Handler",
        "description": "Handle room_started and room_finished events",
        "priority": "HIGH",
        "status": "TODO"
    }
    headers = {**auth_headers, "X-Workspace-ID": default_workspace.id}
    res = client.post("/api/v1/tasks", json=payload, headers=headers)
    assert res.status_code == 201
    task_id = res.json()["id"]

    list_res = client.get("/api/v1/tasks", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_tasks_api.py -v`  
Expected: FAIL with 404 Not Found.

- [ ] **Step 3: Implement `src/backend/schemas/task.py` and `src/backend/api/v1/tasks.py`**

Build Pydantic schemas (`TaskCreate`, `TaskUpdate`, `TaskResponse`) and FastAPI route handlers with workspace tenant isolation. Register router in `router.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest src/backend/tests/test_tasks_api.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/schemas/task.py src/backend/api/v1/tasks.py src/backend/api/v1/router.py src/backend/tests/test_tasks_api.py
git commit -m "feat(api): implement /api/v1/tasks endpoints for multi-tenant Action Item management"
```

---

### Task 3: LiveKit Webhook Receiver (`/api/v1/webhooks/livekit`)

**Files:**

- Create: `src/backend/api/v1/webhooks.py`
- Modify: `src/backend/api/v1/router.py`
- Test: `src/backend/tests/test_livekit_webhooks.py`

**Interfaces:**

- Consumes: LiveKit event payloads (`room_started`, `room_finished`, `participant_joined`, `participant_left`).
- Produces: Updates `Meeting.status`, `started_at`, `ended_at` in DB.

- [ ] **Step 1: Write failing test for LiveKit webhook events**

```python
# src/backend/tests/test_livekit_webhooks.py
def test_livekit_webhook_room_started_and_finished(client, db_session, test_meeting):
    payload = {
        "event": "room_started",
        "room": {"name": test_meeting.id}
    }
    res = client.post("/api/v1/webhooks/livekit", json=payload)
    assert res.status_code == 200

    db_session.refresh(test_meeting)
    assert test_meeting.status.value == "IN_PROGRESS"

    finished_payload = {
        "event": "room_finished",
        "room": {"name": test_meeting.id}
    }
    client.post("/api/v1/webhooks/livekit", json=finished_payload)
    db_session.refresh(test_meeting)
    assert test_meeting.status.value == "COMPLETED"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_livekit_webhooks.py -v`  
Expected: FAIL with 404 Not Found.

- [ ] **Step 3: Implement `src/backend/api/v1/webhooks.py`**

Handle LiveKit event dispatching, DB meeting status updating, and error logging.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest src/backend/tests/test_livekit_webhooks.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/api/v1/webhooks.py src/backend/api/v1/router.py src/backend/tests/test_livekit_webhooks.py
git commit -m "feat(livekit): implement /api/v1/webhooks/livekit endpoint for automated meeting status tracking"
```

---

### Task 4: Real-Time SSE Notification Stream (`/api/v1/notifications/stream`)

**Files:**

- Create: `src/backend/api/v1/notifications.py`
- Modify: `src/backend/api/v1/router.py`
- Test: `src/backend/tests/test_notifications_api.py`

**Interfaces:**

- Consumes: `get_current_user` from `src/backend/api/deps.py`.
- Produces: `GET /api/v1/notifications/stream` SSE stream (`text/event-stream`).

- [ ] **Step 1: Write failing test for SSE notifications stream**

```python
# src/backend/tests/test_notifications_api.py
def test_sse_notifications_stream_auth(client, auth_headers):
    res = client.get("/api/v1/notifications/stream", headers=auth_headers)
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_notifications_api.py -v`  
Expected: FAIL with 404 Not Found.

- [ ] **Step 3: Implement `src/backend/api/v1/notifications.py`**

Build SSE event generator yielding real-time JSON events.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest src/backend/tests/test_notifications_api.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/api/v1/notifications.py src/backend/api/v1/router.py src/backend/tests/test_notifications_api.py
git commit -m "feat(notifications): add SSE streaming endpoint /api/v1/notifications/stream"
```

---

### Task 5: Meeting Invitations API (`/api/v1/meetings/{id}/invitations`)

**Files:**

- Create: `src/backend/schemas/invitation.py`
- Create: `src/backend/api/v1/invitations.py`
- Modify: `src/backend/api/v1/router.py`
- Test: `src/backend/tests/test_invitations_api.py`

**Interfaces:**

- Consumes: `get_current_user`, `get_current_workspace_member`.
- Produces: `POST /api/v1/meetings/{id}/invitations`, `GET /api/v1/invitations/verify/{token}`, `POST /api/v1/invitations/respond`.

- [ ] **Step 1: Write failing test for meeting invitations**

```python
# src/backend/tests/test_invitations_api.py
def test_create_and_verify_invitation(client, auth_headers, default_workspace, test_meeting):
    headers = {**auth_headers, "X-Workspace-ID": default_workspace.id}
    res = client.post(
        f"/api/v1/meetings/{test_meeting.id}/invitations",
        json={"email": "colleague@company.com", "role": "ATTENDEE"},
        headers=headers
    )
    assert res.status_code == 201
    token = res.json()["token"]

    verify_res = client.get(f"/api/v1/invitations/verify/{token}")
    assert verify_res.status_code == 200
    assert verify_res.json()["email"] == "colleague@company.com"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_invitations_api.py -v`  
Expected: FAIL with 404 Not Found.

- [ ] **Step 3: Implement `invitations.py` and register in `router.py`**

Build Pydantic schemas and FastAPI route handlers.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest src/backend/tests/test_invitations_api.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/schemas/invitation.py src/backend/api/v1/invitations.py src/backend/api/v1/router.py src/backend/tests/test_invitations_api.py
git commit -m "feat(invitations): add meeting invitation creation and verification endpoints"
```

---

### Task 6: File Upload & Attachment Service (`/api/v1/meetings/{id}/files`)

**Files:**

- Create: `src/backend/api/v1/files.py`
- Modify: `src/backend/api/v1/router.py`
- Test: `src/backend/tests/test_files_api.py`

**Interfaces:**

- Consumes: `get_current_user`, `get_current_workspace_member`.
- Produces: `POST /api/v1/meetings/{id}/files` (multipart upload), `GET /api/v1/meetings/{id}/files`.

- [ ] **Step 1: Write failing test for file upload**

```python
# src/backend/tests/test_files_api.py
def test_upload_and_list_meeting_files(client, auth_headers, default_workspace, test_meeting):
    headers = {**auth_headers, "X-Workspace-ID": default_workspace.id}
    files = {"file": ("architecture_doc.pdf", b"%PDF-1.4 sample content", "application/pdf")}
    res = client.post(f"/api/v1/meetings/{test_meeting.id}/files", files=files, headers=headers)
    assert res.status_code == 201
    assert res.json()["filename"] == "architecture_doc.pdf"

    list_res = client.get(f"/api/v1/meetings/{test_meeting.id}/files", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_files_api.py -v`  
Expected: FAIL with 404 Not Found.

- [ ] **Step 3: Implement file upload and retrieval endpoint in `files.py`**

Store uploaded files in `storage/meetings/{meeting_id}/` and record metadata in `MeetingFile`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest src/backend/tests/test_files_api.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/api/v1/files.py src/backend/api/v1/router.py src/backend/tests/test_files_api.py
git commit -m "feat(files): add multipart document upload service for meetings"
```

---

### Task 7: External AI Integration Ingestion Hooks

**Files:**

- Create: `src/backend/api/v1/ai_hooks.py`
- Modify: `src/backend/api/v1/router.py`
- Test: `src/backend/tests/test_ai_hooks.py`

**Interfaces:**

- Consumes: REST payloads from AI partner service.
- Produces: `POST /api/v1/meetings/{id}/transcript`, `POST /api/v1/meetings/{id}/summary`.

- [ ] **Step 1: Write failing test for AI Ingestion Hooks**

```python
# src/backend/tests/test_ai_hooks.py
def test_ingest_ai_transcript_and_summary(client, auth_headers, default_workspace, test_meeting):
    headers = {**auth_headers, "X-Workspace-ID": default_workspace.id}
    transcript_payload = {"speaker": "Alice", "text": "We should finalize the Alembic migrations.", "timestamp": 12.5}
    res = client.post(f"/api/v1/meetings/{test_meeting.id}/transcript", json=transcript_payload, headers=headers)
    assert res.status_code == 200

    summary_payload = {"summary": "Meeting agreed to execute Alembic migrations in batch mode."}
    res_summary = client.post(f"/api/v1/meetings/{test_meeting.id}/summary", json=summary_payload, headers=headers)
    assert res_summary.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_ai_hooks.py -v`  
Expected: FAIL with 404 Not Found.

- [ ] **Step 3: Implement `ai_hooks.py` and register in `router.py`**

Build ingestion endpoints for STT transcripts and AI summaries.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest src/backend/tests/test_ai_hooks.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/api/v1/ai_hooks.py src/backend/api/v1/router.py src/backend/tests/test_ai_hooks.py
git commit -m "feat(ai): add AI partner ingestion hooks for STT transcripts and MoM summaries"
```

---

### Task 8: Frontend State Bindings & Final Verification

**Files:**

- Modify: `src/frontend/src/lib/api.ts`
- Modify: `src/frontend/src/app/(dashboard)/tasks/page.tsx`
- Modify: `src/frontend/src/app/meetings/[id]/meeting-room-client.tsx`

**Interfaces:**

- Consumes: `/api/v1/tasks`, `/api/v1/meetings/{id}/files`, `/api/v1/notifications/stream`.

- [ ] **Step 1: Add `tasksApi`, `invitationsApi`, `filesApi` clients to `src/frontend/src/lib/api.ts`**

- [ ] **Step 2: Bind `tasks/page.tsx` to fetch and update real backend tasks**

- [ ] **Step 3: Verify complete backend pytest suite**

Run: `uv run pytest src/backend/ -v`  
Expected: All 55+ tests PASS.

- [ ] **Step 4: Verify Next.js production build**

Run: `npm run build --prefix src/frontend`  
Expected: Build succeeds with 0 errors.

- [ ] **Step 5: Commit & Push**

```bash
git add src/frontend/src/
git commit -m "feat(frontend): bind Tasks Kanban board and LiveKit meeting room to backend Phase 3 APIs"
git push origin develop
```
