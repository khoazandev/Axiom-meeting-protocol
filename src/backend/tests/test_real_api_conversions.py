import io
import pytest
from src.backend import models
from src.backend.api import deps
from src.backend.main import app


def test_user_bio_update(client, db_session):
    user = models.User(
        email="bio_test@axiom.test",
        full_name="Bio Tester",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    app.dependency_overrides[deps.get_current_user] = lambda: user

    try:
        # 1. Update Bio
        res = client.patch(
            "/api/v1/auth/me",
            json={"bio": "Senior Full-Stack Architect & AI Specialist"},
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["bio"] == "Senior Full-Stack Architect & AI Specialist"

        # 2. Get /me to verify persistence
        res2 = client.get("/api/v1/auth/me")
        assert res2.status_code == 200
        assert res2.json()["bio"] == "Senior Full-Stack Architect & AI Specialist"
    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)


def test_organization_policies_lifecycle(client, db_session):
    # Setup user & org with OWNER role
    user = models.User(email="policy_owner@axiom.test", full_name="Policy Owner", is_active=True)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    role = db_session.query(models.Role).filter(models.Role.name == "OWNER").first()
    if not role:
        role = models.Role(name="OWNER", description="Owner", scope=models.RoleScopeEnum.ORGANIZATION)
        db_session.add(role)
        db_session.commit()

    org = models.Organization(name="Policy Test Org", created_by_id=user.id)
    db_session.add(org)
    db_session.commit()

    member = models.OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role_id=role.id,
        status="ACTIVE",
    )
    db_session.add(member)
    db_session.commit()

    app.dependency_overrides[deps.get_current_user] = lambda: user

    try:
        # 1. Get policies (triggers auto-seeding of defaults)
        res = client.get(f"/api/v1/organizations/{org.id}/policies")
        assert res.status_code == 200, res.text
        policies = res.json()
        assert len(policies) >= 6
        agenda_gate = next(p for p in policies if p["policy_key"] == "agenda_gate")
        assert agenda_gate["enabled"] is True

        # 2. Patch single policy
        res_patch = client.patch(
            f"/api/v1/organizations/{org.id}/policies/agenda_gate",
            json={"enabled": False, "config_json": '{"min_length": 25}'},
        )
        assert res_patch.status_code == 200
        patched = res_patch.json()
        assert patched["enabled"] is False
        assert patched["config_json"] == '{"min_length": 25}'

        # 3. Batch update
        res_batch = client.put(
            f"/api/v1/organizations/{org.id}/policies/batch",
            json={
                "policies": [
                    {"policy_key": "agenda_gate", "enabled": True},
                    {"policy_key": "incident_auto_report", "enabled": True, "name": "Báo cáo vi phạm"},
                ]
            },
        )
        assert res_batch.status_code == 200
        batch_res = res_batch.json()
        agenda_p = next(p for p in batch_res if p["policy_key"] == "agenda_gate")
        assert agenda_p["enabled"] is True
    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)


def test_issue_attachments_and_stars_lifecycle(client, db_session):
    user = models.User(email="jira_user@axiom.test", full_name="Jira Specialist", is_active=True)
    db_session.add(user)
    db_session.commit()

    app.dependency_overrides[deps.get_current_user] = lambda: user

    try:
        # 1. Create Jira Project & Issue
        res_p = client.post(
            "/api/v1/jira/projects",
            json={"key": "ATT", "name": "Attachment Project", "description": "Testing attachments"},
        )
        assert res_p.status_code == 201
        proj_id = res_p.json()["id"]

        res_i = client.post(
            "/api/v1/jira/issues",
            json={"project_id": proj_id, "summary": "Task with Attachments", "type": "TASK"},
        )
        assert res_i.status_code == 201
        issue_id = res_i.json()["id"]

        # 2. Upload Attachment
        file_content = b"Mock document content for testing real API"
        file_obj = io.BytesIO(file_content)
        res_upload = client.post(
            f"/api/v1/jira/issues/{issue_id}/attachments",
            files={"file": ("test_doc.txt", file_obj, "text/plain")},
        )
        assert res_upload.status_code == 201, res_upload.text
        att_data = res_upload.json()
        assert att_data["filename"] == "test_doc.txt"
        assert att_data["file_size"] == len(file_content)
        att_id = att_data["id"]

        # 3. List Attachments
        res_list = client.get(f"/api/v1/jira/issues/{issue_id}/attachments")
        assert res_list.status_code == 200
        assert len(res_list.json()) == 1

        # 4. Download Attachment
        res_down = client.get(f"/api/v1/jira/attachments/{att_id}/download")
        assert res_down.status_code == 200
        assert res_down.content == file_content

        # 5. Star & Unstar Project
        res_star = client.post(f"/api/v1/jira/projects/{proj_id}/star")
        assert res_star.status_code == 200
        assert proj_id in res_star.json()["starred_project_ids"]

        res_starred = client.get("/api/v1/jira/user/starred")
        assert res_starred.status_code == 200
        assert proj_id in res_starred.json()["starred_project_ids"]

        res_unstar = client.delete(f"/api/v1/jira/projects/{proj_id}/star")
        assert res_unstar.status_code == 200
        assert proj_id not in res_unstar.json()["starred_project_ids"]

        # 6. Delete Attachment
        res_del = client.delete(f"/api/v1/jira/attachments/{att_id}")
        assert res_del.status_code == 204

        res_list_after = client.get(f"/api/v1/jira/issues/{issue_id}/attachments")
        assert res_list_after.status_code == 200
        assert len(res_list_after.json()) == 0
    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)
