# Axiom Platform — Database & Architecture Redesign Spec

**Date**: 2026-08-09
**Status**: Approved
**Scope**: Database schema redesign for Personal + Business dual-tier platform

---

## 1. Problem Statement

Axiom hiện tại dùng `Workspace` đơn giản làm container cho meetings. Cần restructure thành:
- **Personal**: User tạo meeting cá nhân không cần container
- **Business**: Organization → Departments → Members, meeting scoped theo department, RBAC linh hoạt

Một user có thể vừa có Personal meetings riêng, vừa là member của nhiều Organizations.

## 2. Design Principles

1. **Single Meeting Engine**: Không tách Personal/Business thành 2 hệ thống. Dùng `organization_id = NULL` cho Personal.
2. **Department = Scope, MeetingMember = Actual Access**: Department xác định pool eligible users, `meeting_members` xác định ai thực sự được invite.
3. **3-layer Role System**: Organization Role + Department Role + Meeting Role — tách biệt, không hard-code.
4. **Hybrid RBAC**: Preset system roles + Admin có thể tùy chỉnh permissions per role.
5. **Extensible by default**: `parent_id` trên departments, enum-based permissions — không hard-code bất kỳ feature nào.

## 3. Database Schema (17 tables)

### A. Identity & Organization

#### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email | VARCHAR | UNIQUE, NOT NULL |
| password_hash | VARCHAR | NULL (OAuth users) |
| full_name | VARCHAR | NOT NULL |
| avatar_url | VARCHAR | NULL |
| provider | VARCHAR | DEFAULT 'local' |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

#### `organizations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR | NOT NULL |
| created_by | UUID | FK → users.id, NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

#### `organization_members`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations.id, NOT NULL |
| user_id | UUID | FK → users.id, NOT NULL |
| role_id | UUID | FK → roles.id, NOT NULL |
| status | ENUM | ACTIVE / SUSPENDED / DEACTIVATED |
| joined_at | TIMESTAMP | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**Constraints**: `UNIQUE(organization_id, user_id)`

### B. Departments

#### `departments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations.id, NOT NULL |
| name | VARCHAR | NOT NULL |
| description | TEXT | NULL |
| parent_id | UUID | FK → departments.id, NULL (flat MVP, nested later) |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**Constraints**: `UNIQUE(organization_id, name)`

#### `department_members`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| department_id | UUID | FK → departments.id, NOT NULL |
| user_id | UUID | FK → users.id, NOT NULL |
| role_id | UUID | FK → roles.id, NOT NULL |
| joined_at | TIMESTAMP | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**Constraints**: `UNIQUE(department_id, user_id)`

### C. Meetings (Unified Engine)

#### `meetings`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations.id, NULL |
| department_id | UUID | FK → departments.id, NULL |
| created_by | UUID | FK → users.id, NOT NULL |
| title | VARCHAR | NOT NULL |
| description | TEXT | NULL |
| scheduled_at | TIMESTAMP | NULL |
| started_at | TIMESTAMP | NULL |
| ended_at | TIMESTAMP | NULL |
| status | ENUM | SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**Type inference**:
- `organization_id = NULL` → Personal meeting
- `organization_id != NULL, department_id = NULL` → Org-wide meeting
- `organization_id != NULL, department_id != NULL` → Department-scoped meeting

#### `meeting_members`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings.id, NOT NULL |
| user_id | UUID | FK → users.id, NOT NULL |
| role | ENUM | HOST / CO_HOST / PARTICIPANT |
| status | ENUM | INVITED / ACCEPTED / DECLINED / JOINED / LEFT |
| joined_at | TIMESTAMP | NULL |
| left_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**Constraints**: `UNIQUE(meeting_id, user_id)`

### D. RBAC

#### `roles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations.id, NULL (system roles) |
| name | VARCHAR | NOT NULL |
| description | TEXT | NULL |
| scope | ENUM | ORGANIZATION / DEPARTMENT |
| is_system | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**System preset roles** (`is_system = TRUE`, `organization_id = NULL`):
- OWNER (scope: ORGANIZATION)
- ADMIN (scope: ORGANIZATION)
- MANAGER (scope: DEPARTMENT)
- MEMBER (scope: ORGANIZATION + DEPARTMENT)

**Custom roles**: `is_system = FALSE`, `organization_id = <org_id>`, created by ADMIN.

#### `permissions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| code | VARCHAR | UNIQUE, NOT NULL |
| description | TEXT | NULL |

**Preset permission codes**:
```
organization.read
organization.update
user.invite
user.remove
department.read
department.create
department.update
department.members.manage
meeting.create
meeting.update
meeting.delete
meeting.join
meeting.manage_members
```

#### `role_permissions`
| Column | Type | Constraints |
|--------|------|-------------|
| role_id | UUID | FK → roles.id, NOT NULL |
| permission_id | UUID | FK → permissions.id, NOT NULL |

**Constraints**: `PRIMARY KEY(role_id, permission_id)`

### E. Organization Invitations

#### `organization_invitations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations.id, NOT NULL |
| email | VARCHAR | NOT NULL |
| role_id | UUID | FK → roles.id, NOT NULL |
| department_id | UUID | FK → departments.id, NULL |
| invited_by | UUID | FK → users.id, NOT NULL |
| token | VARCHAR | UNIQUE, NOT NULL |
| status | ENUM | PENDING / ACCEPTED / EXPIRED / REVOKED |
| expires_at | TIMESTAMP | NOT NULL |
| accepted_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |

**Flow**: Admin invite (email + role + department) → user click link → accept → auto-create `organization_members` + `department_members`.

### F. Meeting Content & AI

#### `meeting_documents`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings.id, NOT NULL |
| uploaded_by | UUID | FK → users.id, NOT NULL |
| file_name | VARCHAR | NOT NULL |
| storage_path | VARCHAR | NOT NULL |
| file_type | VARCHAR | NOT NULL |
| file_size | BIGINT | NOT NULL |
| status | ENUM | UPLOADED / PROCESSING / READY / FAILED |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

#### `transcript_segments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings.id, NOT NULL |
| speaker_id | UUID | FK → users.id, NULL |
| content | TEXT | NOT NULL |
| start_time | DECIMAL | NOT NULL (seconds from meeting start) |
| end_time | DECIMAL | NOT NULL |
| sequence | INT | NOT NULL |
| confidence | DECIMAL | NULL |
| created_at | TIMESTAMP | NOT NULL |

#### `meeting_summaries`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings.id, UNIQUE |
| summary | TEXT | NOT NULL |
| key_points | JSON | NULL |
| decisions | JSON | NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

#### `action_items`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings.id, NOT NULL |
| transcript_segment_id | UUID | FK → transcript_segments.id, NULL |
| assignee_id | UUID | FK → users.id, NULL |
| title | VARCHAR | NOT NULL |
| description | TEXT | NULL |
| due_at | TIMESTAMP | NULL |
| status | ENUM | TODO / IN_PROGRESS / COMPLETED |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

#### `knowledge_chunks`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings.id, NOT NULL |
| source_type | ENUM | DOCUMENT / TRANSCRIPT |
| source_id | VARCHAR | NOT NULL |
| content | TEXT | NOT NULL |
| chunk_index | INT | NOT NULL |
| metadata | JSON | NULL |
| embedding | VECTOR | NULL |
| created_at | TIMESTAMP | NOT NULL |

#### `meeting_chat_messages`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings.id, NOT NULL |
| user_id | UUID | FK → users.id, NOT NULL |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

## 4. Tables Removed (Migration)

| Old Table | Replacement | Migration |
|-----------|------------|-----------|
| `workspaces` | `organizations` | Rename + restructure |
| `workspace_members` | `organization_members` | Add role_id, status |
| `meeting_invitations` | `meeting_members` | Unified with status tracking |
| `meeting_files` | `meeting_documents` | Add status, storage_path |
| `meeting_bookmarks` | Deferred | Re-add later if needed |
| `knowledge_documents` | `knowledge_chunks` | Unified RAG pipeline |
| `tasks` | `action_items` | Consolidated |
| `invitations` | `organization_invitations` | Restructured with department |
| `audit_logs` | Keep — re-parent to organizations | |
| `outbound_webhooks` | Keep — re-parent to organizations | |

## 5. Permission Check Flow

```
User requests action (e.g., create meeting in IT department)
    │
    ▼
Check: user is active org member?
    │ NO → 403
    ▼ YES
Check: user is active department member? (if department-scoped)
    │ NO → 403
    ▼ YES
Resolve role_id from organization_members (or department_members)
    │
    ▼
Lookup role_permissions for the resolved role
    │
    ▼
Check: required permission code exists?
    │ NO → 403
    ▼ YES → Allow action
```

## 6. Key Business Rules

1. **Personal meetings**: Any user can create. `organization_id = NULL`. Invite anyone by email.
2. **Business meetings (department-scoped)**: Only department members with `meeting.create` permission can create. Only active department members can be invited.
3. **Business meetings (org-wide)**: Only org members with `meeting.create` permission can create. Any active org member can be invited.
4. **Role inheritance**: System roles provide defaults. Org admins can customize permissions per role per org.
5. **Invitation flow**: Org invite → accept → auto-create org member + dept member records.
6. **Meeting lifecycle**: SCHEDULED → IN_PROGRESS (LiveKit room_started) → COMPLETED (room_finished).

## 7. Verification Plan

- Alembic migration generates correct schema
- All 17 tables created with correct constraints
- RBAC permission checks work for org/dept/meeting scopes
- Personal meetings work without organization
- Department-scoped meetings enforce member eligibility
- Existing tests updated to use new schema
