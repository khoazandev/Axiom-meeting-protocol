"""Meeting End API — Host-only endpoint to end a meeting."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.core.exceptions import NotFoundException
from src.backend.database import get_db
from src.backend.models import (
    Meeting,
    MeetingMember,
    MeetingMemberRoleEnum,
    MeetingStatusEnum,
    User,
)

router = APIRouter(prefix="/meetings", tags=["meeting-end"])


def _require_host(db: Session, meeting_id: str, user_id: str):
    """Verify the user is the HOST of the meeting."""
    member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.meeting_id == meeting_id,
            MeetingMember.user_id == user_id,
            MeetingMember.role == MeetingMemberRoleEnum.HOST,
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the meeting HOST can perform this action",
        )


@router.post("/{meeting_id}/end")
def end_meeting_endpoint(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    End a meeting (HOST only).

    Triggers:
    - Full follow-up task extraction from transcript
    - Meeting summary generation via AI
    - LiveKit room closure
    - Meeting status → COMPLETED
    """
    # Verify meeting exists
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException("Meeting")

    # Verify meeting is in progress
    if meeting.status == MeetingStatusEnum.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meeting has already ended",
        )

    # Verify user is HOST
    _require_host(db, meeting_id, current_user.id)

    # Execute end meeting flow
    from src.backend.services.meeting_end_service import end_meeting

    result = end_meeting(db, meeting_id, current_user.id)
    return result
