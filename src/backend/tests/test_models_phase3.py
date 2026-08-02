import pytest
from datetime import datetime, timezone
from src.backend import models

def test_phase3_models_creation(db_session):
    user = models.User(email="taskuser@company.com", password_hash="hash", full_name="Task User")
    db_session.add(user)
    db_session.commit()

    workspace = models.Workspace(name="Task WS", slug="task-ws", owner_id=user.id)
    db_session.add(workspace)
    db_session.commit()

    meeting = models.Meeting(
        title="Architecture Sync",
        agenda="12345678901234567890",
        workspace_id=workspace.id,
        created_by_id=user.id,
        status=models.MeetingStatusEnum.IN_PROGRESS
    )
    db_session.add(meeting)
    db_session.commit()

    task = models.Task(
        workspace_id=workspace.id,
        meeting_id=meeting.id,
        created_by_id=user.id,
        assignee_id=user.id,
        title="Finalize Webhook Handler",
        priority=models.TaskPriorityEnum.HIGH,
        status=models.TaskStatusEnum.IN_PROGRESS
    )
    db_session.add(task)
    db_session.commit()

    invitation = models.MeetingInvitation(
        meeting_id=meeting.id,
        email="guest@company.com",
        role=models.InvitationRoleEnum.ATTENDEE,
        token="test-token-123",
        status=models.InvitationStatusEnum.PENDING
    )
    db_session.add(invitation)
    db_session.commit()

    file_record = models.MeetingFile(
        meeting_id=meeting.id,
        uploaded_by_id=user.id,
        filename="architecture_diagram.pdf",
        file_path="storage/meetings/123/architecture_diagram.pdf",
        file_size=1024,
        content_type="application/pdf"
    )
    db_session.add(file_record)
    db_session.commit()

    assert task.id is not None
    assert task.status == models.TaskStatusEnum.IN_PROGRESS
    assert meeting.status == models.MeetingStatusEnum.IN_PROGRESS
    assert invitation.token == "test-token-123"
    assert file_record.file_size == 1024
