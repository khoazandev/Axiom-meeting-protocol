"""
Ollama Service — Qwen2.5 integration for in-meeting RAG chatbot.
Uses Ollama local HTTP API: http://localhost:11434
"""

from __future__ import annotations

import logging
import re
from typing import List, Dict, Any

import requests

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:3b"   # 1.9 GB — fits in VRAM (qwen2.5:latest 4.7GB causes OOM)
OLLAMA_TIMEOUT = 90  # seconds — 3b model still needs time on first load

# ── Intent patterns ──────────────────────────────────────────────────────────

_GREETING_PATTERNS = re.compile(
    r"^\s*(xin\s*ch[àa]o|hello|hi\b|hey|chào|good\s*(morning|afternoon|evening)|"
    r"alo|yo\b|howdy|sup\b|cảm\s*ơn|thank|cám\s*ơn|thanks|tạm\s*biệt|bye|"
    r"ok(ay)?|được\s*rồi|oke?|alright|bạn\s*(có\s*thể\s*)?là\s*ai|who\s*are\s*you|"
    r"bạn\s*tên\s*gì|what\s*(can|do)\s*you\s*do)\s*[?.!]*\s*$",
    re.IGNORECASE | re.UNICODE,
)

_CHITCHAT_PATTERNS = re.compile(
    r"^\s*(bạn\s*có\s*khỏe|how\s*are\s*you|hôm\s*nay\s*thế\s*nào|what'?s?\s*up|"
    r"bạn\s*(đang\s*)?làm\s*(gì|được\s*gì|được\s*không)|có\s*gì\s*vui|"
    r"thời\s*tiết|haha|lol|😂|🙂|😊)\s*[?.!]*\s*$",
    re.IGNORECASE | re.UNICODE,
)


def _is_casual(question: str) -> bool:
    """Return True if the question is a greeting or chitchat, not a meeting query."""
    return bool(_GREETING_PATTERNS.match(question) or _CHITCHAT_PATTERNS.match(question))


# ── Prompt builders ───────────────────────────────────────────────────────────

_SYSTEM_CASUAL = """Bạn là Axiom AI — trợ lý thông minh trong phòng họp, thân thiện và tự nhiên như một đồng nghiệp thực sự.
Hãy trả lời ngắn gọn, ấm áp, không trích dẫn tài liệu, không liệt kê lý thuyết.
Nếu người dùng chào hỏi → chào lại tự nhiên và nhắc nhẹ bạn có thể hỏi về nội dung cuộc họp."""

_SYSTEM_RAG = """Bạn là Axiom AI — trợ lý thông minh trong phòng họp.
Tính cách: thân thiện, tự nhiên, súc tích — như một đồng nghiệp hiểu việc, không phải robot đọc văn bản.

Khi trả lời:
- Nói bằng ngôn ngữ câu hỏi (Việt hoặc Anh), giọng tự nhiên như nói chuyện
- Đi thẳng vào ý chính, không rào đón dài dòng
- Nếu có thông tin → tóm tắt ngắn gọn, rõ ràng (tối đa 3-4 câu)
- Nếu không có thông tin → nói thẳng "Mình không thấy thông tin về điều này trong cuộc họp" — đừng bịa
- TUYỆT ĐỐI không dùng: "Dựa trên nội dung cuộc họp,", "Theo tài liệu,", "[1]", "[2]" hay liệt kê bullet points dài"""


def build_rag_answer(question: str, sources: List[Dict[str, Any]]) -> str:
    """
    Send question + retrieved source snippets to Qwen2.5 via Ollama
    and return a natural, conversational answer.

    Falls back to a heuristic answer if Ollama is unreachable.
    """
    # ── Casual / greeting path ────────────────────────────────────────────────
    if _is_casual(question):
        prompt = f"{_SYSTEM_CASUAL}\n\nNgười dùng: {question}\nAxiom AI:"
        return _call_ollama(prompt, max_tokens=80) or _casual_fallback(question)

    # ── No sources found ──────────────────────────────────────────────────────
    if not sources:
        prompt = (
            f"{_SYSTEM_RAG}\n\n"
            f"Câu hỏi: {question}\n\n"
            f"Lưu ý: Không tìm thấy thông tin liên quan trong tài liệu cuộc họp.\n"
            f"Axiom AI:"
        )
        return _call_ollama(prompt, max_tokens=100) or (
            "Mình không tìm thấy thông tin về điều này trong cuộc họp. "
            "Thử hỏi chi tiết hơn hoặc kiểm tra xem tài liệu đã được upload chưa nhé!"
        )

    # ── RAG path ──────────────────────────────────────────────────────────────
    context_lines = []
    for i, src in enumerate(sources[:5], 1):
        label = {
            "agenda": "Agenda",
            "transcript": "Transcript",
            "file": "Tài liệu",
            "bookmark": "Bookmark",
        }.get(src.get("type", ""), "Nguồn")
        snippet = src.get("snippet", "").strip()
        if snippet:
            context_lines.append(f"[{label}]: {snippet[:400]}")

    context_block = "\n\n".join(context_lines)

    prompt = (
        f"{_SYSTEM_RAG}\n\n"
        f"=== Dữ liệu cuộc họp ===\n{context_block}\n\n"
        f"=== Câu hỏi ===\n{question}\n\n"
        f"Axiom AI:"
    )

    return _call_ollama(prompt, max_tokens=400) or _heuristic_answer(question, sources)


# ── Ollama call ───────────────────────────────────────────────────────────────

def _call_ollama(prompt: str, max_tokens: int = 300) -> str | None:
    """Call Ollama generate API. Returns stripped response text or None on failure."""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,       # more natural, less robotic
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,    # avoid repetitive phrasing
                    "num_predict": max_tokens,
                },
            },
            timeout=OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
        text = response.json().get("response", "").strip()
        # Strip any accidental system-prompt leakage
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

def _casual_fallback(question: str) -> str:
    """Natural fallback for greetings when Ollama is offline."""
    q = question.lower()
    if any(w in q for w in ["cảm ơn", "thank"]):
        return "Không có gì! Bạn cần hỏi thêm gì về cuộc họp không? 😊"
    if any(w in q for w in ["tạm biệt", "bye"]):
        return "Tạm biệt! Chúc cuộc họp hiệu quả nhé 👋"
    if any(w in q for w in ["ai", "tên", "who", "what can"]):
        return "Mình là Axiom AI — trợ lý trong phòng họp này. Upload tài liệu rồi hỏi mình về nội dung cuộc họp nhé!"
    return "Chào bạn! 👋 Mình là Axiom AI. Bạn muốn hỏi gì về nội dung cuộc họp?"


def _heuristic_answer(question: str, sources: List[Dict[str, Any]]) -> str:
    """Simple fallback when Ollama is unavailable — show snippets directly."""
    snippets = [s.get("snippet", "").strip() for s in sources[:2] if s.get("snippet")]
    if not snippets:
        return "Mình không tìm thấy thông tin liên quan trong cuộc họp."
    combined = " … ".join(s[:200] for s in snippets)
    return f"Đây là thông tin tìm được:\n\n{combined}\n\n_(AI đang offline — đây là kết quả tìm kiếm trực tiếp)_"


def is_ollama_available() -> bool:
    """Check if Ollama service is running."""
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False
