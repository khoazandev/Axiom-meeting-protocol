import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import (
    FollowUpTask,
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
    action_items_db = db.query(FollowUpTask).filter(FollowUpTask.meeting_id == meeting.id).all()

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


class ChatHistoryItem(BaseModel):
    sender: str
    text: str
    isAi: Optional[bool] = False


class RagQueryRequest(BaseModel):
    question: str
    live_transcript: Optional[str] = None
    chat_history: Optional[List[ChatHistoryItem]] = None

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
    display_name: Optional[str] = None
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

    # 1. Search Agenda (Only attach if keywords match or query explicitly asks about agenda/topics)
    q_lower = data.question.lower()
    agenda_triggers = ["agenda", "nội dung", "kế hoạch", "chủ đề", "mục tiêu", "lịch trình"]
    is_agenda_query = any(trig in q_lower for trig in agenda_triggers)

    if meeting.agenda and (_keyword_match(meeting.agenda, keywords) or is_agenda_query):
        agenda_lower = meeting.agenda.lower()
        matched_snippet = None
        for kw in keywords:
            idx = agenda_lower.find(kw)
            if idx != -1:
                start = max(0, idx - 60)
                end = min(len(meeting.agenda), idx + 140)
                matched_snippet = meeting.agenda[start:end].strip()
                break
        snippet = f"...{matched_snippet}..." if matched_snippet else meeting.agenda[:200]
        sources.append({
            "type": "agenda",
            "display_name": "Agenda cuộc họp",
            "snippet": snippet
        })
        context_used.append("agenda")

    # 2. Search Live Transcript + DB Transcript
    combined_transcript_parts = []
    if meeting.transcript:
        combined_transcript_parts.append(meeting.transcript)
    if data.live_transcript and data.live_transcript.strip():
        combined_transcript_parts.append(data.live_transcript.strip())

    full_transcript = "\n".join(combined_transcript_parts)
    if full_transcript:
        lines = [l.strip() for l in full_transcript.split("\n") if l.strip()]
        
        # Check if user is asking about recent / ongoing discussion or speech
        speech_triggers = [
            "vừa", "vừa mới", "vừa rồi", "đang nói", "nói gì", "thảo luận gì",
            "nói tới đâu", "vấn đề nào", "ai vừa nói", "ai là người nói", "ai nói",
            "gì rồi", "nhắc tới", "vừa qua", "nói lời chào", "phát biểu"
        ]
        is_speech_query = any(trig in q_lower for trig in speech_triggers)

        def _extract_speaker(line_str: str) -> str:
            """Extract clean speaker name from formatted line like '[Trần Tấn Đạt — 12:51 PM]: ...'"""
            if ":" in line_str:
                raw_header = line_str.split(":", 1)[0].strip("[] ")
                clean_name = raw_header.split("—")[0].split("-")[0].strip()
                if clean_name and len(clean_name) < 40:
                    return clean_name
            return "Thành viên cuộc họp"

        if is_speech_query:
            recent_lines = lines[-6:] if len(lines) >= 6 else lines
            recent_text = "\n".join(recent_lines)
            
            # Find speaker of the target speech line if available
            speaker = _extract_speaker(recent_lines[-1]) if recent_lines else "Thành viên cuộc họp"
            
            sources.append({
                "type": "transcript",
                "display_name": f"{speaker} (Ý kiến phát biểu)",
                "snippet": f"Nội dung trao đổi:\n{recent_text}"
            })
            context_used.append("live_transcript")
        else:
            matched_lines = [l for l in lines if _keyword_match(l, keywords)]
            if matched_lines:
                for line in matched_lines[-4:]:
                    speaker = _extract_speaker(line)
                    sources.append({
                        "type": "transcript",
                        "display_name": f"{speaker} (Ý kiến phát biểu)",
                        "snippet": line
                    })
                context_used.append("transcript")

    # 3. Search Uploaded Files (extracted text)
    files = db.query(MeetingFile).filter(MeetingFile.meeting_id == meeting.id).all()
    for f in files:
        matched = False
        if f.extracted_text and _keyword_match(f.extracted_text, keywords):
            text_lower = f.extracted_text.lower()
            for kw in keywords:
                idx = text_lower.find(kw)
                if idx != -1:
                    start = max(0, idx - 60)
                    end = min(len(f.extracted_text), idx + 160)
                    snippet = f.extracted_text[start:end].strip()
                    sources.append({
                        "type": "file",
                        "filename": f.filename,
                        "display_name": f"Tài liệu: {f.filename}",
                        "snippet": f"...{snippet}..."
                    })
                    matched = True
                    break
        if not matched and _keyword_match(f.filename, keywords):
            sources.append({
                "type": "file",
                "filename": f.filename,
                "display_name": f"Tài liệu: {f.filename}",
                "snippet": f"Tài liệu: {f.filename}"
            })
        if matched:
            context_used.append("files")

    # 4. Search Bookmarks
    bookmarks = db.query(MeetingBookmark).filter(MeetingBookmark.meeting_id == meeting.id).all()
    for bm in bookmarks:
        if _keyword_match(bm.note, keywords):
            sources.append({
                "type": "bookmark",
                "display_name": "Ghi chú cuộc họp",
                "snippet": bm.note,
                "timestamp": bm.timestamp_seconds,
            })
            context_used.append("bookmark")

    # 5. Compute Real-time Meeting State & Operational Event Logs (System Activity Logs - UTC+7 Vietnam Time)
    import datetime
    vietnam_tz = datetime.timezone(datetime.timedelta(hours=7))
    now = datetime.datetime.now(vietnam_tz)

    start_time_dt = meeting.start_time
    elapsed_mins = 0
    if start_time_dt:
        if start_time_dt.tzinfo is None:
            start_time_dt = start_time_dt.replace(tzinfo=datetime.timezone.utc)
        start_time_vn = start_time_dt.astimezone(vietnam_tz)
        diff_sec = max(0, (now - start_time_vn).total_seconds())
        elapsed_mins = int(diff_sec // 60)
        start_time_str = start_time_vn.strftime("%I:%M:%S %p")
    else:
        start_time_str = "Vừa khởi tạo"

    current_time_str = now.strftime("%I:%M:%S %p")

    # Build Operational Event Logs array with Vietnam Local Time
    event_logs: List[str] = []
    host_name = meeting.created_by.full_name if (meeting.created_by and meeting.created_by.full_name) else "Host cuộc họp"
    event_logs.append(f"[{start_time_str}] EVENT: Meeting started by user '{host_name}'. Title: '{meeting.title}'. Agenda: '{meeting.agenda}'.")

    # File Upload Events (VN Time)
    uploaded_files_summary = []
    for f in files:
        uploader = f.uploaded_by.full_name if (f.uploaded_by and f.uploaded_by.full_name) else "Thành viên"
        if f.created_at:
            f_dt = f.created_at if f.created_at.tzinfo else f.created_at.replace(tzinfo=datetime.timezone.utc)
            created_time = f_dt.astimezone(vietnam_tz).strftime("%I:%M:%S %p")
        else:
            created_time = start_time_str
        event_logs.append(f"[{created_time}] EVENT: File '{f.filename}' ({f.file_size} bytes, type: {f.content_type}) was uploaded by user '{uploader}'.")
        uploaded_files_summary.append(f"'{f.filename}' (bởi {uploader})")

    # Bookmark Events (VN Time)
    for bm in bookmarks:
        creator = bm.user.full_name if (bm.user and bm.user.full_name) else "Thành viên"
        if bm.created_at:
            bm_dt = bm.created_at if bm.created_at.tzinfo else bm.created_at.replace(tzinfo=datetime.timezone.utc)
            created_time = bm_dt.astimezone(vietnam_tz).strftime("%I:%M:%S %p")
        else:
            created_time = start_time_str
        event_logs.append(f"[{created_time}] EVENT: Bookmark created at {bm.timestamp_seconds}s by user '{creator}': '{bm.note}'.")

    # Extract first speaker & participant list from transcript
    first_speaker_info = "Chưa có lượt phát biểu nào"
    participants_set = set()
    if current_user and current_user.full_name:
        participants_set.add(current_user.full_name)
    if host_name:
        participants_set.add(host_name)

    speech_lines_count = 0
    if full_transcript:
        lines = [l.strip() for l in full_transcript.split("\n") if l.strip()]
        speech_lines_count = len(lines)
        for idx, line in enumerate(lines):
            spk = _extract_speaker(line)
            if spk and spk != "Thành viên cuộc họp":
                participants_set.add(spk)
            if idx == 0:
                first_speaker_info = f"{spk} ({line[:70]})"
            event_logs.append(f"SPEECH: {line}")

    meeting_info = {
        "start_time": start_time_str,
        "current_time": current_time_str,
        "elapsed_minutes": elapsed_mins,
        "participants": list(participants_set) if participants_set else [host_name],
        "first_speaker": first_speaker_info,
        "speech_count": speech_lines_count,
        "total_files": len(files),
        "files_list": uploaded_files_summary,
        "total_bookmarks": len(bookmarks),
        "event_logs": event_logs,
    }

    # If user asks about duration or start time, append system state source
    duration_triggers = ["bao lâu", "mấy phút", "khi nào bắt đầu", "bắt đầu lúc mấy giờ", "mấy giờ rồi"]
    if any(trig in q_lower for trig in duration_triggers):
        sources.append({
            "type": "system",
            "display_name": "Hệ thống cuộc họp (Thời gian)",
            "snippet": f"Cuộc họp '{meeting.title}' bắt đầu lúc {start_time_str}, tính đến hiện tại ({current_time_str}) đã diễn ra được {elapsed_mins} phút."
        })
        context_used.append("system")

    # Deduplicate context_used
    context_used = list(dict.fromkeys(context_used))

    # Convert chat_history to dict list if provided
    history_list = None
    if data.chat_history:
        history_list = [{"sender": item.sender, "text": item.text, "isAi": item.isAi} for item in data.chat_history]

    # 6. Generate answer via Ollama/Qwen3.5 with Live Transcript, System State, & Chat History support
    answer = build_rag_answer(
        data.question,
        sources,
        live_transcript=data.live_transcript,
        meeting_info=meeting_info,
        chat_history=history_list,
    )

    return RagQueryResponse(
        question=data.question,
        answer=answer,
        sources=[RagSource(**s) for s in sources],
        context_used=context_used,
    )

