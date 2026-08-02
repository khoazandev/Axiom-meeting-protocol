import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import Meeting, MeetingBookmark, User, WorkspaceMember

router = APIRouter(tags=["mom"])


class BookmarkCreate(BaseModel):
    timestamp_seconds: int
    note: str
    is_action_item: Optional[bool] = False


class BookmarkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: int
    user_id: str
    timestamp_seconds: int
    note: str
    is_action_item: bool
    created_at: datetime.datetime


@router.post(
    "/meetings/{meeting_id}/bookmarks",
    response_model=BookmarkResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_bookmark(
    meeting_id: int,
    data: BookmarkCreate,
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

    bookmark = MeetingBookmark(
        meeting_id=meeting.id,
        user_id=current_user.id,
        timestamp_seconds=data.timestamp_seconds,
        note=data.note,
        is_action_item=data.is_action_item or False,
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark


@router.get("/meetings/{meeting_id}/bookmarks", response_model=List[BookmarkResponse])
def list_bookmarks(
    meeting_id: int,
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

    return db.query(MeetingBookmark).filter(MeetingBookmark.meeting_id == meeting.id).order_by(MeetingBookmark.timestamp_seconds.asc()).all()
