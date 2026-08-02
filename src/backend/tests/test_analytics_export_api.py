import pytest

def get_owner_workspace(client, email="analytics_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Analytics Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "Analytics WS", "slug": "analytics-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}

def test_analytics_export_ndjson(client):
    headers = get_owner_workspace(client)

    res = client.get("/api/v1/analytics/export", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/x-ndjson"
    assert "event_type" in res.text
