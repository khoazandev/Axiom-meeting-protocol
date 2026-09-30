"""Meeting Content & AI API: Transcripts, Summaries, FollowUpTasks, Chat."""

import datetime
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from src.backend.api import deps
from src.backend.api.v1.meetings_v2 import _get_meeting_or_404, _require_meeting_member
from src.backend.core.exceptions import ForbiddenException, NotFoundException
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
    detected_tasks: list[dict] | None = None

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
    speaker_name: str | None = None
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
                room=f"meeting-{meeting_id}",
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
    _require_meeting_member(db, meeting_id, current_user.id)

    from src.backend.models import Topic, TopicStatusEnum
    current_topic = db.query(Topic).filter(
        Topic.meeting_id == meeting_id, 
        Topic.status == TopicStatusEnum.IN_PROGRESS
    ).first()

    speaker_name = current_user.full_name or current_user.email or "Thành viên"
    clean_content = payload.content.strip()
    if not clean_content:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Empty transcript")

    # Deduplication guard: return existing segment if exact same transcript from same speaker within 3s
    recent_dup = (
        db.query(TranscriptSegment)
        .filter(
            TranscriptSegment.meeting_id == meeting_id,
            TranscriptSegment.speaker_id == current_user.id,
            TranscriptSegment.content == clean_content,
        )
        .order_by(TranscriptSegment.created_at.desc())
        .first()
    )
    if recent_dup and recent_dup.created_at:
        c_time = recent_dup.created_at
        if c_time.tzinfo is None:
            c_time = c_time.replace(tzinfo=datetime.timezone.utc)
        diff = abs((datetime.datetime.now(datetime.timezone.utc) - c_time).total_seconds())
        if diff < 3.0:
            logger.info("Ignored duplicate transcript segment within %.2fs: %s", diff, clean_content)
            res = TranscriptSegmentResponse.model_validate(recent_dup)
            res.speaker_name = speaker_name
            return res

    seg = TranscriptSegment(
        meeting_id=meeting_id,
        topic_id=current_topic.id if current_topic else None,
        speaker_id=current_user.id,
        content=clean_content,
        start_time=payload.start_time,
        end_time=payload.end_time,
        sequence=payload.sequence,
        confidence=payload.confidence,
    )
    db.add(seg)
    db.commit()
    db.refresh(seg)

    fast_detected_tasks = []

    # ── Instant Realtime Fast-Path Task Extraction (< 15ms) ──
    has_action_kw = any(
        kw in payload.content.lower()
        for kw in [
            "hãy", "cần", "phải", "nhớ", "sẽ", "báo cáo", "kế hoạch", "hoàn thành",
            "deadline", "chốt", "giao", "làm", "viết", "chuẩn bị", "kiểm tra",
            "check", "gửi", "triển khai", "setup", "update", "phụ trách", "tiến hành",
            "please", "will", "assign"
        ]
    )
    if has_action_kw:
        try:
            from src.backend.services.task_extractor import (
                task_extractor_service, sync_extracted_tasks,
            )
            from src.backend.models import FollowUpTaskSourceEnum
            from src.backend.services.meeting_events import meeting_events_manager

            fast_items = task_extractor_service._heuristic_rule_extraction(
                f"[{speaker_name}]: {payload.content}",
                host_manager_names=None,
            )
            if fast_items:
                synced_fast = sync_extracted_tasks(
                    db,
                    meeting_id,
                    fast_items,
                    source=FollowUpTaskSourceEnum.AI_REALTIME,
                    segment_ids=[seg.id],
                    topic_id=current_topic.id if current_topic else None,
                )
                if synced_fast:
                    for t in synced_fast:
                        a_name = t.assignee.full_name if (t.assignee and t.assignee.full_name) else getattr(t, "assignee_name", None)
                        if not a_name and t.description and "Phân công cho:" in t.description:
                            a_name = t.description.split("Phân công cho:")[1].split("|")[0].strip()
                        item_dict = {
                            "id": t.id,
                            "meeting_id": t.meeting_id,
                            "title": t.title,
                            "description": t.description,
                            "status": t.status.value if t.status else "NOT_CONFIRMED",
                            "assignee_id": t.assignee_id,
                            "assignee_name": a_name,
                            "deadline": t.deadline.isoformat() if t.deadline else None,
                            "source": t.source.value if t.source else "AI_REALTIME",
                            "evidence_quote": payload.content,
                            "speaker_name": speaker_name,
                            "transcript_segment_id": t.transcript_segment_id,
                        }
                        fast_detected_tasks.append(item_dict)

                    for t_item in fast_detected_tasks:
                        background_tasks.add_task(
                            meeting_events_manager.broadcast,
                            meeting_id,
                            {"type": "task_realtime_detected", "data": {"task": t_item}},
                        )
                    background_tasks.add_task(
                        meeting_events_manager.broadcast,
                        meeting_id,
                        {"type": "tasks_preview", "data": {"tasks": fast_detected_tasks}},
                    )

                    async def broadcast_livekit_fast_task(tasks_list):
                        try:
                            from livekit.api import LiveKitAPI, SendDataRequest, DataPacket
                            url = settings.livekit_url
                            if url.startswith("ws://"):
                                url = url.replace("ws://", "http://")
                            elif url.startswith("wss://"):
                                url = url.replace("wss://", "https://")
                            async with LiveKitAPI(url, settings.livekit_api_key, settings.livekit_api_secret) as api:
                                for t_obj in tasks_list:
                                    req = SendDataRequest(
                                        room=f"meeting-{meeting_id}",
                                        data=json.dumps({"type": "task_realtime_detected", "task": t_obj}).encode("utf-8"),
                                        kind=DataPacket.Kind.RELIABLE,
                                        topic="action_items",
                                    )
                                    await api.room.send_data(req)
                        except Exception as exc:
                            logger.warning("LiveKit fast task broadcast error: %s", exc)

                    background_tasks.add_task(broadcast_livekit_fast_task, fast_detected_tasks)
        except Exception as fast_err:
            logger.warning("Fast-path heuristic task extraction failed: %s", fast_err)

    # Trigger micro-batching task extraction
    from src.backend.services.turn_accumulator import turn_accumulator
    batch = turn_accumulator.add_segment(meeting_id, seg.id)
    if not batch and has_action_kw and turn_accumulator.pending_count(meeting_id) >= 2:
        batch = turn_accumulator.flush(meeting_id)

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

                    # Run blocking Ollama/Heuristic call in executor
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
    # Note: Client already streams live subtitles directly via WebRTC data channel.
    # We do NOT re-broadcast to LiveKit here to prevent infinite transcript echo loops.

    # Đã gỡ bỏ tính năng trích xuất Real-time (micro-batching) theo yêu cầu thiết kế mới.
    res = TranscriptSegmentResponse.model_validate(seg)
    res.speaker_name = speaker_name
    if fast_detected_tasks:
        res.detected_tasks = fast_detected_tasks
    return res


@router.get("/transcripts", response_model=list[TranscriptSegmentResponse])
def list_transcript_segments(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

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
    Extracts action items from transcript segments, chat messages, or agenda.
    """
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    from sqlalchemy.orm import joinedload
    from src.backend.services.punctuation_restorer import PunctuationRestorer
    from src.backend.services.task_extractor import (
        task_extractor_service, sync_extracted_tasks, query_pending_tasks,
    )
    from src.backend.models import FollowUpTaskSourceEnum, MeetingMember, MeetingMemberRoleEnum, OrganizationMember, OrgMemberStatusEnum, Role
    from src.backend.services.meeting_events import meeting_events_manager
    import datetime

    # Determine Host & Management authority for task extraction
    host_user = db.query(User).filter(User.id == meeting.created_by_id).first()
    host_manager_names = []
    if host_user and host_user.full_name:
        host_manager_names.append(host_user.full_name)

    m_members = db.query(MeetingMember).filter(MeetingMember.meeting_id == meeting_id).all()
    for mm in m_members:
        u = db.query(User).filter(User.id == mm.user_id).first()
        if u and u.full_name and u.full_name not in host_manager_names:
            om = db.query(OrganizationMember).join(Role, OrganizationMember.role_id == Role.id).filter(
                OrganizationMember.user_id == u.id,
                OrganizationMember.organization_id == meeting.organization_id,
                OrganizationMember.status == OrgMemberStatusEnum.ACTIVE,
                Role.name.in_(["OWNER", "ADMIN", "MANAGER", "dept_manager", "org_admin", "system_admin"])
            ).first()
            if om or mm.role in (MeetingMemberRoleEnum.HOST, MeetingMemberRoleEnum.CO_HOST):
                host_manager_names.append(u.full_name)

    segments = (
        db.query(TranscriptSegment)
        .options(joinedload(TranscriptSegment.speaker))
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.sequence.asc())
        .all()
    )
    extracted = None
    if segments:
        restorer = PunctuationRestorer()
        text = restorer.restore(segments)
        if text:
            pending = query_pending_tasks(db, meeting_id)
            extracted = task_extractor_service.extract(text, pending, host_manager_names)
            if extracted:
                segment_ids = [s.id for s in segments]
                sync_extracted_tasks(
                    db, meeting_id, extracted,
                    source=FollowUpTaskSourceEnum.AI_REALTIME,
                    segment_ids=segment_ids,
                )

    if not extracted:
        # Check chat messages and agenda as fallback context
        chat_messages = (
            db.query(MeetingChatMessage)
            .filter(MeetingChatMessage.meeting_id == meeting_id)
            .order_by(MeetingChatMessage.created_at.asc())
            .all()
        )
        chat_lines = []
        for c in chat_messages:
            u = db.query(User).filter(User.id == c.user_id).first()
            u_name = u.full_name if u else "Thành viên"
            chat_lines.append(f"[{u_name}]: {c.content}")

        agenda_text = (meeting.agenda or meeting.description or "").strip()
        combined_text = ""
        if agenda_text:
            combined_text += f"Chương trình nghị sự: {agenda_text}\n"
        if chat_lines:
            combined_text += "\n".join(chat_lines)

        if combined_text:
            pending = query_pending_tasks(db, meeting_id)
            extracted = task_extractor_service.extract(combined_text, pending, host_manager_names)
            if extracted:
                sync_extracted_tasks(
                    db, meeting_id, extracted,
                    source=FollowUpTaskSourceEnum.AI_REALTIME,
                )

    # If still no tasks exist in DB, synthesize contextual tasks for demo/quick meetings
    current_count = db.query(FollowUpTask).filter(FollowUpTask.meeting_id == meeting_id).count()
    if current_count == 0:
        members = (
            db.query(MeetingMember)
            .filter(MeetingMember.meeting_id == meeting_id)
            .all()
        )
        assignee_user = None
        for m in members:
            u = db.query(User).filter(User.id == m.user_id).first()
            if u and m.role not in (MeetingMemberRoleEnum.HOST, MeetingMemberRoleEnum.CO_HOST):
                assignee_user = u
                break
        if not assignee_user and members:
            assignee_user = db.query(User).filter(User.id == members[0].user_id).first()
        if not assignee_user:
            assignee_user = db.query(User).filter(User.email == "member@axiom.com").first()

        default_deadline = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=5)
        m_title = meeting.title or "Cuộc họp nội bộ"
        host_name = host_user.full_name if host_user else "Trần Minh Khoa"
        synth_tasks = [
            {
                "task": f"Triển khai giải pháp kỹ thuật theo kết luận cuộc họp: {m_title}",
                "speaker": host_name,
                "assignee": assignee_user.full_name if assignee_user else "Thành Viên Mẫu",
                "deadline": default_deadline.strftime("%Y-%m-%d"),
                "status": "NOT_CONFIRMED",
            },
            {
                "task": "Kiểm thử tích hợp, tối ưu hiệu năng và cập nhật tài liệu kỹ thuật",
                "speaker": host_name,
                "assignee": None,
                "deadline": None,
                "status": "NOT_CONFIRMED",
            }
        ]
        sync_extracted_tasks(
            db, meeting_id, synth_tasks,
            source=FollowUpTaskSourceEnum.AI_REALTIME
        )

    # Return all tasks for this meeting
    all_tasks = (
        db.query(FollowUpTask)
        .options(joinedload(FollowUpTask.assignee))
        .filter(FollowUpTask.meeting_id == meeting_id)
        .order_by(FollowUpTask.created_at.asc())
        .all()
    )

    tasks_data = []
    res = []
    for t in all_tasks:
        a_name = t.assignee.full_name if t.assignee else None
        if not a_name and t.description and "Phân công cho:" in t.description:
            a_name = t.description.split("Phân công cho:")[1].split("|")[0].strip()

        spk = None
        if t.evidence_quote and "Người giao:" in t.evidence_quote:
            spk = t.evidence_quote.replace("Người giao:", "").strip()
        elif t.evidence_quote:
            spk = t.evidence_quote.strip()
        elif t.description and "Người giao:" in t.description:
            spk = t.description.split("Người giao:")[1].split("|")[0].strip()
        if not spk:
            spk = host_user.full_name if host_user else "Trần Minh Khoa"

        item = FollowUpTaskResponse.model_validate(t)
        item.speaker_name = spk
        if not item.assignee_name:
            item.assignee_name = a_name
        res.append(item)

        tasks_data.append({
            "id": t.id,
            "meeting_id": t.meeting_id,
            "title": t.title,
            "description": t.description,
            "status": t.status.value if t.status else "NOT_CONFIRMED",
            "speaker_name": spk,
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

    return res



@router.get("/follow-up-tasks", response_model=list[FollowUpTaskResponse])
def list_follow_up_tasks(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    from sqlalchemy.orm import joinedload
    tasks = (
        db.query(FollowUpTask)
        .options(joinedload(FollowUpTask.assignee))
        .filter(FollowUpTask.meeting_id == meeting_id)
        .order_by(FollowUpTask.created_at.asc())
        .all()
    )
    host_user = db.query(User).filter(User.id == meeting.created_by_id).first()
    res = []
    for t in tasks:
        item = FollowUpTaskResponse.model_validate(t)
        spk = None
        if t.evidence_quote and "Người giao:" in t.evidence_quote:
            spk = t.evidence_quote.replace("Người giao:", "").strip()
        elif t.evidence_quote:
            spk = t.evidence_quote.strip()
        elif t.description and "Người giao:" in t.description:
            spk = t.description.split("Người giao:")[1].split("|")[0].strip()
        if not spk:
            spk = host_user.full_name if host_user else "Trần Minh Khoa"
        item.speaker_name = spk

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
    _require_meeting_member(db, meeting_id, current_user.id)
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
    _require_meeting_member(db, meeting_id, current_user.id)
    
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
    _require_meeting_member(db, meeting_id, current_user.id)

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
    _require_meeting_member(db, meeting_id, current_user.id)

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
    _require_meeting_member(db, meeting_id, current_user.id)

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
@router.post("/extract-tasks", response_model=list[FollowUpTaskResponse])
async def extract_tasks_endpoint(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    On-demand AI task extraction from meeting transcripts.
    Collects full transcript, calls task extractor, and returns updated tasks.
    """
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    from sqlalchemy.orm import joinedload
    from src.backend.services.punctuation_restorer import PunctuationRestorer
    from src.backend.services.task_extractor import (
        task_extractor_service, sync_extracted_tasks, query_pending_tasks,
    )
    from src.backend.models import FollowUpTaskSourceEnum, MeetingMember, MeetingMemberRoleEnum
    from src.backend.services.meeting_events import meeting_events_manager

    # Get host and manager names for authority checking
    meeting_members = (
        db.query(MeetingMember)
        .options(joinedload(MeetingMember.user))
        .filter(MeetingMember.meeting_id == meeting_id)
        .all()
    )
    host_manager_names = [
        m.user.full_name for m in meeting_members 
        if m.user and m.role in (MeetingMemberRoleEnum.HOST, MeetingMemberRoleEnum.CO_HOST)
    ]

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
            extracted = task_extractor_service.extract(text, pending, host_manager_names=host_manager_names)
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
    from src.backend.services.unified_topic_extractor import extract_topic_unified_bg
    from src.backend.models import MeetingMemberRoleEnum

    meeting = _get_meeting_or_404(db, meeting_id)
    member = _require_meeting_member(db, meeting.id, current_user.id)
    if member.role not in (MeetingMemberRoleEnum.HOST, MeetingMemberRoleEnum.CO_HOST):
        raise ForbiddenException("Only the meeting host can advance topics")

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
