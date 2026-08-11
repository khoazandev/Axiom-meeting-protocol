"""Meeting CRUD + MeetingMember management API endpoints."""

import datetime
from datetime import timezone

from fastapi import APIRouter, Depends, status
from livekit import api
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.core.config import get_settings
from src.backend.core.exceptions import ForbiddenException, NotFoundException
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
    TokenResponse,
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
    """List meetings where current user has ACCEPTED/JOINED/HOST status (not INVITED)."""
    accepted_statuses = [
        MeetingMemberStatusEnum.ACCEPTED,
        MeetingMemberStatusEnum.JOINED,
    ]
    memberships = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.user_id == current_user.id,
            (
                MeetingMember.status.in_(accepted_statuses)
                | (MeetingMember.role == MeetingMemberRoleEnum.HOST)
            ),
        )
        .all()
    )
    meeting_ids = [m.meeting_id for m in memberships]
    if not meeting_ids:
        return []
    return db.query(Meeting).filter(Meeting.id.in_(meeting_ids)).all()


# ---------------------------------------------------------------------------
# Invitation Flow (must be before /{meeting_id} routes)
# ---------------------------------------------------------------------------
@router.get("/invitations/pending", response_model=list[dict])
def list_pending_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all pending meeting invitations for the current user."""
    pending_members = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.user_id == current_user.id,
            MeetingMember.status == MeetingMemberStatusEnum.INVITED,
        )
        .all()
    )

    results = []
    for pm in pending_members:
        meeting = db.query(Meeting).filter(Meeting.id == pm.meeting_id).first()
        inviter = (
            db.query(User).filter(User.id == meeting.created_by_id).first() if meeting else None
        )
        results.append(
            {
                "member_id": pm.id,
                "meeting_id": pm.meeting_id,
                "meeting_title": meeting.title if meeting else "Unknown",
                "meeting_description": meeting.description if meeting else None,
                "invited_by": inviter.full_name if inviter else "Unknown",
                "invited_by_email": inviter.email if inviter else "",
                "invited_at": pm.created_at.isoformat() if pm.created_at else None,
                "role": pm.role.value if pm.role else "PARTICIPANT",
            }
        )
    return results


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
        try:
            new_status = MeetingStatusEnum(payload.status)
        except ValueError:
            new_status = None
        if new_status:
            meeting.status = new_status

    db.commit()
    db.refresh(meeting)

    # Auto-extract action items when meeting ends
    if meeting.status == MeetingStatusEnum.COMPLETED:
        try:
            from src.backend.services.action_item_extractor import extract_action_items

            extract_action_items(db, meeting_id, triggered_by=current_user.id)
        except Exception as exc:
            import logging

            logging.getLogger("axiom").warning("Action item extraction failed: %s", exc)

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


@router.get("/{meeting_id}/token", response_model=TokenResponse)
def get_meeting_token(
    meeting_id: str,
    participant_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Generate a LiveKit access token for a meeting room. User must have ACCEPTED status."""
    _get_meeting_or_404(db, meeting_id)
    member = _require_meeting_member(db, meeting_id, current_user.id)

    # Only HOST or ACCEPTED/JOINED members can get a token
    allowed_statuses = [
        MeetingMemberStatusEnum.ACCEPTED,
        MeetingMemberStatusEnum.JOINED,
    ]
    if member.role != MeetingMemberRoleEnum.HOST and member.status not in allowed_statuses:
        raise ForbiddenException("You must accept the invitation before joining the meeting")

    settings = get_settings()
    token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    token.with_identity(participant_name)
    token.with_name(participant_name)
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=str(meeting_id),
        )
    )
    return TokenResponse(token=token.to_jwt())


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

    return db.query(MeetingMember).filter(MeetingMember.meeting_id == meeting_id).all()


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


@router.post(
    "/{meeting_id}/members/{member_id}/accept",
    response_model=MeetingMemberResponse,
)
def accept_invitation(
    meeting_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Accept a meeting invitation. Only the invited user can accept."""
    _get_meeting_or_404(db, meeting_id)
    member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.id == member_id,
            MeetingMember.meeting_id == meeting_id,
            MeetingMember.user_id == current_user.id,
            MeetingMember.status == MeetingMemberStatusEnum.INVITED,
        )
        .first()
    )
    if not member:
        raise NotFoundException("Pending invitation")

    member.status = MeetingMemberStatusEnum.ACCEPTED
    member.joined_at = datetime.datetime.now(timezone.utc)
    db.commit()
    db.refresh(member)
    return member


@router.post(
    "/{meeting_id}/members/{member_id}/decline",
    status_code=status.HTTP_204_NO_CONTENT,
)
def decline_invitation(
    meeting_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Decline a meeting invitation. Removes the membership."""
    _get_meeting_or_404(db, meeting_id)
    member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.id == member_id,
            MeetingMember.meeting_id == meeting_id,
            MeetingMember.user_id == current_user.id,
            MeetingMember.status == MeetingMemberStatusEnum.INVITED,
        )
        .first()
    )
    if not member:
        raise NotFoundException("Pending invitation")

    member.status = MeetingMemberStatusEnum.DECLINED
    db.commit()
