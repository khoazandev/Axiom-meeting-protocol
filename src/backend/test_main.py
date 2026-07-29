import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.backend.main import app, database, models

# Cấu hình test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
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


def test_create_meeting_rejects_agenda_under_20_characters():
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Họp chiến lược",
            "agenda": "Mười sáu ký tự nè",  # 17 chars
            "duration_minutes": 60,
        },
    )
    assert response.status_code == 400
    assert "Quy trình lỗi" in response.json()["detail"]
