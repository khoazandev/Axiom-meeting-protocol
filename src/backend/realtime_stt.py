import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import requests
import websockets
from sqlalchemy.orm import Session

# CTranslate2 Translation Engine
from src.backend.ct2_translator import (
    translate_vi_to_en,
    translate_en_to_vi,
)
from src.backend import database, models

# Set up logger
logger = logging.getLogger("axiom.realtime_stt")
logger.setLevel(logging.INFO)

# ==================== CONFIGURATION ====================
SAMPLE_RATE = 16000
CHUNK_DURATION_SEC = 0.5
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "qwen3:8b"

# Global lazy-loaded models
_whisper_model = None
_silero_vad_model = None

# Known Technical Terms Dictionary for fallback term extraction
KNOWN_TECH_TERMS = [
    "WebSocket", "WebSockets", "VAD", "Silero VAD", "STT", "TTS", "LLM",
    "FastAPI", "Next.js", "React", "Python", "PyTorch", "Whisper", "Faster-Whisper",
    "API", "REST", "JSON", "PCM", "gRPC", "Pipeline", "Backend", "Frontend",
    "Docker", "SQLAlchemy", "Jitsi", "Axiom", "Node.js", "TypeScript", "GPU", "CPU"
]

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info("Checking Faster-Whisper model availability...")
            _whisper_model = WhisperModel("large-v3", device="cpu", compute_type="int8", download_root="./models")
        except Exception as e:
            logger.info(f"Faster-Whisper model not initialized locally (audio text fallback active): {e}")
            _whisper_model = False
    return _whisper_model if _whisper_model is not False else None

def get_silero_vad():
    global _silero_vad_model
    if _silero_vad_model is None:
        try:
            import torch
            torch.hub.set_dir("./models")
            model, _ = torch.hub.load(repo_or_dir='snakers4/silero-vad', model='silero_vad', trust_repo=True, skip_validation=True) # type: ignore
            _silero_vad_model = model
        except Exception as e:
            logger.info(f"Silero VAD remote fetch skipped (using RMS energy VAD): {e}")
            _silero_vad_model = False
    return _silero_vad_model if _silero_vad_model is not False else None

# ==================== STAGE 0: VAD FILTER ====================
def is_speech(audio_chunk: np.ndarray, threshold: float = 0.4) -> Tuple[bool, float]:
    """Detect if audio chunk contains speech using Silero VAD or RMS energy fallback."""
    vad_model = get_silero_vad()
    if vad_model is not None:
        try:
            import torch
            tensor_audio = torch.from_numpy(audio_chunk).float()
            speech_prob = vad_model(tensor_audio, SAMPLE_RATE).item() # type: ignore
            return speech_prob >= threshold, speech_prob
        except Exception as e:
            logger.warning(f"Silero VAD execution error, falling back to RMS: {e}")

    # Fallback to RMS audio energy detection
    energy = float(np.sqrt(np.mean(audio_chunk**2))) if len(audio_chunk) > 0 else 0.0
    return energy > 0.015, energy

# ==================== STAGE 1: CLEAN & ANALYZE (1 LLM call) ====================

# ==================== STAGE 1: CODE LOGIC SERVICE (100% Rule-Based, Zero LLM) ====================

def apply_itn_inverse_text_normalization(text: str) -> str:
    """
    Inverse Text Normalization (ITN):
    - Percentages: "hai mươi phần trăm" -> "20%", "5 phần trăm" -> "5%", "X phần trăm" -> "X%"
    - Dates: "ngày 15 tháng 8" -> "15/08"
    - Currency: "10 đô la" -> "$10", "20 triệu" -> "20.000.000"
    """
    if not text:
        return ""
    
    res = text
    
    # 1. Percentages (vd: "hai mươi phần trăm" -> "20%", "5 phần trăm" -> "5%")
    res = re.sub(r'(\d+)\s*phần\s*trăm', r'\1%', res, flags=re.IGNORECASE)
    res = re.sub(r'\bmột\s+phần\s+trăm\b', '1%', res, flags=re.IGNORECASE)
    res = re.sub(r'\bhai\s+phần\s+trăm\b', '2%', res, flags=re.IGNORECASE)
    res = re.sub(r'\bba\s+phần\s+trăm\b', '3%', res, flags=re.IGNORECASE)
    res = re.sub(r'\bbốn\s+phần\s+trăm\b', '4%', res, flags=re.IGNORECASE)
    res = re.sub(r'\bnăm\s+phần\s+trăm\b', '5%', res, flags=re.IGNORECASE)
    res = re.sub(r'\bmười\s+phần\s+trăm\b', '10%', res, flags=re.IGNORECASE)
    res = re.sub(r'\bhai\s+mươi\s+phần\s+trăm\b', '20%', res, flags=re.IGNORECASE)
    res = re.sub(r'\bnăm\s+mươi\s+phần\s+trăm\b', '50%', res, flags=re.IGNORECASE)
    res = re.sub(r'\bmột\s+trăm\s+phần\s+trăm\b', '100%', res, flags=re.IGNORECASE)

    # 2. Dates (vd: "ngày 15 tháng 8" -> "15/08")
    res = re.sub(r'\bngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\b', lambda m: f"{int(m.group(1)):02d}/{int(m.group(2)):02d}", res, flags=re.IGNORECASE)
    
    # 3. Currency (vd: "10 đô la" -> "$10", "100 USD" -> "$100")
    res = re.sub(r'(\d+)\s*(đô\s*la|usd|\$)', r'$\1', res, flags=re.IGNORECASE)
    res = re.sub(r'(\d+)\s*(triệu|tr)\b', r'\1.000.000', res, flags=re.IGNORECASE)
    res = re.sub(r'(\d+)\s*(tỷ)\b', r'\1.000.000.000', res, flags=re.IGNORECASE)

    return res


def remove_fillers_and_hallucinations(text: str) -> str:
    """
    1. ASR Hallucination filter: detect & strip single words or multi-word phrases repeated > 1 time.
    2. Filler words removal: strip 'ừm', 'à', 'uhm', 'loại như', 'kiểu như', 'ừ', 'er', 'ah', 'thì là', 'nói chung là', 'dạng như'.
    """
    if not text:
        return ""
    
    cleaned = text

    # 1. Hallucination & Stutter: multi-word phrase repeat loop (vd: "cảm ơn cảm ơn cảm ơn" -> "cảm ơn")
    cleaned = re.sub(r'\b(\w+(?:\s+\w+){0,4})(?:\s+\1\b)+', r'\1', cleaned, flags=re.IGNORECASE)

    # 2. Filler words removal
    fillers = [
        r'\bừm\b', r'\bà\b', r'\buhm\b', r'\buh\b', r'\bum\b', r'\ber\b', r'\bah\b', r'\bừ\b',
        r'\bloại như\b', r'\bkiểu như\b', r'\bdạng như\b', r'\bthì là\b', r'\bnói chung là\b'
    ]
    for f in fillers:
        cleaned = re.sub(f, '', cleaned, flags=re.IGNORECASE)
    
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

# Backward compatibility alias
clean_stutter_and_spelling = remove_fillers_and_hallucinations


def restore_punctuation_and_capitalization(text: str) -> str:
    """
    3. Punctuation Restoration & Capitalization & Typos:
       - Fix typos/ngọng (lói -> nói, nàm -> làm)
       - Capitalize tech terms (API, WebSocket, VAD, FastAPI, LLM, STT, Python, React, Next.js)
       - Capitalize sentence initial
       - Append period '.' if missing
    """
    if not text:
        return ""

    cleaned = text
    
    # Typo map
    typo_map = {
        r'\blói ngọng\b': 'nói ngọng',
        r'\blói\b': 'nói',
        r'\bnàm việc\b': 'làm việc',
        r'\bvới ai\b': 'với AI',
        r'\bcác ai\b': 'các AI',
        r'\bfast api\b': 'FastAPI',
        r'\bweb socket\b': 'WebSocket',
        r'\bnext js\b': 'Next.js',
    }
    for pattern, replacement in typo_map.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

    # Capitalize technical terms
    for term in KNOWN_TECH_TERMS:
        pattern = r'\b' + re.escape(term) + r'\b'
        cleaned = re.sub(pattern, term, cleaned, flags=re.IGNORECASE)

    # Heuristic to capitalize Vietnamese names after "tên là" or "gọi là" to fix ASR lowercase issues
    # e.g., "tên là Huỳnh Long phát" -> "tên là Huỳnh Long Phát"
    def capitalize_name_heuristic(match):
        prefix = match.group(1)
        name_str = match.group(2)
        
        # Preserve leading/trailing spaces
        leading_spaces = name_str[:len(name_str) - len(name_str.lstrip())]
        trailing_spaces = name_str[len(name_str.rstrip()):]
        if not trailing_spaces and name_str.endswith(" "):
            trailing_spaces = " "
            
        words = name_str.split()
        capitalized_words = []
        for i, w in enumerate(words):
            if i < 4 and w.islower() and len(w) <= 7 and w not in ['và', 'là', 'thì', 'mà', 'ở', 'từ', 'đến']:
                capitalized_words.append(w.capitalize())
            else:
                capitalized_words.append(w)
                
        return prefix + leading_spaces + " ".join(capitalized_words) + trailing_spaces
        
    cleaned = re.sub(r'\b(tên là\s+|gọi là\s+)([\w\s]{1,30})(?=\b|[.,!?]|$)', capitalize_name_heuristic, cleaned, flags=re.IGNORECASE)

    # Capitalize first letter
    if cleaned:
        cleaned = cleaned[0].upper() + cleaned[1:]

    # Append terminal punctuation if missing
    if cleaned and not cleaned.endswith(('.', '?', '!')):
        cleaned += '.'

    return cleaned


def extract_technical_terms(text: str) -> List[str]:
    """Deterministic extraction of known technical terms via regex."""
    found_terms = set()
    for term in KNOWN_TECH_TERMS:
        pattern = r'\b' + re.escape(term) + r'\b'
        if re.search(pattern, text, re.IGNORECASE):
            found_terms.add(term)
    return list(found_terms)


def _detect_language_heuristic(text: str, tech_terms: List[str]) -> str:
    """Heuristic language detection using character/word patterns."""
    has_vi = bool(re.search(r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]', text, re.I))
    has_en_words = bool(re.search(r'\b(we|are|testing|is|the|meeting|protocol|and|with|for)\b', text, re.I))
    
    if has_vi and (has_en_words or tech_terms):
        return "VI+EN"
    elif has_vi:
        return "Vietnamese"
    else:
        return "English"


def clean_and_analyze(raw_text: str) -> Dict[str, Any]:
    """
    STAGE 1: 100% CODE LOGIC SERVICE (Zero LLM, <1ms execution)
    
    Processes:
    1. ASR Hallucination & Stutter Removal (Regex)
    2. Filler Words Removal (Regex)
    3. Inverse Text Normalization (ITN - numbers, dates, %, currency)
    4. Punctuation & Capitalization Restoration
    5. Technical Terms Extraction & Language Detection
    """
    if not raw_text or not raw_text.strip():
        return {
            "polished_text": "",
            "language_detected": "unknown",
            "technical_terms": [],
            "context_summary": ""
        }

    # Step 1: Remove fillers & ASR repetitions
    cleaned = remove_fillers_and_hallucinations(raw_text)

    # Step 2: Apply Inverse Text Normalization (ITN)
    itn_text = apply_itn_inverse_text_normalization(cleaned)

    # Step 3: Restore punctuation, capitalization & tech terms
    polished = restore_punctuation_and_capitalization(itn_text)

    # Step 4: Extract terms & detect language
    tech_terms = extract_technical_terms(polished)
    lang = _detect_language_heuristic(polished, tech_terms)

    return {
        "polished_text": polished,
        "language_detected": lang,
        "technical_terms": tech_terms,
        "context_summary": "Meeting communication & technical protocol"
    }


# Cache Ollama online status with TTL to re-check periodically
_ollama_online = None
_ollama_check_time = 0.0
_OLLAMA_CACHE_TTL = 30.0  # Re-check every 30 seconds
_ollama_consecutive_failures = 0

def check_ollama_online() -> bool:
    import time
    global _ollama_online, _ollama_check_time, _ollama_consecutive_failures
    now = time.monotonic()
    
    # Circuit breaker: if we failed consecutively, force offline for TTL
    if _ollama_consecutive_failures >= 2:
        if (now - _ollama_check_time) < _OLLAMA_CACHE_TTL * 2: # 60s penalty
            return False
        else:
            # Time to test again
            _ollama_consecutive_failures = 0
            
    if _ollama_online is not None and (now - _ollama_check_time) < _OLLAMA_CACHE_TTL:
        return _ollama_online
        
    try:
        res = requests.get("http://127.0.0.1:11434/api/tags", timeout=0.5)
        _ollama_online = (res.status_code == 200)
    except Exception:
        _ollama_online = False
    _ollama_check_time = now
    return _ollama_online


# ==================== STAGE 2: BILINGUAL TRANSLATE (CTranslate2) ====================

SAFE_PLACEHOLDERS = ["Taylor", "Jordan", "Alex", "Morgan", "Riley", "Casey", "Jamie"]

VI_UPPER = 'A-ZÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ'
VI_LOWER = 'a-záàảãạâấầẩẫậăắằẳẵặđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ'

def _protect_proper_names(text: str):
    """
    Finds Vietnamese proper names and known tech terms, replacing them with safe English placeholders.
    Returns the modified text and a dict mapping placeholders to original names.
    """
    name_pattern = rf'\b[{VI_UPPER}][{VI_LOWER}]+(?:\s+[{VI_UPPER}][{VI_LOWER}]+)+\b'
    names = set(re.findall(name_pattern, text))
    
    # Also protect KNOWN_TECH_TERMS found in the text
    for term in KNOWN_TECH_TERMS:
        if re.search(r'\b' + re.escape(term) + r'\b', text, flags=re.IGNORECASE):
            names.add(term)
    
    mapping = {}
    modified_text = text
    idx = 0
    
    for name in names:
        if idx < len(SAFE_PLACEHOLDERS):
            placeholder = SAFE_PLACEHOLDERS[idx]
            modified_text = re.sub(r'\b' + re.escape(name) + r'\b', placeholder, modified_text)
            mapping[placeholder] = name
            idx += 1
            
    return modified_text, mapping

def _restore_proper_names(text: str, mapping: dict) -> str:
    restored = text
    for placeholder, original_name in mapping.items():
        restored = re.sub(r'\b' + re.escape(placeholder) + r'\b', original_name, restored)
    return restored

def _ensure_punctuation(text: str) -> str:
    """Ensure text ends with terminal punctuation."""
    if text and not text.endswith(('.', '?', '!')):
        text += '.'
    return text


def _capitalize_first(text: str) -> str:
    """Capitalize the first letter."""
    if text and len(text) > 0:
        return text[0].upper() + text[1:]
    return text


def bilingual_translate_fast(text: str, technical_terms: Optional[List[str]] = None) -> Dict[str, str]:
    """
    PRIMARY TRANSLATION PATH using CTranslate2 (~20-50ms).
    Falls back to echo (passthrough) if CTranslate2 is not available.
    
    Input assumed Vietnamese, output English translation via neural MT.
    """
    if not text.strip():
        return {"en_text": "", "vi_text": "", "validation_notes": "Empty input"}

    if technical_terms is None:
        technical_terms = []

    # Determine input language
    has_vi_chars = bool(re.search(
        r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]',
        text, re.I
    ))

    if has_vi_chars or _detect_language_heuristic(text, technical_terms) in ("Vietnamese", "VI+EN"):
        # Vietnamese input → translate to English
        vi_text = _ensure_punctuation(_capitalize_first(text))

        safe_text, name_mapping = _protect_proper_names(text)

        # Try CTranslate2 first
        en_result = translate_vi_to_en(safe_text)
        if en_result:
            en_result = _restore_proper_names(en_result, name_mapping)
            en_text = _ensure_punctuation(_capitalize_first(en_result))
            method = "CTranslate2"
        else:
            # Fallback: echo Vietnamese as-is
            en_text = vi_text
            method = "Fallback (CTranslate2 unavailable)"
    else:
        # English input → translate to Vietnamese
        en_text = _ensure_punctuation(_capitalize_first(text))

        # We can protect English names too if translating to VI
        safe_text, name_mapping = _protect_proper_names(text)
        
        en_vi_result = translate_en_to_vi(safe_text)
        if en_vi_result:
            en_vi_result = _restore_proper_names(en_vi_result, name_mapping)
            vi_text = _ensure_punctuation(_capitalize_first(en_vi_result))
            method = "CTranslate2"
        else:
            vi_text = en_text
            method = "Fallback (CTranslate2 unavailable)"

    return {
        "en_text": en_text,
        "vi_text": vi_text,
        "validation_notes": method
    }


def bilingual_translate_llm(text: str, technical_terms: Optional[List[str]] = None) -> Optional[Dict[str, str]]:
    """
    OPTIONAL REFINEMENT PATH (LLM): High-quality translation via Ollama.
    Only used as a background refinement after CTranslate2 provides the initial result.
    Returns None if LLM is unavailable or fails.
    """
    if not text.strip():
        return None

    if technical_terms is None:
        technical_terms = []

    if not check_ollama_online():
        return None

    terms_note = f" Keep these terms in English: {', '.join(technical_terms)}." if technical_terms else ""
    prompt = f"/no_think\nTranslate this Vietnamese text to natural English.{terms_note} Output ONLY the English translation, nothing else.\n\n{text}"

    try:
        res = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": 100,
                    "temperature": 0.1,
                    "top_p": 0.9,
                },
            },
            timeout=8,
        )
        if res.status_code == 200:
            en_text = res.json().get("response", "").strip()
            en_text = re.sub(r'^["\']|["\']$', '', en_text).strip()
            en_text = re.sub(r'^```.*\n?|\n?```$', '', en_text).strip()
            if en_text and len(en_text) > 3:
                vi_text = _ensure_punctuation(_capitalize_first(text))
                en_text = _ensure_punctuation(_capitalize_first(en_text))
                return {
                    "en_text": en_text,
                    "vi_text": vi_text,
                    "validation_notes": "LLM refined"
                }
    except Exception as e:
        logger.warning(f"LLM translate failed: {e}")

    return None


def bilingual_translate(text: str, technical_terms: Optional[List[str]] = None) -> Dict[str, str]:
    """
    Primary translation: CTranslate2 (fast, ~20-50ms).
    CTranslate2 handles both VI→EN and EN→VI directions.
    """
    return bilingual_translate_fast(text, technical_terms)


def _validate_terms_preserved(original: str, translations: Dict[str, str], terms: List[str]) -> str:
    """
    Lightweight regex-based validation (replaces the old LLM validation).
    Checks that technical terms appear in both translations.
    """
    if not terms:
        return "EN: OK | VI: OK"
    
    notes = []
    for lang_key in ("en_text", "vi_text"):
        lang_label = "EN" if lang_key == "en_text" else "VI"
        trans_text = translations.get(lang_key, "")
        missing = [t for t in terms if not re.search(re.escape(t), trans_text, re.IGNORECASE)]
        if missing:
            notes.append(f"{lang_label}: Missing terms [{', '.join(missing)}]")
        else:
            notes.append(f"{lang_label}: Terms verified")
    
    return " | ".join(notes)


# ==================== STAGE 3: FULL PIPELINE ORCHESTRATOR ====================

def process_full_translation_pipeline(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Optimized 3-stage pipeline (was 6 stages with 6 LLM calls, now 2 LLM calls max).
    
    Stage 1: clean_and_analyze()  → 1 LLM call (clean + polish + detect lang + extract terms)
    Stage 2: bilingual_translate() → 1 LLM call (EN + VI translation + validation)
    Stage 3: Assemble JSON payload  → No LLM call
    """
    if not raw_text or not raw_text.strip():
        return None

    # ── Stage 1: Clean & Analyze (1 LLM call) ──
    analysis = clean_and_analyze(raw_text)
    polished = analysis.get("polished_text", raw_text)
    tech_terms = analysis.get("technical_terms", [])

    if not polished:
        return None

    # ── Stage 2: Bilingual Translate (1 LLM call) ──
    translations = bilingual_translate(polished, technical_terms=tech_terms)

    # ── Stage 3: Assemble Payload (no LLM) ──
    return {
        "type": "bilingual_translation",
        "original_text": raw_text,
        "polished_text": polished,
        "detected_lang": analysis.get("language_detected", "Auto"),
        "context_summary": analysis.get("context_summary", ""),
        "technical_terms": tech_terms,
        "en_text": translations.get("en_text", ""),
        "vi_text": translations.get("vi_text", ""),
        "validation_notes": translations.get("validation_notes", "OK")
    }


async def process_full_translation_pipeline_streaming(raw_text: str, send_fn):
    """
    Ultra-low-latency streaming translation pipeline with CTranslate2.
    
    Strategy:
      Frame 1: Send Vietnamese text immediately (is_final=false) → user sees VI subtitle instantly
      Frame 2: CTranslate2 translates (~30ms) → send full bilingual result (is_final=true)
      Frame 3 (optional): LLM refine in background if Ollama is online
    
    Target: <50ms for first subtitle, <100ms for bilingual result.
    """
    if not raw_text or not raw_text.strip():
        return None

    import uuid

    item_id = str(uuid.uuid4())[:8]

    # ── Stage 1: Clean & Analyze (<2ms, pure regex) ──
    analysis = clean_and_analyze(raw_text)
    polished = analysis.get("polished_text", raw_text)
    tech_terms = analysis.get("technical_terms", [])
    lang = analysis.get("language_detected", "Auto")
    summary = analysis.get("context_summary", "")

    base_payload = {
        "type": "bilingual_translation_stream",
        "id": item_id,
        "original_text": raw_text,
        "polished_text": polished,
        "detected_lang": lang,
        "context_summary": summary,
        "technical_terms": tech_terms,
        "en_text": "",
        "vi_text": polished,
        "validation_notes": "Translating...",
        "is_final": False,
    }

    async def safe_send(payload):
        try:
            await send_fn(payload)
            return True
        except Exception:
            return False

    # ── Frame 1: Send Vietnamese text immediately (<5ms) ──
    if not await safe_send(base_payload):
        return None

    # ── Frame 2: CTranslate2 translation streaming ──
    from .ct2_translator import translate_vi_to_en_stream, is_ct2_available
    
    safe_polished, name_mapping = _protect_proper_names(polished)
    
    if is_ct2_available():
        en_accumulated = ""
        try:
            # Wrap the synchronous blocking generator so it doesn't block the async event loop
            stream_iter = iter(translate_vi_to_en_stream(safe_polished))
            def get_next_token():
                try:
                    return next(stream_iter)
                except StopIteration:
                    return None

            while True:
                token = await asyncio.to_thread(get_next_token)
                if token is None:
                    break
                    
                en_accumulated += token
                display_en = _restore_proper_names(en_accumulated, name_mapping)
                base_payload["en_text"] = display_en.strip()
                if not await safe_send(base_payload):
                    return None
                    
            base_payload["is_final"] = True
            base_payload["validation_notes"] = "CTranslate2 Stream"
            await safe_send(base_payload)
        except Exception as e:
            logger.error(f"Stream error: {e}")
            # fallback
            mt_result = await asyncio.to_thread(bilingual_translate_fast, polished, tech_terms)
            base_payload["en_text"] = mt_result.get("en_text", polished)
            base_payload["vi_text"] = mt_result.get("vi_text", polished)
            base_payload["is_final"] = True
            base_payload["validation_notes"] = mt_result.get("validation_notes", "CTranslate2")
            await safe_send(base_payload)
    else:
        mt_result = await asyncio.to_thread(bilingual_translate_fast, polished, tech_terms)
        base_payload["en_text"] = mt_result.get("en_text", polished)
        base_payload["vi_text"] = mt_result.get("vi_text", polished)
        base_payload["is_final"] = True
        base_payload["validation_notes"] = mt_result.get("validation_notes", "CTranslate2")
        if not await safe_send(base_payload):
            return None

    # ── Frame 3 (optional): LLM refine in background ──
    if check_ollama_online():
        try:
            llm_result = await asyncio.to_thread(bilingual_translate_llm, polished, tech_terms)
            if llm_result and llm_result.get("en_text"):
                base_payload["en_text"] = llm_result["en_text"]
                base_payload["vi_text"] = llm_result.get("vi_text", polished)
                base_payload["is_final"] = True
                base_payload["validation_notes"] = "LLM refined"
                await safe_send(base_payload)
        except Exception as e:
            logger.warning(f"LLM background refine skipped: {e}")

    return base_payload

