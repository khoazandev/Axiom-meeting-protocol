"""
Integration Test Suite — Axiom Fixes Verification
===================================================

Covers all fixes applied in this session:

1. Database schema has new columns (status, started_at, ended_at, recording_url)
2. CORS configuration allows frontend origin
3. Trailing-slash routes (both /meetings and /meetings/ respond 200, no redirect)
4. Meeting CRUD with full field validation
5. MeetingResponse serialization works without 500 error
6. Process Gate enforcement
7. Structured error responses

Run:
    uv run pytest src/backend/tests/test_fixes_integration.py -v
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from src.backend.main import app
from src.backend.database import Base
from src.backend import models  # noqa: F401 — registers all models on Base.metadata
from src.backend.api.deps import get_db

# ── Test Database Setup ─────────────────────────────────────────────────────

TEST_DB_PATH = "./test_fixes_integration.db"
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"


@pytest.fixture(scope="module")
def client():
    """Test client with isolated SQLite database that has the FULL schema."""
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    # create_all uses current models.py — will include all new columns
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


VALID_MEETING = {
    "title": "Q3 Architecture Review",
    "agenda": "1. Review current architecture\n2. Identify bottlenecks\n3. Plan Q4 roadmap",
    "duration_minutes": 60,
}


# ============================================================================
# FIX 1: DATABASE SCHEMA — New columns must exist
# ============================================================================

class TestDatabaseSchema:
    """Verify meetings table has all columns after schema migration fix."""

    def test_meetings_table_has_all_required_columns(self, client):
        """All columns defined in models.py must exist in the actual DB."""
        required = [
            "id", "title", "agenda", "start_time", "duration_minutes",
            "created_at", "is_active", "transcript", "summary",
            "status", "started_at", "ended_at", "recording_url",
            "workspace_id", "department_id", "created_by_id",
        ]
        engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
        inspector = inspect(engine)
        actual = [col["name"] for col in inspector.get_columns("meetings")]
        missing = [col for col in required if col not in actual]
        assert not missing, (
            f"Missing DB columns: {missing}\n"
            "Fix: Run `uv run python fix_db.py` or delete sql_app.db and restart."
        )

    def test_status_column_has_default_scheduled(self, client):
        """New meeting must have status='SCHEDULED' by default."""
        r = client.post("/api/v1/meetings/", json=VALID_MEETING)
        assert r.status_code == 200
        meeting_id = r.json()["id"]
        # Verify via direct DB inspection
        engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
        import sqlite3
        conn = sqlite3.connect(TEST_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM meetings WHERE id=?", (meeting_id,))
        row = cursor.fetchone()
        conn.close()
        assert row is not None
        assert row[0] == "SCHEDULED"


# ============================================================================
# FIX 2: CORS CONFIGURATION
# ============================================================================

class TestCORSConfiguration:
    """CORS headers must allow the Next.js frontend origin."""

    def test_cors_preflight_from_frontend_origin(self, client):
        """OPTIONS preflight must succeed for localhost:3000."""
        response = client.options(
            "/api/v1/meetings/",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        assert response.status_code in (200, 204)
        assert "access-control-allow-origin" in response.headers

    def test_cors_get_returns_allow_origin_header(self, client):
        """Regular GET from frontend origin must include CORS allow header."""
        response = client.get(
            "/api/v1/meetings/",
            headers={"Origin": "http://localhost:3000"},
        )
        assert "access-control-allow-origin" in response.headers

    def test_cors_post_returns_allow_origin_header(self, client):
        """POST from frontend origin must include CORS allow header."""
        response = client.post(
            "/api/v1/meetings/",
            json=VALID_MEETING,
            headers={"Origin": "http://localhost:3000"},
        )
        assert "access-control-allow-origin" in response.headers


# ============================================================================
# FIX 3: TRAILING SLASH ROUTES — No 307/308 redirects
# ============================================================================

class TestTrailingSlashRoutes:
    """Both /meetings and /meetings/ must return 200, not redirect.
    
    Root cause: Service Worker intercepts requests, follows 307 redirects
    directly to port 8000, bypassing Next.js proxy → CORS error.
    Fix: Add @router.get('') and @router.post('') alongside @router.get('/').
    """

    def test_get_meetings_with_trailing_slash_returns_200(self, client):
        r = client.get("/api/v1/meetings/")
        assert r.status_code == 200

    def test_get_meetings_without_trailing_slash_returns_200(self, client):
        """CRITICAL: /meetings (no slash) must return 200, not redirect."""
        r = client.get("/api/v1/meetings")
        assert r.status_code == 200, (
            f"Got {r.status_code}. "
            "Fix: add @router.get('') to meetings router."
        )

    def test_post_meeting_with_trailing_slash_returns_200(self, client):
        r = client.post("/api/v1/meetings/", json=VALID_MEETING)
        assert r.status_code == 200

    def test_post_meeting_without_trailing_slash_returns_200(self, client):
        """CRITICAL: POST /meetings (no slash) must return 200, not redirect."""
        r = client.post("/api/v1/meetings", json=VALID_MEETING)
        assert r.status_code == 200, (
            f"Got {r.status_code}. "
            "Fix: add @router.post('') to meetings router."
        )

    def test_get_meetings_without_slash_does_not_redirect(self, client):
        """Must not return any redirect — redirects cause CORS bypass."""
        r = client.get("/api/v1/meetings", follow_redirects=False)
        assert r.status_code not in (301, 302, 307, 308), (
            f"Got {r.status_code} redirect! "
            "Service Worker follows this directly to port 8000 → CORS block."
        )

    def test_post_meeting_without_slash_does_not_redirect(self, client):
        r = client.post("/api/v1/meetings", json=VALID_MEETING, follow_redirects=False)
        assert r.status_code not in (301, 302, 307, 308)


# ============================================================================
# FIX 4: MEETING CREATE — No 500 Internal Server Error
# ============================================================================

class TestMeetingCreateNoServerError:
    """Creating a meeting must NOT return 500.
    
    Root cause: DB missing 'status' column (added to models.py but DB not updated).
    Fix: ALTER TABLE meetings ADD COLUMN status ... (or recreate DB).
    """

    def test_create_meeting_returns_200_not_500(self, client):
        """Core fix verification: no 500 error on meeting creation."""
        r = client.post("/api/v1/meetings/", json=VALID_MEETING)
        assert r.status_code != 500, (
            "500 Internal Server Error on create! "
            "Likely missing 'status' column in meetings table. "
            "Fix: delete sql_app.db and restart backend."
        )
        assert r.status_code == 200

    def test_create_meeting_returns_full_schema(self, client):
        """Response must include all fields from MeetingResponse schema."""
        r = client.post("/api/v1/meetings/", json=VALID_MEETING)
        assert r.status_code == 200
        data = r.json()
        required_fields = ["id", "title", "agenda", "duration_minutes", "is_active", "start_time"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_create_meeting_via_no_slash_route(self, client):
        """No-slash route must also work without 500."""
        r = client.post("/api/v1/meetings", json=VALID_MEETING)
        assert r.status_code == 200

    def test_create_sets_is_active_true(self, client):
        r = client.post("/api/v1/meetings/", json=VALID_MEETING)
        assert r.json()["is_active"] is True

    def test_create_sets_correct_duration(self, client):
        r = client.post("/api/v1/meetings/", json={**VALID_MEETING, "duration_minutes": 90})
        assert r.json()["duration_minutes"] == 90


# ============================================================================
# FIX 5: PROCESS GATE STILL ENFORCED AFTER FIXES
# ============================================================================

class TestProcessGateIntegrity:
    """Process Gate must still work correctly after all fixes."""

    def test_rejects_agenda_under_20_chars(self, client):
        r = client.post("/api/v1/meetings/", json={
            "title": "Quick Sync",
            "agenda": "Too short",  # 9 chars
            "duration_minutes": 30,
        })
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "PROCESS_GATE_VIOLATION"

    def test_rejects_empty_agenda(self, client):
        r = client.post("/api/v1/meetings/", json={
            "title": "Test",
            "agenda": "",
            "duration_minutes": 30,
        })
        assert r.status_code == 400

    def test_rejects_whitespace_only_agenda(self, client):
        """Agenda that is only spaces must be rejected."""
        r = client.post("/api/v1/meetings/", json={
            "title": "Test",
            "agenda": "                     ",  # 21 spaces
            "duration_minutes": 30,
        })
        assert r.status_code == 400

    def test_accepts_agenda_exactly_20_chars(self, client):
        r = client.post("/api/v1/meetings/", json={
            "title": "Gate Boundary Test",
            "agenda": "A" * 20,
            "duration_minutes": 30,
        })
        assert r.status_code == 200

    def test_no_slash_route_also_enforces_gate(self, client):
        """Process Gate must work on the no-slash route too."""
        r = client.post("/api/v1/meetings", json={
            "title": "Test",
            "agenda": "short",
            "duration_minutes": 30,
        })
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "PROCESS_GATE_VIOLATION"


# ============================================================================
# FIX 6: FULL CRUD LIFECYCLE
# ============================================================================

class TestMeetingCRUDLifecycle:
    """End-to-end create → list → get → delete."""

    def test_full_lifecycle_via_v1_routes(self, client):
        # CREATE
        create_r = client.post("/api/v1/meetings", json=VALID_MEETING)
        assert create_r.status_code == 200
        meeting_id = create_r.json()["id"]

        # LIST
        list_r = client.get("/api/v1/meetings")
        assert list_r.status_code == 200
        ids = [m["id"] for m in list_r.json()]
        assert meeting_id in ids

        # GET by ID
        get_r = client.get(f"/api/v1/meetings/{meeting_id}")
        assert get_r.status_code == 200
        assert get_r.json()["id"] == meeting_id

        # DELETE
        del_r = client.delete(f"/api/v1/meetings/{meeting_id}")
        assert del_r.status_code == 200

        # Verify deleted
        get_after_r = client.get(f"/api/v1/meetings/{meeting_id}")
        assert get_after_r.status_code == 404

    def test_get_nonexistent_meeting_404(self, client):
        r = client.get("/api/v1/meetings/999999")
        assert r.status_code == 404

    def test_delete_nonexistent_meeting_404(self, client):
        r = client.delete("/api/v1/meetings/999999")
        assert r.status_code == 404


# ============================================================================
# FIX 7: STRUCTURED ERROR FORMAT UNCHANGED
# ============================================================================

class TestStructuredErrorResponses:
    """All errors must keep {error: {code, message, detail}} format."""

    def test_404_uses_error_structure(self, client):
        r = client.get("/api/v1/meetings/999999")
        assert "error" in r.json()
        err = r.json()["error"]
        assert "code" in err
        assert "message" in err
        assert err["code"] == "NOT_FOUND"

    def test_process_gate_uses_error_structure(self, client):
        r = client.post("/api/v1/meetings/", json={
            "title": "T", "agenda": "short", "duration_minutes": 30
        })
        assert "error" in r.json()
        assert r.json()["error"]["code"] == "PROCESS_GATE_VIOLATION"

    def test_validation_error_uses_error_structure(self, client):
        r = client.post("/api/v1/meetings/", json={"title": "missing fields"})
        assert "error" in r.json()
        assert r.json()["error"]["code"] == "VALIDATION_ERROR"


# ============================================================================
# FIX 8: HEALTH & ROOT STILL WORK
# ============================================================================

class TestHealthEndpoints:
    def test_root_returns_200(self, client):
        r = client.get("/")
        assert r.status_code == 200
        assert "Axiom" in r.json().get("message", "")

    def test_health_returns_healthy_status(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"
