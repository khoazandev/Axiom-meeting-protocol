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


class FollowUpTaskStatusEnum(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    NOT_CONFIRMED = "NOT_CONFIRMED"
    COMPLETED = "COMPLETED"

class FollowUpTaskSourceEnum(str, enum.Enum):
    AI_REALTIME = "AI_REALTIME"
    AI_FULL = "AI_FULL"
    MANUAL = "MANUAL"


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
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
    )

    meeting = relationship("Meeting")
    transcript_segment = relationship("TranscriptSegment")


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

    # People
    reporter_id = Column(String, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
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


