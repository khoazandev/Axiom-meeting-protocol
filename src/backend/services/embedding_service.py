"""
Embedding Service — Wraps Ollama nomic-embed-text for vector embeddings.

Used by the RAG feedback learning pipeline to:
1. Embed transcript snippets when corrections are captured
2. Embed new transcripts for similarity search against past corrections
"""

import json
import logging
import math
from typing import Optional

import requests

from src.backend.core.config import get_settings

logger = logging.getLogger("axiom.embedding")


class EmbeddingService:
    """Generate embeddings via Ollama's /api/embed endpoint."""

    MODEL = "nomic-embed-text"

    def embed(self, text: str) -> Optional[list[float]]:
        """
        Return embedding vector for the given text.

        Returns:
            list[float] (768-dim) or None if embedding fails.
        """
        settings = get_settings()
        base_url = (settings.ollama_base_url or "http://localhost:11434").rstrip("/")

        try:
            resp = requests.post(
                f"{base_url}/api/embed",
                json={"model": self.MODEL, "input": text},
                timeout=30,
            )
            resp.raise_for_status()
            embeddings = resp.json().get("embeddings", [])
            if embeddings:
                return embeddings[0]
            logger.warning("Ollama returned empty embeddings for text: %s...", text[:80])
            return None
        except Exception as e:
            logger.warning("Embedding failed: %s", e)
            return None

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)


# Global singleton
embedding_service = EmbeddingService()
