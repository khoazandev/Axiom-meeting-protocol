import pytest

def get_owner_workspace(client, email="wh_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Webhook Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "Webhook WS", "slug": "webhook-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}

def test_crud_outbound_webhooks(client):
    headers = get_owner_workspace(client)

    payload = {
        "name": "Jira Webhook",
        "target_url": "https://jira.company.com/webhook",
        "events": "task.created,meeting.finished"
    }

    # Create Webhook
    res = client.post("/api/v1/admin/webhooks", json=payload, headers=headers)
    assert res.status_code == 201
    wh = res.json()
    assert wh["name"] == "Jira Webhook"
    assert wh["target_url"] == "https://jira.company.com/webhook"
    wh_id = wh["id"]

    # List Webhooks
    list_res = client.get("/api/v1/admin/webhooks", headers=headers)
    assert list_res.status_code == 200
    wh_list = list_res.json()
    assert len(wh_list) >= 1
    assert wh_list[0]["id"] == wh_id

    # Delete Webhook
    del_res = client.delete(f"/api/v1/admin/webhooks/{wh_id}", headers=headers)
    assert del_res.status_code == 204
