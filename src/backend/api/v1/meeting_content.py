"""Meeting Content & AI API: Transcripts, Summaries, ActionItems, Chat."""

from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.api.v1.meetings_v2 import _get_meeting_or_404, _require_meeting_member
from src.backend.core.exceptions import NotFoundException
from src.backend.database import get_db
from src.backend.models import (
    ActionItem,
    ActionItemStatusEnum,
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


class ActionItemCreate(BaseModel):
    title: str
    description: str | None = None
    transcript_segment_id: str | None = None
    assignee_id: str | None = None


class ActionItemUpdate(BaseModel):
    title: str | None = None
    status: str | None = None


class ActionItemResponse(BaseModel):
    id: str
    meeting_id: str
    title: str
    status: str
    assignee_id: str | None = None
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
    _require_meeting_member(db, meeting_id, current_user.id)

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

    # Trigger micro-batching action item extraction
    count = db.query(TranscriptSegment).filter_by(meeting_id=meeting_id).count()
    if count > 0 and count % 5 == 0:
        from src.backend.services.action_item_extractor import extract_action_items

        def run_extraction():
            db_generator = get_db()
            bg_db = next(db_generator)
            try:
                extract_action_items(bg_db, meeting_id, current_user.id, micro_batch_limit=10)
            finally:
                bg_db.close()

        background_tasks.add_task(run_extraction)

    return seg


@router.get("/transcripts", response_model=list[TranscriptSegmentResponse])
def list_transcript_segments(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    return (
        db.query(TranscriptSegment)
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
# Action Item Endpoints
# ---------------------------------------------------------------------------
@router.post(
    "/action-items", response_model=ActionItemResponse, status_code=status.HTTP_201_CREATED
)
def create_action_item(
    meeting_id: str,
    payload: ActionItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    item = ActionItem(
        meeting_id=meeting_id,
        title=payload.title,
        description=payload.description,
        transcript_segment_id=payload.transcript_segment_id,
        assignee_id=payload.assignee_id or current_user.id,
        status=ActionItemStatusEnum.TODO,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/action-items", response_model=list[ActionItemResponse])
def list_action_items(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    return db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).all()


@router.patch("/action-items/{item_id}", response_model=ActionItemResponse)
def update_action_item(
    meeting_id: str,
    item_id: str,
    payload: ActionItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    item = (
        db.query(ActionItem)
        .filter(ActionItem.id == item_id, ActionItem.meeting_id == meeting_id)
        .first()
    )
    if not item:
        raise NotFoundException("Action item")

    if payload.title is not None:
        item.title = payload.title
    if payload.status is not None:
        item.status = ActionItemStatusEnum(payload.status)

    db.commit()
    db.refresh(item)
    return item


# ---------------------------------------------------------------------------
# AI Action Item Extraction
# ---------------------------------------------------------------------------
@router.post("/extract-action-items")
def extract_action_items_endpoint(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Manually trigger AI extraction of action items from meeting transcript."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    from src.backend.services.action_item_extractor import extract_action_items

    items = extract_action_items(db, meeting_id, triggered_by=current_user.id)
    return {"extracted_count": len(items), "items": items}


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
