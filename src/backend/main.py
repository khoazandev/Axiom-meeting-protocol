"""
Axiom — Enterprise Meeting Protocol API.

This is the application factory. All routes, middleware, and configuration
are assembled here. Business logic lives in api/v1/ and core/.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.backend.api.v1.router import v1_router, api_v1_router
from src.backend.core.config import get_settings
from src.backend.core.exceptions import register_exception_handlers
from src.backend.database import Base, engine


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI instance."""
    settings = get_settings()

    application = FastAPI(title=settings.app_title)

    # ── CORS ──────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception Handlers ────────────────────────────────
    register_exception_handlers(application)

    # ── Routes ────────────────────────────────────────────
    # Root-level routes (/, /health)
    application.include_router(v1_router)
    # API v1 routes (/api/v1/...)
    application.include_router(api_v1_router)

    # ── Legacy route compatibility ────────────────────────
    # Keep /api/meetings/ working for existing frontend until migration
    from src.backend.api.v1 import meetings as meetings_module
    from fastapi import APIRouter

    legacy_router = APIRouter(prefix="/api/meetings", tags=["meetings-legacy"])
    legacy_router.add_api_route("/", meetings_module.create_meeting, methods=["POST"])
    legacy_router.add_api_route("/", meetings_module.read_meetings, methods=["GET"])
    legacy_router.add_api_route("/{meeting_id}", meetings_module.read_meeting, methods=["GET"])
    legacy_router.add_api_route("/{meeting_id}", meetings_module.delete_meeting, methods=["DELETE"])
    legacy_router.add_api_route("/{meeting_id}/token", meetings_module.get_meeting_token, methods=["GET"])
    application.include_router(legacy_router)

    return application


# ── Database initialization (will be replaced by Alembic in this Phase) ──
Base.metadata.create_all(bind=engine)

# ── App instance for uvicorn ──
app = create_app()
