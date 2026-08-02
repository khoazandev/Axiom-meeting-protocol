# Phase 5 Implementation Plan — Enterprise Features & Admin Governance

> **Goal:** Implement Phase 5 Enterprise Governance (Dedicated Admin Console `/admin`, Audit Logging System, Outbound Webhook Engine, Email Notification Service, and Workspace Analytics).

---

## Task 1: Database Models & Alembic Migration for Phase 5

### Files
- **Modify:** [models.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/models.py)
- **New Migration:** [c3d4e5f6a7b8_add_phase5_tables.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/alembic/versions/c3d4e5f6a7b8_add_phase5_tables.py)
- **New Test:** [test_models_phase5.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_models_phase5.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_models_phase5.py`:
   - Create user, workspace.
   - Create `AuditLog` record (`action="LOGIN"`, `resource="Auth"`).
   - Create `OutboundWebhook` record (`name="Jira Webhook"`, `target_url="https://jira.company.com/webhook"`).
   - Assert fields & relationships.

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_models_phase5.py -v`

3. **Implement Phase 5 models** in `src/backend/models.py`:
   - Model `AuditLog`: `id` (String UUID), `workspace_id` (String ForeignKey), `user_id` (String ForeignKey, nullable), `action` (String), `resource` (String), `ip_address` (String, nullable), `details` (Text, nullable), `created_at` (DateTime).
   - Model `OutboundWebhook`: `id` (String UUID), `workspace_id` (String ForeignKey), `name` (String), `target_url` (String), `events` (String, default="all"), `secret_key` (String), `is_active` (Boolean, default True), `created_at` (DateTime).

4. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_models_phase5.py -v`

5. **Generate Alembic migration** `src/backend/alembic/versions/c3d4e5f6a7b8_add_phase5_tables.py`.

6. **Git Commit:**
   - Command: `git add src/backend/models.py src/backend/alembic/versions/c3d4e5f6a7b8_add_phase5_tables.py src/backend/tests/test_models_phase5.py && git commit -m "feat(db): add Phase 5 AuditLog and OutboundWebhook models with Alembic migration"`

---

## Task 2: Audit Logging Service & API (`/api/v1/admin/audit-logs`)

### Files
- **New Router:** [admin.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/admin.py)
- **Modify Router:** [router.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/router.py)
- **New Test:** [test_audit_logs_api.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_audit_logs_api.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_audit_logs_api.py`:
   - Create owner user & workspace member.
   - Insert an audit log entry.
   - `GET /api/v1/admin/audit-logs` -> assert 200 OK with list of logs for Owner/Admin.
   - Test non-admin member gets 403 Forbidden.

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_audit_logs_api.py -v`

3. **Implement router** in `src/backend/api/v1/admin.py`:
   - Enforce `ADMIN` / `OWNER` RBAC permissions.
   - `GET /api/v1/admin/audit-logs`: query logs ordered by timestamp desc.

4. **Register router** in `src/backend/api/v1/router.py`.

5. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_audit_logs_api.py -v`

6. **Git Commit:**
   - Command: `git add src/backend/api/v1/admin.py src/backend/api/v1/router.py src/backend/tests/test_audit_logs_api.py && git commit -m "feat(admin): implement audit logging API with strict RBAC authorization"`

---

## Task 3: Outbound Webhook Integration API (`/api/v1/admin/webhooks`)

### Files
- **Modify Router:** [admin.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/admin.py)
- **New Test:** [test_admin_webhooks_api.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_admin_webhooks_api.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_admin_webhooks_api.py`:
   - `POST /api/v1/admin/webhooks` with target_url & name.
   - Assert 201 CREATED.
   - `GET /api/v1/admin/webhooks` -> assert list contains webhook.
   - `DELETE /api/v1/admin/webhooks/{id}` -> assert 204.

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_admin_webhooks_api.py -v`

3. **Implement webhook endpoints** in `src/backend/api/v1/admin.py`.

4. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_admin_webhooks_api.py -v`

5. **Git Commit:**
   - Command: `git add src/backend/api/v1/admin.py src/backend/tests/test_admin_webhooks_api.py && git commit -m "feat(admin): add outbound webhook management endpoints"`

---

## Task 4: Admin Workspace Stats API (`/api/v1/admin/stats`)

### Files
- **Modify Router:** [admin.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/admin.py)
- **New Test:** [test_admin_stats_api.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_admin_stats_api.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_admin_stats_api.py`:
   - `GET /api/v1/admin/stats` -> returns workspace counts (members, meetings, tasks, docs, audit events).

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_admin_stats_api.py -v`

3. **Implement endpoint** in `src/backend/api/v1/admin.py`.

4. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_admin_stats_api.py -v`

5. **Git Commit:**
   - Command: `git add src/backend/api/v1/admin.py src/backend/tests/test_admin_stats_api.py && git commit -m "feat(admin): implement workspace telemetry and stats API"`

---

## Task 5: Email Notification Service Helper

### Files
- **New Service:** [email_service.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/services/email_service.py)
- **New Test:** [test_email_service.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_email_service.py)

### Step-by-Step Instructions

1. **Write test** `src/backend/tests/test_email_service.py`:
   - Test email template rendering for invitation, task assignment, and MoM digest.

2. **Implement helper** `src/backend/services/email_service.py`.

3. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_email_service.py -v`

4. **Git Commit:**
   - Command: `git add src/backend/services/email_service.py src/backend/tests/test_email_service.py && git commit -m "feat(email): add email notification service helper for templates"`

---

## Task 6: Frontend Dedicated Admin Portal (`/admin`)

### Files
- **New Page:** [page.tsx](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/src/app/(dashboard)/admin/page.tsx)

### Step-by-Step Instructions

1. Build `/admin` console page:
   - Check user role (RBAC gate: if not Owner/Admin -> 403 Forbidden display).
   - Stats Cards (Total Members, Active Meetings, Storage Usage, Audit Events).
   - Audit Log Table with action badges & IP addresses.
   - Outbound Webhooks Manager box with Add & Delete controls.

---

## Task 7: Sidebar Navigation RBAC Link Update

### Files
- **Modify Component:** [app-sidebar.tsx](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/src/components/layout/app-sidebar.tsx)

### Step-by-Step Instructions

1. Update `app-sidebar.tsx` to include `Admin Console` link (`/admin`) with Shield icon.

---

## Task 8: End-to-End System Verification

### Step-by-Step Instructions

1. Run complete Pytest test suite: `uv run pytest src/backend/ -v`.
2. Run Next.js production build: `npm run build` in `src/frontend`.
3. Verify zero errors.
4. Git Commit & Push.
