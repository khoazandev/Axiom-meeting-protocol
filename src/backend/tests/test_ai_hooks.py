import pytest

def get_auth_workspace_meeting(client, email="ai_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "AI Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "AI WS", "slug": "ai-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    meeting = client.post(
        "/api/v1/meetings/",
        json={"title": "AI Hook Test Meeting", "agenda": "12345678901234567890", "duration_minutes": 30},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}, meeting["id"]

def test_ingest_ai_transcript_and_summary(client):
    headers, meeting_id = get_auth_workspace_meeting(client)

    # Ingest Transcript
    tr_res = client.post(
        f"/api/v1/meetings/{meeting_id}/transcript",
        json={"speaker": "Alice", "text": "We should finalize the Alembic migrations."},
        headers=headers
    )
    assert tr_res.status_code == 200
    assert "Alembic migrations" in tr_res.json()["transcript"]

    # Ingest Summary
    sum_res = client.post(
        f"/api/v1/meetings/{meeting_id}/summary",
        json={"summary": "Meeting agreed to execute Alembic migrations in batch mode."},
        headers=headers
    )
    assert sum_res.status_code == 200
    assert "batch mode" in sum_res.json()["summary"]
