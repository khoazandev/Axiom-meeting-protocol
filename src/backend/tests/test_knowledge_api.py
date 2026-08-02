import pytest

def get_auth_workspace(client, email="kn_owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "KN Owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    token = login.json()["access_token"]
    
    ws = client.post(
        "/api/v1/workspaces/",
        json={"name": "KN WS", "slug": "kn-ws"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    return {"Authorization": f"Bearer {token}", "X-Workspace-ID": ws["id"]}

def test_upload_list_and_query_knowledge_documents(client):
    headers = get_auth_workspace(client)
    files = {"file": ("architecture_overview.pdf", b"Knowledge PDF content for Axiom project.", "application/pdf")}

    res = client.post("/api/v1/knowledge/documents", files=files, headers=headers)
    assert res.status_code == 201
    doc_data = res.json()
    assert doc_data["filename"] == "architecture_overview.pdf"
    assert doc_data["vector_status"] == "READY"

    list_res = client.get("/api/v1/knowledge/documents", headers=headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    assert len(docs) >= 1
    assert docs[0]["filename"] == "architecture_overview.pdf"

    # Query Knowledge Hub
    query_res = client.post("/api/v1/knowledge/query", json={"query": "architecture"}, headers=headers)
    assert query_res.status_code == 200
    results = query_res.json()
    assert results["query"] == "architecture"
    assert len(results["matches"]) >= 1
