from datetime import datetime, timezone
import json
import pytest
from src.backend import models
from src.backend.core.exceptions import ForbiddenException, ValidationException
from src.backend.main import app as fastapi_app
from src.backend.services.candidate_evaluator import (
    CompetencyScore,
    EvaluationInput,
    EvaluationResult,
    EvaluationService,
    Evidence,
    get_candidate_evaluator,
)
from src.backend.services.interview_service import InterviewService
from src.backend.tests.test_recruitment_models import make_application, make_opening


class FakeEvaluator:
    def __init__(self, source_id="seg-1", score=4.0, confidence=0.82):
        self.source_id = source_id
        self.score = score
        self.confidence = confidence

    async def evaluate(self, evaluation_input: EvaluationInput) -> EvaluationResult:
        return EvaluationResult(
            competencies=[CompetencyScore(name="Communication", score=self.score, confidence=self.confidence)],
            evidence=[
                Evidence(
                    source_type="TRANSCRIPT",
                    source_id=self.source_id,
                    quote="I validated the rollout",
                    timestamp="00:04:12",
                )
            ],
            concerns=[],
            follow_up_questions=["How would you measure rollback risk?"],
            recommendation="PROCEED_TO_HUMAN_REVIEW",
            summary="Candidate communicated effectively during rollout discussion.",
        )


@pytest.mark.anyio
async def test_candidate_evaluator_persists_and_preserves_stage_without_auto_decision(recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org, stage="INTERVIEW_COMPLETED", version=2)

    # Add meeting with a transcript segment matching seg-1
    meeting = models.Meeting(
        organization_id=recruitment_org.organization.id,
        created_by_id=recruitment_org.owner.user_id,
        title="Interview Meeting",
        meeting_type="RECRUITMENT_INTERVIEW",
    )
    db.add(meeting)
    db.flush()

    segment = models.TranscriptSegment(
        id="seg-1",
        meeting_id=meeting.id,
        speaker_id=None,
        content="I validated the rollout with monitoring alerts.",
        sequence=1,
        start_time="00:00:01",
        end_time="00:00:05",
    )
    db.add(segment)

    session = models.InterviewSession(
        application_id=app.id,
        meeting_id=meeting.id,
        scheduled_at=datetime.now(timezone.utc),
        status=models.InterviewStatusEnum.COMPLETED,
        consent_recording=True,
        consent_ai_evaluation=True,
    )
    db.add(session)
    db.commit()

    service = EvaluationService(db)
    evaluation = await service.run(app.id, actor_member=recruitment_org.owner, evaluator=FakeEvaluator("seg-1"))

    assert evaluation is not None
    assert evaluation.application_id == app.id
    assert evaluation.rubric_version == app.opening.rubric_version
    assert "seg-1" in evaluation.evidence_json
    assert evaluation.recommendation == "PROCEED_TO_HUMAN_REVIEW"

    # Invariant checks:
    # 1. Stage must not be changed
    db.refresh(app)
    assert app.stage == models.RecruitmentStageEnum.INTERVIEW_COMPLETED
    assert app.version == 2

    # 2. No HRReview must be automatically created
    hr_review = db.query(models.HRReview).filter_by(application_id=app.id).first()
    assert hr_review is None


@pytest.mark.anyio
async def test_evidence_source_id_validation_rejects_hallucinated_sources(recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org, stage="INTERVIEW_COMPLETED")

    meeting = models.Meeting(
        organization_id=recruitment_org.organization.id,
        created_by_id=recruitment_org.owner.user_id,
        title="Interview Meeting",
        meeting_type="RECRUITMENT_INTERVIEW",
    )
    db.add(meeting)
    db.flush()

    segment = models.TranscriptSegment(
        id="seg-real-123",
        meeting_id=meeting.id,
        content="Real verified content.",
        sequence=1,
        start_time="00:00:01",
        end_time="00:00:05",
    )
    db.add(segment)

    session = models.InterviewSession(
        application_id=app.id,
        meeting_id=meeting.id,
        scheduled_at=datetime.now(timezone.utc),
        consent_recording=True,
        consent_ai_evaluation=True,
    )
    db.add(session)
    db.commit()

    # Evaluator hallucinates a source_id not present in allowed sources
    service = EvaluationService(db)
    with pytest.raises(ValidationException):
        await service.run(app.id, evaluator=FakeEvaluator("seg-fake-hallucination"))


@pytest.mark.anyio
async def test_evaluation_blocked_without_candidate_consent(recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org)

    session = models.InterviewSession(
        application_id=app.id,
        meeting_id="some-meeting-id",
        scheduled_at=datetime.now(timezone.utc),
        consent_recording=False,
        consent_ai_evaluation=False,
    )
    db.add(session)
    db.commit()

    service = EvaluationService(db)
    with pytest.raises(ForbiddenException):
        await service.run(app.id, evaluator=FakeEvaluator())


def test_ai_evaluation_api_endpoint_with_dependency_override(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org)

    # Override get_candidate_evaluator
    fastapi_app.dependency_overrides[get_candidate_evaluator] = lambda: FakeEvaluator(source_id=app.id)

    owner_headers = auth_as(recruitment_org.owner_user)
    try:
        res = client.post(
            f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/ai-evaluations",
            headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["application_id"] == app.id
        assert data["recommendation"] == "PROCEED_TO_HUMAN_REVIEW"
    finally:
        fastapi_app.dependency_overrides.pop(get_candidate_evaluator, None)
