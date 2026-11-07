import pytest
from sqlalchemy.exc import IntegrityError

from src.backend import models


def make_opening(db, recruitment_org, title="Senior Backend Engineer"):
    opening = models.JobOpening(
        organization_id=recruitment_org.organization.id,
        department_id=recruitment_org.eng_department.id,
        title=title,
        created_by_id=recruitment_org.owner.user_id,
        requires_assessment=True,
    )
    db.add(opening)
    db.commit()
    db.refresh(opening)
    return opening


def make_candidate(db, recruitment_org, email="candidate@axiom.test", full_name="John Candidate"):
    candidate = models.Candidate(
        organization_id=recruitment_org.organization.id,
        email=email,
        full_name=full_name,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def make_application(db, recruitment_org, stage="INVITED", version=1):
    opening = make_opening(db, recruitment_org)
    candidate = make_candidate(db, recruitment_org, email=f"candidate_{opening.id[:8]}@axiom.test")
    app = models.RecruitmentApplication(
        organization_id=recruitment_org.organization.id,
        opening_id=opening.id,
        candidate_id=candidate.id,
        assigned_hr_member_id=recruitment_org.selected_manager.id,
        stage=stage,
        version=version,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def test_one_active_application_per_candidate_and_opening(db_session, recruitment_org):
    first = make_application(db_session, recruitment_org)
    duplicate = models.RecruitmentApplication(
        organization_id=first.organization_id,
        opening_id=first.opening_id,
        candidate_id=first.candidate_id,
        assigned_hr_member_id=first.assigned_hr_member_id,
    )
    db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_candidate_is_not_a_user_or_member(db_session, recruitment_org):
    candidate = make_candidate(db_session, recruitment_org, email="candidate.isolated@axiom.test")
    assert db_session.query(models.User).filter_by(email=candidate.email).first() is None
    assert (
        db_session.query(models.OrganizationMember)
        .filter_by(organization_id=candidate.organization_id, user_id=candidate.id)
        .count()
        == 0
    )


def test_recruitment_policy_defaults_to_180_days(db_session, recruitment_org):
    policy = models.RecruitmentPolicy(
        organization_id=recruitment_org.organization.id,
    )
    db_session.add(policy)
    db_session.commit()
    db_session.refresh(policy)
    assert policy.retention_days == 180
