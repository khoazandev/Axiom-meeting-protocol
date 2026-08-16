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
    MeetingSummary,
    TranscriptSegment,
    User,
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
    title: str
    description: str | None = None
    status: str
    assignee_id: str | None = None
    assignee_name: str | None = None
    deadline: datetime.datetime | None = None
    source: str | None = None
    transcript_segment_id: str | None = None

    model_config = {"from_attributes": True}


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

    seg = TranscriptSegment(
        meeting_id=meeting_id,
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

    # Trigger micro-batching task extraction
    from src.backend.services.turn_accumulator import turn_accumulator
    batch = turn_accumulator.add_segment(meeting_id, seg.id)
    if batch:
        from src.backend.services.task_extractor import (
            task_extractor_service, sync_extracted_tasks, query_pending_tasks,
        )
        from src.backend.services.punctuation_restorer import PunctuationRestorer
        from src.backend.models import FollowUpTaskSourceEnum

        async def run_extraction():
            import logging
            _log = logging.getLogger("axiom.extraction")
            _log.setLevel(logging.INFO)
            _log.info("Batch ready for meeting=%s, segments=%s", meeting_id, batch)

            # Broadcast "extracting" status to frontend
            from src.backend.services.meeting_events import meeting_events_manager
            try:
                await meeting_events_manager.broadcast(
                    meeting_id, {"type": "tasks_extracting", "data": {"status": "started"}}
                )
            except Exception:
                _log.debug("Could not broadcast extraction start event")

            db_generator = get_db()
            bg_db = next(db_generator)
            from sqlalchemy.orm import joinedload
            try:
                # Load transcript segments with speaker info
                batch_segments = (
                    bg_db.query(TranscriptSegment)
                    .options(joinedload(TranscriptSegment.speaker))
                    .filter(TranscriptSegment.id.in_(batch))
                    .order_by(TranscriptSegment.sequence)
                    .all()
                )
                _log.info("Loaded %d segments for extraction", len(batch_segments))
                restorer = PunctuationRestorer()
                text = restorer.restore(batch_segments)
                _log.info("Restored text (%d chars): %s", len(text) if text else 0, (text or "")[:200])
                if text:
                    # Query pending tasks from DB
                    pending = query_pending_tasks(bg_db, meeting_id)
                    _log.info("Pending tasks for context: %d", len(pending))

                    # Run blocking Ollama call in executor
                    import asyncio
                    loop = asyncio.get_running_loop()
                    extracted = await loop.run_in_executor(
                        None, task_extractor_service.extract, text, pending
                    )
                    _log.info("Extracted %d tasks: %s", len(extracted), extracted)
                    if extracted:
                        synced = sync_extracted_tasks(
                            bg_db, meeting_id, extracted,
                            source=FollowUpTaskSourceEnum.AI_REALTIME,
                            segment_ids=batch,
                        )
                        _log.info("Synced %d follow-up tasks to DB", len(extracted))

                        # Broadcast tasks_preview so frontend shows them immediately
                        if synced:
                            tasks_data = []
                            for t in synced:
                                tasks_data.append({
                                    "id": t.id,
                                    "meeting_id": t.meeting_id,
                                    "title": t.title,
                                    "description": t.description,
                                    "status": t.status.value if t.status else "NOT_CONFIRMED",
                                    "assignee_id": t.assignee_id,
                                    "assignee_name": t.assignee_name,
                                    "deadline": t.deadline.isoformat() if t.deadline else None,
                                    "source": t.source.value if t.source else None,
                                    "transcript_segment_id": t.transcript_segment_id,
                                })
                            try:
                                await meeting_events_manager.broadcast(
                                    meeting_id, {"type": "tasks_preview", "data": {"tasks": tasks_data}}
                                )
                                _log.info("Broadcast tasks_preview with %d tasks", len(tasks_data))
                            except Exception:
                                _log.debug("Could not broadcast tasks_preview event")
                else:
                    _log.warning("Restored text is empty, skipping extraction")
            except Exception as exc:
                _log.error("Extraction background task failed: %s", exc, exc_info=True)
            finally:
                bg_db.close()
                # Broadcast "done" status to frontend
                try:
                    await meeting_events_manager.broadcast(
                        meeting_id, {"type": "tasks_extracting", "data": {"status": "done"}}
                    )
                except Exception:
                    _log.debug("Could not broadcast extraction done event")

        background_tasks.add_task(run_extraction)

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
        .order_by(TranscriptSegment.sequence)
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
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    summary = db.query(MeetingSummary).filter(MeetingSummary.meeting_id == meeting_id).first()
    if not summary:
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


@router.get("/follow-up-tasks", response_model=list[FollowUpTaskResponse])
def list_follow_up_tasks(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    # _require_meeting_member(db, meeting_id, current_user.id)

    from sqlalchemy.orm import joinedload
    return (
        db.query(FollowUpTask)
        .options(joinedload(FollowUpTask.assignee))
        .filter(FollowUpTask.meeting_id == meeting_id)
        .all()
    )


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
def extract_tasks_endpoint(
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
    extracted = task_extractor_service.extract(text, pending)
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
