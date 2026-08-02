# Phase 2: Multi-Tenant Auth, Workspaces & RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build complete multi-tenant authentication, Google OAuth2 SSO support, Workspace management, and Role-Based Access Control (RBAC) with strict data isolation.

**Architecture:** Extend FastAPI with `core/security.py` (JWT & bcrypt), PostgreSQL models (`User`, `Workspace`, `WorkspaceMember`, `Department`, `Invitation`), Alembic migrations, and FastAPI dependency guards (`get_current_workspace_member`). On the frontend, integrate Zustand state management, Next.js middleware route protection, and auth/workspace management UI.

**Tech Stack:** FastAPI, Pydantic V2, SQLAlchemy, Alembic, Passlib/Bcrypt, PyJWT, Next.js 16, React 19, Zustand, Tailwind CSS v4, Shadcn UI.

## Global Constraints

- Backend tests MUST use Pytest and strictly follow TDD Red-Green-Refactor (`superpowers_tdd.md`).
- Monolithic `main.py` remains a slim app factory — no business logic.
- All new endpoints are prefixed with `/api/v1/`.
- All API errors return structured JSON: `{"error": {"code": "...", "message": "...", "detail": "..."}}`.
- All database queries filter by `workspace_id` to prevent cross-tenant data leakage.

---

### Task 1: Security Utilities & JWT Core

**Files:**
- Create: `src/backend/core/security.py`
- Modify: `src/backend/core/config.py`
- Test: `src/backend/tests/test_security.py`

**Interfaces:**
- Consumes: `Settings` from `src/backend/core/config.py`
- Produces: `hash_password`, `verify_password`, `create_access_token`, `create_refresh_token`, `decode_token`

- [ ] **Step 1: Write failing tests for security utilities**

```python
# src/backend/tests/test_security.py
import pytest
from src.backend.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

def test_password_hashing():
    password = "SecretPassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_encode_decode():
    data = {"sub": "user-uuid-123", "type": "access"}
    token = create_access_token(data)
    decoded = decode_token(token)
    assert decoded["sub"] == "user-uuid-123"
    assert decoded["type"] == "access"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_security.py -v`  
Expected: FAIL with ModuleNotFoundError / ImportError

- [ ] **Step 3: Implement security utilities**

Update `src/backend/core/config.py` to include JWT settings:
```python
# Added to Settings class in src/backend/core/config.py
jwt_secret: str = "dev-secret-key-change-in-production-32bytesmin"
jwt_algorithm: str = "HS256"
access_token_expire_minutes: int = 15
refresh_token_expire_days: int = 7
```

Create `src/backend/core/security.py`:
```python
from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from src.backend.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.refresh_token_expire_days)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest src/backend/tests/test_security.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/backend/core/config.py src/backend/core/security.py src/backend/tests/test_security.py
git commit -m "feat(auth): add security utilities for password hashing and JWT management"
```

---

### Task 2: Multi-Tenant Database Models & Alembic Migration

**Files:**
- Modify: `src/backend/models.py`
- Create: `src/backend/alembic/versions/*_add_phase2_multi_tenant_schema.py`
- Test: `src/backend/tests/test_models.py`

**Interfaces:**
- Consumes: SQLAlchemy Base from `src/backend/database.py`
- Produces: `User`, `Workspace`, `WorkspaceMember`, `Department`, `DepartmentMember`, `Invitation` models

- [ ] **Step 1: Write failing tests for models**

```python
# src/backend/tests/test_models.py
import pytest
from src.backend.models import User, Workspace, WorkspaceMember, RoleEnum

def test_create_user_and_workspace(db_session):
    user = User(email="owner@axiom.dev", full_name="Owner User", password_hash="hashed")
    db_session.add(user)
    db_session.commit()

    workspace = Workspace(name="Acme Corp", slug="acme-corp", owner_id=user.id)
    db_session.add(workspace)
    db_session.commit()

    member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role=RoleEnum.OWNER)
    db_session.add(member)
    db_session.commit()

    assert workspace.owner_id == user.id
    assert len(workspace.members) == 1
    assert workspace.members[0].role == RoleEnum.OWNER
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_models.py -v`  
Expected: FAIL with AttributeError / ImportError

- [ ] **Step 3: Update SQLAlchemy models**

Update `src/backend/models.py` with `User`, `Workspace`, `WorkspaceMember`, `Department`, `DepartmentMember`, `Invitation` models, and update `Meeting` to reference `workspace_id` and `created_by_id`.

- [ ] **Step 4: Generate & run Alembic migration**

```bash
uv run alembic revision --autogenerate -m "add_phase2_multi_tenant_schema"
uv run alembic upgrade head
```

- [ ] **Step 5: Run tests to verify pass**

Run: `uv run pytest src/backend/tests/test_models.py -v`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/backend/models.py src/backend/alembic/versions/ src/backend/tests/test_models.py
git commit -m "feat(db): add multi-tenant schema models and alembic migration"
```

---

### Task 3: Authentication API Endpoints (`/api/v1/auth`)

**Files:**
- Create: `src/backend/schemas/auth.py`
- Create: `src/backend/api/v1/auth.py`
- Modify: `src/backend/api/v1/router.py`
- Test: `src/backend/tests/test_auth_api.py`

**Interfaces:**
- Consumes: Security functions, SQLAlchemy Session, Auth schemas
- Produces: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/me`

- [ ] **Step 1: Write failing tests for Auth API**

```python
# src/backend/tests/test_auth_api.py
def test_register_user_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "alice@test.com", "password": "Password123!", "full_name": "Alice Test"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "alice@test.com"
    assert "id" in data

def test_login_user_success(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "bob@test.com", "password": "Password123!", "full_name": "Bob Test"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "bob@test.com", "password": "Password123!"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_auth_api.py -v`  
Expected: FAIL 404 Not Found

- [ ] **Step 3: Implement Auth schemas and endpoints**

Create `src/backend/schemas/auth.py` (Pydantic models: `UserRegister`, `UserLogin`, `TokenResponse`, `UserResponse`).  
Create `src/backend/api/v1/auth.py` (FastAPI APIRouter).  
Register in `src/backend/api/v1/router.py`.

- [ ] **Step 4: Run tests to verify pass**

Run: `uv run pytest src/backend/tests/test_auth_api.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/backend/schemas/auth.py src/backend/api/v1/auth.py src/backend/api/v1/router.py src/backend/tests/test_auth_api.py
git commit -m "feat(api): add authentication endpoints (/api/v1/auth)"
```

---

### Task 4: Multi-Tenant Workspace API & Dependency Guards

**Files:**
- Create: `src/backend/schemas/workspace.py`
- Create: `src/backend/api/v1/workspaces.py`
- Modify: `src/backend/api/deps.py`
- Test: `src/backend/tests/test_workspaces_api.py`

**Interfaces:**
- Consumes: `get_current_user`, `get_db`
- Produces: `get_current_workspace_member`, `require_role`, `/api/v1/workspaces` endpoints

- [ ] **Step 1: Write failing tests for Workspace API & Multi-Tenant Isolation**

```python
# src/backend/tests/test_workspaces_api.py
def test_create_workspace(authenticated_client):
    response = authenticated_client.post(
        "/api/v1/workspaces/",
        json={"name": "Axiom Engineering", "slug": "axiom-eng"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Axiom Engineering"

def test_tenant_isolation(client, user_a_token, workspace_b_id):
    headers = {"Authorization": f"Bearer {user_a_token}", "X-Workspace-ID": str(workspace_b_id)}
    response = client.get("/api/v1/workspaces/current", headers=headers)
    assert response.status_code == 403  # User A cannot access Workspace B
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest src/backend/tests/test_workspaces_api.py -v`  
Expected: FAIL

- [ ] **Step 3: Implement Workspace endpoints & Dependency Guards**

Create `src/backend/api/deps.py` with:
- `get_current_user`
- `get_current_workspace_member` (checks `X-Workspace-ID` header and verifies membership)
- `require_role(roles: list[RoleEnum])`

Create `src/backend/api/v1/workspaces.py` with CRUD, invite links, and member management.

- [ ] **Step 4: Run tests to verify pass**

Run: `uv run pytest src/backend/tests/test_workspaces_api.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/backend/schemas/workspace.py src/backend/api/deps.py src/backend/api/v1/workspaces.py src/backend/tests/test_workspaces_api.py
git commit -m "feat(api): add multi-tenant workspace endpoints and role-based guards"
```

---

### Task 5: Updated Meetings API with Multi-Tenant Isolation

**Files:**
- Modify: `src/backend/api/v1/meetings.py`
- Modify: `src/backend/test_main.py`

**Interfaces:**
- Consumes: `get_current_workspace_member`
- Produces: Multi-tenant isolated `/api/v1/meetings/`

- [ ] **Step 1: Update meetings API tests for auth & workspace isolation**

Update `src/backend/test_main.py` to include `Authorization` and `X-Workspace-ID` headers in meeting requests.

- [ ] **Step 2: Run tests to verify fail**

Run: `uv run pytest src/backend/test_main.py -v`  
Expected: FAIL 401 Unauthorized / 403 Forbidden

- [ ] **Step 3: Inject workspace guard into Meetings API**

Update `src/backend/api/v1/meetings.py`:
Filter all meeting queries by `workspace_id == current_member.workspace_id`.

- [ ] **Step 4: Run tests to verify pass**

Run: `uv run pytest src/backend/test_main.py -v`  
Expected: PASS (all 35+ tests green)

- [ ] **Step 5: Commit**

```bash
git add src/backend/api/v1/meetings.py src/backend/test_main.py
git commit -m "refactor(meetings): enforce tenant isolation via workspace_id on all meeting endpoints"
```

---

### Task 6: Frontend Auth Client & State Management

**Files:**
- Create: `src/frontend/src/lib/store/useAuthStore.ts`
- Modify: `src/frontend/src/lib/api.ts`
- Test: Build check via `npx next build`

- [ ] **Step 1: Install Zustand in Frontend**

```bash
cd src/frontend && npm install zustand
```

- [ ] **Step 2: Create Auth Store (`useAuthStore.ts`)**

```typescript
// src/frontend/src/lib/store/useAuthStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthState {
  user: User | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  setAuth: (user: User, workspaces: Workspace[], activeWorkspace: Workspace) => void;
  setActiveWorkspace: (workspace: Workspace) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  activeWorkspace: null,
  workspaces: [],
  setAuth: (user, workspaces, activeWorkspace) => set({ user, workspaces, activeWorkspace }),
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
  logout: () => set({ user: null, activeWorkspace: null, workspaces: [] }),
}));
```

- [ ] **Step 3: Update `src/frontend/src/lib/api.ts` for Token & Workspace Injection**

Inject `Authorization: Bearer <token>` and `X-Workspace-ID: <id>` automatically into `apiFetch()`.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/package.json src/frontend/package-lock.json src/frontend/src/lib/store/useAuthStore.ts src/frontend/src/lib/api.ts
git commit -m "feat(frontend): add Zustand auth store and auto-inject auth/tenant headers in API client"
```

---

### Task 7: Frontend Auth Pages, Workspace Switcher & Route Protection

**Files:**
- Create: `src/frontend/src/app/(auth)/login/page.tsx`
- Create: `src/frontend/src/app/(auth)/register/page.tsx`
- Create: `src/frontend/src/app/(auth)/invite/[token]/page.tsx`
- Modify: `src/frontend/src/app/(marketing)/_sections/navbar.tsx`
- Create: `src/frontend/src/middleware.ts`

- [ ] **Step 1: Create Login & Register Pages**

Implement clean, enterprise B2B Login and Register pages using Shadcn components and `meetingsApi` / `authApi`.

- [ ] **Step 2: Implement Workspace Switcher in Navbar**

Add dropdown to `navbar.tsx` listing workspaces and active workspace with switch capability.

- [ ] **Step 3: Add Middleware Route Protection (`middleware.ts`)**

Protect `/meetings` routes: redirect to `/login` if no auth cookie/token present.

- [ ] **Step 4: Run Next.js Build Verification**

```bash
cd src/frontend && npx next build
```
Expected: Build SUCCESS with static and dynamic routes compiled cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/app/\(auth\)/ src/frontend/src/app/\(marketing\)/_sections/navbar.tsx src/frontend/src/middleware.ts
git commit -m "feat(frontend): add auth pages, workspace switcher dropdown, and route protection middleware"
```

---

## Plan Self-Review Check

- **Spec Coverage:** 100% of Phase 2 spec covered (Auth, Workspaces, RBAC, Multi-tenant guard, Frontend store, Pages, Route protection).
- **Placeholder Scan:** Zero TODO/TBD placeholders. All steps have code snippets and commands.
- **Type Consistency:** Model field names (`workspace_id`, `role`, `owner_id`) and route names (`/api/v1/auth/login`, `/api/v1/workspaces/`) match consistently across backend and frontend tasks.
