"""
Test suite for Axiom backend API.

Following the Superpowers TDD methodology:
- RED: Write a failing test
- GREEN: Write minimal code to pass
- REFACTOR: Clean up while keeping tests green

Tests cover:
- Root & health endpoints
- Meeting CRUD (create, read, list, delete)
- Process Gate validation (agenda enforcement)
- LiveKit token generation
- API versioning (/api/v1/)
- Global error handling (structured error responses)
- Edge cases (negative duration, long agenda, empty database)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.backend.main import app
from src.backend import database

# ── Test database configuration ──
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


# ============================================================================
# ROOT & HEALTH ENDPOINTS
# ============================================================================


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "Axiom" in response.json()["message"]


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# ============================================================================
# CREATE MEETING — PROCESS GATE VALIDATION (via legacy /api/meetings/)
# ============================================================================


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
    data = response.json()
    assert data["error"]["code"] == "PROCESS_GATE_VIOLATION"


def test_create_meeting_rejects_empty_agenda():
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Test Meeting",
            "agenda": "",
            "duration_minutes": 30,
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PROCESS_GATE_VIOLATION"


def test_create_meeting_rejects_whitespace_only_agenda():
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Test Meeting",
            "agenda": "                    ",  # 20 spaces
            "duration_minutes": 30,
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PROCESS_GATE_VIOLATION"


def test_create_meeting_rejects_missing_fields():
    response = client.post(
        "/api/meetings/",
        json={"title": "Incomplete"},
    )
    assert response.status_code == 422  # Pydantic validation error
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


# ============================================================================
# CREATE MEETING — SUCCESS
# ============================================================================


def test_create_meeting_success():
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Q3 Architecture Review",
            "agenda": "1. Review Q2 metrics  2. Discuss Q3 roadmap  3. Allocate resources",
            "duration_minutes": 90,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Q3 Architecture Review"
    assert data["duration_minutes"] == 90
    assert data["is_active"] is True
    assert "id" in data
    assert "start_time" in data


def test_create_meeting_accepts_agenda_exactly_20_characters():
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Edge Case",
            "agenda": "12345678901234567890",  # exactly 20 chars
            "duration_minutes": 30,
        },
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Edge Case"


def test_create_meeting_with_unicode_agenda():
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Họp phòng ban kỹ thuật",
            "agenda": "Thảo luận về kiến trúc hệ thống mới và phân công nhiệm vụ cho sprint tiếp theo",
            "duration_minutes": 60,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Họp phòng ban kỹ thuật"


# ============================================================================
# LIST MEETINGS
# ============================================================================


def test_list_meetings_empty():
    response = client.get("/api/meetings/")
    assert response.status_code == 200
    assert response.json() == []


def test_list_meetings_returns_created_meetings():
    for i in range(2):
        client.post(
            "/api/meetings/",
            json={
                "title": f"Meeting {i + 1}",
                "agenda": f"Detailed agenda for meeting number {i + 1} with enough characters",
                "duration_minutes": 30 + i * 15,
            },
        )

    response = client.get("/api/meetings/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Meeting 1"
    assert data[1]["title"] == "Meeting 2"


def test_list_meetings_pagination_skip():
    for i in range(3):
        client.post(
            "/api/meetings/",
            json={
                "title": f"Meeting {i + 1}",
                "agenda": f"Detailed agenda for pagination test meeting {i + 1}",
                "duration_minutes": 30,
            },
        )

    response = client.get("/api/meetings/?skip=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Meeting 2"


def test_list_meetings_pagination_limit():
    for i in range(3):
        client.post(
            "/api/meetings/",
            json={
                "title": f"Meeting {i + 1}",
                "agenda": f"Detailed agenda for pagination test meeting {i + 1}",
                "duration_minutes": 30,
            },
        )

    response = client.get("/api/meetings/?limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


# ============================================================================
# GET MEETING BY ID
# ============================================================================


def test_get_meeting_by_id_success():
    create_response = client.post(
        "/api/meetings/",
        json={
            "title": "Specific Meeting",
            "agenda": "This is a specific meeting agenda for the get-by-id test",
            "duration_minutes": 45,
        },
    )
    meeting_id = create_response.json()["id"]

    response = client.get(f"/api/meetings/{meeting_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == meeting_id
    assert data["title"] == "Specific Meeting"
    assert data["duration_minutes"] == 45


def test_get_meeting_by_id_not_found():
    response = client.get("/api/meetings/999")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
    assert "Meeting" in data["error"]["message"]


# ============================================================================
# DELETE MEETING
# ============================================================================


def test_delete_meeting_success():
    create_response = client.post(
        "/api/meetings/",
        json={
            "title": "To Be Deleted",
            "agenda": "This meeting will be deleted in the test suite for verification",
            "duration_minutes": 30,
        },
    )
    meeting_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/meetings/{meeting_id}")
    assert delete_response.status_code == 200
    assert "deleted" in delete_response.json()["message"].lower()

    # Verify it's gone
    get_response = client.get(f"/api/meetings/{meeting_id}")
    assert get_response.status_code == 404


def test_delete_meeting_not_found():
    response = client.delete("/api/meetings/999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_delete_meeting_removes_from_list():
    create_response = client.post(
        "/api/meetings/",
        json={
            "title": "Will Vanish",
            "agenda": "This meeting will be deleted and should not appear in listings",
            "duration_minutes": 30,
        },
    )
    meeting_id = create_response.json()["id"]

    assert len(client.get("/api/meetings/").json()) == 1
    client.delete(f"/api/meetings/{meeting_id}")
    assert len(client.get("/api/meetings/").json()) == 0


# ============================================================================
# LIVEKIT TOKEN
# ============================================================================


def test_get_meeting_token():
    response = client.get("/api/meetings/1/token?participant_name=Alice")
    assert response.status_code == 200
    assert "token" in response.json()
    token = response.json()["token"]
    assert len(token.split(".")) == 3  # JWT structure


def test_get_meeting_token_different_participants():
    response1 = client.get("/api/meetings/1/token?participant_name=Alice")
    response2 = client.get("/api/meetings/1/token?participant_name=Bob")
    assert response1.status_code == 200
    assert response2.status_code == 200
    assert response1.json()["token"] != response2.json()["token"]


def test_get_meeting_token_different_rooms():
    response1 = client.get("/api/meetings/1/token?participant_name=Alice")
    response2 = client.get("/api/meetings/2/token?participant_name=Alice")
    assert response1.status_code == 200
    assert response2.status_code == 200
    assert response1.json()["token"] != response2.json()["token"]


# ============================================================================
# API V1 VERSIONED ENDPOINTS
# ============================================================================


def test_v1_create_meeting_success():
    """Verify /api/v1/meetings/ endpoint works with API versioning."""
    response = client.post(
        "/api/v1/meetings/",
        json={
            "title": "V1 Meeting",
            "agenda": "Testing API v1 versioned endpoint with enough characters for validation",
            "duration_minutes": 60,
        },
    )
    assert response.status_code == 200
    assert response.json()["title"] == "V1 Meeting"


def test_v1_list_meetings():
    """Verify /api/v1/meetings/ list endpoint works."""
    client.post(
        "/api/v1/meetings/",
        json={
            "title": "V1 List Test",
            "agenda": "Meeting created to test v1 list endpoint functionality",
            "duration_minutes": 30,
        },
    )
    response = client.get("/api/v1/meetings/")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_v1_get_meeting_by_id():
    """Verify /api/v1/meetings/{id} endpoint works."""
    create = client.post(
        "/api/v1/meetings/",
        json={
            "title": "V1 Get Test",
            "agenda": "Meeting created for testing v1 get-by-id endpoint",
            "duration_minutes": 45,
        },
    )
    mid = create.json()["id"]
    response = client.get(f"/api/v1/meetings/{mid}")
    assert response.status_code == 200
    assert response.json()["id"] == mid


def test_v1_delete_meeting():
    """Verify /api/v1/meetings/{id} delete endpoint works."""
    create = client.post(
        "/api/v1/meetings/",
        json={
            "title": "V1 Delete Target",
            "agenda": "Meeting created for testing v1 delete endpoint validation",
            "duration_minutes": 30,
        },
    )
    mid = create.json()["id"]
    response = client.delete(f"/api/v1/meetings/{mid}")
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()


def test_v1_meeting_token():
    """Verify /api/v1/meetings/{id}/token endpoint works."""
    response = client.get("/api/v1/meetings/42/token?participant_name=TestUser")
    assert response.status_code == 200
    assert "token" in response.json()


def test_v1_process_gate_rejection():
    """Verify Process Gate works on /api/v1/ endpoints."""
    response = client.post(
        "/api/v1/meetings/",
        json={
            "title": "Short Agenda",
            "agenda": "Too short",
            "duration_minutes": 30,
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PROCESS_GATE_VIOLATION"


# ============================================================================
# GLOBAL ERROR HANDLING — STRUCTURED RESPONSES
# ============================================================================


def test_structured_error_response_format():
    """All errors must return { error: { code, message, detail } } format."""
    response = client.get("/api/meetings/999")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]
    assert "detail" in data["error"]


def test_validation_error_returns_structured_response():
    """Pydantic validation errors should also use structured format."""
    response = client.post(
        "/api/meetings/",
        json={"title": "Incomplete"},  # missing agenda and duration_minutes
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_process_gate_error_has_detail():
    """Process Gate errors include helpful detail about the violation."""
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Test",
            "agenda": "short",
            "duration_minutes": 30,
        },
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "PROCESS_GATE_VIOLATION"
    assert data["error"]["detail"] is not None
    assert "Process Gate" in data["error"]["detail"]


# ============================================================================
# EDGE CASES
# ============================================================================


def test_create_meeting_with_very_long_agenda():
    """System should handle very long agendas without error."""
    long_agenda = "A" * 10000
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Long Agenda Test",
            "agenda": long_agenda,
            "duration_minutes": 60,
        },
    )
    assert response.status_code == 200
    assert len(response.json()["agenda"]) == 10000


def test_create_meeting_with_special_characters_in_title():
    """Titles with special characters should be stored correctly."""
    response = client.post(
        "/api/meetings/",
        json={
            "title": 'Meeting <script>alert("xss")</script> & "quotes"',
            "agenda": "Test special characters handling in meeting title fields safely",
            "duration_minutes": 30,
        },
    )
    assert response.status_code == 200
    # Title is stored as-is (no XSS in API responses; sanitization is frontend's job)
    assert "<script>" in response.json()["title"]


def test_multiple_create_and_list():
    """Verify CRUD flow: create multiple, list, verify count."""
    for i in range(5):
        client.post(
            "/api/meetings/",
            json={
                "title": f"Batch Meeting {i}",
                "agenda": f"Agenda for batch meeting number {i} with sufficient detail",
                "duration_minutes": 30,
            },
        )
    response = client.get("/api/meetings/")
    assert response.status_code == 200
    assert len(response.json()) == 5


def test_agenda_with_exactly_19_characters_fails():
    """Boundary test: 19 chars should fail, 20 chars should pass."""
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Boundary Test",
            "agenda": "1234567890123456789",  # 19 chars
            "duration_minutes": 30,
        },
    )
    assert response.status_code == 400


def test_agenda_with_leading_trailing_whitespace():
    """Whitespace should be trimmed before length check."""
    response = client.post(
        "/api/meetings/",
        json={
            "title": "Whitespace Test",
            "agenda": "   12345678901234567890   ",  # 20 real chars + whitespace
            "duration_minutes": 30,
        },
    )
    assert response.status_code == 200
