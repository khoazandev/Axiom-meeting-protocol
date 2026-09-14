"""
Task Extractor Service v2 — Pending Tasks + Transcript extraction pipeline.

Implements the architecture from TASK_EXTRACTION_SPEC.md:
- Backend queries PENDING TASKS from DB
- Sends [PENDING TASKS] + [TRANSCRIPT MỚI] to LLM
- LLM returns updated pending tasks + new tasks
- Backend UPSERTs results into DB
"""

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from src.backend.core.config import get_settings
from src.backend.core.llm import generate_json
from src.backend.models import (
    FollowUpTask,
    FollowUpTaskSourceEnum,
    FollowUpTaskStatusEnum,
    User,
)

logger = logging.getLogger("axiom.task_extractor")


# ---------------------------------------------------------------------------
# Query Pending Tasks
# ---------------------------------------------------------------------------
def query_pending_tasks(db: Session, meeting_id: str) -> list[dict]:
    """
    Query incomplete tasks from DB for a meeting.

    Pending = status NOT_CONFIRMED OR assignee_id IS NULL OR deadline IS NULL.

    Returns:
        List of dicts serializable for LLM prompt:
        [{task_id, task, assignee, deadline, status}]
    """
    pending = (
        db.query(FollowUpTask)
        .filter(
            FollowUpTask.meeting_id == meeting_id,
            (
                (FollowUpTask.status == FollowUpTaskStatusEnum.NOT_CONFIRMED)
                | (FollowUpTask.assignee_id.is_(None))
                | (FollowUpTask.deadline.is_(None))
            ),
        )
        .all()
    )

    result = []
    for task in pending:
        # Resolve assignee name from relationship
        assignee_name = None
        if task.assignee_id:
            user = db.query(User).filter(User.id == task.assignee_id).first()
            if user:
                assignee_name = user.full_name

        result.append({
            "task_id": task.id,
            "task": task.title,
            "assignee": assignee_name,
            "deadline": task.deadline.strftime("%Y-%m-%d") if task.deadline else None,
            "status": task.status.value if task.status else "NOT_CONFIRMED",
        })

    logger.info("Found %d pending tasks for meeting %s", len(result), meeting_id)
    return result


# ---------------------------------------------------------------------------
# LLM Extraction Service
# ---------------------------------------------------------------------------
class TaskExtractorService:
    """Wrapper for Ollama task-extractor-v2 model (qwen3:8b based)."""

    async def extract(
        self,
        transcript_text: str,
        pending_tasks: list[dict] | None = None,
    ) -> list[dict]:
        """
        Send [PENDING TASKS] + [TRANSCRIPT MỚI] to LLM via Ollama Chat API.

        Args:
            transcript_text: Punctuated transcript text.
            pending_tasks: List of pending task dicts from query_pending_tasks().

        Returns:
            List of dicts: {task_id, task, assignee, deadline, status}
        """
        settings = get_settings()

        # (Removed openrouter_api_key check to support local AI)

        try:
            # ── Build prompt payload ──────────────────────────────────
            # Time context for relative deadline resolution
            vn_tz = timezone(timedelta(hours=7))
            now = datetime.now(vn_tz)
            time_context = (
                f"[Ngữ cảnh hệ thống: Hôm nay là ngày "
                f"{now.strftime('%d/%m/%Y')}, "
                f"{now.strftime('%H:%M')}.]\n\n"
            )

            # [A] PENDING TASKS section
            pending_section = "[A] PENDING TASKS\n"
            if pending_tasks:
                pending_section += json.dumps(pending_tasks, ensure_ascii=False, indent=2)
            else:
                pending_section += "[]"
            pending_section += "\n\n"

            # [B] TRANSCRIPT MỚI section
            transcript_section = f"[B] TRANSCRIPT MỚI\n{transcript_text}\n"

            # [C] RAG: Find similar past corrections
            corrections_section = self._build_corrections_section(transcript_text)

            system_instructions = (
                "You are an AI meeting assistant. Your task is to extract actionable follow-up tasks from the meeting transcript.\n"
                "You MUST output a valid JSON array of objects, and absolutely nothing else. Do not wrap in markdown or backticks.\n"
                "Format of each object:\n"
                "{\n"
                '  "task_id": null (if new task) or id (if updating pending task),\n'
                '  "task": "description of the task",\n'
                '  "assignee": "Name of assignee" or null,\n'
                '  "deadline": "YYYY-MM-DD" or null,\n'
                '  "status": "CONFIRMED" or "NOT_CONFIRMED",\n'
                '  "evidence_quote": "Must be an EXACT verbatim quote from the transcript representing the FINAL confirmation or agreement. Do not summarize or use intermediate discussion sentences."\n'
                "}\n\n"
            )

            # Combine
            user_content = system_instructions + time_context + pending_section + transcript_section + corrections_section

            logger.info(
                "Calling OpenRouter model fallback list (transcript=%d chars, pending=%d tasks)",
                len(transcript_text),
                len(pending_tasks) if pending_tasks else 0,
            )
            raw_response = await generate_json([settings.task_extractor_model], user_content)

            if raw_response and isinstance(raw_response, list):
                return self._validate_items(raw_response)
            
            return []

        except Exception as exc:
            logger.error("Task extraction error: %s", exc)

        return []

    def _parse_response(self, raw: str) -> list[dict]:
        """
        Parse JSON array from model response.

        Handles common formatting issues:
        - <think>...</think> tags from reasoning models
        - Markdown code blocks
        - Raw JSON arrays in text
        """
        # Strip thinking tags (qwen3 etc.)
        raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

        # Try direct parse
        try:
            result = json.loads(raw)
            if isinstance(result, list):
                return self._validate_items(result)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown code blocks
        json_match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", raw, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group(1))
                if isinstance(result, list):
                    return self._validate_items(result)
            except json.JSONDecodeError:
                pass

        # Try finding the largest valid JSON array in raw text
        start_idx = raw.find('[')
        while start_idx != -1:
            end_idx = raw.rfind(']')
            while end_idx > start_idx:
                try:
                    result = json.loads(raw[start_idx:end_idx+1])
                    if isinstance(result, list):
                        return self._validate_items(result)
                except json.JSONDecodeError:
                    end_idx = raw.rfind(']', start_idx, end_idx)
            start_idx = raw.find('[', start_idx + 1)

        logger.warning("Failed to parse task-extractor response full text:\n%s", raw)
        return []

    def _validate_items(self, items: list) -> list[dict]:
        """Validate and normalize extracted task items."""
        valid_items = []
        for item in items:
            if not isinstance(item, dict):
                continue

            task = item.get("task")
            if not task:
                continue
            task = str(task).strip()
            if not task or len(task) < 5:
                continue

            # Normalize assignee
            assignee = item.get("assignee")
            if assignee:
                assignee = str(assignee).strip()
                if assignee.lower() in ("unassigned", "null", "none", ""):
                    assignee = None

            # Normalize status
            status = item.get("status", "NOT_CONFIRMED")
            if status:
                status = str(status).strip().upper()
            if status not in ("CONFIRMED", "NOT_CONFIRMED"):
                status = "NOT_CONFIRMED"

            valid_items.append({
                "task_id": item.get("task_id"),  # None for new tasks
                "task": task[:200],
                "assignee": assignee,
                "deadline": item.get("deadline"),  # YYYY-MM-DD or null
                "status": status,
                "evidence_quote": item.get("evidence_quote", ""),
            })
        return valid_items

    def _build_corrections_section(self, transcript_text: str) -> str:
        """Build [C] section with relevant past corrections for RAG learning."""
        try:
            similar = self._find_similar_corrections(transcript_text, top_k=3)
            if not similar:
                return ""

            section = "\n[C] BÀI HỌC TỪ CÁC LẦN TRƯỚC (HÃY THAM KHẢO)\n"
            for i, corr in enumerate(similar, 1):
                section += (
                    f"\nVí dụ {i} ({corr['type']}):\n"
                    f"Transcript: {corr['snippet']}\n"
                    f"AI trả sai: {corr['ai_output']}\n"
                    f"Đáp án đúng: {corr['corrected_output']}\n"
                )
            logger.info("Injected %d RAG corrections into prompt", len(similar))
            return section
        except Exception as e:
            logger.warning("RAG correction retrieval failed: %s", e)
            return ""

    def _find_similar_corrections(
        self, transcript: str, top_k: int = 3, threshold: float = 0.65,
    ) -> list[dict]:
        """Find past corrections similar to current transcript using embeddings."""
        from src.backend.services.embedding_service import embedding_service
        from src.backend.models import ExtractionCorrection
        from src.backend.database import SessionLocal

        # Embed current transcript
        query_vec = embedding_service.embed(transcript)
        if not query_vec:
            return []

        # Query recent corrections that have embeddings
        db = SessionLocal()
        try:
            corrections = (
                db.query(ExtractionCorrection)
                .filter(ExtractionCorrection.embedding_json.isnot(None))
                .order_by(ExtractionCorrection.created_at.desc())
                .limit(100)
                .all()
            )

            if not corrections:
                return []

            # Score by cosine similarity
            scored = []
            for corr in corrections:
                try:
                    stored_vec = json.loads(corr.embedding_json)
                    sim = embedding_service.cosine_similarity(query_vec, stored_vec)
                    if sim >= threshold:
                        scored.append((sim, {
                            "snippet": corr.transcript_snippet[:200],
                            "ai_output": corr.ai_output_json,
                            "corrected_output": corr.corrected_output_json,
                            "type": corr.correction_type.value,
                        }))
                except (json.JSONDecodeError, TypeError):
                    continue

            scored.sort(key=lambda x: x[0], reverse=True)
            return [item for _, item in scored[:top_k]]
        finally:
            db.close()


# ---------------------------------------------------------------------------
# Sync (UPSERT) extracted tasks to DB
# ---------------------------------------------------------------------------
def sync_extracted_tasks(
    db: Session,
    meeting_id: str,
    extracted_items: list[dict],
    source: FollowUpTaskSourceEnum,
    segment_ids: list[str] | None = None,
    topic_id: str | None = None,
) -> list[FollowUpTask]:
    """
    Sync LLM output to database using UPSERT logic.

    - task_id exists in DB → UPDATE fields (assignee, deadline, status)
    - task_id is None → INSERT new task

    Args:
        db: Database session.
        meeting_id: Meeting ID.
        extracted_items: List of dicts from TaskExtractorService.extract().
        source: Source enum (AI_REALTIME, AI_FULL, MANUAL).
        segment_ids: Optional list of transcript segment IDs for linking.

    Returns:
        List of created/updated FollowUpTask objects.
    """
    affected_tasks = []
    linked_segment_id = segment_ids[0] if segment_ids else None

    for item_data in extracted_items:
        task_title = item_data.get("task")
        if not task_title:
            continue
        task_title = str(task_title).strip()
        if not task_title or len(task_title) < 5:
            continue

        task_id = item_data.get("task_id")

        # Resolve assignee name → user ID
        assignee_name = item_data.get("assignee")
        assignee_id = None
        if assignee_name:
            assignee_name = str(assignee_name).strip()
            user = (
                db.query(User)
                .filter(User.full_name.ilike(f"%{assignee_name}%"))
                .first()
            )
            # Nếu không tìm thấy, thử tìm ngược lại (tên db nằm trong chuỗi assignee_name)
            if not user:
                users = db.query(User).all()
                for u in users:
                    if u.full_name.lower() in assignee_name.lower() or assignee_name.lower() in u.full_name.lower():
                        user = u
                        break
            if user:
                assignee_id = user.id
                logger.info("Matched assignee '%s' → user_id=%s (%s)", assignee_name, user.id, user.full_name)

        # Parse status
        status_str = item_data.get("status", "NOT_CONFIRMED")
        task_status = (
            FollowUpTaskStatusEnum.CONFIRMED
            if status_str == "CONFIRMED"
            else FollowUpTaskStatusEnum.NOT_CONFIRMED
        )

        # Parse deadline
        deadline = None
        deadline_str = item_data.get("deadline")
        if deadline_str:
            try:
                deadline = datetime.strptime(str(deadline_str), "%Y-%m-%d")
            except (ValueError, TypeError):
                logger.warning("Cannot parse deadline: %s", deadline_str)

        # ── Find current topic if not explicitly provided ──────────────────
        active_topic_id = topic_id
        if not active_topic_id:
            # We can look up the IN_PROGRESS topic for this meeting
            from src.backend.models import Topic, TopicStatusEnum
            active_topic = db.query(Topic).filter(Topic.meeting_id == meeting_id, Topic.status == TopicStatusEnum.IN_PROGRESS).first()
            if active_topic:
                active_topic_id = active_topic.id

        # ── UPSERT logic ──────────────────────────────────────────
        evidence_quote = item_data.get("evidence_quote")
        if evidence_quote:
            import re
            # Strip potential speaker name prefix like "Khoa: " or "Trang : " or "Nguyên-"
            evidence_quote = re.sub(r"^[\w\s]+:\s*", "", evidence_quote).strip()

        if task_id:
            # UPDATE existing task
            existing = (
                db.query(FollowUpTask)
                .filter(
                    FollowUpTask.id == task_id,
                    FollowUpTask.meeting_id == meeting_id,
                )
                .first()
            )
            if existing:
                existing.title = task_title
                if assignee_id:
                    existing.assignee_id = assignee_id
                if deadline:
                    existing.deadline = deadline
                if evidence_quote:
                    existing.evidence_quote = evidence_quote
                existing.status = task_status
                # Optionally update topic if it's currently null
                if not existing.topic_id and active_topic_id:
                    existing.topic_id = active_topic_id
                affected_tasks.append(existing)
                logger.info("Updated task %s: status=%s, assignee_id=%s", task_id, task_status.value, assignee_id)
            else:
                logger.warning("task_id=%s not found in meeting %s, skipping update", task_id, meeting_id)
        else:
            # INSERT new task
            task = FollowUpTask(
                meeting_id=meeting_id,
                topic_id=active_topic_id,
                transcript_segment_id=linked_segment_id,
                assignee_id=assignee_id,
                title=task_title,
                description=None,
                status=task_status,
                deadline=deadline,
                source=source,
                evidence_quote=evidence_quote,
            )
            db.add(task)
            affected_tasks.append(task)
            logger.info("Created new task: '%s' (assignee=%s, status=%s)", task_title, assignee_name, task_status.value)

    if affected_tasks:
        db.commit()
        for task in affected_tasks:
            db.refresh(task)
        logger.info(
            "Synced %d follow-up tasks for meeting %s (source=%s)",
            len(affected_tasks),
            meeting_id,
            source.value,
        )

    return affected_tasks


# Global singleton instance
task_extractor_service = TaskExtractorService()
