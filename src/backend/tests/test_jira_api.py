from datetime import datetime, timezone
import pytest
from src.backend import models
from src.backend.api import deps
from src.backend.main import app


def test_jira_full_lifecycle(client, db_session):
    # 1. Create a mock user
    user = models.User(
        email="dev@axiom.test",
        full_name="Lead Engineer",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    app.dependency_overrides[deps.get_current_user] = lambda: user

    try:
        # 2. Create Jira Project
        res = client.post(
            "/api/v1/jira/projects",
            json={"key": "SMA", "name": "Smart Meeting Assistant", "description": "Core SMA project"},
        )
        assert res.status_code == 201, res.text
        proj_data = res.json()
        assert proj_data["key"] == "SMA"
        project_id = proj_data["id"]

        # 3. Create Sprint
        res = client.post(
            "/api/v1/jira/sprints",
            json={"project_id": project_id, "name": "SMA Sprint 1", "goal": "Deliver MVP"},
        )
        assert res.status_code == 201
        sprint_data = res.json()
        sprint_id = sprint_data["id"]
        assert sprint_data["status"] == "PENDING"

        # 4. Start Sprint
        res = client.post(
            f"/api/v1/jira/sprints/{sprint_id}/start",
            json={"goal": "Deliver MVP on time", "duration": "TWO_WEEKS"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "ACTIVE"

        # 5. Create Issues (Story, Bug, Task)
        res1 = client.post(
            "/api/v1/jira/issues",
            json={
                "project_id": project_id,
                "summary": "Implement realtime STT pipeline",
                "type": "STORY",
                "priority": "HIGH",
                "story_points": 5,
                "sprint_id": sprint_id,
            },
        )
        assert res1.status_code == 201
        issue1 = res1.json()
        assert issue1["key"] == "SMA-1"
        assert issue1["type"] == "STORY"
        assert issue1["status"] == "TODO"

        res2 = client.post(
            "/api/v1/jira/issues",
            json={
                "project_id": project_id,
                "summary": "Fix websocket disconnect bug",
                "type": "BUG",
                "priority": "CRITICAL",
                "story_points": 2,
                "sprint_id": sprint_id,
            },
        )
        assert res2.status_code == 201
        issue2 = res2.json()
        assert issue2["key"] == "SMA-2"

        # 6. Update Issue Status (Drag-and-Drop to IN_PROGRESS, then DONE)
        res = client.put(
            f"/api/v1/jira/issues/{issue1['id']}",
            json={"status": "IN_PROGRESS"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "IN_PROGRESS"

        res = client.put(
            f"/api/v1/jira/issues/{issue1['id']}",
            json={"status": "DONE"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "DONE"

        # 7. Add Comment to Issue
        res = client.post(
            f"/api/v1/jira/issues/{issue1['id']}/comments",
            json={"content": "Pipeline tested with 99.8% accuracy."},
        )
        assert res.status_code == 200
        assert res.json()["content"] == "Pipeline tested with 99.8% accuracy."

        # 8. Complete Sprint & Rollover Incomplete Issues (SMA-2 should rollover)
        res = client.post(
            f"/api/v1/jira/sprints/{sprint_id}/complete",
            json={"move_incomplete_to_sprint_id": None},  # To Backlog
        )
        assert res.status_code == 200
        assert res.json()["status"] == "CLOSED"

        # Verify SMA-2 is now in backlog (sprint_id is None)
        res = client.get(f"/api/v1/jira/issues/{issue2['id']}")
        assert res.status_code == 200
        assert res.json()["sprint_id"] is None
        assert res.json()["status"] == "TODO"

        # 9. Test Meeting to Jira Auto-Workspace & Task Sync
        meeting = models.Meeting(
            title="Q3 Strategy Review",
            description="Discuss company quarterly OKRs and timeline for release.",
            status=models.MeetingStatusEnum.COMPLETED,
            created_by_id=user.id,
        )
        db_session.add(meeting)
        db_session.commit()
        db_session.refresh(meeting)

        # Add follow-up task to meeting
        task = models.FollowUpTask(
            meeting_id=meeting.id,
            title="Prepare financial slides for board meeting",
            description="Detailed review of Q2 revenue and Q3 forecast.",
            status=models.FollowUpTaskStatusEnum.CONFIRMED,
        )
        db_session.add(task)
        db_session.commit()

        # Sync meeting tasks to Jira
        res = client.post(
            f"/api/v1/jira/meetings/{meeting.id}/sync-to-jira",
            json={"project_key": "Q3REV", "project_name": "Q3 Strategy"},
        )
        assert res.status_code == 200
        synced_issues = res.json()
        assert len(synced_issues) == 1
        assert synced_issues[0]["summary"] == "Prepare financial slides for board meeting"
        assert synced_issues[0]["key"] == "Q3REV-1"

    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)
