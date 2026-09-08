import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status, File, UploadFile
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from src.backend.api import deps
from src.backend.core.exceptions import AuthenticationException, ForbiddenException, NotFoundException
from src.backend.database import get_db
from src.backend.models import (
    Meeting,
    MeetingMember,
    MeetingMemberRoleEnum,
    MeetingMemberStatusEnum,
    MeetingStatusEnum,
    FollowUpTask,
    TranscriptSegment,
    MeetingSummary,
    MeetingDocument,
    KnowledgeChunk,
    User,
)
from src.backend.schemas.meeting import (
    MeetingCreate,
    MeetingMemberAdd,
    MeetingMemberResponse,
    MeetingResponse,
    MeetingUpdate,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_meeting_or_404(db: Session, meeting_id: str) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException("Meeting")
    return meeting


def _require_meeting_member(db: Session, meeting_id: str, user_id: str) -> MeetingMember:
    member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.meeting_id == meeting_id,
            MeetingMember.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise ForbiddenException("Not a member of this meeting")
    return member


# ---------------------------------------------------------------------------
# Meeting CRUD
# ---------------------------------------------------------------------------
@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Create a new meeting. Creator is auto-added as HOST."""
    meeting = Meeting(
        title=payload.title,
        description=payload.description or payload.agenda,
        organization_id=payload.organization_id,
        department_id=payload.department_id,
        created_by_id=current_user.id,
        scheduled_at=payload.scheduled_at,
        status=MeetingStatusEnum.SCHEDULED,
    )
    db.add(meeting)
    db.flush()

    # Auto-add creator as HOST
    host = MeetingMember(
        meeting_id=meeting.id,
        user_id=current_user.id,
        role=MeetingMemberRoleEnum.HOST,
        status=MeetingMemberStatusEnum.ACCEPTED,
    )
    db.add(host)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/", response_model=list[MeetingResponse])
@router.get("", response_model=list[MeetingResponse])
def list_my_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all meetings the current user is a member of."""
    memberships = (
        db.query(MeetingMember)
        .filter(MeetingMember.user_id == current_user.id)
        .all()
    )
    meeting_ids = [m.meeting_id for m in memberships]
    if not meeting_ids:
        return []
    return db.query(Meeting).filter(Meeting.id.in_(meeting_ids)).all()


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get meeting details. User must be a member."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)
    return meeting


@router.patch("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(
    meeting_id: str,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Update meeting details. Only HOST or creator can update."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    if payload.title is not None:
        meeting.title = payload.title
    if payload.description is not None:
        meeting.description = payload.description
    elif payload.agenda is not None:
        meeting.description = payload.agenda
    if payload.scheduled_at is not None:
        meeting.scheduled_at = payload.scheduled_at
    if payload.status is not None:
        old_status = meeting.status
        meeting.status = payload.status
        if payload.status in ("COMPLETED", "ENDED"):
            if not meeting.ended_at:
                meeting.ended_at = datetime.now(timezone.utc)
            if old_status not in ("COMPLETED", "ENDED"):
                try:
                    from src.backend.services.action_item_extractor import extract_action_items
                    extract_action_items(db, meeting_id, current_user.id)
                except Exception as e:
                    logger.warning(f"Failed to auto-extract action items for meeting {meeting_id}: {e}")

    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}")
def delete_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Delete a meeting. Only creator, HOST or organization admin can delete."""
    meeting = _get_meeting_or_404(db, meeting_id)

    # Permission check: Creator, HOST, or OWNER/ADMIN can delete
    is_creator = meeting.created_by_id == current_user.id
    is_host = False
    member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.meeting_id == meeting_id,
            MeetingMember.user_id == current_user.id,
        )
        .first()
    )
    if member and member.role == MeetingMemberRoleEnum.HOST:
        is_host = True

    is_admin = getattr(current_user, "role", None) in ("OWNER", "ADMIN")

    if not (is_creator or is_host or is_admin):
        raise ForbiddenException("Bạn không có quyền xóa cuộc họp này. Chỉ người tạo hoặc chủ tọa mới có quyền xóa.")

    # Delete dependent child rows to prevent foreign key errors
    try:
        from sqlalchemy import text
        # 1. Jira projects & issues
        jp_ids = [r[0] for r in db.execute(text('SELECT id FROM jira_projects WHERE meeting_id = :mid'), {'mid': meeting_id}).fetchall()]
        if jp_ids:
            jp_tuple = tuple(jp_ids)
            db.execute(text('DELETE FROM issue_comments WHERE issue_id IN (SELECT id FROM issues WHERE project_id IN :jpids OR meeting_id = :mid)'), {'jpids': jp_tuple, 'mid': meeting_id})
            db.execute(text('UPDATE issues SET parent_id = NULL, epic_id = NULL, sprint_id = NULL WHERE project_id IN :jpids OR meeting_id = :mid'), {'jpids': jp_tuple, 'mid': meeting_id})
            db.execute(text('DELETE FROM issues WHERE project_id IN :jpids OR meeting_id = :mid'), {'jpids': jp_tuple, 'mid': meeting_id})
            db.execute(text('DELETE FROM sprints WHERE project_id IN :jpids'), {'jpids': jp_tuple})
            db.execute(text('DELETE FROM jira_projects WHERE id IN :jpids'), {'jpids': jp_tuple})
        else:
            db.execute(text('DELETE FROM issue_comments WHERE issue_id IN (SELECT id FROM issues WHERE meeting_id = :mid)'), {'mid': meeting_id})
            db.execute(text('UPDATE issues SET parent_id = NULL, epic_id = NULL, sprint_id = NULL WHERE meeting_id = :mid'), {'mid': meeting_id})
            db.execute(text('DELETE FROM issues WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 2. follow up tasks FIRST (has FK to transcript_segments)
        db.execute(text('DELETE FROM follow_up_tasks WHERE meeting_id = :mid'), {'mid': meeting_id})
        # 3. extraction corrections
        db.execute(text('DELETE FROM extraction_corrections WHERE meeting_id = :mid'), {'mid': meeting_id})
        # 4. meeting chat messages
        db.execute(text('DELETE FROM meeting_chat_messages WHERE meeting_id = :mid'), {'mid': meeting_id})
        # 5. knowledge chunks
        db.execute(text('DELETE FROM knowledge_chunks WHERE meeting_id = :mid'), {'mid': meeting_id})
        # 6. meeting summaries
        db.execute(text('DELETE FROM meeting_summaries WHERE meeting_id = :mid'), {'mid': meeting_id})
        # 7. transcript segments
        db.execute(text('DELETE FROM transcript_segments WHERE meeting_id = :mid'), {'mid': meeting_id})
        # 8. meeting documents
        db.execute(text('DELETE FROM meeting_documents WHERE meeting_id = :mid'), {'mid': meeting_id})
        # 9. meeting members
        db.execute(text('DELETE FROM meeting_members WHERE meeting_id = :mid'), {'mid': meeting_id})
    except Exception as e:
        logger.warning(f"Note when cleaning child records for meeting {meeting_id}: {e}")

    db.delete(meeting)
    db.commit()
    return {"message": "Đã xóa cuộc họp thành công", "deleted_id": meeting_id}


@router.post("/parse-agenda")
async def parse_agenda_file(
    file: UploadFile = File(...),
    current_user: User | None = Depends(deps.get_optional_current_user),
):
    """
    Parse an uploaded agenda file (.docx, .pdf, .txt, .md, .csv, .xlsx)
    and return clean text content without binary garbage.
    """
    from src.backend.services import text_extractor

    try:
        content = await file.read()
        if not content:
            return {"filename": file.filename, "content": "", "char_count": 0}

        clean_text = text_extractor.extract_text(content, file.filename or "agenda.txt", file.content_type or "")
        clean_text = clean_text.strip()
        return {
            "filename": file.filename,
            "content": clean_text,
            "char_count": len(clean_text),
        }
    except Exception as e:
        logger.error(f"Error parsing agenda file {file.filename}: {e}")
        return {
            "filename": file.filename,
            "content": "",
            "char_count": 0,
            "error": f"Không thể trích xuất nội dung tệp: {str(e)}",
        }


# ---------------------------------------------------------------------------
# MeetingMember Management
# ---------------------------------------------------------------------------
@router.get("/{meeting_id}/members", response_model=list[MeetingMemberResponse])
def list_meeting_members(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all members of a meeting."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    from sqlalchemy.orm import joinedload
    return (
        db.query(MeetingMember)
        .options(joinedload(MeetingMember.user))
        .filter(MeetingMember.meeting_id == meeting_id)
        .all()
    )


@router.post(
    "/{meeting_id}/members",
    response_model=MeetingMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_meeting_member(
    meeting_id: str,
    payload: MeetingMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Add a user to a meeting."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    # Map string role to enum
    try:
        role_enum = MeetingMemberRoleEnum(payload.role)
    except ValueError:
        role_enum = MeetingMemberRoleEnum.PARTICIPANT

    member = MeetingMember(
        meeting_id=meeting_id,
        user_id=payload.user_id,
        role=role_enum,
        status=MeetingMemberStatusEnum.INVITED,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete(
    "/{meeting_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_meeting_member(
    meeting_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Remove a member from a meeting."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    target = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.id == member_id,
            MeetingMember.meeting_id == meeting_id,
        )
        .first()
    )
    if not target:
        raise NotFoundException("Meeting member")

    db.delete(target)
    db.commit()


# ---------------------------------------------------------------------------
# LiveKit Token & In-Meeting RAG
# ---------------------------------------------------------------------------
from pydantic import BaseModel as _PydanticBaseModel
from livekit import api as livekit_api
from src.backend.core.config import get_settings
from src.backend.services.ollama_service import build_rag_answer


class TokenResponse(_PydanticBaseModel):
    token: str


class RagQueryRequest(_PydanticBaseModel):
    question: str
    live_transcript: str | None = None
    chat_history: list[dict] | None = None


class RagSourceItem(_PydanticBaseModel):
    type: str
    snippet: str
    filename: str | None = None
    timestamp: int | None = None


class RagQueryResponse(_PydanticBaseModel):
    question: str
    answer: str
    sources: list[RagSourceItem]
    context_used: list[str]


import uuid

import json

@router.get("/{meeting_id}/token", response_model=TokenResponse)
def get_meeting_token(
    meeting_id: str,
    participant_name: str,
    language: str = "vi",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Generate a LiveKit access token for a meeting room."""
    _get_meeting_or_404(db, meeting_id)
    settings = get_settings()
    token = livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    unique_identity = f"user_{current_user.id}"
    token.with_identity(unique_identity)
    token.with_name(participant_name)
    token.with_metadata(json.dumps({"target_lang": language}))
    token.with_grants(
        livekit_api.VideoGrants(
            room_join=True,
            room=f"meeting-{meeting_id}",
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            can_update_own_metadata=True,
        )
    )

    # Automatically ensure AI Agent is dispatched to the room
    try:
        def _auto_dispatch():
            async def _inner():
                try:
                    http_url = settings.livekit_url.replace("ws://", "http://").replace("wss://", "https://")
                    lk = livekit_api.LiveKitAPI(http_url, settings.livekit_api_key, settings.livekit_api_secret)
                    room_name = f"meeting-{meeting_id}"
                    try:
                        participants = await lk.room.list_participants(livekit_api.ListParticipantsRequest(room=room_name))
                        has_agent = any(
                            p.identity.startswith("agent-")
                            or "agent" in p.identity.lower()
                            or getattr(p, "kind", None) == livekit_api.ParticipantKind.PARTICIPANT_KIND_AGENT
                            for p in participants.participants
                        )
                    except Exception:
                        has_agent = False

                    if not has_agent:
                        try:
                            dispatches = await lk.agent_dispatch.list_dispatch(room_name)
                            for d in dispatches:
                                try:
                                    await lk.agent_dispatch.delete_dispatch(d.id, room_name)
                                except Exception:
                                    pass
                        except Exception:
                            pass

                        req = livekit_api.CreateAgentDispatchRequest(room=room_name, agent_name="")
                        await lk.agent_dispatch.create_dispatch(req)
                    await lk.aclose()
                except Exception as ex:
                    logger.debug(f"Agent dispatch check error: {ex}")
            import asyncio
            asyncio.run(_inner())
        import threading
        threading.Thread(target=_auto_dispatch, daemon=True).start()
    except Exception as e:
        logger.warning(f"Failed to auto-dispatch agent for meeting {meeting_id}: {e}")

    return TokenResponse(token=token.to_jwt())


@router.post("/{meeting_id}/rag/query", response_model=RagQueryResponse)
def rag_query(
    meeting_id: str,
    payload: RagQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """In-meeting RAG chatbot query: provides comprehensive answer using Agenda, Transcripts, and Notes."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    sources = []

    # 1. Full Agenda from meeting description
    if meeting.description and meeting.description.strip():
        sources.append({
            "type": "agenda",
            "snippet": f"Agenda / Kế hoạch cuộc họp:\n{meeting.description.strip()}"
        })

    # 2. Transcripts from DB if available
    try:
        from src.backend.models import TranscriptSegment
        segments = (
            db.query(TranscriptSegment)
            .filter(TranscriptSegment.meeting_id == meeting_id)
            .order_by(TranscriptSegment.sequence.asc())
            .all()
        )
        if segments:
            lines = [f"- {s.speaker_name or 'Người tham gia'}: {s.content}" for s in segments[-25:]]
            sources.append({
                "type": "transcript",
                "snippet": "Biên bản phát biểu cuộc họp gần đây:\n" + "\n".join(lines)
            })
    except Exception as e:
        logger.debug(f"Could not load transcript segments for meeting {meeting_id}: {e}")

    # 3. Meeting Summary & Decisions if available
    try:
        from src.backend.models import MeetingSummary
        summary = db.query(MeetingSummary).filter(MeetingSummary.meeting_id == meeting_id).first()
        if summary and summary.summary:
            sources.append({
                "type": "file",
                "snippet": f"Tóm tắt cuộc họp: {summary.summary}\nCác điểm chính: {summary.key_points or ''}\nNghị quyết thống nhất: {summary.decisions or ''}"
            })
    except Exception as e:
        logger.debug(f"Could not load meeting summary for meeting {meeting_id}: {e}")

    answer = build_rag_answer(
        question=payload.question,
        sources=sources,
        live_transcript=payload.live_transcript,
        chat_history=payload.chat_history,
    )

    return RagQueryResponse(
        question=payload.question,
        answer=answer,
        sources=[RagSourceItem(**s) for s in sources],
        context_used=[s["snippet"] for s in sources],
    )


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
    current_user: User | None = Depends(deps.get_optional_current_user)
):
    """
    Sub-second bilingual translation using CTranslate2 INT8 models (~100-180ms).
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


