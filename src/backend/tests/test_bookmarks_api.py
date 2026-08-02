import pytest

def get_auth_workspace_meeting(client, email="bm_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "BM Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "BM WS", "slug": "bm-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    meeting = client.post(
        "/api/v1/meetings/",
        json={"title": "Bookmark Test Meeting", "agenda": "12345678901234567890", "duration_minutes": 30},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}, meeting["id"]

def test_create_and_list_bookmarks(client):
    headers, meeting_id = get_auth_workspace_meeting(client)

    payload = {
        "timestamp_seconds": 180,
        "note": "Key Decision: Phase 4 Architecture Approved",
        "is_action_item": True
    }

    res = client.post(f"/api/v1/meetings/{meeting_id}/bookmarks", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["timestamp_seconds"] == 180
    assert data["note"] == "Key Decision: Phase 4 Architecture Approved"

    list_res = client.get(f"/api/v1/meetings/{meeting_id}/bookmarks", headers=headers)
    assert list_res.status_code == 200
    b_list = list_res.json()
    assert len(b_list) >= 1
    assert b_list[0]["timestamp_seconds"] == 180
