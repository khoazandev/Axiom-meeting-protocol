import pytest
from src.backend import models
from src.backend.services.recruitment_workflow import (
    RecruitmentCommand,
    RecruitmentConflict,
    RecruitmentWorkflow,
    record_recruitment_event,
)
from src.backend.tests.test_recruitment_models import make_application


def test_stale_version_returns_conflict(db_session, recruitment_org):
    application = make_application(db_session, recruitment_org, stage="INVITED", version=2)
    with pytest.raises(RecruitmentConflict, match="Stale version"):
        RecruitmentWorkflow(db_session).advance(
            application.id,
            RecruitmentCommand(action="START_ASSESSMENT", metadata={}),
            recruitment_org.owner,
            expected_version=1,
        )


def test_hr_hire_moves_to_owner_queue_and_writes_audit(db_session, recruitment_org):
    application = make_application(db_session, recruitment_org, stage="HR_REVIEW_PENDING")

    updated = RecruitmentWorkflow(db_session).advance(
        application.id,
        RecruitmentCommand(action="HR_HIRE", metadata={"reason": "Strong evidence"}),
        recruitment_org.selected_manager,
        expected_version=application.version,
    )
    assert updated.stage == models.RecruitmentStageEnum.OWNER_APPROVAL_PENDING
    assert updated.version == 2
    assert (
        db_session.query(models.RecruitmentAuditEvent)
        .filter_by(application_id=application.id, action="HR_HIRE")
        .count()
        == 1
    )


def test_invalid_transition_returns_conflict_and_creates_no_audit(db_session, recruitment_org):
    application = make_application(db_session, recruitment_org, stage="INVITED")
    initial_audit_count = db_session.query(models.RecruitmentAuditEvent).count()

    with pytest.raises(RecruitmentConflict, match="Invalid action"):
        RecruitmentWorkflow(db_session).advance(
            application.id,
            RecruitmentCommand(action="COMPLETE_ONBOARDING", metadata={}),
            recruitment_org.owner,
            expected_version=application.version,
        )

    assert db_session.query(models.RecruitmentAuditEvent).count() == initial_audit_count


def test_owner_approve_and_onboarding_lifecycle(db_session, recruitment_org):
    application = make_application(db_session, recruitment_org, stage="OWNER_APPROVAL_PENDING")
    workflow = RecruitmentWorkflow(db_session)

    # 1. Owner approves
    app = workflow.advance(
        application.id,
        RecruitmentCommand(action="OWNER_APPROVE", metadata={"notes": "Offer approved"}),
        recruitment_org.owner,
        expected_version=application.version,
    )
    assert app.stage == models.RecruitmentStageEnum.APPROVED

    # 2. Issue onboarding
    app = workflow.advance(
        application.id,
        RecruitmentCommand(action="ISSUE_ONBOARDING", metadata={}),
        recruitment_org.owner,
        expected_version=app.version,
    )
    assert app.stage == models.RecruitmentStageEnum.ONBOARDING_INVITED

    # 3. Complete onboarding -> HIRED (Terminal stage)
    app = workflow.advance(
        application.id,
        RecruitmentCommand(action="COMPLETE_ONBOARDING", metadata={}),
        recruitment_org.owner,
        expected_version=app.version,
    )
    assert app.stage == models.RecruitmentStageEnum.HIRED
    assert app.terminal_at is not None


def test_terminal_stages_cannot_advance(db_session, recruitment_org):
    for terminal_stage in ("HIRED", "REJECTED", "WITHDRAWN", "EXPIRED", "CANCELLED"):
        application = make_application(db_session, recruitment_org, stage=terminal_stage)
        with pytest.raises(RecruitmentConflict, match="Cannot advance from terminal stage"):
            RecruitmentWorkflow(db_session).advance(
                application.id,
                RecruitmentCommand(action="START_ASSESSMENT", metadata={}),
                recruitment_org.owner,
                expected_version=application.version,
            )


def test_withdraw_action_moves_to_withdrawn(db_session, recruitment_org):
    application = make_application(db_session, recruitment_org, stage="INTERVIEW_SCHEDULED")
    app = RecruitmentWorkflow(db_session).advance(
        application.id,
        RecruitmentCommand(action="WITHDRAW", metadata={"reason": "Candidate accepted another offer"}),
        recruitment_org.owner,
        expected_version=application.version,
    )
    assert app.stage == models.RecruitmentStageEnum.WITHDRAWN
    assert app.terminal_at is not None


def test_record_recruitment_event_persists_without_stage_change(db_session, recruitment_org):
    application = make_application(db_session, recruitment_org, stage="INVITED")
    event = record_recruitment_event(
        db_session,
        application,
        action="NOTE_ADDED",
        actor_id=recruitment_org.owner.user_id,
        metadata={"note": "Reviewed portfolio"},
    )
    assert event.id is not None
    assert event.action == "NOTE_ADDED"
    assert event.previous_stage == "INVITED"
    assert event.new_stage == "INVITED"
