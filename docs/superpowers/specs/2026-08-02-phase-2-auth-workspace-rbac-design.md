# Phase 2 — Multi-Tenant Auth, Workspaces & RBAC Specification

> **Version:** 1.0  
> **Date:** 2026-08-02  
> **Status:** Approved Design Spec  
> **Target Module:** Phase 2 (Authentication, Multi-Tenant Workspaces, RBAC)

---

## 1. Overview & Goals

Phase 2 introduces enterprise-grade Multi-Tenant Authentication, Workspace management, and Role-Based Access Control (RBAC) to the Axiom platform.

### Core Architecture Capabilities
1. **Multi-Tenant Workspace Model:** Users can create new Workspaces (becoming Owner/Admin) or join existing Workspaces via invitation links/codes.
2. **Self-Registration & SSO:** Supports local Email/Password registration as well as Google OAuth2 SSO.
3. **Role-Based Access Control (RBAC):**
   - `OWNER`: Full control over Workspace settings, billing, and deletion.
   - `ADMIN`: Manages members, departments, and workspace-wide meetings.
   - `MANAGER`: Department leads capable of creating department meetings and managing department members.
   - `MEMBER`: Standard employee participating in meetings and assigned action items.
4. **Strict Tenant Isolation:** All domain entities (`meetings`, `departments`, `action_items`) are partitioned by `workspace_id`. Cross-tenant data leakage is prevented at the dependency injection level in FastAPI.

---

## 2. Database Schema (PostgreSQL / SQLAlchemy)

### 2.1 Entity Relationship Diagram

```
┌───────────────────────────────────┐        ┌───────────────────────────────────┐
│ users                             │        │ workspaces                        │
├───────────────────────────────────┤        ├───────────────────────────────────┤
│ id: UUID (PK)                     │        │ id: UUID (PK)                     │
│ email: VARCHAR (UNIQUE)           │        │ name: VARCHAR                     │
│ password_hash: VARCHAR (NULLABLE) │        │ slug: VARCHAR (UNIQUE)            │
│ full_name: VARCHAR                │        │ logo_url: VARCHAR (NULLABLE)      │
│ avatar_url: VARCHAR (NULLABLE)    │        │ owner_id: UUID (FK -> users.id)   │
│ provider: VARCHAR (local|google)  │        │ created_at: TIMESTAMP             │
│ is_active: BOOLEAN                │        └───────────────────────────────────┘
└───────────────────────────────────┘                          │
                  │ 1                                          │ 1
                  │                                            │
                  ├───────────────┬────────────────────────────┤
                  │ N             │ N                          │ N
┌─────────────────▼───────────────▼─┐        ┌─────────────────▼─────────────────┐
│ workspace_members                 │        │ departments                       │
├───────────────────────────────────┤        ├───────────────────────────────────┤
│ id: UUID (PK)                     │        │ id: UUID (PK)                     │
│ workspace_id: UUID (FK)           │        │ workspace_id: UUID (FK)           │
│ user_id: UUID (FK)                │        │ name: VARCHAR                     │
│ role: ENUM (OWNER,ADMIN,MANAGER,  │        │ manager_id: UUID (FK -> users.id) │
│       MEMBER)                     │        │ created_at: TIMESTAMP             │
│ joined_at: TIMESTAMP              │        └───────────────────────────────────┘
└───────────────────────────────────┘                          │ 1
                                                               │ N
                                             ┌─────────────────▼─────────────────┐
                                             │ department_members                │
                                             ├───────────────────────────────────┤
                                             │ department_id: UUID (FK)          │
                                             │ user_id: UUID (FK)                │
                                             └───────────────────────────────────┘
```

### 2.2 Entity Schema Definitions

#### `users`
- `id`: Primary Key (UUID)
- `email`: String (Unique, Indexed)
- `password_hash`: String (Nullable for OAuth users)
- `full_name`: String
- `avatar_url`: String (Nullable)
- `provider`: String ("local", "google")
- `is_active`: Boolean (Default: True)
- `created_at`: DateTime (UTC)

#### `workspaces`
- `id`: Primary Key (UUID)
- `name`: String
- `slug`: String (Unique, Indexed)
- `logo_url`: String (Nullable)
- `owner_id`: Foreign Key (`users.id`)
- `created_at`: DateTime (UTC)

#### `workspace_members`
- `id`: Primary Key (UUID)
- `workspace_id`: Foreign Key (`workspaces.id`, Indexed)
- `user_id`: Foreign Key (`users.id`, Indexed)
- `role`: Enum ("OWNER", "ADMIN", "MANAGER", "MEMBER")
- `joined_at`: DateTime (UTC)
- *Unique Constraint:* (`workspace_id`, `user_id`)

#### `departments`
- `id`: Primary Key (UUID)
- `workspace_id`: Foreign Key (`workspaces.id`, Indexed)
- `name`: String
- `manager_id`: Foreign Key (`users.id`, Nullable)
- `created_at`: DateTime (UTC)

#### `department_members`
- `department_id`: Foreign Key (`departments.id`)
- `user_id`: Foreign Key (`users.id`)
- *Primary Key:* (`department_id`, `user_id`)

#### `invitations`
- `id`: Primary Key (UUID)
- `workspace_id`: Foreign Key (`workspaces.id`)
- `email`: String
- `role`: Enum ("ADMIN", "MANAGER", "MEMBER")
- `token`: String (Unique, Indexed)
- `expires_at`: DateTime (UTC)

#### Updated `meetings` Table
- `workspace_id`: Foreign Key (`workspaces.id`, Indexed, Mandatory)
- `department_id`: Foreign Key (`departments.id`, Nullable)
- `created_by_id`: Foreign Key (`users.id`, Mandatory)

---

## 3. Backend Architecture & API Specifications

### 3.1 Security & Auth Utilities (`src/backend/core/security.py`)
- Password Hashing: `passlib` with `bcrypt` / `argon2`
- JWT Management:
  - Access Token: Expires in 15 minutes, payload includes `sub` (user_id).
  - Refresh Token: Expires in 7 days, stored in HttpOnly Cookie or DB Session.

### 3.2 FastAPI Dependency Injection (`src/backend/api/deps.py`)
- `get_current_user`: Validates JWT Bearer token and returns active `User` model.
- `get_current_workspace_member`: Validates user membership in the requested `workspace_id` (via `X-Workspace-ID` header or path parameter).
- `require_role(allowed_roles: List[Role])`: Verifies that the member's role satisfies access requirements.

### 3.3 Endpoints

#### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Register new user account.
- `POST /api/v1/auth/login`: Authenticate email/password, return access_token & set refresh_token cookie.
- `POST /api/v1/auth/refresh`: Refresh access token using refresh_token.
- `POST /api/v1/auth/google`: OAuth2 callback for Google login.
- `GET /api/v1/auth/me`: Get current authenticated user profile.

#### Workspaces (`/api/v1/workspaces`)
- `POST /api/v1/workspaces`: Create a new Workspace (creator becomes `OWNER`).
- `GET /api/v1/workspaces`: List user's joined Workspaces.
- `GET /api/v1/workspaces/{workspace_id}`: Get workspace details & members.
- `POST /api/v1/workspaces/{workspace_id}/invite`: Send invitation link.
- `POST /api/v1/workspaces/join/{token}`: Accept invitation and join workspace.

#### Departments (`/api/v1/departments`)
- `POST /api/v1/departments`: Create a new Department within current active Workspace (`ADMIN` / `OWNER` only).
- `GET /api/v1/departments`: List departments in active Workspace.
- `POST /api/v1/departments/{department_id}/members`: Assign user to department.

---

## 4. Frontend Architecture & UI Design

### 4.1 State Management (`Zustand` + `React Query`)
- `useAuthStore`: Holds current `user`, `activeWorkspaceId`, `userWorkspaces`.
- `useQuery` / `useMutation`: Handles API caching and synchronization.

### 4.2 New Pages & Components
- `/login`: Clean enterprise login page with Google OAuth2 button.
- `/register`: Account creation page.
- `/invite/[token]`: Invite acceptance page.
- `Navbar`: Added Workspace Switcher dropdown (lists user's workspaces with "+ Create Workspace" action).
- `/settings/workspace`: Workspace settings, member list, role management, and invite modal.

### 4.3 Route Protection (`middleware.ts`)
- Unauthenticated requests to `/meetings`, `/settings` redirect to `/login`.
- Public routes: `/`, `/login`, `/register`, `/invite/[token]`.

---

## 5. Verification & TDD Plan

### 5.1 Automated Unit & Integration Tests (`src/backend/test_auth.py`, `src/backend/test_workspaces.py`)
1. **User Registration & Login:** Validates hashing, token generation, duplicate email rejection.
2. **Workspace Creation:** Verifies creator is assigned `OWNER` role.
3. **Tenant Isolation Enforcement:** Ensures User A in Workspace X receives `403 Forbidden` / `404 Not Found` when trying to fetch Workspace Y's meetings or departments.
4. **RBAC Guard Enforcement:** Verifies `MEMBER` role cannot create departments or invite new members.

---

## 6. Definition of Done
- All backend models, schemas, and endpoints implemented following TDD (Red-Green-Refactor).
- Alembic migration generated and applied cleanly.
- Frontend Auth pages, Workspace switcher, and Protected routes implemented.
- 100% of new backend endpoints covered by pytest with clean tenant isolation checks.
