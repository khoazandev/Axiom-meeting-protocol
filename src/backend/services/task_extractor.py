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
import unicodedata
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
        host_manager_names: list[str] | None = None,
    ) -> list[dict]:
        """
        Send [PENDING TASKS] + [TRANSCRIPT MỚI] to LLM via Ollama Chat API.

        Args:
            transcript_text: Punctuated transcript text.
            pending_tasks: List of pending task dicts from query_pending_tasks().
            host_manager_names: List of names of host and managers authorized to give tasks.

        Returns:
            List of dicts: {task_id, task, speaker, assignee, deadline, status}
        """
        settings = get_settings()

        if not settings.ollama_base_url:
            logger.info("Ollama base URL not configured, using heuristic NLP fallback")
            return self._heuristic_rule_extraction(transcript_text, pending_tasks, host_manager_names)

        base_url = settings.ollama_base_url.rstrip("/")
        raw_to = getattr(settings, "task_extractor_timeout", 30)
        timeout = min(raw_to, 12) if ("host.docker.internal" in base_url or "localhost" in base_url) else raw_to

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

            # [D] Host & Management Authority Instructions
            host_rule = ""
            if host_manager_names:
                host_list_str = ", ".join(host_manager_names)
                host_rule = (
                    f"\n[QUY TẮC PHÂN QUYỀN GIAO VIỆC & CẤU TRÚC ACTION ITEM]:\n"
                    f"- CHỈ trích xuất Action Item từ lời nói của Người chủ trì cuộc họp (Host) hoặc cấp Quản lý: {host_list_str}.\n"
                    f"- Lời nói của nhân viên / thành viên thông thường KHÔNG ĐƯỢC trích xuất thành Action Item.\n"
                    f"- Dòng 1 (Người giao việc): Điền vào trường 'speaker' tên người nói/giao việc.\n"
                    f"- Dòng 2 (Tên task đầy đủ): Điền vào trường 'task' tên công việc cụ thể, đầy đủ.\n"
                    f"- Thành viên (assignee): CHỈ gán tên người phụ trách NẾU người nói có chỉ định đích danh (ví dụ: 'Khoa em làm...', 'Nam chịu trách nhiệm...'). Nếu người nói KHÔNG chỉ định ai làm, bắt buộc trả về null.\n"
                    f"- Thời gian (deadline): CHỈ điền ngày hoàn thành dạng 'YYYY-MM-DD' NẾU người nói có đề cập thời hạn (ví dụ: 'trước thứ Sáu', 'trong 3 ngày'). Nếu người nói KHÔNG đề cập thời hạn, bắt buộc trả về null.\n"
                )

            # Combine
            user_content = time_context + pending_section + transcript_section + corrections_section + host_rule

            model_to_use = settings.task_extractor_model

            if "task-extractor" not in model_to_use:
                user_content += (
                    "\n\n[YÊU CẦU ĐẶC BIỆT: Hãy trích xuất tất cả action items và TRẢ VỀ DUY NHẤT MỘT JSON ARRAY HỢP LỆ. "
                    'Cấu trúc: [{"task": "Tên task đầy đủ", "speaker": "Tên người nói / giao việc", "assignee": "Tên người phụ trách (hoặc null)", "deadline": "YYYY-MM-DD (hoặc null)", "status": "CONFIRMED"}]. '
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
            parsed = []
            if raw:
                parsed = self._parse_response(raw)

            # Heuristic extraction as high-precision Vietnamese complement
            heuristic_items = self._heuristic_rule_extraction(
                transcript_text, pending_tasks, host_manager_names
            )

            if not parsed:
                logger.info("Model returned empty or unparseable response, using heuristic rule extraction (%d items)", len(heuristic_items))
                return heuristic_items

            # Hybrid refinement: fill missing assignee / deadline from heuristic
            for p_item in parsed:
                p_task = (p_item.get("task") or "").lower()
                for h_item in heuristic_items:
                    h_task = (h_item.get("task") or "").lower()
                    words_p = set(p_task.split())
                    words_h = set(h_task.split())
                    if len(words_p.intersection(words_h)) >= 1 or p_task in h_task or h_task in p_task:
                        if not p_item.get("assignee") and h_item.get("assignee"):
                            p_item["assignee"] = h_item["assignee"]
                        if h_item.get("deadline"):
                            p_item["deadline"] = h_item["deadline"]
                        if h_item.get("evidence_quote") and not p_item.get("evidence_quote"):
                            p_item["evidence_quote"] = h_item["evidence_quote"]
                        break

            # Append any confident heuristic task not covered by LLM
            for h_item in heuristic_items:
                h_task = (h_item.get("task") or "").lower()
                words_h = set(h_task.split())
                already_covered = any(
                    len(words_h.intersection(set((p.get("task") or "").lower().split()))) >= 2
                    or (p.get("task") or "").lower() in h_task
                    or h_task in (p.get("task") or "").lower()
                    for p in parsed
                )
                if not already_covered:
                    parsed.append(h_item)

            return parsed

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
            logger.info("Ollama unreachable or timed out (%s), using robust heuristic NLP extractor", exc)
            return self._heuristic_rule_extraction(transcript_text, pending_tasks, host_manager_names)
        except Exception as exc:
            logger.warning("Task extraction exception: %s, falling back to heuristic extractor", exc)
            return self._heuristic_rule_extraction(transcript_text, pending_tasks, host_manager_names)

    def _parse_relative_deadline(self, text: str) -> str | None:
        """Parse natural language relative deadlines into ISO YYYY-MM-DD format."""
        now = datetime.now()
        text_lower = text.lower()

        # 1. Explicit calendar date: "ngày 30/09", "30/09/2026", "15-10"
        m_slash = re.search(r"(?:ngày\s+)?(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{4}))?", text_lower)
        if m_slash:
            try:
                d = int(m_slash.group(1))
                m = int(m_slash.group(2))
                y = int(m_slash.group(3)) if m_slash.group(3) else now.year
                if 1 <= d <= 31 and 1 <= m <= 12:
                    target_date = datetime(y, m, d)
                    if target_date.date() < now.date() and not m_slash.group(3):
                        target_date = datetime(y + 1, m, d)
                    return target_date.strftime("%Y-%m-%d")
            except (ValueError, OverflowError):
                pass

        # 2. Text month date: "ngày 15 tháng 10", "30 tháng 9 năm 2026"
        m_month = re.search(r"(?:ngày\s+)?(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(\d{4}))?", text_lower)
        if m_month:
            try:
                d = int(m_month.group(1))
                m = int(m_month.group(2))
                y = int(m_month.group(3)) if m_month.group(3) else now.year
                if 1 <= d <= 31 and 1 <= m <= 12:
                    target_date = datetime(y, m, d)
                    if target_date.date() < now.date() and not m_month.group(3):
                        target_date = datetime(y + 1, m, d)
                    return target_date.strftime("%Y-%m-%d")
            except (ValueError, OverflowError):
                pass

        # 3. Relative span: "trong 3 ngày", "sau 2 ngày"
        m_days = re.search(r"(?:trong|sau)\s+(?:vòng\s+)?(\d+)\s+ngày", text_lower)
        if m_days:
            try:
                offset = int(m_days.group(1))
                return (now + timedelta(days=offset)).strftime("%Y-%m-%d")
            except (ValueError, OverflowError):
                pass

        # 4. Day of week mapping
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

        # 5. Natural phrases
        if any(w in text_lower for w in ["hôm nay", "chiều nay", "tối nay", "today"]):
            return now.strftime("%Y-%m-%d")
        if any(w in text_lower for w in ["ngày mai", "sáng mai", "tomorrow"]):
            return (now + timedelta(days=1)).strftime("%Y-%m-%d")
        if "ngày kia" in text_lower:
            return (now + timedelta(days=2)).strftime("%Y-%m-%d")
        if any(w in text_lower for w in ["cuối tuần"]):
            days_ahead = 4 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (now + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        if any(w in text_lower for w in ["cuối tháng"]):
            import calendar
            _, last_day = calendar.monthrange(now.year, now.month)
            return datetime(now.year, now.month, last_day).strftime("%Y-%m-%d")
        if any(w in text_lower for w in ["tuần sau", "tuần tới"]):
            return (now + timedelta(days=7)).strftime("%Y-%m-%d")
        return None

    def _clean_task_title(self, raw: str) -> str:
        """Strip filler words, vocatives, and trailing particles from task titles."""
        t = raw.strip()
        t = re.sub(r"^(?:em\s+|anh\s+|chị\s+)?(?:hãy|cần|phải|nhớ|sẽ|lo việc|giúp anh|giúp sếp|vui lòng|please)\s+", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s+(?:trước|vào|trong|đến|hạn|deadline)?\s*(?:thứ\s+[2-7]|thứ\s+[a-zà-ỹ]+|chủ nhật|ngày mai|hôm nay|chiều nay|sáng mai|tuần sau|tuần tới|ngày\s+\d+|cuối\s+tuần|cuối\s+tháng).*$", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s+(?:nhé|nha|ạ|nhé\s+ạ|nhé\s+em|cho\s+anh|cho\s+sếp|đúng\s+hạn\s+ạ|đúng\s+hạn).*$", "", t, flags=re.IGNORECASE)
        t = t.strip(" ,;:.()")
        if t:
            t = t[0].upper() + t[1:]
        return t

    def _heuristic_rule_extraction(
        self,
        transcript_text: str,
        pending_tasks: list[dict] | None = None,
        host_manager_names: list[str] | None = None,
    ) -> list[dict]:
        """
        Meeting-grade NLP extractor for Vietnamese & English meetings.
        Only allows Host and Management roles to assign tasks.
        Assignee and Deadline are only set if explicitly mentioned by the speaker.
        """
        lines = [l.strip() for l in transcript_text.split("\n") if l.strip()]
        extracted = []
        seen_titles = set()

        default_host_name = host_manager_names[0] if (host_manager_names and len(host_manager_names) > 0) else "Chủ tọa cuộc họp"

        for line in lines:
            speaker = ""
            content = line
            m_spk = re.match(r"^\[(.*?)\]\s*:\s*(.*)$", line)
            if m_spk:
                speaker = m_spk.group(1).strip()
                content = m_spk.group(2).strip()
            else:
                m_spk2 = re.match(r"^([^:\[\]\n]{2,40})\s*:\s*(.*)$", line)
                if m_spk2:
                    speaker = m_spk2.group(1).strip()
                    content = m_spk2.group(2).strip()

            # Check for acknowledgment / confirmation from speaker
            is_ack = bool(re.search(
                r"^(?:dạ|vâng|ok|dạ vâng|dạ anh|dạ chị|vâng anh|vâng chị|rõ rồi|nhất trí|được rồi|em làm ngay|để em làm|để em xử lý)",
                content,
                re.IGNORECASE,
            ))
            if is_ack and speaker:
                speaker_norm = speaker.strip().lower()
                for task_entry in reversed(extracted):
                    assignee_str = (task_entry.get("assignee") or "").lower()
                    if assignee_str and (assignee_str in speaker_norm or speaker_norm in assignee_str):
                        task_entry["status"] = "CONFIRMED"
                        break
                continue

            # Authority check: Only host or management can assign action items
            if host_manager_names and speaker:
                speaker_norm = speaker.strip().lower()
                is_authorized = any(
                    (h.lower() in speaker_norm or speaker_norm in h.lower())
                    for h in host_manager_names
                ) or any(
                    title in speaker_norm
                    for title in ["host", "chủ tọa", "quản lý", "manager", "admin", "owner", "sếp", "lead"]
                )
                if not is_authorized:
                    # Regular member speeches are not action items
                    continue

            target_assignee = None
            raw_task = None
            is_confirmed = False

            # 1. Vocative directive with action verbs: "Khoa ơi, em viết...", "Alice, check giúp...", "Nam, triển khai..."
            m_voc = re.search(
                r"([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)*?)\s*(?:,\s*|\s+)(?:ơi|nè|nhé)?\s*[,\s]*(?:em|anh|chị|bạn)?\s*(?:hãy|cần|phải|nhớ|chịu trách nhiệm|lo việc|giúp anh|giúp sếp|vui lòng)?\s*((?:làm|viết|chuẩn bị|tạo|sửa|cập nhật|update|deploy|kiểm tra|check|báo cáo|report|gửi|phụ trách|triển khai|lập|hỗ trợ|cấu hình|setup|hoàn thiện|soạn|review|tổng hợp).+?)(?=[.!?]|$)",
                content,
                re.IGNORECASE,
            )
            if m_voc:
                target_assignee = m_voc.group(1).strip()
                raw_task = m_voc.group(2).strip()

            # 1b. Vocative directive: "Alice, em hãy...", "Bob, em hãy...", "Anh Nam cần..."
            if not raw_task:
                m_voc2 = re.search(
                    r"([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)?)[,\s]+(?:ơi|nè)?\s*(?:em|anh|chị|bạn)?\s*(?:hãy|cần|phải|nhớ|chịu trách nhiệm|lo việc|giúp anh|giúp sếp|vui lòng)\s+(.*?)(?=[.!?]|$)",
                    content,
                    re.IGNORECASE,
                )
                if m_voc2:
                    target_assignee = m_voc2.group(1).strip()
                    raw_task = m_voc2.group(2).strip()

            if target_assignee:
                target_assignee = re.sub(r"^(?:còn|và|nhờ|giao cho|phần|bên)\s+", "", target_assignee, flags=re.IGNORECASE).strip()
                target_assignee = re.sub(r"^(?:anh|chị|em|bạn)\s+", "", target_assignee, flags=re.IGNORECASE).strip()

            # 2. Speaker commitment: "Tôi sẽ...", "Anh sẽ chuẩn bị..."
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
                    # Not assigned to a specific individual
                    target_assignee = None
                    raw_task = m_team.group(1).strip()

            # 4. Fallback directive pattern: "cần phải...", "hãy lập kế hoạch..."
            if not raw_task:
                m_dir = re.search(
                    r"(?:cần\s+phải|hãy\s+hoàn thành|hãy\s+lập|hãy\s+triển khai|cần\s+triển khai)\s+(.*?)(?=[.!?]|$)",
                    content,
                    re.IGNORECASE,
                )
                if m_dir:
                    # Not assigned unless explicitly mentioned
                    target_assignee = None
                    raw_task = m_dir.group(1).strip()

            if raw_task and len(raw_task) >= 6:
                if any(w in raw_task.lower() for w in ["chào mọi người", "cuộc họp kết thúc", "cảm ơn mọi người"]):
                    continue

                cleaned = self._clean_task_title(raw_task)
                if len(cleaned) < 5:
                    continue

                deadline_val = self._parse_relative_deadline(content)
                key = cleaned.lower()[:35]
                speaker_val = speaker or default_host_name

                if key not in seen_titles:
                    seen_titles.add(key)
                    extracted.append({
                        "task_id": None,
                        "task": cleaned,
                        "speaker": speaker_val,
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

            # Normalize assignee (null if unassigned)
            assignee = item.get("assignee")
            if assignee:
                assignee = str(assignee).strip()
                if assignee.lower() in ("unassigned", "null", "none", "", "chưa gán", "chưa phân bổ"):
                    assignee = None

            # Normalize deadline (null if not specified)
            deadline = item.get("deadline")
            if deadline:
                deadline = str(deadline).strip()
                if deadline.lower() in ("null", "none", "", "không có"):
                    deadline = None

            # Normalize status
            status = item.get("status", "NOT_CONFIRMED")
            if status:
                status = str(status).strip().upper()
            if status not in ("CONFIRMED", "NOT_CONFIRMED"):
                status = "NOT_CONFIRMED"

            valid_items.append({
                "task_id": item.get("task_id"),  # None for new tasks
                "task": task[:200],
                "speaker": item.get("speaker"),
                "assignee": assignee,
                "deadline": deadline,  # YYYY-MM-DD or null
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
# Intelligent Vietnamese Name Matching & Assignee Resolution
# ---------------------------------------------------------------------------
def strip_vietnamese_accents(text: str) -> str:
    """Strip Vietnamese tonal accents and diacritics for normalization."""
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    text = re.sub(r"[\u0300-\u036f]", "", text)
    text = text.replace("đ", "d").replace("Đ", "D")
    return unicodedata.normalize("NFC", text)


def extract_name_tokens(text: str) -> list[str]:
    """Tokenize a name without accents and honorific stopwords."""
    cleaned = strip_vietnamese_accents(text).lower()
    stopwords = {"anh", "chi", "em", "ban", "ong", "ba", "dong", "chi", "co", "thay", "mr", "mrs", "ms"}
    return [t for t in re.split(r"\s+", cleaned) if t and t not in stopwords]


def score_name_match(query: str, target: str, is_meeting_member: bool = False) -> float:
    """
    Score similarity between a query (e.g., 'Tan Dat', 'Tran Tan Dat', 'ban Dang Khoa')
    and a candidate user full name (e.g., 'Tấn Đạt Trần', 'Trần Đăng Khoa').
    """
    q_clean = re.sub(r"^(?:anh|chị|em|bạn|ông|bà|đồng chí|cô|thầy)\s+", "", query, flags=re.IGNORECASE).strip()
    if not q_clean or not target:
        return 0.0

    q_lower = q_clean.lower()
    t_lower = target.lower()
    q_noacc = strip_vietnamese_accents(q_clean).lower()
    t_noacc = strip_vietnamese_accents(target).lower()

    score = 0.0
    if t_lower == q_lower:
        score = 100.0
    elif t_noacc == q_noacc:
        score = 92.0
    else:
        q_tokens = extract_name_tokens(q_clean)
        t_tokens = extract_name_tokens(target)
        if q_tokens and t_tokens:
            q_set = set(q_tokens)
            t_set = set(t_tokens)
            if q_set == t_set:
                score = 90.0
            elif q_set.issubset(t_set):
                score = 80.0 + 10.0 * (len(q_tokens) / len(t_tokens))
            elif t_set.issubset(q_set):
                score = 75.0
            elif q_noacc in t_noacc:
                score = 70.0
            else:
                overlap = q_set.intersection(t_set)
                if overlap:
                    score = 45.0 * (len(overlap) / max(len(q_tokens), len(t_tokens)))

    if is_meeting_member and score > 0:
        score += 25.0
    return score


def resolve_assignee_user(
    db: Session, meeting_id: str, assignee_name: str | None
) -> tuple[str | None, str | None]:
    """
    Intelligently match an assignee name to a user in the meeting or database.
    Supports:
    - Diacritic-insensitive matching ("Tan Dat" -> "Tấn Đạt Trần")
    - Word-order permutations ("Tran Tan Dat", "Tan Dat Tran", "Dat Tran")
    - First/last name subsets ("Tan Dat" in "Tran Tan Dat")
    - Honorific stripping ("anh Khoa", "bạn Đăng Khoa", "chị Lan")
    - Priority boost for members present in the meeting (MeetingMember)
    """
    if not assignee_name or not str(assignee_name).strip():
        return None, None

    raw_name = str(assignee_name).strip()
    from src.backend.models import MeetingMember

    # 1. Fetch meeting members
    member_records = (
        db.query(MeetingMember, User)
        .join(User, MeetingMember.user_id == User.id)
        .filter(MeetingMember.meeting_id == meeting_id)
        .all()
    )
    meeting_user_map = {u.id: u for mm, u in member_records}

    # 2. Fetch all users as fallback
    all_users = db.query(User).all()

    candidates: list[tuple[User, bool, float]] = []
    for u in all_users:
        if not u.full_name:
            continue
        is_mem = u.id in meeting_user_map
        s = score_name_match(raw_name, u.full_name, is_meeting_member=is_mem)
        if s >= 60.0:
            candidates.append((u, is_mem, s))

    if candidates:
        candidates.sort(key=lambda x: x[2], reverse=True)
        best_user, is_mem, best_score = candidates[0]
        logger.info(
            "Resolved assignee '%s' -> '%s' (user_id=%s, member=%s, score=%.1f)",
            raw_name,
            best_user.full_name,
            best_user.id,
            is_mem,
            best_score,
        )
        return best_user.id, best_user.full_name

    return None, raw_name


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
        topic_id: Optional topic ID if extracted in the context of a topic.

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

        # Resolve assignee name → user ID via intelligent fuzzy matching
        assignee_name = item_data.get("assignee")
        assignee_id, resolved_assignee_name = resolve_assignee_user(db, meeting_id, assignee_name)

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

        speaker_name = item_data.get("speaker")

        # Build clean description with speaker and assignee name preserved
        desc_parts = []
        if speaker_name:
            desc_parts.append(f"Người giao: {speaker_name}")
        display_assignee = resolved_assignee_name or assignee_name
        if display_assignee:
            desc_parts.append(f"Phân công cho: {display_assignee}")
        if deadline:
            desc_parts.append(f"Hạn chót: {deadline.strftime('%d/%m/%Y')}")
        desc = " | ".join(desc_parts) if desc_parts else "Nhiệm vụ cuộc họp"

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
                if speaker_name and not existing.evidence_quote:
                    existing.evidence_quote = speaker_name
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
                if speaker_name and not existing_dupe.evidence_quote:
                    existing_dupe.evidence_quote = speaker_name
                if task_status == FollowUpTaskStatusEnum.CONFIRMED:
                    existing_dupe.status = task_status
                affected_tasks.append(existing_dupe)
                continue

            # INSERT new task
            evidence_val = item_data.get("evidence_quote") or speaker_name
            task = FollowUpTask(
                meeting_id=meeting_id,
                topic_id=topic_id,
                transcript_segment_id=linked_segment_id,
                assignee_id=assignee_id,
                title=task_title,
                description=desc,
                evidence_quote=evidence_val,
                status=task_status,
                deadline=deadline,
                source=source,
            )
            db.add(task)
            affected_tasks.append(task)
            logger.info("Created new task: '%s' (assignee=%s, speaker=%s, status=%s, topic_id=%s)", task_title, assignee_name, speaker_name, task_status.value, topic_id)

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
