"""
TDD tests for Phase 4: Content & AI APIs.
Transcript, Summary, ActionItems, Documents, Chat, KnowledgeChunk.
"""
import pytest
from fastapi.testclient import TestClient

from src.backend import models
from src.backend.main import app


def register_and_login(client: TestClient, email: str = "test@test.com"):
    client.post("/api/v1/auth/register", json={
        "email": email, "password": "password123", "full_name": "Test User",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": email, "password": "password123",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def seed_rbac(db_session):
    from src.backend.seeds.seed_rbac import seed_roles_and_permissions
    seed_roles_and_permissions(db_session)


def create_meeting(client, headers, title="Test Meeting"):
    resp = client.post("/api/v1/meetings/", json={"title": title}, headers=headers)
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# Transcript Segment Tests
# ---------------------------------------------------------------------------
class TestTranscriptAPI:
    """RED: Tests for /api/v1/meetings/{id}/transcripts endpoints."""

    def test_add_transcript_segment(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "ts@test.com")
        meeting_id = create_meeting(client, headers)

        resp = client.post(
            f"/api/v1/meetings/{meeting_id}/transcripts",
            json={
                "content": "Hello everyone, let's start the meeting.",
                "start_time": "0.0",
                "end_time": "3.5",
                "sequence": 1,
            },
            headers=headers,
        )
        assert resp.status_code == 201
        assert resp.json()["content"] == "Hello everyone, let's start the meeting."

    def test_list_transcript_segments(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "tsl@test.com")
        meeting_id = create_meeting(client, headers)

        client.post(
            f"/api/v1/meetings/{meeting_id}/transcripts",
            json={"content": "Seg 1", "start_time": "0.0", "end_time": "1.0", "sequence": 1},
            headers=headers,
        )
        client.post(
            f"/api/v1/meetings/{meeting_id}/transcripts",
            json={"content": "Seg 2", "start_time": "1.0", "end_time": "2.0", "sequence": 2},
            headers=headers,
        )

        resp = client.get(
            f"/api/v1/meetings/{meeting_id}/transcripts",
            headers=headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2


# ---------------------------------------------------------------------------
# Meeting Summary Tests
# ---------------------------------------------------------------------------
class TestSummaryAPI:
    """RED: Tests for /api/v1/meetings/{id}/summary endpoints."""

    def test_create_summary(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "sum@test.com")
        meeting_id = create_meeting(client, headers)

        resp = client.post(
            f"/api/v1/meetings/{meeting_id}/summary",
            json={"summary": "The team discussed Q3 goals."},
            headers=headers,
        )
        assert resp.status_code == 201
        assert "Q3 goals" in resp.json()["summary"]

    def test_get_summary(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "sumg@test.com")
        meeting_id = create_meeting(client, headers)

        client.post(
            f"/api/v1/meetings/{meeting_id}/summary",
            json={"summary": "Key points discussed."},
            headers=headers,
        )

        resp = client.get(
            f"/api/v1/meetings/{meeting_id}/summary",
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["summary"] == "Key points discussed."


# ---------------------------------------------------------------------------
# Action Items Tests
# ---------------------------------------------------------------------------
class TestActionItemAPI:
    """RED: Tests for /api/v1/meetings/{id}/action-items endpoints."""

    def test_create_action_item(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "ai@test.com")
        meeting_id = create_meeting(client, headers)

        resp = client.post(
            f"/api/v1/meetings/{meeting_id}/action-items",
            json={"title": "Follow up with design team"},
            headers=headers,
        )
        assert resp.status_code == 201
        assert resp.json()["title"] == "Follow up with design team"
        assert resp.json()["status"] == "TODO"

    def test_list_action_items(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "ail@test.com")
        meeting_id = create_meeting(client, headers)

        client.post(
            f"/api/v1/meetings/{meeting_id}/action-items",
            json={"title": "Task 1"},
            headers=headers,
        )
        client.post(
            f"/api/v1/meetings/{meeting_id}/action-items",
            json={"title": "Task 2"},
            headers=headers,
        )

        resp = client.get(
            f"/api/v1/meetings/{meeting_id}/action-items",
            headers=headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_update_action_item_status(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "aiu@test.com")
        meeting_id = create_meeting(client, headers)

        create_resp = client.post(
            f"/api/v1/meetings/{meeting_id}/action-items",
            json={"title": "Do the thing"},
            headers=headers,
        )
        item_id = create_resp.json()["id"]

        resp = client.patch(
            f"/api/v1/meetings/{meeting_id}/action-items/{item_id}",
            json={"status": "COMPLETED"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "COMPLETED"


# ---------------------------------------------------------------------------
# Chat Message Tests
# ---------------------------------------------------------------------------
class TestChatAPI:
    """RED: Tests for /api/v1/meetings/{id}/chat endpoints."""

    def test_send_chat_message(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "chat@test.com")
        meeting_id = create_meeting(client, headers)

        resp = client.post(
            f"/api/v1/meetings/{meeting_id}/chat",
            json={"content": "Can everyone hear me?"},
            headers=headers,
        )
        assert resp.status_code == 201
        assert resp.json()["content"] == "Can everyone hear me?"

    def test_list_chat_messages(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "chatl@test.com")
        meeting_id = create_meeting(client, headers)

        client.post(
            f"/api/v1/meetings/{meeting_id}/chat",
            json={"content": "Hello"},
            headers=headers,
        )
        client.post(
            f"/api/v1/meetings/{meeting_id}/chat",
            json={"content": "World"},
            headers=headers,
        )

        resp = client.get(
            f"/api/v1/meetings/{meeting_id}/chat",
            headers=headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2
