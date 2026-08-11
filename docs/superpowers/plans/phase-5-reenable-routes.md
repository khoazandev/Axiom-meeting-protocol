# Phase 5 — Re-enable Disabled Routes & Enterprise Features

> **Goal:** Re-enable 11 disabled API routers, migrate from old workspace schema to new org-based schema.
> **Priority:** 🟢 MEDIUM — Needed for full-featured product but not blocking core flow.
> **Estimated effort:** Medium

---

## Context

Phase 1 schema redesign (Workspace → Organization) broke 11 old routers.
They were disabled in `src/backend/api/v1/router.py` to prevent import errors.
Tasks router was already re-enabled and migrated (uses ActionItem model).

---

## Disabled Routers (11 total)

| Router                    | Old Dependency              | Migration Needed                       |
| ------------------------- | --------------------------- | -------------------------------------- |
| `admin.py`                | WorkspaceMember             | → OrgMember + role check               |
| `analytics.py`            | Workspace queries           | → Organization queries                 |
| `ai_hooks.py`             | Workspace context           | → Organization context                 |
| `files.py`                | MeetingFile (old)           | → MeetingDocument (new)                |
| `knowledge.py`            | Workspace knowledge         | → Organization knowledge               |
| `mom.py`                  | WorkspaceMember, Task (old) | → OrgMember, ActionItem                |
| `notifications.py`        | Workspace notifications     | → Organization notifications           |
| `workspaces.py`           | Workspace CRUD              | → DELETE (replaced by organizations)   |
| `meetings.py` (legacy)    | Old Meeting model           | → DELETE (replaced by meetings_v2)     |
| `invitations.py` (legacy) | Old workspace invites       | → DELETE (replaced by org_invitations) |

### Action Plan

**Delete (3 files):** `workspaces.py`, `meetings.py` (legacy), `invitations.py` (legacy)
**Migrate (5 files):** `admin.py`, `analytics.py`, `files.py`, `mom.py`, `notifications.py`
**Review (2 files):** `ai_hooks.py`, `knowledge.py`
**Already done (1):** `tasks.py` ✅

---

## Tasks

### Task 1: Delete Legacy Routers

- Remove `workspaces.py`, `meetings.py`, `invitations.py` (legacy)
- Clean up imports in `router.py`

### Task 2: Migrate files.py

- Replace `MeetingFile` → `MeetingDocument`
- Update queries to use new schema

### Task 3: Migrate mom.py

- Replace `WorkspaceMember` → `OrgMember` or direct auth
- Replace `Task` → `ActionItem`
- Update `meeting_id` type from `int` → `str` (UUID)

### Task 4: Migrate notifications.py

- Replace `Workspace` → `Organization`
- Update notification queries

### Task 5: Migrate admin.py

- Add role-based access control using new Roles/Permissions tables
- Replace workspace admin checks with org admin checks

### Task 6: Migrate analytics.py

- Update all workspace-based queries to organization-based

### Task 7: Review ai_hooks.py & knowledge.py

- Assess if needed or if functionality is covered by new services

### Task 8: TDD for each migrated router

- Write tests before migration
- Verify all endpoints work with new schema

---

## Verification

```bash
python -m pytest src/backend/tests/ -v
```
