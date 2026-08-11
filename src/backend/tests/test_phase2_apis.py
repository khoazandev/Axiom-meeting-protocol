"""
TDD tests for Phase 2: Organization & Department APIs.
All tests written FIRST — implementation follows.
"""
import pytest
from fastapi.testclient import TestClient

from src.backend import models
from src.backend.main import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def register_and_login(client: TestClient, email: str = "test@test.com", password: str = "password123"):
    """Register a user and return auth headers + user data."""
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test User",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def seed_rbac(db_session):
    """Seed RBAC roles and permissions for tests."""
    from src.backend.seeds.seed_rbac import seed_roles_and_permissions
    seed_roles_and_permissions(db_session)


def get_member_role_id(db_session) -> str:
    """Get the system MEMBER role ID."""
    role = db_session.query(models.Role).filter(
        models.Role.name == "MEMBER", models.Role.is_system == True
    ).first()
    return role.id


def get_owner_role_id(db_session) -> str:
    """Get the system OWNER role ID."""
    role = db_session.query(models.Role).filter(
        models.Role.name == "OWNER", models.Role.is_system == True
    ).first()
    return role.id


# ---------------------------------------------------------------------------
# Organization CRUD Tests
# ---------------------------------------------------------------------------
class TestOrganizationAPI:
    """RED: Tests for /api/v1/organizations/ endpoints."""

    def test_create_organization(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client)

        resp = client.post(
            "/api/v1/organizations/",
            json={"name": "Acme Corp"},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Acme Corp"
        assert "id" in data

    def test_create_organization_auto_owner_membership(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client)

        resp = client.post(
            "/api/v1/organizations/",
            json={"name": "Auto Owner Org"},
            headers=headers,
        )
        org_id = resp.json()["id"]

        # Creator should be auto-added as OWNER member
        member = db_session.query(models.OrganizationMember).filter(
            models.OrganizationMember.organization_id == org_id
        ).first()
        assert member is not None
        owner_role = db_session.query(models.Role).filter(
            models.Role.name == "OWNER", models.Role.is_system == True
        ).first()
        assert member.role_id == owner_role.id

    def test_list_my_organizations(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client)

        client.post("/api/v1/organizations/", json={"name": "Org 1"}, headers=headers)
        client.post("/api/v1/organizations/", json={"name": "Org 2"}, headers=headers)

        resp = client.get("/api/v1/organizations/", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_get_organization_by_id(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client)

        create_resp = client.post(
            "/api/v1/organizations/",
            json={"name": "Detail Org"},
            headers=headers,
        )
        org_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/organizations/{org_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Detail Org"

    def test_create_organization_unauthenticated(self, client):
        resp = client.post("/api/v1/organizations/", json={"name": "No Auth"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Department CRUD Tests
# ---------------------------------------------------------------------------
class TestDepartmentAPI:
    """RED: Tests for /api/v1/organizations/{org_id}/departments/ endpoints."""

    def _setup_org(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "dept@test.com")
        resp = client.post(
            "/api/v1/organizations/",
            json={"name": "Dept Test Org"},
            headers=headers,
        )
        return headers, resp.json()["id"]

    def test_create_department(self, client, db_session):
        headers, org_id = self._setup_org(client, db_session)

        resp = client.post(
            f"/api/v1/organizations/{org_id}/departments/",
            json={"name": "Engineering", "description": "Eng team"},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Engineering"
        assert data["organization_id"] == org_id

    def test_list_departments(self, client, db_session):
        headers, org_id = self._setup_org(client, db_session)

        client.post(
            f"/api/v1/organizations/{org_id}/departments/",
            json={"name": "Engineering"},
            headers=headers,
        )
        client.post(
            f"/api/v1/organizations/{org_id}/departments/",
            json={"name": "Marketing"},
            headers=headers,
        )

        resp = client.get(
            f"/api/v1/organizations/{org_id}/departments/",
            headers=headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_add_member_to_department(self, client, db_session):
        headers, org_id = self._setup_org(client, db_session)

        # Create department
        dept_resp = client.post(
            f"/api/v1/organizations/{org_id}/departments/",
            json={"name": "IT"},
            headers=headers,
        )
        dept_id = dept_resp.json()["id"]

        # Register second user
        register_and_login(client, "member@test.com")
        member_user = db_session.query(models.User).filter(
            models.User.email == "member@test.com"
        ).first()

        # Add to org first
        member_role_id = get_member_role_id(db_session)
        org_member = models.OrganizationMember(
            organization_id=org_id,
            user_id=member_user.id,
            role_id=member_role_id,
        )
        db_session.add(org_member)
        db_session.commit()

        # Add to department
        resp = client.post(
            f"/api/v1/organizations/{org_id}/departments/{dept_id}/members",
            json={"user_id": member_user.id},
            headers=headers,
        )
        assert resp.status_code == 201


# ---------------------------------------------------------------------------
# Organization Invitation Tests
# ---------------------------------------------------------------------------
class TestOrgInvitationAPI:
    """RED: Tests for /api/v1/organizations/{org_id}/invitations/ endpoints."""

    def _setup_org(self, client, db_session):
        seed_rbac(db_session)
        headers = register_and_login(client, "admin@test.com")
        resp = client.post(
            "/api/v1/organizations/",
            json={"name": "Invite Org"},
            headers=headers,
        )
        return headers, resp.json()["id"]

    def test_create_invitation(self, client, db_session):
        headers, org_id = self._setup_org(client, db_session)

        resp = client.post(
            f"/api/v1/organizations/{org_id}/invitations/",
            json={"email": "newguy@test.com"},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newguy@test.com"
        assert data["status"] == "PENDING"
        assert "token" in data

    def test_accept_invitation(self, client, db_session):
        headers, org_id = self._setup_org(client, db_session)

        # Create invitation
        inv_resp = client.post(
            f"/api/v1/organizations/{org_id}/invitations/",
            json={"email": "accept@test.com"},
            headers=headers,
        )
        token = inv_resp.json()["token"]

        # Register the invited user
        new_headers = register_and_login(client, "accept@test.com")

        # Accept invitation
        resp = client.post(
            f"/api/v1/invitations/{token}/accept",
            headers=new_headers,
        )
        assert resp.status_code == 200

        # Verify org membership created
        invited_user = db_session.query(models.User).filter(
            models.User.email == "accept@test.com"
        ).first()
        membership = db_session.query(models.OrganizationMember).filter(
            models.OrganizationMember.organization_id == org_id,
            models.OrganizationMember.user_id == invited_user.id,
        ).first()
        assert membership is not None

    def test_list_invitations(self, client, db_session):
        headers, org_id = self._setup_org(client, db_session)

        client.post(
            f"/api/v1/organizations/{org_id}/invitations/",
            json={"email": "a@test.com"},
            headers=headers,
        )
        client.post(
            f"/api/v1/organizations/{org_id}/invitations/",
            json={"email": "b@test.com"},
            headers=headers,
        )

        resp = client.get(
            f"/api/v1/organizations/{org_id}/invitations/",
            headers=headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2
