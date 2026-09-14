"""
Meeting End Service — Orchestrates the end-of-meeting flow.

When host ends a meeting:
1. Full transcript extraction with punctuation restoration
2. Follow-up task extraction via task-extractor model
3. Meeting summary generation via qwen model
4. LiveKit room closure
5. Meeting status update to COMPLETED
"""

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from src.backend.core.config import get_settings
from src.backend.core.llm import generate_text
from src.backend.models import (
    FollowUpTask,
    FollowUpTaskSourceEnum,
    Meeting,
    MeetingMemberRoleEnum,
    MeetingStatusEnum,
    MeetingSummary,
    TranscriptSegment,
    User,
)
from src.backend.services.punctuation_restorer import PunctuationRestorer
from src.backend.services.task_extractor import (
    query_pending_tasks,
    sync_extracted_tasks,
    task_extractor_service,
)
from src.backend.services.decision_extractor import (
    query_pending_decisions,
    sync_extracted_decisions,
    decision_extractor_service,
)
from src.backend.services.turn_accumulator import turn_accumulator

logger = logging.getLogger("axiom.meeting_end")


def _collect_full_transcript(db: Session, meeting_id: str) -> tuple[str, list]:
    """
    Collect all transcript segments for a meeting and restore punctuation.

    Returns:
        Tuple of (punctuated_text, segments_list)
    """
    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.sequence)
        .all()
    )

    if not segments:
        return "", []

    restorer = PunctuationRestorer()
    punctuated_text = restorer.restore(segments)

    return punctuated_text, segments


async def _generate_meeting_summary(db: Session, meeting_id: str, transcript_text: str) -> Optional[MeetingSummary]:
    """
    Generate meeting summary using the Combiner AI pattern.
    Takes [Tasks] and [Decisions] and generates a Markdown Table.
    """
    settings = get_settings()

    if not transcript_text.strip():
        logger.warning("No transcript available for summary")
        fallback_summary = MeetingSummary(
            meeting_id=meeting_id,
            summary="Cuộc họp không có nội dung trao đổi hoặc chưa được ghi âm (Không có transcript).",
        )
        db.add(fallback_summary)
        db.commit()
        db.refresh(fallback_summary)
        return fallback_summary

    # Gather data for combiner
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    title = meeting.title if meeting else "Unknown"
    agenda = meeting.description if meeting and meeting.description else "No agenda provided"
    
    date_str = "Unknown"
    if meeting:
        if meeting.started_at:
            date_str = meeting.started_at.strftime("%d/%m/%Y")
        elif meeting.created_at:
            date_str = meeting.created_at.strftime("%d/%m/%Y")

    tasks = query_pending_tasks(db, meeting_id)
    decisions = query_pending_decisions(db, meeting_id)

    tasks_json = json.dumps(tasks, ensure_ascii=False, indent=2)
    decisions_json = json.dumps(decisions, ensure_ascii=False, indent=2)

    system_prompt = (
        "You are an expert AI meeting assistant. Your task is to generate a comprehensive, beautifully formatted Meeting Note in Markdown based ONLY on the extracted decisions and tasks.\n\n"
        "Please follow EXACTLY this structure using separate Markdown tables for each section:\n\n"
        "# [MEETING NAME]\n\n"
        "## 1. Thông tin chung (General Information)\n"
        "| Mục (Item) | Chi tiết (Details) |\n"
        "|---|---|\n"
        "| **Ngày (Date)** | [Meeting Date] |\n"
        "| **Thành phần tham dự (Attendance)** | [List of participants inferred from tasks/decisions] |\n"
        "| **Nội dung chính (Agenda Outline)** | [Brief outline] |\n"
        "| **Mục tiêu (Goal)** | [Stated or inferred goal of the meeting] |\n\n"
        "## 2. Tóm tắt nội dung (Summary)\n"
        "| Phân loại | Nội dung |\n"
        "|---|---|\n"
        "| **Thực tế (Facts)** | [Key facts inferred] |\n"
        "| **Vấn đề (Problems)** | [Key problems discussed] |\n"
        "| **Câu hỏi (Questions)** | [Key questions raised] |\n\n"
        "## 3. Danh sách Quyết định (List of Decisions Made)\n"
        "| STT | Nội dung Quyết định |\n"
        "|---|---|\n"
        "| 1 | [Quyết định 1] |\n\n"
        "## 4. Danh sách Công việc (List of Action Items)\n"
        "| Người thực hiện (Who) | Công việc (Task) | Hạn chót (Deadline) |\n"
        "|---|---|---|\n"
        "| [Assignee] | [Task Description] | [Deadline] |\n\n"
        "Write the content entirely in Vietnamese."
    )

    user_prompt = (
        f"Meeting Title: {title}\n"
        f"Meeting Date: {date_str}\n"
        f"Agenda Outline:\n{agenda}\n\n"
        f"EXTRACTED_DECISIONS:\n{decisions_json}\n\n"
        f"EXTRACTED_TASKS:\n{tasks_json}"
    )

    try:
        raw = await generate_text(settings.llm_fallback_models, system_prompt + "\n\n" + user_prompt, max_tokens=2500)
        
        if not raw:
            fallback_summary = MeetingSummary(
                meeting_id=meeting_id,
                summary="AI không thể tạo bản tóm tắt cho cuộc họp này.",
            )
            db.add(fallback_summary)
            db.commit()
            db.refresh(fallback_summary)
            return fallback_summary

        # Parse structured response
        summary_text, key_points, decisions_text = _parse_summary_response(raw)

        # Check if summary already exists for this meeting
        existing = db.query(MeetingSummary).filter(
            MeetingSummary.meeting_id == meeting_id
        ).first()

        if existing:
            existing.summary = summary_text
            existing.key_points = key_points
            existing.decisions = decisions_text
            db.commit()
            db.refresh(existing)
            return existing

        summary_obj = MeetingSummary(
            meeting_id=meeting_id,
            summary=summary_text,
            key_points=key_points,
            decisions=decisions_text,
        )
        db.add(summary_obj)
        db.commit()
        db.refresh(summary_obj)
        return summary_obj

    except Exception as exc:
        logger.error("Summary generation error: %s", exc)
        fallback_summary = MeetingSummary(
            meeting_id=meeting_id,
            summary="Đã xảy ra lỗi trong quá trình tổng hợp nội dung cuộc họp bằng AI.",
        )
        db.add(fallback_summary)
        db.commit()
        db.refresh(fallback_summary)
        return fallback_summary


def _parse_summary_response(raw: str) -> tuple[str, Optional[str], Optional[str]]:
    """Parse structured summary response into (summary, key_points, decisions)."""
    import re

    # Strip thinking tags
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

    # In the Combiner AI pattern, the LLM outputs a Markdown Table directly.
    # We store the entire table in the `summary` column.
    summary = raw
    key_points = None
    decisions = None

    return summary, key_points, decisions


def _close_livekit_room(meeting_id: str) -> bool:
    """
    Close a LiveKit room, removing all participants.

    Returns:
        True if room was closed successfully, False otherwise.
    """
    settings = get_settings()

    if not settings.livekit_url:
        logger.warning("LiveKit URL not configured, skipping room closure")
        return False

    try:
        from livekit.api import LiveKitAPI

        api = LiveKitAPI(
            url=settings.livekit_url.replace("ws://", "http://").replace("wss://", "https://"),
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
        )
        # Delete room forces all participants to disconnect
        import asyncio
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(api.room.delete_room(meeting_id))
        finally:
            loop.close()

        logger.info("LiveKit room closed: %s", meeting_id)
        return True

    except ImportError:
        logger.warning("livekit-api package not installed, skipping room closure")
    except Exception as exc:
        logger.error("Failed to close LiveKit room %s: %s", meeting_id, exc)

    return False


async def end_meeting(
    db: Session,
    meeting_id: str,
    host_user_id: str,
) -> dict:
    """
    Orchestrate the end-of-meeting flow.

    Steps:
    1. Flush remaining turns from accumulator
    2. Collect full transcript with punctuation restoration
    3. Run full task extraction via task-extractor model
    4. Generate meeting summary via qwen
    5. Close LiveKit room
    6. Update meeting status to COMPLETED

    Args:
        db: Database session.
        meeting_id: Meeting ID.
        host_user_id: ID of the host user ending the meeting.

    Returns:
        Dict with summary and follow_up_tasks data.
    """
    # 1. Flush remaining turns from accumulator
    remaining_ids = turn_accumulator.flush(meeting_id)

    # 2. Extract tasks and decisions only for remaining segments (if any)
    if remaining_ids:
        from sqlalchemy.orm import joinedload
        remaining_segments = (
            db.query(TranscriptSegment)
            .options(joinedload(TranscriptSegment.speaker))
            .filter(TranscriptSegment.id.in_(remaining_ids))
            .order_by(TranscriptSegment.sequence)
            .all()
        )
        restorer = PunctuationRestorer()
        remaining_text = restorer.restore(remaining_segments)
        
        if remaining_text:
            pending_tasks_list = query_pending_tasks(db, meeting_id)
            pending_decisions_list = query_pending_decisions(db, meeting_id)
            
            import asyncio
            from src.backend.services.speech_act_classifier import speech_act_classifier_service
            
            # 1. Classify
            classified_lines = await speech_act_classifier_service.classify(remaining_text)
            
            # 2. Annotate
            annotated_text = remaining_text
            valid_task_quotes = set()
            valid_decision_quotes = set()
            
            if classified_lines:
                annotated_lines = []
                for line in remaining_text.split('\n'):
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

            # 3. Extract
            extracted_tasks, extracted_decisions = await asyncio.gather(
                task_extractor_service.extract(annotated_text, pending_tasks_list),
                decision_extractor_service.extract(annotated_text, pending_decisions_list)
            )
            
            # 4. Validate Tasks
            validated_tasks = []
            for t in extracted_tasks:
                ev = t.get("evidence_quote", "")
                ev_clean = ev.strip().lower()
                if ev_clean and len(ev_clean) >= 10:
                    matched = False
                    for vq in valid_task_quotes:
                        vq_clean = vq.strip().lower()
                        if ev_clean in vq_clean or vq_clean in ev_clean:
                            matched = True
                            break
                    if matched:
                        validated_tasks.append(t)
                    else:
                        logger.info("Rejected task due to invalid evidence/act: %s", t)
                else:
                    logger.info("Rejected task due to missing/short evidence: %s", t)
            
            # 5. Validate Decisions
            validated_decisions = []
            for d in extracted_decisions:
                ev = d.get("evidence_quote", "")
                ev_clean = ev.strip().lower()
                if ev_clean and len(ev_clean) >= 10:
                    matched = False
                    for vq in valid_decision_quotes:
                        vq_clean = vq.strip().lower()
                        if ev_clean in vq_clean or vq_clean in ev_clean:
                            matched = True
                            break
                    if matched:
                        validated_decisions.append(d)
                    else:
                        logger.info("Rejected decision due to invalid evidence/act: %s", d)
                else:
                    logger.info("Rejected decision due to missing/short evidence: %s", d)

            extracted_tasks = validated_tasks
            extracted_decisions = validated_decisions
            
            if extracted_tasks:
                sync_extracted_tasks(
                    db, meeting_id, extracted_tasks,
                    source=FollowUpTaskSourceEnum.AI_REALTIME,
                    segment_ids=remaining_ids,
                )
            if extracted_decisions:
                sync_extracted_decisions(
                    db, meeting_id, extracted_decisions,
                    segment_ids=remaining_ids,
                )

    # 3. Collect full transcript for the summary
    transcript_text, segments = _collect_full_transcript(db, meeting_id)

    # 4. Generate meeting summary
    summary = None
    if transcript_text:
        summary = await _generate_meeting_summary(db, meeting_id, transcript_text)

    # 5. Close LiveKit room
    _close_livekit_room(meeting_id)

    # 6. Update meeting status
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if meeting:
        meeting.status = MeetingStatusEnum.COMPLETED
        db.commit()

    # Gather all follow-up tasks for response
    all_tasks = (
        db.query(FollowUpTask)
        .filter(FollowUpTask.meeting_id == meeting_id)
        .order_by(FollowUpTask.created_at)
        .all()
    )

    # Build response
    tasks_response = []
    for task in all_tasks:
        assignee_name = None
        if task.assignee_id:
            assignee = db.query(User).filter(User.id == task.assignee_id).first()
            if assignee:
                assignee_name = assignee.full_name

        tasks_response.append({
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "assignee_id": task.assignee_id,
            "assignee_name": assignee_name,
            "deadline": task.deadline.isoformat() if task.deadline else None,
            "status": task.status.value,
            "source": task.source.value,
            "created_at": task.created_at.isoformat() if task.created_at else None,
        })

    summary_response = None
    if summary:
        summary_response = {
            "id": summary.id,
            "content": summary.summary,
            "key_points": summary.key_points,
            "decisions": summary.decisions,
        }
    elif not transcript_text:
        summary_response = {
            "id": None,
            "content": "Không có nội dung để tóm tắt.",
            "key_points": None,
            "decisions": None,
        }

    result = {
        "meeting_id": meeting_id,
        "status": "COMPLETED",
        "summary": summary_response,
        "follow_up_tasks": tasks_response,
    }

    # 7. Broadcast meeting_ended event via WebSocket
    try:
        import asyncio
        from src.backend.services.meeting_events import meeting_events_manager

        event = {
            "type": "meeting_ended",
            "data": result,
        }

        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(meeting_events_manager.broadcast(meeting_id, event))
        else:
            loop.run_until_complete(meeting_events_manager.broadcast(meeting_id, event))
    except Exception as exc:
        logger.warning("Failed to broadcast meeting_ended event: %s", exc)

    return result
