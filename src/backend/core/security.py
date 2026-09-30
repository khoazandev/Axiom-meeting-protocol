"""
Security utilities for password hashing and JWT management.
"""

from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from src.backend.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (TypeError, ValueError):
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.refresh_token_expire_days)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict | None:
    """Decode and verify a JWT token. Returns None if token is invalid."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception:
        return None


def hash_recruitment_token(raw_token: str) -> str:
    """Return SHA-256 hash of a candidate recruitment invitation token."""
    import hashlib
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_candidate_access_token(
    application_id: str,
    candidate_id: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed 30-minute JWT token for candidate portal access."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=30)
    )
    to_encode = {
        "sub": candidate_id,
        "application_id": application_id,
        "type": "candidate",
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
