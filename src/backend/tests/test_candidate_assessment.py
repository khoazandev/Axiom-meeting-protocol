import hashlib
import json
from datetime import datetime, timedelta, timezone
import pytest
from src.backend import models
from src.backend.services.candidate_auth import generate_invitation_token
from src.backend.tests.test_recruitment_models import make_application, make_opening


def test_raw_candidate_token_is_not_persisted(client, auth_as, recruitment_org):
    opening = make_opening(recruitment_org.selected_manager._sa_instance_state.session, recruitment_org)
    owner_headers = auth_as(recruitment_org.owner_user)

    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={
            "opening_id": opening.id,
            "candidate_email": "candidate_raw_token@example.com",
            "candidate_name": "Test Candidate Raw Token",
        },
    )
    assert res.status_code == 201
    data = res.json()
    raw_token = data["invitation_token"]

    db = recruitment_org.selected_manager._sa_instance_state.session
    inv = db.query(models.RecruitmentInvitation).filter_by(application_id=data["application_id"]).first()
    assert inv is not None
    assert raw_token not in inv.token_hash
    assert inv.token_hash == hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def test_candidate_token_exchange_and_me_profile(client, auth_as, recruitment_org):
    opening = make_opening(recruitment_org.selected_manager._sa_instance_state.session, recruitment_org)
    owner_headers = auth_as(recruitment_org.owner_user)

    # 1. Invite candidate
    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={
            "opening_id": opening.id,
            "candidate_email": "jane.doe@example.com",
            "candidate_name": "Jane Doe",
        },
    )
    assert res.status_code == 201
    invitation_token = res.json()["invitation_token"]
    app_id = res.json()["application_id"]

    # 2. Candidate exchanges token for JWT
    exchange_res = client.post(f"/api/v1/recruitment/invitations/{invitation_token}/session")
    assert exchange_res.status_code == 200
    candidate_jwt = exchange_res.json()["access_token"]
    assert exchange_res.json()["application_id"] == app_id

    # 3. Candidate accesses profile with JWT
    candidate_headers = {"Authorization": f"Bearer {candidate_jwt}"}
    me_res = client.get("/api/v1/recruitment/applications/me", headers=candidate_headers)
    assert me_res.status_code == 200
    assert me_res.json()["id"] == app_id
    assert me_res.json()["stage"] == "INVITED"

    # 4. Token cannot be used after max uses
    replay_res = client.post(f"/api/v1/recruitment/invitations/{invitation_token}/session")
    assert replay_res.status_code == 401


def test_candidate_token_expiry_and_revocation(client, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org)

    # Create expired token
    raw_token_expired = generate_invitation_token()
    inv_expired = models.RecruitmentInvitation(
        organization_id=recruitment_org.organization.id,
        application_id=app.id,
        token_hash=hashlib.sha256(raw_token_expired.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db.add(inv_expired)

    # Create revoked token
    raw_token_revoked = generate_invitation_token()
    inv_revoked = models.RecruitmentInvitation(
        organization_id=recruitment_org.organization.id,
        application_id=app.id,
        token_hash=hashlib.sha256(raw_token_revoked.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        revoked_at=datetime.now(timezone.utc),
    )
    db.add(inv_revoked)
    db.commit()

    # Exchange expired
    res1 = client.post(f"/api/v1/recruitment/invitations/{raw_token_expired}/session")
    assert res1.status_code == 401

    # Exchange revoked
    res2 = client.post(f"/api/v1/recruitment/invitations/{raw_token_revoked}/session")
    assert res2.status_code == 401


def test_assessment_snapshot_and_submission(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    owner_headers = auth_as(recruitment_org.owner_user)

    # 1. Create Assessment Definition
    questions = [
        {"id": "q1", "text": "What is Python GIL?", "required": True},
        {"id": "q2", "text": "Explain ACID properties", "required": False},
    ]
    def_res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/assessment-definitions",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={
            "title": "Backend Engineering Test",
            "duration_minutes": 45,
            "questions_json": json.dumps(questions),
        },
    )
    assert def_res.status_code == 201
    definition_id = def_res.json()["id"]

    # 2. Create Application with assessment required
    opening = make_opening(db, recruitment_org)
    opening.requires_assessment = True
    db.commit()

    inv_res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={
            "opening_id": opening.id,
            "candidate_email": "candidate_assessed@example.com",
            "candidate_name": "Assessed Candidate",
        },
    )
    app_id = inv_res.json()["application_id"]
    raw_token = inv_res.json()["invitation_token"]

    # 3. Assign Assessment
    assign_res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app_id}/assign-assessment",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={"definition_id": definition_id},
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["definition_snapshot_json"] == json.dumps(questions)

    # Application should have moved to ASSESSMENT_PENDING
    app_db = db.query(models.RecruitmentApplication).filter_by(id=app_id).first()
    assert app_db.stage == models.RecruitmentStageEnum.ASSESSMENT_PENDING

    # 4. Mutate original definition; verify snapshot remains unchanged
    def_record = db.query(models.AssessmentDefinition).filter_by(id=definition_id).first()
    def_record.questions_json = json.dumps([{"id": "q_modified"}])
    db.commit()

    attempt = db.query(models.AssessmentAttempt).filter_by(application_id=app_id).first()
    assert attempt.questions_snapshot == json.dumps(questions)

    # 5. Candidate session and submission
    token_res = client.post(f"/api/v1/recruitment/invitations/{raw_token}/session")
    cand_jwt = token_res.json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_jwt}"}

    # Fetch assessment
    fetch_res = client.get("/api/v1/recruitment/applications/me/assessment", headers=cand_headers)
    assert fetch_res.status_code == 200

    # Submit assessment
    submit_res = client.post(
        "/api/v1/recruitment/applications/me/assessment/submit",
        headers=cand_headers,
        json={"answers_json": json.dumps({"q1": "Global Interpreter Lock", "q2": "Atomicity, Consistency..."})},
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"

    db.refresh(app_db)
    assert app_db.stage == models.RecruitmentStageEnum.ASSESSMENT_SUBMITTED


def test_candidate_withdraw_flow(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    opening = make_opening(db, recruitment_org)
    owner_headers = auth_as(recruitment_org.owner_user)

    inv_res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={
            "opening_id": opening.id,
            "candidate_email": "withdraw_candidate@example.com",
            "candidate_name": "Withdraw Candidate",
        },
    )
    raw_token = inv_res.json()["invitation_token"]
    app_id = inv_res.json()["application_id"]

    token_res = client.post(f"/api/v1/recruitment/invitations/{raw_token}/session")
    cand_jwt = token_res.json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_jwt}"}

    # Withdraw application
    withdraw_res = client.post("/api/v1/recruitment/applications/me/withdraw", headers=cand_headers)
    assert withdraw_res.status_code == 200

    app_db = db.query(models.RecruitmentApplication).filter_by(id=app_id).first()
    assert app_db.stage == models.RecruitmentStageEnum.WITHDRAWN
    assert app_db.terminal_at is not None
