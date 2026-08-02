from typing import Generator
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.backend.core.exceptions import AuthenticationException, NotFoundException
from src.backend.core.security import decode_token
from src.backend.database import get_db
from src.backend.models import User

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
