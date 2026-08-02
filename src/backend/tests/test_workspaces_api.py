import pytest
from fastapi.testclient import TestClient

from src.backend.main import app
from src.backend import database
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_workspaces_api.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[database.get_db] = override_get_db


@pytest.fixture(autouse=True)
def run_around_tests():
    database.Base.metadata.create_all(bind=engine)
    yield
    database.Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def get_auth_token(email="owner@test.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!", "full_name": "Test User"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    return login.json()["access_token"]


def test_create_workspace_success():
    token = get_auth_token("creator@test.com")
    response = client.post(
        "/api/v1/workspaces/",
        json={"name": "Axiom HQ", "slug": "axiom-hq"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Axiom HQ"
    assert data["slug"] == "axiom-hq"
    assert "id" in data


def test_list_user_workspaces():
    token = get_auth_token("member@test.com")
    client.post(
        "/api/v1/workspaces/",
        json={"name": "Workspace 1", "slug": "ws-1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    client.post(
        "/api/v1/workspaces/",
        json={"name": "Workspace 2", "slug": "ws-2"},
        headers={"Authorization": f"Bearer {token}"},
    )

    response = client.get("/api/v1/workspaces/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_tenant_isolation_forbidden():
    token_a = get_auth_token("user_a@test.com")
    ws_b_response = client.post(
        "/api/v1/workspaces/",
        json={"name": "User B Workspace", "slug": "user-b-ws"},
        headers={"Authorization": f"Bearer {get_auth_token('user_b@test.com')}"},
    )
    ws_b_id = ws_b_response.json()["id"]

    # User A attempts to access User B's workspace details
    response = client.get(
        f"/api/v1/workspaces/{ws_b_id}",
        headers={"Authorization": f"Bearer {token_a}", "X-Workspace-ID": ws_b_id},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
