from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from livekit import api
import os

from database import Base, engine, get_db
import models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Meeting AI API")

# Setup CORS cho Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MeetingCreate(BaseModel):
    title: str
    agenda: str
    duration_minutes: int


class MeetingResponse(MeetingCreate):
    id: int
    is_active: bool

    class Config:
        orm_mode = True


@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Meeting AI Backend (DX-OS)"}


@app.post("/api/meetings/", response_model=MeetingResponse)
def create_meeting(meeting: MeetingCreate, db: Session = Depends(get_db)):
    # Rào chắn quy trình (Process): Kiểm tra agenda
    if not meeting.agenda or len(meeting.agenda.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="Quy trình lỗi: Bắt buộc phải có Agenda chi tiết (ít nhất 20 ký tự) để tạo lịch họp.",
        )

    db_meeting = models.Meeting(**meeting.dict())
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


@app.get("/api/meetings/", response_model=List[MeetingResponse])
def read_meetings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    meetings = db.query(models.Meeting).offset(skip).limit(limit).all()
    return meetings


@app.get("/api/meetings/{meeting_id}/token")
def get_meeting_token(meeting_id: str, participant_name: str):
    api_key = os.getenv("LIVEKIT_API_KEY", "devkey")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "secret")

    token = api.AccessToken(api_key, api_secret)
    token.with_identity(participant_name)
    token.with_name(participant_name)
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=f"meeting-{meeting_id}",
        )
    )

    return {"token": token.to_jwt()}
