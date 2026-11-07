import json
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from src.backend import models

TERMINAL_STAGES = {
    models.RecruitmentStageEnum.REJECTED,
    models.RecruitmentStageEnum.WITHDRAWN,
    models.RecruitmentStageEnum.EXPIRED,
    models.RecruitmentStageEnum.CANCELLED,
    models.RecruitmentStageEnum.HIRED,
    "REJECTED",
    "WITHDRAWN",
    "EXPIRED",
    "CANCELLED",
    "HIRED",
}


@dataclass
class RetentionResult:
    organization_id: str
    redacted_applications: int = 0
    deleted_segments: int = 0
    candidate_pii_cleared: int = 0


def purge_expired_recruitment_data(
    db: Session,
    organization_id: str,
    now: Optional[datetime] = None,
) -> RetentionResult:
    """
    Deterministically redacts candidate PII, answers, AI evidence quotes,
    and deletes meeting transcript segments for terminal recruitment applications
    older than the organization's retention policy.
    Maintains email hash, audit events, and decisions.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    # 1. Look up organization recruitment policy
    policy = (
        db.query(models.RecruitmentPolicy)
        .filter(models.RecruitmentPolicy.organization_id == organization_id)
        .first()
    )
    retention_days = policy.retention_days if policy else 180
    cutoff = now - timedelta(days=retention_days)

    # 2. Find applications in terminal stages for this org
    enum_terminal = [
        models.RecruitmentStageEnum.REJECTED,
        models.RecruitmentStageEnum.WITHDRAWN,
        models.RecruitmentStageEnum.EXPIRED,
        models.RecruitmentStageEnum.CANCELLED,
        models.RecruitmentStageEnum.HIRED,
    ]
    applications = (
        db.query(models.RecruitmentApplication)
        .filter(
            models.RecruitmentApplication.organization_id == organization_id,
            models.RecruitmentApplication.stage.in_(enum_terminal),
        )
        .all()
    )

    result = RetentionResult(organization_id=organization_id)

    for app in applications:
        # Determine terminal time
        terminal_time = app.terminal_at or app.updated_at or app.created_at
        if terminal_time and terminal_time.tzinfo is None:
            terminal_time = terminal_time.replace(tzinfo=timezone.utc)

        if not terminal_time or terminal_time >= cutoff:
            continue

        # Check if already redacted (idempotent rerun check)
        already_redacted = (
            db.query(models.RecruitmentAuditEvent)
            .filter_by(application_id=app.id, action="RETENTION_REDACTED")
            .first()
        )
        if already_redacted:
            continue

        # Process redaction for this application:
        # A. Assessment attempts: clear answers_json
        for attempt in app.assessment_attempts:
            attempt.answers_json = None

        # B. AI Evaluations: clear evidence quotes
        for eval_record in app.ai_evaluations:
            eval_record.evidence_json = None

        # C. Dedicated Meeting Transcript Segments
        for session in app.interview_sessions:
            if session.meeting_id:
                deleted = (
                    db.query(models.TranscriptSegment)
                    .filter(models.TranscriptSegment.meeting_id == session.meeting_id)
                    .delete(synchronize_session=False)
                )
                result.deleted_segments += deleted

        # D. Candidate PII redaction
        candidate = app.candidate
        if candidate and candidate.redacted_at is None:
            # Only redact candidate PII if no other active application in org
            other_active = (
                db.query(models.RecruitmentApplication)
                .filter(
                    models.RecruitmentApplication.candidate_id == candidate.id,
                    models.RecruitmentApplication.id != app.id,
                    models.RecruitmentApplication.stage.notin_(enum_terminal),
                )
                .count()
            )
            if other_active == 0:
                candidate.full_name = None
                candidate.email = None
                candidate.phone = None
                candidate.cv_url = None
                candidate.notes = None
                candidate.redacted_at = now
                result.candidate_pii_cleared += 1

        # E. Audit trail: Add RETENTION_REDACTED event
        stage_str = (
            app.stage.value if hasattr(app.stage, "value") else str(app.stage)
        )
        audit_event = models.RecruitmentAuditEvent(
            organization_id=organization_id,
            application_id=app.id,
            action="RETENTION_REDACTED",
            actor_id=None,
            previous_stage=stage_str,
            new_stage=stage_str,
            metadata_json=json.dumps({
                "retention_days": retention_days,
                "cutoff": cutoff.isoformat(),
                "redacted_at": now.isoformat(),
            }),
            created_at=now,
        )
        db.add(audit_event)
        result.redacted_applications += 1

    db.commit()
    return result
