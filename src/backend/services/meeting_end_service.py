"""
Meeting End Service — Orchestrates the end-of-meeting flow.

When host ends a meeting:
1. Full transcript extraction with punctuation restoration
2. Follow-up task extraction via task-extractor model
3. Meeting summary generation via qwen model
4. LiveKit room closure
5. Meeting status update to COMPLETED
"""

import logging
from typing import Optional

import requests
from sqlalchemy.orm import Session

from src.backend.core.config import get_settings
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


def _generate_meeting_summary(db: Session, meeting_id: str, transcript_text: str) -> Optional[MeetingSummary]:
    """
    Generate meeting summary using qwen model via Ollama.

    Returns:
        MeetingSummary object or None if generation fails.
    """
    settings = get_settings()

    if not settings.ollama_base_url or not transcript_text.strip():
        return None

    system_prompt = (
        "You are a professional meeting secretary. Summarize the following meeting transcript.\n\n"
        "Provide:\n"
        "1. A concise summary of the meeting (2-4 paragraphs)\n"
        "2. Key points discussed (bullet points)\n"
        "3. Key decisions made (bullet points)\n\n"
        "Format your response as:\n"
        "SUMMARY:\n<summary text>\n\n"
        "KEY POINTS:\n<bullet points>\n\n"
        "DECISIONS:\n<bullet points>\n\n"
        "Write in the same language as the transcript. Be concise and accurate."
    )

    try:
        from src.backend.services.ollama_service import get_active_model

        model_name = get_active_model()

        response = requests.post(
            f"{settings.ollama_base_url.rstrip('/')}/api/generate",
            json={
                "model": model_name,
                "system": system_prompt,
                "prompt": f"Meeting transcript:\n\n{transcript_text[:8000]}",
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.9,
                    "num_predict": 2000,
                },
            },
            timeout=settings.ollama_timeout,
        )
        response.raise_for_status()
        raw = response.json().get("response", "").strip()

        if not raw:
            return None

        # Parse structured response
        summary_text, key_points, decisions = _parse_summary_response(raw)

        # Check if summary already exists for this meeting
        existing = db.query(MeetingSummary).filter(
            MeetingSummary.meeting_id == meeting_id
        ).first()

        if existing:
            existing.summary = summary_text
            existing.key_points = key_points
            existing.decisions = decisions
            db.commit()
            db.refresh(existing)
            return existing

        summary = MeetingSummary(
            meeting_id=meeting_id,
            summary=summary_text,
            key_points=key_points,
            decisions=decisions,
        )
        db.add(summary)
        db.commit()
        db.refresh(summary)
        return summary

    except requests.exceptions.ConnectionError:
        logger.warning("Ollama not reachable for summary generation")
    except requests.exceptions.Timeout:
        logger.warning("Ollama timeout during summary generation")
    except Exception as exc:
        logger.error("Summary generation error: %s", exc)

    return None


def _parse_summary_response(raw: str) -> tuple[str, Optional[str], Optional[str]]:
    """Parse structured summary response into (summary, key_points, decisions)."""
    import re

    # Strip thinking tags
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

    summary = raw
    key_points = None
    decisions = None

    # Try to parse structured format
    summary_match = re.search(
        r"SUMMARY:\s*\n(.*?)(?=KEY POINTS:|DECISIONS:|$)", raw, re.DOTALL | re.IGNORECASE
    )
    if summary_match:
        summary = summary_match.group(1).strip()

    key_points_match = re.search(
        r"KEY POINTS:\s*\n(.*?)(?=DECISIONS:|$)", raw, re.DOTALL | re.IGNORECASE
    )
    if key_points_match:
        key_points = key_points_match.group(1).strip()

    decisions_match = re.search(
        r"DECISIONS:\s*\n(.*?)$", raw, re.DOTALL | re.IGNORECASE
    )
    if decisions_match:
        decisions = decisions_match.group(1).strip()

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


def end_meeting(
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
    turn_accumulator.flush(meeting_id)

    # 2. Collect full transcript with punctuation
    transcript_text, segments = _collect_full_transcript(db, meeting_id)

    # 3. Full task extraction with pending tasks context
    follow_up_tasks = []
    if transcript_text:
        segment_ids = [s.id for s in segments]
        pending = query_pending_tasks(db, meeting_id)
        extracted = task_extractor_service.extract(transcript_text, pending)
        if extracted:
            created = sync_extracted_tasks(
                db, meeting_id, extracted,
                source=FollowUpTaskSourceEnum.AI_FULL,
                segment_ids=segment_ids,
            )
            follow_up_tasks.extend(created)

    # 4. Generate meeting summary
    summary = None
    if transcript_text:
        summary = _generate_meeting_summary(db, meeting_id, transcript_text)

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
