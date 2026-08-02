import pytest
from src.backend import models

def get_auth_workspace_meeting(client, email="mom_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "MoM Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "MoM WS", "slug": "mom-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    meeting = client.post(
        "/api/v1/meetings/",
        json={"title": "MoM Test Meeting", "agenda": "12345678901234567890", "duration_minutes": 30},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}, meeting["id"]

def test_get_mom_and_sync_jira_tasks(client):
    headers, meeting_id = get_auth_workspace_meeting(client)

    # Ingest transcript
    client.post(
        f"/api/v1/meetings/{meeting_id}/transcript",
        json={"speaker": "Alice", "text": "We need to complete the LiveKit Webhook Handler."},
        headers=headers
    )
    client.post(
        f"/api/v1/meetings/{meeting_id}/summary",
        json={"summary": "Executive Summary: Phase 4 features defined and agreed upon."},
        headers=headers
    )

    # Get MoM
    mom_res = client.get(f"/api/v1/meetings/{meeting_id}/mom", headers=headers)
    assert mom_res.status_code == 200
    mom_data = mom_res.json()
    assert "Executive Summary" in mom_data["summary"]

    # 1-Click Sync Tasks
    sync_res = client.post(f"/api/v1/meetings/{meeting_id}/sync-tasks", headers=headers)
    assert sync_res.status_code == 200
    assert sync_res.json()["synced_count"] >= 1

    # Verify tasks appear in Jira Tasks API
    tasks_res = client.get("/api/v1/tasks", headers=headers)
    assert tasks_res.status_code == 200
    assert len(tasks_res.json()) >= 1
