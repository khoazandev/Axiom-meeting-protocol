import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import Meeting, MeetingInvitation, User, WorkspaceMember
from src.backend.schemas.invitation import MeetingInviteCreate, MeetingInviteResponse

router = APIRouter(tags=["invitations"])


@router.post(
    "/meetings/{meeting_id}/invitations",
    response_model=MeetingInviteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_meeting_invitation(
    meeting_id: int,
    invite_in: MeetingInviteCreate,
    current_user: User = Depends(deps.get_current_user),
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.workspace_id == member.workspace_id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    token = str(uuid.uuid4())
    invitation = MeetingInvitation(
        meeting_id=meeting.id,
        email=invite_in.email,
        role=invite_in.role,
        token=token,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


@router.get("/invitations/verify/{token}", response_model=MeetingInviteResponse)
def verify_meeting_invitation(token: str, db: Session = Depends(get_db)):
    invitation = db.query(MeetingInvitation).filter(MeetingInvitation.token == token).first()
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invitation token")
    return invitation
