import pytest
from src.backend import models

def test_phase4_models_creation(db_session):
    user = models.User(email="p4_user@company.com", password_hash="hash", full_name="P4 User")
    db_session.add(user)
    db_session.commit()

    workspace = models.Workspace(name="P4 WS", slug="p4-ws", owner_id=user.id)
    db_session.add(workspace)
    db_session.commit()

    meeting = models.Meeting(
        title="P4 Test Meeting",
        agenda="12345678901234567890",
        workspace_id=workspace.id,
        created_by_id=user.id,
        status=models.MeetingStatusEnum.IN_PROGRESS
    )
    db_session.add(meeting)
    db_session.commit()

    bookmark = models.MeetingBookmark(
        meeting_id=meeting.id,
        user_id=user.id,
        timestamp_seconds=120,
        note="Key Moment: Architecture Approved",
        is_action_item=True
    )
    db_session.add(bookmark)
    db_session.commit()

    document = models.KnowledgeDocument(
        workspace_id=workspace.id,
        uploaded_by_id=user.id,
        filename="company_policy.pdf",
        file_path="storage/knowledge/p4-ws/company_policy.pdf",
        file_size=2048,
        vector_status="READY"
    )
    db_session.add(document)
    db_session.commit()

    assert bookmark.id is not None
    assert bookmark.timestamp_seconds == 120
    assert document.id is not None
    assert document.vector_status == "READY"
