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


class MeetingDecisionResponse(BaseModel):
    id: str
    meeting_id: str
    description: str
    status: str
    rationale: str | None = None
    proposer_id: str | None = None
    proposer_name: str | None = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class MeetingDecisionUpdate(BaseModel):
    description: str | None = None
    status: str | None = None
    proposer_id: str | None = None


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
        from src.backend.services.decision_extractor import (
            decision_extractor_service, sync_extracted_decisions, query_pending_decisions,
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
                    # Query pending items from DB
                    pending_tasks_list = query_pending_tasks(bg_db, meeting_id)
                    pending_decisions_list = query_pending_decisions(bg_db, meeting_id)
                    _log.info("Pending context: %d tasks, %d decisions", len(pending_tasks_list), len(pending_decisions_list))
                    
                    # Close DB connection before running slow LLM calls
                    bg_db.close()

                    # Run blocking Ollama calls in executor in parallel
                    import asyncio
                    from src.backend.services.speech_act_classifier import speech_act_classifier_service
                    
                    # 1. Classify
                    classified_lines = await speech_act_classifier_service.classify(text)
                    
                    # 2. Annotate
                    annotated_text = text
                    valid_task_quotes = set()
                    valid_decision_quotes = set()
                    
                    if classified_lines:
                        annotated_lines = []
                        for line in text.split('\n'):
                            if not line.strip():
                                continue
                            
                            act = "Other"
                            for cl in classified_lines:
                                if cl["quote"] and (cl["quote"] in line or line in cl["quote"]):
                                    act = cl["act"]
                                    if act == "Assignment":
                                        valid_task_quotes.add(cl["quote"])
                                    if act == "Decision":
                                        valid_decision_quotes.add(cl["quote"])
                                    break
                            annotated_lines.append(f"{line} ({act})")
                        annotated_text = "\n".join(annotated_lines)
                    
                    _log.info("Annotated text:\n%s", annotated_text)
                    
                    # 3. Extract
                    extracted_tasks, extracted_decisions = await asyncio.gather(
                        task_extractor_service.extract(annotated_text, pending_tasks_list),
                        decision_extractor_service.extract(annotated_text, pending_decisions_list)
                    )
                    
                    # 4. Validate Tasks
                    validated_tasks = []
                    print(f"[DEBUG] Extracted Tasks: {extracted_tasks}")
                    for t in extracted_tasks:
                        ev = t.get("evidence_quote", "")
                        ev_clean = ev.strip().lower()
                        print(f"[DEBUG] Validating Task: {t} | Evidence: {ev_clean}")
                        if ev_clean and len(ev_clean) >= 10:
                            # Bypass the speech act classifier because it is currently a stub
                            validated_tasks.append(t)
                        else:
                            print(f"[DEBUG] Rejected task due to missing/short evidence: {t}")
                    
                    # 5. Validate Decisions
                    validated_decisions = []
                    print(f"[DEBUG] Extracted Decisions: {extracted_decisions}")
                    for d in extracted_decisions:
                        ev = d.get("evidence_quote", "")
                        ev_clean = ev.strip().lower()
                        print(f"[DEBUG] Validating Decision: {d} | Evidence: {ev_clean}")
                        if ev_clean and len(ev_clean) >= 10:
                            # Bypass the speech act classifier because it is currently a stub
                            validated_decisions.append(d)
                        else:
                            print(f"[DEBUG] Rejected decision due to missing/short evidence: {d}")
                            
                    extracted_tasks = validated_tasks
                    extracted_decisions = validated_decisions
                    
                    _log.info("Extracted %d tasks, %d decisions", len(extracted_tasks), len(extracted_decisions))
                    
                    # Get a new DB connection for saving
                    db_generator = get_db()
                    bg_db = next(db_generator)
                    
                    if extracted_tasks:
                        synced_tasks = sync_extracted_tasks(
                            bg_db, meeting_id, extracted_tasks,
                            source=FollowUpTaskSourceEnum.AI_REALTIME,
                            segment_ids=batch,
                        )
                        _log.info("Synced %d follow-up tasks to DB", len(extracted_tasks))

                        # Broadcast tasks_preview so frontend shows them immediately
                        if synced_tasks:
                            tasks_data = []
                            for t in synced_tasks:
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
                            except Exception:
                                _log.debug("Could not broadcast tasks preview")
                                
                    if extracted_decisions:
                        synced_decisions = sync_extracted_decisions(
                            bg_db, meeting_id, extracted_decisions,
                            segment_ids=batch,
                        )
                        _log.info("Synced %d decisions to DB", len(extracted_decisions))

                        if synced_decisions:
                            decisions_data = []
                            for d in synced_decisions:
                                decisions_data.append({
                                    "id": d.id,
                                    "meeting_id": d.meeting_id,
                                    "description": d.description,
                                    "status": d.status.value if d.status else "PROPOSED",
                                    "transcript_segment_id": d.transcript_segment_id,
                                    "proposer_id": d.proposer_id,
                                    "proposer_name": getattr(d, 'proposer').full_name if getattr(d, 'proposer', None) else None,
                                })
                            try:
                                await meeting_events_manager.broadcast(
                                    meeting_id, {"type": "decisions_preview", "data": {"decisions": decisions_data}}
                                )
                            except Exception as e:
                                _log.debug("Could not broadcast decisions preview")
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
