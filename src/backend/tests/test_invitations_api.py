import pytest
from src.backend import models

def get_auth_workspace(client, email="invite_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Invite Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "Invite WS", "slug": "invite-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    meeting = client.post(
        "/api/v1/meetings/",
        json={"title": "Invite Test Meeting", "agenda": "12345678901234567890", "duration_minutes": 45},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}, meeting["id"]

def test_create_and_verify_invitation(client):
    headers, meeting_id = get_auth_workspace(client)
    res = client.post(
        f"/api/v1/meetings/{meeting_id}/invitations",
        json={"email": "guest@company.com", "role": "ATTENDEE"},
        headers=headers
    )
    assert res.status_code == 201
    inv_token = res.json()["token"]

    verify_res = client.get(f"/api/v1/invitations/verify/{inv_token}")
    assert verify_res.status_code == 200
    assert verify_res.json()["email"] == "guest@company.com"
