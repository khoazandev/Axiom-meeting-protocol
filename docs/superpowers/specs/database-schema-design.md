# Spec: Database Schema — Current State

> Living document — reflects the actual DB schema as of 2026-08-10

---

## Entity Relationship Diagram

```
┌──────────┐     ┌──────────────┐     ┌────────────┐
│  users   │────▶│ org_members  │◀────│organizations│
└────┬─────┘     └──────┬───────┘     └──────┬─────┘
     │                  │                     │
     │           ┌──────┴───────┐      ┌──────┴──────┐
     │           │  departments │      │    roles     │
     │           └──────────────┘      └──────┬──────┘
     │                                        │
     │                                 ┌──────┴──────┐
     │                                 │ permissions │
     │                                 │ role_perms  │
     │                                 └─────────────┘
     │
     │     ┌──────────────┐     ┌───────────────────┐
     ├────▶│   meetings   │────▶│ meeting_members   │
     │     └──────┬───────┘     └───────────────────┘
     │            │
     │     ┌──────┼──────────────────┬────────────────┐
     │     ▼      ▼                  ▼                ▼
     │  ┌────────────┐  ┌───────────────┐  ┌─────────────────┐
     │  │ transcript │  │ action_items  │  │meeting_summaries│
     │  │ _segments  │  │               │  │                 │
     │  └────────────┘  └───────────────┘  └─────────────────┘
     │     ▼                    ▼
     │  ┌────────────┐  ┌───────────────┐
     │  │ knowledge  │  │ meeting_chat  │
     │  │ _chunks    │  │ _messages     │
     │  └────────────┘  └───────────────┘
     │
     │  ┌────────────────┐  ┌──────────────────────┐
     ├──│meeting_documents│  │ organization_        │
     │  └────────────────┘  │ invitations          │
     │                      └──────────────────────┘
     │
     └──▶ audit_logs
```

---

## Tables (17)

### Core Identity

| Table           | PK          | Key Columns                                    | Notes             |
| --------------- | ----------- | ---------------------------------------------- | ----------------- |
| `users`         | `id` (UUID) | email, password_hash, full_name, is_superadmin | Auth source       |
| `organizations` | `id` (UUID) | name, slug                                     | Multi-tenant root |
| `org_members`   | `id` (UUID) | organization_id, user_id, role_id, status      | Membership + RBAC |
| `departments`   | `id` (UUID) | organization_id, name                          | Org subdivisions  |

### RBAC

| Table              | PK                        | Key Columns                      | Notes                               |
| ------------------ | ------------------------- | -------------------------------- | ----------------------------------- |
| `roles`            | `id` (UUID)               | organization_id, name, is_system | System roles: Owner, Admin, Member  |
| `permissions`      | `id` (UUID)               | codename, name                   | e.g. `meeting:create`, `org:manage` |
| `role_permissions` | `role_id + permission_id` | —                                | Many-to-many                        |

### Meetings

| Table                      | PK          | Key Columns                                   | Notes                                                |
| -------------------------- | ----------- | --------------------------------------------- | ---------------------------------------------------- |
| `meetings`                 | `id` (UUID) | organization_id, created_by_id, title, status | Status: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| `meeting_members`          | `id` (UUID) | meeting_id, user_id, role, status             | Role: HOST, MODERATOR, PARTICIPANT                   |
| `organization_invitations` | `id` (UUID) | organization_id, email, token, status         | Invite flow                                          |

### Meeting Content & AI

| Table                   | PK          | Key Columns                                         | Notes                  |
| ----------------------- | ----------- | --------------------------------------------------- | ---------------------- |
| `transcript_segments`   | `id` (UUID) | meeting_id, speaker_id, content, sequence           | STT output             |
| `action_items`          | `id` (UUID) | meeting_id, title, description, assignee_id, status | AI-extracted or manual |
| `meeting_summaries`     | `id` (UUID) | meeting_id (UNIQUE), summary, key_points, decisions | AI-generated           |
| `meeting_documents`     | `id` (UUID) | meeting_id, file_name, storage_path, status         | Uploaded files         |
| `knowledge_chunks`      | `id` (UUID) | meeting_id, source_type, content, chunk_index       | RAG embeddings         |
| `meeting_chat_messages` | `id` (UUID) | meeting_id, user_id, content                        | In-meeting chat        |

### System

| Table        | PK          | Key Columns                                | Notes             |
| ------------ | ----------- | ------------------------------------------ | ----------------- |
| `audit_logs` | `id` (UUID) | organization_id, user_id, action, resource | Activity tracking |

---

## Enums

```python
MeetingStatusEnum:     SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
MeetingMemberRoleEnum: HOST | MODERATOR | PARTICIPANT
MeetingMemberStatusEnum: INVITED | ACCEPTED | DECLINED | REMOVED
OrgMemberStatusEnum:   ACTIVE | SUSPENDED | DEACTIVATED
OrgInvitationStatusEnum: PENDING | ACCEPTED | DECLINED | EXPIRED
ActionItemStatusEnum:  TODO | IN_PROGRESS | DONE
DocumentStatusEnum:    UPLOADED | PROCESSING | INDEXED | ERROR
TranscriptSourceTypeEnum: LIVE_STT | UPLOADED | MANUAL
```

---

## Key Relationships

- `User` → many `OrgMember` → one `Organization` (multi-tenant)
- `Organization` → many `Department`, `Role`, `Meeting`
- `Meeting` → many `MeetingMember`, `TranscriptSegment`, `ActionItem`, `KnowledgeChunk`
- `Meeting` → one `MeetingSummary` (unique constraint)
- `ActionItem` → optional `TranscriptSegment` (linked to source)
- `Role` → many `Permission` (via `role_permissions`)
