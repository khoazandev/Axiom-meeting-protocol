"""Recruitment interview scheduling, candidate consent, guest access, and completion service."""

from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.config import get_settings
from src.backend.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from src.backend.models import (
    InterviewSession,
    InterviewStatusEnum,
    Meeting,
    MeetingMember,
    MeetingMemberRoleEnum,
    MeetingMemberStatusEnum,
    MeetingStatusEnum,
    OrganizationMember,
    RecruitmentApplication,
    RecruitmentStageEnum,
)
from src.backend.services.recruitment_workflow import RecruitmentCommand, RecruitmentWorkflow

logger = logging.getLogger(__name__)


class InterviewService:
    def __init__(self, db: Session):
        self.db = db

    def schedule(
        self,
        application_id: str,
        scheduled_at: datetime,
        interviewer_member_ids: List[str],
        actor_member: OrganizationMember,
    ) -> InterviewSession:
        """Schedule a recruitment interview linked to a dedicated meeting."""
        application = (
            self.db.query(RecruitmentApplication)
            .filter_by(id=application_id)
            .first()
        )
        if not application:
            raise NotFoundException("Recruitment application")

        # Validate interviewers belong to org
        interviewer_members = (
            self.db.query(OrganizationMember)
            .filter(
                OrganizationMember.id.in_(interviewer_member_ids),
                OrganizationMember.organization_id == application.organization_id,
            )
            .all()
        )
        if len(interviewer_members) != len(interviewer_member_ids):
            raise ValidationException("All interviewers must be active members of the organization")

        # Create Meeting
        dept_id = application.opening.department_id if application.opening else None
        meeting = Meeting(
            organization_id=application.organization_id,
            department_id=dept_id,
            created_by_id=actor_member.user_id,
            title=f"Phỏng vấn ứng viên: {application.candidate.full_name} - {application.opening.title if application.opening else ''}",
            description=f"Recruitment interview for application {application.id}",
            scheduled_at=scheduled_at,
            meeting_type="RECRUITMENT_INTERVIEW",
            status=MeetingStatusEnum.SCHEDULED,
        )
        self.db.add(meeting)
        self.db.flush()

        # Add meeting members
        self.db.add(
            MeetingMember(
                meeting_id=meeting.id,
                user_id=actor_member.user_id,
                role=MeetingMemberRoleEnum.HOST,
                status=MeetingMemberStatusEnum.ACCEPTED,
            )
        )
        for m in interviewer_members:
            if m.user_id != actor_member.user_id:
                self.db.add(
                    MeetingMember(
                        meeting_id=meeting.id,
                        user_id=m.user_id,
                        role=MeetingMemberRoleEnum.PARTICIPANT,
                        status=MeetingMemberStatusEnum.INVITED,
                    )
                )

        # Create InterviewSession
        session = InterviewSession(
            application_id=application.id,
            meeting_id=meeting.id,
            scheduled_at=scheduled_at,
            interviewer_member_ids_json=json.dumps(interviewer_member_ids),
            status=InterviewStatusEnum.SCHEDULED,
        )
        self.db.add(session)

        # Advance workflow stage
        if application.stage in (
            RecruitmentStageEnum.INVITED,
            RecruitmentStageEnum.ASSESSMENT_SUBMITTED,
        ):
            workflow = RecruitmentWorkflow(self.db)
            workflow.advance(
                application.id,
                RecruitmentCommand(
                    action="SCHEDULE_INTERVIEW",
                    metadata={"meeting_id": meeting.id, "session_id": session.id},
                ),
                actor_member=actor_member,
                expected_version=application.version,
            )

        self.db.commit()
        self.db.refresh(session)
        return session

    def record_consent(
        self,
        interview_session_id: str,
        recording: bool = True,
        transcription: bool = True,
        ai_evaluation: bool = True,
    ) -> InterviewSession:
        """Record candidate consent for interview session."""
        session = (
            self.db.query(InterviewSession)
            .filter_by(id=interview_session_id)
            .first()
        )
        if not session:
            raise NotFoundException("Interview session")

        now = datetime.now(timezone.utc)
        session.consent_recording = recording
        session.consent_transcription = transcription
        session.consent_ai_evaluation = ai_evaluation
        session.consented_at = now

        application = session.application
        if application:
            application.consent_given = bool(recording or transcription or ai_evaluation)
            application.consent_timestamp = now

        self.db.commit()
        self.db.refresh(session)
        return session

    def assert_ai_consent(self, interview_session_id: str) -> None:
        """Assert that candidate gave recording and AI evaluation consent for the session."""
        session = (
            self.db.query(InterviewSession)
            .filter_by(id=interview_session_id)
            .first()
        )
        if not session:
            raise NotFoundException("Interview session")

        if not session.consent_recording:
            raise ForbiddenException("Candidate did not consent to recording")
        if not session.consent_ai_evaluation:
            raise ForbiddenException("Candidate did not consent to AI evaluation")

    def issue_guest_access(
        self, interview_session_id: str, candidate_id: str, candidate_name: str
    ) -> Dict[str, Any]:
        """Generate a scoped short-lived LiveKit token for the candidate."""
        session = (
            self.db.query(InterviewSession)
            .filter_by(id=interview_session_id)
            .first()
        )
        if not session:
            raise NotFoundException("Interview session")

        if session.application.candidate_id != candidate_id:
            raise ForbiddenException("Candidate is not associated with this interview session")

        settings = get_settings()
        from livekit import api as livekit_api

        token = livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        identity = f"candidate_{candidate_id}_{session.id}"
        token.with_identity(identity)
        token.with_name(candidate_name)
        token.with_metadata(
            json.dumps({"target_lang": "vi", "interview_session_id": session.id})
        )
        token.with_ttl(timedelta(hours=2))
        token.with_grants(
            livekit_api.VideoGrants(
                room_join=True,
                room=f"meeting-{session.meeting_id}",
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
                can_update_own_metadata=True,
            )
        )

        return {
            "token": token.to_jwt(),
            "room_name": f"meeting-{session.meeting_id}",
            "livekit_url": settings.livekit_url,
        }

    def complete_interview(
        self, interview_session_id: str, actor_member: Optional[OrganizationMember] = None
    ) -> InterviewSession:
        """Mark interview session completed and queue for HR review."""
        session = (
            self.db.query(InterviewSession)
            .filter_by(id=interview_session_id)
            .first()
        )
        if not session:
            raise NotFoundException("Interview session")

        now = datetime.now(timezone.utc)
        if session.meeting:
            session.meeting.status = MeetingStatusEnum.COMPLETED
            session.meeting.ended_at = now

        session.status = InterviewStatusEnum.COMPLETED
        session.completed_at = now

        workflow = RecruitmentWorkflow(self.db)
        # Advance 1: COMPLETE_INTERVIEW
        application = workflow.advance(
            session.application_id,
            RecruitmentCommand(action="COMPLETE_INTERVIEW", metadata={"session_id": session.id}),
            actor_member=actor_member,
            expected_version=session.application.version,
        )
        # Advance 2: QUEUE_HR_REVIEW
        workflow.advance(
            application.id,
            RecruitmentCommand(action="QUEUE_HR_REVIEW", metadata={"session_id": session.id}),
            actor_member=actor_member,
            expected_version=application.version,
        )

        self.db.commit()
        self.db.refresh(session)
        return session
