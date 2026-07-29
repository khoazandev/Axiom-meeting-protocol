from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend import database, models

database.Base.metadata.create_all(bind=database.engine)

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
def create_meeting(meeting: MeetingCreate, db: Session = Depends(database.get_db)):
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
def read_meetings(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    meetings = db.query(models.Meeting).offset(skip).limit(limit).all()
    return meetings
