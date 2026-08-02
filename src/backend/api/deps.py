from typing import Generator
from fastapi import Depends, Header, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.backend.core.exceptions import AuthenticationException, ForbiddenException, NotFoundException
from src.backend.core.security import decode_token
from src.backend.database import get_db
from src.backend.models import RoleEnum, User, WorkspaceMember

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Validate Bearer token and return current authenticated User."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise AuthenticationException("Invalid token type")
        user_id: str = payload.get("sub")
        if not user_id:
            raise AuthenticationException("Invalid token payload")
    except Exception as e:
        raise AuthenticationException(f"Invalid authentication token: {str(e)}")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise NotFoundException("User")
    return user


def get_current_workspace_member(
    workspace_id: str | None = Header(None, alias="X-Workspace-ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspaceMember:
    """Verify user membership in the requested Workspace (via X-Workspace-ID header)."""
    if not workspace_id:
        raise ForbiddenException("X-Workspace-ID header is required for workspace endpoints")

    member = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id)
        .first()
    )
    if not member:
        raise ForbiddenException("User is not a member of this workspace")

    return member


def require_role(allowed_roles: list[RoleEnum]):
    """FastAPI dependency factory enforcing RBAC roles."""

    def role_checker(member: WorkspaceMember = Depends(get_current_workspace_member)) -> WorkspaceMember:
        if member.role not in allowed_roles:
            raise ForbiddenException(f"Required role: {', '.join(r.value for r in allowed_roles)}")
        return member

    return role_checker
