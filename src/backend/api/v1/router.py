"""
V1 API router — aggregates all v1 endpoint routers.
"""

from fastapi import APIRouter

from src.backend.api.v1.health import router as health_router
from src.backend.api.v1.meetings import router as meetings_router

v1_router = APIRouter()

# Health endpoints at root level (no /api/v1 prefix)
v1_router.include_router(health_router)

# Meeting endpoints under /api/v1/meetings
api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(meetings_router)
