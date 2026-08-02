"""
Shared dependencies for API route handlers.

All database session injection and future auth dependencies live here.
"""

from src.backend.database import get_db

# Re-export for convenient imports in route handlers
__all__ = ["get_db"]
