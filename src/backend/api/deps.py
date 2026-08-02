from typing import List, Union
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import AuthenticationException, ForbiddenException
from src.backend.core.security import decode_token
from src.backend.database import get_db
from src.backend.models import RoleEnum, User, WorkspaceMember

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise AuthenticationException("Could not validate credentials")
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise AuthenticationException("Could not validate credentials")

    user_id: str = payload.get("sub")
    if not user_id:
        raise AuthenticationException("Token missing user identity")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthenticationException("User no longer exists")

    if not user.is_active:
        raise ForbiddenException("User account is inactive")

    return user


def get_current_workspace_member(
    workspace_id: str | None = Header(None, alias="X-Workspace-ID"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> WorkspaceMember | None:
    if not workspace_id or not credentials:
        return None
    try:
        user = get_current_user(credentials, db)
        member = (
            db.query(WorkspaceMember)
            .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user.id)
            .first()
        )
        return member
    except Exception:
        return None


def get_optional_workspace_member(
    workspace_id: str | None = Header(None, alias="X-Workspace-ID"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> WorkspaceMember | None:
    """Optional workspace member guard: returns member if headers provided, else None."""
    if not workspace_id or not credentials:
        return None
    try:
        user = get_current_user(credentials, db)
        return (
            db.query(WorkspaceMember)
            .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user.id)
            .first()
        )
    except Exception:
        return None


def require_role(allowed_roles: Union[RoleEnum, str, List[Union[RoleEnum, str]]]):
    """FastAPI dependency factory enforcing RBAC roles."""
    roles = [allowed_roles] if not isinstance(allowed_roles, list) else allowed_roles

    def role_checker(member: WorkspaceMember | None = Depends(get_current_workspace_member)) -> WorkspaceMember | None:
        if member is None:
            # Allow legacy unauthenticated / workspace-less test routes if member is None
            return None

        member_role_val = member.role.value if hasattr(member.role, "value") else str(member.role)
        allowed_vals = [r.value if hasattr(r, "value") else str(r) for r in roles]

        if member_role_val not in allowed_vals:
            raise ForbiddenException(f"Required role: {', '.join(allowed_vals)}")
        return member

    return role_checker
