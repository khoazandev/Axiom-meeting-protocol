"""
V1 API router — aggregates all v1 endpoint routers.

NOTE: Several routes are temporarily disabled during platform redesign Phase 1.
They will be re-enabled and refactored in Phase 2/3.
"""

from fastapi import APIRouter

from src.backend.api.v1.auth import router as auth_router
from src.backend.api.v1.departments import router as departments_router
from src.backend.api.v1.health import router as health_router
from src.backend.api.v1.meeting_content import router as meeting_content_router
from src.backend.api.v1.meetings_v2 import router as meetings_v2_router
from src.backend.api.v1.org_invitations import accept_router as invitation_accept_router
from src.backend.api.v1.org_invitations import router as org_invitations_router
from src.backend.api.v1.organizations import router as organizations_router
from src.backend.api.v1.meeting_end import router as meeting_end_router

# Temporarily disabled during platform redesign — will be refactored in Phase 2/3
# from src.backend.api.v1.admin import router as admin_router
# from src.backend.api.v1.ai_hooks import router as ai_hooks_router
# from src.backend.api.v1.analytics import router as analytics_router
# from src.backend.api.v1.files import router as files_router
# from src.backend.api.v1.invitations import router as invitations_router
# from src.backend.api.v1.knowledge import router as knowledge_router  # disabled: uses removed models
# from src.backend.api.v1.meetings import router as meetings_router
# from src.backend.api.v1.mom import router as mom_router
# from src.backend.api.v1.notifications import router as notifications_router
from src.backend.api.v1.tasks import router as tasks_router
from src.backend.api.v1.users import router as users_router
from src.backend.api.v1.webhooks import router as webhooks_router

# from src.backend.api.v1.workspaces import router as workspaces_router

v1_router = APIRouter()

# Health endpoints at root level (no /api/v1 prefix)
v1_router.include_router(health_router)

# API v1 endpoints under /api/v1/
api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(webhooks_router)
api_v1_router.include_router(organizations_router)
api_v1_router.include_router(departments_router)
api_v1_router.include_router(org_invitations_router)
api_v1_router.include_router(meetings_v2_router)
api_v1_router.include_router(meeting_content_router)
api_v1_router.include_router(invitation_accept_router)
api_v1_router.include_router(meeting_end_router)
api_v1_router.include_router(users_router)


# Routes below will be re-enabled after Phase 2/3 refactor
# api_v1_router.include_router(workspaces_router)
# api_v1_router.include_router(meetings_router)
api_v1_router.include_router(tasks_router)
# api_v1_router.include_router(notifications_router)
# api_v1_router.include_router(invitations_router)
# api_v1_router.include_router(files_router)
# api_v1_router.include_router(ai_hooks_router)
# api_v1_router.include_router(mom_router)
# api_v1_router.include_router(knowledge_router)  # disabled: uses removed models
# api_v1_router.include_router(admin_router)
# api_v1_router.include_router(analytics_router)
