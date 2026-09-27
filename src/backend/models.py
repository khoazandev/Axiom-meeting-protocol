import datetime
import enum
import uuid
from datetime import timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
import hashlib
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
    PAUSED = "PAUSED"


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


class FollowUpTaskStatusEnum(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    NOT_CONFIRMED = "NOT_CONFIRMED"
    COMPLETED = "COMPLETED"

class FollowUpTaskSourceEnum(str, enum.Enum):
    AI_REALTIME = "AI_REALTIME"
    AI_FULL = "AI_FULL"
    MANUAL = "MANUAL"


class MeetingDecisionStatusEnum(str, enum.Enum):
    PROPOSED = "PROPOSED"
    AGREED = "AGREED"
    REJECTED = "REJECTED"


class TopicStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
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
    phone = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
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
    direct_permissions = relationship(
        "OrganizationMemberPermission",
        back_populates="member",
        cascade="all, delete-orphan",
    )


class OrganizationMemberPermission(database.Base):
    __tablename__ = "organization_member_permissions"
    __table_args__ = (UniqueConstraint("member_id", "permission_id"),)

    member_id = Column(String, ForeignKey("organization_members.id"), primary_key=True)
    permission_id = Column(String, ForeignKey("permissions.id"), primary_key=True)
    granted_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    member = relationship("OrganizationMember", back_populates="direct_permissions")
    permission = relationship("Permission")
    granted_by = relationship("User", foreign_keys=[granted_by_id])


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
    approval_status = Column(String, default="APPROVED", nullable=False)
    meeting_type = Column(String, default="OFFICIAL", nullable=False)
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
    decisions = relationship(
        "MeetingDecision", back_populates="meeting", cascade="all, delete-orphan"
    )

    @property
    def agenda(self) -> str | None:
        return self.description

    @agenda.setter
    def agenda(self, value: str | None) -> None:
        self.description = value


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

    @property
    def user_name(self) -> str | None:
        return self.user.full_name if self.user else None

    @property
    def user_email(self) -> str | None:
        return self.user.email if self.user else None


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
    full_name = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True)
    invited_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False)
    invite_code = Column(String, index=True, nullable=True)
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
    topic_id = Column(
        String, ForeignKey("topics.id"), nullable=True, index=True
    )
    speaker_id = Column(String, ForeignKey("users.id"), nullable=True)
    content = Column(Text, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    sequence = Column(Integer, nullable=False)
    confidence = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    meeting = relationship("Meeting")
    topic = relationship("Topic")
    speaker = relationship("User", foreign_keys=[speaker_id])

    @property
    def speaker_name(self) -> str | None:
        return self.speaker.full_name if self.speaker else None


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


class FollowUpTask(database.Base):
    __tablename__ = "follow_up_tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )
    topic_id = Column(
        String, ForeignKey("topics.id"), nullable=True, index=True
    )
    transcript_segment_id = Column(
        String, ForeignKey("transcript_segments.id"), nullable=True
    )
    assignee_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    assignee = relationship("User", foreign_keys=[assignee_id])
    
    @property
    def assignee_name(self) -> str | None:
        return self.assignee.full_name if self.assignee else None

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    evidence_quote = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    status = Column(
        Enum(FollowUpTaskStatusEnum),
        default=FollowUpTaskStatusEnum.NOT_CONFIRMED,
        nullable=False,
    )
    source = Column(
        Enum(FollowUpTaskSourceEnum),
        default=FollowUpTaskSourceEnum.MANUAL,
        nullable=False,
    )
    issue_id = Column(String(36), ForeignKey("issues.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    meeting = relationship("Meeting")
    transcript_segment = relationship("TranscriptSegment")


class Topic(database.Base):
    __tablename__ = "topics"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )
    title = Column(String, nullable=False)
    transcript_text = Column(Text, nullable=True)
    status = Column(
        Enum(TopicStatusEnum),
        default=TopicStatusEnum.PENDING,
        nullable=False,
    )
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    meeting = relationship("Meeting")


class MeetingDecision(database.Base):
    __tablename__ = "meeting_decisions"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )
    topic_id = Column(
        String, ForeignKey("topics.id"), nullable=True, index=True
    )
    transcript_segment_id = Column(
        String, ForeignKey("transcript_segments.id"), nullable=True
    )
    proposer_id = Column(String, ForeignKey("users.id"), nullable=True)
    description = Column(Text, nullable=False)
    key_message = Column(String, nullable=True)
    evidence_sentence = Column(Text, nullable=True)
    status = Column(
        Enum(MeetingDecisionStatusEnum),
        default=MeetingDecisionStatusEnum.PROPOSED,
        nullable=False,
    )
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    meeting = relationship("Meeting", back_populates="decisions")
    topic = relationship("Topic")
    transcript_segment = relationship("TranscriptSegment")
    proposer = relationship("User", foreign_keys=[proposer_id])

    @property
    def proposer_name(self) -> str | None:
        return self.proposer.full_name if self.proposer else None


class KnowledgeDocument(database.Base):
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=True, index=True)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    vector_status = Column(String, default="READY")
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    organization = relationship("Organization")
    meeting = relationship("Meeting")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


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


# ---------------------------------------------------------------------------
# RAG Feedback Learning — Extraction Corrections
# ---------------------------------------------------------------------------
class CorrectionTypeEnum(str, enum.Enum):
    TASK_EDITED = "task_edited"
    TASK_DELETED = "task_deleted"
    TASK_ADDED = "task_added"


class ExtractionCorrection(database.Base):
    __tablename__ = "extraction_corrections"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String, ForeignKey("meetings.id"), nullable=False, index=True
    )

    # Transcript snippet that triggered the extraction
    transcript_snippet = Column(Text, nullable=False)

    # What the AI originally produced
    ai_output_json = Column(Text, nullable=False)  # JSON string of list[dict]

    # What the user corrected it to
    corrected_output_json = Column(Text, nullable=False)  # JSON string of list[dict]

    # Type of correction
    correction_type = Column(
        Enum(CorrectionTypeEnum), nullable=False
    )

    # Embedding vector stored as JSON string of list[float] (768-dim)
    embedding_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    meeting = relationship("Meeting")


# ---------------------------------------------------------------------------
# Mini Jira / Project Management System
# ---------------------------------------------------------------------------
class IssueTypeEnum(str, enum.Enum):
    EPIC = "EPIC"
    STORY = "STORY"
    TASK = "TASK"
    BUG = "BUG"
    SUBTASK = "SUBTASK"


class IssueStatusEnum(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"


class IssuePriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SprintStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class DurationEnum(str, enum.Enum):
    ONE_WEEK = "ONE_WEEK"
    TWO_WEEKS = "TWO_WEEKS"
    THREE_WEEKS = "THREE_WEEKS"
    FOUR_WEEKS = "FOUR_WEEKS"
    CUSTOM = "CUSTOM"


class JiraProject(database.Base):
    __tablename__ = "jira_projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    key = Column(String(20), unique=True, nullable=False, index=True)  # e.g., "SMA", "MTG-101"
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=True, unique=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True, index=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    issue_counter = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    meeting = relationship("Meeting")
    organization = relationship("Organization")
    department = relationship("Department")
    created_by = relationship("User", foreign_keys=[created_by_id])
    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="project", cascade="all, delete-orphan")


class Sprint(database.Base):
    __tablename__ = "sprints"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("jira_projects.id"), nullable=False, index=True)
    name = Column(String, nullable=False)  # e.g. "SMA Sprint 1"
    goal = Column(Text, nullable=True)
    duration = Column(Enum(DurationEnum), default=DurationEnum.TWO_WEEKS, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    status = Column(Enum(SprintStatusEnum), default=SprintStatusEnum.PENDING, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    project = relationship("JiraProject", back_populates="sprints")
    issues = relationship("Issue", back_populates="sprint")


class Issue(database.Base):
    __tablename__ = "issues"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("jira_projects.id"), nullable=False, index=True)
    key = Column(String(30), unique=True, nullable=False, index=True)  # e.g., "SMA-1"
    summary = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(IssueTypeEnum), default=IssueTypeEnum.TASK, nullable=False)
    status = Column(Enum(IssueStatusEnum), default=IssueStatusEnum.TODO, nullable=False)
    priority = Column(Enum(IssuePriorityEnum), default=IssuePriorityEnum.MEDIUM, nullable=False)
    story_points = Column(Integer, nullable=True)

    # Hierarchy
    parent_id = Column(String, ForeignKey("issues.id"), nullable=True)
    epic_id = Column(String, ForeignKey("issues.id"), nullable=True)
    sprint_id = Column(String, ForeignKey("sprints.id"), nullable=True, index=True)

    # Drag-and-drop order
    sprint_position = Column(Integer, default=0, nullable=False)
    board_position = Column(Integer, default=0, nullable=False)

    # People & Department
    reporter_id = Column(String, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True, index=True)
    due_date = Column(DateTime, nullable=True)

    # Meeting provenance
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=True)
    transcript_segment_id = Column(String, ForeignKey("transcript_segments.id"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    project = relationship("JiraProject", back_populates="issues")
    sprint = relationship("Sprint", back_populates="issues")
    reporter = relationship("User", foreign_keys=[reporter_id])
    assignee = relationship("User", foreign_keys=[assignee_id])
    department = relationship("Department")
    meeting = relationship("Meeting")
    transcript_segment = relationship("TranscriptSegment")
    comments = relationship("IssueComment", back_populates="issue", cascade="all, delete-orphan")
    parent = relationship("Issue", remote_side=[id], foreign_keys=[parent_id], backref="subtasks")

    @property
    def assignee_name(self) -> str | None:
        return self.assignee.full_name if self.assignee else None

    @property
    def reporter_name(self) -> str | None:
        return self.reporter.full_name if self.reporter else None


class IssueComment(database.Base):
    __tablename__ = "issue_comments"

    id = Column(String, primary_key=True, default=generate_uuid)
    issue_id = Column(String, ForeignKey("issues.id"), nullable=False, index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    issue = relationship("Issue", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])

    @property
    def author_name(self) -> str | None:
        return self.author.full_name if self.author else None


# ---------------------------------------------------------------------------
# Recruitment Pipeline Enums & Models
# ---------------------------------------------------------------------------
class RecruitmentStageEnum(str, enum.Enum):
    INVITED = "INVITED"
    ASSESSMENT_PENDING = "ASSESSMENT_PENDING"
    ASSESSMENT_SUBMITTED = "ASSESSMENT_SUBMITTED"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED"
    HR_REVIEW_PENDING = "HR_REVIEW_PENDING"
    OWNER_APPROVAL_PENDING = "OWNER_APPROVAL_PENDING"
    APPROVED = "APPROVED"
    ONBOARDING_INVITED = "ONBOARDING_INVITED"
    HIRED = "HIRED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class JobOpeningStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"


class AssessmentStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    EXPIRED = "EXPIRED"


class InterviewStatusEnum(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class HRDecisionEnum(str, enum.Enum):
    RECOMMEND_HIRE = "RECOMMEND_HIRE"
    RECOMMEND_REJECT = "RECOMMEND_REJECT"
    NEEDS_MORE_EVIDENCE = "NEEDS_MORE_EVIDENCE"


class OwnerDecisionEnum(str, enum.Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"


class JobOpening(database.Base):
    __tablename__ = "job_openings"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    status = Column(Enum(JobOpeningStatusEnum), default=JobOpeningStatusEnum.ACTIVE, nullable=False)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    assigned_hr_member_id = Column(String, ForeignKey("organization_members.id"), nullable=True)
    requires_assessment = Column(Boolean, default=False, nullable=False)
    assessment_definition_id = Column(String, nullable=True)
    competency_rubric_json = Column(Text, nullable=True)
    rubric_version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    organization = relationship("Organization")
    department = relationship("Department")
    created_by = relationship("User", foreign_keys=[created_by_id])
    assigned_hr_member = relationship("OrganizationMember", foreign_keys=[assigned_hr_member_id])
    applications = relationship("RecruitmentApplication", back_populates="opening", cascade="all, delete-orphan")


class Candidate(database.Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    email = Column(String, nullable=False)
    email_hash = Column(String, nullable=True, index=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    cv_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    redacted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    organization = relationship("Organization")
    applications = relationship("RecruitmentApplication", back_populates="candidate", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        if "email" in kwargs and "email_hash" not in kwargs and kwargs["email"]:
            kwargs["email_hash"] = hashlib.sha256(kwargs["email"].strip().lower().encode("utf-8")).hexdigest()
        super().__init__(**kwargs)


class RecruitmentApplication(database.Base):
    __tablename__ = "recruitment_applications"
    __table_args__ = (
        UniqueConstraint("opening_id", "candidate_id", name="uq_opening_candidate"),
        Index("ix_rec_app_org_stage", "organization_id", "stage"),
        Index("ix_rec_app_open_stage", "opening_id", "stage"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    opening_id = Column(String, ForeignKey("job_openings.id"), nullable=False, index=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False, index=True)
    assigned_hr_member_id = Column(String, ForeignKey("organization_members.id"), nullable=True)
    stage = Column(Enum(RecruitmentStageEnum), default=RecruitmentStageEnum.INVITED, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_timestamp = Column(DateTime, nullable=True)
    terminal_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    organization = relationship("Organization")
    opening = relationship("JobOpening", back_populates="applications")
    candidate = relationship("Candidate", back_populates="applications")
    assigned_hr_member = relationship("OrganizationMember", foreign_keys=[assigned_hr_member_id])
    audit_events = relationship("RecruitmentAuditEvent", back_populates="application", cascade="all, delete-orphan")
    invitations = relationship("RecruitmentInvitation", back_populates="application", cascade="all, delete-orphan")
    assessment_attempts = relationship("AssessmentAttempt", back_populates="application", cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="application", cascade="all, delete-orphan")
    ai_evaluations = relationship("AIEvaluation", back_populates="application", cascade="all, delete-orphan")
    hr_review = relationship("HRReview", back_populates="application", uselist=False, cascade="all, delete-orphan")
    owner_approval = relationship("OwnerApproval", back_populates="application", uselist=False, cascade="all, delete-orphan")

    @property
    def opening_title(self) -> str | None:
        return self.opening.title if self.opening else None

    @property
    def department_name(self) -> str | None:
        return self.opening.department.name if self.opening and self.opening.department else None

    @property
    def candidate_name(self) -> str:
        return self.candidate.full_name if self.candidate else ""

    @property
    def candidate_email(self) -> str:
        return self.candidate.email if self.candidate else ""

    @property
    def assigned_hr_name(self) -> str | None:
        return (
            self.assigned_hr_member.user.full_name
            if self.assigned_hr_member and self.assigned_hr_member.user
            else None
        )


class RecruitmentAuditEvent(database.Base):
    __tablename__ = "recruitment_audit_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    application_id = Column(String, ForeignKey("recruitment_applications.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    actor_id = Column(String, nullable=True)
    previous_stage = Column(String, nullable=True)
    new_stage = Column(String, nullable=True)
    metadata_json = Column(Text, nullable=True)
    correlation_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    application = relationship("RecruitmentApplication", back_populates="audit_events")


class RecruitmentInvitation(database.Base):
    __tablename__ = "recruitment_invitations"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    application_id = Column(String, ForeignKey("recruitment_applications.id"), nullable=False, index=True)
    token_hash = Column(String, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_count = Column(Integer, default=0, nullable=False)
    max_uses = Column(Integer, default=1, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    application = relationship("RecruitmentApplication", back_populates="invitations")


class RecruitmentPolicy(database.Base):
    __tablename__ = "recruitment_policies"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), unique=True, nullable=False, index=True)
    retention_days = Column(Integer, default=180, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )


class AssessmentDefinition(database.Base):
    __tablename__ = "assessment_definitions"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=60, nullable=False)
    questions_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )


class AssessmentAttempt(database.Base):
    __tablename__ = "assessment_attempts"

    id = Column(String, primary_key=True, default=generate_uuid)
    application_id = Column(String, ForeignKey("recruitment_applications.id"), nullable=False, index=True)
    definition_snapshot_json = Column(Text, nullable=False)
    status = Column(Enum(AssessmentStatusEnum), default=AssessmentStatusEnum.PENDING, nullable=False)
    score = Column(Float, nullable=True)
    answers_json = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    application = relationship("RecruitmentApplication", back_populates="assessment_attempts")


class InterviewSession(database.Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    application_id = Column(String, ForeignKey("recruitment_applications.id"), nullable=False, index=True)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False, index=True)
    scheduled_at = Column(DateTime, nullable=False)
    interviewer_member_ids_json = Column(Text, nullable=True)
    status = Column(Enum(InterviewStatusEnum), default=InterviewStatusEnum.SCHEDULED, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    application = relationship("RecruitmentApplication", back_populates="interview_sessions")
    meeting = relationship("Meeting")


class AIEvaluation(database.Base):
    __tablename__ = "ai_evaluations"

    id = Column(String, primary_key=True, default=generate_uuid)
    application_id = Column(String, ForeignKey("recruitment_applications.id"), nullable=False, index=True)
    rubric_version = Column(Integer, default=1, nullable=False)
    model_name = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    scores_json = Column(Text, nullable=True)
    evidence_json = Column(Text, nullable=True)
    recommendation = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    application = relationship("RecruitmentApplication", back_populates="ai_evaluations")


class HRReview(database.Base):
    __tablename__ = "hr_reviews"

    id = Column(String, primary_key=True, default=generate_uuid)
    application_id = Column(String, ForeignKey("recruitment_applications.id"), unique=True, nullable=False, index=True)
    reviewer_member_id = Column(String, ForeignKey("organization_members.id"), nullable=False)
    decision = Column(Enum(HRDecisionEnum), nullable=False)
    reason = Column(Text, nullable=False)
    ai_diff_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    application = relationship("RecruitmentApplication", back_populates="hr_review")
    reviewer_member = relationship("OrganizationMember", foreign_keys=[reviewer_member_id])


class OwnerApproval(database.Base):
    __tablename__ = "owner_approvals"

    id = Column(String, primary_key=True, default=generate_uuid)
    application_id = Column(String, ForeignKey("recruitment_applications.id"), unique=True, nullable=False, index=True)
    approver_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    decision = Column(Enum(OwnerDecisionEnum), nullable=False)
    reason = Column(Text, nullable=True)
    onboarding_invitation_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    application = relationship("RecruitmentApplication", back_populates="owner_approval")
    approver_user = relationship("User", foreign_keys=[approver_user_id])


