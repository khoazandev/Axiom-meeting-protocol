import pytest
from src.backend import models

def test_phase5_models_creation(db_session):
    user = models.User(email="p5_user@company.com", password_hash="hash", full_name="P5 User")
    db_session.add(user)
    db_session.commit()

    workspace = models.Workspace(name="P5 WS", slug="p5-ws", owner_id=user.id)
    db_session.add(workspace)
    db_session.commit()

    audit_entry = models.AuditLog(
        workspace_id=workspace.id,
        user_id=user.id,
        action="LOGIN",
        resource="Auth",
        ip_address="127.0.0.1",
        details="User logged in via local auth"
    )
    db_session.add(audit_entry)
    db_session.commit()

    webhook = models.OutboundWebhook(
        workspace_id=workspace.id,
        name="Jira Integration Webhook",
        target_url="https://jira.company.com/webhook",
        events="task.created,meeting.finished",
        secret_key="sec_12345",
        is_active=True
    )
    db_session.add(webhook)
    db_session.commit()

    assert audit_entry.id is not None
    assert audit_entry.action == "LOGIN"
    assert webhook.id is not None
    assert webhook.is_active is True
