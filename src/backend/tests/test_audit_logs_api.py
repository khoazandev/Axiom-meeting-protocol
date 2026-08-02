import pytest

def get_owner_workspace(client, email="audit_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Audit Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "Audit WS", "slug": "audit-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}

def test_audit_logs_rbac_access(client):
    headers = get_owner_workspace(client)

    res = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
