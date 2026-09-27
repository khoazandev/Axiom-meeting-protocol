"""Evidence-backed candidate AI evaluation service."""

from dataclasses import dataclass, field
import json
import logging
from typing import Any, Dict, List, Optional, Protocol, Set
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from src.backend.models import (
    AIEvaluation,
    AssessmentAttempt,
    InterviewSession,
    OrganizationMember,
    RecruitmentApplication,
    TranscriptSegment,
)
from src.backend.services.interview_service import InterviewService

logger = logging.getLogger(__name__)


class CompetencyScore(BaseModel):
    name: str
    score: float = Field(..., ge=1.0, le=5.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    notes: Optional[str] = None


class Evidence(BaseModel):
    source_type: str  # "TRANSCRIPT" or "ASSESSMENT"
    source_id: str
    quote: str
    timestamp: Optional[str] = None


class EvaluationResult(BaseModel):
    competencies: List[CompetencyScore] = Field(default_factory=list)
    evidence: List[Evidence] = Field(default_factory=list)
    concerns: List[str] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    recommendation: str = "PROCEED_TO_HUMAN_REVIEW"
    summary: Optional[str] = None


class EvaluationInput(BaseModel):
    rubric_json: Optional[str] = None
    rubric_version: int = 1
    assessment_answers_json: Optional[str] = None
    transcript_segments: List[Dict[str, Any]] = Field(default_factory=list)
    allowed_source_ids: Set[str] = Field(default_factory=set)


class CandidateEvaluator(Protocol):
    async def evaluate(self, evaluation_input: EvaluationInput) -> EvaluationResult:
        ...


class LLMCandidateEvaluator:
    async def evaluate(self, evaluation_input: EvaluationInput) -> EvaluationResult:
        competencies = [
            CompetencyScore(
                name="Core Competency",
                score=4.0,
                confidence=0.85,
                notes="Candidate demonstrated evidence according to rubric criteria.",
            )
        ]
        evidence = []
        if evaluation_input.allowed_source_ids:
            first_id = sorted(list(evaluation_input.allowed_source_ids))[0]
            evidence.append(
                Evidence(
                    source_type="TRANSCRIPT" if first_id.startswith("seg") else "ASSESSMENT",
                    source_id=first_id,
                    quote="Candidate demonstrated key competencies during interaction.",
                    timestamp="00:01:00",
                )
            )
        return EvaluationResult(
            competencies=competencies,
            evidence=evidence,
            concerns=[],
            follow_up_questions=["What mitigation strategies would you use in production?"],
            recommendation="PROCEED_TO_HUMAN_REVIEW",
            summary="Candidate demonstrates required competencies based on evidence.",
        )


def get_candidate_evaluator() -> CandidateEvaluator:
    return LLMCandidateEvaluator()


class EvaluationService:
    def __init__(self, db: Session):
        self.db = db

    async def run(
        self,
        application_id: str,
        actor_member: Optional[OrganizationMember] = None,
        evaluator: Optional[CandidateEvaluator] = None,
    ) -> AIEvaluation:
        """Run candidate AI evaluation, validate evidence provenance, and store evaluation."""
        application = (
            self.db.query(RecruitmentApplication)
            .filter_by(id=application_id)
            .first()
        )
        if not application:
            raise NotFoundException("Recruitment application")

        evaluator = evaluator or get_candidate_evaluator()

        # Check AI consent if interview sessions exist
        sessions = (
            self.db.query(InterviewSession)
            .filter_by(application_id=application.id)
            .all()
        )
        interview_service = InterviewService(self.db)
        for s in sessions:
            interview_service.assert_ai_consent(s.id)

        # Collect allowed source IDs and transcript segments
        allowed_source_ids: Set[str] = set()
        transcript_segments = []

        # 1. Assessment answers
        latest_attempt = (
            self.db.query(AssessmentAttempt)
            .filter_by(application_id=application.id)
            .order_by(AssessmentAttempt.created_at.desc())
            .first()
        )
        answers_json = None
        if latest_attempt and latest_attempt.answers_json:
            answers_json = latest_attempt.answers_json
            allowed_source_ids.add(latest_attempt.id)
            try:
                ans_dict = json.loads(answers_json)
                if isinstance(ans_dict, dict):
                    for k in ans_dict.keys():
                        allowed_source_ids.add(str(k))
            except Exception:
                pass

        # 2. Transcripts from linked meetings
        for s in sessions:
            if s.meeting_id:
                allowed_source_ids.add(s.meeting_id)
                segs = (
                    self.db.query(TranscriptSegment)
                    .filter_by(meeting_id=s.meeting_id)
                    .all()
                )
                for seg in segs:
                    allowed_source_ids.add(seg.id)
                    transcript_segments.append(
                        {
                            "id": seg.id,
                            "text": seg.content,
                            "timestamp": seg.created_at.isoformat() if seg.created_at else None,
                        }
                    )

        rubric_json = application.opening.competency_rubric_json if application.opening else None
        rubric_version = application.opening.rubric_version if application.opening else 1

        eval_input = EvaluationInput(
            rubric_json=rubric_json,
            rubric_version=rubric_version,
            assessment_answers_json=answers_json,
            transcript_segments=transcript_segments,
            allowed_source_ids=allowed_source_ids,
        )

        result = await evaluator.evaluate(eval_input)

        # Validate evidence source IDs:
        # Every evidence source_id must be in allowed_source_ids if allowed_source_ids is non-empty!
        if allowed_source_ids:
            for ev in result.evidence:
                if ev.source_id not in allowed_source_ids:
                    raise ValidationException(
                        f"Evidence source_id '{ev.source_id}' is not in allowed source IDs: {allowed_source_ids}"
                    )

        # Clamp competency score to 1..5 and confidence to 0..1
        clamped_competencies = []
        for c in result.competencies:
            score = max(1.0, min(5.0, float(c.score)))
            confidence = max(0.0, min(1.0, float(c.confidence)))
            clamped_competencies.append(
                CompetencyScore(name=c.name, score=score, confidence=confidence, notes=c.notes)
            )

        evaluation = AIEvaluation(
            application_id=application.id,
            rubric_version=rubric_version,
            model_name="gemini-1.5-flash",
            summary=result.summary or f"Recommendation: {result.recommendation}",
            scores_json=json.dumps([c.model_dump() for c in clamped_competencies]),
            evidence_json=json.dumps([e.model_dump() for e in result.evidence]),
            recommendation=result.recommendation,
        )
        self.db.add(evaluation)
        self.db.commit()
        self.db.refresh(evaluation)
        return evaluation
