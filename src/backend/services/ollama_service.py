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

_SYSTEM_RAG = """\
Bạn là Axiom AI — trợ lý họp thông minh, hiểu rõ ngữ cảnh cuộc họp đang diễn ra.
Tính cách: thân thiện, tự nhiên, súc tích — như đồng nghiệp hiểu việc, không phải robot đọc văn bản.

Nguyên tắc trả lời:
- Dùng ngôn ngữ câu hỏi (Việt/Anh), giọng tự nhiên như trò chuyện
- Đi thẳng vào ý chính, không rào đón
- Có thông tin → tóm tắt 2-4 câu, rõ ràng, đúng trọng tâm
- Không có thông tin → nói thẳng, đừng bịa
- TUYỆT ĐỐI không dùng: "Dựa trên nội dung...", "Theo tài liệu...", "[1]", "[2]", bullet points dài"""


# ── Main entry point ──────────────────────────────────────────────────────────

def build_rag_answer(
    question: str,
    sources: List[Dict[str, Any]],
    live_transcript: Optional[str] = None,
) -> str:
    """
    Generate a natural, contextual answer using Qwen2.5 via Ollama.
    - live_transcript: real-time STT text from the ongoing meeting session
    Falls back to heuristic if Ollama is unreachable.
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
            "tóm tắt những gì đã được thảo luận, và trả lời câu hỏi về cuộc họp theo thời gian thực. "
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
            "Câu hỏi này nằm ngoài phạm vi của mình — mình chỉ hỗ trợ về nội dung cuộc họp thôi. "
            "Bạn muốn hỏi gì về agenda, tài liệu, hoặc những gì đang được thảo luận không? 😊"
        )

    # ── Meeting RAG ───────────────────────────────────────────────────────────
    context_lines: List[str] = []

    # 1. Live transcript (highest priority — what's happening RIGHT NOW)
    if live_transcript and live_transcript.strip():
        # Take the last 2000 chars — most recent discussion
        recent = live_transcript.strip()[-2000:]
        context_lines.append(f"[Cuộc họp đang diễn ra - ghi âm trực tiếp]:\n{recent}")

    # 2. Static sources (agenda, files, bookmarks, DB transcript)
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

    if not context_lines:
        prompt = (
            f"{_SYSTEM_RAG}\n\n"
            f"Câu hỏi: {question}\n\n"
            f"Lưu ý: Chưa có tài liệu hoặc transcript nào trong cuộc họp này.\n"
            f"Axiom AI:"
        )
        return _call_ollama(prompt, max_tokens=120) or (
            "Mình chưa tìm thấy thông tin về điều này trong cuộc họp. "
            "Thử upload tài liệu vào tab Files hoặc hỏi sau khi cuộc họp có thêm nội dung nhé!"
        )

    context_block = "\n\n".join(context_lines)
    prompt = (
        f"{_SYSTEM_RAG}\n\n"
        f"=== Ngữ cảnh cuộc họp ===\n{context_block}\n\n"
        f"=== Câu hỏi ===\n{question}\n\n"
        f"Axiom AI:"
    )

    return _call_ollama(prompt, max_tokens=400) or _heuristic_answer(question, sources, live_transcript)


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
