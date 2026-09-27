"""Recruitment workflow state machine with optimistic locking and audit logging."""

from dataclasses import dataclass, field
import datetime
from datetime import timezone
import json
from typing import Any, Dict, Optional
from sqlalchemy import update
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import ForbiddenException
from src.backend.models import RecruitmentStageEnum
from src.backend.services.recruitment_permissions import (
    assert_recruitment_reviewer,
    has_effective_permission,
)


class RecruitmentConflict(Exception):
    """Raised when an invalid transition is attempted or optimistic lock version mismatch occurs."""
    pass


@dataclass
class RecruitmentCommand:
    action: str
    metadata: Dict[str, Any] = field(default_factory=dict)


TERMINAL_STAGES = {
    RecruitmentStageEnum.HIRED,
    RecruitmentStageEnum.REJECTED,
    RecruitmentStageEnum.WITHDRAWN,
    RecruitmentStageEnum.EXPIRED,
    RecruitmentStageEnum.CANCELLED,
}

TRANSITIONS = {
    (RecruitmentStageEnum.INVITED, "START_ASSESSMENT"): RecruitmentStageEnum.ASSESSMENT_PENDING,
    (RecruitmentStageEnum.INVITED, "SCHEDULE_INTERVIEW"): RecruitmentStageEnum.INTERVIEW_SCHEDULED,
    (RecruitmentStageEnum.ASSESSMENT_PENDING, "SUBMIT_ASSESSMENT"): RecruitmentStageEnum.ASSESSMENT_SUBMITTED,
    (RecruitmentStageEnum.ASSESSMENT_SUBMITTED, "SCHEDULE_INTERVIEW"): RecruitmentStageEnum.INTERVIEW_SCHEDULED,
    (RecruitmentStageEnum.INTERVIEW_SCHEDULED, "COMPLETE_INTERVIEW"): RecruitmentStageEnum.INTERVIEW_COMPLETED,
    (RecruitmentStageEnum.INTERVIEW_COMPLETED, "QUEUE_HR_REVIEW"): RecruitmentStageEnum.HR_REVIEW_PENDING,
    (RecruitmentStageEnum.HR_REVIEW_PENDING, "HR_HIRE"): RecruitmentStageEnum.OWNER_APPROVAL_PENDING,
    (RecruitmentStageEnum.HR_REVIEW_PENDING, "HR_NO_HIRE"): RecruitmentStageEnum.REJECTED,
    (RecruitmentStageEnum.HR_REVIEW_PENDING, "REQUEST_ASSESSMENT"): RecruitmentStageEnum.ASSESSMENT_PENDING,
    (RecruitmentStageEnum.HR_REVIEW_PENDING, "REQUEST_INTERVIEW"): RecruitmentStageEnum.INTERVIEW_SCHEDULED,
    (RecruitmentStageEnum.OWNER_APPROVAL_PENDING, "OWNER_APPROVE"): RecruitmentStageEnum.APPROVED,
    (RecruitmentStageEnum.OWNER_APPROVAL_PENDING, "OWNER_REJECT"): RecruitmentStageEnum.REJECTED,
    (RecruitmentStageEnum.APPROVED, "ISSUE_ONBOARDING"): RecruitmentStageEnum.ONBOARDING_INVITED,
    (RecruitmentStageEnum.ONBOARDING_INVITED, "COMPLETE_ONBOARDING"): RecruitmentStageEnum.HIRED,
}


def record_recruitment_event(
    db: Session,
    application: models.RecruitmentApplication,
    action: str,
    actor_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> models.RecruitmentAuditEvent:
    """Record an audit event that does not change the stage of the application."""
    now = datetime.datetime.now(timezone.utc)
    stage_str = (
        application.stage.value if hasattr(application.stage, "value") else str(application.stage)
    )
    event = models.RecruitmentAuditEvent(
        organization_id=application.organization_id,
        application_id=application.id,
        action=action,
        actor_id=actor_id,
        previous_stage=stage_str,
        new_stage=stage_str,
        metadata_json=json.dumps(metadata, default=str) if metadata else None,
        created_at=now,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


class RecruitmentWorkflow:
    def __init__(self, db: Session):
        self.db = db

    def advance(
        self,
        application_id: str,
        command: RecruitmentCommand,
        actor_member: Optional[models.OrganizationMember] = None,
        expected_version: Optional[int] = None,
    ) -> models.RecruitmentApplication:
        application = (
            self.db.query(models.RecruitmentApplication)
            .filter_by(id=application_id)
            .first()
        )
        if not application:
            raise RecruitmentConflict("Application not found")

        # 1. Optimistic locking check
        if expected_version is not None and application.version != expected_version:
            raise RecruitmentConflict(
                f"Stale version: expected {expected_version}, found {application.version}"
            )

        # 2. Authorization check
        action = command.action
        if action in ("HR_HIRE", "HR_NO_HIRE", "REQUEST_ASSESSMENT", "REQUEST_INTERVIEW"):
            if actor_member:
                assert_recruitment_reviewer(self.db, actor_member, application)
        elif action in ("OWNER_APPROVE", "OWNER_REJECT", "CANCEL"):
            if actor_member:
                is_owner = (
                    getattr(actor_member.role, "name", None) == "OWNER"
                    or (
                        actor_member.organization
                        and actor_member.organization.created_by_id == actor_member.user_id
                    )
                )
                has_perm = has_effective_permission(
                    self.db, actor_member, "recruitment.approve"
                ) or has_effective_permission(self.db, actor_member, "recruitment.manage")
                if not (is_owner or has_perm):
                    raise ForbiddenException("Action requires Owner or recruitment.approve permission")

        # 3. Transition resolution
        current_stage = application.stage
        if current_stage in TERMINAL_STAGES:
            raise RecruitmentConflict(f"Cannot advance from terminal stage {current_stage}")

        target_stage: Optional[RecruitmentStageEnum] = None

        if action == "WITHDRAW":
            target_stage = RecruitmentStageEnum.WITHDRAWN
        elif action == "EXPIRE":
            if current_stage in (RecruitmentStageEnum.INVITED, RecruitmentStageEnum.ASSESSMENT_PENDING):
                target_stage = RecruitmentStageEnum.EXPIRED
            else:
                raise RecruitmentConflict(f"Cannot expire application in stage {current_stage}")
        elif action == "CANCEL":
            target_stage = RecruitmentStageEnum.CANCELLED
        else:
            target_stage = TRANSITIONS.get((current_stage, action))

        if not target_stage:
            raise RecruitmentConflict(
                f"Invalid action '{action}' for current stage '{current_stage}'"
            )

        now = datetime.datetime.now(timezone.utc)
        new_version = application.version + 1

        # 4. Atomic conditional update
        stmt = (
            update(models.RecruitmentApplication)
            .where(
                models.RecruitmentApplication.id == application.id,
                models.RecruitmentApplication.version == application.version,
            )
            .values(
                stage=target_stage,
                version=new_version,
                terminal_at=now if target_stage in TERMINAL_STAGES else None,
                updated_at=now,
            )
        )
        result = self.db.execute(stmt)
        if result.rowcount != 1:
            self.db.rollback()
            raise RecruitmentConflict("Optimistic locking conflict on application advance")

        # 5. Append audit event
        actor_id_val = None
        if actor_member:
            actor_id_val = getattr(actor_member, "user_id", str(actor_member))

        audit = models.RecruitmentAuditEvent(
            organization_id=application.organization_id,
            application_id=application.id,
            action=action,
            actor_id=actor_id_val,
            previous_stage=current_stage.value if hasattr(current_stage, "value") else str(current_stage),
            new_stage=target_stage.value if hasattr(target_stage, "value") else str(target_stage),
            metadata_json=json.dumps(command.metadata, default=str) if command.metadata else None,
            created_at=now,
        )
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(application)

        return application
