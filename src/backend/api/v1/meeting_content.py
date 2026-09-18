"""Meeting Content & AI API: Transcripts, Summaries, FollowUpTasks, Chat."""

import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.api.v1.meetings_v2 import _get_meeting_or_404, _require_meeting_member
from src.backend.core.exceptions import NotFoundException
from src.backend.database import get_db
from src.backend.models import (
    CorrectionTypeEnum,
    ExtractionCorrection,
    FollowUpTask,
    FollowUpTaskStatusEnum,
    FollowUpTaskSourceEnum,
    MeetingChatMessage,
    MeetingDecision,
    MeetingDecisionStatusEnum,
    MeetingSummary,
    TranscriptSegment,
    User,
    Topic,
    TopicStatusEnum,
)

router = APIRouter(prefix="/meetings/{meeting_id}", tags=["meeting-content"])


# ---------------------------------------------------------------------------
# Schemas (co-located for simplicity — Phase 4 content is self-contained)
# ---------------------------------------------------------------------------
class TranscriptSegmentCreate(BaseModel):
    content: str
    start_time: str
    end_time: str
    sequence: int
    confidence: str | None = None


class TranscriptSegmentResponse(BaseModel):
    id: str
    meeting_id: str
    speaker_id: str | None = None
    speaker_name: str | None = None
    content: str
    start_time: str
    end_time: str
    sequence: int

    model_config = {"from_attributes": True}


class SummaryCreate(BaseModel):
    summary: str
    key_points: str | None = None
    decisions: str | None = None


class SummaryResponse(BaseModel):
    id: str
    meeting_id: str
    summary: str
    key_points: str | None = None
    decisions: str | None = None

    model_config = {"from_attributes": True}


class FollowUpTaskCreate(BaseModel):
    title: str
    description: str | None = None
    transcript_segment_id: str | None = None
    assignee_id: str | None = None
    deadline: datetime.datetime | None = None


class FollowUpTaskUpdate(BaseModel):
    title: str | None = None
    assignee_id: str | None = None
    deadline: datetime.datetime | None = None
    status: str | None = None


class FollowUpTaskResponse(BaseModel):
    id: str
    meeting_id: str
    topic_id: str | None = None
    title: str
    description: str | None = None
    status: str
    assignee_id: str | None = None
    assignee_name: str | None = None
    deadline: datetime.datetime | None = None
    source: str | None = None
    transcript_segment_id: str | None = None
    evidence_quote: str | None = None

    model_config = {"from_attributes": True}


class MeetingDecisionResponse(BaseModel):
    id: str
    meeting_id: str
    topic_id: str | None = None
    description: str
    status: str
    rationale: str | None = None
    evidence_sentence: str | None = None
    proposer_id: str | None = None
    proposer_name: str | None = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class MeetingDecisionUpdate(BaseModel):
    description: str | None = None
    status: str | None = None
    proposer_id: str | None = None


class TopicResponse(BaseModel):
    id: str
    meeting_id: str
    title: str
    transcript_text: str | None = None
    status: str
    order_index: int

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: str
    meeting_id: str
    user_id: str
    content: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Transcript Endpoints
# ---------------------------------------------------------------------------
async def _broadcast_to_livekit(meeting_id: str, participant_identity: str, text: str):
    import json
    import logging
    from livekit.api import LiveKitAPI
    from livekit.protocol.room import SendDataRequest
    from livekit.protocol.models import DataPacket
    from src.backend.core.config import get_settings

    logger = logging.getLogger("axiom.livekit_broadcast")
    settings = get_settings()

    url = settings.livekit_url
    if url.startswith("ws://"):
        url = url.replace("ws://", "http://")
    elif url.startswith("wss://"):
        url = url.replace("wss://", "https://")
        
    try:
        async with LiveKitAPI(url, settings.livekit_api_key, settings.livekit_api_secret) as api:
            payload = {
                "type": "original_transcript",
                "participant_identity": participant_identity,
                "original_text": text,
                "language": "vi",
                "is_final": True,
                "is_mock": True
            }
            req = SendDataRequest(
                room=meeting_id,
                data=json.dumps(payload).encode("utf-8"),
                kind=DataPacket.Kind.RELIABLE,
                topic="records"
            )
            await api.room.send_data(req)
            logger.info(f"Broadcasted mock transcript to {meeting_id}")
    except Exception as e:
        logger.error(f"Failed to broadcast mock transcript to LiveKit: {e}")

@router.post(
    "/transcripts", response_model=TranscriptSegmentResponse, status_code=status.HTTP_201_CREATED
)
def add_transcript_segment(
    meeting_id: str,
    payload: TranscriptSegmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)

    # Đang tạm tắt tính năng membership của cuộc họp để test
    # _require_meeting_member(db, meeting_id, current_user.id)

    from src.backend.models import MeetingMember, MeetingMemberRoleEnum, MeetingMemberStatusEnum
    
    # Auto-add user to meeting if they aren't a member (useful for test scripts bypassing join)
    member = db.query(MeetingMember).filter_by(meeting_id=meeting_id, user_id=current_user.id).first()
    if not member:
        new_member = MeetingMember(
            meeting_id=meeting_id,
            user_id=current_user.id,
            role=MeetingMemberRoleEnum.PARTICIPANT,
            status=MeetingMemberStatusEnum.JOINED
        )
        db.add(new_member)

    from src.backend.models import Topic, TopicStatusEnum
    current_topic = db.query(Topic).filter(
        Topic.meeting_id == meeting_id, 
        Topic.status == TopicStatusEnum.IN_PROGRESS
    ).first()

    seg = TranscriptSegment(
        meeting_id=meeting_id,
        topic_id=current_topic.id if current_topic else None,
        speaker_id=current_user.id,
        content=payload.content,
        start_time=payload.start_time,
        end_time=payload.end_time,
        sequence=payload.sequence,
        confidence=payload.confidence,
    )
    db.add(seg)
    db.commit()
    db.refresh(seg)

    # Removed micro-batching task extraction to prevent DB and AI overload.
    # Broadcast to LiveKit so mock scripts will show subtitles on UI
    background_tasks.add_task(
        _broadcast_to_livekit, 
        meeting_id, 
        current_user.full_name or current_user.email, 
        payload.content
    )

    # Đã gỡ bỏ tính năng trích xuất Real-time (micro-batching) theo yêu cầu thiết kế mới.
    # Trích xuất sẽ chỉ được thực hiện 1 lần duy nhất ở cuối mỗi Topic.

    return seg


@router.get("/transcripts", response_model=list[TranscriptSegmentResponse])
def list_transcript_segments(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    # _require_meeting_member(db, meeting_id, current_user.id)

    from sqlalchemy.orm import joinedload
    return (
        db.query(TranscriptSegment)
        .options(joinedload(TranscriptSegment.speaker))
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.created_at.asc(), TranscriptSegment.sequence.asc())
        .all()
    )


# ---------------------------------------------------------------------------
# Summary Endpoints
# ---------------------------------------------------------------------------
@router.post("/summary", response_model=SummaryResponse, status_code=status.HTTP_201_CREATED)
def create_summary(
    meeting_id: str,
    payload: SummaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    summary = MeetingSummary(
        meeting_id=meeting_id,
        summary=payload.summary,
        key_points=payload.key_points,
        decisions=payload.decisions,
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    summary = db.query(MeetingSummary).filter(MeetingSummary.meeting_id == meeting_id).first()
    if not summary:
        from src.backend.models import MeetingStatusEnum
        if meeting.status == MeetingStatusEnum.COMPLETED:
            summary = MeetingSummary(
                meeting_id=meeting_id,
                summary="Cuộc họp không có nội dung trao đổi hoặc hệ thống không thể tổng hợp.",
            )
            db.add(summary)
            db.commit()
            db.refresh(summary)
            return summary
        raise NotFoundException("Summary")
    return summary


# ---------------------------------------------------------------------------
# FollowUpTask Endpoints
# ---------------------------------------------------------------------------
@router.post(
    "/follow-up-tasks", response_model=FollowUpTaskResponse, status_code=status.HTTP_201_CREATED
)
def create_follow_up_task(
    meeting_id: str,
    payload: FollowUpTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    status_val = FollowUpTaskStatusEnum.CONFIRMED if payload.assignee_id else FollowUpTaskStatusEnum.NOT_CONFIRMED

    item = FollowUpTask(
        meeting_id=meeting_id,
        title=payload.title,
        description=payload.description,
        transcript_segment_id=payload.transcript_segment_id,
        assignee_id=payload.assignee_id,
        deadline=payload.deadline,
        status=status_val,
        source=FollowUpTaskSourceEnum.MANUAL,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/extract-tasks", response_model=list[FollowUpTaskResponse])
async def trigger_task_extraction(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    On-demand task extraction trigger.
    Extracts action items from all existing transcript segments of the meeting.
    """
    _get_meeting_or_404(db, meeting_id)

    from sqlalchemy.orm import joinedload
    from src.backend.services.punctuation_restorer import PunctuationRestorer
    from src.backend.services.task_extractor import (
        task_extractor_service, sync_extracted_tasks, query_pending_tasks,
    )
    from src.backend.models import FollowUpTaskSourceEnum
    from src.backend.services.meeting_events import meeting_events_manager

    segments = (
        db.query(TranscriptSegment)
        .options(joinedload(TranscriptSegment.speaker))
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.sequence.asc())
        .all()
    )
    if segments:
        restorer = PunctuationRestorer()
        text = restorer.restore(segments)
        if text:
            pending = query_pending_tasks(db, meeting_id)
            extracted = await task_extractor_service.extract(text, pending)
            if extracted:
                segment_ids = [s.id for s in segments]
                synced = sync_extracted_tasks(
                    db, meeting_id, extracted,
                    source=FollowUpTaskSourceEnum.AI_REALTIME,
                    segment_ids=segment_ids,
                )

                tasks_data = []
                for t in synced:
                    a_name = t.assignee_name
                    if not a_name and t.description and "Phân công cho:" in t.description:
                        a_name = t.description.split("Phân công cho:")[1].split("|")[0].strip()
                    tasks_data.append({
                        "id": t.id,
                        "meeting_id": t.meeting_id,
                        "title": t.title,
                        "description": t.description,
                        "status": t.status.value if t.status else "NOT_CONFIRMED",
                        "assignee_id": t.assignee_id,
                        "assignee_name": a_name,
                        "deadline": t.deadline.isoformat() if t.deadline else None,
                        "source": t.source.value if t.source else None,
                        "transcript_segment_id": t.transcript_segment_id,
                    })
                try:
                    await meeting_events_manager.broadcast(
                        meeting_id, {"type": "tasks_preview", "data": {"tasks": tasks_data}}
                    )
                except Exception:
                    pass

    # Return all tasks for this meeting
    all_tasks = (
        db.query(FollowUpTask)
        .options(joinedload(FollowUpTask.assignee))
        .filter(FollowUpTask.meeting_id == meeting_id)
        .order_by(FollowUpTask.created_at.asc())
        .all()
    )
    res = []
    for t in all_tasks:
        item = FollowUpTaskResponse.model_validate(t)
        if not item.assignee_name and t.description and "Phân công cho:" in t.description:
            item.assignee_name = t.description.split("Phân công cho:")[1].split("|")[0].strip()
        res.append(item)
    return res


@router.get("/follow-up-tasks", response_model=list[FollowUpTaskResponse])
def list_follow_up_tasks(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    # _require_meeting_member(db, meeting_id, current_user.id)

    from sqlalchemy.orm import joinedload
    tasks = (
        db.query(FollowUpTask)
        .options(joinedload(FollowUpTask.assignee))
        .filter(FollowUpTask.meeting_id == meeting_id)
        .order_by(FollowUpTask.created_at.asc())
        .all()
    )
    res = []
    for t in tasks:
        item = FollowUpTaskResponse.model_validate(t)
        if not item.assignee_name and t.description and "Phân công cho:" in t.description:
            item.assignee_name = t.description.split("Phân công cho:")[1].split("|")[0].strip()
        res.append(item)
    return res


@router.get("/decisions", response_model=list[MeetingDecisionResponse])
def list_decisions(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    from sqlalchemy.orm import joinedload
    return (
        db.query(MeetingDecision)
        .options(joinedload(MeetingDecision.proposer))
        .filter(MeetingDecision.meeting_id == meeting_id)
        .order_by(MeetingDecision.created_at)
        .all()
    )


@router.patch("/decisions/{decision_id}", response_model=MeetingDecisionResponse)
def update_decision(
    meeting_id: str,
    decision_id: str,
    payload: MeetingDecisionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    
    decision = (
        db.query(MeetingDecision)
        .filter(MeetingDecision.id == decision_id, MeetingDecision.meeting_id == meeting_id)
        .first()
    )
    if not decision:
        raise NotFoundException("Decision")
        
    if payload.description is not None:
        decision.description = payload.description
    if payload.status is not None:
        decision.status = MeetingDecisionStatusEnum(payload.status)
    if payload.proposer_id is not None:
        decision.proposer_id = payload.proposer_id
        
    db.commit()
    db.refresh(decision)
    return decision


@router.delete("/decisions/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_decision(
    meeting_id: str,
    decision_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Delete a meeting decision."""
    _get_meeting_or_404(db, meeting_id)

    decision = (
        db.query(MeetingDecision)
        .filter(MeetingDecision.id == decision_id, MeetingDecision.meeting_id == meeting_id)
        .first()
    )
    if not decision:
        raise NotFoundException("Decision")

    db.delete(decision)
    db.commit()
    return None


@router.patch("/follow-up-tasks/{item_id}", response_model=FollowUpTaskResponse)
def update_follow_up_task(
    meeting_id: str,
    item_id: str,
    payload: FollowUpTaskUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    # _require_meeting_member(db, meeting_id, current_user.id)

    item = (
        db.query(FollowUpTask)
        .filter(FollowUpTask.id == item_id, FollowUpTask.meeting_id == meeting_id)
        .first()
    )
    if not item:
        raise NotFoundException("Follow-up task")

    # ── Capture old values for RAG correction ──
    is_ai_task = item.source in (
        FollowUpTaskSourceEnum.AI_REALTIME, FollowUpTaskSourceEnum.AI_FULL,
    )
    old_snapshot = {
        "task": item.title,
        "assignee": item.assignee_name,
        "deadline": item.deadline.strftime("%Y-%m-%d") if item.deadline else None,
        "status": item.status.value if item.status else "NOT_CONFIRMED",
    } if is_ai_task else None

    if payload.title is not None:
        item.title = payload.title
    if payload.assignee_id is not None:
        item.assignee_id = payload.assignee_id
        item.status = FollowUpTaskStatusEnum.CONFIRMED
    if payload.deadline is not None:
        item.deadline = payload.deadline
    if payload.status is not None:
        item.status = FollowUpTaskStatusEnum(payload.status)

    db.commit()
    db.refresh(item)

    # ── RAG: Log correction if AI task was edited ──
    if is_ai_task and old_snapshot:
        new_snapshot = {
            "task": item.title,
            "assignee": item.assignee_name,
            "deadline": item.deadline.strftime("%Y-%m-%d") if item.deadline else None,
            "status": item.status.value if item.status else "NOT_CONFIRMED",
        }
        if old_snapshot != new_snapshot:
            background_tasks.add_task(
                _capture_correction,
                db, meeting_id, item.transcript_segment_id,
                [old_snapshot], [new_snapshot],
                CorrectionTypeEnum.TASK_EDITED,
            )

    return item


@router.delete("/follow-up-tasks/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_follow_up_task(
    meeting_id: str,
    item_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Delete a follow-up task. If AI-generated, captures a RAG correction."""
    _get_meeting_or_404(db, meeting_id)

    item = (
        db.query(FollowUpTask)
        .filter(FollowUpTask.id == item_id, FollowUpTask.meeting_id == meeting_id)
        .first()
    )
    if not item:
        raise NotFoundException("Follow-up task")

    is_ai_task = item.source in (
        FollowUpTaskSourceEnum.AI_REALTIME, FollowUpTaskSourceEnum.AI_FULL,
    )
    deleted_snapshot = {
        "task": item.title,
        "assignee": item.assignee_name,
        "deadline": item.deadline.strftime("%Y-%m-%d") if item.deadline else None,
        "status": item.status.value if item.status else "NOT_CONFIRMED",
    } if is_ai_task else None
    segment_id = item.transcript_segment_id

    db.delete(item)
    db.commit()

    # ── RAG: Log that user deleted an AI task (AI was wrong) ──
    if is_ai_task and deleted_snapshot:
        background_tasks.add_task(
            _capture_correction,
            db, meeting_id, segment_id,
            [deleted_snapshot], [],
            CorrectionTypeEnum.TASK_DELETED,
        )

    return None


# ---------------------------------------------------------------------------
# RAG Feedback — Correction Capture Helper
# ---------------------------------------------------------------------------
def _capture_correction(
    db: Session,
    meeting_id: str,
    segment_id: str | None,
    ai_output: list[dict],
    corrected_output: list[dict],
    correction_type: CorrectionTypeEnum,
):
    """Capture a user correction on AI-extracted tasks for RAG learning."""
    import json
    import logging

    _log = logging.getLogger("axiom.rag_corrections")

    # Get transcript snippet from the linked segment
    snippet = ""
    if segment_id:
        seg = db.query(TranscriptSegment).filter(TranscriptSegment.id == segment_id).first()
        if seg:
            snippet = seg.content or ""
    if not snippet:
        # Fallback: use the task title as context
        snippet = "; ".join(t.get("task", "") for t in ai_output)

    if not snippet:
        _log.warning("Cannot capture correction: no transcript snippet available")
        return

    # Embed the snippet for similarity search
    embedding_json_str = None
    try:
        from src.backend.services.embedding_service import embedding_service
        vector = embedding_service.embed(snippet)
        if vector:
            embedding_json_str = json.dumps(vector)
    except Exception as e:
        _log.warning("Embedding failed for correction, saving without vector: %s", e)

    correction = ExtractionCorrection(
        meeting_id=meeting_id,
        transcript_snippet=snippet,
        ai_output_json=json.dumps(ai_output, ensure_ascii=False),
        corrected_output_json=json.dumps(corrected_output, ensure_ascii=False),
        correction_type=correction_type,
        embedding_json=embedding_json_str,
    )
    db.add(correction)
    db.commit()
    _log.info(
        "Captured RAG correction: type=%s, meeting=%s, snippet='%s...'",
        correction_type.value, meeting_id, snippet[:60],
    )


# ---------------------------------------------------------------------------
# AI Task Extraction
# ---------------------------------------------------------------------------
@router.post("/extract-tasks")
@router.get("/topics", response_model=list[TopicResponse])
def get_meeting_topics(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List topics for a meeting."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting.id, current_user.id)

    topics = db.query(Topic).filter(Topic.meeting_id == meeting_id).order_by(Topic.order_index).all()
    return topics


@router.post("/topics/next", response_model=MessageResponse)
def next_meeting_topic(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Advance to the next topic and trigger decision extraction for the completed topic."""
    from fastapi import HTTPException
    from src.backend.services.unified_topic_extractor import extract_topic_unified_bg
    from src.backend.models import MeetingMember, MeetingMemberRoleEnum

    meeting = _get_meeting_or_404(db, meeting_id)
    # member = _require_meeting_member(db, meeting.id, current_user.id)
    
    # Allow any member to advance topics for testing purposes
    # if not member or member.role not in [MeetingMemberRoleEnum.OWNER, MeetingMemberRoleEnum.ADMIN]:
    #     raise HTTPException(status_code=403, detail="Not authorized to change topic")s.")

    topics = db.query(Topic).filter(Topic.meeting_id == meeting_id).order_by(Topic.order_index).all()
    if not topics:
        return MessageResponse(message="No topics found for this meeting.")

    in_progress_idx = -1
    for i, topic in enumerate(topics):
        if topic.status == TopicStatusEnum.IN_PROGRESS:
            in_progress_idx = i
            break

    if in_progress_idx != -1:
        # Complete current topic
        current_topic = topics[in_progress_idx]
        current_topic.status = TopicStatusEnum.COMPLETED
        
        # Lấy toàn bộ segment của topic này và gộp lại thành văn bản
        segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.topic_id == current_topic.id
        ).order_by(TranscriptSegment.sequence).all()
        
        if segments:
            full_text = "\n".join([f"{seg.speaker.full_name if getattr(seg, 'speaker', None) else 'Unknown'}: {seg.content}" for seg in segments])
            current_topic.transcript_text = full_text
            
        background_tasks.add_task(extract_topic_unified_bg, current_topic.id, current_topic.transcript_text or "")
        
        # Start next topic if available
        if in_progress_idx + 1 < len(topics):
            next_topic = topics[in_progress_idx + 1]
            next_topic.status = TopicStatusEnum.IN_PROGRESS
    else:
        # No topic is currently in progress. Start the first pending topic.
        for topic in topics:
            if topic.status == TopicStatusEnum.PENDING:
                topic.status = TopicStatusEnum.IN_PROGRESS
                break

    db.commit()
    return MessageResponse(message="Advanced to next topic")


@router.post("/extract-tasks")
async def extract_tasks_endpoint(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Manually trigger AI extraction of follow-up tasks from full meeting transcript."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    from src.backend.services.task_extractor import (
        task_extractor_service, sync_extracted_tasks, query_pending_tasks,
    )
    from src.backend.services.punctuation_restorer import PunctuationRestorer

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.sequence)
        .all()
    )
    if not segments:
        return {"extracted_count": 0, "items": []}

    restorer = PunctuationRestorer()
    text = restorer.restore(segments)
    if not text:
        return {"extracted_count": 0, "items": []}

    pending = query_pending_tasks(db, meeting_id)
    extracted = await task_extractor_service.extract(text, pending)
    if extracted:
        sync_extracted_tasks(
            db, meeting_id, extracted,
            source=FollowUpTaskSourceEnum.AI_FULL,
            segment_ids=[s.id for s in segments],
        )

    tasks = db.query(FollowUpTask).filter(FollowUpTask.meeting_id == meeting_id).all()
    return {"extracted_count": len(extracted) if extracted else 0, "items": tasks}


# ---------------------------------------------------------------------------
# Chat Endpoints
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_chat_message(
    meeting_id: str,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    msg = MeetingChatMessage(
        meeting_id=meeting_id,
        user_id=current_user.id,
        content=payload.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.get("/chat", response_model=list[ChatMessageResponse])
def list_chat_messages(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    return (
        db.query(MeetingChatMessage)
        .filter(MeetingChatMessage.meeting_id == meeting_id)
        .order_by(MeetingChatMessage.created_at)
        .all()
    )
