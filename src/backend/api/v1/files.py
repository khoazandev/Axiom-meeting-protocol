import os
from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import Meeting, MeetingFile, User, WorkspaceMember

router = APIRouter(tags=["files"])


class MeetingFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: int
    uploaded_by_id: str
    filename: str
    file_path: str
    file_size: int
    content_type: str


STORAGE_DIR = "storage/meetings"


@router.post(
    "/meetings/{meeting_id}/files",
    response_model=MeetingFileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_meeting_file(
    meeting_id: int,
    file: UploadFile = File(...),
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

    meeting_storage_dir = os.path.join(STORAGE_DIR, str(meeting_id))
    os.makedirs(meeting_storage_dir, exist_ok=True)

    file_path = os.path.join(meeting_storage_dir, file.filename)
    contents = await file.read()

    with open(file_path, "wb") as f:
        f.write(contents)

    meeting_file = MeetingFile(
        meeting_id=meeting.id,
        uploaded_by_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_size=len(contents),
        content_type=file.content_type or "application/octet-stream",
    )
    db.add(meeting_file)
    db.commit()
    db.refresh(meeting_file)
    return meeting_file


@router.get("/meetings/{meeting_id}/files", response_model=List[MeetingFileResponse])
def list_meeting_files(
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

    return db.query(MeetingFile).filter(MeetingFile.meeting_id == meeting.id).all()
