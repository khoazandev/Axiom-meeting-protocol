"""
Ollama Service — Qwen2.5 integration for in-meeting RAG chatbot.
Uses Ollama local HTTP API: http://localhost:11434
"""

from __future__ import annotations

import logging
import re
from typing import List, Dict, Any, Optional

import requests

import os
import requests

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TIMEOUT = 90  # seconds

def get_active_model() -> str:
    """Dynamically select the best installed Ollama model or fallback to qwen2.5:3b."""
    env_model = os.environ.get("OLLAMA_MODEL")
    if env_model:
        return env_model
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        if r.status_code == 200:
            installed = [m.get("name", "") for m in r.json().get("models", [])]
            # Prioritize Qwen models by size / generation
            candidates = [
                "qwen3.6", "qwen3.5", "qwen3", "qwen2.5:14b", "qwen2.5:7b", "qwen2.5:latest",
                "qwen2.5:3b", "qwen2.5:1.5b", "qwen2.5:0.5b", "llama3.2:3b", "llama3:8b"
            ]
            for candidate in candidates:
                if any(m.startswith(candidate) or candidate in m for m in installed):
                    return candidate
            # If any other model is installed in Ollama, pick the first one
            if installed:
                return installed[0]
    except Exception:
        pass
    return "qwen2.5:3b"

# ── Intent patterns ──────────────────────────────────────────────────────────

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
    r"ok(ay)?|được\s*rồi|oke?|alright)\s*[?.!]*\s*$",
    re.IGNORECASE | re.UNICODE,
)

_CHITCHAT_PATTERNS = re.compile(
    r"^\s*(bạn\s*có\s*khỏe|how\s*are\s*you|hôm\s*nay\s*thế\s*nào|what'?s?\s*up|"
    r"bạn\s*(đang\s*)?làm\s*(gì|được\s*gì|được\s*không)|có\s*gì\s*vui|"
    r"haha|lol|😂|🙂|😊)\s*[?.!]*\s*$",
    re.IGNORECASE | re.UNICODE,
)

_OFFTOPIC_PATTERNS = re.compile(
    r"(thời\s*tiết|weather|nhiệt\s*độ|hôm\s*nay\s*mấy\s*độ|"
    r"recommend\s*(phim|nhạc|sách|game|anime)|phim\s*hay|nhạc\s*hay|"
    r"giá\s*(vàng|bitcoin|btc|eth|cổ\s*phiếu)|tỷ\s*giá|"
    r"nấu\s*ăn|công\s*thức|recipe|nên\s*ăn\s*gì|"
    r"bóng\s*đá|thể\s*thao|sports|kết\s*quả\s*trận|"
    r"chơi\s*(game|cờ)|giải\s*trí|funny|joke|kể\s*chuyện\s*cười)",
    re.IGNORECASE | re.UNICODE,
)


def _detect_intent(question: str) -> str:
    """Detect intent: 'identity' | 'greeting' | 'chitchat' | 'offtopic' | 'meeting'"""
    if _IDENTITY_PATTERNS.match(question):
        return "identity"
    if _GREETING_PATTERNS.match(question):
        return "greeting"
    if _CHITCHAT_PATTERNS.match(question):
        return "chitchat"
    if _OFFTOPIC_PATTERNS.search(question):
        return "offtopic"
    return "meeting"


# ── System prompts ────────────────────────────────────────────────────────────

_SYSTEM_IDENTITY = """\
Bạn là Axiom AI — trợ lý họp thông minh, được tích hợp trực tiếp vào phòng họp.
Khi được hỏi về bản thân, hãy giới thiệu ngắn gọn, thân thiện, đề cập các khả năng chính."""

_SYSTEM_GREETING = """\
Bạn là Axiom AI — trợ lý họp thông minh. Trả lời ngắn, ấm áp, tự nhiên như đồng nghiệp."""

_SYSTEM_OFFTOPIC = """\
Bạn là Axiom AI — trợ lý họp thông minh. Nhiệm vụ của bạn chỉ là hỗ trợ trong phạm vi cuộc họp.
Nếu câu hỏi ngoài phạm vi, hãy từ chối nhẹ nhàng, tự nhiên, và gợi ý người dùng hỏi về cuộc họp."""

_SYSTEM_RAG = r"""\
Bạn là Axiom AI — trợ lý họp thông minh cấp cao (Executive AI Assistant), được tích hợp trực tiếp vào phòng họp theo thời gian thực.
Giọng văn: chuyên nghiệp, nhạy bén, tự nhiên, hỗ trợ chủ động như một đồng nghiệp xuất sắc trong phòng họp.

BỘ NGUYÊN TẮC PHẢN XẠ CỐT LÕI (REFLEX RULES):
- Rule 1 (Always Context-Aware): Luôn đọc kỹ Lịch sử trò chuyện gần nhất và Nhật ký phòng họp trước khi trả lời.
- Rule 2 (Proactive, Not Reactive): Sau khi giải đáp, luôn chủ động gợi ý bước tiếp theo (Next Action) hoặc câu hỏi làm rõ cho người dùng.
- Rule 3 (Show the Proof / Citation): Luôn dẫn chứng bằng chứng rõ ràng (Timestamp [HH:MM:SS], Tên người phát biểu, Tên file hoặc Event Log).
- Rule 4 (Graceful Degradation): Nếu thông tin không có trong cuộc họp, từ chối lịch sự và gợi ý cách tìm khác, tuyệt đối không bịa đặt.

BỘ 4 KỊCH BẢN ỨNG XỬ CỐT LÕI (CORE BEHAVIORAL PATTERNS):

1. YÊU CẦU MƠ HỒ / THIẾU THÔNG TIN (Ambiguous Query):
   - Đọc Lịch sử trò chuyện gần nhất để suy ra ngữ cảnh ($80\%$ khả năng).
   - Nếu câu hỏi ngắn tủn hoặc có nhiều hơn 1 khả năng hiểu (ví dụ: "Tóm tắt đi", "Ý anh Nam là sao?"): Không đoán mò hay báo lỗi. Đưa ra 2-3 lựa chọn gợi ý cụ thể để người dùng chọn nhanh.
   - Ví dụ: "Bạn muốn mình tóm tắt toàn bộ cuộc họp hay chỉ tóm tắt phần thảo luận ngân sách của anh Nam?"

2. YÊU CẦU PHỨC TẠP / NHIỀU BƯỚC (Multi-step Complex Request):
   - Tự phân rã bài toán (Decomposition) thành các phần gạch đầu dòng rõ ràng:
     + Phần 1: Danh sách Action Items + Người phụ trách (Assignee).
     + Phần 2: Bản nháp Email / Báo cáo.
   - Chủ động chốt gợi ý: "Bạn xem bản nháp email này đã đúng ý chưa, có cần mình điều chỉnh lại tông giọng trang trọng hơn không?"

3. PHÁT HIỆN XUNG ĐỘT & THAY ĐỔI THEO THỜI GIAN (Conflict & Evolution Detection):
   - Nếu thông tin trong cuộc họp có sự thay đổi hoặc điều chỉnh theo thời gian (ví dụ: Ban đầu đề xuất 100tr lúc 09:15, nhưng đến 10:30 sếp chốt giảm xuống 70tr):
   - Trình bày diễn biến theo mốc thời gian: "Lúc 09:15 anh An đề xuất 100 triệu, nhưng đến 10:30 sau khi thảo luận sếp đã chốt giảm xuống 70 triệu. Do đó ngân sách chốt cuối cùng là 70 triệu."

4. LINH HOẠT CHUYỂN CHỦ ĐỀ & GÀI LẠI NGỮ CẢNH (Topic Switching & Context Resumption):
   - Khi người dùng hỏi một câu ngoài lề chủ đề đang bàn: Giải đáp ngay lập tức câu hỏi mới đó.
   - Sau đó nhẹ nhàng gợi ý quay lại chủ đề chính: "Mình đã giải đáp câu hỏi trên. Bọn mình quay lại tiếp tục thảo luận về [chủ đề cuộc họp trước đó] chưa nhỉ?"
"""


# ── Main entry point ──────────────────────────────────────────────────────────

def build_rag_answer(
    question: str,
    sources: List[Dict[str, Any]],
    live_transcript: Optional[str] = None,
    meeting_info: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """
    Generate a natural, contextual answer using Qwen2.5/Qwen3.5 via Ollama.
    - live_transcript: real-time STT text from the ongoing meeting session
    - meeting_info: real-time system state & event logs
    - chat_history: recent conversation history turns
    """
    intent = _detect_intent(question)

    # ── Identity ──────────────────────────────────────────────────────────────
    if intent == "identity":
        prompt = (
            f"{_SYSTEM_IDENTITY}\n\n"
            f"Người dùng hỏi: {question}\n"
            f"Axiom AI:"
        )
        return _call_ollama(prompt, max_tokens=120) or (
            "Mình là Axiom AI — trợ lý họp thông minh được tích hợp ngay trong phòng họp này. "
            "Mình có thể giúp bạn: tra cứu nội dung agenda, tìm thông tin trong tài liệu đã upload, "
            "tóm tắt những gì đã được thảo luận, và theo dõi mọi nhật ký sự kiện hệ thống theo thời gian thực. "
            "Bạn muốn hỏi gì về cuộc họp hôm nay không? 🎯"
        )

    # ── Greeting ──────────────────────────────────────────────────────────────
    if intent == "greeting":
        prompt = (
            f"{_SYSTEM_GREETING}\n\n"
            f"Người dùng: {question}\n"
            f"Axiom AI:"
        )
        return _call_ollama(prompt, max_tokens=80) or _greeting_fallback(question)

    # ── Off-topic ─────────────────────────────────────────────────────────────
    if intent == "offtopic":
        prompt = (
            f"{_SYSTEM_OFFTOPIC}\n\n"
            f"Câu hỏi ngoài phạm vi cuộc họp: {question}\n"
            f"Axiom AI:"
        )
        return _call_ollama(prompt, max_tokens=100) or (
            "Câu hỏi này nằm ngoài phạm vi của mình — mình chỉ hỗ trợ về nội dung và hoạt động cuộc họp thôi. "
            "Bạn muốn hỏi gì về agenda, tài liệu, hoặc những gì đang được thảo luận không? 😊"
        )

    # ── Meeting RAG ───────────────────────────────────────────────────────────
    context_lines: List[str] = []

    # 0. Format Chat History Memory
    history_block = ""
    if chat_history and len(chat_history) > 0:
        hist_lines = ["=== Lịch sử trò chuyện gần đây ==="]
        for h in chat_history[-6:]:
            sender = h.get("sender", "User")
            text = h.get("text", "")
            if text:
                hist_lines.append(f"- {sender}: {text}")
        history_block = "\n".join(hist_lines) + "\n\n"

    # 1. Format System Activity Logs & Meeting Info Block
    info_block = ""
    if meeting_info:
        info_lines = ["[NHẬT KÝ VÀ TRẠNG THÁI HỆ THỐNG PHÒNG HỌP (SYSTEM ACTIVITY LOGS)]"]
        if meeting_info.get("start_time"):
            info_lines.append(f"- Thời gian bắt đầu: {meeting_info['start_time']}")
        if meeting_info.get("current_time"):
            info_lines.append(f"- Thời gian hiện tại: {meeting_info['current_time']}")
        if meeting_info.get("elapsed_minutes") is not None:
            info_lines.append(f"- Thời lượng đã họp: {meeting_info['elapsed_minutes']} phút")
        if meeting_info.get("participants"):
            p_str = ", ".join(meeting_info['participants']) if isinstance(meeting_info['participants'], list) else str(meeting_info['participants'])
            info_lines.append(f"- Danh sách tham dự: {p_str}")
        if meeting_info.get("first_speaker"):
            info_lines.append(f"- Người phát biểu đầu tiên: {meeting_info['first_speaker']}")
        if meeting_info.get("speech_count") is not None:
            info_lines.append(f"- Tổng số lượt phát biểu: {meeting_info['speech_count']}")
        if meeting_info.get("total_files") is not None:
            files_str = f" ({', '.join(meeting_info['files_list'])})" if meeting_info.get("files_list") else ""
            info_lines.append(f"- Số lượng file đã upload: {meeting_info['total_files']}{files_str}")
        if meeting_info.get("total_bookmarks") is not None:
            info_lines.append(f"- Số lượng bookmark ghi chú: {meeting_info['total_bookmarks']}")
        
        if meeting_info.get("event_logs"):
            info_lines.append("\n[NHẬT KÝ SỰ KIỆN HỆ THỐNG (SYSTEM EVENT LOGS)]:")
            for log_entry in meeting_info["event_logs"]:
                info_lines.append(f"  {log_entry}")

        info_block = "\n".join(info_lines) + "\n\n"

    # 2. Live transcript (highest priority — what's happening RIGHT NOW)
    if live_transcript and live_transcript.strip():
        recent = live_transcript.strip()[-2000:]
        context_lines.append(f"[Cuộc họp đang diễn ra - ghi âm trực tiếp]:\n{recent}")

    # 3. Static sources (agenda, files, bookmarks, DB transcript)
    for src in sources[:5]:
        label = {
            "agenda": "Agenda",
            "transcript": "Biên bản trước",
            "file": "Tài liệu",
            "bookmark": "Ghi chú",
        }.get(src.get("type", ""), "Nguồn")
        snippet = src.get("snippet", "").strip()
        if snippet:
            fname = src.get("filename", "")
            prefix = f"[{label} — {fname}]" if fname else f"[{label}]"
            context_lines.append(f"{prefix}: {snippet[:400]}")

    if not context_lines and not info_block:
        prompt = (
            f"{_SYSTEM_RAG}\n\n"
            f"{history_block}"
            f"Câu hỏi: {question}\n\n"
            f"Lưu ý: Chưa có tài liệu hoặc transcript nào trong cuộc họp này.\n"
            f"Axiom AI:"
        )
        return _call_ollama(prompt, max_tokens=150) or (
            "Mình chưa tìm thấy thông tin về điều này trong cuộc họp. "
            "Thử upload tài liệu vào tab Files hoặc hỏi sau khi cuộc họp có thêm nội dung nhé!"
        )

    context_block = history_block + info_block + "\n\n".join(context_lines)
    prompt = (
        f"{_SYSTEM_RAG}\n\n"
        f"=== Ngữ cảnh cuộc họp & Lịch sử ===\n{context_block}\n\n"
        f"=== Câu hỏi người dùng ===\n{question}\n\n"
        f"Axiom AI:"
    )

    return _call_ollama(prompt, max_tokens=450) or _heuristic_answer(question, sources, live_transcript)


# ── Ollama call ───────────────────────────────────────────────────────────────

def _call_ollama(prompt: str, max_tokens: int = 300) -> str | None:
    """Call Ollama generate API. Returns stripped response text or None on failure."""
    try:
        model_to_use = get_active_model()
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": model_to_use,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                    "num_predict": max_tokens,
                },
            },
            timeout=OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
        text = response.json().get("response", "").strip()
        # Strip accidental system-prompt leakage
        for prefix in ["Axiom AI:", "AI:", "Assistant:"]:
            if text.startswith(prefix):
                text = text[len(prefix):].strip()
        return text if text else None
    except requests.exceptions.ConnectionError:
        logger.warning("Ollama not reachable, using heuristic fallback")
    except requests.exceptions.Timeout:
        logger.warning("Ollama timeout, using heuristic fallback")
    except Exception as exc:
        logger.error("Ollama error: %s", exc)
    return None


# ── Fallbacks ─────────────────────────────────────────────────────────────────

def _greeting_fallback(question: str) -> str:
    """Natural fallback for greetings when Ollama is offline."""
    q = question.lower()
    if any(w in q for w in ["cảm ơn", "cám ơn", "thank"]):
        return "Không có gì! Bạn cần hỏi thêm gì về cuộc họp không? 😊"
    if any(w in q for w in ["tạm biệt", "bye"]):
        return "Tạm biệt! Chúc cuộc họp thành công nhé 👋"
    return "Chào bạn! 👋 Mình là Axiom AI. Bạn muốn hỏi gì về cuộc họp hôm nay?"


def _heuristic_answer(
    question: str,
    sources: List[Dict[str, Any]],
    live_transcript: Optional[str] = None,
) -> str:
    """Fallback when Ollama is unavailable — show most relevant snippets."""
    results = []

    # Show live transcript first if available
    if live_transcript and live_transcript.strip():
        recent = live_transcript.strip()[-500:]
        results.append(f"📝 **Đang diễn ra trong cuộc họp:**\n{recent}")

    # Then file/agenda snippets
    snippets = [s.get("snippet", "").strip() for s in sources[:2] if s.get("snippet")]
    if snippets:
        results.append("📄 " + " … ".join(s[:200] for s in snippets))

    if not results:
        return "Mình không tìm thấy thông tin liên quan trong cuộc họp."

    return "\n\n".join(results) + "\n\n_(AI đang offline — kết quả tìm kiếm trực tiếp)_"


def is_ollama_available() -> bool:
    """Check if Ollama service is running."""
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False
