"""
Redis Enterprise Caching Layer with In-Memory Graceful Fallback.
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class RedisCacheService:
    """High-performance caching wrapper supporting Redis or in-memory fallback dict."""

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_client = None
        self._memory_fallback = {}

        if redis_url:
            try:
                import redis
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
            except Exception as e:
                logger.warning(f"Could not connect to Redis server: {e}. Falling back to in-memory cache.")

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        serialized = json.dumps(value)
        if self.redis_client:
            try:
                self.redis_client.setex(key, ttl, serialized)
                return True
            except Exception as e:
                logger.warning(f"Redis set failed: {e}. Writing to fallback.")

        self._memory_fallback[key] = serialized
        return True

    def get(self, key: str) -> Optional[Any]:
        raw = None
        if self.redis_client:
            try:
                raw = self.redis_client.get(key)
            except Exception as e:
                logger.warning(f"Redis get failed: {e}. Reading from fallback.")

        if raw is None:
            raw = self._memory_fallback.get(key)

        if raw:
            try:
                return json.loads(raw)
            except Exception:
                return raw
        return None

    def delete(self, key: str) -> bool:
        if self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception as e:
                logger.warning(f"Redis delete failed: {e}")

        self._memory_fallback.pop(key, None)
        return True

    def flush(self):
        if self.redis_client:
            try:
                self.redis_client.flushdb()
            except Exception as e:
                logger.warning(f"Redis flush failed: {e}")

        self._memory_fallback.clear()


# Global singleton instance
cache_service = RedisCacheService()
