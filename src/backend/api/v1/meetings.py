"""
Meeting CRUD endpoints and LiveKit token generation.

All meeting-related API routes live here, following the Process (P) layer
of the H-P-D-I architecture.
"""

from livekit import api
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.api.deps import get_db
from src.backend.core.config import get_settings
from src.backend.core.exceptions import NotFoundException, ProcessGateException
from src.backend.schemas.meeting import MeetingCreate, MeetingResponse, MessageResponse, TokenResponse

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("/", response_model=MeetingResponse)
def create_meeting(meeting: MeetingCreate, db: Session = Depends(get_db)):
    """Create a new meeting with Process Gate validation.

    The agenda must be at least 20 characters (after trimming whitespace).
    This enforces the DX-OS principle: No Agenda = No Meeting.
    """
    if not meeting.agenda or len(meeting.agenda.strip()) < 20:
        raise ProcessGateException(
            message="Agenda must be at least 20 characters to ensure structured meetings.",
            detail="Process Gate: Detailed agendas are required to enforce meeting discipline.",
        )

    db_meeting = models.Meeting(**meeting.model_dump())
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


@router.get("/", response_model=list[MeetingResponse])
def read_meetings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all meetings with pagination support."""
    meetings = db.query(models.Meeting).offset(skip).limit(limit).all()
    return meetings


@router.get("/{meeting_id}", response_model=MeetingResponse)
def read_meeting(meeting_id: int, db: Session = Depends(get_db)):
    """Get a single meeting by ID."""
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise NotFoundException(resource="Meeting")
    return meeting


@router.delete("/{meeting_id}", response_model=MessageResponse)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    """Delete a meeting by ID."""
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise NotFoundException(resource="Meeting")
    db.delete(meeting)
    db.commit()
    return MessageResponse(message="Meeting deleted successfully")


@router.get("/{meeting_id}/token", response_model=TokenResponse)
def get_meeting_token(meeting_id: str, participant_name: str):
    """Generate a LiveKit access token for a meeting room.

    Note: In Phase 2, this will require authentication.
    """
    settings = get_settings()
    token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    token.with_identity(participant_name)
    token.with_name(participant_name)
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=f"meeting-{meeting_id}",
        )
    )
    return TokenResponse(token=token.to_jwt())
