import pytest

def get_owner_workspace(client, email="stats_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Stats Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "Stats WS", "slug": "stats-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}

def test_admin_workspace_stats(client):
    headers = get_owner_workspace(client)

    res = client.get("/api/v1/admin/stats", headers=headers)
    assert res.status_code == 200
    stats = res.json()
    assert "total_members" in stats
    assert "total_meetings" in stats
    assert "total_tasks" in stats
    assert "total_documents" in stats
    assert "total_audit_events" in stats
