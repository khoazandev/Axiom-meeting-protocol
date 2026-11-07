"""
Public Recruitment Router — Axiom Digital Enterprise OS
Allows candidates to browse openings, submit applications directly without creating an account,
track application progress using their Tracking Code, and take competency assessments securely.
"""

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import json
import logging
import os
import re
import secrets
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.config import get_settings
from src.backend.core.exceptions import (
    AuthenticationException,
    ConflictException,
    NotFoundException,
    ValidationException,
)
from src.backend.core.security import hash_recruitment_token
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
)
from src.backend.schemas.recruitment import (
    PublicCandidateApplyRequest,
    PublicCandidateApplyResponse,
    PublicJobOpeningItem,
    PublicTrackRequest,
    PublicTrackResponse,
)
from src.backend.api.v1.candidate_recruitment import ensure_application_assessment_attempt
from src.backend.services.email_service import send_public_application_received_email
from src.backend.services.recruitment_workflow import RecruitmentCommand, RecruitmentWorkflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/careers", tags=["public-careers"])

RESUME_STORAGE_DIR = os.path.abspath(os.path.join(os.getcwd(), "storage", "resumes"))
os.makedirs(RESUME_STORAGE_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


@router.post("/upload-cv")
async def upload_candidate_cv(
    file: UploadFile = File(...),
):
    """Upload candidate CV document (PDF, DOCX, DOC) and return accessible file URL."""
    if not file.filename:
        raise ValidationException("Tên tệp không hợp lệ.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationException("Định dạng tệp không được hỗ trợ. Vui lòng tải lên tệp PDF hoặc DOCX/DOC.")

    content = await file.read()
    file_size = len(content)
    if file_size > MAX_FILE_SIZE:
        raise ValidationException("Kích thước tệp vượt quá giới hạn 15MB. Vui lòng tối ưu lại tệp.")
    if file_size == 0:
        raise ValidationException("Tệp tải lên rỗng.")

    # Generate safe unique filename
    safe_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', os.path.splitext(file.filename)[0])[:40]
    unique_filename = f"{uuid.uuid4().hex[:12]}_{safe_name}{ext}"
    saved_path = os.path.join(RESUME_STORAGE_DIR, unique_filename)

    with open(saved_path, "wb") as f:
        f.write(content)

    # Format file size
    if file_size < 1024:
        formatted_size = f"{file_size} B"
    elif file_size < 1024 * 1024:
        formatted_size = f"{file_size / 1024:.1f} KB"
    else:
        formatted_size = f"{file_size / (1024 * 1024):.2f} MB"

    # Base64 preview for PDF
    data_url = None
    if ext == ".pdf":
        data_url = f"data:application/pdf;base64,{base64.b64encode(content).decode('ascii')}"

    file_url = f"/api/v1/public/careers/files/{unique_filename}"

    return {
        "success": True,
        "filename": file.filename,
        "unique_filename": unique_filename,
        "file_url": file_url,
        "file_size": file_size,
        "formatted_size": formatted_size,
        "content_type": file.content_type or ("application/pdf" if ext == ".pdf" else "application/octet-stream"),
        "data_url": data_url,
    }


@router.get("/files/{filename}")
def serve_candidate_cv_file(filename: str):
    """Serve uploaded CV files for candidate preview and HR dossier verification."""
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(RESUME_STORAGE_DIR, safe_filename)
    if not os.path.isfile(file_path):
        raise NotFoundException("Tệp CV không tồn tại hoặc đã bị xóa.")

    ext = os.path.splitext(safe_filename)[1].lower()
    media_type = "application/pdf" if ext == ".pdf" else (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if ext == ".docx" else "application/octet-stream"
    )
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=safe_filename,
        content_disposition_type="inline",
    )


def normalize_email(email: str) -> str:
    cleaned = email.strip().lower()
    if "@" not in cleaned:
        return cleaned + "@gmail.com"
    return cleaned


def extract_department_icon(description: Optional[str]) -> Optional[str]:
    if not description:
        return None
    import re
    match = re.search(r'\[icon:([a-z0-9_]+)\]', description, re.IGNORECASE)
    return match.group(1) if match else None


@router.get("/departments")
def list_public_departments(db: Session = Depends(get_db)):
    """List departments with their official name, description and owner-configured icon."""
    departments = db.query(Department).all()
    res = []
    for d in departments:
        res.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "icon": extract_department_icon(d.description) or "domain",
        })
    return res


# ---------------------------------------------------------------------------
# 1. Public Job Openings
# ---------------------------------------------------------------------------
@router.get("/openings", response_model=List[PublicJobOpeningItem])
def list_public_job_openings(
    department_id: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List all active job openings for Axiom Digital Enterprise."""
    query = (
        db.query(JobOpening)
        .join(Organization, JobOpening.organization_id == Organization.id)
        .outerjoin(Department, JobOpening.department_id == Department.id)
        .filter(JobOpening.status == JobOpeningStatusEnum.ACTIVE)
    )

    if department_id:
        query = query.filter(JobOpening.department_id == department_id)
    if level:
        query = query.filter(JobOpening.level == level)
    if search:
        search_filter = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(JobOpening.title).ilike(search_filter)
            | func.lower(JobOpening.description).ilike(search_filter)
            | func.lower(JobOpening.requirements).ilike(search_filter)
        )

    openings = query.order_by(JobOpening.created_at.desc()).all()

    results: List[PublicJobOpeningItem] = []
    for op in openings:
        dept_desc = op.department.description if op.department else None
        results.append(
            PublicJobOpeningItem(
                id=op.id,
                organization_id=op.organization_id,
                organization_name=op.organization.name if op.organization else "Axiom Digital Enterprise",
                organization_logo_url=op.organization.logo_url if op.organization else None,
                department_id=op.department_id,
                department_name=op.department.name if op.department else "Toàn cơ quan",
                department_description=dept_desc,
                department_icon=extract_department_icon(dept_desc),
                title=op.title,
                description=op.description,
                requirements=op.requirements,
                salary_range=op.salary_range,
                level=op.level,
                work_type=op.work_type,
                location=op.location,
                benefits=op.benefits,
                requires_assessment=op.requires_assessment,
                created_at=op.created_at.isoformat() if op.created_at else "",
            )
        )
    return results


# ---------------------------------------------------------------------------
# 2. Public Candidate Application (No account required)
# ---------------------------------------------------------------------------
@router.post("/apply", response_model=PublicCandidateApplyResponse, status_code=status.HTTP_201_CREATED)
def apply_to_job_opening(
    payload: PublicCandidateApplyRequest,
    db: Session = Depends(get_db),
):
    """Apply directly to an active job opening without requiring a user account."""
    opening = (
        db.query(JobOpening)
        .filter(JobOpening.id == payload.opening_id, JobOpening.status == JobOpeningStatusEnum.ACTIVE)
        .first()
    )
    if not opening:
        raise NotFoundException("Vị trí tuyển dụng không tồn tại hoặc đã tạm dừng nhận hồ sơ.")

    clean_email = normalize_email(payload.email)
    email_hash = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()

    # 1. Check existing Candidate
    candidate = (
        db.query(Candidate)
        .filter(
            Candidate.organization_id == opening.organization_id,
            (Candidate.email == clean_email) | (Candidate.email_hash == email_hash),
        )
        .first()
    )

    if candidate:
        # Compile structured, professional candidate profile summary
        details = []
        if payload.current_title:
            details.append(f"• Vị trí hiện tại: {payload.current_title.strip()}")
        if payload.years_of_experience:
            details.append(f"• Số năm kinh nghiệm: {payload.years_of_experience.strip()}")
        if payload.education_level:
            details.append(f"• Trình độ học vấn: {payload.education_level.strip()}")
        if payload.location:
            details.append(f"• Nơi cư trú: {payload.location.strip()}")
        if payload.expected_salary:
            details.append(f"• Mức lương kỳ vọng: {payload.expected_salary.strip()}")
        if payload.earliest_start_date:
            details.append(f"• Thời gian có thể bắt đầu: {payload.earliest_start_date.strip()}")
        if payload.skills:
            details.append(f"• Kỹ năng thế mạnh: {', '.join(payload.skills)}")
        if payload.linkedin_url:
            details.append(f"• LinkedIn: {payload.linkedin_url.strip()}")
        if payload.portfolio_url:
            details.append(f"• Portfolio: {payload.portfolio_url.strip()}")
        if payload.github_url:
            details.append(f"• GitHub: {payload.github_url.strip()}")
        if payload.cover_letter:
            details.append(f"\n[THƯ ỨNG TUYỂN / COVER LETTER]\n{payload.cover_letter.strip()}")

        compiled_notes = "\n".join(details) if details else (payload.cover_letter or "N/A")

        # Update candidate contact details if supplied
        if payload.full_name:
            candidate.full_name = payload.full_name.strip()
        if payload.phone:
            candidate.phone = payload.phone.strip()
        if payload.cv_url:
            candidate.cv_url = payload.cv_url.strip()
        candidate.notes = compiled_notes
    else:
        # Compile structured, professional candidate profile summary
        details = []
        if payload.current_title:
            details.append(f"• Vị trí hiện tại: {payload.current_title.strip()}")
        if payload.years_of_experience:
            details.append(f"• Số năm kinh nghiệm: {payload.years_of_experience.strip()}")
        if payload.education_level:
            details.append(f"• Trình độ học vấn: {payload.education_level.strip()}")
        if payload.location:
            details.append(f"• Nơi cư trú: {payload.location.strip()}")
        if payload.expected_salary:
            details.append(f"• Mức lương kỳ vọng: {payload.expected_salary.strip()}")
        if payload.earliest_start_date:
            details.append(f"• Thời gian có thể bắt đầu: {payload.earliest_start_date.strip()}")
        if payload.skills:
            details.append(f"• Kỹ năng thế mạnh: {', '.join(payload.skills)}")
        if payload.linkedin_url:
            details.append(f"• LinkedIn: {payload.linkedin_url.strip()}")
        if payload.portfolio_url:
            details.append(f"• Portfolio: {payload.portfolio_url.strip()}")
        if payload.github_url:
            details.append(f"• GitHub: {payload.github_url.strip()}")
        if payload.cover_letter:
            details.append(f"\n[THƯ ỨNG TUYỂN / COVER LETTER]\n{payload.cover_letter.strip()}")

        compiled_notes = "\n".join(details) if details else (payload.cover_letter or "N/A")

        candidate = Candidate(
            organization_id=opening.organization_id,
            email=clean_email,
            email_hash=email_hash,
            full_name=payload.full_name.strip(),
            phone=payload.phone.strip() if payload.phone else None,
            cv_url=payload.cv_url.strip() if payload.cv_url else None,
            notes=compiled_notes,
        )
        db.add(candidate)
        db.flush()

    # 2. Create or Reset Application
    now = datetime.now(timezone.utc)
    if candidate:
        existing_app = (
            db.query(RecruitmentApplication)
            .filter(
                RecruitmentApplication.opening_id == opening.id,
                RecruitmentApplication.candidate_id == candidate.id,
            )
            .first()
        )
    else:
        existing_app = None

    if existing_app:
        application = existing_app
        application.stage = RecruitmentStageEnum.INVITED
        application.consent_given = True
        application.consent_timestamp = now
        application.updated_at = now
    else:
        application = RecruitmentApplication(
            organization_id=opening.organization_id,
            opening_id=opening.id,
            candidate_id=candidate.id,
            assigned_hr_member_id=opening.assigned_hr_member_id,
            stage=RecruitmentStageEnum.INVITED,
            version=1,
            consent_given=True,
            consent_timestamp=now,
        )
        db.add(application)
    db.flush()

    # 3. Create or refresh invitation token for candidate session / assessment
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_recruitment_token(raw_token)
    invitation = (
        db.query(RecruitmentInvitation)
        .filter(RecruitmentInvitation.application_id == application.id)
        .first()
    )
    if invitation:
        invitation.token_hash = token_hash
        invitation.expires_at = now + timedelta(days=30)
    else:
        invitation = RecruitmentInvitation(
            organization_id=opening.organization_id,
            application_id=application.id,
            token_hash=token_hash,
            expires_at=now + timedelta(days=30),
            max_uses=100,
        )
        db.add(invitation)
    db.flush()

    # 4. If test required, pre-provision assessment attempt
    if opening.requires_assessment:
        try:
            ensure_application_assessment_attempt(db, application)
        except Exception as e:
            logger.warning(f"[PublicRecruitment] Failed to auto-provision assessment attempt: {e}")

    # 5. Build Tracking Code & URLs
    tracking_code = f"AXM-{application.id[:8].upper()}"
    settings = get_settings()
    frontend_base = (settings.frontend_base_url or "http://localhost:3001").rstrip("/")
    track_url = f"{frontend_base}/?track={tracking_code}&email={clean_email}"
    assessment_url = f"{frontend_base}/assessment?token={raw_token}" if opening.requires_assessment else None

    # 6. Dispatch Email to Candidate
    org_name = opening.organization.name if opening.organization else "Axiom Digital Enterprise"
    send_public_application_received_email(
        candidate_email=clean_email,
        candidate_name=candidate.full_name or "Ứng viên",
        opening_title=opening.title,
        organization_name=org_name,
        tracking_code=tracking_code,
        track_url=track_url,
        assessment_url=assessment_url,
        requires_test=opening.requires_assessment,
    )

    db.commit()
    db.refresh(application)

    return PublicCandidateApplyResponse(
        success=True,
        application_id=application.id,
        tracking_code=tracking_code,
        access_token=raw_token,
        stage=application.stage.value,
        requires_assessment=opening.requires_assessment,
        message=f"Hồ sơ ứng tuyển của bạn đã được gửi thành công tới {org_name}! Mã tra cứu: {tracking_code}. Hướng dẫn chi tiết đã được gửi tới email {clean_email}.",
    )


# ---------------------------------------------------------------------------
# 3. Public Application Tracking
# ---------------------------------------------------------------------------
_STAGE_DESCRIPTIONS = {
    RecruitmentStageEnum.INVITED: "Hồ sơ của bạn đã được tiếp nhận thành công và đang được Ban Tuyển Dụng thẩm định sơ bộ CV.",
    RecruitmentStageEnum.ASSESSMENT_PENDING: "Hồ sơ CV đạt chuẩn. Vui lòng thực hiện bài kiểm tra năng lực chuyên môn theo liên kết đã nhận trong email.",
    RecruitmentStageEnum.ASSESSMENT_SUBMITTED: "Bạn đã hoàn thành bài kiểm tra năng lực. Hội đồng chấm thi đang đánh giá kết quả.",
    RecruitmentStageEnum.INTERVIEW_SCHEDULED: "Chúc mừng! Bạn đã được mời tham gia phỏng vấn trực tiếp cùng Hội đồng Chuyên môn. Vui lòng kiểm tra email để nhận lịch hẹn.",
    RecruitmentStageEnum.INTERVIEW_COMPLETED: "Phỏng vấn hoàn tất. Ban nhân sự và hội đồng chuyên môn đang tổng hợp kết quả thẩm định.",
    RecruitmentStageEnum.HR_REVIEW_PENDING: "Hội đồng nhân sự đang xem xét tổng thể hồ sơ và báo cáo năng lực ứng viên.",
    RecruitmentStageEnum.OWNER_APPROVAL_PENDING: "Hồ sơ của bạn đã vượt qua tất cả các vòng và đang được Ban Giám Đốc / Chủ Doanh Nghiệp phê duyệt bổ nhiệm chính thức.",
    RecruitmentStageEnum.APPROVED: "Chúc mừng! Quyết định tiếp nhận đã được thông qua. Hệ thống đang tiến hành kích hoạt tài khoản doanh nghiệp.",
    RecruitmentStageEnum.ONBOARDING_INVITED: "Chúc mừng bạn đã trúng tuyển! Thông tin tài khoản nhân viên chính thức và mật khẩu khởi tạo đã được gửi tới Gmail của bạn.",
    RecruitmentStageEnum.HIRED: "Bạn đã là nhân viên chính thức của Axiom Digital Enterprise. Chào mừng bạn gia nhập đội ngũ!",
    RecruitmentStageEnum.REJECTED: "Rất tiếc hồ sơ của bạn chưa phù hợp với vị trí này trong đợt tuyển dụng hiện tại. Axiom chân thành cảm ơn bạn đã quan tâm và mong được hợp tác trong các cơ hội tiếp theo.",
    RecruitmentStageEnum.WITHDRAWN: "Hồ sơ đã được rút theo yêu cầu của ứng viên.",
    RecruitmentStageEnum.EXPIRED: "Đơn ứng tuyển đã hết hạn xử lý.",
    RecruitmentStageEnum.CANCELLED: "Đợt tuyển dụng vị trí này đã được khép lại.",
}


@router.post("/track", response_model=PublicTrackResponse)
def track_candidate_application(
    payload: PublicTrackRequest,
    db: Session = Depends(get_db),
):
    """Query real-time recruitment application progress using candidate email and Tracking Code."""
    clean_email = normalize_email(payload.email)
    raw_code = payload.tracking_code.strip()
    clean_code = raw_code.upper().replace("AXM-", "").replace("AX-", "").lower()

    # Query matching candidate and application
    query = (
        db.query(RecruitmentApplication)
        .join(Candidate, RecruitmentApplication.candidate_id == Candidate.id)
        .filter(func.lower(Candidate.email) == clean_email)
        .filter(
            (RecruitmentApplication.id.ilike(f"{clean_code}%"))
            | (RecruitmentApplication.id == raw_code)
        )
    )
    application = query.first()
    if not application:
        raise NotFoundException(
            "Không tìm thấy hồ sơ ứng tuyển phù hợp với email và mã hồ sơ đã nhập. Vui lòng kiểm tra lại thông tin trong email xác nhận."
        )

    opening = application.opening
    org = application.organization
    dept = opening.department if opening else None

    # Assessment Attempt
    attempt = (
        db.query(AssessmentAttempt)
        .filter(AssessmentAttempt.application_id == application.id)
        .order_by(AssessmentAttempt.created_at.desc())
        .first()
    )

    # Active Interview Session
    interview = (
        db.query(InterviewSession)
        .filter(InterviewSession.application_id == application.id)
        .order_by(InterviewSession.created_at.desc())
        .first()
    )

    # Find active invitation token for test/interview access
    active_inv = (
        db.query(RecruitmentInvitation)
        .filter(
            RecruitmentInvitation.application_id == application.id,
            RecruitmentInvitation.revoked_at.is_(None),
        )
        .order_by(RecruitmentInvitation.created_at.desc())
        .first()
    )

    status_desc = _STAGE_DESCRIPTIONS.get(
        application.stage,
        f"Hồ sơ đang ở giai đoạn: {application.stage.value}",
    )

    tracking_code = f"AXM-{application.id[:8].upper()}"

    return PublicTrackResponse(
        application_id=application.id,
        tracking_code=tracking_code,
        stage=application.stage.value,
        opening_id=opening.id if opening else "",
        opening_title=opening.title if opening else "Vị trí tuyển dụng",
        department_name=dept.name if dept else "Toàn cơ quan",
        organization_name=org.name if org else "Axiom Digital Enterprise",
        organization_logo_url=org.logo_url if org else None,
        applied_at=application.created_at.isoformat() if application.created_at else "",
        requires_assessment=opening.requires_assessment if opening else False,
        assessment_status=attempt.status.value if attempt and attempt.status else None,
        assessment_score=attempt.score if attempt else None,
        access_token=None,  # Do not leak raw token on public track lookup
        interview_scheduled_at=interview.scheduled_at.isoformat() if interview and interview.scheduled_at else None,
        interview_meeting_id=interview.meeting_id if interview else None,
        interview_status=interview.status.value if interview and interview.status else None,
        status_description=status_desc,
    )


# ---------------------------------------------------------------------------
# 4. Public Assessment (Token-based, No user login)
# ---------------------------------------------------------------------------
class PublicAssessmentSubmitPayload(BaseModel):
    answers: Optional[Dict[str, Any]] = None
    answers_json: Optional[str] = None
    violations_count: Optional[int] = 0
    is_violation_terminated: Optional[bool] = False
    termination_reason: Optional[str] = None


def _format_utc_iso(dt: Optional[datetime]) -> Optional[str]:
    """Ensure datetime has explicit UTC timezone (+00:00 or Z) for unambiguous browser parsing."""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


@router.get("/assessment/{token}")
def get_public_assessment(
    token: str,
    db: Session = Depends(get_db),
):
    """Retrieve competency assessment questions and details using candidate magic access token."""
    token_hash = hash_recruitment_token(token)
    invitation = (
        db.query(RecruitmentInvitation)
        .filter(RecruitmentInvitation.token_hash == token_hash)
        .first()
    )
    if not invitation:
        raise AuthenticationException("Mã truy cập bài kiểm tra không hợp lệ hoặc đã hết hạn.")

    if invitation.revoked_at is not None:
        raise AuthenticationException("Mã truy cập đã bị vô hiệu hóa.")

    now = datetime.now(timezone.utc)
    exp = invitation.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now:
        raise AuthenticationException("Mã truy cập đã hết hạn.")

    application = (
        db.query(RecruitmentApplication)
        .filter(RecruitmentApplication.id == invitation.application_id)
        .first()
    )
    if not application:
        raise NotFoundException("Không tìm thấy hồ sơ ứng tuyển tương ứng.")

    attempt = ensure_application_assessment_attempt(db, application)
    if not attempt:
        raise NotFoundException("Không tìm thấy bài đánh giá tương ứng.")

    definition = attempt.definition
    questions = []
    if definition and definition.questions_json:
        try:
            questions = json.loads(definition.questions_json)
        except Exception:
            questions = []
    elif attempt.definition_snapshot_json:
        try:
            parsed = json.loads(attempt.definition_snapshot_json)
            if isinstance(parsed, list):
                questions = parsed
            elif isinstance(parsed, dict):
                questions = parsed.get("questions") or parsed.get("questions_snapshot") or []
        except Exception:
            questions = []

    title = definition.title if definition else (
        f"Bài đánh giá năng lực: {application.opening.title}" if application.opening else "Bài Đánh Giá Năng Lực Ứng Viên"
    )

    passing_score = 50.0
    try:
        if application.opening and application.opening.competency_rubric_json:
            rubric_data = json.loads(application.opening.competency_rubric_json)
            if "passing_score" in rubric_data and rubric_data["passing_score"]:
                passing_score = float(rubric_data["passing_score"])
    except Exception:
        passing_score = 50.0

    is_submitted = attempt.status == AssessmentStatusEnum.SUBMITTED

    return {
        "attempt_id": attempt.id,
        "application_id": application.id,
        "title": title,
        "opening_title": application.opening.title if application.opening else "",
        "department_name": application.opening.department.name if application.opening and application.opening.department else "Toàn cơ quan",
        "organization_name": application.organization.name if application.organization else "Axiom Digital Enterprise",
        "candidate_name": application.candidate.full_name if application.candidate else "",
        "candidate_email": application.candidate.email if application.candidate else "",
        "status": attempt.status.value,
        "score": attempt.score if is_submitted else None,
        "is_submitted": is_submitted,
        "duration_minutes": definition.duration_minutes if definition else 30,
        "passing_score": passing_score,
        "questions": questions,
        "requires_webcam": False,
        "stage": application.stage.value,
        "answers_json": attempt.answers_json,
        "submitted_at": _format_utc_iso(attempt.submitted_at),
        "expires_at": _format_utc_iso(attempt.expires_at),
        "created_at": _format_utc_iso(attempt.created_at),
    }


@router.post("/assessment/{token}/submit")
def submit_public_assessment(
    token: str,
    payload: PublicAssessmentSubmitPayload,
    db: Session = Depends(get_db),
):
    """Submit candidate assessment answers with anti-cheating audit, 3-violation fail enforcement, and AI grading."""
    token_hash = hash_recruitment_token(token)
    invitation = (
        db.query(RecruitmentInvitation)
        .filter(RecruitmentInvitation.token_hash == token_hash)
        .first()
    )
    if not invitation or invitation.revoked_at is not None:
        raise AuthenticationException("Mã truy cập không hợp lệ.")

    application = (
        db.query(RecruitmentApplication)
        .filter(RecruitmentApplication.id == invitation.application_id)
        .first()
    )
    if not application:
        raise NotFoundException("Không tìm thấy hồ sơ ứng tuyển tương ứng.")

    attempt = (
        db.query(AssessmentAttempt)
        .filter(AssessmentAttempt.application_id == application.id)
        .order_by(AssessmentAttempt.created_at.desc())
        .first()
    )
    if not attempt:
        raise NotFoundException("Không tìm thấy phiên làm bài kiểm tra.")

    # 1. Prevent repeated retakes if already submitted
    if attempt.status == AssessmentStatusEnum.SUBMITTED:
        raise ValidationException("Bài thi này đã được hoàn thành và nộp trước đó. Bạn không thể làm lại bài kiểm tra.")

    # 2. Anti-cheating rule: If 3 or more violations, automatically terminate with 0 score and REJECT immediately
    violations = payload.violations_count or 0
    is_cheating_terminated = payload.is_violation_terminated or (violations >= 3)

    raw_answers = payload.answers or {}
    if not raw_answers and payload.answers_json:
        try:
            raw_answers = json.loads(payload.answers_json)
        except Exception:
            raw_answers = {}

    if is_cheating_terminated:
        now = datetime.now(timezone.utc)
        attempt.submitted_at = now
        attempt.status = AssessmentStatusEnum.SUBMITTED
        final_score = 0.0
        attempt.score = final_score
        attempt.answers_json = json.dumps({
            "answers": raw_answers,
            "violations_count": violations,
            "is_cheating_terminated": True,
            "termination_reason": payload.termination_reason or f"Vi phạm quy chế thi trực tuyến ({violations} lần cảnh báo rời màn hình làm bài).",
        }, ensure_ascii=False)

        workflow = RecruitmentWorkflow(db)
        try:
            workflow.advance(
                application.id,
                RecruitmentCommand(
                    action="REJECT",
                    metadata={
                        "reason": f"Vi phạm quy chế thi trực tuyến ({violations} lần cảnh báo). Bài thi đạt 0 điểm.",
                        "violations_count": violations,
                    },
                ),
                actor_member=None,
            )
        except Exception as e:
            logger.warning(f"[PublicRecruitment] Failed to reject cheating candidate: {e}")
            application.stage = RecruitmentStageEnum.REJECTED

        db.commit()
        db.refresh(attempt)
        db.refresh(application)

        return {
            "success": True,
            "attempt_id": attempt.id,
            "score": 0.0,
            "passing_score": 50.0,
            "is_passed": False,
            "violations_count": violations,
            "is_cheating_terminated": True,
            "stage": application.stage.value,
            "message": "Bài thi đã bị đình chỉ do vi phạm quy chế thi quá 3 lần (0 điểm). Hồ sơ đã bị từ chối.",
        }

    # 3. Authentic AI Grading via AssessmentService
    from src.backend.services.assessment_service import AssessmentService
    assessment_service = AssessmentService(db)
    graded_attempt = assessment_service.submit_attempt(
        application_id=application.id,
        answers_json=json.dumps(raw_answers, ensure_ascii=False),
        is_violation_terminated=False,
        violations_count=violations,
    )
    db.refresh(application)

    passing_score = 50.0
    try:
        if application.opening and application.opening.competency_rubric_json:
            rubric_data = json.loads(application.opening.competency_rubric_json)
            if "passing_score" in rubric_data and rubric_data["passing_score"]:
                passing_score = float(rubric_data["passing_score"])
    except Exception:
        passing_score = 50.0

    is_passed = (graded_attempt.score is not None) and (graded_attempt.score >= passing_score)

    return {
        "success": True,
        "attempt_id": graded_attempt.id,
        "score": graded_attempt.score,
        "passing_score": passing_score,
        "is_passed": is_passed,
        "violations_count": violations,
        "is_cheating_terminated": False,
        "stage": application.stage.value,
        "message": (
            f"Chúc mừng! Bạn đã hoàn thành bài thi với điểm số {graded_attempt.score}/100 (Đạt). Lịch phỏng vấn trực tuyến đã được xếp và gửi qua email."
            if is_passed
            else f"Bạn đã hoàn thành bài thi với điểm số {graded_attempt.score}/100. Rất tiếc điểm số chưa đạt điểm sàn ({passing_score})."
        ),
    }
