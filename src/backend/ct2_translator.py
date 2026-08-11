"""
CTranslate2 Translation Engine for Real-time Bilingual Subtitles.

Uses CTranslate2 INT8-quantized models for maximum speed (~22-30ms per sentence).
This is the ONLY engine used for fast on-device translation.

Model directions:
  - Helsinki-NLP/opus-mt-vi-en for Vietnamese → English
  - Helsinki-NLP/opus-mt-en-vi for English → Vietnamese
"""

import logging
import os
import threading
import time
from typing import Any, Optional, Tuple

logger = logging.getLogger("axiom.ct2_translator")
logger.setLevel(logging.INFO)

from src.backend.core.config import get_settings

# ==================== MODEL REGISTRY ====================
_models_lock = threading.Lock()

# CTranslate2 engine (fast, quantized)
_ct2_vi_en = None  # ctranslate2.Translator or False
_ct2_en_vi = None  # ctranslate2.Translator or False
_ct2_tokenizer_vi_en = None
_ct2_tokenizer_en_vi = None


# CTranslate2 quantized model directories
CT2_VI_EN_DIR = "./models/marian_ct2_vi_en"
CT2_EN_VI_DIR = "./models/marian_ct2_en_vi"
MODEL_CACHE_DIR = "./models/marian"


# ==================== ENGINE LOAD ====================


def _load_ct2_model(ct2_dir: str, model_name: str):
    """
    Load a CTranslate2 quantized model + MarianTokenizer.
    Returns (translator, tokenizer) or None.
    """
    try:
        import ctranslate2
        from transformers import MarianTokenizer

        if not os.path.exists(ct2_dir):
            logger.info(
                f"CTranslate2 model not found at {ct2_dir}, converting from {model_name}..."
            )
            converter = ctranslate2.converters.TransformersConverter(model_name)
            converter.convert(ct2_dir, quantization="int8")
            logger.info(f"CTranslate2 model converted and saved to {ct2_dir}")

        start = time.monotonic()
        translator = ctranslate2.Translator(
            ct2_dir,
            device="cpu",
            inter_threads=2,
            intra_threads=4,
        )
        tokenizer = MarianTokenizer.from_pretrained(model_name, cache_dir=MODEL_CACHE_DIR)
        elapsed = time.monotonic() - start
        logger.info(f"CTranslate2 model loaded: {ct2_dir} ({elapsed:.1f}s)")
        return (translator, tokenizer)

    except Exception as e:
        logger.error(f"Failed to load CTranslate2 model {ct2_dir}: {e}")
        return None


def get_ct2_vi_en() -> Optional[Tuple[Any, Any]]:
    """Get CTranslate2 Vietnamese→English model (lazy-load, thread-safe)."""
    global _ct2_vi_en, _ct2_tokenizer_vi_en
    if _ct2_vi_en is None:
        with _models_lock:
            if _ct2_vi_en is None:
                result = _load_ct2_model(CT2_VI_EN_DIR, get_settings().trans_vi_en_model)
                if result:
                    _ct2_vi_en, _ct2_tokenizer_vi_en = result
                else:
                    _ct2_vi_en = False
    return (_ct2_vi_en, _ct2_tokenizer_vi_en) if _ct2_vi_en and _ct2_vi_en is not False else None


def get_ct2_en_vi() -> Optional[Tuple[Any, Any]]:
    """Get CTranslate2 English→Vietnamese model (lazy-load, thread-safe)."""
    global _ct2_en_vi, _ct2_tokenizer_en_vi
    if _ct2_en_vi is None:
        with _models_lock:
            if _ct2_en_vi is None:
                result = _load_ct2_model(CT2_EN_VI_DIR, get_settings().trans_en_vi_model)
                if result:
                    _ct2_en_vi, _ct2_tokenizer_en_vi = result
                else:
                    _ct2_en_vi = False
    return (_ct2_en_vi, _ct2_tokenizer_en_vi) if _ct2_en_vi and _ct2_en_vi is not False else None


# ==================== TRANSLATION FUNCTIONS ====================


def translate_vi_to_en(text: str) -> Optional[str]:
    """
    Translate Vietnamese → English (batch mode, no streaming).
    Returns None if model is not loaded.
    """
    if not is_ct2_loaded():
        return None
    if not text or not text.strip():
        return None

    text = text.strip()
    ct2_pair = get_ct2_vi_en()

    if not ct2_pair:
        logger.error("CTranslate2 VI→EN model is unavailable.")
        return None

    translator, tokenizer = ct2_pair
    try:
        start = time.monotonic()
        source_tokens = tokenizer.convert_ids_to_tokens(tokenizer.encode(text))
        results = translator.translate_batch([source_tokens], beam_size=2)
        target_tokens = results[0].hypotheses[0]
        result = tokenizer.decode(
            tokenizer.convert_tokens_to_ids(target_tokens), skip_special_tokens=True
        )
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.debug(f"CT2 VI→EN: {elapsed_ms:.0f}ms | '{text[:50]}' → '{result[:50]}'")
        return result.strip() if result else None
    except Exception as e:
        logger.error(f"CTranslate2 VI→EN error: {e}")
        return None


def translate_vi_to_en_stream(text: str):
    """
    Translate Vietnamese → English, yielding each CHARACTER for true streaming UI.
    Uses CTranslate2 true streaming `generate_tokens`.
    """
    if not text or not text.strip():
        return

    text = text.strip()
    ct2_pair = get_ct2_vi_en()

    if not ct2_pair:
        logger.error("CTranslate2 VI→EN model is unavailable for streaming.")
        return

    translator, tokenizer = ct2_pair
    try:
        source_tokens = tokenizer.convert_ids_to_tokens(tokenizer.encode(text))
        step_results = translator.generate_tokens(source_tokens)

        for step_result in step_results:
            token = step_result.token
            if token.endswith("</s>") or token.endswith("<pad>"):
                continue

            # convert_tokens_to_string strips spaces when called on single tokens.
            # We must manually replace SentencePiece marker (U+2581) with space.
            text_part = token.replace("\u2581", " ")

            # Yield token part immediately
            if text_part:
                yield text_part
    except Exception as e:
        logger.error(f"CTranslate2 stream error: {e}")
        return


def translate_en_to_vi(text: str) -> Optional[str]:
    """
    Translate English → Vietnamese (batch mode, no streaming).
    Returns None if model is not loaded.
    """
    if not is_ct2_loaded():
        return None
    if not text or not text.strip():
        return None

    text = text.strip()
    ct2_pair = get_ct2_en_vi()

    if not ct2_pair:
        logger.error("CTranslate2 EN→VI model is unavailable.")
        return None

    translator, tokenizer = ct2_pair
    try:
        start = time.monotonic()
        source_tokens = tokenizer.convert_ids_to_tokens(tokenizer.encode(text))
        results = translator.translate_batch([source_tokens], beam_size=2)
        target_tokens = results[0].hypotheses[0]
        result = tokenizer.decode(
            tokenizer.convert_tokens_to_ids(target_tokens), skip_special_tokens=True
        )
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.debug(f"CT2 EN→VI: {elapsed_ms:.0f}ms | '{text[:50]}' → '{result[:50]}'")
        return result.strip() if result else None
    except Exception as e:
        logger.error(f"CTranslate2 EN→VI error: {e}")
        return None


def is_ct2_available() -> bool:
    """Check if at least the VI→EN translation is available (blocks if loading)."""
    return get_ct2_vi_en() is not None


def is_ct2_loaded() -> bool:
    """Non-blocking check if the VI→EN model is loaded in memory."""
    global _ct2_vi_en
    return _ct2_vi_en is not None and _ct2_vi_en is not False


# ==================== PRELOAD UTILITY ====================


def preload_models(vi_en: bool = True, en_vi: bool = True):
    """
    Preload CTranslate2 models in background thread.
    Call this at app startup to avoid cold-start latency on first translation.
    """

    def _preload():
        if vi_en:
            get_ct2_vi_en()
        if en_vi:
            get_ct2_en_vi()

    thread = threading.Thread(target=_preload, daemon=True, name="ct2-preload")
    thread.start()
    logger.info("CTranslate2 model preloading started")
