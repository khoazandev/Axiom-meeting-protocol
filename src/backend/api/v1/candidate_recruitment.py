"""Candidate portal API endpoints."""

import datetime
from datetime import timezone
import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple
from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from src.backend import models
from src.backend.api import deps
from src.backend.core.exceptions import (
    AuthenticationException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from src.backend.core.security import decode_token, hash_recruitment_token
from src.backend.database import get_db
from src.backend.models import (
    AssessmentAttempt,
    AssessmentDefinition,
    AssessmentStatusEnum,
    Candidate,
    Department,
    InterviewSession,
    JobOpening,
    JobOpeningStatusEnum,
    Organization,
    RecruitmentApplication,
    RecruitmentInvitation,
    RecruitmentStageEnum,
    User,
    UserResume,
)
from src.backend.schemas.recruitment import (
    ApplicationDetail,
    AssessmentAttemptResponse,
    AssessmentSubmit,
    CVReviewRequest,
    CVReviewResponse,
    CVMagicWriteRequest,
    CVMagicWriteResponse,
    CandidateApplicationCreate,
    CandidateApplicationResponse,
    ConsentUpdate,
    GuestMeetingAccessResponse,
    InterviewSessionResponse,
    PublicJobOpeningResponse,
    UserResumeCreate,
    UserResumeResponse,
    UserResumeUpdate,
    PublicAssistantChatRequest,
    PublicAssistantChatResponse,
)
from src.backend.services.assessment_service import AssessmentService
from src.backend.services.candidate_auth import (
    exchange_invitation_token,
    generate_invitation_token,
    get_current_candidate_application,
)
from src.backend.services.cv_reviewer import review_cv, review_cv_async, magic_write_cv_text
from src.backend.services.interview_service import InterviewService
from src.backend.services.recruitment_workflow import RecruitmentCommand, RecruitmentWorkflow

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/recruitment",
    tags=["candidate-recruitment"],
)


@router.post("/invitations/{token}/session")
def exchange_candidate_token(
    token: str,
    db: Session = Depends(get_db),
):
    """Exchange raw invitation token for a 30-minute candidate JWT access token."""
    jwt_token, application = exchange_invitation_token(db, token)
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "application_id": application.id,
        "candidate_id": application.candidate_id,
    }


@router.get("/applications/me", response_model=ApplicationDetail)
@router.get("/candidate/me", response_model=ApplicationDetail)
def get_candidate_application(
    app: RecruitmentApplication = Depends(get_current_candidate_application),
):
    """Retrieve application status and details for the authenticated candidate."""
    return app


@router.get("/applications/me/assessment", response_model=AssessmentAttemptResponse)
def get_candidate_assessment(
    app: RecruitmentApplication = Depends(get_current_candidate_application),
    db: Session = Depends(get_db),
):
    """Retrieve current assessment attempt for candidate."""
    attempt = (
        db.query(AssessmentAttempt)
        .filter_by(application_id=app.id)
        .order_by(AssessmentAttempt.created_at.desc())
        .first()
    )
    if not attempt:
        raise NotFoundException("Assessment attempt")
    return attempt


@router.post("/applications/me/assessment/submit", response_model=AssessmentAttemptResponse)
def submit_candidate_assessment(
    payload: AssessmentSubmit,
    app: RecruitmentApplication = Depends(get_current_candidate_application),
    db: Session = Depends(get_db),
):
    """Submit candidate answers and complete assessment."""
    service = AssessmentService(db)
    return service.submit_attempt(app.id, payload.answers_json)


@router.post("/applications/me/withdraw")
def withdraw_candidate_application(
    app: RecruitmentApplication = Depends(get_current_candidate_application),
    db: Session = Depends(get_db),
):
    """Allow candidate to withdraw their application."""
    workflow = RecruitmentWorkflow(db)
    workflow.advance(app.id, RecruitmentCommand("WITHDRAW"))
    return {"message": "Application successfully withdrawn"}


@router.post("/interviews/{interview_id}/consent", response_model=InterviewSessionResponse)
def record_candidate_interview_consent(
    interview_id: str,
    payload: ConsentUpdate,
    app: RecruitmentApplication = Depends(get_current_candidate_application),
    db: Session = Depends(get_db),
):
    """Record candidate explicit consent for recording, transcription, and AI evaluation."""
    service = InterviewService(db)
    return service.record_consent(
        interview_session_id=interview_id,
        recording=payload.recording,
        transcription=payload.transcription,
        ai_evaluation=payload.ai_evaluation,
    )


@router.post("/interviews/{interview_id}/guest-access", response_model=GuestMeetingAccessResponse)
def get_candidate_interview_guest_access(
    interview_id: str,
    app: RecruitmentApplication = Depends(get_current_candidate_application),
    db: Session = Depends(get_db),
):
    """Generate scoped LiveKit guest access token for candidate interview room."""
    service = InterviewService(db)
    return service.issue_guest_access(
        interview_session_id=interview_id,
        candidate_id=app.candidate_id,
        candidate_name=app.candidate.full_name if app.candidate else "Candidate",
    )


# ---------------------------------------------------------------------------
# Public Openings & Candidate Portal Endpoints
# ---------------------------------------------------------------------------
@router.get("/public/openings", response_model=List[PublicJobOpeningResponse])
def list_public_job_openings(
    q: Optional[str] = Query(None, description="Search keyword for job title or requirements"),
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    db: Session = Depends(get_db),
):
    """List all active public job openings across companies for job seekers."""
    query = (
        db.query(JobOpening)
        .filter(JobOpening.status == JobOpeningStatusEnum.ACTIVE)
    )

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            (JobOpening.title.ilike(term))
            | (JobOpening.description.ilike(term))
            | (JobOpening.requirements.ilike(term))
        )
    if department_id:
        query = query.filter(JobOpening.department_id == department_id)
    if organization_id:
        query = query.filter(JobOpening.organization_id == organization_id)

    openings = query.order_by(JobOpening.created_at.desc()).all()

    results: List[PublicJobOpeningResponse] = []
    for op in openings:
        org = op.organization
        org_name = org.name if org else "Công ty đối tác"
        dept_name = op.department.name if op.department else "Toàn công ty"
        results.append(
            PublicJobOpeningResponse(
                id=op.id,
                organization_id=op.organization_id,
                organization_name=org_name,
                organization_logo_url=getattr(org, "logo_url", None),
                organization_banner_url=getattr(org, "banner_url", None),
                organization_tagline=getattr(org, "tagline", None),
                organization_description=getattr(org, "description", None),
                organization_website=getattr(org, "website", None),
                organization_size=getattr(org, "size", None),
                organization_headquarters=getattr(org, "headquarters", None),
                organization_industry=getattr(org, "industry", None),
                department_id=op.department_id,
                department_name=dept_name,
                title=op.title,
                description=op.description,
                requirements=op.requirements,
                salary_range=getattr(op, "salary_range", None),
                level=getattr(op, "level", None),
                work_type=getattr(op, "work_type", None),
                location=getattr(op, "location", None),
                benefits=getattr(op, "benefits", None),
                requires_assessment=op.requires_assessment,
                created_at=op.created_at,
            )
        )
    return results


@router.post("/public/openings/{opening_id}/apply", response_model=CandidateApplicationResponse)
def apply_to_job_opening(
    opening_id: str,
    payload: CandidateApplicationCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Authenticated candidate submits their CV and application to an active job opening."""
    opening = db.query(JobOpening).filter_by(id=opening_id).first()
    if not opening or opening.status != JobOpeningStatusEnum.ACTIVE:
        raise NotFoundException("Vị trí tuyển dụng không tồn tại hoặc đã tạm dừng nhận hồ sơ.")

    # Find or create Candidate record in the target organization
    candidate = (
        db.query(Candidate)
        .filter(
            Candidate.organization_id == opening.organization_id,
            Candidate.email == current_user.email,
        )
        .first()
    )
    if not candidate:
        resolved_cv = payload.cv_url or (f"resume://{payload.resume_id}" if payload.resume_id else None)
        candidate = Candidate(
            organization_id=opening.organization_id,
            email=current_user.email,
            full_name=current_user.full_name,
            phone=payload.phone or current_user.phone,
            cv_url=resolved_cv,
            notes=payload.cover_letter,
        )
        db.add(candidate)
        db.flush()
    else:
        if payload.cv_url:
            candidate.cv_url = payload.cv_url
        elif payload.resume_id:
            candidate.cv_url = f"resume://{payload.resume_id}"
        if payload.cover_letter:
            candidate.notes = payload.cover_letter
        if payload.phone:
            candidate.phone = payload.phone

    # Check duplicate application for the same opening
    candidate_ids = [
        c.id
        for c in db.query(Candidate)
        .filter(Candidate.email == current_user.email)
        .all()
    ]
    if candidate.id not in candidate_ids:
        candidate_ids.append(candidate.id)

    existing_app = (
        db.query(RecruitmentApplication)
        .filter(
            RecruitmentApplication.opening_id == opening.id,
            RecruitmentApplication.candidate_id.in_(candidate_ids),
        )
        .first()
    )
    if existing_app:
        if existing_app.stage in (
            RecruitmentStageEnum.REJECTED,
            RecruitmentStageEnum.WITHDRAWN,
            RecruitmentStageEnum.CANCELLED,
            RecruitmentStageEnum.EXPIRED,
        ):
            # If past application ended, allow re-applying cleanly
            existing_app.stage = RecruitmentStageEnum.INVITED
            existing_app.consent_given = True
            existing_app.consent_timestamp = datetime.datetime.now(timezone.utc)
            existing_app.updated_at = datetime.datetime.now(timezone.utc)
            app = existing_app
        else:
            raise ConflictException(
                "Bạn đã nộp đơn ứng tuyển cho vị trí này và đang được xử lý. "
                "Vui lòng theo dõi tiến trình trong mục 'Hồ sơ đã nộp'."
            )
    else:
        # Create new recruitment application
        app = RecruitmentApplication(
            organization_id=opening.organization_id,
            opening_id=opening.id,
            candidate_id=candidate.id,
            assigned_hr_member_id=opening.assigned_hr_member_id,
            stage=RecruitmentStageEnum.INVITED,
            consent_given=True,
            consent_timestamp=datetime.datetime.now(timezone.utc),
        )
        db.add(app)
    db.flush()

    # If opening requires assessment, ensure attempt
    attempt = None
    if opening.requires_assessment:
        try:
            attempt = ensure_application_assessment_attempt(db, app)
        except Exception as e:
            logger.warning(f"Could not auto-assign assessment attempt: {e}")

    # Create or refresh recruitment invitation token
    raw_token = generate_invitation_token()
    inv = (
        db.query(RecruitmentInvitation)
        .filter(RecruitmentInvitation.application_id == app.id)
        .first()
    )
    if inv:
        inv.token_hash = hash_recruitment_token(raw_token)
        inv.expires_at = datetime.datetime.now(timezone.utc) + datetime.timedelta(days=30)
    else:
        inv = RecruitmentInvitation(
            organization_id=opening.organization_id,
            application_id=app.id,
            token_hash=hash_recruitment_token(raw_token),
            expires_at=datetime.datetime.now(timezone.utc) + datetime.timedelta(days=30),
        )
        db.add(inv)

    db.commit()
    db.refresh(app)

    return CandidateApplicationResponse(
        id=app.id,
        organization_id=app.organization_id,
        organization_name=app.organization.name if app.organization else "Công ty đối tác",
        opening_id=app.opening_id,
        opening_title=app.opening_title or opening.title,
        department_name=app.department_name,
        stage=app.stage,
        requires_assessment=opening.requires_assessment,
        created_at=app.created_at,
        updated_at=app.updated_at,
        assessment_status=attempt.status.value if attempt else None,
        assessment_score=attempt.score if attempt else None,
        assessment_attempt_id=attempt.id if attempt else None,
        interview_session_id=None,
        interview_meeting_id=None,
        interview_scheduled_at=None,
        interview_status=None,
        hr_decision=None,
        owner_decision=None,
        organization_logo_url=app.organization.logo_url if app.organization else None,
        resume_id=payload.resume_id,
        cv_url=payload.cv_url or (f"resume://{payload.resume_id}" if payload.resume_id else None),
        cv_text=payload.cv_text or payload.cover_letter,
    )


@router.get("/candidate/my-applications", response_model=List[CandidateApplicationResponse])
def list_candidate_applications(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all active and completed job applications submitted by the logged-in candidate."""
    candidates = db.query(Candidate).filter(Candidate.email == current_user.email).all()
    if not candidates:
        return []

    candidate_ids = [c.id for c in candidates]
    apps = (
        db.query(RecruitmentApplication)
        .filter(RecruitmentApplication.candidate_id.in_(candidate_ids))
        .order_by(RecruitmentApplication.created_at.desc())
        .all()
    )

    results: List[CandidateApplicationResponse] = []
    for app in apps:
        attempt = (
            db.query(AssessmentAttempt)
            .filter_by(application_id=app.id)
            .order_by(AssessmentAttempt.created_at.desc())
            .first()
        )
        interview = (
            db.query(InterviewSession)
            .filter_by(application_id=app.id)
            .order_by(InterviewSession.created_at.desc())
            .first()
        )

        cand_cv_url = app.candidate.cv_url if app.candidate else None
        resume_id = None
        if cand_cv_url and cand_cv_url.startswith("resume://"):
            resume_id = cand_cv_url[len("resume://"):]

        results.append(
            CandidateApplicationResponse(
                id=app.id,
                organization_id=app.organization_id,
                organization_name=app.organization.name if app.organization else "Công ty đối tác",
                organization_logo_url=app.organization.logo_url if app.organization else None,
                opening_id=app.opening_id,
                opening_title=app.opening_title or "Vị trí tuyển dụng",
                department_name=app.department_name,
                stage=app.stage,
                requires_assessment=app.opening.requires_assessment if app.opening else False,
                created_at=app.created_at,
                updated_at=app.updated_at,
                assessment_status=attempt.status.value if attempt else None,
                assessment_score=attempt.score if attempt else None,
                assessment_attempt_id=attempt.id if attempt else None,
                interview_session_id=interview.id if interview else None,
                interview_meeting_id=interview.meeting_id if interview else None,
                interview_scheduled_at=interview.scheduled_at if interview else None,
                interview_status=interview.status.value if interview else None,
                hr_decision=app.hr_review.decision.value if app.hr_review else None,
                owner_decision=app.owner_approval.decision.value if app.owner_approval else None,
                cv_url=cand_cv_url,
                cv_text=app.candidate.notes if app.candidate else None,
                resume_id=resume_id,
            )
        )
    return results


@router.post("/candidate/cv-review", response_model=CVReviewResponse)
async def evaluate_candidate_cv(
    payload: CVReviewRequest,
):
    """Analyze and review CV content against ATS criteria, metrics, and actionable tips."""
    return await review_cv_async(payload.cv_text, payload.target_role)


@router.post("/candidate/magic-write", response_model=CVMagicWriteResponse)
async def magic_write_cv_segment(
    payload: CVMagicWriteRequest,
):
    """Use AI LLM or intelligent rephrasing to enhance and rewrite CV content."""
    return await magic_write_cv_text(payload.text, payload.action_type)


auth_bearer = HTTPBearer(auto_error=False)


def _get_authenticated_candidate_or_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_bearer),
    db: Session = Depends(get_db),
) -> Tuple[Optional[User], Optional[RecruitmentApplication]]:
    """Authenticate either logged-in user or guest candidate from Authorization header."""
    if not credentials or not credentials.credentials:
        raise AuthenticationException("Vui lòng đăng nhập hoặc sử dụng mã truy cập dự thi hợp lệ.")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise AuthenticationException("Mã phiên làm việc không hợp lệ hoặc đã hết hạn.")

    token_type = payload.get("type")
    if token_type == "candidate":
        app_id = payload.get("application_id")
        candidate_id = payload.get("sub")
        app = (
            db.query(RecruitmentApplication)
            .filter(
                RecruitmentApplication.id == app_id,
                RecruitmentApplication.candidate_id == candidate_id,
            )
            .first()
        )
        if not app:
            raise AuthenticationException("Hồ sơ ứng tuyển không tồn tại hoặc đã bị thu hồi.")
        return None, app

    # Standard User JWT
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationException("Mã xác thực không hợp lệ.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthenticationException("Tài khoản người dùng không tồn tại.")
    return user, None


class AssessmentSubmitPayload(BaseModel):
    answers: Optional[Dict[str, Any]] = None
    answers_json: Optional[str] = None
    violations_count: Optional[int] = 0
    is_violation_terminated: Optional[bool] = False
    termination_reason: Optional[str] = None


def ensure_application_assessment_attempt(db: Session, app: RecruitmentApplication) -> Optional[AssessmentAttempt]:
    """Ensure an AssessmentAttempt exists for this application, creating one from opening rubric if needed."""
    # 1. Existing attempt
    attempt = (
        db.query(AssessmentAttempt)
        .filter(AssessmentAttempt.application_id == app.id)
        .order_by(AssessmentAttempt.created_at.desc())
        .first()
    )
    if attempt:
        if attempt.status != AssessmentStatusEnum.PENDING:
            attempt.status = AssessmentStatusEnum.PENDING
            attempt.score = None
            attempt.answers_json = None
            attempt.submitted_at = None
            attempt.started_at = datetime.datetime.now(timezone.utc)
            db.flush()
        return attempt

    opening = app.opening
    if not opening:
        return None

    # 2. Extract or build questions
    questions = []
    duration_minutes = 30
    title = f"Bài kiểm tra năng lực: {opening.title}"

    # Try from opening.competency_rubric_json
    if opening.competency_rubric_json:
        try:
            rubric = json.loads(opening.competency_rubric_json)
            if isinstance(rubric, dict):
                raw_qs = rubric.get("questions_snapshot") or rubric.get("questions") or []
                for idx, q in enumerate(raw_qs):
                    questions.append({
                        "id": q.get("id") or f"q_{idx + 1}",
                        "type": "TEXT" if q.get("type") == "ESSAY" else (q.get("type") or "TEXT"),
                        "text": q.get("text") or q.get("question") or "Câu hỏi đánh giá năng lực",
                        "options": q.get("options") or [],
                        "required": q.get("required", True),
                        "points": q.get("points", 10),
                    })
        except Exception as e:
            logger.warning(f"Error parsing competency_rubric_json: {e}")

    # Fallback to standard professional questions if still empty
    if not questions:
        questions = [
            {
                "id": "q1",
                "type": "MULTIPLE_CHOICE",
                "text": f"Đâu là kỹ năng hoặc phương pháp quan trọng nhất đối với vị trí {opening.title}?",
                "options": [
                    "A. Nắm vững kiến thức chuyên môn và thực hành chuẩn mực",
                    "B. Kỹ năng giao tiếp và phối hợp nhóm hiệu quả",
                    "C. Khả năng tư duy logic và giải quyết vấn đề độc lập",
                    "D. Cả 3 phương án trên đều quan trọng",
                ],
                "required": True,
                "points": 20,
            },
            {
                "id": "q2",
                "type": "TEXT",
                "text": "Hãy mô tả một thử thách hoặc dự án khó khăn nhất bạn từng hoàn thành trong chuyên môn của mình và giải pháp bạn đã áp dụng?",
                "options": [],
                "required": True,
                "points": 30,
            },
            {
                "id": "q3",
                "type": "TEXT",
                "text": "Bạn áp dụng quy trình kiểm thử, tối ưu hóa hiệu năng hoặc đảm bảo chất lượng công việc như thế nào?",
                "options": [],
                "required": True,
                "points": 25,
            },
            {
                "id": "q4",
                "type": "TEXT",
                "text": "Khi phát sinh xung đột về yêu cầu kỹ thuật hoặc tiến độ với thành viên khác, bạn sẽ xử lý tình huống ra sao?",
                "options": [],
                "required": True,
                "points": 25,
            },
        ]

    # 3. Create or reuse AssessmentDefinition
    definition = None
    if opening.assessment_definition_id:
        definition = db.query(AssessmentDefinition).filter_by(id=opening.assessment_definition_id).first()

    if not definition:
        definition = AssessmentDefinition(
            organization_id=app.organization_id,
            title=title,
            description=f"Bài đánh giá năng lực đầu vào vị trí {opening.title}",
            duration_minutes=duration_minutes,
            questions_json=json.dumps(questions, ensure_ascii=False),
        )
        db.add(definition)
        db.flush()
        opening.assessment_definition_id = definition.id

    # 4. Create AssessmentAttempt
    now = datetime.datetime.now(timezone.utc)
    attempt = AssessmentAttempt(
        application_id=app.id,
        definition_id=definition.id,
        definition_snapshot_json=definition.questions_json,
        status=AssessmentStatusEnum.PENDING,
        expires_at=now + datetime.timedelta(days=30),
        created_at=now,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("/candidate/assessments/{attempt_id}", response_model=AssessmentAttemptResponse)
def get_candidate_assessment_by_id(
    attempt_id: str,
    auth_ctx: Tuple[Optional[User], Optional[RecruitmentApplication]] = Depends(_get_authenticated_candidate_or_user),
    db: Session = Depends(get_db),
):
    """Retrieve assessment attempt details for candidate (supports both user and candidate token)."""
    user, candidate_app = auth_ctx

    # Look up attempt by attempt_id or application_id
    attempt = db.query(AssessmentAttempt).filter(AssessmentAttempt.id == attempt_id).first()
    if not attempt:
        attempt = (
            db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.application_id == attempt_id)
            .order_by(AssessmentAttempt.created_at.desc())
            .first()
        )

    # Self-healing auto-provision: if attempt doesn't exist yet, resolve application and provision it!
    if not attempt:
        target_app = db.query(RecruitmentApplication).filter(RecruitmentApplication.id == attempt_id).first()
        if not target_app and candidate_app:
            target_app = candidate_app
        if not target_app and user:
            target_app = (
                db.query(RecruitmentApplication)
                .join(Candidate, RecruitmentApplication.candidate_id == Candidate.id)
                .filter(func.lower(Candidate.email) == user.email.strip().lower())
                .order_by(RecruitmentApplication.created_at.desc())
                .first()
            )

        if target_app:
            attempt = ensure_application_assessment_attempt(db, target_app)

    if not attempt:
        raise NotFoundException("Không tìm thấy bài đánh giá tương ứng.")

    app = attempt.application
    if candidate_app:
        if app.id != candidate_app.id:
            raise ForbiddenException("Bạn không có quyền truy cập bài đánh giá này.")
    elif user:
        cand_email = (app.candidate.email or "").strip().lower() if app and app.candidate else ""
        curr_email = (user.email or "").strip().lower()
        if not cand_email or cand_email != curr_email:
            raise ForbiddenException("Bạn không có quyền truy cập bài đánh giá của hồ sơ này.")

    return attempt


@router.post("/candidate/assessments/{attempt_id}/submit", response_model=AssessmentAttemptResponse)
def submit_candidate_assessment_by_id(
    attempt_id: str,
    payload: AssessmentSubmitPayload,
    auth_ctx: Tuple[Optional[User], Optional[RecruitmentApplication]] = Depends(_get_authenticated_candidate_or_user),
    db: Session = Depends(get_db),
):
    """Submit candidate answers and complete assessment test."""
    user, candidate_app = auth_ctx

    attempt = db.query(AssessmentAttempt).filter(AssessmentAttempt.id == attempt_id).first()
    if not attempt:
        attempt = (
            db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.application_id == attempt_id)
            .order_by(AssessmentAttempt.created_at.desc())
            .first()
        )
    if not attempt:
        target_app = db.query(RecruitmentApplication).filter(RecruitmentApplication.id == attempt_id).first()
        if not target_app and candidate_app:
            target_app = candidate_app
        if target_app:
            attempt = ensure_application_assessment_attempt(db, target_app)

    if not attempt:
        raise NotFoundException("Không tìm thấy bài đánh giá tương ứng.")

    app = attempt.application
    if candidate_app:
        if app.id != candidate_app.id:
            raise ForbiddenException("Bạn không có quyền nộp bài đánh giá này.")
    elif user:
        cand_email = (app.candidate.email or "").strip().lower() if app and app.candidate else ""
        curr_email = (user.email or "").strip().lower()
        if not cand_email or cand_email != curr_email:
            raise ForbiddenException("Bạn không có quyền nộp bài đánh giá của hồ sơ này.")

    resolved_answers_json = payload.answers_json
    if not resolved_answers_json and payload.answers is not None:
        resolved_answers_json = json.dumps(payload.answers, ensure_ascii=False)
    if not resolved_answers_json:
        resolved_answers_json = "{}"

    service = AssessmentService(db)
    return service.submit_attempt(
        app.id,
        resolved_answers_json,
        is_violation_terminated=bool(payload.is_violation_terminated or (payload.violations_count or 0) >= 3),
        violations_count=payload.violations_count or 0,
        termination_reason=payload.termination_reason,
    )


@router.get("/applications/{application_id}/candidate-assessment", response_model=AssessmentAttemptResponse)
def get_assessment_for_logged_in_candidate(
    application_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve assessment questions for logged-in candidate without requiring separate token exchange."""
    app = db.query(RecruitmentApplication).filter_by(id=application_id).first()
    if not app:
        raise NotFoundException("Application not found")
    if not app.candidate or (app.candidate.email or "").strip().lower() != (current_user.email or "").strip().lower():
        raise ForbiddenException("Bạn không có quyền truy cập bài kiểm tra của hồ sơ này.")

    attempt = (
        db.query(AssessmentAttempt)
        .filter_by(application_id=app.id)
        .order_by(AssessmentAttempt.created_at.desc())
        .first()
    )
    if not attempt:
        attempt = ensure_application_assessment_attempt(db, app)
    if not attempt:
        raise NotFoundException("Chưa có bài kiểm tra nào được gán cho hồ sơ ứng tuyển này.")
    return attempt


@router.post("/applications/{application_id}/candidate-assessment/submit", response_model=AssessmentAttemptResponse)
def submit_assessment_for_logged_in_candidate(
    application_id: str,
    payload: AssessmentSubmit,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Submit candidate answers and complete assessment test."""
    app = db.query(RecruitmentApplication).filter_by(id=application_id).first()
    if not app:
        raise NotFoundException("Application not found")
    if not app.candidate or app.candidate.email != current_user.email:
        raise ForbiddenException("Bạn không có quyền nộp bài kiểm tra này.")

    service = AssessmentService(db)
    return service.submit_attempt(app.id, payload.answers_json)


# ---------------------------------------------------------------------------
# User Resumes Management (Persistent CV Vault for Candidates and Members)
# ---------------------------------------------------------------------------
@router.get("/candidate/resumes", response_model=List[UserResumeResponse])
def list_user_resumes(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """List all saved CV documents belonging to the authenticated user."""
    return (
        db.query(UserResume)
        .filter(UserResume.user_id == current_user.id)
        .order_by(UserResume.updated_at.desc())
        .all()
    )


@router.post("/candidate/resumes", response_model=UserResumeResponse, status_code=status.HTTP_201_CREATED)
def create_or_save_resume(
    payload: UserResumeCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Create and save a new CV document into user's career vault."""
    if payload.is_primary:
        db.query(UserResume).filter(UserResume.user_id == current_user.id).update({"is_primary": False})

    resume = UserResume(
        user_id=current_user.id,
        title=payload.title,
        template_id=payload.template_id,
        cv_data_json=payload.cv_data_json,
        is_primary=payload.is_primary,
        ats_score=payload.ats_score,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("/candidate/resumes/{resume_id}", response_model=UserResumeResponse)
def get_user_resume(
    resume_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific saved CV by ID."""
    resume = db.query(UserResume).filter_by(id=resume_id, user_id=current_user.id).first()
    if not resume:
        raise NotFoundException("Không tìm thấy bản CV")
    return resume


@router.put("/candidate/resumes/{resume_id}", response_model=UserResumeResponse)
def update_user_resume(
    resume_id: str,
    payload: UserResumeUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Update CV contents, template style, title or ATS score."""
    resume = db.query(UserResume).filter_by(id=resume_id, user_id=current_user.id).first()
    if not resume:
        raise NotFoundException("Không tìm thấy bản CV")

    if payload.title is not None:
        resume.title = payload.title
    if payload.template_id is not None:
        resume.template_id = payload.template_id
    if payload.cv_data_json is not None:
        resume.cv_data_json = payload.cv_data_json
    if payload.ats_score is not None:
        resume.ats_score = payload.ats_score
    if payload.is_primary is not None:
        if payload.is_primary:
            db.query(UserResume).filter(UserResume.user_id == current_user.id).update({"is_primary": False})
        resume.is_primary = payload.is_primary

    resume.updated_at = datetime.datetime.now(timezone.utc)
    db.commit()
    db.refresh(resume)
    return resume


@router.delete("/candidate/resumes/{resume_id}")
def delete_user_resume(
    resume_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved CV from personal vault."""
    resume = db.query(UserResume).filter_by(id=resume_id, user_id=current_user.id).first()
    if not resume:
        raise NotFoundException("Không tìm thấy bản CV")

    db.delete(resume)
    db.commit()
    return {"message": "Đã xóa bản CV thành công"}


@router.post("/candidate/resumes/{resume_id}/set-primary", response_model=UserResumeResponse)
def set_primary_user_resume(
    resume_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a saved CV as primary default for 1-click job application."""
    resume = db.query(UserResume).filter_by(id=resume_id, user_id=current_user.id).first()
    if not resume:
        raise NotFoundException("Không tìm thấy bản CV")

    db.query(UserResume).filter(UserResume.user_id == current_user.id).update({"is_primary": False})
    resume.is_primary = True
    resume.updated_at = datetime.datetime.now(timezone.utc)
    db.commit()
    db.refresh(resume)
    return resume


@router.post("/public/assistant-chat", response_model=PublicAssistantChatResponse)
async def public_assistant_chat_endpoint(
    payload: PublicAssistantChatRequest,
):
    """Real AI Assistant for Landing Page visitors powered by Ollama."""
    from src.backend.core.llm import generate_text

    msg = payload.message.strip()
    history_ctx = ""
    if payload.history:
        recent = payload.history[-4:]
        history_ctx = "LỊCH SỬ TRAO ĐỔI:\n" + "\n".join([f"{h.get('role', 'user')}: {h.get('content', '')}" for h in recent]) + "\n\n"

    system_prompt = (
        "Bạn là Axiom Protocol AI — Trợ lý điều hành thông minh của nền tảng Axiom Enterprise Meeting Protocol.\n"
        "Kiến thức cốt lõi của nền tảng:\n"
        "1. Triết lý H-P-D-I: 4 tầng hội họp (Hearing - Giác quan & STT; Processing - Phân tích AI & MoM; Decision - Nghị quyết & Biểu quyết; Implementation - Phân rã Mini Jira).\n"
        "2. Agenda Gatekeeper: Bắt buộc có Agenda tối thiểu 20 ký tự mới được tạo cuộc họp, ngăn ngừa họp lan man.\n"
        "3. CV Studio & Tuyển dụng: Hệ thống thiết kế CV chuẩn A4 tương tác trực quan, thẩm định điểm ATS tự động, pipeline tuyển dụng 5 bước (Mời -> Test -> Phỏng vấn -> HR review -> Owner duyệt).\n"
        "4. Bảo mật On-Premise Sovereign: Triển khai nội bộ máy chủ riêng, tích hợp mô hình AI mở qua Ollama (Qwen2.5), không rò rỉ dữ liệu.\n\n"
        "Quy tắc trả lời:\n"
        "- Trả lời bằng tiếng Việt lịch thiệp, thông minh, chuyên nghiệp và súc tích (khoảng 2-3 đoạn ngắn).\n"
        "- Bố cục mạch lạc, gạch đầu dòng rõ ràng khi liệt kê tính năng.\n"
        "- Ở cuối câu trả lời luôn có gợi ý hành động hoặc câu hỏi kết nối (ví dụ: 'Bạn có muốn trải nghiệm tạo bản CV đầu tiên trong CV Studio hay khám phá phòng họp thử nghiệm không?')."
    )

    full_prompt = (
        f"{system_prompt}\n\n"
        f"{history_ctx}"
        f"Câu hỏi của khách truy cập: \"{msg}\"\n\n"
        "Câu trả lời:"
    )

    try:
        reply_text = await generate_text(
            model_or_models=["qwen2.5:3b", "qwen2.5:1.5b", "qwen2.5:0.5b"],
            prompt=full_prompt,
            max_tokens=400,
            temperature=0.3,
        )
        if reply_text and len(reply_text.strip()) > 15:
            # Clean up prefixes
            clean_reply = reply_text.strip()
            for prefix in ["Axiom AI:", "Trợ lý:", "AI:", "Câu trả lời:"]:
                if clean_reply.startswith(prefix):
                    clean_reply = clean_reply[len(prefix):].strip()
            return PublicAssistantChatResponse(reply=clean_reply)
    except Exception as exc:
        logger.warning("Ollama public assistant chat error: %s", exc)

    # Contextual heuristic fallback
    q_lower = msg.lower()
    if any(k in q_lower for k in ["cv", "tạo cv", "studio", "hồ sơ"]):
        fallback = (
            "Axiom tích hợp **CV Studio tương tác chuẩn A4**, cho phép bạn thiết kế hồ sơ chuyên nghiệp với hơn 10 mẫu tiêu chuẩn, "
            "tự động thẩm định điểm ATS chuyên sâu và lưu trữ trực quan trong Kho CV cá nhân.\n\n"
            "💡 *Bạn có thể bấm vào mục 'CV Studio' trên thanh điều hướng để trải nghiệm thiết kế hồ sơ ngay bây giờ!*"
        )
    elif any(k in q_lower for k in ["h-p-d-i", "hpdi", "triết lý"]):
        fallback = (
            "Triết lý **H-P-D-I** là xương sống của Axiom, bao gồm 4 tầng kỷ luật: **Hearing** (Nghe & chuyển ngữ thời gian thực), "
            "**Processing** (Trích xuất biên bản MoM & phân loại nhiệm vụ), **Decision** (Biểu quyết & chốt nghị quyết), "
            "và **Implementation** (Tự động đồng bộ sang Mini Jira để thực thi).\n\n"
            "💡 *Bạn có muốn tìm hiểu sâu hơn về tầng nào trong chuỗi quy trình này không?*"
        )
    elif any(k in q_lower for k in ["bảo mật", "on-premise", "dữ liệu"]):
        fallback = (
            "Axiom vận hành theo tiêu chuẩn **Sovereign Data Governance**, cho phép triển khai 100% On-Premise trên máy chủ riêng của doanh nghiệp. "
            "Tất cả mô hình AI (Whisper, Ollama Qwen) đều chạy cục bộ, đảm bảo bảo mật tuyệt đối cho mọi cuộc họp và tài liệu tuyển dụng.\n\n"
            "💡 *Bạn có muốn khám phá tài liệu kỹ thuật về kiến trúc bảo mật của hệ thống không?*"
        )
    else:
        fallback = (
            f"Chào bạn, tôi là trợ lý AI của **Axiom Enterprise Meeting Protocol**. Tôi có thể hỗ trợ bạn tìm hiểu về quy trình họp kỷ luật Agenda Gate, "
            f"hệ thống trích xuất nhiệm vụ tự động, cũng như cổng tuyển dụng và thiết kế CV chuẩn ATS.\n\n"
            f"💡 *Bạn muốn khám phá tính năng quản lý cuộc họp hay trải nghiệm Cổng ứng viên & CV Studio trước?*"
        )

    return PublicAssistantChatResponse(reply=fallback)

