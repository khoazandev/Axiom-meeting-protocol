"""
Pydantic schemas for Meeting API requests and responses.

Separated from SQLAlchemy models to maintain clean architecture boundaries.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MeetingCreate(BaseModel):
    """Schema for creating a new meeting."""

    title: str
    agenda: str
    duration_minutes: int


class MeetingResponse(MeetingCreate):
    """Schema for meeting API responses."""

    id: int
    is_active: bool
    start_time: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """Generic message response schema."""

    message: str


class TokenResponse(BaseModel):
    """LiveKit token response schema."""

    token: str
