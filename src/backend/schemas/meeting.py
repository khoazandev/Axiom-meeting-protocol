"""Pydantic schemas for Meeting and MeetingMember resources."""

from datetime import datetime

from pydantic import BaseModel, Field


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    organization_id: str | None = None
    department_id: str | None = None
    scheduled_at: datetime | None = None


class MeetingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    scheduled_at: datetime | None = None
    status: str | None = None


class MeetingResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    organization_id: str | None = None
    department_id: str | None = None
    created_by_id: str
    status: str
    scheduled_at: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MeetingMemberAdd(BaseModel):
    user_id: str
    role: str = "PARTICIPANT"


class MeetingMemberResponse(BaseModel):
    id: str
    meeting_id: str
    user_id: str
    role: str
    status: str
    joined_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    token: str
