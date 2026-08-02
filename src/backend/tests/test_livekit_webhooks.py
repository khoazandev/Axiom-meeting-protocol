import pytest
from src.backend import models

def test_livekit_webhook_room_started_and_finished(client, db_session):
    user = models.User(email="wh_user@test.com", password_hash="hash", full_name="WH User")
    db_session.add(user)
    db_session.commit()

    workspace = models.Workspace(name="WH WS", slug="wh-ws", owner_id=user.id)
    db_session.add(workspace)
    db_session.commit()

    meeting = models.Meeting(
        title="Webhook Test Meeting",
        agenda="12345678901234567890",
        workspace_id=workspace.id,
        created_by_id=user.id,
        status=models.MeetingStatusEnum.SCHEDULED
    )
    db_session.add(meeting)
    db_session.commit()

    meeting_id = meeting.id

    # Test room_started
    started_payload = {
        "event": "room_started",
        "room": {"name": str(meeting_id)}
    }
    res = client.post("/api/v1/webhooks/livekit", json=started_payload)
    assert res.status_code == 200

    db_session.refresh(meeting)
    assert meeting.status == models.MeetingStatusEnum.IN_PROGRESS
    assert meeting.started_at is not None

    # Test room_finished
    finished_payload = {
        "event": "room_finished",
        "room": {"name": str(meeting_id)}
    }
    res_fin = client.post("/api/v1/webhooks/livekit", json=finished_payload)
    assert res_fin.status_code == 200

    db_session.refresh(meeting)
    assert meeting.status == models.MeetingStatusEnum.COMPLETED
    assert meeting.ended_at is not None
