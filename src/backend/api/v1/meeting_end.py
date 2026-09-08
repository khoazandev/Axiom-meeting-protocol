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
    Organization,
    OrganizationMember,
    User,
)

router = APIRouter(prefix="/meetings", tags=["meeting-end"])


def _require_host(db: Session, meeting: Meeting, user: User):
    """Verify the user is creator, HOST, meeting member, or org admin/member."""
    if not meeting.created_by_id or meeting.created_by_id == user.id:
        return

    member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.meeting_id == meeting.id,
            MeetingMember.user_id == user.id,
        )
        .first()
    )
    if member:
        return

    created_org = db.query(Organization).filter(Organization.created_by_id == user.id).first()
    if created_org:
        return

    org_member = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .first()
    )
    if org_member:
        if not meeting.organization_id or org_member.organization_id == meeting.organization_id:
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Chỉ thành viên hoặc người tạo cuộc họp mới có quyền kết thúc và tổng kết cuộc họp",
    )


@router.post("/{meeting_id}/end")
def end_meeting_endpoint(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    End a meeting (HOST, Creator, or Admin).

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

    # Verify user has permission (HOST, Creator, or Admin)
    _require_host(db, meeting, current_user)

    # Execute end meeting flow
    from src.backend.services.meeting_end_service import end_meeting

    result = end_meeting(db, meeting_id, current_user.id)
    return result
