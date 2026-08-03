# Phase 5 Design Spec — Enterprise Features & Admin Governance

> **Status:** APPROVED  
> **Date:** 2026-08-03  
> **Scope:** Dedicated Admin Console (`/admin`), Audit Logging System, Outbound Webhook Integration Engine, Email Notification Service, and Workspace Analytics.

---

## 1. Overview & Objectives

Phase 5 brings **Enterprise-Grade Governance & Administration** to Axiom. It equips enterprise administrators with complete visibility over security, compliance, integration hooks, and notification channels.

Key features:

1. **Dedicated Admin Console (`/admin`)**: Strict RBAC-gated route accessible only by `OWNER` and `ADMIN` roles.
2. **Audit Logging System**: Immutable log of security & operational events (logins, role updates, doc deletions, task syncs, meeting status changes).
3. **Outbound Webhook Engine**: Configurable HTTP webhook endpoints triggered on key workspace events.
4. **Email Notification Service**: Background email template renderer for meeting invites, task assignments, and MoM summaries.
5. **Workspace Analytics & Stats**: High-level telemetry on active members, meeting frequency, and storage usage.

---

## 2. Architecture & Data Model

### 2.1 Data Model Extensions (`src/backend/models.py`)

- Model `AuditLog`:
  - `id` (UUID string), `workspace_id` (ForeignKey), `user_id` (ForeignKey, nullable), `action` (String), `resource` (String), `ip_address` (String), `details` (Text), `created_at` (DateTime).
- Model `OutboundWebhook`:
  - `id` (UUID string), `workspace_id` (ForeignKey), `name` (String), `target_url` (String), `events` (String), `secret_key` (String), `is_active` (Boolean), `created_at` (DateTime).

### 2.2 New Backend Routers (`src/backend/api/v1/`)

- Router `src/backend/api/v1/admin.py`:
  - `GET /api/v1/admin/stats`: Workspace overall analytics & telemetry.
  - `GET /api/v1/admin/audit-logs`: List audit logs with action & date filters.
  - `GET /api/v1/admin/webhooks`: List registered outbound webhooks.
  - `POST /api/v1/admin/webhooks`: Register a new outbound webhook.
  - `DELETE /api/v1/admin/webhooks/{id}`: Delete an outbound webhook.
- All admin endpoints require `deps.require_role(RoleEnum.ADMIN)`.

### 2.3 Email Service (`src/backend/services/email_service.py`)

- Modular email service providing HTML templates for:
  - Meeting Invitations with join tokens.
  - Action item task notifications.
  - Post-meeting MoM summary digest.

---

## 3. Frontend Component Design (`src/frontend/`)

### 3.1 Dedicated Admin Page (`src/frontend/src/app/(dashboard)/admin/page.tsx`)

- **RBAC Gate**: Client-side role check; non-admins see a styled `403 Access Restricted` view.
- **Top Stats Grid**: Active users, total meetings count, total knowledge documents count, audit events count.
- **Audit Logs Table**: Searchable, filterable table with action badges and actor details.
- **Outbound Webhook Configuration Box**: Add new Webhook URL, toggle active status, and send test ping payload.

---

## 4. Verification & Testing Plan

### 4.1 Pytest Suite (`src/backend/tests/`)

- `test_audit_logs_api.py`: Verify audit log creation and RBAC access protection.
- `test_admin_webhooks_api.py`: Verify webhook creation, deletion, and RBAC authorization.

### 4.2 Frontend Build

- Verify Next.js compilation: `npm run build` in `src/frontend`.
