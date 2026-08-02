from datetime import datetime
from pydantic import BaseModel, Field
from src.backend.models import RoleEnum


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=2)
    slug: str = Field(..., min_length=2, pattern=r"^[a-z0-9-]+$")


class WorkspaceMemberResponse(BaseModel):
    id: str
    user_id: str
    role: RoleEnum
    joined_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    logo_url: str | None = None
    owner_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteRequest(BaseModel):
    email: str
    role: RoleEnum = RoleEnum.MEMBER
