"""Candidate authentication, token exchange, and dependency injection."""

from datetime import datetime, timezone
import secrets
from typing import Tuple
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import AuthenticationException, NotFoundException
from src.backend.core.security import (
    create_candidate_access_token,
    decode_token,
    hash_recruitment_token,
)
from src.backend.database import get_db

security = HTTPBearer(auto_error=False)


def generate_invitation_token() -> str:
    """Generate a secure 32-byte URL-safe invitation token."""
    return secrets.token_urlsafe(32)


def exchange_invitation_token(
    db: Session, raw_token: str
) -> Tuple[str, models.RecruitmentApplication]:
    """Validate candidate invitation token and issue a 30-minute candidate JWT."""
    token_hash = hash_recruitment_token(raw_token)
    invitation = (
        db.query(models.RecruitmentInvitation)
        .filter(models.RecruitmentInvitation.token_hash == token_hash)
        .first()
    )
    if not invitation:
        raise AuthenticationException("Invalid invitation token")

    if invitation.revoked_at is not None:
        raise AuthenticationException("Invitation token has been revoked")

    now = datetime.now(timezone.utc)
    # Ensure expires_at is timezone-aware for comparison
    expires_at = invitation.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        raise AuthenticationException("Invitation token has expired")

    if invitation.used_count >= invitation.max_uses:
        raise AuthenticationException("Invitation token has exceeded maximum uses")

    invitation.used_count += 1
    db.commit()

    application = (
        db.query(models.RecruitmentApplication)
        .filter(models.RecruitmentApplication.id == invitation.application_id)
        .first()
    )
    if not application:
        raise NotFoundException("Recruitment application")

    token = create_candidate_access_token(
        application_id=application.id,
        candidate_id=application.candidate_id,
    )
    return token, application


def get_current_candidate_application(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> models.RecruitmentApplication:
    """FastAPI dependency extracting candidate application from JWT claims."""
    if not credentials:
        raise AuthenticationException("Candidate token required")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise AuthenticationException("Invalid token")

    if payload.get("type") != "candidate":
        raise AuthenticationException("Invalid token type: candidate token required")

    application_id = payload.get("application_id")
    candidate_id = payload.get("sub")
    if not application_id or not candidate_id:
        raise AuthenticationException("Malformed candidate token claims")

    application = (
        db.query(models.RecruitmentApplication)
        .filter(
            models.RecruitmentApplication.id == application_id,
            models.RecruitmentApplication.candidate_id == candidate_id,
        )
        .first()
    )
    if not application:
        raise AuthenticationException("Application not found for candidate token")

    return application
