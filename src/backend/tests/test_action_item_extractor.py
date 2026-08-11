"""
TDD tests for Action Item Extraction pipeline.

Tests cover:
1. Extraction service: collect transcript, LLM call, heuristic fallback, JSON parsing
2. API endpoint: manual extraction trigger
3. Auto-trigger: extraction fires when meeting status → ENDED
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.backend import models
from src.backend.main import app
from src.backend.services.action_item_extractor import (
    _heuristic_extraction,
    _parse_llm_json,
    collect_transcript_text,
    extract_action_items,
)

# ── Helpers ───────────────────────────────────────────


def register_and_login(client: TestClient, email: str = "extractor@test.com"):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": "Test PM",
        },
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "password123",
        },
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def seed_rbac(db_session):
    from src.backend.seeds.seed_rbac import seed_roles_and_permissions

    seed_roles_and_permissions(db_session)


def create_meeting_with_transcript(client, headers, db_session):
    """Create a meeting and add transcript segments with action items."""
    resp = client.post("/api/v1/meetings/", json={"title": "Sprint Planning"}, headers=headers)
    meeting_id = resp.json()["id"]

    # Add transcript segments containing action items
    segments = [
        {
            "content": "Alright team, let's discuss the sprint goals.",
            "start_time": "00:00",
            "end_time": "00:05",
            "sequence": 1,
        },
        {
            "content": "Khoa will update the API documentation by Friday.",
            "start_time": "00:05",
            "end_time": "00:10",
            "sequence": 2,
        },
        {
            "content": "We need to fix the login bug before release.",
            "start_time": "00:10",
            "end_time": "00:15",
            "sequence": 3,
        },
        {
            "content": "Minh should review the security audit report.",
            "start_time": "00:15",
            "end_time": "00:20",
            "sequence": 4,
        },
        {
            "content": "Please deploy the staging environment by next Monday.",
            "start_time": "00:20",
            "end_time": "00:25",
            "sequence": 5,
        },
    ]
    for seg in segments:
        client.post(f"/api/v1/meetings/{meeting_id}/transcripts", json=seg, headers=headers)

    return meeting_id


# ── Unit Tests: JSON Parsing ──────────────────────────


class TestParseJson:
    """Test LLM JSON response parsing (handles messy LLM output)."""

    def test_parse_clean_json_array(self):
        raw = '[{"task": "Update docs", "owner": "Khoa", "due_date": "Friday", "priority": "HIGH", "status": "TODO"}]'
        result = _parse_llm_json(raw)
        assert result is not None
        assert len(result) == 1
        assert result[0]["task"] == "Update docs"
        assert result[0]["owner"] == "Khoa"

    def test_parse_json_in_markdown_block(self):
        raw = '```json\n[{"task": "Fix bug", "owner": "Minh", "due_date": "Monday", "priority": "HIGH", "status": "TODO"}]\n```'
        result = _parse_llm_json(raw)
        assert result is not None
        assert result[0]["task"] == "Fix bug"

    def test_parse_json_with_qwen3_think_tags(self):
        raw = '<think>Let me analyze this transcript...</think>[{"task": "Deploy staging", "owner": "Unassigned", "due_date": "Monday", "priority": "MEDIUM", "status": "TODO"}]'
        result = _parse_llm_json(raw)
        assert result is not None
        assert result[0]["task"] == "Deploy staging"

    def test_parse_empty_array(self):
        result = _parse_llm_json("[]")
        assert result == []

    def test_parse_garbage_returns_none(self):
        result = _parse_llm_json("I couldn't find any action items in this transcript.")
        assert result is None

    def test_parse_json_with_surrounding_text(self):
        raw = 'Here are the action items:\n[{"task": "Review PR", "owner": "Khoa", "due_date": "Not specified", "priority": "LOW", "status": "TODO"}]\nDone!'
        result = _parse_llm_json(raw)
        assert result is not None
        assert result[0]["task"] == "Review PR"


# ── Unit Tests: Heuristic Extraction ──────────────────


class TestHeuristicExtraction:
    """Test keyword-based fallback extraction."""

    def test_extract_english_will_pattern(self):
        text = "Khoa will update the API documentation by Friday."
        items = _heuristic_extraction(text)
        assert len(items) >= 1
        assert any("update" in item["task"].lower() for item in items)
        assert any(item["owner"] == "Khoa" for item in items)

    def test_extract_english_need_to_pattern(self):
        text = "We need to fix the login bug before release."
        items = _heuristic_extraction(text)
        assert len(items) >= 1
        assert any("fix" in item["task"].lower() for item in items)

    def test_extract_english_should_pattern(self):
        text = "Minh should review the security audit report."
        items = _heuristic_extraction(text)
        assert len(items) >= 1
        assert any("review" in item["task"].lower() for item in items)

    def test_extract_english_please_pattern(self):
        text = "Please deploy the staging environment by next Monday."
        items = _heuristic_extraction(text)
        assert len(items) >= 1
        assert any("deploy" in item["task"].lower() for item in items)

    def test_extract_vietnamese_can_phai(self):
        text = "Cần phải hoàn thành tài liệu trước thứ sáu tuần này."
        items = _heuristic_extraction(text)
        assert len(items) >= 1

    def test_extract_vietnamese_se_lam(self):
        text = "Khoa sẽ làm báo cáo tổng kết sprint cho sếp."
        items = _heuristic_extraction(text)
        assert len(items) >= 1

    def test_no_action_items_in_general_chat(self):
        text = "The weather is nice today. I had coffee this morning."
        items = _heuristic_extraction(text)
        assert len(items) == 0

    def test_deduplication(self):
        text = "We need to fix the bug. We need to fix the bug again."
        items = _heuristic_extraction(text)
        assert len(items) == 1  # deduplicated

    def test_all_items_have_required_fields(self):
        text = "Khoa will update docs. Minh should fix the build."
        items = _heuristic_extraction(text)
        for item in items:
            assert "task" in item
            assert "owner" in item
            assert "due_date" in item
            assert "priority" in item
            assert "status" in item
            assert item["status"] == "TODO"


# ── Integration Tests: Collect Transcript ─────────────


class TestCollectTranscript:
    """Test transcript collection from DB."""

    def test_collect_empty_transcript(self, db_session):
        text = collect_transcript_text(db_session, "nonexistent-meeting-id")
        assert text == ""

    def test_collect_transcript_with_segments(self, db_session):
        from src.backend.core.security import hash_password

        user = models.User(
            email="pm@test.com", password_hash=hash_password("pw"), full_name="PM User"
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(title="Test Meeting", created_by_id=user.id)
        db_session.add(meeting)
        db_session.commit()

        seg1 = models.TranscriptSegment(
            meeting_id=meeting.id,
            speaker_id=user.id,
            content="We need to fix the login page",
            start_time="00:00",
            end_time="00:05",
            sequence=1,
        )
        seg2 = models.TranscriptSegment(
            meeting_id=meeting.id,
            speaker_id=user.id,
            content="Khoa will handle the deployment",
            start_time="00:05",
            end_time="00:10",
            sequence=2,
        )
        db_session.add_all([seg1, seg2])
        db_session.commit()

        text = collect_transcript_text(db_session, meeting.id)
        assert "fix the login page" in text
        assert "Khoa will handle the deployment" in text
        assert "[PM User]" in text


# ── Integration Tests: Full Pipeline ──────────────────


class TestExtractionPipeline:
    """Test the full extract_action_items pipeline."""

    def test_no_transcript_returns_empty(self, db_session):
        result = extract_action_items(db_session, "no-such-meeting")
        assert result == []

    @patch("src.backend.services.action_item_extractor._call_ollama_extraction")
    def test_llm_extraction_saves_to_db(self, mock_llm, db_session):
        """When LLM returns valid items, they should be saved to action_items table."""
        from src.backend.core.security import hash_password

        user = models.User(
            email="llm@test.com", password_hash=hash_password("pw"), full_name="LLM User"
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(title="LLM Meeting", created_by_id=user.id)
        db_session.add(meeting)
        db_session.commit()

        seg = models.TranscriptSegment(
            meeting_id=meeting.id,
            content="Khoa will fix the API endpoint by Friday",
            start_time="00:00",
            end_time="00:05",
            sequence=1,
        )
        db_session.add(seg)
        db_session.commit()

        # Mock LLM response
        mock_llm.return_value = [
            {
                "task": "Fix the API endpoint",
                "owner": "Khoa",
                "due_date": "Friday",
                "priority": "HIGH",
                "status": "TODO",
            }
        ]

        result = extract_action_items(db_session, meeting.id)
        assert len(result) == 1
        assert result[0]["task"] == "Fix the API endpoint"
        assert result[0]["owner"] == "Khoa"
        assert result[0]["priority"] == "HIGH"

        # Verify saved in DB
        db_items = (
            db_session.query(models.ActionItem)
            .filter(models.ActionItem.meeting_id == meeting.id)
            .all()
        )
        assert len(db_items) == 1
        assert db_items[0].title == "Fix the API endpoint"
        assert "Owner: Khoa" in db_items[0].description

    @patch("src.backend.services.action_item_extractor._call_ollama_extraction")
    def test_heuristic_fallback_when_llm_offline(self, mock_llm, db_session):
        """When LLM is unavailable, heuristic should still extract items."""
        from src.backend.core.security import hash_password

        user = models.User(
            email="fallback@test.com", password_hash=hash_password("pw"), full_name="FB User"
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(title="Fallback Meeting", created_by_id=user.id)
        db_session.add(meeting)
        db_session.commit()

        seg = models.TranscriptSegment(
            meeting_id=meeting.id,
            content="Khoa will update the documentation before release",
            start_time="00:00",
            end_time="00:05",
            sequence=1,
        )
        db_session.add(seg)
        db_session.commit()

        # LLM returns None (offline)
        mock_llm.return_value = None

        result = extract_action_items(db_session, meeting.id)
        assert len(result) >= 1
        assert any("update" in item["task"].lower() for item in result)

    @patch("src.backend.services.action_item_extractor._call_ollama_extraction")
    def test_deduplication_on_rerun(self, mock_llm, db_session):
        """Running extraction twice should not create duplicate action items."""
        from src.backend.core.security import hash_password

        user = models.User(
            email="dedup@test.com", password_hash=hash_password("pw"), full_name="Dedup User"
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(title="Dedup Meeting", created_by_id=user.id)
        db_session.add(meeting)
        db_session.commit()

        seg = models.TranscriptSegment(
            meeting_id=meeting.id,
            content="Khoa will deploy the staging server",
            start_time="00:00",
            end_time="00:05",
            sequence=1,
        )
        db_session.add(seg)
        db_session.commit()

        mock_llm.return_value = [
            {
                "task": "Deploy the staging server",
                "owner": "Khoa",
                "due_date": "Not specified",
                "priority": "MEDIUM",
                "status": "TODO",
            }
        ]

        # Run twice
        result1 = extract_action_items(db_session, meeting.id)
        result2 = extract_action_items(db_session, meeting.id)

        assert len(result1) == 1
        assert len(result2) == 0  # deduplicated — no new items

        db_items = (
            db_session.query(models.ActionItem)
            .filter(models.ActionItem.meeting_id == meeting.id)
            .all()
        )
        assert len(db_items) == 1


# ── API Endpoint Tests ────────────────────────────────


class TestExtractionAPI:
    """Test the manual extraction API endpoint."""

    @patch("src.backend.services.action_item_extractor._call_ollama_extraction")
    def test_manual_extract_endpoint(self, mock_llm, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "api_extract@test.com")
        meeting_id = create_meeting_with_transcript(client, headers, db_session)

        mock_llm.return_value = [
            {
                "task": "Update API docs",
                "owner": "Khoa",
                "due_date": "Friday",
                "priority": "HIGH",
                "status": "TODO",
            },
            {
                "task": "Fix login bug",
                "owner": "Unassigned",
                "due_date": "Before release",
                "priority": "HIGH",
                "status": "TODO",
            },
        ]

        resp = client.post(f"/api/v1/meetings/{meeting_id}/extract-action-items", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["extracted_count"] == 2
        assert len(data["items"]) == 2
        assert data["items"][0]["task"] == "Update API docs"
        assert data["items"][0]["owner"] == "Khoa"

    def test_extract_requires_auth(self, client, db_session):
        resp = client.post("/api/v1/meetings/fake-id/extract-action-items")
        assert resp.status_code == 401 or resp.status_code == 403


# ── Auto-trigger Tests ────────────────────────────────


class TestAutoTrigger:
    """Test auto-extraction when meeting status → ENDED."""

    @patch("src.backend.services.action_item_extractor.extract_action_items")
    def test_extraction_triggered_on_meeting_end(self, mock_extract, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "auto@test.com")

        resp = client.post("/api/v1/meetings/", json={"title": "Auto Test"}, headers=headers)
        meeting_id = resp.json()["id"]

        mock_extract.return_value = []

        # Complete the meeting
        resp = client.patch(
            f"/api/v1/meetings/{meeting_id}", json={"status": "COMPLETED"}, headers=headers
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "COMPLETED"

        # Verify extraction was triggered
        mock_extract.assert_called_once()

    @patch("src.backend.services.action_item_extractor.extract_action_items")
    def test_extraction_not_triggered_on_other_status(self, mock_extract, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "noauto@test.com")

        resp = client.post("/api/v1/meetings/", json={"title": "No Auto Test"}, headers=headers)
        meeting_id = resp.json()["id"]

        # Update title only (not status → ENDED)
        resp = client.patch(
            f"/api/v1/meetings/{meeting_id}", json={"title": "Updated Title"}, headers=headers
        )
        assert resp.status_code == 200

        mock_extract.assert_not_called()
