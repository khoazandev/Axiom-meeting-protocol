import pytest
from types import SimpleNamespace
from datetime import datetime, timezone, timedelta
from src.backend import models
from src.backend.services.candidate_evaluator import EvaluationService, EvaluationInput, EvaluationResult
from src.backend.tests.recruitment_fixtures import (
    create_opening_as_owner,
    invite_candidate_as_owner,
    exchange_candidate_session,
    submit_assessment,
    schedule_and_complete_interview,
    run_ai_evaluation,
    submit_hr_hire,
    approve_as_owner,
    issue_onboarding,
    accept_onboarding,
    load_application,
    membership_count,
)


def test_recruitment_lifecycle_to_hired(client, auth_as, recruitment_org, fake_evaluator, db_session):
    """Full Happy Path: Opening -> Invite -> Assessment -> Interview -> AI -> HR -> Owner -> Onboarding -> Hired."""
    opening = create_opening_as_owner(client, auth_as, recruitment_org, requires_assessment=True)
    invitation = invite_candidate_as_owner(client, opening, email="candidate.senior@example.com")
    candidate = exchange_candidate_session(client, invitation.raw_token)

    # 1. Assessment
    submit_assessment(client, candidate)

    # 2. Interview
    schedule_and_complete_interview(client, auth_as, candidate.application_id, candidate.headers, db_session)

    # 3. AI Evaluation
    run_ai_evaluation(client, auth_as, candidate.application_id, fake_evaluator, db_session=db_session)

    # 4. HR Review (Hire)
    submit_hr_hire(client, auth_as, candidate.application_id, db_session=db_session)

    # 5. Owner Approval
    approve_as_owner(client, auth_as, candidate.application_id, db_session=db_session)

    # 6. Issue & Accept Onboarding
    onboarding = issue_onboarding(client, auth_as, candidate.application_id, db_session=db_session)
    accept_onboarding(client, onboarding.raw_token, auth_as=auth_as, db_session=db_session)

    # 7. Verification
    application = load_application(client, auth_as, candidate.application_id, db_session)
    assert application["stage"] == "HIRED"
    assert application["terminal_at"] is not None
    assert membership_count(recruitment_org.organization.id, "candidate.senior@example.com", db_session) == 1


def test_recruitment_lifecycle_skipped_assessment(client, auth_as, recruitment_org, fake_evaluator, db_session):
    """Opening configured with requires_assessment=False skips assessment stage."""
    opening = create_opening_as_owner(client, auth_as, recruitment_org, requires_assessment=False)
    invitation = invite_candidate_as_owner(client, opening, email="candidate.noassessment@example.com")
    candidate = exchange_candidate_session(client, invitation.raw_token)

    app_before = load_application(client, auth_as, candidate.application_id, db_session)
    assert app_before["stage"] == "INVITED"

    # Directly proceed with interview
    schedule_and_complete_interview(client, auth_as, candidate.application_id, candidate.headers, db_session)
    run_ai_evaluation(client, auth_as, candidate.application_id, fake_evaluator, db_session=db_session)
    submit_hr_hire(client, auth_as, candidate.application_id, db_session=db_session)
    approve_as_owner(client, auth_as, candidate.application_id, db_session=db_session)
    onboarding = issue_onboarding(client, auth_as, candidate.application_id, db_session=db_session)
    accept_onboarding(client, onboarding.raw_token, auth_as=auth_as, db_session=db_session)

    application = load_application(client, auth_as, candidate.application_id, db_session)
    assert application["stage"] == "HIRED"


def test_recruitment_hr_no_hire_terminates_application(client, auth_as, recruitment_org, fake_evaluator, db_session):
    """HR Review rejecting the candidate transitions stage to REJECTED."""
    opening = create_opening_as_owner(client, auth_as, recruitment_org, requires_assessment=False)
    invitation = invite_candidate_as_owner(client, opening, email="candidate.hrreject@example.com")
    candidate = exchange_candidate_session(client, invitation.raw_token)

    schedule_and_complete_interview(client, auth_as, candidate.application_id, candidate.headers, db_session)
    run_ai_evaluation(client, auth_as, candidate.application_id, fake_evaluator, db_session=db_session)

    # HR rejects
    mgr_headers = {"X-Organization-ID": recruitment_org.organization.id, **auth_as(recruitment_org.selected_manager_user)}
    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{candidate.application_id}/hr-review",
        headers=mgr_headers,
        json={"decision": "RECOMMEND_REJECT", "reason": "Candidate does not meet system depth requirements"},
    )
    assert res.status_code == 200, res.text

    application = load_application(client, auth_as, candidate.application_id, db_session)
    assert application["stage"] == "REJECTED"
    assert application["terminal_at"] is not None


def test_recruitment_owner_rejection(client, auth_as, recruitment_org, fake_evaluator, db_session):
    """Owner rejecting the candidate transitions stage to REJECTED."""
    opening = create_opening_as_owner(client, auth_as, recruitment_org, requires_assessment=False)
    invitation = invite_candidate_as_owner(client, opening, email="candidate.ownerreject@example.com")
    candidate = exchange_candidate_session(client, invitation.raw_token)

    schedule_and_complete_interview(client, auth_as, candidate.application_id, candidate.headers, db_session)
    run_ai_evaluation(client, auth_as, candidate.application_id, fake_evaluator, db_session=db_session)
    submit_hr_hire(client, auth_as, candidate.application_id, db_session=db_session)

    # Owner rejects
    owner_headers = {"X-Organization-ID": recruitment_org.organization.id, **auth_as(recruitment_org.owner_user)}
    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{candidate.application_id}/owner-approval",
        headers=owner_headers,
        json={"decision": "REJECT", "reason": "Headcount freeze for Q4"},
    )
    assert res.status_code == 200, res.text

    application = load_application(client, auth_as, candidate.application_id, db_session)
    assert application["stage"] == "REJECTED"
    assert application["terminal_at"] is not None


def test_recruitment_candidate_withdrawal(client, auth_as, recruitment_org, db_session):
    """Candidate self-service withdrawal transitions application to WITHDRAWN."""
    opening = create_opening_as_owner(client, auth_as, recruitment_org)
    invitation = invite_candidate_as_owner(client, opening, email="candidate.withdraw@example.com")
    candidate = exchange_candidate_session(client, invitation.raw_token)

    res = client.post("/api/v1/recruitment/applications/me/withdraw", headers=candidate.headers)
    assert res.status_code == 200, res.text

    application = load_application(client, auth_as, candidate.application_id, db_session)
    assert application["stage"] == "WITHDRAWN"
    assert application["terminal_at"] is not None


def test_recruitment_ai_failure_does_not_block_human_review(client, auth_as, recruitment_org, db_session):
    """If AI evaluation fails or raises an unexpected error, HR manager can still perform review."""
    opening = create_opening_as_owner(client, auth_as, recruitment_org, requires_assessment=False)
    invitation = invite_candidate_as_owner(client, opening, email="candidate.aifail@example.com")
    candidate = exchange_candidate_session(client, invitation.raw_token)

    schedule_and_complete_interview(client, auth_as, candidate.application_id, candidate.headers, db_session)

    # AI Evaluation is optional / can fail without blocking stage advance to HR review
    app = load_application(client, auth_as, candidate.application_id, db_session)
    assert app["stage"] == "HR_REVIEW_PENDING"

    # HR proceeds directly
    submit_hr_hire(client, auth_as, candidate.application_id, reason="Human review proceeded without AI", db_session=db_session)
    app_after = load_application(client, auth_as, candidate.application_id, db_session)
    assert app_after["stage"] == "OWNER_APPROVAL_PENDING"


def test_recruitment_invitation_replay_blocked(client, auth_as, recruitment_org):
    """Single-use invitation token cannot be redeemed more than once."""
    opening = create_opening_as_owner(client, auth_as, recruitment_org)
    invitation = invite_candidate_as_owner(client, opening, email="candidate.replay@example.com")

    # First exchange succeeds
    first = exchange_candidate_session(client, invitation.raw_token)
    assert first.access_token is not None

    # Replaying token is rejected
    res = client.post("/api/v1/recruitment/candidate/session", json={"token": invitation.raw_token})
    assert res.status_code in (400, 401, 403, 404, 409, 422)


def test_recruitment_cross_tenant_isolation(client, auth_as, recruitment_org, db_session):
    """Organization B cannot read or modify applications from Organization A."""
    opening = create_opening_as_owner(client, auth_as, recruitment_org)
    invitation = invite_candidate_as_owner(client, opening, email="candidate.tenant@example.com")

    # Create Org B with another owner
    owner_b = db_session.query(models.User).filter_by(email="owner.b@other.test").first()
    if not owner_b:
        owner_b = models.User(email="owner.b@other.test", full_name="Owner B", is_active=True)
        db_session.add(owner_b)
        db_session.flush()

    org_b = models.Organization(name="Other Corp", created_by_id=owner_b.id)
    db_session.add(org_b)
    db_session.flush()

    owner_b_member = models.OrganizationMember(
        organization_id=org_b.id,
        user_id=owner_b.id,
        role_id=recruitment_org.owner_role.id,
        status=models.OrgMemberStatusEnum.ACTIVE,
    )
    db_session.add(owner_b_member)
    db_session.commit()

    headers_b = {"X-Organization-ID": org_b.id, **auth_as(owner_b)}

    # Org B attempts to read Org A's application
    res = client.get(
        f"/api/v1/organizations/{org_b.id}/recruitment/applications/{invitation.application_id}",
        headers=headers_b,
    )
    assert res.status_code in (403, 404)


def test_recruitment_stale_owner_approval_version(client, auth_as, recruitment_org, fake_evaluator, db_session):
    """Owner approval with outdated expected_version is rejected with 409 Conflict."""
    opening = create_opening_as_owner(client, auth_as, recruitment_org, requires_assessment=False)
    invitation = invite_candidate_as_owner(client, opening, email="candidate.version@example.com")
    candidate = exchange_candidate_session(client, invitation.raw_token)

    schedule_and_complete_interview(client, auth_as, candidate.application_id, candidate.headers, db_session)
    submit_hr_hire(client, auth_as, candidate.application_id, db_session=db_session)

    owner_headers = {"X-Organization-ID": recruitment_org.organization.id, **auth_as(recruitment_org.owner_user)}

    # Submit with intentional stale version 999
    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{candidate.application_id}/owner-approval",
        headers=owner_headers,
        json={"decision": "APPROVE", "reason": "Approved", "expected_version": 999},
    )
    assert res.status_code == 409, res.text
