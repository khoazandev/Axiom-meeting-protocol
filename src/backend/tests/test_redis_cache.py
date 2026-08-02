import pytest
from src.backend.core import redis_cache

def test_redis_cache_set_get_delete():
    cache = redis_cache.RedisCacheService()

    # Set & Get
    cache.set("user_session_123", {"user_id": "u1", "role": "ADMIN"}, ttl=3600)
    data = cache.get("user_session_123")
    assert data is not None
    assert data["user_id"] == "u1"
    assert data["role"] == "ADMIN"

    # Delete
    cache.delete("user_session_123")
    assert cache.get("user_session_123") is None

def test_redis_cache_fallback():
    # Test fallback dictionary when redis is offline
    cache = redis_cache.RedisCacheService()
    cache.set("hot_workspace_stats", {"active_members": 42}, ttl=300)
    assert cache.get("hot_workspace_stats")["active_members"] == 42
