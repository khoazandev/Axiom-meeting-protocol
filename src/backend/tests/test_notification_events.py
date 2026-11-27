import uuid
import pytest
from src.backend import models
from src.backend.api import deps
from src.backend.main import app


def test_issue_assignment_triggers_notification(client, db_session):
    unique_suffix = uuid.uuid4().hex[:6]
    reporter = models.User(
        email=f"reporter_{unique_suffix}@axiom.test",
        full_name="Reporter User",
        is_active=True,
    )
    assignee = models.User(
        email=f"assignee_{unique_suffix}@axiom.test",
        full_name="Assignee User",
        is_active=True,
    )
    db_session.add_all([reporter, assignee])
    db_session.commit()
    db_session.refresh(reporter)
    db_session.refresh(assignee)

    org = models.Organization(name=f"Notif Org {unique_suffix}", created_by_id=reporter.id)
    db_session.add(org)
    db_session.commit()

    proj = models.JiraProject(
        organization_id=org.id,
        name="Notif Project",
        key=f"NTF{unique_suffix[:2].upper()}",
        created_by_id=reporter.id,
    )
    db_session.add(proj)
    db_session.commit()

    app.dependency_overrides[deps.get_current_user] = lambda: reporter
    try:
        # 1. Create issue assigned to assignee
        create_payload = {
            "project_id": proj.id,
            "summary": "Fix notification event dispatch",
            "type": "TASK",
            "status": "TODO",
            "priority": "HIGH",
            "assignee_id": assignee.id,
        }
        res = client.post("/api/v1/jira/issues", json=create_payload)
        assert res.status_code in (200, 201), res.text
        created_issue = res.json()

        # 2. Check notifications for assignee
        app.dependency_overrides[deps.get_current_user] = lambda: assignee
        notif_res = client.get("/api/v1/notifications")
        assert notif_res.status_code == 200, notif_res.text
        notifs = notif_res.json()["notifications"]
        assert len(notifs) >= 1
        assert any("Fix notification event dispatch" in n["title"] for n in notifs)
    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)
