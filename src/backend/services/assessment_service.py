"""Assessment service handling definitions, assignment snapshots, and submissions."""

from datetime import datetime, timedelta, timezone
import json
from typing import Optional
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import ConflictException, NotFoundException, ValidationException
from src.backend.models import (
    AssessmentAttempt,
    AssessmentDefinition,
    AssessmentStatusEnum,
    RecruitmentApplication,
    RecruitmentStageEnum,
)
from src.backend.schemas.recruitment import AssessmentDefinitionCreate
from src.backend.services.recruitment_workflow import RecruitmentCommand, RecruitmentWorkflow


class AssessmentService:
    def __init__(self, db: Session):
        self.db = db

    def create_definition(
        self, org_id: str, payload: AssessmentDefinitionCreate
    ) -> AssessmentDefinition:
        """Create a new versioned assessment definition."""
        definition = AssessmentDefinition(
            organization_id=org_id,
            title=payload.title,
            description=payload.description,
            duration_minutes=payload.duration_minutes,
            questions_json=payload.questions_json,
        )
        self.db.add(definition)
        self.db.commit()
        self.db.refresh(definition)
        return definition

    def assign_attempt(
        self,
        application_id: str,
        definition_id: str,
        actor_member: Optional[models.OrganizationMember] = None,
        duration_minutes_override: Optional[int] = None,
    ) -> AssessmentAttempt:
        """Assign an assessment definition to an application, creating an immutable snapshot."""
        application = (
            self.db.query(RecruitmentApplication)
            .filter_by(id=application_id)
            .first()
        )
        if not application:
            raise NotFoundException("Recruitment application")

        opening = application.opening
        if not opening or not opening.requires_assessment:
            raise ValidationException("Job opening does not require an assessment")

        definition = (
            self.db.query(AssessmentDefinition)
            .filter_by(id=definition_id, organization_id=application.organization_id)
            .first()
        )
        if not definition:
            raise NotFoundException("Assessment definition")

        # Check existing attempts
        existing = (
            self.db.query(AssessmentAttempt)
            .filter(
                AssessmentAttempt.application_id == application.id,
                AssessmentAttempt.status.in_([AssessmentStatusEnum.PENDING, AssessmentStatusEnum.SUBMITTED]),
            )
            .first()
        )
        if existing:
            raise ConflictException("An active or submitted assessment attempt already exists")

        now = datetime.now(timezone.utc)
        duration = duration_minutes_override or definition.duration_minutes
        expires_at = now + timedelta(minutes=duration)

        attempt = AssessmentAttempt(
            application_id=application.id,
            definition_id=definition.id,
            definition_snapshot_json=definition.questions_json,
            status=AssessmentStatusEnum.PENDING,
            expires_at=expires_at,
            created_at=now,
        )
        self.db.add(attempt)

        if application.stage == RecruitmentStageEnum.INVITED:
            workflow = RecruitmentWorkflow(self.db)
            workflow.advance(
                application.id,
                RecruitmentCommand(
                    action="START_ASSESSMENT",
                    metadata={"definition_id": definition.id, "attempt_id": attempt.id},
                ),
                actor_member=actor_member,
                expected_version=application.version,
            )

        self.db.commit()
        self.db.refresh(attempt)
        return attempt

    def submit_attempt(
        self, application_id: str, answers_json: str
    ) -> AssessmentAttempt:
        """Validate answers against snapshot, stamp submission, and advance recruitment stage."""
        application = (
            self.db.query(RecruitmentApplication)
            .filter_by(id=application_id)
            .first()
        )
        if not application:
            raise NotFoundException("Recruitment application")

        attempt = (
            self.db.query(AssessmentAttempt)
            .filter_by(application_id=application.id)
            .order_by(AssessmentAttempt.created_at.desc())
            .first()
        )
        if not attempt:
            raise NotFoundException("Assessment attempt")

        if attempt.status != AssessmentStatusEnum.PENDING:
            raise ConflictException(f"Assessment cannot be submitted: status is {attempt.status}")

        now = datetime.now(timezone.utc)
        expires_at = attempt.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            attempt.status = AssessmentStatusEnum.EXPIRED
            self.db.commit()
            raise ConflictException("Assessment attempt has expired")

        # Validate answers against snapshot questions if both are parseable JSON
        try:
            questions = json.loads(attempt.definition_snapshot_json)
            answers = json.loads(answers_json)
            if isinstance(questions, list) and isinstance(answers, dict):
                for q in questions:
                    if isinstance(q, dict) and q.get("required", False):
                        q_id = q.get("id")
                        if q_id and q_id not in answers:
                            raise ValidationException(f"Missing required question answer: {q_id}")
        except json.JSONDecodeError:
            pass

        attempt.answers_json = answers_json
        attempt.status = AssessmentStatusEnum.SUBMITTED
        attempt.submitted_at = now

        workflow = RecruitmentWorkflow(self.db)
        workflow.advance(
            application.id,
            RecruitmentCommand(
                action="SUBMIT_ASSESSMENT",
                metadata={"attempt_id": attempt.id},
            ),
            expected_version=application.version,
        )

        self.db.commit()
        self.db.refresh(attempt)
        return attempt
