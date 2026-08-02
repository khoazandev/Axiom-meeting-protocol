import pytest

def get_auth_workspace_meeting(client, email="files_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Files Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "Files WS", "slug": "files-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    meeting = client.post(
        "/api/v1/meetings/",
        json={"title": "Files Test Meeting", "agenda": "12345678901234567890", "duration_minutes": 30},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}, meeting["id"]

def test_upload_and_list_files(client):
    headers, meeting_id = get_auth_workspace_meeting(client)
    files = {"file": ("architecture_doc.pdf", b"%PDF-1.4 sample content", "application/pdf")}
    
    res = client.post(f"/api/v1/meetings/{meeting_id}/files", files=files, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["filename"] == "architecture_doc.pdf"
    assert data["file_size"] > 0

    list_res = client.get(f"/api/v1/meetings/{meeting_id}/files", headers=headers)
    assert list_res.status_code == 200
    file_list = list_res.json()
    assert len(file_list) >= 1
    assert file_list[0]["filename"] == "architecture_doc.pdf"
