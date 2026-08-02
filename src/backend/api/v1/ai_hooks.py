from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import Meeting, WorkspaceMember

router = APIRouter(tags=["ai-hooks"])


class TranscriptIngest(BaseModel):
    speaker: Optional[str] = "Speaker"
    text: str


class SummaryIngest(BaseModel):
    summary: str


@router.post("/meetings/{meeting_id}/transcript")
def ingest_transcript(
    meeting_id: int,
    data: TranscriptIngest,
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

    new_line = f"[{data.speaker}]: {data.text}\n"
    meeting.transcript = (meeting.transcript or "") + new_line
    db.commit()
    db.refresh(meeting)
    return {"status": "success", "meeting_id": meeting.id, "transcript": meeting.transcript}


@router.post("/meetings/{meeting_id}/summary")
def ingest_summary(
    meeting_id: int,
    data: SummaryIngest,
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

    meeting.summary = data.summary
    db.commit()
    db.refresh(meeting)
    return {"status": "success", "meeting_id": meeting.id, "summary": meeting.summary}
