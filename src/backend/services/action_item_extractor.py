"""
Action Item Extractor — AI pipeline to auto-extract action items from transcripts.

All config (model, prompts, timeouts) loaded from Settings (env vars).
Pipeline: Collect transcript → PM-style prompt → Parse structured output → Save ActionItems.
"""

import json
import logging
import re
from typing import Optional

import requests
from sqlalchemy.orm import Session

from src.backend.core.config import get_settings
from src.backend.models import FollowUpTask, FollowUpTaskStatusEnum, TranscriptSegment, User

logger = logging.getLogger("axiom.action_extractor")


# ── Heuristic Patterns (fallback when LLM offline) ───

_ACTION_PATTERNS = [
    # Vietnamese: (owner, task) or (task)
    (r"([A-ZÀ-Ỹ]\w+)\s+(?:cần|phải|sẽ)\s+(.{10,120})", None),
    (r"(?:anh|chị|bạn)\s+([A-ZÀ-Ỹ]\w+)\s+(?:sẽ|cần|phải|hãy)\s+(.{10,120})", None),
    (r"(?:cần\s+(?:phải\s+)?|hãy\s+|phải\s+)(.{10,120})", "Unassigned"),
    # English: (owner, task) or (task)
    (r"([A-Z]\w+)\s+(?:will|should|needs?\s+to|must|is\s+going\s+to)\s+(.{10,120})", None),
    (r"(?:please|pls)\s+(.{10,120})", "Unassigned"),
    (r"(?:TODO|ACTION|FIXME)[:\s]+(.{10,120})", "Unassigned"),
    (r"(?:need|needs)\s+to\s+(.{10,120})", "Unassigned"),
    (r"(?:let'?s|we\s+should)\s+(.{10,120})", "Unassigned"),
]

USER_PROMPT_TEMPLATE = """Extract all action items from this meeting transcript:

<transcript>
{transcript}
</transcript>"""


# ── Core Functions ────────────────────────────────────


def collect_transcript_text(db: Session, meeting_id: str, limit: int | None = None) -> str:
    """Collect transcript segments for a meeting, ordered by sequence."""
    query = db.query(TranscriptSegment).filter(TranscriptSegment.meeting_id == meeting_id)

    if limit is not None:
        segments = query.order_by(TranscriptSegment.sequence.desc()).limit(limit).all()
        segments.reverse()  # Keep chronological order
    else:
        segments = query.order_by(TranscriptSegment.sequence).all()

    if not segments:
        return ""

    lines = []
    for seg in segments:
        speaker = "Speaker"
        if seg.speaker_id:
            user = db.query(User).filter(User.id == seg.speaker_id).first()
            if user:
                speaker = user.full_name
        lines.append(f"[{speaker}]: {seg.content}")

    return "\n".join(lines)


def _chunk_transcript(text: str) -> list[str]:
    """Split long transcript into chunks that fit LLM context window."""
    settings = get_settings()
    max_chars = settings.extraction_max_transcript_chars

    if len(text) <= max_chars:
        return [text]

    chunks = []
    lines = text.split("\n")
    current_chunk: list[str] = []
    current_len = 0

    for line in lines:
        line_len = len(line) + 1
        if current_len + line_len > max_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
            current_len = 0
        current_chunk.append(line)
        current_len += line_len

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks


def _call_ollama_extraction(transcript_text: str) -> list[dict] | None:
    """Call Ollama LLM to extract action items from transcript."""
    settings = get_settings()

    if not settings.ollama_base_url:
        return None

    user_prompt = USER_PROMPT_TEMPLATE.format(transcript=transcript_text)
    from src.backend.services.ollama_service import get_active_model
    model_to_use = get_active_model() or settings.extraction_model

    try:
        response = requests.post(
            f"{settings.ollama_base_url.rstrip('/')}/api/generate",
            json={
                "model": model_to_use,
                "system": settings.extraction_system_prompt,
                "prompt": user_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.9,
                    "num_predict": 1500,
                },
            },
            timeout=settings.extraction_timeout,
        )
        response.raise_for_status()
        raw = response.json().get("response", "").strip()
        return _parse_llm_json(raw)

    except requests.exceptions.ConnectionError:
        logger.warning("Ollama not reachable for action item extraction")
    except requests.exceptions.Timeout:
        logger.warning("Ollama timeout during action item extraction")
    except Exception as exc:
        logger.error("Ollama extraction error: %s", exc)

    return None


def _parse_llm_json(raw: str) -> list[dict] | None:
    """Parse JSON array from LLM response, handling common formatting issues."""
    # Strip thinking tags from qwen3 (<think>...</think>)
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

    # Try direct parse
    try:
        result = json.loads(raw)
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code blocks
    json_match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", raw, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding array in raw text
    array_match = re.search(r"\[.*\]", raw, re.DOTALL)
    if array_match:
        try:
            return json.loads(array_match.group(0))
        except json.JSONDecodeError:
            pass

    logger.warning("Failed to parse LLM extraction response: %s", raw[:300])
    return None


def _heuristic_extraction(transcript_text: str) -> list[dict]:
    """Fallback: extract action items using keyword patterns when LLM is offline."""
    items = []
    seen = set()

    for pattern, default_owner in _ACTION_PATTERNS:
        for match in re.finditer(pattern, transcript_text, re.IGNORECASE | re.UNICODE):
            groups = match.groups()
            if default_owner is None and len(groups) >= 2:
                owner = groups[0].strip()
                task = groups[1].strip().rstrip(".,;:!?")
            else:
                owner = default_owner or "Unassigned"
                task = groups[0].strip().rstrip(".,;:!?")

            if task.lower() in seen or len(task) < 10:
                continue
            seen.add(task.lower())

            items.append(
                {
                    "task": task[:120],
                    "owner": owner,
                    "due_date": "Not specified",
                    "priority": "MEDIUM",
                    "status": "TODO",
                }
            )

    return items


def extract_action_items(
    db: Session,
    meeting_id: str,
    triggered_by: Optional[str] = None,
    micro_batch_limit: int | None = None,
) -> list[dict]:
    """
    Main extraction pipeline.

    1. Collect transcript segments from DB
    2. Try LLM extraction via Ollama (model from Settings)
    3. Fallback to heuristic if LLM unavailable
    4. Save results to action_items table

    Returns list of extracted action item dicts with task/owner/due_date/priority/status.
    """
    transcript_text = collect_transcript_text(db, meeting_id, limit=micro_batch_limit)
    if not transcript_text:
        logger.info("No transcript for meeting %s, skipping extraction", meeting_id)
        return []

    logger.info(
        "Extracting action items from meeting %s (%d chars transcript)",
        meeting_id,
        len(transcript_text),
    )

    all_extracted: list[dict] = []
    chunks = _chunk_transcript(transcript_text)

    for i, chunk in enumerate(chunks):
        logger.info("Processing chunk %d/%d (%d chars)", i + 1, len(chunks), len(chunk))

        llm_result = _call_ollama_extraction(chunk)
        if llm_result is not None:
            all_extracted.extend(llm_result)
        else:
            logger.info("LLM unavailable, using heuristic fallback for chunk %d", i + 1)
            all_extracted.extend(_heuristic_extraction(chunk))

    if not all_extracted:
        logger.info("No action items extracted from meeting %s", meeting_id)
        return []

    # Save to database (deduplicate)
    created_items = []
    for item_data in all_extracted:
        task = item_data.get("task", "").strip()
        if not task or len(task) < 5:
            continue

        owner = item_data.get("owner", "Unassigned").strip()
        due_date = item_data.get("due_date", "Not specified").strip()
        priority = item_data.get("priority", "MEDIUM").strip().upper()
        if priority not in ("HIGH", "MEDIUM", "LOW"):
            priority = "MEDIUM"

        # Skip duplicates
        existing = (
            db.query(FollowUpTask)
            .filter(FollowUpTask.meeting_id == meeting_id, FollowUpTask.title == task)
            .first()
        )
        if existing:
            continue

        description = f"Owner: {owner}\nDue: {due_date}\nPriority: {priority}"
        if item_data.get("description"):
            description += f"\nContext: {item_data['description']}"

        action_item = FollowUpTask(
            meeting_id=meeting_id,
            title=task,
            description=description,
            status=FollowUpTaskStatusEnum.NOT_CONFIRMED,
        )
        db.add(action_item)

        created_items.append(
            {
                "task": task,
                "owner": owner,
                "due_date": due_date,
                "priority": priority,
                "status": "TODO",
            }
        )

    if created_items:
        db.commit()
        logger.info("Extracted %d action items from meeting %s", len(created_items), meeting_id)

    return created_items
