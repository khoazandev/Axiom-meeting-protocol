import datetime
import enum
import uuid
from datetime import timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from . import database


def generate_uuid():
    return str(uuid.uuid4())


class RoleEnum(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    MEMBER = "MEMBER"


class MeetingStatusEnum(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TaskPriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaskStatusEnum(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    COMPLETED = "COMPLETED"


class InvitationRoleEnum(str, enum.Enum):
    ATTENDEE = "ATTENDEE"
    PRESENTER = "PRESENTER"
    MODERATOR = "MODERATOR"


class InvitationStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"


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

    owned_workspaces = relationship("Workspace", back_populates="owner", foreign_keys="Workspace.owner_id")
    workspace_memberships = relationship("WorkspaceMember", back_populates="user")
    created_meetings = relationship("Meeting", back_populates="created_by", foreign_keys="Meeting.created_by_id")


class Workspace(database.Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    logo_url = Column(String, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    owner = relationship("User", back_populates="owned_workspaces", foreign_keys=[owner_id])
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    departments = relationship("Department", back_populates="workspace", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="workspace", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="workspace", cascade="all, delete-orphan")
    knowledge_documents = relationship("KnowledgeDocument", back_populates="workspace", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="workspace", cascade="all, delete-orphan")
    outbound_webhooks = relationship("OutboundWebhook", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(database.Base):
    __tablename__ = "workspace_members"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.MEMBER, nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")


class Department(database.Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    manager_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="departments")
    manager = relationship("User", foreign_keys=[manager_id])
    meetings = relationship("Meeting", back_populates="department")


class DepartmentMember(database.Base):
    __tablename__ = "department_members"

    department_id = Column(String, ForeignKey("departments.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)


class Invitation(database.Base):
    __tablename__ = "invitations"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    email = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.MEMBER, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))


class Meeting(database.Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    agenda = Column(Text, nullable=False)
    start_time = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    duration_minutes = Column(Integer, default=60)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    transcript = Column(String, default="")
    summary = Column(String, default="")

    # Real-time & Post-meeting fields
    status = Column(Enum(MeetingStatusEnum), default=MeetingStatusEnum.SCHEDULED, nullable=False)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    recording_url = Column(String, nullable=True)

    # Multi-tenant fields
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True)

    workspace = relationship("Workspace", back_populates="meetings")
    department = relationship("Department", back_populates="meetings")
    created_by = relationship("User", back_populates="created_meetings", foreign_keys=[created_by_id])
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="meeting", cascade="all, delete-orphan")
    invitations = relationship("MeetingInvitation", back_populates="meeting", cascade="all, delete-orphan")
    files = relationship("MeetingFile", back_populates="meeting", cascade="all, delete-orphan")
    bookmarks = relationship("MeetingBookmark", back_populates="meeting", cascade="all, delete-orphan")


class Task(database.Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=True, index=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(Enum(TaskPriorityEnum), default=TaskPriorityEnum.MEDIUM, nullable=False)
    status = Column(Enum(TaskStatusEnum), default=TaskStatusEnum.TODO, nullable=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="tasks")
    meeting = relationship("Meeting", back_populates="tasks")
    created_by = relationship("User", foreign_keys=[created_by_id])
    assignee = relationship("User", foreign_keys=[assignee_id])


class MeetingInvitation(database.Base):
    __tablename__ = "meeting_invitations"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    role = Column(Enum(InvitationRoleEnum), default=InvitationRoleEnum.ATTENDEE, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    status = Column(Enum(InvitationStatusEnum), default=InvitationStatusEnum.PENDING, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    meeting = relationship("Meeting", back_populates="invitations")


class MeetingFile(database.Base):
    __tablename__ = "meeting_files"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)  # Plain text extracted from file for RAG search
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    meeting = relationship("Meeting", back_populates="files")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class MeetingBookmark(database.Base):
    __tablename__ = "meeting_bookmarks"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    timestamp_seconds = Column(Integer, nullable=False)
    note = Column(String, nullable=False)
    is_action_item = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    meeting = relationship("Meeting", back_populates="bookmarks")
    user = relationship("User", foreign_keys=[user_id])


class KnowledgeDocument(database.Base):
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    vector_status = Column(String, default="READY")
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="knowledge_documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class AuditLog(database.Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="audit_logs")
    user = relationship("User", foreign_keys=[user_id])


class OutboundWebhook(database.Base):
    __tablename__ = "outbound_webhooks"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    target_url = Column(String, nullable=False)
    events = Column(String, default="all")
    secret_key = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="outbound_webhooks")


class ActionItem(database.Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    assignee = Column(String)
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    is_completed = Column(Boolean, default=False)

    meeting = relationship("Meeting", back_populates="action_items")
