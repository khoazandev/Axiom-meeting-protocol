import json
import subprocess
import sys
from datetime import datetime, timezone, timedelta
import pytest
from src.backend import models
from src.backend.services.recruitment_retention import purge_expired_recruitment_data
from src.backend.tests.recruitment_fixtures import recruitment_org


def create_candidate(db, org_id, email="candidate@test.com", full_name="John Candidate"):
    cand = models.Candidate(
        organization_id=org_id,
        email=email,
        full_name=full_name,
        phone="+1234567890",
        cv_url="https://example.com/cv.pdf",
        notes="Strong candidate",
    )
    db.add(cand)
    db.flush()
    return cand


def create_opening(db, recruitment_org):
    opening = models.JobOpening(
        organization_id=recruitment_org.organization.id,
        department_id=recruitment_org.eng_department.id,
        title="Backend Engineer",
        created_by_id=recruitment_org.owner.user_id,
        status=models.JobOpeningStatusEnum.ACTIVE,
    )
    db.add(opening)
    db.flush()
    return opening


def test_retention_redacts_old_terminal_application_but_keeps_audit(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    now = datetime(2026, 9, 27, 12, 0, 0, tzinfo=timezone.utc)

    opening = create_opening(db, recruitment_org)
    candidate = create_candidate(db, recruitment_org.organization.id)
    app = models.RecruitmentApplication(
        organization_id=recruitment_org.organization.id,
        opening_id=opening.id,
        candidate_id=candidate.id,
        stage=models.RecruitmentStageEnum.REJECTED,
        terminal_at=now - timedelta(days=200),
    )
    db.add(app)
    db.flush()

    # Add an assessment attempt
    attempt = models.AssessmentAttempt(
        application_id=app.id,
        definition_snapshot_json="{}",
        status=models.AssessmentStatusEnum.SUBMITTED,
        answers_json=json.dumps({"q1": "my answer"}),
    )
    db.add(attempt)

    # Add an interview session with meeting and transcript segments
    meeting = models.Meeting(
        organization_id=recruitment_org.organization.id,
        created_by_id=recruitment_org.owner.user_id,
        title="Candidate Interview",
        meeting_type="RECRUITMENT_INTERVIEW",
    )
    db.add(meeting)
    db.flush()

    segment = models.TranscriptSegment(
        id="seg-del-1",
        meeting_id=meeting.id,
        content="Candidate confidential conversation",
        start_time="00:00:01",
        end_time="00:00:05",
        sequence=1,
    )
    db.add(segment)

    session = models.InterviewSession(
        application_id=app.id,
        meeting_id=meeting.id,
        scheduled_at=now - timedelta(days=205),
        status=models.InterviewStatusEnum.COMPLETED,
    )
    db.add(session)

    # Add an AI evaluation with evidence quotes
    ai_eval = models.AIEvaluation(
        application_id=app.id,
        rubric_version=1,
        evidence_json=json.dumps([{"quote": "candidate confidential quote", "source_id": "seg-del-1"}]),
        recommendation="DO_NOT_PROCEED",
    )
    db.add(ai_eval)

    # Add an initial stage audit event
    audit_pre = models.RecruitmentAuditEvent(
        organization_id=recruitment_org.organization.id,
        application_id=app.id,
        action="REJECTED",
        actor_id=recruitment_org.owner.id,
        previous_stage="HR_REVIEW_PENDING",
        new_stage="REJECTED",
    )
    db.add(audit_pre)
    db.commit()

    # Execute purge
    result = purge_expired_recruitment_data(
        db,
        organization_id=recruitment_org.organization.id,
        now=now,
    )

    db.refresh(candidate)
    db.refresh(app)
    db.refresh(attempt)
    db.refresh(ai_eval)

    assert result.redacted_applications == 1
    assert result.deleted_segments == 1
    assert result.candidate_pii_cleared == 1

    # Candidate PII cleared
    assert candidate.full_name is None
    assert candidate.email is None
    assert candidate.phone is None
    assert candidate.cv_url is None
    assert candidate.notes is None
    assert candidate.redacted_at is not None
    # Email hash preserved
    assert candidate.email_hash is not None

    # Assessment answers cleared
    assert attempt.answers_json is None

    # AI evaluation evidence cleared
    assert ai_eval.evidence_json is None
    assert ai_eval.recommendation == "DO_NOT_PROCEED"

    # Transcript segments deleted
    remaining_segs = db.query(models.TranscriptSegment).filter_by(meeting_id=meeting.id).count()
    assert remaining_segs == 0

    # Audit events preserved and RETENTION_REDACTED appended
    redacted_event = (
        db.query(models.RecruitmentAuditEvent)
        .filter_by(application_id=app.id, action="RETENTION_REDACTED")
        .first()
    )
    assert redacted_event is not None
    assert db.query(models.RecruitmentAuditEvent).filter_by(application_id=app.id).count() >= 2


def test_retention_never_redacts_active_application(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    now = datetime(2026, 9, 27, 12, 0, 0, tzinfo=timezone.utc)

    opening = create_opening(db, recruitment_org)
    candidate = create_candidate(db, recruitment_org.organization.id, email="active@test.com")
    app = models.RecruitmentApplication(
        organization_id=recruitment_org.organization.id,
        opening_id=opening.id,
        candidate_id=candidate.id,
        stage=models.RecruitmentStageEnum.INTERVIEW_SCHEDULED,
        updated_at=now - timedelta(days=300),
    )
    db.add(app)
    db.commit()

    result = purge_expired_recruitment_data(
        db,
        organization_id=recruitment_org.organization.id,
        now=now,
    )

    db.refresh(candidate)
    assert result.redacted_applications == 0
    assert candidate.email == "active@test.com"
    assert candidate.full_name is not None


def test_retention_respects_custom_retention_days(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    now = datetime(2026, 9, 27, 12, 0, 0, tzinfo=timezone.utc)

    # Set custom policy of 30 days
    policy = models.RecruitmentPolicy(
        organization_id=recruitment_org.organization.id,
        retention_days=30,
    )
    db.add(policy)
    db.flush()

    opening = create_opening(db, recruitment_org)
    c1 = create_candidate(db, recruitment_org.organization.id, email="old@test.com")
    c2 = create_candidate(db, recruitment_org.organization.id, email="recent@test.com")

    # App 1: 45 days old terminal (should be purged)
    app1 = models.RecruitmentApplication(
        organization_id=recruitment_org.organization.id,
        opening_id=opening.id,
        candidate_id=c1.id,
        stage=models.RecruitmentStageEnum.WITHDRAWN,
        terminal_at=now - timedelta(days=45),
    )
    # App 2: 15 days old terminal (should be kept)
    app2 = models.RecruitmentApplication(
        organization_id=recruitment_org.organization.id,
        opening_id=opening.id,
        candidate_id=c2.id,
        stage=models.RecruitmentStageEnum.WITHDRAWN,
        terminal_at=now - timedelta(days=15),
    )
    db.add_all([app1, app2])
    db.commit()

    result = purge_expired_recruitment_data(
        db,
        organization_id=recruitment_org.organization.id,
        now=now,
    )

    assert result.redacted_applications == 1
    db.refresh(c1)
    db.refresh(c2)
    assert c1.email is None
    assert c2.email == "recent@test.com"


def test_retention_tenant_isolation(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    now = datetime(2026, 9, 27, 12, 0, 0, tzinfo=timezone.utc)

    # Create another organization
    other_org = models.Organization(name="Other Corp", created_by_id=recruitment_org.owner.user_id)
    db.add(other_org)
    db.flush()

    cand_other = create_candidate(db, other_org.id, email="other_org@test.com")
    opening_other = models.JobOpening(
        organization_id=other_org.id,
        department_id=recruitment_org.eng_department.id,
        title="Other Job",
        created_by_id=recruitment_org.owner.user_id,
        status=models.JobOpeningStatusEnum.ACTIVE,
    )
    db.add(opening_other)
    db.flush()

    app_other = models.RecruitmentApplication(
        organization_id=other_org.id,
        opening_id=opening_other.id,
        candidate_id=cand_other.id,
        stage=models.RecruitmentStageEnum.EXPIRED,
        terminal_at=now - timedelta(days=365),
    )
    db.add(app_other)
    db.commit()

    # Purge only recruitment_org.organization.id
    result = purge_expired_recruitment_data(
        db,
        organization_id=recruitment_org.organization.id,
        now=now,
    )

    db.refresh(cand_other)
    assert cand_other.email == "other_org@test.com"


def test_retention_idempotent_reruns(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    now = datetime(2026, 9, 27, 12, 0, 0, tzinfo=timezone.utc)

    opening = create_opening(db, recruitment_org)
    cand = create_candidate(db, recruitment_org.organization.id, email="idem@test.com")
    app = models.RecruitmentApplication(
        organization_id=recruitment_org.organization.id,
        opening_id=opening.id,
        candidate_id=cand.id,
        stage=models.RecruitmentStageEnum.REJECTED,
        terminal_at=now - timedelta(days=200),
    )
    db.add(app)
    db.commit()

    res1 = purge_expired_recruitment_data(db, recruitment_org.organization.id, now=now)
    assert res1.redacted_applications == 1

    # Second run should be no-op
    res2 = purge_expired_recruitment_data(db, recruitment_org.organization.id, now=now)
    assert res2.redacted_applications == 0

    audit_count = (
        db.query(models.RecruitmentAuditEvent)
        .filter_by(application_id=app.id, action="RETENTION_REDACTED")
        .count()
    )
    assert audit_count == 1


def test_retention_candidate_with_active_application_preserves_candidate_pii(recruitment_org):
    db = recruitment_org.owner._sa_instance_state.session
    now = datetime(2026, 9, 27, 12, 0, 0, tzinfo=timezone.utc)

    opening1 = create_opening(db, recruitment_org)
    opening2 = models.JobOpening(
        organization_id=recruitment_org.organization.id,
        department_id=recruitment_org.eng_department.id,
        title="Staff Engineer",
        created_by_id=recruitment_org.owner.user_id,
        status=models.JobOpeningStatusEnum.ACTIVE,
    )
    db.add(opening2)
    db.flush()

    cand = create_candidate(db, recruitment_org.organization.id, email="multi@test.com", full_name="Multi Applicant")

    # Old rejected application for opening 1
    app1 = models.RecruitmentApplication(
        organization_id=recruitment_org.organization.id,
        opening_id=opening1.id,
        candidate_id=cand.id,
        stage=models.RecruitmentStageEnum.REJECTED,
        terminal_at=now - timedelta(days=200),
    )
    # Active application for opening 2
    app2 = models.RecruitmentApplication(
        organization_id=recruitment_org.organization.id,
        opening_id=opening2.id,
        candidate_id=cand.id,
        stage=models.RecruitmentStageEnum.INTERVIEW_SCHEDULED,
    )
    db.add_all([app1, app2])
    db.commit()

    result = purge_expired_recruitment_data(db, recruitment_org.organization.id, now=now)

    assert result.redacted_applications == 1
    assert result.candidate_pii_cleared == 0  # Candidate PII not wiped because candidate still has an active application

    db.refresh(cand)
    assert cand.email == "multi@test.com"
    assert cand.full_name == "Multi Applicant"


def test_purge_cli_script_invokes_cleanly():
    import os
    env = dict(os.environ)
    env["PYTHONPATH"] = "."
    result = subprocess.run(
        [sys.executable, "scripts/purge_recruitment_data.py", "--organization-id", "non-existent-org", "--now", "2026-09-27T12:00:00Z"],
        capture_output=True,
        text=True,
        env=env,
    )
    assert result.returncode == 0
    assert "Redacted applications: 0" in result.stdout
    assert "Candidate PII cleared: 0" in result.stdout


def test_purge_cli_script_exits_nonzero_on_invalid_now():
    import os
    env = dict(os.environ)
    env["PYTHONPATH"] = "."
    result = subprocess.run(
        [sys.executable, "scripts/purge_recruitment_data.py", "--organization-id", "non-existent-org", "--now", "invalid-timestamp"],
        capture_output=True,
        text=True,
        env=env,
    )
    assert result.returncode != 0
    assert "Invalid --now timestamp format" in result.stderr
