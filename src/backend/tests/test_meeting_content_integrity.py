"""Tests for meeting task extraction integrity and LiveKit broadcast payload."""

import json
from types import SimpleNamespace
import pytest
from src.backend import models


@pytest.fixture
def meeting_context(db_session, recruitment_org, auth_as):
    user = models.User(email="member-content@example.test", full_name="Content Member")
    db_session.add(user)
    db_session.flush()

    db_session.add(
        models.OrganizationMember(
            organization_id=recruitment_org.organization.id,
            user_id=user.id,
            role_id=recruitment_org.member_role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        )
    )
    meeting = models.Meeting(
        organization_id=recruitment_org.organization.id,
        department_id=recruitment_org.eng_department.id,
        created_by_id=user.id,
        title="Content integrity meeting",
    )
    db_session.add(meeting)
    db_session.flush()

    db_session.add(
        models.MeetingMember(
            meeting_id=meeting.id,
            user_id=user.id,
            role=models.MeetingMemberRoleEnum.HOST,
        )
    )
    db_session.commit()

    headers = auth_as(user)
    return SimpleNamespace(meeting=meeting, member_user=user, headers=headers)


def capture_livekit_payload(monkeypatch, meeting_context):
    sent = []

    class FakeRoom:
        async def send_data(self, req):
            sent.append(json.loads(req.data.decode("utf-8")))

    class FakeLiveKitAPI:
        def __init__(self, *args, **kwargs):
            self.room = FakeRoom()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

    monkeypatch.setattr("livekit.api.LiveKitAPI", FakeLiveKitAPI)

    import asyncio
    from src.backend.api.v1.meeting_content import _broadcast_to_livekit
    asyncio.run(
        _broadcast_to_livekit(
            meeting_context.meeting.id,
            f"user_{meeting_context.member_user.id}",
            "Xin chào các bạn",
        )
    )
    return sent[0] if sent else {}


def test_extract_tasks_does_not_synthesize_without_evidence(client, meeting_context):
    response = client.post(
        f"/api/v1/meetings/{meeting_context.meeting.id}/extract-tasks",
        headers=meeting_context.headers,
    )
    assert response.status_code == 200
    assert response.json() == []


def test_transcript_broadcast_payload_is_not_marked_mock(monkeypatch, meeting_context):
    payload = capture_livekit_payload(monkeypatch, meeting_context)
    assert payload.get("source") == "manual"
    assert "is_mock" not in payload
