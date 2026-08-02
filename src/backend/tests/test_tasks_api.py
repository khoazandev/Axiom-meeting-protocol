import pytest

def get_auth(client, email="taskuser@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Task User"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "Task Workspace", "slug": "task-ws-test"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()
    
    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}, ws["id"]

def test_create_and_list_tasks(client):
    headers, ws_id = get_auth(client)
    payload = {
        "title": "Build LiveKit Webhook Handler",
        "description": "Handle room_started and room_finished events",
        "priority": "HIGH",
        "status": "TODO"
    }

    res = client.post("/api/v1/tasks", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Build LiveKit Webhook Handler"
    assert data["workspace_id"] == ws_id
    task_id = data["id"]

    list_res = client.get("/api/v1/tasks", headers=headers)
    assert list_res.status_code == 200
    tasks = list_res.json()
    assert len(tasks) >= 1
    assert tasks[0]["id"] == task_id

    # Update Task
    update_res = client.put(f"/api/v1/tasks/{task_id}", json={"status": "IN_PROGRESS"}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "IN_PROGRESS"

    # Delete Task
    del_res = client.delete(f"/api/v1/tasks/{task_id}", headers=headers)
    assert del_res.status_code == 204
