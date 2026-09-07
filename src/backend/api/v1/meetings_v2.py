import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from src.backend.api import deps
from src.backend.core.exceptions import AuthenticationException, ForbiddenException, NotFoundException
from src.backend.database import get_db
from src.backend.models import (
    Meeting,
    MeetingMember,
    MeetingMemberRoleEnum,
    MeetingMemberStatusEnum,
    MeetingStatusEnum,
    User,
)
from src.backend.schemas.meeting import (
    MeetingCreate,
    MeetingMemberAdd,
    MeetingMemberResponse,
    MeetingResponse,
    MeetingUpdate,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_meeting_or_404(db: Session, meeting_id: str) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException("Meeting")
    return meeting


def _require_meeting_member(db: Session, meeting_id: str, user_id: str) -> MeetingMember:
    member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.meeting_id == meeting_id,
            MeetingMember.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise ForbiddenException("Not a member of this meeting")
    return member


# ---------------------------------------------------------------------------
# Meeting CRUD
# ---------------------------------------------------------------------------
@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Create a new meeting. Creator is auto-added as HOST."""
    meeting = Meeting(
        title=payload.title,
        description=payload.description,
        organization_id=payload.organization_id,
        department_id=payload.department_id,
        created_by_id=current_user.id,
        scheduled_at=payload.scheduled_at,
        status=MeetingStatusEnum.SCHEDULED,
    )
    db.add(meeting)
    db.flush()

    # Auto-add creator as HOST
    host = MeetingMember(
        meeting_id=meeting.id,
        user_id=current_user.id,
        role=MeetingMemberRoleEnum.HOST,
        status=MeetingMemberStatusEnum.ACCEPTED,
    )
    db.add(host)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/", response_model=list[MeetingResponse])
@router.get("", response_model=list[MeetingResponse])
def list_my_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all meetings the current user is a member of."""
    memberships = (
        db.query(MeetingMember)
        .filter(MeetingMember.user_id == current_user.id)
        .all()
    )
    meeting_ids = [m.meeting_id for m in memberships]
    if not meeting_ids:
        return []
    return db.query(Meeting).filter(Meeting.id.in_(meeting_ids)).all()


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get meeting details. User must be a member."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)
    return meeting


@router.patch("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(
    meeting_id: str,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Update meeting details. Only HOST or creator can update."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    if payload.title is not None:
        meeting.title = payload.title
    if payload.description is not None:
        meeting.description = payload.description
    if payload.scheduled_at is not None:
        meeting.scheduled_at = payload.scheduled_at
    if payload.status is not None:
        old_status = meeting.status
        meeting.status = payload.status
        if payload.status in ("COMPLETED", "ENDED"):
            if not meeting.ended_at:
                meeting.ended_at = datetime.now(timezone.utc)
            if old_status not in ("COMPLETED", "ENDED"):
                try:
                    from src.backend.services.action_item_extractor import extract_action_items
                    extract_action_items(db, meeting_id, current_user.id)
                except Exception as e:
                    logger.warning(f"Failed to auto-extract action items for meeting {meeting_id}: {e}")

    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Delete a meeting. Only HOST or creator can delete."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    db.delete(meeting)
    db.commit()


# ---------------------------------------------------------------------------
# MeetingMember Management
# ---------------------------------------------------------------------------
@router.get("/{meeting_id}/members", response_model=list[MeetingMemberResponse])
def list_meeting_members(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all members of a meeting."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    from sqlalchemy.orm import joinedload
    return (
        db.query(MeetingMember)
        .options(joinedload(MeetingMember.user))
        .filter(MeetingMember.meeting_id == meeting_id)
        .all()
    )


@router.post(
    "/{meeting_id}/members",
    response_model=MeetingMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_meeting_member(
    meeting_id: str,
    payload: MeetingMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Add a user to a meeting."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    # Map string role to enum
    try:
        role_enum = MeetingMemberRoleEnum(payload.role)
    except ValueError:
        role_enum = MeetingMemberRoleEnum.PARTICIPANT

    member = MeetingMember(
        meeting_id=meeting_id,
        user_id=payload.user_id,
        role=role_enum,
        status=MeetingMemberStatusEnum.INVITED,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete(
    "/{meeting_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_meeting_member(
    meeting_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Remove a member from a meeting."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    target = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.id == member_id,
            MeetingMember.meeting_id == meeting_id,
        )
        .first()
    )
    if not target:
        raise NotFoundException("Meeting member")

    db.delete(target)
    db.commit()


# ---------------------------------------------------------------------------
# LiveKit Token & In-Meeting RAG
# ---------------------------------------------------------------------------
from pydantic import BaseModel as _PydanticBaseModel
from livekit import api as livekit_api
from src.backend.core.config import get_settings
from src.backend.services.ollama_service import build_rag_answer


class TokenResponse(_PydanticBaseModel):
    token: str


class RagQueryRequest(_PydanticBaseModel):
    question: str
    live_transcript: str | None = None
    chat_history: list[dict] | None = None


class RagSourceItem(_PydanticBaseModel):
    type: str
    snippet: str
    filename: str | None = None
    timestamp: int | None = None


class RagQueryResponse(_PydanticBaseModel):
    question: str
    answer: str
    sources: list[RagSourceItem]
    context_used: list[str]


import uuid

import json

@router.get("/{meeting_id}/token", response_model=TokenResponse)
def get_meeting_token(
    meeting_id: str,
    participant_name: str,
    language: str = "vi",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Generate a LiveKit access token for a meeting room."""
    _get_meeting_or_404(db, meeting_id)
    settings = get_settings()
    token = livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    unique_identity = f"user_{current_user.id}"
    token.with_identity(unique_identity)
    token.with_name(participant_name)
    token.with_metadata(json.dumps({"target_lang": language}))
    token.with_grants(
        livekit_api.VideoGrants(
            room_join=True,
            room=f"meeting-{meeting_id}",
            can_update_own_metadata=True,
        )
    )

    # Automatically ensure AI Agent is dispatched to the room
    try:
        def _auto_dispatch():
            async def _inner():
                try:
                    http_url = settings.livekit_url.replace("ws://", "http://").replace("wss://", "https://")
                    lk = livekit_api.LiveKitAPI(http_url, settings.livekit_api_key, settings.livekit_api_secret)
                    req = livekit_api.CreateAgentDispatchRequest(room=f"meeting-{meeting_id}", agent_name="")
                    await lk.agent_dispatch.create_dispatch(req)
                    await lk.aclose()
                except Exception:
                    pass
            import asyncio
            asyncio.run(_inner())
        import threading
        threading.Thread(target=_auto_dispatch, daemon=True).start()
    except Exception as e:
        logger.warning(f"Failed to auto-dispatch agent for meeting {meeting_id}: {e}")

    return TokenResponse(token=token.to_jwt())


@router.post("/{meeting_id}/rag/query", response_model=RagQueryResponse)
def rag_query(
    meeting_id: str,
    payload: RagQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """In-meeting RAG chatbot query."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    sources = []
    if meeting.description:
        sources.append({"type": "agenda", "snippet": meeting.description})

    answer = build_rag_answer(
        question=payload.question,
        sources=sources,
        live_transcript=payload.live_transcript,
        chat_history=payload.chat_history,
    )

    return RagQueryResponse(
        question=payload.question,
        answer=answer,
        sources=[RagSourceItem(**s) for s in sources],
        context_used=[s["snippet"] for s in sources],
    )

