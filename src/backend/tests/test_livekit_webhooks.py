from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.backend import models

# Same DB URL as conftest.py — used to create a fresh session for verification
_verify_engine = create_engine("sqlite:///./test_shared.db", connect_args={"check_same_thread": False})
_VerifySession = sessionmaker(autocommit=False, autoflush=False, bind=_verify_engine)


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
        status=models.MeetingStatusEnum.SCHEDULED,
    )
    db_session.add(meeting)
    db_session.commit()

    meeting_id = meeting.id
    db_session.close()

    # Test room_started
    started_payload = {"event": "room_started", "room": {"name": str(meeting_id)}}
    res = client.post("/api/v1/webhooks/livekit", json=started_payload)
    assert res.status_code == 200

    # Re-query from a fresh session to cross the transaction boundary
    verify = _VerifySession()
    m = verify.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    assert m.status == models.MeetingStatusEnum.IN_PROGRESS
    assert m.started_at is not None
    verify.close()

    # Test room_finished
    finished_payload = {"event": "room_finished", "room": {"name": str(meeting_id)}}
    res_fin = client.post("/api/v1/webhooks/livekit", json=finished_payload)
    assert res_fin.status_code == 200

    verify2 = _VerifySession()
    m2 = verify2.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    assert m2.status == models.MeetingStatusEnum.COMPLETED
    assert m2.ended_at is not None
    verify2.close()


