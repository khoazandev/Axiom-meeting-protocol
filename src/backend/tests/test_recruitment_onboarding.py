import hashlib
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import ForbiddenException, ValidationException
from src.backend.main import app as fastapi_app
from src.backend.services.onboarding_service import OnboardingService
from src.backend.services.recruitment_workflow import RecruitmentConflict
from src.backend.tests.recruitment_fixtures import recruitment_org, auth_as


def make_application(
    db: Session,
    recruitment_org,
    stage: str = "APPROVED",
    email: str = "hired.candidate@axiom.test",
) -> models.RecruitmentApplication:
    opening = models.JobOpening(
        organization_id=recruitment_org.organization.id,
        department_id=recruitment_org.eng_department.id,
        title="Senior Software Engineer",
        created_by_id=recruitment_org.owner.user_id,
        status=models.JobOpeningStatusEnum.ACTIVE,
    )
    db.add(opening)
    db.flush()

    candidate = models.Candidate(
        organization_id=recruitment_org.organization.id,
        email=email,
        full_name="Alex Candidate",
        phone="+1555123456",
    )
    db.add(candidate)
    db.flush()

    stage_enum = getattr(models.RecruitmentStageEnum, stage)
    app = models.RecruitmentApplication(
        organization_id=recruitment_org.organization.id,
        opening_id=opening.id,
        candidate_id=candidate.id,
        stage=stage_enum,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def test_cannot_issue_onboarding_before_owner_approval(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    application = make_application(db, recruitment_org, stage="OWNER_APPROVAL_PENDING")
    with pytest.raises(RecruitmentConflict):
        OnboardingService(db).issue_invitation(application.id, recruitment_org.owner, "key-1")


def test_non_owner_cannot_issue_onboarding(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    application = make_application(db, recruitment_org, stage="APPROVED")
    with pytest.raises(ForbiddenException):
        OnboardingService(db).issue_invitation(application.id, recruitment_org.selected_manager, "key-1")


def test_retry_returns_same_invitation(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    approved_application = make_application(db, recruitment_org, stage="APPROVED")
    service = OnboardingService(db)
    first = service.issue_invitation(approved_application.id, recruitment_org.owner, "key-1")
    second = service.issue_invitation(approved_application.id, recruitment_org.owner, "key-1")
    assert first.invitation.id == second.invitation.id
    assert (
        db.query(models.OrganizationInvitation)
        .filter_by(recruitment_application_id=approved_application.id)
        .count()
        == 1
    )


def test_raw_token_is_not_stored_in_database(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    application = make_application(db, recruitment_org, stage="APPROVED")
    service = OnboardingService(db)
    issued = service.issue_invitation(application.id, recruitment_org.owner, "token-sec-key")

    assert issued.raw_token is not None
    assert len(issued.raw_token) > 10

    # Query from database directly
    db.expire_all()
    invitation = db.query(models.OrganizationInvitation).filter_by(id=issued.invitation.id).first()
    expected_hash = hashlib.sha256(issued.raw_token.strip().encode("utf-8")).hexdigest()

    assert invitation.token_hash == expected_hash
    # Model's token property returns None, raw token is never persisted
    assert invitation.token is None


def test_candidate_is_not_user_or_member_until_onboarding_accepted(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    cand_email = "pre_hire@axiom.test"
    application = make_application(db, recruitment_org, stage="APPROVED", email=cand_email)

    service = OnboardingService(db)
    issued = service.issue_invitation(application.id, recruitment_org.owner, "key-pre-hire")

    # Verify no User exists with this email
    assert db.query(models.User).filter_by(email=cand_email).first() is None
    # Application stage is advanced to ONBOARDING_INVITED
    db.refresh(application)
    assert application.stage == models.RecruitmentStageEnum.ONBOARDING_INVITED


def test_onboarding_acceptance_via_api_advances_stage_to_hired(recruitment_org, auth_as):
    db = recruitment_org.owner._sa_instance_state.session
    cand_email = "new.employee@axiom.test"
    application = make_application(db, recruitment_org, stage="APPROVED", email=cand_email)

    service = OnboardingService(db)
    issued = service.issue_invitation(application.id, recruitment_org.owner, "key-flow-1")

    # Create user for candidate
    user = models.User(
        email=cand_email,
        full_name="New Employee",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    client = TestClient(fastapi_app)
    headers = auth_as(user)

    # Candidate accepts invitation
    response = client.post(f"/api/v1/invitations/{issued.raw_token}/accept", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"

    # Verify application stage is now HIRED
    db.refresh(application)
    assert application.stage == models.RecruitmentStageEnum.HIRED
    assert application.terminal_at is not None

    # Verify User is now active OrganizationMember and DepartmentMember
    membership = (
        db.query(models.OrganizationMember)
        .filter_by(organization_id=recruitment_org.organization.id, user_id=user.id)
        .first()
    )
    assert membership is not None
    assert membership.status == models.OrgMemberStatusEnum.ACTIVE

    dept_member = (
        db.query(models.DepartmentMember)
        .filter_by(department_id=recruitment_org.eng_department.id, user_id=user.id)
        .first()
    )
    assert dept_member is not None

    # Verify audit trail contains COMPLETE_ONBOARDING
    audit = (
        db.query(models.RecruitmentAuditEvent)
        .filter_by(application_id=application.id, action="COMPLETE_ONBOARDING")
        .first()
    )
    assert audit is not None
    assert audit.new_stage == "HIRED"


def test_onboarding_acceptance_rejects_email_mismatch(recruitment_org, auth_as):
    db = recruitment_org.owner._sa_instance_state.session
    cand_email = "alex.intended@axiom.test"
    application = make_application(db, recruitment_org, stage="APPROVED", email=cand_email)

    service = OnboardingService(db)
    issued = service.issue_invitation(application.id, recruitment_org.owner, "key-mismatch")

    # Different user tries to accept
    imposter = models.User(
        email="imposter@axiom.test",
        full_name="Imposter User",
        is_active=True,
    )
    db.add(imposter)
    db.commit()

    client = TestClient(fastapi_app)
    headers = auth_as(imposter)

    response = client.post(f"/api/v1/invitations/{issued.raw_token}/accept", headers=headers)
    assert response.status_code in (400, 422)
    assert "email does not match" in response.text.lower()
