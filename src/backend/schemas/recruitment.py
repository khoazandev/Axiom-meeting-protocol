from __future__ import annotations
"""Pydantic schemas for recruitment pipeline."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
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
    salary_range: Optional[str] = None
    level: Optional[str] = None
    work_type: Optional[str] = None
    location: Optional[str] = None
    benefits: Optional[str] = None
    status: Optional[JobOpeningStatusEnum] = JobOpeningStatusEnum.ACTIVE
    assigned_hr_member_id: Optional[str] = None
    requires_assessment: bool = False
    assessment_definition_id: Optional[str] = None
    competency_rubric_json: Optional[str] = None
    rubric_version: int = 1


class JobOpeningUpdate(BaseModel):
    department_id: Optional[str] = None
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    level: Optional[str] = None
    work_type: Optional[str] = None
    location: Optional[str] = None
    benefits: Optional[str] = None
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
    salary_range: Optional[str] = None
    level: Optional[str] = None
    work_type: Optional[str] = None
    location: Optional[str] = None
    benefits: Optional[str] = None
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
    candidate_phone: Optional[str] = None
    candidate_cv_url: Optional[str] = None
    candidate_notes: Optional[str] = None
    assigned_hr_member_id: Optional[str] = None
    assigned_hr_name: Optional[str] = None
    stage: RecruitmentStageEnum
    version: int
    consent_given: bool
    created_at: datetime
    updated_at: datetime

    candidate: Optional[CandidateResponse] = None
    opening: Optional[JobOpeningResponse] = None
    assessment_attempts: List[AssessmentAttemptResponse] = Field(default_factory=list)
    interview_sessions: List[InterviewSessionResponse] = Field(default_factory=list)
    ai_evaluations: List[AIEvaluationResponse] = Field(default_factory=list)
    hr_review: Optional[HRReviewResponse] = None
    owner_approval: Optional[OwnerApprovalResponse] = None

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


class CVApprovalCreate(BaseModel):
    decision: Literal["APPROVE", "REJECT"]
    reason: Optional[str] = None
    expected_version: Optional[int] = None


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


# ---------------------------------------------------------------------------
# Candidate Portal & Public Openings Schemas
# ---------------------------------------------------------------------------
class PublicJobOpeningResponse(BaseModel):
    id: str
    organization_id: str
    organization_name: str
    organization_logo_url: Optional[str] = None
    organization_banner_url: Optional[str] = None
    organization_tagline: Optional[str] = None
    organization_description: Optional[str] = None
    organization_website: Optional[str] = None
    organization_size: Optional[str] = None
    organization_headquarters: Optional[str] = None
    organization_industry: Optional[str] = None
    department_id: str
    department_name: str
    department_description: Optional[str] = None
    department_icon: Optional[str] = None
    title: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    level: Optional[str] = None
    work_type: Optional[str] = None
    location: Optional[str] = None
    benefits: Optional[str] = None
    requires_assessment: bool = False
    created_at: datetime


class CandidateApplicationCreate(BaseModel):
    cv_url: Optional[str] = None
    cv_text: Optional[str] = None
    resume_id: Optional[str] = None
    cover_letter: Optional[str] = None
    phone: Optional[str] = None


class CandidateApplicationResponse(BaseModel):
    id: str
    organization_id: str
    organization_name: str
    organization_logo_url: Optional[str] = None
    opening_id: str
    opening_title: str
    department_name: Optional[str] = None
    stage: RecruitmentStageEnum
    requires_assessment: bool
    created_at: datetime
    updated_at: datetime
    assessment_status: Optional[str] = None
    assessment_score: Optional[float] = None
    assessment_attempt_id: Optional[str] = None
    interview_session_id: Optional[str] = None
    interview_meeting_id: Optional[str] = None
    interview_scheduled_at: Optional[datetime] = None
    interview_status: Optional[str] = None
    hr_decision: Optional[str] = None
    owner_decision: Optional[str] = None
    resume_id: Optional[str] = None
    cv_url: Optional[str] = None
    cv_text: Optional[str] = None
    ai_score: Optional[int] = None


class UserResumeCreate(BaseModel):
    title: str = Field(default="Bản CV chuyên nghiệp", min_length=2)
    template_id: str = "harvard"
    cv_data_json: str
    is_primary: bool = False
    ats_score: Optional[int] = None


class UserResumeUpdate(BaseModel):
    title: Optional[str] = None
    template_id: Optional[str] = None
    cv_data_json: Optional[str] = None
    is_primary: Optional[bool] = None
    ats_score: Optional[int] = None


class UserResumeResponse(BaseModel):
    id: str
    user_id: str
    title: str
    template_id: str
    cv_data_json: str
    file_url: Optional[str] = None
    is_primary: bool
    ats_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class CVKeywordMatch(BaseModel):
    keyword: str
    found: bool
    category: str  # "TECHNICAL", "SOFT_SKILL", "METRIC", "DOMAIN"


class CVReviewRequest(BaseModel):
    cv_text: str = Field(..., min_length=20)
    target_role: Optional[str] = None


class CVReviewResponse(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    ats_score: int = Field(..., ge=0, le=100)
    metrics_score: int = Field(..., ge=0, le=100)
    structure_score: int = Field(..., ge=0, le=100)
    target_role: Optional[str] = None
    summary_evaluation: str
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    keyword_matches: List[CVKeywordMatch]
    formatting_tips: List[str]


class CVMagicWriteRequest(BaseModel):
    text: str = Field(..., min_length=5)
    action_type: str = Field(default="professional")


class CVMagicWriteResponse(BaseModel):
    action_type: str
    original_text: str
    generated_options: List[str]


class PublicAssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: Optional[List[Dict[str, str]]] = None


class PublicAssistantChatResponse(BaseModel):
    reply: str


class PublicJobOpeningItem(BaseModel):
    id: str
    organization_id: str
    organization_name: str
    organization_logo_url: Optional[str] = None
    department_id: str
    department_name: Optional[str] = None
    department_description: Optional[str] = None
    department_icon: Optional[str] = None
    title: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    level: Optional[str] = None
    work_type: Optional[str] = None
    location: Optional[str] = None
    benefits: Optional[str] = None
    requires_assessment: bool = False
    created_at: str


class PublicCandidateApplyRequest(BaseModel):
    opening_id: str
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: Optional[str] = None
    current_title: Optional[str] = None
    years_of_experience: Optional[str] = None
    education_level: Optional[str] = None
    location: Optional[str] = None
    expected_salary: Optional[str] = None
    earliest_start_date: Optional[str] = None
    skills: Optional[List[str]] = None
    cv_text: Optional[str] = None
    cv_url: Optional[str] = None
    cover_letter: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None


class PublicCandidateApplyResponse(BaseModel):
    success: bool
    application_id: str
    tracking_code: str
    access_token: str
    stage: str
    requires_assessment: bool
    message: str


class PublicTrackRequest(BaseModel):
    email: EmailStr
    tracking_code: str


class PublicTrackResponse(BaseModel):
    application_id: str
    tracking_code: str
    stage: str
    opening_id: str
    opening_title: str
    department_name: Optional[str] = None
    organization_name: str
    organization_logo_url: Optional[str] = None
    applied_at: str
    requires_assessment: bool
    assessment_status: Optional[str] = None
    assessment_score: Optional[float] = None
    access_token: Optional[str] = None
    interview_scheduled_at: Optional[str] = None
    interview_meeting_id: Optional[str] = None
    interview_status: Optional[str] = None
    status_description: str


class MoveStageRequest(BaseModel):
    target_stage: str
    reason: Optional[str] = None
    expected_version: Optional[int] = None


ApplicationSummary.model_rebuild()



