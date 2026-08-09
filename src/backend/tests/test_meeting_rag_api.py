"""
TDD Tests: In-Meeting RAG Chatbot
Endpoint: POST /api/v1/meetings/{meeting_id}/rag/query
"""
import uuid


def _register_and_login(client, email="raguser@test.com"):
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "RAG User"},
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    return login.json()["access_token"]


def _create_workspace(client, token):
    uid = uuid.uuid4().hex[:8]
    res = client.post(
        "/api/v1/workspaces/",
        json={"name": f"RAG WS {uid}", "slug": f"rag-ws-{uid}"},
        headers={"Authorization": f"Bearer {token}"},
    )
    return res.json()["id"]


def _create_meeting(client, token, ws_id, agenda="This meeting discusses the Q4 planning and budget allocations for backend teams."):
    res = client.post(
        "/api/v1/meetings/",
        json={"title": "Q4 Planning", "agenda": agenda, "duration_minutes": 60},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws_id},
    )
    return res.json()


def test_rag_query_returns_answer_and_sources(client):
    """RAG endpoint returns an answer with at least one source from agenda."""
    token = _register_and_login(client, "rag1@test.com")
    ws_id = _create_workspace(client, token)
    meeting = _create_meeting(client, token, ws_id)
    meeting_id = meeting["id"]

    res = client.post(
        f"/api/v1/meetings/{meeting_id}/rag/query",
        json={"question": "What is the Q4 planning about?"},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "sources" in data
    assert isinstance(data["sources"], list)
    assert len(data["sources"]) >= 1


def test_rag_query_finds_agenda_content(client):
    """RAG answer references content found in agenda."""
    token = _register_and_login(client, "rag2@test.com")
    ws_id = _create_workspace(client, token)
    meeting = _create_meeting(
        client, token, ws_id,
        agenda="This session focuses on deploying the Kubernetes infrastructure for production scaling."
    )
    meeting_id = meeting["id"]

    res = client.post(
        f"/api/v1/meetings/{meeting_id}/rag/query",
        json={"question": "kubernetes deployment"},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws_id},
    )
    assert res.status_code == 200
    data = res.json()
    # Should find agenda as a source
    source_types = [s["type"] for s in data["sources"]]
    assert "agenda" in source_types


def test_rag_query_finds_transcript_content(client):
    """RAG finds content from meeting transcript."""
    token = _register_and_login(client, "rag3@test.com")
    ws_id = _create_workspace(client, token)
    meeting = _create_meeting(client, token, ws_id)
    meeting_id = meeting["id"]

    # Ingest a transcript segment
    client.post(
        f"/api/v1/meetings/{meeting_id}/transcript",
        json={"speaker": "Alice", "text": "We need to allocate budget for FastAPI upgrade."},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws_id},
    )

    res = client.post(
        f"/api/v1/meetings/{meeting_id}/rag/query",
        json={"question": "FastAPI budget"},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws_id},
    )
    assert res.status_code == 200
    source_types = [s["type"] for s in res.json()["sources"]]
    assert "transcript" in source_types


def test_rag_query_requires_authentication(client):
    """Invalid/no token must be rejected with 401."""
    # Invalid JWT → decode_token returns None → AuthenticationException → HTTP 401
    res = client.post(
        "/api/v1/meetings/999/rag/query",
        json={"question": "What happened?"},
        headers={"Authorization": "Bearer invalid-token-xyz", "X-Workspace-ID": "any-workspace"},
    )
    assert res.status_code == 401


def test_rag_query_wrong_meeting_returns_404(client):
    """Query against non-existent meeting returns 404."""
    token = _register_and_login(client, "rag4@test.com")
    ws_id = _create_workspace(client, token)

    res = client.post(
        "/api/v1/meetings/99999/rag/query",
        json={"question": "What is the agenda?"},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws_id},
    )
    assert res.status_code == 404


def test_rag_query_empty_question_rejected(client):
    """Empty question string must be rejected with 422."""
    token = _register_and_login(client, "rag5@test.com")
    ws_id = _create_workspace(client, token)
    meeting = _create_meeting(client, token, ws_id)
    meeting_id = meeting["id"]

    res = client.post(
        f"/api/v1/meetings/{meeting_id}/rag/query",
        json={"question": ""},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws_id},
    )
    assert res.status_code == 422


def test_rag_query_bookmark_content(client):
    """RAG finds content from bookmarks marked during meeting."""
    token = _register_and_login(client, "rag6@test.com")
    ws_id = _create_workspace(client, token)
    meeting = _create_meeting(client, token, ws_id)
    meeting_id = meeting["id"]

    # Add a bookmark
    client.post(
        f"/api/v1/meetings/{meeting_id}/bookmarks",
        json={"timestamp_seconds": 240, "note": "Decision: use PostgreSQL for production database.", "is_action_item": False},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws_id},
    )

    res = client.post(
        f"/api/v1/meetings/{meeting_id}/rag/query",
        json={"question": "PostgreSQL decision"},
        headers={"Authorization": f"Bearer {token}", "X-Workspace-ID": ws_id},
    )
    assert res.status_code == 200
    source_types = [s["type"] for s in res.json()["sources"]]
    assert "bookmark" in source_types
