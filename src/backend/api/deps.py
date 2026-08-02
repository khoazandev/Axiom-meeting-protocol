from typing import List, Union
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import AuthenticationException, ForbiddenException
from src.backend.core.security import decode_token
from src.backend.database import get_db
from src.backend.models import RoleEnum, User, WorkspaceMember

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
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
    workspace_id: str = Header(..., alias="X-Workspace-ID"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> WorkspaceMember:
    user = get_current_user(credentials, db)
    member = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user.id)
        .first()
    )
    if not member:
        raise ForbiddenException("User is not a member of this workspace")

    return member


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


def require_role(allowed_roles: Union[RoleEnum, List[RoleEnum]]):
    """FastAPI dependency factory enforcing RBAC roles."""
    roles = [allowed_roles] if isinstance(allowed_roles, RoleEnum) else allowed_roles

    def role_checker(member: WorkspaceMember = Depends(get_current_workspace_member)) -> WorkspaceMember:
        if member.role not in roles:
            role_names = [r.value if isinstance(r, RoleEnum) else str(r) for r in roles]
            raise ForbiddenException(f"Required role: {', '.join(role_names)}")
        return member

    return role_checker
