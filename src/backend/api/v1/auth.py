from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.backend.api.deps import get_current_user
from src.backend.core.exceptions import AuthenticationException, ValidationException
from src.backend.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from src.backend.database import get_db
from src.backend.models import User
from src.backend.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


import re

def normalize_email(email: str) -> str:
    # Remove any trailing @gmail.com (even if repeated)
    email = re.sub(r'(@gmail\.com)+$', '', email.strip(), flags=re.IGNORECASE)
    return email + "@gmail.com"


@router.post("/register", response_model=UserResponse)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValidationException("A user with this email already exists")

    hashed_pw = hash_password(payload.password)
    user = User(
        email=email,
        password_hash=hashed_pw,
        full_name=payload.full_name,
        provider="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise AuthenticationException("Invalid email or password")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
