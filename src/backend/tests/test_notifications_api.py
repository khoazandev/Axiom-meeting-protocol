import pytest

def get_auth_token(client, email="sse_user@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "SSE User"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    return login.json()["access_token"]

def test_sse_notifications_stream_auth(client):
    token = get_auth_token(client)
    res = client.get("/api/v1/notifications/stream", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
