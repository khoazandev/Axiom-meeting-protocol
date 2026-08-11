"""
TDD tests for Phase 3: Meeting Engine Refactor.
All tests written FIRST — implementation follows.
"""
import pytest
from fastapi.testclient import TestClient

from src.backend import models
from src.backend.main import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def register_and_login(client: TestClient, email: str = "test@test.com", password: str = "password123"):
    """Register a user and return auth headers."""
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test User",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def seed_rbac(db_session):
    from src.backend.seeds.seed_rbac import seed_roles_and_permissions
    seed_roles_and_permissions(db_session)


def create_org(client, headers, name="Test Org"):
    resp = client.post("/api/v1/organizations/", json={"name": name}, headers=headers)
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# Meeting CRUD Tests
# ---------------------------------------------------------------------------
class TestMeetingAPI:
    """RED: Tests for /api/v1/meetings/ endpoints."""

    def test_create_personal_meeting(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client)

        resp = client.post(
            "/api/v1/meetings/",
            json={"title": "Personal Sync", "description": "Quick chat"},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Personal Sync"
        assert data["organization_id"] is None

    def test_create_business_meeting(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "biz@test.com")
        org_id = create_org(client, headers, "Biz Org")

        # Create department
        dept_resp = client.post(
            f"/api/v1/organizations/{org_id}/departments/",
            json={"name": "Engineering"},
            headers=headers,
        )
        dept_id = dept_resp.json()["id"]

        resp = client.post(
            "/api/v1/meetings/",
            json={
                "title": "Sprint Review",
                "organization_id": org_id,
                "department_id": dept_id,
            },
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["organization_id"] == org_id
        assert data["department_id"] == dept_id

    def test_creator_auto_added_as_host(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "host@test.com")

        resp = client.post(
            "/api/v1/meetings/",
            json={"title": "Host Test"},
            headers=headers,
        )
        meeting_id = resp.json()["id"]

        # Check meeting members
        members_resp = client.get(
            f"/api/v1/meetings/{meeting_id}/members",
            headers=headers,
        )
        assert members_resp.status_code == 200
        members = members_resp.json()
        assert len(members) == 1
        assert members[0]["role"] == "HOST"

    def test_list_my_meetings(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "list@test.com")

        client.post("/api/v1/meetings/", json={"title": "Meeting 1"}, headers=headers)
        client.post("/api/v1/meetings/", json={"title": "Meeting 2"}, headers=headers)

        resp = client.get("/api/v1/meetings/", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_get_meeting_by_id(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "get@test.com")

        create_resp = client.post(
            "/api/v1/meetings/",
            json={"title": "Get Test"},
            headers=headers,
        )
        meeting_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/meetings/{meeting_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["title"] == "Get Test"

    def test_update_meeting(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "update@test.com")

        create_resp = client.post(
            "/api/v1/meetings/",
            json={"title": "Old Title"},
            headers=headers,
        )
        meeting_id = create_resp.json()["id"]

        resp = client.patch(
            f"/api/v1/meetings/{meeting_id}",
            json={"title": "New Title"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "New Title"

    def test_delete_meeting(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "delete@test.com")

        create_resp = client.post(
            "/api/v1/meetings/",
            json={"title": "To Delete"},
            headers=headers,
        )
        meeting_id = create_resp.json()["id"]

        resp = client.delete(f"/api/v1/meetings/{meeting_id}", headers=headers)
        assert resp.status_code == 204

        # Verify deleted
        get_resp = client.get(f"/api/v1/meetings/{meeting_id}", headers=headers)
        assert get_resp.status_code == 404

    def test_create_meeting_unauthenticated(self, client):
        resp = client.post("/api/v1/meetings/", json={"title": "No Auth"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# MeetingMember Tests
# ---------------------------------------------------------------------------
class TestMeetingMemberAPI:
    """RED: Tests for /api/v1/meetings/{id}/members endpoints."""

    def _setup(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "mmhost@test.com")
        resp = client.post(
            "/api/v1/meetings/",
            json={"title": "Member Test"},
            headers=headers,
        )
        return headers, resp.json()["id"]

    def test_add_member_to_meeting(self, client, db_session):
        headers, meeting_id = self._setup(client, db_session)

        # Register second user
        register_and_login(client, "participant@test.com")
        user2 = db_session.query(models.User).filter(
            models.User.email == "participant@test.com"
        ).first()

        resp = client.post(
            f"/api/v1/meetings/{meeting_id}/members",
            json={"user_id": user2.id, "role": "PARTICIPANT"},
            headers=headers,
        )
        assert resp.status_code == 201
        assert resp.json()["role"] == "PARTICIPANT"

    def test_list_meeting_members(self, client, db_session):
        headers, meeting_id = self._setup(client, db_session)

        resp = client.get(
            f"/api/v1/meetings/{meeting_id}/members",
            headers=headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1  # At least the host

    def test_remove_member_from_meeting(self, client, db_session):
        headers, meeting_id = self._setup(client, db_session)

        # Add a participant
        register_and_login(client, "removeme@test.com")
        user2 = db_session.query(models.User).filter(
            models.User.email == "removeme@test.com"
        ).first()

        add_resp = client.post(
            f"/api/v1/meetings/{meeting_id}/members",
            json={"user_id": user2.id},
            headers=headers,
        )
        member_id = add_resp.json()["id"]

        # Remove the member
        resp = client.delete(
            f"/api/v1/meetings/{meeting_id}/members/{member_id}",
            headers=headers,
        )
        assert resp.status_code == 204
