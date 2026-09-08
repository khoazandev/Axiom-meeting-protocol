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

import requests
from sqlalchemy.orm import Session

from src.backend.core.config import get_settings
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

    def extract(
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

        if not settings.ollama_base_url:
            logger.info("Ollama base URL not configured, using heuristic NLP fallback")
            return self._heuristic_rule_extraction(transcript_text, pending_tasks)

        base_url = settings.ollama_base_url.rstrip("/")
        timeout = min(settings.task_extractor_timeout, 12) if ("host.docker.internal" in base_url or "localhost" in base_url) else settings.task_extractor_timeout

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

            # Combine
            user_content = time_context + pending_section + transcript_section + corrections_section

            from src.backend.services.ollama_service import get_active_model
            model_to_use = get_active_model() or settings.task_extractor_model

            if "task-extractor" not in model_to_use:
                user_content += (
                    "\n\n[YÊU CẦU ĐẶC BIỆT: Hãy trích xuất tất cả action items và TRẢ VỀ DUY NHẤT MỘT JSON ARRAY HỢP LỆ. "
                    'Cấu trúc: [{"task": "Mô tả ngắn gọn việc cần làm", "assignee": "Tên người phụ trách", "deadline": "YYYY-MM-DD", "status": "TODO"}]. '
                    "TUYỆT ĐỐI KHÔNG VIẾT ĐOẠN VĂN ĐÀM THOẠI HAY GIẢI THÍCH, CHỈ TRẢ VỀ JSON ARRAY.]"
                )

            payload = {
                "model": model_to_use,
                "messages": [
                    {"role": "user", "content": user_content},
                ],
                "stream": False,
                "options": {"temperature": 0.0, "top_p": 0.1},
            }

            logger.info(
                "Calling Ollama chat model=%s (timeout=%ds, transcript=%d chars, pending=%d tasks)",
                model_to_use,
                timeout,
                len(transcript_text),
                len(pending_tasks) if pending_tasks else 0,
            )
            response = requests.post(
                f"{base_url}/api/chat", json=payload, timeout=timeout,
            )
            response.raise_for_status()
            msg = response.json().get("message", {})
            content = msg.get("content", "").strip()
            thinking = msg.get("thinking", "").strip()

            raw = content or thinking
            if raw:
                parsed = self._parse_response(raw)
                if parsed:
                    return parsed
            logger.info("Model returned empty or unparseable response, falling back to heuristic rule extraction")
            return self._heuristic_rule_extraction(transcript_text, pending_tasks)

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
            logger.info("Ollama unreachable or timed out (%s), using robust heuristic NLP extractor", exc)
            return self._heuristic_rule_extraction(transcript_text, pending_tasks)
        except Exception as exc:
            logger.warning("Task extraction exception: %s, falling back to heuristic extractor", exc)
            return self._heuristic_rule_extraction(transcript_text, pending_tasks)

    def _parse_relative_deadline(self, text: str) -> str | None:
        """Parse natural language relative deadlines into ISO YYYY-MM-DD format."""
        now = datetime.now()
        text_lower = text.lower()
        days_map = {
            "thứ hai": 0, "thứ 2": 0, "t2": 0, "monday": 0,
            "thứ ba": 1, "thứ 3": 1, "t3": 1, "tuesday": 1,
            "thứ tư": 2, "thứ 4": 2, "t4": 2, "wednesday": 2,
            "thứ năm": 3, "thứ 5": 3, "t5": 3, "thursday": 3,
            "thứ sáu": 4, "thứ 6": 4, "t6": 4, "friday": 4,
            "thứ bảy": 5, "thứ 7": 5, "t7": 5, "saturday": 5,
            "chủ nhật": 6, "cn": 6, "sunday": 6,
        }
        is_next_week = any(w in text_lower for w in ["tuần sau", "tuần tới", "next week"])
        for day_str, target_weekday in days_map.items():
            if day_str in text_lower:
                current_weekday = now.weekday()
                days_ahead = target_weekday - current_weekday
                if is_next_week:
                    days_ahead += 7
                elif days_ahead <= 0:
                    days_ahead += 7
                target_date = now + timedelta(days=days_ahead)
                return target_date.strftime("%Y-%m-%d")

        if any(w in text_lower for w in ["hôm nay", "chiều nay", "tối nay", "today"]):
            return now.strftime("%Y-%m-%d")
        if any(w in text_lower for w in ["ngày mai", "sáng mai", "tomorrow"]):
            return (now + timedelta(days=1)).strftime("%Y-%m-%d")
        if "ngày kia" in text_lower:
            return (now + timedelta(days=2)).strftime("%Y-%m-%d")
        if any(w in text_lower for w in ["tuần sau", "tuần tới"]):
            return (now + timedelta(days=7)).strftime("%Y-%m-%d")
        return None

    def _clean_task_title(self, raw: str) -> str:
        """Strip filler words, vocatives, and trailing particles from task titles."""
        t = raw.strip()
        t = re.sub(r"^(?:em\s+|anh\s+|chị\s+)?(?:hãy|cần|phải|nhớ|sẽ|lo việc|giúp anh|giúp sếp|vui lòng|please)\s+", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s+(?:trước|vào|trong|đến|hạn|deadline)?\s*(?:thứ\s+[2-7]|thứ\s+[a-zà-ỹ]+|chủ nhật|ngày mai|hôm nay|chiều nay|sáng mai|tuần sau|tuần tới).*$", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s+(?:nhé|nha|ạ|nhé\s+ạ|nhé\s+em|cho\s+anh|cho\s+sếp|đúng\s+hạn\s+ạ|đúng\s+hạn).*$", "", t, flags=re.IGNORECASE)
        t = t.strip(" ,;:.()")
        if t:
            t = t[0].upper() + t[1:]
        return t

    def _heuristic_rule_extraction(
        self,
        transcript_text: str,
        pending_tasks: list[dict] | None = None,
    ) -> list[dict]:
        """
        Meeting-grade NLP extractor for Vietnamese & English meetings.
        Correctly extracts tasks, assignees, deadlines, and status from speech turns.
        """
        lines = [l.strip() for l in transcript_text.split("\n") if l.strip()]
        extracted = []
        seen_titles = set()

        for line in lines:
            speaker = ""
            content = line
            m_spk = re.match(r"^\[(.*?)\]\s*:\s*(.*)$", line)
            if m_spk:
                speaker = m_spk.group(1).strip()
                content = m_spk.group(2).strip()

            target_assignee = None
            raw_task = None
            is_confirmed = False

            # 1. Vocative directive: "Alice, em hãy...", "Bob, em hãy...", "Anh Nam cần..."
            m_voc = re.search(
                r"([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)?)[,\s]+(?:em|anh|chị|bạn)?\s*(?:hãy|cần|phải|nhớ|chịu trách nhiệm|lo việc|giúp anh|giúp sếp|vui lòng)\s+(.*?)(?=[.!?]|$)",
                content,
                re.IGNORECASE,
            )
            if m_voc:
                target_assignee = m_voc.group(1).strip()
                raw_task = m_voc.group(2).strip()

            # 2. Speaker commitment: "Em sẽ làm việc với team...", "Tôi sẽ chuẩn bị..."
            if not raw_task:
                m_commit = re.search(
                    r"(?:em|tôi|mình|anh|chị|chúng tôi)\s+(?:sẽ|cam kết|đang nhận việc|sẽ chịu trách nhiệm)\s+(.*?)(?=[.!?]|$)",
                    content,
                    re.IGNORECASE,
                )
                if m_commit and speaker:
                    cand = m_commit.group(1).strip()
                    if any(w in cand.lower() for w in ["hoàn thành", "làm đúng hạn", "gửi đúng hạn", "rõ rồi"]):
                        is_confirmed = True
                    else:
                        target_assignee = speaker
                        raw_task = cand

            # 3. Team directive: "Mọi người nhớ...", "Cả team cần..."
            if not raw_task:
                m_team = re.search(
                    r"(?:mọi người|cả team|toàn đội|các bạn|everyone|team)\s+(?:nhớ|cần|phải|hãy)\s+(.*?)(?=[.!?]|$)",
                    content,
                    re.IGNORECASE,
                )
                if m_team:
                    target_assignee = "Mọi người"
                    raw_task = m_team.group(1).strip()

            # 4. Fallback directive pattern: "cần phải...", "hãy lập kế hoạch..."
            if not raw_task:
                m_dir = re.search(
                    r"(?:cần\s+phải|hãy\s+hoàn thành|hãy\s+lập|hãy\s+triển khai|cần\s+triển khai)\s+(.*?)(?=[.!?]|$)",
                    content,
                    re.IGNORECASE,
                )
                if m_dir:
                    target_assignee = speaker or "Unassigned"
                    raw_task = m_dir.group(1).strip()

            if raw_task and len(raw_task) >= 6:
                if any(w in raw_task.lower() for w in ["chào mọi người", "cuộc họp kết thúc", "cảm ơn mọi người"]):
                    continue

                cleaned = self._clean_task_title(raw_task)
                if len(cleaned) < 5:
                    continue

                deadline_val = self._parse_relative_deadline(content)
                key = cleaned.lower()[:35]
                if key not in seen_titles:
                    seen_titles.add(key)
                    extracted.append({
                        "task_id": None,
                        "task": cleaned,
                        "assignee": target_assignee,
                        "deadline": deadline_val,
                        "status": "CONFIRMED" if is_confirmed else "NOT_CONFIRMED",
                    })

        # Match with pending tasks if available
        if pending_tasks and extracted:
            for item in extracted:
                for p in pending_tasks:
                    p_title = (p.get("task") or "").lower()
                    if p.get("task_id") and (item["task"].lower()[:20] in p_title or p_title[:20] in item["task"].lower()):
                        item["task_id"] = p["task_id"]
                        break

        logger.info("Heuristic NLP extractor extracted %d tasks from transcript", len(extracted))
        return extracted

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
                .filter(
                    (User.full_name == assignee_name)
                    | (User.full_name.ilike(f"%{assignee_name}%"))
                    | (User.email.ilike(f"%{assignee_name}%"))
                )
                .first()
            )
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

        # Build clean description with assignee name preserved
        desc = f"Phân công cho: {assignee_name or 'Chưa phân bổ'}"
        if deadline:
            desc += f" | Hạn chót: {deadline.strftime('%d/%m/%Y')}"

        # ── UPSERT logic ──────────────────────────────────────────
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
                existing.status = task_status
                if desc and not existing.description:
                    existing.description = desc
                affected_tasks.append(existing)
                logger.info("Updated task %s: status=%s, assignee_id=%s", task_id, task_status.value, assignee_id)
            else:
                logger.warning("task_id=%s not found in meeting %s, skipping update", task_id, meeting_id)
        else:
            # Check duplicate by title prefix in meeting
            existing_dupe = (
                db.query(FollowUpTask)
                .filter(
                    FollowUpTask.meeting_id == meeting_id,
                    FollowUpTask.title.ilike(f"%{task_title[:25]}%"),
                )
                .first()
            )
            if existing_dupe:
                if assignee_id and not existing_dupe.assignee_id:
                    existing_dupe.assignee_id = assignee_id
                if deadline and not existing_dupe.deadline:
                    existing_dupe.deadline = deadline
                if task_status == FollowUpTaskStatusEnum.CONFIRMED:
                    existing_dupe.status = task_status
                affected_tasks.append(existing_dupe)
                continue

            # INSERT new task
            task = FollowUpTask(
                meeting_id=meeting_id,
                transcript_segment_id=linked_segment_id,
                assignee_id=assignee_id,
                title=task_title,
                description=desc,
                status=task_status,
                deadline=deadline,
                source=source,
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
