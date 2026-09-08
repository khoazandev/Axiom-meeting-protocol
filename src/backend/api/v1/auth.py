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
from src.backend.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


import re

def normalize_email(email: str) -> str:
    cleaned = email.strip().lower()
    if "@" not in cleaned:
        return cleaned + "@gmail.com"
    return cleaned


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


@router.patch("/me", response_model=UserResponse)
@router.put("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        trimmed = payload.full_name.strip()
        if trimmed:
            current_user.full_name = trimmed
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    db.commit()
    db.refresh(current_user)
    return current_user

