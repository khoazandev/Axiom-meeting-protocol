"""
Meeting CRUD endpoints and LiveKit token generation.

All meeting-related API routes live here, following the Process (P) layer
of the H-P-D-I architecture.
"""

from datetime import timedelta
from livekit import api
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.api.deps import get_db, get_optional_workspace_member
from src.backend.core.config import get_settings
from src.backend.core.exceptions import NotFoundException, ProcessGateException
from src.backend.models import WorkspaceMember
from src.backend.schemas.meeting import MeetingCreate, MeetingResponse, MessageResponse, TokenResponse

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("", response_model=MeetingResponse)
@router.post("/", response_model=MeetingResponse)
@router.post("", response_model=MeetingResponse)
def create_meeting(
    meeting: MeetingCreate,
    member: WorkspaceMember | None = Depends(get_optional_workspace_member),
    db: Session = Depends(get_db),
):
    """Create a new meeting with Process Gate validation.

    The agenda must be at least 20 characters (after trimming whitespace).
    This enforces the DX-OS principle: No Agenda = No Meeting.
    """
    if not meeting.agenda or len(meeting.agenda.strip()) < 20:
        raise ProcessGateException(
            message="Agenda must be at least 20 characters to ensure structured meetings.",
            detail="Process Gate: Detailed agendas are required to enforce meeting discipline.",
        )

    meeting_data = meeting.model_dump()
    if member:
        meeting_data["workspace_id"] = member.workspace_id
        meeting_data["created_by_id"] = member.user_id

    db_meeting = models.Meeting(**meeting_data)
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


@router.get("", response_model=list[MeetingResponse])
@router.get("/", response_model=list[MeetingResponse])
@router.get("", response_model=list[MeetingResponse])
def read_meetings(
    skip: int = 0,
    limit: int = 100,
    member: WorkspaceMember | None = Depends(get_optional_workspace_member),
    db: Session = Depends(get_db),
):
    """List meetings with pagination and tenant isolation support."""
    query = db.query(models.Meeting)
    if member:
        query = query.filter(models.Meeting.workspace_id == member.workspace_id)
    meetings = query.offset(skip).limit(limit).all()
    return meetings


@router.get("/{meeting_id}", response_model=MeetingResponse)
def read_meeting(
    meeting_id: int,
    member: WorkspaceMember | None = Depends(get_optional_workspace_member),
    db: Session = Depends(get_db),
):
    """Get a single meeting by ID with tenant isolation."""
    query = db.query(models.Meeting).filter(models.Meeting.id == meeting_id)
    if member:
        query = query.filter(models.Meeting.workspace_id == member.workspace_id)
    meeting = query.first()
    if meeting is None:
        raise NotFoundException(resource="Meeting")
    return meeting


@router.delete("/{meeting_id}", response_model=MessageResponse)
def delete_meeting(
    meeting_id: int,
    member: WorkspaceMember | None = Depends(get_optional_workspace_member),
    db: Session = Depends(get_db),
):
    """Delete a meeting by ID with tenant isolation."""
    query = db.query(models.Meeting).filter(models.Meeting.id == meeting_id)
    if member:
        query = query.filter(models.Meeting.workspace_id == member.workspace_id)
    meeting = query.first()
    if meeting is None:
        raise NotFoundException(resource="Meeting")
    db.delete(meeting)
    db.commit()
    return MessageResponse(message="Meeting deleted successfully")


@router.get("/{meeting_id}/token", response_model=TokenResponse)
def get_meeting_token(meeting_id: str, participant_name: str):
    """Generate a LiveKit access token for a meeting room."""
    settings = get_settings()
    token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    token.with_identity(participant_name)
    token.with_name(participant_name)
    token.with_ttl(timedelta(hours=8))
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=f"meeting-{meeting_id}",
        )
    )
    return TokenResponse(token=token.to_jwt())
