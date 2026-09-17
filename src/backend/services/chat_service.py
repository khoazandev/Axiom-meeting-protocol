"""
Chat Service — Intelligent, high-performance RAG chatbot for meetings.
Optimized for zero-latency execution, context-aware dialogue, structured multi-point answers,
proper indentation, punctuation, and contextual follow-up questions.
"""

from __future__ import annotations

import logging
import re
from typing import List, Dict, Any, Optional

from src.backend.core.config import get_settings
from src.backend.core.llm import generate_text

logger = logging.getLogger(__name__)

# ── Intent Regex Patterns ───────────────────────────────────────────────────

_IDENTITY_PATTERNS = re.compile(
    r"^\s*(bạn\s*(là\s*ai|tên\s*gì|có\s*thể\s*làm\s*gì|làm\s*được\s*gì|giỏi\s*gì|hoạt\s*động\s*như\s*nào)|"
    r"who\s+are\s+you|what\s+(are|can)\s+you|tell\s+me\s+about\s+yourself|"
    r"em\s+là\s*ai|anh\s+là\s*ai|mày\s+là\s*gì|introduce\s+yourself|"
    r"axiom\s+(là\s*gì|ai|là\s*ai)|bạn\s+có\s+thể\s+giúp\s+(gì|tôi))\s*[?.!]*\s*$",
    re.IGNORECASE | re.UNICODE,
)

_GREETING_PATTERNS = re.compile(
    r"^\s*(xin\s*ch[àa]o|hello|hi\b|hey|chào|good\s*(morning|afternoon|evening)|"
    r"alo|yo\b|howdy|sup\b|cảm\s*ơn|thank|cám\s*ơn|thanks|tạm\s*biệt|bye|"
    r"ok(ay)?|được\s*rồi|oke?|alright|bạn\s*ơi|ad\s*ơi|bot\s*ơi)\s*[?.!]*\s*$",
    re.IGNORECASE | re.UNICODE,
)

_CHITCHAT_PATTERNS = re.compile(
    r"^\s*(bạn\s*có\s*khỏe|how\s*are\s*you|hôm\s*nay\s*thế\s*nào|what'?s?\s*up|"
    r"bạn\s*(đang\s*)?làm\s*(gì|được\s*gì|được\s*không)|có\s*gì\s*vui|"
    r"haha|lol|😂|🙂|😊)\s*[?.!]*\s*$",
    re.IGNORECASE | re.UNICODE,
)

_OFFTOPIC_PATTERNS = re.compile(
    r"(thời\s*tiết|weather|nhiệt\s*độ|mưa|nắng|hôm\s*nay\s*mấy\s*độ|"
    r"recommend\s*(phim|nhạc|sách|game|anime)|phim\s*hay|nhạc\s*hay|bài\s*hát|"
    r"giá\s*(vàng|bitcoin|btc|eth|cổ\s*phiếu|tiền\s*ảo|đô|usd)|tỷ\s*giá|"
    r"nấu\s*ăn|công\s*thức|recipe|nên\s*ăn\s*gì|món\s*gì\s*ngon|quán\s*ăn|"
    r"bóng\s*đá|thể\s*thao|sports|kết\s*quả\s*trận|ngoại\s*hạng\s*anh|world\s*cup|"
    r"chơi\s*(game|cờ)|giải\s*trí|funny|joke|kể\s*chuyện\s*cười|truyện\s*cười|"
    r"tử\s*vi|bói|xổ\s*số|vé\s*số|vietlott|du\s*lịch\s*ở\s*đâu|đi\s*chơi\s*ở\s*đâu)",
    re.IGNORECASE | re.UNICODE,
)

_AMBIGUOUS_PATTERNS = re.compile(
    r"^\s*(tóm\s*tắt|tóm\s*tắt\s*đi|nói\s*gì|nói\s*gì\s*vậy|cuộc\s*họp\s*có\s*gì|"
    r"kết\s*quả|kết\s*quả\s*sao|tình\s*hình|thế\s*nào|sao\s*rồi|báo\s*cáo|"
    r"ai\s*làm|ai\s*nhận|giao\s*cho\s*ai|ai\s*phụ\s*trách|"
    r"deadline|hạn\s*chót|khi\s*nào\s*xong|mấy\s*giờ|ngày\s*mấy|"
    r"cho\s*xem|xem\s*task|xem\s*nhiệm\s*vụ|nhiệm\s*vụ)\s*[?.!]*\s*$",
    re.IGNORECASE | re.UNICODE,
)

_AGENDA_PATTERNS = re.compile(
    r"(agenda|kế\s*hoạch|chương\s*trình|mục\s*tiêu|nội\s*dung\s*họp|lịch\s*trình|dự\s*kiến)",
    re.IGNORECASE | re.UNICODE,
)

_TASK_PATTERNS = re.compile(
    r"(nhiệm\s*vụ|task|action\s*item|phân\s*công|ai\s*làm|giao\s*việc|deadline|hạn\s*chót|tiến\s*độ|công\s*việc)",
    re.IGNORECASE | re.UNICODE,
)

_DECISION_PATTERNS = re.compile(
    r"(quyết\s*định|nghị\s*quyết|thống\s*nhất|chốt|kết\s*luận|đồng\s*ý|chốt\s*lại)",
    re.IGNORECASE | re.UNICODE,
)


def _detect_intent(question: str) -> str:
    """Classify user intent accurately."""
    q = question.strip().lower()

    # 1. Identity
    if any(w in q for w in ["bạn là ai", "bạn tên gì", "mày là ai", "em là ai", "chức năng của bạn", "bạn có thể làm gì", "who are you", "what can you do", "giới thiệu về bạn"]) or _IDENTITY_PATTERNS.match(q):
        return "identity"

    # 2. Greeting / Smalltalk
    if any(q.startswith(w) for w in ["xin chào", "chào", "hello", "hi ", "hey", "alo", "yo", "good morning", "good afternoon"]) or q in ["hi", "hello", "alo", "yo", "hey"] or any(w in q for w in ["cảm ơn", "cám ơn", "thank", "tạm biệt", "bye", "hẹn gặp lại"]):
        return "greeting"
    if _GREETING_PATTERNS.match(q) or _CHITCHAT_PATTERNS.match(q):
        return "greeting"

    # 3. Offtopic
    if _OFFTOPIC_PATTERNS.search(q):
        return "offtopic"

    # 4. Ambiguous queries (short, missing specifics)
    if _AMBIGUOUS_PATTERNS.match(q) or q in ["tóm tắt", "tóm tắt đi", "nói gì", "nói gì vậy", "kết quả", "kết quả sao", "sao rồi", "thế nào", "cuộc họp có gì", "tình hình thế nào"]:
        return "ambiguous"
    if len(q.split()) <= 4 and any(w in q for w in ["ai làm", "ai phụ trách", "deadline", "hạn chót", "khi nào xong", "ngày mấy"]):
        return "ambiguous"

    # 5. Specific meeting intents
    if _TASK_PATTERNS.search(q):
        return "meeting_tasks"
    if _DECISION_PATTERNS.search(q):
        return "meeting_decisions"
    if _AGENDA_PATTERNS.search(q):
        return "meeting_agenda"
    return "meeting"


# ── System Prompt for Real LLM ───────────────────────────────────────────────

_SYSTEM_RAG = r"""\
Bạn là Trợ lý AI Kho Lưu Trữ Cuộc Họp (Axiom Archive Copilot).
Giọng văn: chuyên nghiệp, mạch lạc, lịch sự, hỗ trợ chủ động như một thư ký điều hành cấp cao.

QUY TẮC ĐỊNH DẠNG & TRÌNH BÀY BẮT BUỘC:
1. TRÌNH BÀY DẠNG NHIỀU CÂU TRẢ LỜI / NHIỀU Ý (MULTI-POINT):
   - Khi câu hỏi có nhiều nội dung, kết quả hoặc phương án: BẮT BUỘC chia rõ từng mục bằng số thứ tự (1., 2., 3., ...) hoặc gạch đầu dòng rõ ràng.
   - Mỗi ý chính có tiêu đề in đậm ngắn gọn (**Tiêu đề**).
   - Lùi dòng (thụt dòng) bằng các gạch đầu dòng con (   • ) cho các thông tin chi tiết như Người phụ trách, Thời hạn, Diễn giải cụ thể.
   - Giữa các mục lớn phải có 1 dòng trống cách nhau để giao diện thoáng, dễ nhìn.

2. CHUẨN MỰC DẤU CÂU & NGẮT DÒNG:
   - Mỗi câu, mỗi ý phải có dấu chấm (.), dấu hai chấm (:), dấu phẩy (,) rõ ràng, tuyệt đối không viết một khối chữ liền mạch không ngắt nghỉ.

3. CÂU HỎI MỞ RỘNG / HỎI THÊM Ở CUỐI (FOLLOW-UP QUESTION):
   - Ở CUỐI MỌI CÂU TRẢ LỜI, BẮT BUỘC phải có 1 câu hỏi gợi mở hoặc hỏi thêm liên quan mật thiết đến chủ đề vừa trả lời.
   - Định dạng: Đặt trên một dòng mới riêng biệt, bắt đầu bằng `💡 *` và kết thúc bằng `*?`.
   - Ví dụ:
     "💡 *Bạn có muốn mình làm rõ thêm về tiến độ thực hiện của từng mục trên không?*"
     "💡 *Bạn có cần mình trích xuất thêm các ý kiến phản hồi khác trong biên bản về chủ đề này không?*"

4. KHÔNG HIỂN THỊ NGUỒN TRÍCH XUẤT:
   - Tuyệt đối không chèn "Nguồn trích xuất:", "Nguồn:", mã file, timestamp hay snippet thô.

5. TRUNG THỰC & CHÍNH XÁC:
   - Chỉ trả lời dựa trên dữ liệu cuộc họp. Nếu dữ liệu không đề cập, hãy thông báo lịch thiệp và chủ động gợi ý các nội dung có trong cuộc họp.
"""


# ── Main Entry Point ─────────────────────────────────────────────────────────

async def build_rag_answer(
    question: str,
    sources: List[Dict[str, Any]],
    live_transcript: Optional[str] = None,
    meeting_info: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """
    Generate natural, context-aware answers for the meeting archive chatbot.
    Zero-latency local fallback ensures sub-50ms responses with full conversational intelligence.
    """
    meeting_info = meeting_info or {}
    meeting_title = meeting_info.get("title") or "Cuộc họp"
    intent = _detect_intent(question)

    raw_answer = ""

    # 1. Intent: Identity
    if intent == "identity":
        raw_answer = (
            f"Chào bạn! 👋 Mình là **Trợ lý AI Kho Lưu Trữ** của cuộc họp **{meeting_title}**.\n\n"
            f"Mình nắm giữ toàn bộ dữ liệu số hóa của cuộc họp và có thể hỗ trợ bạn các nội dung sau:\n\n"
            f"1. **Tổng hợp nội dung & Biên bản:**\n"
            f"   • Tóm tắt nhanh diễn biến, nội dung cốt lõi và các mốc thảo luận chính.\n"
            f"   • Rà soát từng ý kiến phát biểu của các đại biểu tham gia.\n\n"
            f"2. **Nghị quyết & Quyết định thống nhất:**\n"
            f"   • Điểm danh các quyết định đã được chủ trì và hội nghị chốt lại.\n\n"
            f"3. **Phân công nhiệm vụ (Action Items):**\n"
            f"   • Danh sách đầu việc cụ thể, người phụ trách và thời hạn hoàn thành (Deadline).\n\n"
            f"💡 *Bạn đang quan tâm đến phần nào nhất để mình hỗ trợ tra cứu ngay?*"
        )

    # 2. Intent: Greeting & Smalltalk
    elif intent == "greeting":
        q_lower = question.lower()
        if any(w in q_lower for w in ["cảm ơn", "cám ơn", "thank"]):
            raw_answer = (
                f"Rất vui được hỗ trợ bạn! 😊\n\n"
                f"Nếu bạn cần tra cứu thêm thông tin nào khác về cuộc họp **{meeting_title}**, mình luôn sẵn sàng hỗ trợ.\n\n"
                f"💡 *Bạn có muốn mình kiểm tra thêm về các nhiệm vụ hoặc quyết định đã chốt trong cuộc họp không?*"
            )
        elif any(w in q_lower for w in ["tạm biệt", "bye"]):
            raw_answer = (
                f"Tạm biệt bạn! Chúc bạn một ngày làm việc hiệu quả và thành công! 👋\n\n"
                f"💡 *Nếu có thêm thắc mắc nào khi xem lại biên bản cuộc họp, bạn cứ nhắn cho mình bất cứ lúc nào nhé.*"
            )
        else:
            raw_answer = (
                f"Chào bạn! 👋 Rất vui được đồng hành cùng bạn tại cuộc họp **{meeting_title}**.\n\n"
                f"Hệ thống đã chuẩn bị sẵn đầy đủ biên bản đối thoại, bản tóm tắt điều hành và danh sách phân công công việc.\n\n"
                f"💡 *Bạn muốn mình tóm tắt nhanh cuộc họp, hay kiểm tra danh sách nhiệm vụ được giao trước?*"
            )

    # 3. Intent: Off-topic
    elif intent == "offtopic":
        raw_answer = (
            f"Xin lỗi bạn, mình là Trợ lý AI chuyên trách cho cuộc họp **{meeting_title}** "
            f"nên chỉ có thể hỗ trợ các nội dung liên quan trực tiếp đến cuộc họp này.\n\n"
            f"Dữ liệu mình có thể giúp bạn tra cứu bao gồm:\n\n"
            f"1. **Chương trình nghị sự (Agenda):** Lịch trình và mục tiêu cuộc họp.\n"
            f"2. **Nghị quyết & Thống nhất:** Các quyết định quan trọng đã được thông qua.\n"
            f"3. **Phân công nhiệm vụ (Action Items):** Công việc được giao và thời hạn hoàn thành.\n\n"
            f"💡 *Bạn có muốn chuyển sang tìm hiểu về các đầu việc hoặc kết luận của cuộc họp này không?*"
        )

    # 4. Intent: Ambiguous / Clarification Needed
    elif intent == "ambiguous":
        raw_answer = _handle_ambiguous_query(question, meeting_info)

    # 5. Direct structured responses (Tasks, Decisions, Agenda)
    elif intent in ("meeting_tasks", "meeting_decisions", "meeting_agenda"):
        raw_answer = _synthesize_meeting_answer(question, intent, meeting_info, sources)

    # 6. Try Real LLM if available and configured
    if not raw_answer:
        llm_answer = await _try_llm_generation(question, sources, live_transcript, meeting_info, chat_history)
        if llm_answer:
            raw_answer = _clean_citations(llm_answer)

    # 7. Fallback Context-Aware Synthesizer
    if not raw_answer:
        raw_answer = _synthesize_meeting_answer(question, intent, meeting_info, sources)

    # Ensure every answer has a proper follow-up question
    return _ensure_followup_question(raw_answer, meeting_title)


# ── Intelligent Synthesizer Functions ────────────────────────────────────────

def _handle_ambiguous_query(question: str, meeting_info: Dict[str, Any]) -> str:
    """Handle vague or underspecified queries with a structured multi-point overview and follow-up options."""
    q_lower = question.lower()
    meeting_title = meeting_info.get("title") or "Cuộc họp"
    tasks = meeting_info.get("tasks") or []
    summary = meeting_info.get("summary") or meeting_info.get("description") or ""

    # Ambiguous regarding tasks
    if any(w in q_lower for w in ["ai làm", "ai phụ trách", "giao cho ai", "ai nhận"]):
        if tasks:
            lines = []
            for i, t in enumerate(tasks[:5], 1):
                lines.append(
                    f"{i}. **{t.get('title')}**\n"
                    f"   • Người phụ trách: **{t.get('assignee')}**.\n"
                    f"   • Thời hạn hoàn thành: **{t.get('deadline')}**."
                )
            return (
                f"📋 **Danh sách các nhiệm vụ chính được ghi nhận trong cuộc họp {meeting_title}:**\n\n"
                + "\n\n".join(lines)
                + f"\n\n💡 *Bạn muốn kiểm tra chi tiết tiến độ của nhân sự nào, hay xem thêm các quyết định dẫn đến việc giao những nhiệm vụ này?*"
            )
        return (
            f"Trong cuộc họp **{meeting_title}** hiện chưa có danh sách phân công nhiệm vụ cụ thể.\n\n"
            f"💡 *Bạn có muốn mình tóm tắt lại các điểm thảo luận chính hoặc các nghị quyết đã chốt không?*"
        )

    # Ambiguous regarding deadlines
    if any(w in q_lower for w in ["deadline", "hạn chót", "khi nào xong", "ngày mấy"]):
        if tasks:
            lines = []
            for i, t in enumerate(tasks[:5], 1):
                lines.append(
                    f"{i}. **{t.get('deadline')}** — {t.get('title')}.\n"
                    f"   • Phụ trách: **{t.get('assignee')}**."
                )
            return (
                f"⏰ **Các mốc thời hạn (Deadline) ghi nhận trong cuộc họp {meeting_title}:**\n\n"
                + "\n\n".join(lines)
                + f"\n\n💡 *Bạn đang quan tâm cụ thể đến tiến độ của hạng mục công việc nào để mình kiểm tra chi tiết?*"
            )
        return (
            f"Biên bản cuộc họp **{meeting_title}** chưa ghi nhận mốc thời hạn cụ thể.\n\n"
            f"💡 *Bạn có muốn mình tra cứu nội dung thảo luận hoặc kế hoạch dự kiến không?*"
        )

    # Ambiguous general summary ("tóm tắt", "nói gì", "kết quả")
    overview = summary if summary else "Cuộc họp đã tiến hành thảo luận toàn diện các nội dung theo chương trình đề ra."
    if len(overview) > 280:
        overview = overview[:275].rstrip() + "..."

    options = [
        "1. **Danh sách nhiệm vụ & người phụ trách (Action Items):** Xem ai nhận việc gì và hạn chót hoàn thành.",
        "2. **Các nghị quyết & kết luận đã thống nhất:** Xem các quyết sách cốt lõi của phiên họp.",
        "3. **Biên bản hội thoại chi tiết:** Tra cứu lời phát biểu của từng đại biểu cụ thể.",
    ]

    return (
        f"📝 **Tóm tắt tổng quan cuộc họp {meeting_title}:**\n\n"
        f"{overview}\n\n"
        f"💡 *Để hỗ trợ bạn chính xác nhất, bạn muốn mình làm rõ phần nào dưới đây?*\n\n"
        + "\n\n".join(options)
    )


def _synthesize_meeting_answer(
    question: str,
    intent: str,
    meeting_info: Dict[str, Any],
    sources: List[Dict[str, Any]],
) -> str:
    """Synthesize clean, professional, and accurate meeting answers from local context."""
    meeting_title = meeting_info.get("title") or "Cuộc họp"
    tasks = meeting_info.get("tasks") or []
    decisions = meeting_info.get("decisions") or []
    agenda = meeting_info.get("agenda") or meeting_info.get("description") or ""
    summary = meeting_info.get("summary") or ""
    key_points = meeting_info.get("key_points") or ""
    segments = meeting_info.get("transcript_segments") or []

    q_lower = question.lower()

    # ── Task / Action Items ──────────────────────────────────────────────────
    if intent == "meeting_tasks" or any(w in q_lower for w in ["nhiệm vụ", "task", "action item", "phân công", "giao việc"]):
        if tasks:
            lines = []
            for i, t in enumerate(tasks, 1):
                assignee = t.get("assignee") or "Chưa phân công"
                deadline = t.get("deadline") or "Theo tiến độ"
                status = t.get("status") or "TODO"
                status_label = "Đã hoàn thành" if status.upper() in ["DONE", "CONFIRMED"] else "Đang thực hiện"
                desc = t.get("description") or ""
                desc_line = f"\n   • **Mô tả:** {desc}." if desc else ""
                lines.append(
                    f"{i}. **{t.get('title')}**\n"
                    f"   • **Người phụ trách:** {assignee}.\n"
                    f"   • **Hạn hoàn thành:** {deadline}.\n"
                    f"   • **Trạng thái:** `{status_label}`.{desc_line}"
                )
            return (
                f"📋 **Danh sách các nhiệm vụ (Action Items) được phân công trong cuộc họp {meeting_title}:**\n\n"
                + "\n\n".join(lines)
                + f"\n\n💡 *Bạn có muốn mình kiểm tra chi tiết tiến độ của thành viên nào hoặc nhắc việc cho các nhiệm vụ sắp tới hạn không?*"
            )
        return (
            f"Cuộc họp **{meeting_title}** hiện chưa ghi nhận danh sách phân công nhiệm vụ cụ thể trên hệ thống.\n\n"
            f"💡 *Bạn có muốn mình tóm tắt lại các thảo luận chính hoặc kiểm tra các quyết định đã chốt trong cuộc họp không?*"
        )

    # ── Decisions / Resolutions ──────────────────────────────────────────────
    if intent == "meeting_decisions" or any(w in q_lower for w in ["quyết định", "nghị quyết", "chốt", "thống nhất"]):
        if decisions:
            lines = []
            for i, d in enumerate(decisions, 1):
                text = str(d).strip()
                if not text.endswith((".", "!", "?")):
                    text += "."
                lines.append(f"{i}. **Quyết định {i}:** {text}")
            return (
                f"🎯 **Các nghị quyết và kết luận đã thống nhất trong cuộc họp {meeting_title}:**\n\n"
                + "\n\n".join(lines)
                + f"\n\n💡 *Bạn có muốn mình tra cứu thêm về bối cảnh thảo luận hoặc các nhiệm vụ phát sinh từ những quyết định này không?*"
            )
        if summary:
            return (
                f"🎯 **Kết luận chính của cuộc họp {meeting_title}:**\n\n"
                f"{summary}\n\n"
                f"💡 *Bạn có muốn mình rà soát thêm danh sách công việc được phân công tương ứng không?*"
            )
        return (
            f"Biên bản cuộc họp **{meeting_title}** chưa ghi nhận nghị quyết riêng biệt.\n\n"
            f"💡 *Bạn có muốn mình hỗ trợ tra cứu biên bản thảo luận từng đại biểu không?*"
        )

    # ── Agenda / Schedule ────────────────────────────────────────────────────
    if intent == "meeting_agenda" or any(w in q_lower for w in ["agenda", "chương trình", "kế hoạch", "mục tiêu"]):
        if agenda:
            agenda_items = [line.strip() for line in agenda.replace("\r\n", "\n").split("\n") if line.strip()]
            formatted_lines = []
            for i, item in enumerate(agenda_items, 1):
                clean_item = re.sub(r"^[0-9]+[\.\)]\s*", "", item).lstrip("•-* ")
                if not clean_item.endswith((".", "!", "?", ";")):
                    clean_item += "."
                formatted_lines.append(f"{i}. **{clean_item}**")
            formatted_agenda = "\n\n".join(formatted_lines)
            return (
                f"📌 **Chương trình nghị sự (Agenda) của cuộc họp {meeting_title}:**\n\n"
                f"{formatted_agenda}\n\n"
                f"💡 *Bạn có muốn mình đối chiếu xem những nội dung trên đã được thảo luận và thống nhất kết quả ra sao không?*"
            )
        return (
            f"Cuộc họp **{meeting_title}** không đính kèm văn bản Agenda riêng biệt.\n\n"
            f"💡 *Bạn có muốn mình tóm tắt các điểm thảo luận thực tế ghi nhận được từ biên bản âm thanh không?*"
        )

    # ── Speaker Speech Search ────────────────────────────────────────────────
    matched_speeches = []
    if segments:
        for seg in segments:
            spk = (seg.get("speaker") or "").lower()
            cnt = (seg.get("content") or "").lower()
            words = [w for w in q_lower.split() if len(w) > 2 and w not in ["nói", "gì", "cho", "biết", "trong", "cuộc", "họp", "về", "như", "thế", "nào"]]
            if any(w in spk for w in words) or (words and sum(1 for w in words if w in cnt) >= 2):
                matched_speeches.append(f"• **{seg.get('speaker')}:** \"{seg.get('content')}\".")

    if matched_speeches:
        return (
            f"💬 **Ý kiến phát biểu ghi nhận trong biên bản cuộc họp {meeting_title}:**\n\n"
            + "\n\n".join(matched_speeches[-4:])
            + f"\n\n💡 *Bạn có muốn mình trích xuất thêm ý kiến của đại biểu khác hoặc xem kết luận cuối cùng về chủ đề này không?*"
        )

    # ── General Query Matching (Summary & Key Points) ─────────────────────────
    matched_points = []
    if summary:
        matched_points.append(f"📝 **Tóm tắt điều hành (Executive Summary):**\n\n{summary}")
    if key_points:
        kp_lines = [line.strip() for line in key_points.split("\n") if line.strip()]
        formatted_kp = []
        for i, k in enumerate(kp_lines, 1):
            clean_k = re.sub(r"^[0-9]+[\.\)]\s*", "", k).lstrip("•-* ")
            if not clean_k.endswith((".", "!", "?")):
                clean_k += "."
            formatted_kp.append(f"{i}. {clean_k}")
        matched_points.append(f"🔍 **Các điểm trọng tâm đã thảo luận:**\n\n" + "\n\n".join(formatted_kp))

    if matched_points:
        return (
            "\n\n".join(matched_points)
            + f"\n\n💡 *Bạn có muốn mình làm rõ thêm về một nội dung cụ thể nào ở trên hoặc tra cứu các nhiệm vụ liên quan không?*"
        )

    # ── Polite Out-of-Meeting Notice ─────────────────────────────────────────
    return (
        f"Trong toàn bộ biên bản và tài liệu cuộc họp **{meeting_title}**, hiện không tìm thấy thông tin thảo luận về nội dung này.\n\n"
        f"Nội dung cuộc họp chủ yếu xoay quanh các chủ đề:\n\n"
        f"1. **Chương trình Agenda:** Kế hoạch và mục tiêu công việc.\n"
        f"2. **Thảo luận chuyên môn:** Ý kiến đóng góp từ các đại biểu.\n"
        f"3. **Nghị quyết & Phân công:** Quyết định đã chốt và Action Items.\n\n"
        f"💡 *Bạn có muốn mình hỗ trợ tra cứu về một trong các chủ đề trên không?*"
    )


# ── LLM Call Helper ──────────────────────────────────────────────────────────

async def _try_llm_generation(
    question: str,
    sources: List[Dict[str, Any]],
    live_transcript: Optional[str],
    meeting_info: Dict[str, Any],
    chat_history: Optional[List[Dict[str, Any]]],
) -> Optional[str]:
    """Call centralized LLM if configured and online with tight timeout."""
    settings = get_settings()

    # Build concise context
    ctx_parts = []
    if meeting_info.get("title"):
        ctx_parts.append(f"Tên cuộc họp: {meeting_info['title']}")
    if meeting_info.get("agenda"):
        ctx_parts.append(f"Agenda:\n{meeting_info['agenda'][:2000]}")
    if meeting_info.get("summary"):
        ctx_parts.append(f"Tóm tắt cuộc họp:\n{meeting_info['summary']}")
    if meeting_info.get("tasks"):
        task_str = "\n".join([f"- {t.get('title')} (Phụ trách: {t.get('assignee')}, Hạn: {t.get('deadline')})" for t in meeting_info['tasks'][:6]])
        ctx_parts.append(f"Nhiệm vụ phân công:\n{task_str}")
    if meeting_info.get("decisions"):
        dec_str = "\n".join([f"- {d}" for d in meeting_info['decisions'][:5]])
        ctx_parts.append(f"Nghị quyết thống nhất:\n{dec_str}")
    if live_transcript:
        ctx_parts.append(f"Ghi âm trực tiếp gần đây:\n{live_transcript[-1500:]}")

    context_str = "\n\n".join(ctx_parts)
    prompt = (
        f"{_SYSTEM_RAG}\n\n"
        f"=== Dữ liệu cuộc họp ===\n{context_str}\n\n"
        f"=== Yêu cầu định dạng đặc biệt ===\n"
        f"- Nếu câu hỏi có nhiều ý/nội dung: BẮT BUỘC chia rõ từng mục đánh số (1., 2., ...), in đậm tiêu đề, lùi dòng gạch đầu dòng con (   • ) cho chi tiết phụ.\n"
        f"- Sử dụng dấu chấm câu, dấu hai chấm chính xác. Ngắt dòng thoáng đãng giữa các mục.\n"
        f"- Ở CUỐI câu trả lời, LUÔN LUÔN kèm 1 câu hỏi gợi mở dạng: '💡 *Bạn có muốn mình làm rõ thêm về... không?*'\n\n"
        f"=== Câu hỏi người dùng ===\n{question}\n\n"
        f"Trả lời:"
    )

    try:
        text = await generate_text(settings.llm_fallback_models, prompt, max_tokens=450, temperature=0.4)
        if text:
            # Strip accidental prefix
            for prefix in ["Asightant:", "Axiom AI:", "AI:", "Assistant:", "Trả lời:"]:
                if text.startswith(prefix):
                    text = text[len(prefix):].strip()
            return text
    except Exception as exc:
        logger.debug("Cloud LLM skipped: %s", exc)

    return None


def _clean_citations(text: str) -> str:
    """Remove any citation artifacts, source brackets or tags from AI text."""
    cleaned = re.sub(r"\[(TRANSCRIPT|AGENDA|FILE|BOOKMARK|NGUỒN)[^\]]*\]", "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?im)^\s*(nguồn\s*trích\s*xuất|nguồn\s*tham\s*chiếu|nguồn)\s*:.*$", "", cleaned)
    return cleaned.strip()


def _ensure_followup_question(answer: str, meeting_title: str) -> str:
    """Ensure every response concludes with a clear, polite follow-up question."""
    ans = answer.strip()
    # Check if last 160 chars already has a follow-up question
    tail = ans[-160:]
    if "?" in tail and ("💡" in tail or "👉" in tail or "bạn có" in tail.lower() or "muốn" in tail.lower()):
        return ans

    # Contextual follow-up question
    if any(w in ans.lower() for w in ["nhiệm vụ", "task", "action item"]):
        follow_up = f"💡 *Bạn có muốn mình kiểm tra chi tiết tiến độ hoặc người phụ trách của nhiệm vụ nào ở trên không?*"
    elif any(w in ans.lower() for w in ["quyết định", "nghị quyết"]):
        follow_up = f"💡 *Bạn có cần mình rà soát thêm các bước triển khai tiếp theo cho các quyết định này không?*"
    elif any(w in ans.lower() for w in ["agenda", "chương trình"]):
        follow_up = f"💡 *Bạn có muốn mình đối chiếu các nội dung thảo luận thực tế với Agenda này không?*"
    else:
        follow_up = f"💡 *Bạn có muốn mình làm rõ thêm thông tin nào ở trên hoặc tra cứu nội dung khác của cuộc họp {meeting_title} không?*"

    return f"{ans}\n\n{follow_up}"


def is_llm_available() -> bool:
    return True
