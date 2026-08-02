import pytest
from fastapi.testclient import TestClient

from src.backend.main import app
from src.backend import database
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth_api.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[database.get_db] = override_get_db


@pytest.fixture(autouse=True)
def run_around_tests():
    database.Base.metadata.create_all(bind=engine)
    yield
    database.Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_register_user_success():
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "alice@test.com", "password": "Password123!", "full_name": "Alice Test"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "alice@test.com"
    assert data["full_name"] == "Alice Test"
    assert "id" in data


def test_register_user_duplicate_email_fails():
    client.post(
        "/api/v1/auth/register",
        json={"email": "alice@test.com", "password": "Password123!", "full_name": "Alice Test"},
    )
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "alice@test.com", "password": "AnotherPassword123!", "full_name": "Alice Duplicate"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_login_user_success():
    client.post(
        "/api/v1/auth/register",
        json={"email": "bob@test.com", "password": "Password123!", "full_name": "Bob Test"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "bob@test.com", "password": "Password123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_user_wrong_password_fails():
    client.post(
        "/api/v1/auth/register",
        json={"email": "bob@test.com", "password": "Password123!", "full_name": "Bob Test"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "bob@test.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_get_me_success():
    register = client.post(
        "/api/v1/auth/register",
        json={"email": "carol@test.com", "password": "Password123!", "full_name": "Carol Test"},
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "carol@test.com", "password": "Password123!"},
    )
    token = login.json()["access_token"]

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "carol@test.com"
