# Platform Redesign — Phase 1: Database Schema & RBAC Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **TDD Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Every task follows strict Red-Green-Refactor. Tests are ALWAYS written and verified failing BEFORE any implementation.

**Goal:** Replace workspace-based data model with Organization + Department + RBAC schema (17 tables), keeping the app functional throughout migration.

**Architecture:** Alembic migration drops old workspace tables and creates new org/dept/RBAC/meeting tables. Models rewritten with UUID PKs. Permission seeding inserts system roles + preset permissions. Existing auth stays intact — JWT + bcrypt unchanged.

**Tech Stack:** Python 3.12, SQLAlchemy ORM, Alembic migrations, FastAPI, SQLite (dev) / PostgreSQL (prod), pytest

## Global Constraints

- All PKs are UUID strings (generated via `uuid.uuid4()`)
- All tables have `created_at` + `updated_at` TIMESTAMP columns
- Enum values are uppercase strings stored via SQLAlchemy `Enum()`
- No hard-coded permission checks — always resolve through `role_permissions` lookup
- Existing JWT auth flow (`src/backend/core/security.py`) stays unchanged
- **TDD: Every step runs tests. No implementation code written without a failing test first.**

## Decomposition Note

This spec is too large for a single plan. It is split into **4 phases**:

| Phase                   | Plan                              | Scope                                                                        |
| ----------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| **Phase 1 (this plan)** | Database Schema & RBAC Foundation | Models, Alembic migration, permission seeding, conftest                      |
| Phase 2                 | Organization & Department APIs    | CRUD endpoints, invitation flow, membership management                       |
| Phase 3                 | Meeting Engine Refactor           | Unified meeting engine, meeting_members, permission middleware               |
| Phase 4                 | Content & AI Tables               | transcript_segments, meeting_summaries, action_items, knowledge_chunks, chat |

Each phase produces working, testable software independently. Phase 1 must complete before Phase 2 begins.

---

### Task 1: RED — Write All Enum Tests

**Files:**

- Create: `src/backend/tests/test_models_redesign.py`

**Interfaces:**

- Produces: Failing test file that defines the expected enum API surface

- [ ] **Step 1: Create test file with enum tests**

```python
# src/backend/tests/test_models_redesign.py
"""
TDD tests for platform redesign models.
All tests written FIRST — implementation follows.
"""
from src.backend import models


class TestNewEnums:
    """RED: These tests define the expected enum types."""

    def test_org_member_status_enum(self):
        assert models.OrgMemberStatusEnum.ACTIVE == "ACTIVE"
        assert models.OrgMemberStatusEnum.SUSPENDED == "SUSPENDED"
        assert models.OrgMemberStatusEnum.DEACTIVATED == "DEACTIVATED"

    def test_meeting_member_role_enum(self):
        assert models.MeetingMemberRoleEnum.HOST == "HOST"
        assert models.MeetingMemberRoleEnum.CO_HOST == "CO_HOST"
        assert models.MeetingMemberRoleEnum.PARTICIPANT == "PARTICIPANT"

    def test_meeting_member_status_enum(self):
        assert models.MeetingMemberStatusEnum.INVITED == "INVITED"
        assert models.MeetingMemberStatusEnum.ACCEPTED == "ACCEPTED"
        assert models.MeetingMemberStatusEnum.DECLINED == "DECLINED"
        assert models.MeetingMemberStatusEnum.JOINED == "JOINED"
        assert models.MeetingMemberStatusEnum.LEFT == "LEFT"

    def test_role_scope_enum(self):
        assert models.RoleScopeEnum.ORGANIZATION == "ORGANIZATION"
        assert models.RoleScopeEnum.DEPARTMENT == "DEPARTMENT"

    def test_document_status_enum(self):
        assert models.DocumentStatusEnum.UPLOADED == "UPLOADED"
        assert models.DocumentStatusEnum.PROCESSING == "PROCESSING"
        assert models.DocumentStatusEnum.READY == "READY"
        assert models.DocumentStatusEnum.FAILED == "FAILED"

    def test_transcript_source_type_enum(self):
        assert models.TranscriptSourceTypeEnum.DOCUMENT == "DOCUMENT"
        assert models.TranscriptSourceTypeEnum.TRANSCRIPT == "TRANSCRIPT"

    def test_action_item_status_enum(self):
        assert models.ActionItemStatusEnum.TODO == "TODO"
        assert models.ActionItemStatusEnum.IN_PROGRESS == "IN_PROGRESS"
        assert models.ActionItemStatusEnum.COMPLETED == "COMPLETED"

    def test_org_invitation_status_enum(self):
        assert models.OrgInvitationStatusEnum.PENDING == "PENDING"
        assert models.OrgInvitationStatusEnum.ACCEPTED == "ACCEPTED"
        assert models.OrgInvitationStatusEnum.EXPIRED == "EXPIRED"
        assert models.OrgInvitationStatusEnum.REVOKED == "REVOKED"
```

- [ ] **Step 2: Run tests — verify RED**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestNewEnums -v`
Expected: ALL FAIL with `AttributeError: module 'src.backend.models' has no attribute 'OrgMemberStatusEnum'`

- [ ] **Step 3: Commit RED tests**

```bash
git add src/backend/tests/test_models_redesign.py
git commit -m "test(models): RED — add failing tests for new platform enum types"
```

---

### Task 2: GREEN — Implement Enums to Pass Tests

**Files:**

- Modify: `src/backend/models.py` (after line ~53, after existing enums)

**Interfaces:**

- Consumes: Failing tests from Task 1
- Produces: All enum classes pass their tests

- [ ] **Step 1: Implement all new enums**

Add to `src/backend/models.py` after existing enum definitions:

```python
class OrgMemberStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DEACTIVATED = "DEACTIVATED"


class MeetingMemberRoleEnum(str, enum.Enum):
    HOST = "HOST"
    CO_HOST = "CO_HOST"
    PARTICIPANT = "PARTICIPANT"


class MeetingMemberStatusEnum(str, enum.Enum):
    INVITED = "INVITED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    JOINED = "JOINED"
    LEFT = "LEFT"


class RoleScopeEnum(str, enum.Enum):
    ORGANIZATION = "ORGANIZATION"
    DEPARTMENT = "DEPARTMENT"


class DocumentStatusEnum(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"


class TranscriptSourceTypeEnum(str, enum.Enum):
    DOCUMENT = "DOCUMENT"
    TRANSCRIPT = "TRANSCRIPT"


class ActionItemStatusEnum(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class OrgInvitationStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
```

- [ ] **Step 2: Run tests — verify GREEN**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestNewEnums -v`
Expected: ALL PASS

- [ ] **Step 3: Commit GREEN**

```bash
git add src/backend/models.py
git commit -m "feat(models): GREEN — implement new platform enum types"
```

---

### Task 3: RED — Write Organization & OrgMember Model Tests

**Files:**

- Modify: `src/backend/tests/test_models_redesign.py`

**Interfaces:**

- Produces: Failing tests defining Organization and OrganizationMember table structure

- [ ] **Step 1: Add Organization and OrgMember tests**

Append to `src/backend/tests/test_models_redesign.py`:

```python
class TestOrganizationModels:
    """RED: Tests for Organization and OrganizationMember."""

    def test_create_organization(self, db_session):
        user = models.User(
            email="orgtest@test.com", password_hash="hash", full_name="Org Tester"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="Acme Corp", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        assert org.id is not None
        assert len(org.id) == 36  # UUID format
        assert org.name == "Acme Corp"
        assert org.created_by_id == user.id
        assert org.created_at is not None
        assert org.updated_at is not None

    def test_organization_creator_relationship(self, db_session):
        user = models.User(
            email="orgrel@test.com", password_hash="hash", full_name="Org Rel"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="Rel Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        assert org.creator.id == user.id
        assert org.creator.email == "orgrel@test.com"

    def test_organization_member_with_role(self, db_session):
        user = models.User(
            email="orgmem@test.com", password_hash="hash", full_name="Org Mem"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="Mem Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        role = models.Role(
            name="MEMBER",
            scope=models.RoleScopeEnum.ORGANIZATION,
            is_system=True,
        )
        db_session.add(role)
        db_session.commit()

        member = models.OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role_id=role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        )
        db_session.add(member)
        db_session.commit()

        assert member.id is not None
        assert member.status == models.OrgMemberStatusEnum.ACTIVE
        assert member.joined_at is not None

    def test_organization_member_unique_constraint(self, db_session):
        import sqlalchemy

        user = models.User(
            email="orgdup@test.com", password_hash="hash", full_name="Dup"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="Dup Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        role = models.Role(
            name="MEMBER",
            scope=models.RoleScopeEnum.ORGANIZATION,
            is_system=True,
        )
        db_session.add(role)
        db_session.commit()

        m1 = models.OrganizationMember(
            organization_id=org.id, user_id=user.id, role_id=role.id
        )
        db_session.add(m1)
        db_session.commit()

        m2 = models.OrganizationMember(
            organization_id=org.id, user_id=user.id, role_id=role.id
        )
        db_session.add(m2)
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            db_session.commit()
        db_session.rollback()
```

- [ ] **Step 2: Run tests — verify RED**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestOrganizationModels -v`
Expected: ALL FAIL with `AttributeError: module has no attribute 'Organization'`

- [ ] **Step 3: Commit RED tests**

```bash
git add src/backend/tests/test_models_redesign.py
git commit -m "test(models): RED — add failing tests for Organization and OrgMember"
```

---

### Task 4: GREEN — Implement Organization & OrgMember Models

**Files:**

- Modify: `src/backend/models.py`

**Interfaces:**

- Consumes: Failing tests from Task 3, `generate_uuid()`, `OrgMemberStatusEnum`, `RoleScopeEnum`
- Produces: `Organization`, `OrganizationMember` models

- [ ] **Step 1: Implement Organization model**

Add to `src/backend/models.py`:

```python
class Organization(database.Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    creator = relationship("User", foreign_keys=[created_by_id])
    members = relationship(
        "OrganizationMember",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    departments = relationship(
        "Department", back_populates="organization", cascade="all, delete-orphan"
    )
```

- [ ] **Step 2: Implement OrganizationMember model**

```python
class OrganizationMember(database.Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        database.UniqueConstraint("organization_id", "user_id"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(
        String, ForeignKey("organizations.id"), nullable=False, index=True
    )
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    status = Column(
        Enum(OrgMemberStatusEnum),
        default=OrgMemberStatusEnum.ACTIVE,
        nullable=False,
    )
    joined_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    organization = relationship("Organization", back_populates="members")
    user = relationship("User")
    role = relationship("Role")
```

- [ ] **Step 3: Run tests — verify GREEN**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestOrganizationModels -v`
Expected: ALL PASS

- [ ] **Step 4: Commit GREEN**

```bash
git add src/backend/models.py
git commit -m "feat(models): GREEN — implement Organization and OrganizationMember"
```

---

### Task 5: RED — Write RBAC Model Tests

**Files:**

- Modify: `src/backend/tests/test_models_redesign.py`

**Interfaces:**

- Produces: Failing tests for Role, Permission, RolePermission

- [ ] **Step 1: Add RBAC tests**

Append to `src/backend/tests/test_models_redesign.py`:

```python
class TestRBACModels:
    """RED: Tests for Role, Permission, RolePermission."""

    def test_create_system_role(self, db_session):
        role = models.Role(
            name="ADMIN",
            description="Organization administrator",
            scope=models.RoleScopeEnum.ORGANIZATION,
            is_system=True,
        )
        db_session.add(role)
        db_session.commit()

        assert role.id is not None
        assert role.is_system is True
        assert role.organization_id is None  # system role — no org
        assert role.scope == models.RoleScopeEnum.ORGANIZATION

    def test_create_custom_org_role(self, db_session):
        user = models.User(
            email="rbac@test.com", password_hash="hash", full_name="RBAC"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="RBAC Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        custom = models.Role(
            name="TEAM_LEAD",
            description="Custom team lead role",
            scope=models.RoleScopeEnum.DEPARTMENT,
            is_system=False,
            organization_id=org.id,
        )
        db_session.add(custom)
        db_session.commit()

        assert custom.is_system is False
        assert custom.organization_id == org.id

    def test_permission_unique_code(self, db_session):
        import sqlalchemy

        p1 = models.Permission(code="meeting.create", description="Create meetings")
        db_session.add(p1)
        db_session.commit()

        p2 = models.Permission(code="meeting.create", description="Duplicate")
        db_session.add(p2)
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            db_session.commit()
        db_session.rollback()

    def test_role_permission_mapping(self, db_session):
        role = models.Role(
            name="ADMIN",
            scope=models.RoleScopeEnum.ORGANIZATION,
            is_system=True,
        )
        db_session.add(role)
        db_session.commit()

        perm1 = models.Permission(code="meeting.create", description="Create")
        perm2 = models.Permission(code="meeting.delete", description="Delete")
        db_session.add_all([perm1, perm2])
        db_session.commit()

        rp1 = models.RolePermission(role_id=role.id, permission_id=perm1.id)
        rp2 = models.RolePermission(role_id=role.id, permission_id=perm2.id)
        db_session.add_all([rp1, rp2])
        db_session.commit()

        assert len(role.permissions) == 2

    def test_role_permission_composite_pk(self, db_session):
        import sqlalchemy

        role = models.Role(
            name="DUP",
            scope=models.RoleScopeEnum.ORGANIZATION,
            is_system=True,
        )
        db_session.add(role)
        db_session.commit()

        perm = models.Permission(code="test.dup", description="Dup")
        db_session.add(perm)
        db_session.commit()

        rp1 = models.RolePermission(role_id=role.id, permission_id=perm.id)
        db_session.add(rp1)
        db_session.commit()

        rp2 = models.RolePermission(role_id=role.id, permission_id=perm.id)
        db_session.add(rp2)
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            db_session.commit()
        db_session.rollback()
```

- [ ] **Step 2: Run tests — verify RED**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestRBACModels -v`
Expected: ALL FAIL with `AttributeError: module has no attribute 'Role'`

- [ ] **Step 3: Commit RED tests**

```bash
git add src/backend/tests/test_models_redesign.py
git commit -m "test(models): RED — add failing tests for RBAC (Role, Permission, RolePermission)"
```

---

### Task 6: GREEN — Implement RBAC Models

**Files:**

- Modify: `src/backend/models.py`

**Interfaces:**

- Consumes: Failing tests from Task 5
- Produces: `Role`, `Permission`, `RolePermission` models

- [ ] **Step 1: Implement Role, Permission, RolePermission**

Add to `src/backend/models.py`:

```python
class Role(database.Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(
        String, ForeignKey("organizations.id"), nullable=True, index=True
    )
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scope = Column(Enum(RoleScopeEnum), nullable=False)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    organization = relationship("Organization", foreign_keys=[organization_id])
    permissions = relationship(
        "RolePermission", back_populates="role", cascade="all, delete-orphan"
    )


class Permission(database.Base):
    __tablename__ = "permissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    code = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)


class RolePermission(database.Base):
    __tablename__ = "role_permissions"

    role_id = Column(String, ForeignKey("roles.id"), primary_key=True)
    permission_id = Column(String, ForeignKey("permissions.id"), primary_key=True)

    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission")
```

- [ ] **Step 2: Run tests — verify GREEN**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestRBACModels -v`
Expected: ALL PASS

- [ ] **Step 3: Commit GREEN**

```bash
git add src/backend/models.py
git commit -m "feat(models): GREEN — implement Role, Permission, RolePermission"
```

---

### Task 7: RED — Write Department Model Tests (Redesigned)

**Files:**

- Modify: `src/backend/tests/test_models_redesign.py`

**Interfaces:**

- Produces: Failing tests for redesigned Department (with parent_id, description, org FK) and DepartmentMember (with role_id, UUID PK)

- [ ] **Step 1: Add Department tests**

Append to `src/backend/tests/test_models_redesign.py`:

```python
class TestDepartmentModels:
    """RED: Tests for redesigned Department and DepartmentMember."""

    def test_create_department_in_org(self, db_session):
        user = models.User(
            email="dept@test.com", password_hash="hash", full_name="Dept"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="Dept Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        dept = models.Department(
            organization_id=org.id,
            name="Engineering",
            description="Engineering team",
        )
        db_session.add(dept)
        db_session.commit()

        assert dept.id is not None
        assert dept.organization_id == org.id
        assert dept.description == "Engineering team"
        assert dept.parent_id is None
        assert dept.updated_at is not None

    def test_nested_department_parent_id(self, db_session):
        user = models.User(
            email="nested@test.com", password_hash="hash", full_name="Nested"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="Nested Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        parent = models.Department(organization_id=org.id, name="Engineering")
        db_session.add(parent)
        db_session.commit()

        child = models.Department(
            organization_id=org.id,
            name="Backend",
            parent_id=parent.id,
        )
        db_session.add(child)
        db_session.commit()

        assert child.parent_id == parent.id

    def test_department_member_with_role(self, db_session):
        user = models.User(
            email="deptmem@test.com", password_hash="hash", full_name="DeptMem"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="DM Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        dept = models.Department(organization_id=org.id, name="IT")
        db_session.add(dept)
        db_session.commit()

        role = models.Role(
            name="MANAGER",
            scope=models.RoleScopeEnum.DEPARTMENT,
            is_system=True,
        )
        db_session.add(role)
        db_session.commit()

        dm = models.DepartmentMember(
            department_id=dept.id,
            user_id=user.id,
            role_id=role.id,
        )
        db_session.add(dm)
        db_session.commit()

        assert dm.id is not None  # UUID PK, not composite
        assert dm.role_id == role.id
        assert dm.joined_at is not None

    def test_department_member_unique_constraint(self, db_session):
        import sqlalchemy

        user = models.User(
            email="dmdup@test.com", password_hash="hash", full_name="DMDup"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="DMDup Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        dept = models.Department(organization_id=org.id, name="Sales")
        db_session.add(dept)
        db_session.commit()

        role = models.Role(
            name="MEMBER",
            scope=models.RoleScopeEnum.DEPARTMENT,
            is_system=True,
        )
        db_session.add(role)
        db_session.commit()

        dm1 = models.DepartmentMember(
            department_id=dept.id, user_id=user.id, role_id=role.id
        )
        db_session.add(dm1)
        db_session.commit()

        dm2 = models.DepartmentMember(
            department_id=dept.id, user_id=user.id, role_id=role.id
        )
        db_session.add(dm2)
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            db_session.commit()
        db_session.rollback()
```

- [ ] **Step 2: Run tests — verify RED**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestDepartmentModels -v`
Expected: FAIL (Department missing `organization_id` relationship, DepartmentMember missing `id`, `role_id`)

- [ ] **Step 3: Commit RED tests**

```bash
git add src/backend/tests/test_models_redesign.py
git commit -m "test(models): RED — add failing tests for redesigned Department and DepartmentMember"
```

---

### Task 8: GREEN — Rewrite Department & DepartmentMember Models

**Files:**

- Modify: `src/backend/models.py` — replace existing Department and DepartmentMember

**Interfaces:**

- Consumes: Failing tests from Task 7
- Produces: Redesigned `Department` (with parent_id, description, org FK), `DepartmentMember` (UUID PK, role_id, unique constraint)

- [ ] **Step 1: Replace Department and DepartmentMember**

Replace existing classes in `src/backend/models.py`:

```python
class Department(database.Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(
        String, ForeignKey("organizations.id"), nullable=False, index=True
    )
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(String, ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    organization = relationship("Organization", back_populates="departments")
    parent = relationship("Department", remote_side="Department.id")
    members = relationship(
        "DepartmentMember",
        back_populates="department",
        cascade="all, delete-orphan",
    )


class DepartmentMember(database.Base):
    __tablename__ = "department_members"
    __table_args__ = (
        database.UniqueConstraint("department_id", "user_id"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    department_id = Column(
        String, ForeignKey("departments.id"), nullable=False, index=True
    )
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    department = relationship("Department", back_populates="members")
    user = relationship("User")
    role = relationship("Role")
```

- [ ] **Step 2: Run tests — verify GREEN**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestDepartmentModels -v`
Expected: ALL PASS

- [ ] **Step 3: Commit GREEN**

```bash
git add src/backend/models.py
git commit -m "feat(models): GREEN — rewrite Department and DepartmentMember with parent_id, role_id"
```

---

### Task 9: RED — Write Meeting & MeetingMember Tests

**Files:**

- Modify: `src/backend/tests/test_models_redesign.py`

**Interfaces:**

- Produces: Failing tests for UUID-PK Meeting (Personal vs Business) and MeetingMember

- [ ] **Step 1: Add Meeting tests**

Append to `src/backend/tests/test_models_redesign.py`:

```python
class TestMeetingModels:
    """RED: Tests for redesigned Meeting and MeetingMember."""

    def test_personal_meeting_no_org(self, db_session):
        user = models.User(
            email="personal@test.com", password_hash="hash", full_name="Personal"
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(
            title="Personal Sync",
            description="Quick call",
            created_by_id=user.id,
            status=models.MeetingStatusEnum.SCHEDULED,
        )
        db_session.add(meeting)
        db_session.commit()

        assert meeting.id is not None
        assert len(meeting.id) == 36  # UUID
        assert meeting.organization_id is None
        assert meeting.department_id is None

    def test_business_meeting_with_org_and_dept(self, db_session):
        user = models.User(
            email="biz@test.com", password_hash="hash", full_name="Biz"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="Biz Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        dept = models.Department(organization_id=org.id, name="IT")
        db_session.add(dept)
        db_session.commit()

        meeting = models.Meeting(
            title="Sprint Review",
            description="Sprint 42",
            created_by_id=user.id,
            organization_id=org.id,
            department_id=dept.id,
            status=models.MeetingStatusEnum.SCHEDULED,
        )
        db_session.add(meeting)
        db_session.commit()

        assert meeting.organization_id == org.id
        assert meeting.department_id == dept.id

    def test_meeting_member_lifecycle(self, db_session):
        user = models.User(
            email="mm@test.com", password_hash="hash", full_name="MM"
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(
            title="MM Test",
            created_by_id=user.id,
            status=models.MeetingStatusEnum.SCHEDULED,
        )
        db_session.add(meeting)
        db_session.commit()

        mm = models.MeetingMember(
            meeting_id=meeting.id,
            user_id=user.id,
            role=models.MeetingMemberRoleEnum.HOST,
            status=models.MeetingMemberStatusEnum.INVITED,
        )
        db_session.add(mm)
        db_session.commit()

        assert mm.id is not None
        assert mm.role == models.MeetingMemberRoleEnum.HOST
        assert mm.status == models.MeetingMemberStatusEnum.INVITED

        # Update status to JOINED
        mm.status = models.MeetingMemberStatusEnum.JOINED
        db_session.commit()
        db_session.refresh(mm)
        assert mm.status == models.MeetingMemberStatusEnum.JOINED

    def test_meeting_member_unique_constraint(self, db_session):
        import sqlalchemy

        user = models.User(
            email="mmdup@test.com", password_hash="hash", full_name="MMDup"
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(
            title="Dup Test",
            created_by_id=user.id,
            status=models.MeetingStatusEnum.SCHEDULED,
        )
        db_session.add(meeting)
        db_session.commit()

        mm1 = models.MeetingMember(
            meeting_id=meeting.id,
            user_id=user.id,
            role=models.MeetingMemberRoleEnum.HOST,
        )
        db_session.add(mm1)
        db_session.commit()

        mm2 = models.MeetingMember(
            meeting_id=meeting.id,
            user_id=user.id,
            role=models.MeetingMemberRoleEnum.PARTICIPANT,
        )
        db_session.add(mm2)
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            db_session.commit()
        db_session.rollback()

    def test_meeting_members_relationship(self, db_session):
        user = models.User(
            email="mmrel@test.com", password_hash="hash", full_name="MMRel"
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(
            title="Rel Test",
            created_by_id=user.id,
            status=models.MeetingStatusEnum.SCHEDULED,
        )
        db_session.add(meeting)
        db_session.commit()

        mm = models.MeetingMember(
            meeting_id=meeting.id,
            user_id=user.id,
            role=models.MeetingMemberRoleEnum.HOST,
        )
        db_session.add(mm)
        db_session.commit()

        db_session.refresh(meeting)
        assert len(meeting.members) == 1
        assert meeting.members[0].user.email == "mmrel@test.com"
```

- [ ] **Step 2: Run tests — verify RED**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestMeetingModels -v`
Expected: FAIL (Meeting PK is Integer not UUID, MeetingMember doesn't exist)

- [ ] **Step 3: Commit RED tests**

```bash
git add src/backend/tests/test_models_redesign.py
git commit -m "test(models): RED — add failing tests for redesigned Meeting and MeetingMember"
```

---

### Task 10: GREEN — Rewrite Meeting & Add MeetingMember Models

**Files:**

- Modify: `src/backend/models.py` — replace Meeting, add MeetingMember

**Interfaces:**

- Consumes: Failing tests from Task 9
- Produces: UUID-PK `Meeting`, `MeetingMember` with role/status enums

- [ ] **Step 1: Replace Meeting and add MeetingMember**

Replace existing `Meeting` class and add `MeetingMember` in `src/backend/models.py`:

```python
class Meeting(database.Base):
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(
        String, ForeignKey("organizations.id"), nullable=True, index=True
    )
    department_id = Column(
        String, ForeignKey("departments.id"), nullable=True, index=True
    )
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    status = Column(
        Enum(MeetingStatusEnum),
        default=MeetingStatusEnum.SCHEDULED,
        nullable=False,
    )
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    organization = relationship("Organization")
    department = relationship("Department")
    created_by = relationship("User", foreign_keys=[created_by_id])
    members = relationship(
        "MeetingMember", back_populates="meeting", cascade="all, delete-orphan"
    )


class MeetingMember(database.Base):
    __tablename__ = "meeting_members"
    __table_args__ = (
        database.UniqueConstraint("meeting_id", "user_id"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(
        Enum(MeetingMemberRoleEnum),
        default=MeetingMemberRoleEnum.PARTICIPANT,
        nullable=False,
    )
    status = Column(
        Enum(MeetingMemberStatusEnum),
        default=MeetingMemberStatusEnum.INVITED,
        nullable=False,
    )
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    meeting = relationship("Meeting", back_populates="members")
    user = relationship("User")
```

- [ ] **Step 2: Run tests — verify GREEN**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestMeetingModels -v`
Expected: ALL PASS

- [ ] **Step 3: Commit GREEN**

```bash
git add src/backend/models.py
git commit -m "feat(models): GREEN — rewrite Meeting with UUID PK, add MeetingMember"
```

---

### Task 11: RED — Write Org Invitation & Content Model Tests

**Files:**

- Modify: `src/backend/tests/test_models_redesign.py`

**Interfaces:**

- Produces: Failing tests for OrganizationInvitation, MeetingDocument, TranscriptSegment, MeetingSummary, ActionItem, KnowledgeChunk, MeetingChatMessage

- [ ] **Step 1: Add all remaining model tests**

Append to `src/backend/tests/test_models_redesign.py`:

```python
import datetime as dt
from datetime import timezone


class TestOrganizationInvitation:
    """RED: Tests for OrganizationInvitation."""

    def test_create_invitation(self, db_session):
        user = models.User(
            email="inv@test.com", password_hash="hash", full_name="Inviter"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="Inv Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        role = models.Role(
            name="MEMBER",
            scope=models.RoleScopeEnum.ORGANIZATION,
            is_system=True,
        )
        db_session.add(role)
        db_session.commit()

        inv = models.OrganizationInvitation(
            organization_id=org.id,
            email="new@test.com",
            role_id=role.id,
            invited_by_id=user.id,
            token="unique-token-123",
            expires_at=dt.datetime.now(timezone.utc) + dt.timedelta(days=7),
        )
        db_session.add(inv)
        db_session.commit()

        assert inv.id is not None
        assert inv.status == models.OrgInvitationStatusEnum.PENDING
        assert inv.department_id is None

    def test_invitation_with_department(self, db_session):
        user = models.User(
            email="invdept@test.com", password_hash="hash", full_name="InvDept"
        )
        db_session.add(user)
        db_session.commit()

        org = models.Organization(name="InvDept Org", created_by_id=user.id)
        db_session.add(org)
        db_session.commit()

        dept = models.Department(organization_id=org.id, name="IT")
        db_session.add(dept)
        db_session.commit()

        role = models.Role(
            name="MEMBER",
            scope=models.RoleScopeEnum.ORGANIZATION,
            is_system=True,
        )
        db_session.add(role)
        db_session.commit()

        inv = models.OrganizationInvitation(
            organization_id=org.id,
            email="newdept@test.com",
            role_id=role.id,
            department_id=dept.id,
            invited_by_id=user.id,
            token="dept-token-456",
            expires_at=dt.datetime.now(timezone.utc) + dt.timedelta(days=7),
        )
        db_session.add(inv)
        db_session.commit()

        assert inv.department_id == dept.id


class TestContentModels:
    """RED: Tests for MeetingDocument, TranscriptSegment, MeetingSummary, ActionItem, KnowledgeChunk, MeetingChatMessage."""

    def _create_meeting(self, db_session):
        user = models.User(
            email=f"content{id(self)}@test.com",
            password_hash="hash",
            full_name="Content",
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(
            title="Content Test",
            created_by_id=user.id,
            status=models.MeetingStatusEnum.COMPLETED,
        )
        db_session.add(meeting)
        db_session.commit()
        return user, meeting

    def test_meeting_document(self, db_session):
        user, meeting = self._create_meeting(db_session)

        doc = models.MeetingDocument(
            meeting_id=meeting.id,
            uploaded_by_id=user.id,
            file_name="slides.pdf",
            storage_path="meetings/123/slides.pdf",
            file_type="application/pdf",
            file_size=1024000,
            status=models.DocumentStatusEnum.READY,
        )
        db_session.add(doc)
        db_session.commit()

        assert doc.id is not None
        assert doc.status == models.DocumentStatusEnum.READY

    def test_transcript_segment(self, db_session):
        user, meeting = self._create_meeting(db_session)

        seg = models.TranscriptSegment(
            meeting_id=meeting.id,
            speaker_id=user.id,
            content="Hello everyone",
            start_time="0.0",
            end_time="2.5",
            sequence=1,
            confidence="0.95",
        )
        db_session.add(seg)
        db_session.commit()

        assert seg.id is not None
        assert seg.content == "Hello everyone"

    def test_meeting_summary_unique_per_meeting(self, db_session):
        import sqlalchemy

        user, meeting = self._create_meeting(db_session)

        s1 = models.MeetingSummary(
            meeting_id=meeting.id,
            summary="First summary",
        )
        db_session.add(s1)
        db_session.commit()

        s2 = models.MeetingSummary(
            meeting_id=meeting.id,
            summary="Duplicate summary",
        )
        db_session.add(s2)
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            db_session.commit()
        db_session.rollback()

    def test_action_item_linked_to_transcript(self, db_session):
        user, meeting = self._create_meeting(db_session)

        seg = models.TranscriptSegment(
            meeting_id=meeting.id,
            content="Let's follow up",
            start_time="10.0",
            end_time="12.0",
            sequence=5,
        )
        db_session.add(seg)
        db_session.commit()

        action = models.ActionItem(
            meeting_id=meeting.id,
            transcript_segment_id=seg.id,
            assignee_id=user.id,
            title="Follow up on roadmap",
            status=models.ActionItemStatusEnum.TODO,
        )
        db_session.add(action)
        db_session.commit()

        assert action.transcript_segment_id == seg.id
        assert action.status == models.ActionItemStatusEnum.TODO

    def test_knowledge_chunk(self, db_session):
        user, meeting = self._create_meeting(db_session)

        chunk = models.KnowledgeChunk(
            meeting_id=meeting.id,
            source_type=models.TranscriptSourceTypeEnum.TRANSCRIPT,
            source_id="some-segment-id",
            content="Chunk of text",
            chunk_index=0,
        )
        db_session.add(chunk)
        db_session.commit()

        assert chunk.source_type == models.TranscriptSourceTypeEnum.TRANSCRIPT

    def test_meeting_chat_message(self, db_session):
        user, meeting = self._create_meeting(db_session)

        msg = models.MeetingChatMessage(
            meeting_id=meeting.id,
            user_id=user.id,
            content="Can everyone hear me?",
        )
        db_session.add(msg)
        db_session.commit()

        assert msg.content == "Can everyone hear me?"
```

- [ ] **Step 2: Run tests — verify RED**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestOrganizationInvitation -v`
Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestContentModels -v`
Expected: ALL FAIL

- [ ] **Step 3: Commit RED tests**

```bash
git add src/backend/tests/test_models_redesign.py
git commit -m "test(models): RED — add failing tests for OrgInvitation and all content models"
```

---

### Task 12: GREEN — Implement OrgInvitation & Content Models

**Files:**

- Modify: `src/backend/models.py`

**Interfaces:**

- Consumes: All failing tests from Task 11
- Produces: `OrganizationInvitation`, `MeetingDocument`, `TranscriptSegment`, `MeetingSummary`, `ActionItem` (redesigned), `KnowledgeChunk`, `MeetingChatMessage`

- [ ] **Step 1: Implement OrganizationInvitation**

```python
class OrganizationInvitation(database.Base):
    __tablename__ = "organization_invitations"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(
        String, ForeignKey("organizations.id"), nullable=False, index=True
    )
    email = Column(String, nullable=False)
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True)
    invited_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False)
    status = Column(
        Enum(OrgInvitationStatusEnum),
        default=OrgInvitationStatusEnum.PENDING,
        nullable=False,
    )
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    organization = relationship("Organization")
    role = relationship("Role")
    department = relationship("Department")
    invited_by = relationship("User", foreign_keys=[invited_by_id])
```

- [ ] **Step 2: Implement all content models**

Add `MeetingDocument`, `TranscriptSegment`, `MeetingSummary`, `ActionItem` (redesigned), `KnowledgeChunk`, `MeetingChatMessage` — exact code from spec Section F (see Task 7 in previous plan revision for complete code).

- [ ] **Step 3: Run tests — verify GREEN**

Run: `python -m pytest src/backend/tests/test_models_redesign.py -v`
Expected: ALL PASS

- [ ] **Step 4: Commit GREEN**

```bash
git add src/backend/models.py
git commit -m "feat(models): GREEN — implement OrgInvitation and all content/AI models"
```

---

### Task 13: RED — Write Deprecated Model Removal Tests

**Files:**

- Modify: `src/backend/tests/test_models_redesign.py`

**Interfaces:**

- Produces: Tests asserting old models no longer exist

- [ ] **Step 1: Add deprecation tests**

Append to `src/backend/tests/test_models_redesign.py`:

```python
class TestDeprecatedModelsRemoved:
    """RED: Old workspace-based models must be removed."""

    def test_workspace_removed(self):
        assert not hasattr(models, "Workspace")

    def test_workspace_member_removed(self):
        assert not hasattr(models, "WorkspaceMember")

    def test_old_meeting_invitation_removed(self):
        assert not hasattr(models, "MeetingInvitation")

    def test_old_meeting_file_removed(self):
        assert not hasattr(models, "MeetingFile")

    def test_old_meeting_bookmark_removed(self):
        assert not hasattr(models, "MeetingBookmark")

    def test_old_knowledge_document_removed(self):
        assert not hasattr(models, "KnowledgeDocument")

    def test_old_outbound_webhook_removed(self):
        assert not hasattr(models, "OutboundWebhook")

    def test_old_task_removed(self):
        assert not hasattr(models, "Task")

    def test_old_role_enum_removed(self):
        assert not hasattr(models, "RoleEnum")

    def test_old_invitation_removed(self):
        assert not hasattr(models, "Invitation")
```

- [ ] **Step 2: Run tests — verify RED**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestDeprecatedModelsRemoved -v`
Expected: FAIL (old models still exist)

- [ ] **Step 3: Commit RED tests**

```bash
git add src/backend/tests/test_models_redesign.py
git commit -m "test(models): RED — add failing tests asserting deprecated models are removed"
```

---

### Task 14: GREEN — Remove Deprecated Models & Clean Up

**Files:**

- Modify: `src/backend/models.py`

**Interfaces:**

- Consumes: Failing tests from Task 13
- Produces: Clean models.py without any deprecated workspace-era models

- [ ] **Step 1: Remove deprecated classes from models.py**

Delete these classes:

- `Workspace`
- `WorkspaceMember`
- `Invitation`
- `MeetingInvitation`
- `MeetingFile`
- `MeetingBookmark`
- `KnowledgeDocument`
- `OutboundWebhook`
- `Task`
- `RoleEnum`
- `InvitationRoleEnum`
- `InvitationStatusEnum`
- Old `ActionItem` (already replaced in Task 12)

- [ ] **Step 2: Update User relationships**

Replace User relationships to remove workspace refs:

```python
class User(database.Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    full_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    provider = Column(String, default="local")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    created_organizations = relationship(
        "Organization", back_populates="creator", foreign_keys="Organization.created_by_id"
    )
    organization_memberships = relationship("OrganizationMember", back_populates="user")
    created_meetings = relationship(
        "Meeting", back_populates="created_by", foreign_keys="Meeting.created_by_id"
    )
```

- [ ] **Step 3: Run ALL redesign tests — verify GREEN**

Run: `python -m pytest src/backend/tests/test_models_redesign.py -v`
Expected: ALL PASS

- [ ] **Step 4: Commit GREEN**

```bash
git add src/backend/models.py
git commit -m "refactor(models): GREEN — remove all deprecated workspace-era models"
```

---

### Task 15: RED — Write RBAC Seed Tests

**Files:**

- Modify: `src/backend/tests/test_models_redesign.py`

**Interfaces:**

- Produces: Failing tests for `seed_roles_and_permissions()` function

- [ ] **Step 1: Add seed tests**

Append to `src/backend/tests/test_models_redesign.py`:

```python
class TestRBACSeed:
    """RED: Tests for permission seeding script."""

    def test_seed_creates_system_roles(self, db_session):
        from src.backend.seeds.seed_rbac import seed_roles_and_permissions

        seed_roles_and_permissions(db_session)

        roles = (
            db_session.query(models.Role)
            .filter(models.Role.is_system == True)
            .all()
        )
        role_names = {r.name for r in roles}
        assert role_names == {"OWNER", "ADMIN", "MANAGER", "MEMBER"}

    def test_seed_creates_all_permissions(self, db_session):
        from src.backend.seeds.seed_rbac import seed_roles_and_permissions

        seed_roles_and_permissions(db_session)

        perms = db_session.query(models.Permission).all()
        codes = {p.code for p in perms}
        assert "meeting.create" in codes
        assert "department.members.manage" in codes
        assert "organization.update" in codes
        assert len(codes) >= 13

    def test_owner_has_all_permissions(self, db_session):
        from src.backend.seeds.seed_rbac import seed_roles_and_permissions

        seed_roles_and_permissions(db_session)

        all_perms = db_session.query(models.Permission).all()
        owner = (
            db_session.query(models.Role)
            .filter(models.Role.name == "OWNER", models.Role.is_system == True)
            .first()
        )
        owner_rps = (
            db_session.query(models.RolePermission)
            .filter(models.RolePermission.role_id == owner.id)
            .all()
        )
        assert len(owner_rps) == len(all_perms)

    def test_member_has_limited_permissions(self, db_session):
        from src.backend.seeds.seed_rbac import seed_roles_and_permissions

        seed_roles_and_permissions(db_session)

        member = (
            db_session.query(models.Role)
            .filter(models.Role.name == "MEMBER", models.Role.is_system == True)
            .first()
        )
        member_rps = (
            db_session.query(models.RolePermission)
            .filter(models.RolePermission.role_id == member.id)
            .all()
        )
        member_perm_ids = {rp.permission_id for rp in member_rps}
        member_codes = {
            db_session.query(models.Permission)
            .filter(models.Permission.id == pid)
            .first()
            .code
            for pid in member_perm_ids
        }
        assert "meeting.join" in member_codes
        assert "organization.read" in member_codes
        assert "user.invite" not in member_codes
        assert "meeting.delete" not in member_codes

    def test_seed_is_idempotent(self, db_session):
        from src.backend.seeds.seed_rbac import seed_roles_and_permissions

        seed_roles_and_permissions(db_session)
        seed_roles_and_permissions(db_session)  # Call again

        roles = (
            db_session.query(models.Role)
            .filter(models.Role.is_system == True)
            .all()
        )
        assert len(roles) == 4  # No duplicates
```

- [ ] **Step 2: Run tests — verify RED**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestRBACSeed -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.backend.seeds'`

- [ ] **Step 3: Commit RED tests**

```bash
git add src/backend/tests/test_models_redesign.py
git commit -m "test(seeds): RED — add failing tests for RBAC seeding script"
```

---

### Task 16: GREEN — Implement RBAC Seed Script

**Files:**

- Create: `src/backend/seeds/__init__.py`
- Create: `src/backend/seeds/seed_rbac.py`

**Interfaces:**

- Consumes: Failing tests from Task 15, `Role`, `Permission`, `RolePermission` models
- Produces: `seed_roles_and_permissions(db: Session)` function

- [ ] **Step 1: Create seed module**

Create `src/backend/seeds/__init__.py` (empty file).

Create `src/backend/seeds/seed_rbac.py`:

```python
"""Seed system roles and permissions for RBAC."""

from sqlalchemy.orm import Session

from src.backend.models import Permission, Role, RolePermission, RoleScopeEnum

ALL_PERMISSIONS = [
    ("organization.read", "View organization details"),
    ("organization.update", "Update organization settings"),
    ("user.invite", "Invite users to organization"),
    ("user.remove", "Remove users from organization"),
    ("department.read", "View departments"),
    ("department.create", "Create departments"),
    ("department.update", "Update departments"),
    ("department.members.manage", "Manage department members"),
    ("meeting.create", "Create meetings"),
    ("meeting.update", "Update meetings"),
    ("meeting.delete", "Delete meetings"),
    ("meeting.join", "Join meetings"),
    ("meeting.manage_members", "Manage meeting participants"),
]

ROLE_DEFINITIONS = {
    "OWNER": {
        "scope": RoleScopeEnum.ORGANIZATION,
        "description": "Organization owner with full access",
        "permissions": [code for code, _ in ALL_PERMISSIONS],
    },
    "ADMIN": {
        "scope": RoleScopeEnum.ORGANIZATION,
        "description": "Organization administrator",
        "permissions": [code for code, _ in ALL_PERMISSIONS],
    },
    "MANAGER": {
        "scope": RoleScopeEnum.DEPARTMENT,
        "description": "Department manager",
        "permissions": [
            "organization.read",
            "department.read",
            "department.update",
            "department.members.manage",
            "meeting.create",
            "meeting.update",
            "meeting.delete",
            "meeting.join",
            "meeting.manage_members",
        ],
    },
    "MEMBER": {
        "scope": RoleScopeEnum.ORGANIZATION,
        "description": "Regular organization member",
        "permissions": [
            "organization.read",
            "department.read",
            "meeting.create",
            "meeting.join",
        ],
    },
}


def seed_roles_and_permissions(db: Session) -> None:
    """Insert system roles, permissions, and role-permission mappings.

    Safe to call multiple times — skips if data already exists.
    """
    existing = db.query(Permission).count()
    if existing > 0:
        return

    perm_map: dict[str, Permission] = {}
    for code, description in ALL_PERMISSIONS:
        perm = Permission(code=code, description=description)
        db.add(perm)
        perm_map[code] = perm
    db.flush()

    for role_name, role_def in ROLE_DEFINITIONS.items():
        role = Role(
            name=role_name,
            description=role_def["description"],
            scope=role_def["scope"],
            is_system=True,
        )
        db.add(role)
        db.flush()

        for perm_code in role_def["permissions"]:
            rp = RolePermission(
                role_id=role.id, permission_id=perm_map[perm_code].id
            )
            db.add(rp)

    db.commit()
```

- [ ] **Step 2: Run tests — verify GREEN**

Run: `python -m pytest src/backend/tests/test_models_redesign.py::TestRBACSeed -v`
Expected: ALL PASS

- [ ] **Step 3: Commit GREEN**

```bash
git add src/backend/seeds/
git commit -m "feat(seeds): GREEN — implement RBAC seeding with system roles and permissions"
```

---

### Task 17: REFACTOR — Update Conftest, Cleanup & Full Test Suite

**Files:**

- Modify: `src/backend/conftest.py`
- Modify: `src/backend/main.py`

**Interfaces:**

- Consumes: All models, `seed_roles_and_permissions`
- Produces: Updated test infrastructure, app startup seeding

- [ ] **Step 1: Update conftest to import UniqueConstraint**

Add to `src/backend/database.py` (if not already exported):

```python
from sqlalchemy import UniqueConstraint  # used by models for __table_args__
```

Ensure `conftest.py` `setup_db` works with new schema (Base.metadata.create_all still works since all models inherit from Base).

- [ ] **Step 2: Add RBAC seeding to app startup**

Add to `src/backend/main.py`:

```python
@app.on_event("startup")
def startup_seed():
    from src.backend.database import SessionLocal
    from src.backend.seeds.seed_rbac import seed_roles_and_permissions

    db = SessionLocal()
    try:
        seed_roles_and_permissions(db)
    finally:
        db.close()
```

- [ ] **Step 3: Run FULL test suite**

Run: `python -m pytest src/backend/tests/test_models_redesign.py -v`
Expected: ALL PASS (all TestNewEnums, TestOrganizationModels, TestRBACModels, TestDepartmentModels, TestMeetingModels, TestOrganizationInvitation, TestContentModels, TestDeprecatedModelsRemoved, TestRBACSeed)

- [ ] **Step 4: Commit REFACTOR**

```bash
git add src/backend/conftest.py src/backend/main.py src/backend/database.py
git commit -m "refactor: update conftest and app startup for new platform schema"
```

- [ ] **Step 5: Final verification — run ALL backend tests**

Run: `python -m pytest src/backend/ -v`
Expected: All pass (note: old tests that depend on Workspace will need updating in Phase 2)
