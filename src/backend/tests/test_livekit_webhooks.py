"""Tests for LiveKit webhook handler — updated for new Meeting model."""
from src.backend import database, models
from src.backend.main import app


def _shared_session(session):
    """Create a get_db override that yields the given session."""

    def override():
        yield session

    return override


def test_livekit_webhook_room_started_and_finished(client, db_session):
    # Override get_db so the handler uses the SAME session as this test.
    original = app.dependency_overrides.get(database.get_db)
    app.dependency_overrides[database.get_db] = _shared_session(db_session)

    try:
        user = models.User(
            email="wh_user@test.com", password_hash="hash", full_name="WH User"
        )
        db_session.add(user)
        db_session.commit()

        meeting = models.Meeting(
            title="Webhook Test Meeting",
            created_by_id=user.id,
            status=models.MeetingStatusEnum.SCHEDULED,
        )
        db_session.add(meeting)
        db_session.commit()

        meeting_id = meeting.id

        # Test room_started
        started_payload = {
            "event": "room_started",
            "room": {"name": str(meeting_id)},
        }
        res = client.post("/api/v1/webhooks/livekit", json=started_payload)
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "processed"

        db_session.refresh(meeting)
        assert meeting.status == models.MeetingStatusEnum.IN_PROGRESS
        assert meeting.started_at is not None

        # Test room_finished
        finished_payload = {
            "event": "room_finished",
            "room": {"name": str(meeting_id)},
        }
        res_fin = client.post("/api/v1/webhooks/livekit", json=finished_payload)
        assert res_fin.status_code == 200
        body_fin = res_fin.json()
        assert body_fin["status"] == "processed"

        db_session.refresh(meeting)
        assert meeting.status == models.MeetingStatusEnum.COMPLETED
        assert meeting.ended_at is not None
    finally:
        if original:
            app.dependency_overrides[database.get_db] = original
        else:
            app.dependency_overrides.pop(database.get_db, None)
