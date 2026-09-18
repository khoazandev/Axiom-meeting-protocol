"""
Meeting CRUD endpoints and LiveKit token generation.

All meeting-related API routes live here, following the Process (P) layer
of the H-P-D-I architecture.
"""

from datetime import timedelta
from livekit import api
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.api.deps import get_db, get_optional_workspace_member, get_current_user
from src.backend.core.config import get_settings
from src.backend.core.exceptions import NotFoundException, ProcessGateException
from src.backend.models import WorkspaceMember
from src.backend.schemas.meeting import MeetingCreate, MeetingResponse, MessageResponse, TokenResponse

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("", response_model=MeetingResponse)
@router.post("/", response_model=MeetingResponse)
@router.post("", response_model=MeetingResponse)
def create_meeting(
    meeting: MeetingCreate,
    member: WorkspaceMember | None = Depends(get_optional_workspace_member),
    db: Session = Depends(get_db),
):
    """Create a new meeting.
    """
    meeting_data = meeting.model_dump()
    agenda_text = meeting_data.pop("agenda_text", None) or meeting_data.get("agenda") or meeting_data.get("description")
    print(f"AGENDA_TEXT_DEBUG: {repr(agenda_text)}", flush=True)
    if member:
        meeting_data["workspace_id"] = member.workspace_id
        meeting_data["created_by_id"] = member.user_id

    db_meeting = models.Meeting(**meeting_data)
    db.add(db_meeting)
    db.flush()

    if agenda_text:
        import re
        lines = [line.strip() for line in agenda_text.split("\n") if line.strip()]
        
        # Smart extraction: Extract both numbered lists AND bullet points
        valid_pattern = re.compile(r"^(\d+[\.\)]|[\-\*\•])\s+")
        valid_lines = [line for line in lines if valid_pattern.match(line)]
        
        if valid_lines:
            lines = valid_lines

        for i, line in enumerate(lines):
            # Clean up bullet points (e.g. "- ", "1. ", "• ")
            title = line
            for prefix in ["- ", "* ", "• "]:
                if title.startswith(prefix):
                    title = title[len(prefix):]
            # For numbers like "1. " or "1) "
            title = re.sub(r"^\d+[\.\)]\s+", "", title)
            
            topic = models.Topic(
                meeting_id=db_meeting.id,
                title=title,
                status=models.TopicStatusEnum.IN_PROGRESS if i == 0 else models.TopicStatusEnum.PENDING,
                order_index=i
            )
            db.add(topic)

    db.commit()
    db.refresh(db_meeting)
    return db_meeting


@router.get("", response_model=list[MeetingResponse])
@router.get("/", response_model=list[MeetingResponse])
@router.get("", response_model=list[MeetingResponse])
def read_meetings(
    skip: int = 0,
    limit: int = 100,
    member: WorkspaceMember | None = Depends(get_optional_workspace_member),
    db: Session = Depends(get_db),
):
    """List meetings with pagination and tenant isolation support."""
    query = db.query(models.Meeting)
    if member:
        query = query.filter(models.Meeting.workspace_id == member.workspace_id)
    meetings = query.offset(skip).limit(limit).all()
    return meetings


@router.get("/{meeting_id}", response_model=MeetingResponse)
def read_meeting(
    meeting_id: int,
    member: WorkspaceMember | None = Depends(get_optional_workspace_member),
    db: Session = Depends(get_db),
):
    """Get a single meeting by ID with tenant isolation."""
    query = db.query(models.Meeting).filter(models.Meeting.id == meeting_id)
    if member:
        query = query.filter(models.Meeting.workspace_id == member.workspace_id)
    meeting = query.first()
    if meeting is None:
        raise NotFoundException(resource="Meeting")
    return meeting


@router.delete("/{meeting_id}", response_model=MessageResponse)
def delete_meeting(
    meeting_id: str,
    member: WorkspaceMember | None = Depends(get_optional_workspace_member),
    db: Session = Depends(get_db),
):
    """Delete a meeting by ID with tenant isolation."""
    query = db.query(models.Meeting).filter(models.Meeting.id == meeting_id)
    if member:
        query = query.filter(models.Meeting.workspace_id == member.workspace_id)
    meeting = query.first()
    if meeting is None:
        raise NotFoundException(resource="Meeting")
        
    # Manually delete related entities in strict order to avoid foreign key violations
    db.query(models.KnowledgeChunk).filter(models.KnowledgeChunk.meeting_id == meeting.id).delete()
    db.query(models.KnowledgeDocument).filter(models.KnowledgeDocument.meeting_id == meeting.id).delete()
    db.query(models.ExtractionCorrection).filter(models.ExtractionCorrection.meeting_id == meeting.id).delete()
    db.query(models.MeetingChatMessage).filter(models.MeetingChatMessage.meeting_id == meeting.id).delete()
    db.query(models.MeetingDecision).filter(models.MeetingDecision.meeting_id == meeting.id).delete()
    
    # Issue references TranscriptSegment, so delete Issue first
    db.query(models.Issue).filter(models.Issue.meeting_id == meeting.id).delete()
    
    # FollowUpTask and TranscriptSegment reference Topic, so delete them before Topic
    db.query(models.FollowUpTask).filter(models.FollowUpTask.meeting_id == meeting.id).delete()
    db.query(models.TranscriptSegment).filter(models.TranscriptSegment.meeting_id == meeting.id).delete()
    
    db.query(models.Topic).filter(models.Topic.meeting_id == meeting.id).delete()
    db.query(models.MeetingSummary).filter(models.MeetingSummary.meeting_id == meeting.id).delete()
    db.query(models.MeetingDocument).filter(models.MeetingDocument.meeting_id == meeting.id).delete()
    db.query(models.MeetingMember).filter(models.MeetingMember.meeting_id == meeting.id).delete()
    db.query(models.JiraProject).filter(models.JiraProject.meeting_id == meeting.id).delete()

    db.delete(meeting)
    db.commit()
    return MessageResponse(message="Meeting deleted successfully")


import uuid

import json

@router.get("/{meeting_id}/token", response_model=TokenResponse)
def get_meeting_token(
    meeting_id: str, 
    participant_name: str,
    language: str = "vi",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate a LiveKit access token for a meeting room."""
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException(resource="Meeting")
    if meeting.status == models.MeetingStatusEnum.COMPLETED:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Cuộc họp đã kết thúc. Không thể tham gia lại.")

    settings = get_settings()
    token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    unique_identity = f"user_{current_user.id}"
    token.with_identity(unique_identity)
    token.with_name(participant_name)
    token.with_metadata(json.dumps({"target_lang": language}))
    token.with_ttl(timedelta(hours=8))
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=f"meeting-{meeting_id}",
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            can_update_own_metadata=True,
        )
    )
    return TokenResponse(token=token.to_jwt())


from pydantic import BaseModel

class QuickTranslateRequest(BaseModel):
    text: str
    from_lang: str = "vi"
    to_lang: str = "en"

class QuickTranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    from_lang: str
    to_lang: str


@router.post("/translate", response_model=QuickTranslateResponse)
def translate_sentence(
    req: QuickTranslateRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    Sub-second bilingual translation using CTranslate2 INT8 models.
    Supports vi -> en (~100-180ms) and en -> vi (~100-180ms).
    """
    from src.backend import ct2_translator
    text = req.text.strip()
    if not text:
        return QuickTranslateResponse(
            original_text="",
            translated_text="",
            from_lang=req.from_lang,
            to_lang=req.to_lang
        )

    from_l = (req.from_lang or "vi").lower().split("-")[0]
    to_l = (req.to_lang or "en").lower().split("-")[0]

    translated = None
    if from_l == "vi" and to_l == "en":
        translated = ct2_translator.translate_vi_to_en(text)
    elif from_l == "en" and to_l == "vi":
        translated = ct2_translator.translate_en_to_vi(text)
    elif from_l == "vi":
        translated = ct2_translator.translate_vi_to_en(text)
    elif from_l == "en":
        translated = ct2_translator.translate_en_to_vi(text)
    else:
        translated = ct2_translator.translate_vi_to_en(text) or text

    return QuickTranslateResponse(
        original_text=text,
        translated_text=translated or text,
        from_lang=req.from_lang,
        to_lang=req.to_lang
    )

from typing import List

class TopicResponse(BaseModel):
    id: str
    meeting_id: str
    title: str
    transcript_text: str | None = None
    status: str
    order_index: int

    model_config = {"from_attributes": True}

@router.get("/{meeting_id}/topics", response_model=List[TopicResponse])
def get_meeting_topics(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List topics for a meeting."""
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException(resource="Meeting")
    topics = db.query(models.Topic).filter(models.Topic.meeting_id == meeting_id).order_by(models.Topic.order_index).all()
    return topics

from fastapi import BackgroundTasks

@router.post("/{meeting_id}/topics/next", response_model=MessageResponse)
def next_meeting_topic(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Advance the meeting to the next topic and trigger decision extraction for the completed topic."""
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException(resource="Meeting")
    if meeting.created_by_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only host can advance topics.")
    
    # Get all topics for the meeting sorted by order_index
    topics = db.query(models.Topic).filter(models.Topic.meeting_id == meeting_id).order_by(models.Topic.order_index).all()
    if not topics:
        return MessageResponse(message="No topics found for this meeting.")
    
    current_topic = None
    next_topic = None
    
    for i, topic in enumerate(topics):
        if topic.status == models.TopicStatusEnum.IN_PROGRESS:
            current_topic = topic
            if i + 1 < len(topics):
                next_topic = topics[i + 1]
            break
    
    # If no topic is IN_PROGRESS, maybe it's the start of the meeting. Find the first PENDING.
    if not current_topic:
        for topic in topics:
            if topic.status == models.TopicStatusEnum.PENDING:
                next_topic = topic
                break
    
    if current_topic:
        # Mark as completed
        current_topic.status = models.TopicStatusEnum.COMPLETED
        # Aggregate transcripts for this topic
        segments = db.query(models.TranscriptSegment).filter(
            models.TranscriptSegment.topic_id == current_topic.id
        ).order_by(models.TranscriptSegment.sequence).all()
        
        if segments:
            full_text = "\n".join([f"{seg.speaker.full_name if seg.speaker else 'Unknown'}: {seg.content}" for seg in segments])
            current_topic.transcript_text = full_text
        
        # Trigger AI extraction in background
        from src.backend.services.topic_extraction import extract_decisions_from_topic_bg
        background_tasks.add_task(extract_decisions_from_topic_bg, current_topic.id, current_topic.transcript_text)
    
    if next_topic:
        next_topic.status = models.TopicStatusEnum.IN_PROGRESS
    
    db.commit()
    return MessageResponse(message="Moved to next topic successfully.")
