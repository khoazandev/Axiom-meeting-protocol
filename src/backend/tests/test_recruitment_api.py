import pytest
from src.backend import models
from src.backend.tests.test_recruitment_models import make_application, make_opening


def test_manager_from_other_department_cannot_read_application(
    client, auth_as, recruitment_org
):
    app = make_application(recruitment_org.selected_manager._sa_instance_state.session, recruitment_org)
    auth_headers = auth_as(recruitment_org.other_manager_user)

    response = client.get(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
    )
    assert response.status_code == 403


def test_assigned_hr_can_only_submit_review_for_current_stage(
    client, auth_as, recruitment_org
):
    db = recruitment_org.selected_manager._sa_instance_state.session
    # Application is in INVITED stage, not HR_REVIEW_PENDING!
    app = make_application(db, recruitment_org, stage="INVITED", version=1)

    # Selected manager already has review permission from recruitment_org fixture
    auth_headers = auth_as(recruitment_org.selected_manager_user)
    response = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/hr-review",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"decision": "RECOMMEND_HIRE", "reason": "Evidence meets rubric", "expected_version": 1},
    )
    assert response.status_code == 409


def test_owner_can_create_opening_and_list_openings(client, auth_as, recruitment_org):
    auth_headers = auth_as(recruitment_org.owner_user)

    # 1. Create opening
    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/openings",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={
            "department_id": recruitment_org.eng_department.id,
            "title": "Lead DevOps Engineer",
            "description": "Kubernetes & Cloud Architect",
            "requirements": "5+ years experience",
            "requires_assessment": True,
        },
    )
    assert res.status_code == 201
    opening_id = res.json()["id"]

    # 2. List openings
    list_res = client.get(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/openings",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
    )
    assert list_res.status_code == 200
    openings = list_res.json()
    assert any(o["id"] == opening_id for o in openings)


def test_recruitment_me_endpoint(client, auth_as, recruitment_org):
    auth_headers = auth_as(recruitment_org.selected_manager_user)
    res = client.get(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/me",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "MANAGER"
    assert "recruitment.review" in data["permissions"]
    assert recruitment_org.eng_department.id in data["department_ids"]


def test_review_grant_toggle_by_owner(client, auth_as, recruitment_org):
    auth_headers = auth_as(recruitment_org.owner_user)
    mgr_id = recruitment_org.selected_manager.id

    # 1. Enable review grant
    res1 = client.put(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/managers/{mgr_id}/review-grant",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"enabled": True},
    )
    assert res1.status_code == 200
    assert res1.json()["enabled"] is True

    # 1.1 Verify GET /managers/review-grants lists the enabled grant
    list_res = client.get(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/managers/review-grants",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
    )
    assert list_res.status_code == 200
    assert any(g["member_id"] == mgr_id and g["enabled"] is True for g in list_res.json())

    # 2. Disable review grant
    res2 = client.put(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/managers/{mgr_id}/review-grant",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"enabled": False},
    )
    assert res2.status_code == 200
    assert res2.json()["enabled"] is False


def test_policy_get_and_update(client, auth_as, recruitment_org):
    auth_headers = auth_as(recruitment_org.owner_user)

    # 1. Get default policy
    res1 = client.get(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/policy",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
    )
    assert res1.status_code == 200
    assert res1.json()["retention_days"] == 180

    # 2. Update policy
    res2 = client.put(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/policy",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"retention_days": 90},
    )
    assert res2.status_code == 200
    assert res2.json()["retention_days"] == 90


def test_hr_review_advances_stage_and_is_idempotent(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org, stage="HR_REVIEW_PENDING", version=1)

    # Selected manager already has review permission from recruitment_org fixture
    auth_headers = auth_as(recruitment_org.selected_manager_user)
    # 1. Submit HR review
    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/hr-review",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"decision": "RECOMMEND_HIRE", "reason": "Candidate passed all technical criteria", "expected_version": 1},
    )
    assert res.status_code == 200
    assert res.json()["decision"] == "RECOMMEND_HIRE"

    db.refresh(app)
    assert app.stage == models.RecruitmentStageEnum.OWNER_APPROVAL_PENDING
    assert app.version == 2

    # 2. Idempotent re-submission with same payload returns 200
    res_idem = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/hr-review",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"decision": "RECOMMEND_HIRE", "reason": "Candidate passed all technical criteria"},
    )
    assert res_idem.status_code == 200

    # 3. Conflicting re-submission returns 409
    res_conflict = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/hr-review",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"decision": "RECOMMEND_REJECT", "reason": "Changed mind completely"},
    )
    assert res_conflict.status_code == 409


def test_owner_approval_advances_stage_and_is_idempotent(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org, stage="OWNER_APPROVAL_PENDING", version=3)

    auth_headers = auth_as(recruitment_org.owner_user)
    # 1. Approve application
    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/owner-approval",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"decision": "APPROVE", "reason": "Strong hire recommendation supported", "expected_version": 3},
    )
    assert res.status_code == 200
    assert res.json()["decision"] == "APPROVE"

    db.refresh(app)
    assert app.stage == models.RecruitmentStageEnum.APPROVED
    assert app.version == 4

    # 2. Idempotent re-submission
    res_idem = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/owner-approval",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"decision": "APPROVE", "reason": "Strong hire recommendation supported"},
    )
    assert res_idem.status_code == 200

    # 3. Conflicting re-submission returns 409
    res_conflict = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/owner-approval",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"decision": "REJECT", "reason": "Budget cut"},
    )
    assert res_conflict.status_code == 409


def test_disable_review_grant_rejected_when_active_application_assigned(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    # Manager has active application assigned
    app = make_application(db, recruitment_org, stage="INVITED", version=1)

    # Manager already has review grant enabled from fixture

    # Try to disable review grant while manager still owns active application
    auth_headers = auth_as(recruitment_org.owner_user)
    res = client.put(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/managers/{recruitment_org.selected_manager.id}/review-grant",
        headers={"X-Organization-ID": recruitment_org.organization.id, **auth_headers},
        json={"enabled": False},
    )
    assert res.status_code == 409
    assert "Manager still has active" in res.json()["error"]["message"]


def test_application_list_scoping(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org, stage="INVITED", version=1)

    # Owner can see applications
    owner_headers = auth_as(recruitment_org.owner_user)
    res_owner = client.get(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
    )
    assert res_owner.status_code == 200
    assert any(a["id"] == app.id for a in res_owner.json())

    # Manager without review grant gets 403
    other_mgr_headers = auth_as(recruitment_org.other_manager_user)
    res_other = client.get(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications",
        headers={"X-Organization-ID": recruitment_org.organization.id, **other_mgr_headers},
    )
    assert res_other.status_code == 403


def test_assign_application_hr(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org, stage="INVITED", version=1)

    # Selected manager already has review permission from recruitment_org fixture
    owner_headers = auth_as(recruitment_org.owner_user)
    res = client.put(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/assign-hr",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={"assigned_hr_member_id": recruitment_org.selected_manager.id},
    )
    assert res.status_code == 200
    assert res.json()["assigned_hr_member_id"] == recruitment_org.selected_manager.id


def test_move_application_stage(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org, stage="INVITED", version=1)

    owner_headers = auth_as(recruitment_org.owner_user)

    # 1. Move to ASSESSMENT_PENDING (drag to test column)
    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/move-stage",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={"target_stage": "ASSESSMENT_PENDING", "reason": "Kéo thả Kanban sang cột test"},
    )
    assert res.status_code == 200
    assert res.json()["stage"] == "ASSESSMENT_PENDING"

    # 2. Move to INTERVIEW_SCHEDULED
    res2 = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/move-stage",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={"target_stage": "INTERVIEW_SCHEDULED", "reason": "Kéo thả Kanban sang cột phỏng vấn"},
    )
    assert res2.status_code == 200
    assert res2.json()["stage"] == "INTERVIEW_SCHEDULED"

