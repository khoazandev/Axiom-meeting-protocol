import datetime
from datetime import timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.backend.database import get_db
from src.backend.models import Meeting, MeetingStatusEnum

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/livekit")
async def livekit_webhook_handler(request: Request, db: Session = Depends(get_db)):
    payload: Dict[str, Any] = await request.json()
    event = payload.get("event")
    room_data = payload.get("room", {})
    room_name = room_data.get("name")

    if not room_name:
        return {"status": "ignored", "reason": "no room name"}

    # Attempt to locate meeting by ID
    try:
        meeting_id = int(room_name)
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    except (ValueError, TypeError):
        meeting = db.query(Meeting).filter(Meeting.id == room_name).first()

    if not meeting:
        return {"status": "ignored", "reason": "meeting not found"}

    now_utc = datetime.datetime.now(timezone.utc)

    if event == "room_started":
        meeting.status = MeetingStatusEnum.IN_PROGRESS
        meeting.started_at = now_utc
        meeting.is_active = True
        db.commit()
        return {"status": "processed", "event": event, "meeting_id": meeting.id}

    elif event == "room_finished":
        meeting.status = MeetingStatusEnum.COMPLETED
        meeting.ended_at = now_utc
        meeting.is_active = False
        db.commit()
        return {"status": "processed", "event": event, "meeting_id": meeting.id}

    elif event in ("participant_joined", "participant_left"):
        return {"status": "processed", "event": event, "meeting_id": meeting.id}

    return {"status": "ignored", "event": event}
