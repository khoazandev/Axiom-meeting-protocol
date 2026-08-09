"""
TDD tests for platform redesign models.
All tests written FIRST — implementation follows.
"""
import pytest

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


# ---------------------------------------------------------------------------
# Task 3 RED: Organization & OrgMember
# ---------------------------------------------------------------------------
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
        assert len(org.id) == 36
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


# ---------------------------------------------------------------------------
# Task 5 RED: RBAC Models
# ---------------------------------------------------------------------------
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
        assert role.organization_id is None
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


# ---------------------------------------------------------------------------
# Task 7 RED: Department Models
# ---------------------------------------------------------------------------
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

        assert dm.id is not None
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


# ---------------------------------------------------------------------------
# Task 9 RED: Meeting & MeetingMember
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Task 11 RED: OrgInvitation & Content Models
# ---------------------------------------------------------------------------
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
    """RED: Tests for content & AI models."""

    def _create_meeting(self, db_session, suffix=""):
        user = models.User(
            email=f"content{suffix}@test.com",
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
        user, meeting = self._create_meeting(db_session, "doc")

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
        user, meeting = self._create_meeting(db_session, "seg")

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

        user, meeting = self._create_meeting(db_session, "sum")

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
        user, meeting = self._create_meeting(db_session, "act")

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
        user, meeting = self._create_meeting(db_session, "know")

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
        user, meeting = self._create_meeting(db_session, "chat")

        msg = models.MeetingChatMessage(
            meeting_id=meeting.id,
            user_id=user.id,
            content="Can everyone hear me?",
        )
        db_session.add(msg)
        db_session.commit()

        assert msg.content == "Can everyone hear me?"


# ---------------------------------------------------------------------------
# Task 13 RED: Deprecated Models Removed
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Task 15 RED: RBAC Seed
# ---------------------------------------------------------------------------
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

    def test_seed_is_idempotent(self, db_session):
        from src.backend.seeds.seed_rbac import seed_roles_and_permissions

        seed_roles_and_permissions(db_session)
        seed_roles_and_permissions(db_session)

        roles = (
            db_session.query(models.Role)
            .filter(models.Role.is_system == True)
            .all()
        )
        assert len(roles) == 4
