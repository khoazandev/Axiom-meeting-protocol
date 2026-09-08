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
from src.backend.api.deps import get_db, get_optional_workspace_member, get_current_user
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
    """Create a new meeting.
    """
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


import uuid

import json

@router.get("/{meeting_id}/token", response_model=TokenResponse)
def get_meeting_token(
    meeting_id: str, 
    participant_name: str,
    language: str = "vi",
    current_user: models.User = Depends(get_current_user)
):
    """Generate a LiveKit access token for a meeting room."""
    settings = get_settings()
    token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    unique_identity = f"user_{current_user.id}"
    token.with_identity(unique_identity)
    token.with_name(participant_name)
    token.with_metadata(json.dumps({"target_lang": language}))
    token.with_ttl(timedelta(hours=8))
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=f"meeting-{meeting_id}",
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            can_update_own_metadata=True,
        )
    )
    return TokenResponse(token=token.to_jwt())


from pydantic import BaseModel

class QuickTranslateRequest(BaseModel):
    text: str
    from_lang: str = "vi"
    to_lang: str = "en"

class QuickTranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    from_lang: str
    to_lang: str


@router.post("/translate", response_model=QuickTranslateResponse)
def translate_sentence(
    req: QuickTranslateRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    Sub-second bilingual translation using CTranslate2 INT8 models.
    Supports vi -> en (~100-180ms) and en -> vi (~100-180ms).
    """
    from src.backend import ct2_translator
    text = req.text.strip()
    if not text:
        return QuickTranslateResponse(
            original_text="",
            translated_text="",
            from_lang=req.from_lang,
            to_lang=req.to_lang
        )

    from_l = (req.from_lang or "vi").lower().split("-")[0]
    to_l = (req.to_lang or "en").lower().split("-")[0]

    translated = None
    if from_l == "vi" and to_l == "en":
        translated = ct2_translator.translate_vi_to_en(text)
    elif from_l == "en" and to_l == "vi":
        translated = ct2_translator.translate_en_to_vi(text)
    elif from_l == "vi":
        translated = ct2_translator.translate_vi_to_en(text)
    elif from_l == "en":
        translated = ct2_translator.translate_en_to_vi(text)
    else:
        translated = ct2_translator.translate_vi_to_en(text) or text

    return QuickTranslateResponse(
        original_text=text,
        translated_text=translated or text,
        from_lang=req.from_lang,
        to_lang=req.to_lang
    )

