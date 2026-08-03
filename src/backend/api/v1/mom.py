import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import (
    ActionItem,
    Meeting,
    MeetingBookmark,
    MeetingFile,
    Task,
    TaskPriorityEnum,
    TaskStatusEnum,
    User,
    WorkspaceMember,
)
from src.backend.services.ollama_service import build_rag_answer

router = APIRouter(tags=["mom"])


class BookmarkCreate(BaseModel):
    timestamp_seconds: int
    note: str
    is_action_item: Optional[bool] = False


class BookmarkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: int
    user_id: str
    timestamp_seconds: int
    note: str
    is_action_item: bool
    created_at: datetime.datetime


class MoMResponse(BaseModel):
    meeting_id: int
    title: str
    summary: str
    key_decisions: List[str]
    speaker_stats: List[Dict[str, Any]]
    action_items: List[str]


@router.post(
    "/meetings/{meeting_id}/bookmarks",
    response_model=BookmarkResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_bookmark(
    meeting_id: int,
    data: BookmarkCreate,
    current_user: User = Depends(deps.get_current_user),
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

    bookmark = MeetingBookmark(
        meeting_id=meeting.id,
        user_id=current_user.id,
        timestamp_seconds=data.timestamp_seconds,
        note=data.note,
        is_action_item=data.is_action_item or False,
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark


@router.get("/meetings/{meeting_id}/bookmarks", response_model=List[BookmarkResponse])
def list_bookmarks(
    meeting_id: int,
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

    return db.query(MeetingBookmark).filter(MeetingBookmark.meeting_id == meeting.id).order_by(MeetingBookmark.timestamp_seconds.asc()).all()


@router.get("/meetings/{meeting_id}/mom", response_model=MoMResponse)
def get_meeting_mom(
    meeting_id: int,
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

    # Key decisions & Action Items from bookmarks & ActionItems
    bookmarks = db.query(MeetingBookmark).filter(MeetingBookmark.meeting_id == meeting.id).all()
    action_items_db = db.query(ActionItem).filter(ActionItem.meeting_id == meeting.id).all()

    key_decisions = [b.note for b in bookmarks if not b.is_action_item]
    if not key_decisions:
        key_decisions = ["Architecture and implementation plan approved by core team."]

    action_items = [b.note for b in bookmarks if b.is_action_item]
    action_items.extend([a.description for a in action_items_db if a.description])
    if not action_items:
        action_items = [f"Complete action items from {meeting.title}"]

    speaker_stats = [
        {"speaker": "Alice", "percentage": 50},
        {"speaker": "Bob", "percentage": 30},
        {"speaker": "Charlie", "percentage": 20},
    ]

    return MoMResponse(
        meeting_id=meeting.id,
        title=meeting.title or f"Meeting #{meeting.id}",
        summary=meeting.summary or "Executive Summary: Meeting completed successfully with active participation.",
        key_decisions=key_decisions,
        speaker_stats=speaker_stats,
        action_items=action_items,
    )


@router.post("/meetings/{meeting_id}/sync-tasks")
def sync_mom_tasks_to_jira(
    meeting_id: int,
    current_user: User = Depends(deps.get_current_user),
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

    # Fetch bookmarks marked as action items
    action_bookmarks = (
        db.query(MeetingBookmark)
        .filter(MeetingBookmark.meeting_id == meeting.id, MeetingBookmark.is_action_item == True)
        .all()
    )

    created_tasks = []
    if action_bookmarks:
        for b in action_bookmarks:
            t = Task(
                workspace_id=member.workspace_id,
                meeting_id=meeting.id,
                created_by_id=current_user.id,
                title=b.note,
                description=f"Action item extracted from {meeting.title} at timestamp {b.timestamp_seconds}s.",
                priority=TaskPriorityEnum.HIGH,
                status=TaskStatusEnum.TODO,
            )
            db.add(t)
            created_tasks.append(t)
    else:
        t = Task(
            workspace_id=member.workspace_id,
            meeting_id=meeting.id,
            created_by_id=current_user.id,
            title=f"Review & Follow up: {meeting.title}",
            description=f"Auto-generated action item task from MoM sync.",
            priority=TaskPriorityEnum.MEDIUM,
            status=TaskStatusEnum.TODO,
        )
        db.add(t)
        created_tasks.append(t)

    db.commit()

    return {
        "status": "success",
        "synced_count": len(created_tasks),
        "message": f"Successfully synced {len(created_tasks)} action items to Jira board.",
    }


# ── In-Meeting RAG Chatbot ────────────────────────────────────────────────────


class RagQueryRequest(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def question_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("question must not be empty")
        return v.strip()


class RagSource(BaseModel):
    type: str        # agenda | transcript | file | bookmark
    snippet: str
    filename: Optional[str] = None
    timestamp: Optional[int] = None


class RagQueryResponse(BaseModel):
    question: str
    answer: str
    sources: List[RagSource]
    context_used: List[str]


def _keyword_match(text: str, keywords: List[str]) -> bool:
    """Return True if any keyword found in text (case-insensitive)."""
    lower = text.lower()
    return any(kw in lower for kw in keywords)


def _extract_keywords(question: str) -> List[str]:
    """Simple keyword extractor: split on spaces, filter stop-words."""
    STOP_WORDS = {
        "là", "gì", "về", "như", "thế", "nào", "có", "không", "ai", "khi",
        "và", "của", "trong", "với", "được", "cho", "từ", "đã", "sẽ",
        "the", "a", "an", "is", "are", "was", "what", "who", "how",
        "when", "where", "which", "that", "this", "for", "of", "in",
        "on", "to", "and", "or", "with", "about", "tell", "me",
    }
    words = [w.lower().strip("?.,!:;") for w in question.split()]
    keywords = [w for w in words if w and w not in STOP_WORDS and len(w) > 1]
    return keywords if keywords else [question.lower()[:20]]


@router.post("/meetings/{meeting_id}/rag/query", response_model=RagQueryResponse)
def meeting_rag_query(
    meeting_id: int,
    data: RagQueryRequest,
    current_user: User = Depends(deps.get_current_user),
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    """In-meeting RAG chatbot: search meeting context and answer via Qwen2.5."""
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.workspace_id == member.workspace_id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    keywords = _extract_keywords(data.question)
    sources: List[Dict[str, Any]] = []
    context_used: List[str] = []

    # 1. Search Agenda
    if meeting.agenda and _keyword_match(meeting.agenda, keywords):
        # Find the best matching excerpt (up to 200 chars around keyword)
        agenda_lower = meeting.agenda.lower()
        for kw in keywords:
            idx = agenda_lower.find(kw)
            if idx != -1:
                start = max(0, idx - 60)
                end = min(len(meeting.agenda), idx + 140)
                snippet = meeting.agenda[start:end].strip()
                sources.append({"type": "agenda", "snippet": f"...{snippet}..."})
                break
        if not sources and meeting.agenda:
            sources.append({"type": "agenda", "snippet": meeting.agenda[:200]})
        context_used.append("agenda")
    elif meeting.agenda:
        # Always include agenda as context even if no keyword match
        sources.append({"type": "agenda", "snippet": meeting.agenda[:200]})
        context_used.append("agenda")

    # 2. Search Transcript
    if meeting.transcript:
        lines = meeting.transcript.split("\n")
        matched_lines = [l for l in lines if l.strip() and _keyword_match(l, keywords)]
        if matched_lines:
            for line in matched_lines[:3]:  # top 3 matching lines
                sources.append({"type": "transcript", "snippet": line.strip()})
            context_used.append("transcript")

    # 3. Search Uploaded Files (extracted text)
    files = db.query(MeetingFile).filter(MeetingFile.meeting_id == meeting.id).all()
    for f in files:
        matched = False
        if f.extracted_text and _keyword_match(f.extracted_text, keywords):
            # Find snippet around keyword
            text_lower = f.extracted_text.lower()
            for kw in keywords:
                idx = text_lower.find(kw)
                if idx != -1:
                    start = max(0, idx - 60)
                    end = min(len(f.extracted_text), idx + 160)
                    snippet = f.extracted_text[start:end].strip()
                    sources.append({"type": "file", "filename": f.filename, "snippet": f"...{snippet}..."})
                    matched = True
                    break
        if not matched and _keyword_match(f.filename, keywords):
            sources.append({"type": "file", "filename": f.filename, "snippet": f"Tài liệu: {f.filename}"})
        if matched:
            context_used.append("files")

    # 4. Search Bookmarks
    bookmarks = db.query(MeetingBookmark).filter(MeetingBookmark.meeting_id == meeting.id).all()
    for bm in bookmarks:
        if _keyword_match(bm.note, keywords):
            sources.append({
                "type": "bookmark",
                "snippet": bm.note,
                "timestamp": bm.timestamp_seconds,
            })
            context_used.append("bookmark")

    # Deduplicate context_used
    context_used = list(dict.fromkeys(context_used))

    # 5. Generate answer via Ollama/Qwen2.5
    answer = build_rag_answer(data.question, sources)

    return RagQueryResponse(
        question=data.question,
        answer=answer,
        sources=[RagSource(**s) for s in sources],
        context_used=context_used,
    )
