import pytest
from src.backend.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def test_password_hashing():
    password = "SecretPassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_encode_decode():
    data = {"sub": "user-uuid-123"}
    token = create_access_token(data)
    decoded = decode_token(token)
    assert decoded["sub"] == "user-uuid-123"
    assert decoded["type"] == "access"


def test_refresh_token_type():
    data = {"sub": "user-uuid-123"}
    token = create_refresh_token(data)
    decoded = decode_token(token)
    assert decoded["sub"] == "user-uuid-123"
    assert decoded["type"] == "refresh"
