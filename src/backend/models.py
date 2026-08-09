import datetime
import enum
import uuid
from datetime import timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from . import database


def generate_uuid():
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class MeetingStatusEnum(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


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


# ---------------------------------------------------------------------------
# Identity & Multi-Tenancy
# ---------------------------------------------------------------------------
class User(database.Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # Nullable for OAuth users
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
        "Organization",
        back_populates="creator",
        foreign_keys="Organization.created_by_id",
    )
    organization_memberships = relationship(
        "OrganizationMember", back_populates="user"
    )
    created_meetings = relationship(
        "Meeting",
        back_populates="created_by",
        foreign_keys="Meeting.created_by_id",
    )


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


class OrganizationMember(database.Base):
    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

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
    user = relationship("User", back_populates="organization_memberships")
    role = relationship("Role")


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------
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
    __table_args__ = (UniqueConstraint("department_id", "user_id"),)

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


# ---------------------------------------------------------------------------
# Meetings (Unified Engine)
# ---------------------------------------------------------------------------
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
    created_by = relationship(
        "User", back_populates="created_meetings", foreign_keys=[created_by_id]
    )
    members = relationship(
        "MeetingMember", back_populates="meeting", cascade="all, delete-orphan"
    )


class MeetingMember(database.Base):
    __tablename__ = "meeting_members"
    __table_args__ = (UniqueConstraint("meeting_id", "user_id"),)

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


# ---------------------------------------------------------------------------
# Organization Invitations
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Meeting Content & AI
# ---------------------------------------------------------------------------
class MeetingDocument(database.Base):
    __tablename__ = "meeting_documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    file_name = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(
        Enum(DocumentStatusEnum),
        default=DocumentStatusEnum.UPLOADED,
        nullable=False,
    )
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    meeting = relationship("Meeting")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class TranscriptSegment(database.Base):
    __tablename__ = "transcript_segments"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )
    speaker_id = Column(String, ForeignKey("users.id"), nullable=True)
    content = Column(Text, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    sequence = Column(Integer, nullable=False)
    confidence = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    meeting = relationship("Meeting")
    speaker = relationship("User", foreign_keys=[speaker_id])


class MeetingSummary(database.Base):
    __tablename__ = "meeting_summaries"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, unique=True
    )
    summary = Column(Text, nullable=False)
    key_points = Column(Text, nullable=True)
    decisions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    meeting = relationship("Meeting")


class ActionItem(database.Base):
    __tablename__ = "action_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )
    transcript_segment_id = Column(
        String, ForeignKey("transcript_segments.id"), nullable=True
    )
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_at = Column(DateTime, nullable=True)
    status = Column(
        Enum(ActionItemStatusEnum),
        default=ActionItemStatusEnum.TODO,
        nullable=False,
    )
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    meeting = relationship("Meeting")
    transcript_segment = relationship("TranscriptSegment")
    assignee = relationship("User", foreign_keys=[assignee_id])


class KnowledgeChunk(database.Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )
    source_type = Column(Enum(TranscriptSourceTypeEnum), nullable=False)
    source_id = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    meeting = relationship("Meeting")


class MeetingChatMessage(database.Base):
    __tablename__ = "meeting_chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    meeting = relationship("Meeting")
    user = relationship("User")


# ---------------------------------------------------------------------------
# Audit & Webhooks (kept, will re-parent to org in Phase 2)
# ---------------------------------------------------------------------------
class AuditLog(database.Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(
        String, ForeignKey("organizations.id"), nullable=True, index=True
    )
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    organization = relationship("Organization")
    user = relationship("User", foreign_keys=[user_id])
