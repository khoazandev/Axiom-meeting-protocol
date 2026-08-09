from typing import List, Union

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import AuthenticationException, ForbiddenException
from src.backend.core.security import decode_token
from src.backend.database import get_db
from src.backend.models import OrganizationMember, User

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


def get_current_org_member(
    organization_id: str | None = Header(None, alias="X-Organization-ID"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> OrganizationMember | None:
    """Returns the current user's membership in the given organization."""
    if not organization_id or not credentials:
        return None
    try:
        user = get_current_user(credentials, db)
        member = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.user_id == user.id,
            )
            .first()
        )
        return member
    except Exception:
        return None


# Legacy aliases for backward compatibility during migration
get_current_workspace_member = get_current_org_member
get_optional_workspace_member = get_current_org_member


def require_permission(permission_code: str):
    """FastAPI dependency factory enforcing RBAC permissions via role_permissions lookup."""

    def permission_checker(
        member: OrganizationMember | None = Depends(get_current_org_member),
        db: Session = Depends(get_db),
    ) -> OrganizationMember | None:
        if member is None:
            return None

        has_perm = (
            db.query(models.RolePermission)
            .join(models.Permission)
            .filter(
                models.RolePermission.role_id == member.role_id,
                models.Permission.code == permission_code,
            )
            .first()
        )
        if not has_perm:
            raise ForbiddenException(f"Missing permission: {permission_code}")
        return member

    return permission_checker


def require_role(allowed_roles):
    """Legacy role checker — stub for backward compat. Use require_permission instead."""

    def role_checker(
        member: OrganizationMember | None = Depends(get_current_org_member),
    ) -> OrganizationMember | None:
        if member is None:
            return None
        return member

    return role_checker
