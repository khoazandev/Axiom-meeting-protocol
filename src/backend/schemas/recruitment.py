"""Pydantic schemas for recruitment pipeline."""

from datetime import datetime
from typing import Any, List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field

from src.backend.models import (
    AssessmentStatusEnum,
    HRDecisionEnum,
    InterviewStatusEnum,
    JobOpeningStatusEnum,
    OwnerDecisionEnum,
    RecruitmentStageEnum,
)


# ---------------------------------------------------------------------------
# Job Opening Schemas
# ---------------------------------------------------------------------------
class JobOpeningCreate(BaseModel):
    department_id: str
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    requirements: Optional[str] = None
    assigned_hr_member_id: Optional[str] = None
    requires_assessment: bool = False
    assessment_definition_id: Optional[str] = None
    competency_rubric_json: Optional[str] = None
    rubric_version: int = 1


class JobOpeningUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    requirements: Optional[str] = None
    status: Optional[JobOpeningStatusEnum] = None
    assigned_hr_member_id: Optional[str] = None
    requires_assessment: Optional[bool] = None
    assessment_definition_id: Optional[str] = None
    competency_rubric_json: Optional[str] = None
    rubric_version: Optional[int] = None


class JobOpeningResponse(BaseModel):
    id: str
    organization_id: str
    department_id: str
    title: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    status: JobOpeningStatusEnum
    created_by_id: str
    assigned_hr_member_id: Optional[str] = None
    requires_assessment: bool
    assessment_definition_id: Optional[str] = None
    competency_rubric_json: Optional[str] = None
    rubric_version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Candidate & Application Schemas
# ---------------------------------------------------------------------------
class CandidateResponse(BaseModel):
    id: str
    organization_id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    cv_url: Optional[str] = None
    notes: Optional[str] = None
    redacted_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplicationInviteCreate(BaseModel):
    opening_id: str
    candidate_email: EmailStr
    candidate_name: str = Field(..., min_length=1, max_length=150)
    candidate_phone: Optional[str] = None
    notes: Optional[str] = None
    assigned_hr_member_id: Optional[str] = None


class ApplicationInviteResponse(BaseModel):
    application_id: str
    candidate_id: str
    invitation_token: str
    delivery_status: str


class AssignAssessmentRequest(BaseModel):
    definition_id: str
    duration_minutes_override: Optional[int] = None


class ApplicationSummary(BaseModel):
    id: str
    organization_id: str
    opening_id: str
    opening_title: Optional[str] = None
    department_name: Optional[str] = None
    candidate_id: str
    candidate_name: str
    candidate_email: str
    assigned_hr_member_id: Optional[str] = None
    assigned_hr_name: Optional[str] = None
    stage: RecruitmentStageEnum
    version: int
    consent_given: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Assessment Schemas
# ---------------------------------------------------------------------------
class AssessmentDefinitionCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    duration_minutes: int = Field(60, ge=5, le=300)
    questions_json: str  # Serialized list of questions


class AssessmentDefinitionResponse(BaseModel):
    id: str
    organization_id: str
    title: str
    description: Optional[str] = None
    duration_minutes: int
    questions_json: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssessmentSubmit(BaseModel):
    answers_json: str  # Candidate's submitted answers


class AssessmentAttemptResponse(BaseModel):
    id: str
    application_id: str
    definition_snapshot_json: str
    status: AssessmentStatusEnum
    score: Optional[float] = None
    answers_json: Optional[str] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Interview Schemas
# ---------------------------------------------------------------------------
class InterviewScheduleCreate(BaseModel):
    scheduled_at: datetime
    interviewer_member_ids: List[str] = Field(default_factory=list)


class InterviewSessionResponse(BaseModel):
    id: str
    application_id: str
    meeting_id: str
    scheduled_at: datetime
    interviewer_member_ids_json: Optional[str] = None
    status: InterviewStatusEnum
    consent_recording: bool = False
    consent_transcription: bool = False
    consent_ai_evaluation: bool = False
    consented_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConsentUpdate(BaseModel):
    recording: bool = True
    transcription: bool = True
    ai_evaluation: bool = True


class GuestMeetingAccessResponse(BaseModel):
    token: str
    room_name: str
    livekit_url: str


# ---------------------------------------------------------------------------
# Evaluation, Review & Approval Schemas
# ---------------------------------------------------------------------------
class AIEvaluationResponse(BaseModel):
    id: str
    application_id: str
    rubric_version: int
    model_name: Optional[str] = None
    summary: Optional[str] = None
    scores_json: Optional[str] = None
    evidence_json: Optional[str] = None
    recommendation: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HRReviewCreate(BaseModel):
    decision: HRDecisionEnum
    reason: str = Field(..., min_length=5)
    ai_diff_reason: Optional[str] = None
    expected_version: Optional[int] = None


class HRReviewResponse(BaseModel):
    id: str
    application_id: str
    reviewer_member_id: str
    decision: HRDecisionEnum
    reason: str
    ai_diff_reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OwnerApprovalCreate(BaseModel):
    decision: OwnerDecisionEnum
    reason: Optional[str] = None
    expected_version: Optional[int] = None


class OwnerApprovalResponse(BaseModel):
    id: str
    application_id: str
    approver_user_id: str
    decision: OwnerDecisionEnum
    reason: Optional[str] = None
    onboarding_invitation_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Full Application Detail Schema
# ---------------------------------------------------------------------------
class ApplicationDetail(BaseModel):
    id: str
    organization_id: str
    opening_id: str
    candidate_id: str
    assigned_hr_member_id: Optional[str] = None
    stage: RecruitmentStageEnum
    version: int
    consent_given: bool
    consent_timestamp: Optional[datetime] = None
    terminal_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    opening: Optional[JobOpeningResponse] = None
    candidate: Optional[CandidateResponse] = None
    assessment_attempts: List[AssessmentAttemptResponse] = Field(default_factory=list)
    interview_sessions: List[InterviewSessionResponse] = Field(default_factory=list)
    ai_evaluations: List[AIEvaluationResponse] = Field(default_factory=list)
    hr_review: Optional[HRReviewResponse] = None
    owner_approval: Optional[OwnerApprovalResponse] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Policy Schemas
# ---------------------------------------------------------------------------
class RecruitmentPolicyResponse(BaseModel):
    id: str
    organization_id: str
    retention_days: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecruitmentPolicyUpdate(BaseModel):
    retention_days: int = Field(..., ge=30, le=730)


# ---------------------------------------------------------------------------
# Navigation & Management Schemas
# ---------------------------------------------------------------------------
class RecruitmentMeResponse(BaseModel):
    role: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    department_ids: List[str] = Field(default_factory=list)


class ReviewGrantUpdate(BaseModel):
    enabled: bool


class ReviewGrantResponse(BaseModel):
    member_id: str
    enabled: bool


class AssignHRUpdate(BaseModel):
    assigned_hr_member_id: Optional[str] = None


class IssueOnboardingRequest(BaseModel):
    idempotency_key: Optional[str] = None


class IssueOnboardingResponse(BaseModel):
    invitation_id: str
    application_id: str
    raw_token: str
    register_url: str
    status: str
