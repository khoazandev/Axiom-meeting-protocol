from typing import List, Union

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import AuthenticationException, ForbiddenException
from src.backend.core.security import decode_token
from src.backend.database import get_db
from src.backend.models import OrganizationMember, OrgMemberStatusEnum, User
from src.backend.services.recruitment_permissions import (
    has_effective_permission,
    load_active_org_member,
)

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

    # Only access tokens can authenticate employee endpoints
    token_type = payload.get("type", "access")
    if token_type != "access":
        raise AuthenticationException("Invalid token type")

    user_id: str = payload.get("sub")
    if not user_id:
        raise AuthenticationException("Token missing user identity")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthenticationException("User no longer exists")

    if not user.is_active:
        raise ForbiddenException("User account is inactive")

    return user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    """Returns the current user if valid credentials provided, else None."""
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = decode_token(token)
        if not payload:
            return None
        if payload.get("type", "access") != "access":
            return None
        user_id: str = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id, User.is_active == True).first()
    except Exception:
        return None


def get_current_org_member(
    request: Request,
    organization_id: str | None = Header(None, alias="X-Organization-ID"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> OrganizationMember:
    """Returns the current user's active membership in the given organization.
    
    Fails closed: requires active membership and validates header against path param if both present.
    """
    if not credentials:
        raise AuthenticationException("Could not validate credentials")

    user = get_current_user(credentials, db)

    path_org_id = request.path_params.get("org_id") or request.path_params.get("organization_id")
    if organization_id and path_org_id and organization_id != path_org_id:
        raise ForbiddenException("Organization ID header does not match path parameter")

    target_org_id = organization_id or path_org_id
    if not target_org_id:
        raise ForbiddenException("Organization ID required")

    return load_active_org_member(db, target_org_id, user.id)


def get_optional_org_member(
    request: Request,
    organization_id: str | None = Header(None, alias="X-Organization-ID"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> OrganizationMember | None:
    """Returns the current user's membership if valid and active, else None."""
    try:
        return get_current_org_member(request, organization_id, credentials, db)
    except Exception:
        return None


require_active_org_member = get_current_org_member
get_current_workspace_member = get_current_org_member
get_optional_workspace_member = get_optional_org_member


def require_permission(permission_code: str):
    """FastAPI dependency factory enforcing RBAC permissions via role or direct member-level grant."""

    def permission_checker(
        member: OrganizationMember = Depends(get_current_org_member),
        db: Session = Depends(get_db),
    ) -> OrganizationMember:
        if not has_effective_permission(db, member, permission_code):
            raise ForbiddenException(f"Missing permission: {permission_code}")
        return member

    return permission_checker


def require_role(allowed_roles):
    """Legacy role checker — stub for backward compat. Use require_permission instead."""

    def role_checker(
        member: OrganizationMember = Depends(get_current_org_member),
    ) -> OrganizationMember:
        return member

    return role_checker
