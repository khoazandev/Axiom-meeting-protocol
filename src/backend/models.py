import datetime
import enum
import uuid
from datetime import timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from src.backend import database


def generate_uuid():
    return str(uuid.uuid4())


class RoleEnum(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    MEMBER = "MEMBER"


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

    # Multi-tenant fields
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True)

    workspace = relationship("Workspace", back_populates="meetings")
    department = relationship("Department", back_populates="meetings")
    created_by = relationship("User", back_populates="created_meetings", foreign_keys=[created_by_id])
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")


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
