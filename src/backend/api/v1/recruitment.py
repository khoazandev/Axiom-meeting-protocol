"""Recruitment pipeline API endpoints for Organization Owners and HR Managers."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import io
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.api import deps
from src.backend.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from src.backend.core.security import hash_recruitment_token
from src.backend.database import get_db
from src.backend.models import (
    AssessmentAttempt,
    AssessmentDefinition,
    Candidate,
    Department,
    DepartmentMember,
    HRDecisionEnum,
    HRReview,
    JobOpening,
    JobOpeningStatusEnum,
    OrganizationMember,
    OrganizationMemberPermission,
    OwnerApproval,
    OwnerDecisionEnum,
    Permission,
    RecruitmentApplication,
    RecruitmentInvitation,
    RecruitmentPolicy,
    RecruitmentStageEnum,
)
from src.backend.schemas.recruitment import (
    ApplicationDetail,
    ApplicationInviteCreate,
    ApplicationInviteResponse,
    ApplicationSummary,
    AssignAssessmentRequest,
    AssignHRUpdate,
    CVApprovalCreate,
    AssessmentAttemptResponse,
    AIEvaluationResponse,
    AssessmentDefinitionCreate,
    AssessmentDefinitionResponse,
    HRReviewCreate,
    HRReviewResponse,
    InterviewScheduleCreate,
    InterviewSessionResponse,
    IssueOnboardingRequest,
    IssueOnboardingResponse,
    JobOpeningCreate,
    JobOpeningResponse,
    JobOpeningUpdate,
    OwnerApprovalCreate,
    OwnerApprovalResponse,
    RecruitmentMeResponse,
    RecruitmentPolicyResponse,
    RecruitmentPolicyUpdate,
    ReviewGrantResponse,
    ReviewGrantUpdate,
    UserResumeResponse,
    MoveStageRequest,
)
from src.backend.services.assessment_service import AssessmentService
from src.backend.services.candidate_auth import generate_invitation_token
from pydantic import BaseModel
from src.backend.services.candidate_evaluator import (
    CandidateEvaluator,
    EvaluationService,
    get_candidate_evaluator,
)
from src.backend.services.email_service import (
    send_candidate_rejection_email,
    send_recruitment_invitation_email,
)
from src.backend.services.interview_service import InterviewService
from src.backend.services.onboarding_service import OnboardingService
from src.backend.services.recruitment_permissions import (
    assert_recruitment_reviewer,
    get_effective_permissions,
    has_effective_permission,
)
from src.backend.services.recruitment_workflow import (
    TERMINAL_STAGES,
    RecruitmentCommand,
    RecruitmentConflict,
    RecruitmentWorkflow,
    record_recruitment_event,
)

router = APIRouter(
    prefix="/organizations/{org_id}/recruitment",
    tags=["recruitment"],
)


def _is_owner(member: OrganizationMember) -> bool:
    if not member:
        return False
    role_name = getattr(member.role, "name", "").upper() if member.role else ""
    if role_name in ("OWNER", "ADMIN"):
        return True
    if member.organization and member.organization.created_by_id == member.user_id:
        return True
    return False


def _can_manage_recruitment(db: Session, member: OrganizationMember) -> bool:
    if not member:
        return False
    role_name = getattr(member.role, "name", "").upper() if member.role else ""
    if role_name in ("OWNER", "ADMIN", "MANAGER"):
        return True
    return _is_owner(member) or has_effective_permission(db, member, "recruitment.manage")


def _get_application_or_404(db: Session, org_id: str, application_id: str) -> RecruitmentApplication:
    app = (
        db.query(RecruitmentApplication)
        .filter(
            RecruitmentApplication.organization_id == org_id,
            RecruitmentApplication.id == application_id,
        )
        .first()
    )
    if not app:
        raise NotFoundException("Recruitment application")
    return app


def _get_opening_or_404(db: Session, org_id: str, opening_id: str) -> JobOpening:
    opening = (
        db.query(JobOpening)
        .filter(
            JobOpening.organization_id == org_id,
            JobOpening.id == opening_id,
        )
        .first()
    )
    if not opening:
        raise NotFoundException("Job opening")
    return opening


def _validate_assigned_hr_member(
    db: Session, org_id: str, department_id: str, member_id: str
) -> OrganizationMember:
    target_member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == org_id,
        )
        .first()
    )
    if not target_member or target_member.status != models.OrgMemberStatusEnum.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned HR must be an active organization member",
        )
    role_name = getattr(target_member.role, "name", None)
    if role_name not in ["MANAGER", "ADMIN", "OWNER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned HR member must have role MANAGER, ADMIN, or OWNER",
        )

    # OWNER, ADMIN, or members with recruitment.manage have full authority across all departments
    is_privileged = (
        role_name in ["OWNER", "ADMIN"]
        or (target_member.organization and target_member.organization.created_by_id == target_member.user_id)
        or has_effective_permission(db, target_member, "recruitment.manage")
        or has_effective_permission(db, target_member, "recruitment.read_all")
    )

    if not is_privileged:
        if not has_effective_permission(db, target_member, "recruitment.review"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned HR member must have recruitment.review permission",
            )
        is_dept_member = (
            db.query(DepartmentMember)
            .filter(
                DepartmentMember.department_id == department_id,
                DepartmentMember.user_id == target_member.user_id,
            )
            .first()
        )
        if not is_dept_member:
            hr_dept = (
                db.query(Department)
                .join(DepartmentMember, DepartmentMember.department_id == Department.id)
                .filter(
                    Department.organization_id == org_id,
                    DepartmentMember.user_id == target_member.user_id,
                    Department.name.ilike("%nhân sự%")
                    | Department.name.ilike("%hr%")
                    | Department.name.ilike("%tuyển dụng%"),
                )
                .first()
            )
            if not hr_dept:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned HR member must belong to the job opening department or HR division",
                )
    return target_member


# ---------------------------------------------------------------------------
# Navigation & Identity
# ---------------------------------------------------------------------------
@router.get("/me", response_model=RecruitmentMeResponse)
def get_recruitment_me(
    org_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Return caller's recruitment role, effective permissions and department IDs."""
    permissions = get_effective_permissions(db, member)
    dept_memberships = (
        db.query(DepartmentMember.department_id)
        .filter(DepartmentMember.user_id == member.user_id)
        .all()
    )
    department_ids = [d[0] for d in dept_memberships]
    role_name = member.role.name if member.role else None
    return RecruitmentMeResponse(
        role=role_name,
        permissions=permissions,
        department_ids=department_ids,
    )


# ---------------------------------------------------------------------------
# Retention Policy
# ---------------------------------------------------------------------------
@router.get("/policy", response_model=RecruitmentPolicyResponse)
def get_recruitment_policy(
    org_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Retrieve recruitment policy for the organization (defaults to 180 days)."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Owner or recruitment.manage permission required")

    policy = (
        db.query(RecruitmentPolicy)
        .filter(RecruitmentPolicy.organization_id == org_id)
        .first()
    )
    if not policy:
        policy = RecruitmentPolicy(organization_id=org_id, retention_days=180)
        db.add(policy)
        db.commit()
        db.refresh(policy)
    return policy


@router.put("/policy", response_model=RecruitmentPolicyResponse)
def update_recruitment_policy(
    org_id: str,
    payload: RecruitmentPolicyUpdate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Update recruitment retention policy (30 to 730 days)."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Owner or recruitment.manage permission required")

    policy = (
        db.query(RecruitmentPolicy)
        .filter(RecruitmentPolicy.organization_id == org_id)
        .first()
    )
    if not policy:
        policy = RecruitmentPolicy(
            organization_id=org_id, retention_days=payload.retention_days
        )
        db.add(policy)
    else:
        policy.retention_days = payload.retention_days
    db.commit()
    db.refresh(policy)
    return policy


# ---------------------------------------------------------------------------
# Manager Review Grant Management
# ---------------------------------------------------------------------------
@router.get("/managers/review-grants", response_model=List[ReviewGrantResponse])
def get_manager_review_grants(
    org_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """List review grant status for all organization members."""
    from src.backend.services.recruitment_permissions import has_effective_permission

    review_perm = db.query(Permission).filter(Permission.code == "recruitment.review").first()
    if not review_perm:
        return []

    grants = (
        db.query(OrganizationMemberPermission)
        .join(OrganizationMember, OrganizationMember.id == OrganizationMemberPermission.member_id)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMemberPermission.permission_id == review_perm.id,
        )
        .all()
    )
    granted_ids = {g.member_id for g in grants}

    # Also check if any org member has it via role
    org_members = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org_id)
        .all()
    )
    for m in org_members:
        if m.id not in granted_ids and has_effective_permission(db, m, "recruitment.review"):
            granted_ids.add(m.id)

    return [ReviewGrantResponse(member_id=mid, enabled=True) for mid in granted_ids]


@router.put("/managers/{member_id}/review-grant", response_model=ReviewGrantResponse)
def toggle_manager_review_grant(
    org_id: str,
    member_id: str,
    payload: ReviewGrantUpdate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Enable or disable direct recruitment.review permission grant for an HR Manager."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Only Owner or recruitment.manage can grant/revoke reviewer permissions")

    target_member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == org_id,
        )
        .first()
    )
    if not target_member:
        raise NotFoundException("Organization member")

    review_perm = db.query(Permission).filter(Permission.code == "recruitment.review").first()
    if not review_perm:
        raise NotFoundException("Permission recruitment.review")

    existing_grant = (
        db.query(OrganizationMemberPermission)
        .filter(
            OrganizationMemberPermission.member_id == target_member.id,
            OrganizationMemberPermission.permission_id == review_perm.id,
        )
        .first()
    )

    if payload.enabled:
        if not existing_grant:
            new_grant = OrganizationMemberPermission(
                member_id=target_member.id,
                permission_id=review_perm.id,
                granted_by_id=member.user_id,
            )
            db.add(new_grant)
            db.commit()
        return ReviewGrantResponse(member_id=member_id, enabled=True)
    else:
        # Check if manager still owns active opening or active application
        active_openings = (
            db.query(JobOpening)
            .filter(
                JobOpening.organization_id == org_id,
                JobOpening.assigned_hr_member_id == target_member.id,
                JobOpening.status != JobOpeningStatusEnum.CLOSED,
            )
            .count()
        )
        active_apps = (
            db.query(RecruitmentApplication)
            .filter(
                RecruitmentApplication.organization_id == org_id,
                RecruitmentApplication.assigned_hr_member_id == target_member.id,
                RecruitmentApplication.stage.notin_(TERMINAL_STAGES),
            )
            .count()
        )
        if active_openings > 0 or active_apps > 0:
            raise ConflictException(
                "Manager still has active job openings or applications assigned. Reassign them first."
            )

        if existing_grant:
            db.delete(existing_grant)
            db.commit()
        return ReviewGrantResponse(member_id=member_id, enabled=False)


# ---------------------------------------------------------------------------
# Job Openings
# ---------------------------------------------------------------------------
@router.post("/openings", response_model=JobOpeningResponse, status_code=status.HTTP_201_CREATED)
def create_job_opening(
    org_id: str,
    payload: JobOpeningCreate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Create a new job opening."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Owner or recruitment.manage permission required")

    dept = (
        db.query(Department)
        .filter(
            Department.id == payload.department_id,
            Department.organization_id == org_id,
        )
        .first()
    )
    if not dept:
        raise NotFoundException("Department")

    if payload.assigned_hr_member_id:
        _validate_assigned_hr_member(db, org_id, payload.department_id, payload.assigned_hr_member_id)

    opening = JobOpening(
        organization_id=org_id,
        department_id=payload.department_id,
        title=payload.title,
        description=payload.description,
        requirements=payload.requirements,
        salary_range=payload.salary_range,
        level=payload.level,
        work_type=payload.work_type,
        location=payload.location,
        benefits=payload.benefits,
        status=payload.status or JobOpeningStatusEnum.ACTIVE,
        created_by_id=member.user_id,
        assigned_hr_member_id=payload.assigned_hr_member_id,
        requires_assessment=payload.requires_assessment,
        assessment_definition_id=payload.assessment_definition_id,
        competency_rubric_json=payload.competency_rubric_json,
        rubric_version=payload.rubric_version,
    )
    db.add(opening)
    db.commit()
    db.refresh(opening)
    return opening


@router.get("/openings", response_model=List[JobOpeningResponse])
def list_job_openings(
    org_id: str,
    department_id: Optional[str] = None,
    status_filter: Optional[JobOpeningStatusEnum] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """List job openings for the organization."""
    query = db.query(JobOpening).filter(JobOpening.organization_id == org_id)
    if department_id:
        query = query.filter(JobOpening.department_id == department_id)
    if status_filter:
        query = query.filter(JobOpening.status == status_filter)
    return query.order_by(JobOpening.created_at.desc()).all()


@router.get("/openings/{opening_id}", response_model=JobOpeningResponse)
def get_job_opening(
    org_id: str,
    opening_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Get single job opening detail."""
    return _get_opening_or_404(db, org_id, opening_id)


@router.put("/openings/{opening_id}", response_model=JobOpeningResponse)
def update_job_opening(
    org_id: str,
    opening_id: str,
    payload: JobOpeningUpdate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Update job opening."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Owner or recruitment.manage permission required")

    opening = _get_opening_or_404(db, org_id, opening_id)

    target_dept_id = opening.department_id
    if payload.department_id:
        dept = db.query(Department).filter(Department.id == payload.department_id, Department.organization_id == org_id).first()
        if not dept:
            raise NotFoundException("Department")
        target_dept_id = payload.department_id

    if payload.assigned_hr_member_id:
        _validate_assigned_hr_member(db, org_id, target_dept_id, payload.assigned_hr_member_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(opening, field, val)

    db.commit()
    db.refresh(opening)
    return opening


@router.delete("/openings/{opening_id}")
def delete_job_opening(
    org_id: str,
    opening_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Delete a job opening. Only Owner or recruitment.manage permission required."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Owner or recruitment.manage permission required")

    opening = _get_opening_or_404(db, org_id, opening_id)
    title = opening.title
    db.delete(opening)
    db.commit()
    return {"success": True, "message": f"Đã xóa vị trí tuyển dụng '{title}' thành công."}



# ---------------------------------------------------------------------------
# Applications & Candidate Invitations
# ---------------------------------------------------------------------------
@router.post("/applications", response_model=ApplicationInviteResponse, status_code=status.HTTP_201_CREATED)
def create_candidate_application(
    org_id: str,
    payload: ApplicationInviteCreate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Invite a candidate to an opening, creating candidate, application, and invitation token."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Owner or recruitment.manage permission required")

    opening = _get_opening_or_404(db, org_id, payload.opening_id)

    # 1. Find or create candidate
    candidate = (
        db.query(Candidate)
        .filter(Candidate.organization_id == org_id, Candidate.email == payload.candidate_email)
        .first()
    )
    if not candidate:
        candidate = Candidate(
            organization_id=org_id,
            email=payload.candidate_email,
            full_name=payload.candidate_name,
            phone=payload.candidate_phone,
            notes=payload.notes,
        )
        db.add(candidate)
        db.flush()
    else:
        if payload.candidate_name and not candidate.full_name:
            candidate.full_name = payload.candidate_name
        if payload.candidate_phone and not candidate.phone:
            candidate.phone = payload.candidate_phone

    # 2. Check duplicate active application
    existing_app = (
        db.query(RecruitmentApplication)
        .filter(
            RecruitmentApplication.opening_id == opening.id,
            RecruitmentApplication.candidate_id == candidate.id,
        )
        .first()
    )
    if existing_app:
        raise ConflictException("Candidate already has an application for this job opening")

    # 3. Determine assigned HR
    assigned_hr = payload.assigned_hr_member_id or opening.assigned_hr_member_id
    if assigned_hr:
        _validate_assigned_hr_member(db, org_id, opening.department_id, assigned_hr)

    # 4. Create application
    application = RecruitmentApplication(
        organization_id=org_id,
        opening_id=opening.id,
        candidate_id=candidate.id,
        assigned_hr_member_id=assigned_hr,
        stage=RecruitmentStageEnum.INVITED,
        version=1,
    )
    db.add(application)
    db.flush()

    # 5. Generate secure invitation token
    raw_token = generate_invitation_token()
    token_hash = hash_recruitment_token(raw_token)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)

    invitation = RecruitmentInvitation(
        organization_id=org_id,
        application_id=application.id,
        token_hash=token_hash,
        expires_at=expires_at,
        delivery_status="PENDING",
        delivery_attempts=1,
    )
    db.add(invitation)

    # 6. Audit event
    record_recruitment_event(
        db,
        application,
        action="CREATE_APPLICATION",
        actor_id=member.user_id,
        metadata={"candidate_email": candidate.email, "opening_id": opening.id},
    )

    db.commit()
    db.refresh(application)
    db.refresh(invitation)

    # 7. Dispatch invitation email
    portal_url = f"/recruitment/portal?token={raw_token}"
    email_res = send_recruitment_invitation_email(
        candidate_email=candidate.email,
        candidate_name=candidate.full_name,
        opening_title=opening.title,
        organization_name=member.organization.name if member.organization else "Axiom",
        portal_url=portal_url,
        expires_at_str=expires_at.strftime("%Y-%m-%d %H:%M UTC"),
    )
    invitation.delivery_status = "SENT" if email_res.get("sent") else "FAILED"
    db.commit()

    return ApplicationInviteResponse(
        application_id=application.id,
        candidate_id=candidate.id,
        invitation_token=raw_token,
        delivery_status=invitation.delivery_status,
    )


@router.post("/applications/{application_id}/resend-invitation", response_model=ApplicationInviteResponse)
def resend_application_invitation(
    org_id: str,
    application_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Revoke existing invitation tokens and issue a fresh invitation link to candidate."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Owner or recruitment.manage permission required")

    application = _get_application_or_404(db, org_id, application_id)
    candidate = application.candidate
    opening = application.opening

    now = datetime.now(timezone.utc)
    # Revoke old active invitations
    active_invs = (
        db.query(RecruitmentInvitation)
        .filter(
            RecruitmentInvitation.application_id == application.id,
            RecruitmentInvitation.revoked_at == None,
        )
        .all()
    )
    for inv in active_invs:
        inv.revoked_at = now

    raw_token = generate_invitation_token()
    token_hash = hash_recruitment_token(raw_token)
    expires_at = now + timedelta(days=7)

    invitation = RecruitmentInvitation(
        organization_id=org_id,
        application_id=application.id,
        token_hash=token_hash,
        expires_at=expires_at,
        delivery_status="PENDING",
        delivery_attempts=1,
    )
    db.add(invitation)

    record_recruitment_event(
        db,
        application,
        action="RESEND_INVITATION",
        actor_id=member.user_id,
        metadata={"candidate_email": candidate.email},
    )
    db.commit()
    db.refresh(invitation)

    portal_url = f"/recruitment/portal?token={raw_token}"
    email_res = send_recruitment_invitation_email(
        candidate_email=candidate.email,
        candidate_name=candidate.full_name,
        opening_title=opening.title,
        organization_name=member.organization.name if member.organization else "Axiom",
        portal_url=portal_url,
        expires_at_str=expires_at.strftime("%Y-%m-%d %H:%M UTC"),
    )
    invitation.delivery_status = "SENT" if email_res.get("sent") else "FAILED"
    db.commit()

    return ApplicationInviteResponse(
        application_id=application.id,
        candidate_id=candidate.id,
        invitation_token=raw_token,
        delivery_status=invitation.delivery_status,
    )


# ---------------------------------------------------------------------------
# Assessment Definitions & Assignment
# ---------------------------------------------------------------------------
@router.post("/assessment-definitions", response_model=AssessmentDefinitionResponse, status_code=status.HTTP_201_CREATED)
def create_assessment_definition(
    org_id: str,
    payload: AssessmentDefinitionCreate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Create a new versioned assessment definition."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Owner or recruitment.manage permission required")

    service = AssessmentService(db)
    return service.create_definition(org_id, payload)


@router.get("/assessment-definitions", response_model=List[AssessmentDefinitionResponse])
def list_assessment_definitions(
    org_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """List assessment definitions for the organization."""
    return (
        db.query(AssessmentDefinition)
        .filter(AssessmentDefinition.organization_id == org_id)
        .order_by(AssessmentDefinition.created_at.desc())
        .all()
    )


@router.post("/applications/{application_id}/assign-assessment", response_model=AssessmentAttemptResponse)
def assign_application_assessment(
    org_id: str,
    application_id: str,
    payload: AssignAssessmentRequest,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Assign an assessment definition to an application, taking an immutable snapshot."""
    application = _get_application_or_404(db, org_id, application_id)
    assert_recruitment_reviewer(db, member, application)

    service = AssessmentService(db)
    return service.assign_attempt(
        application_id=application.id,
        definition_id=payload.definition_id,
        actor_member=member,
        duration_minutes_override=payload.duration_minutes_override,
    )


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
@router.get("/applications", response_model=List[ApplicationSummary])
def list_applications(
    org_id: str,
    opening_id: Optional[str] = None,
    stage: Optional[RecruitmentStageEnum] = None,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """List applications. Owner/recruitment.manage/read_all sees all; Reviewers see assigned or department apps."""
    query = db.query(RecruitmentApplication).filter(RecruitmentApplication.organization_id == org_id)

    if not (_is_owner(member) or has_effective_permission(db, member, "recruitment.manage") or has_effective_permission(db, member, "recruitment.read_all")):
        if has_effective_permission(db, member, "recruitment.review"):
            dept_ids = [
                d[0]
                for d in db.query(DepartmentMember.department_id)
                .filter(DepartmentMember.user_id == member.user_id)
                .all()
            ]
            query = query.filter(
                (RecruitmentApplication.assigned_hr_member_id == member.id)
                | (
                    RecruitmentApplication.opening.has(
                        JobOpening.department_id.in_(dept_ids)
                    )
                )
            )
        else:
            raise ForbiddenException("Missing recruitment review permissions")

    if opening_id:
        query = query.filter(RecruitmentApplication.opening_id == opening_id)
    if stage:
        query = query.filter(RecruitmentApplication.stage == stage)

    return query.order_by(RecruitmentApplication.created_at.desc()).all()


@router.get("/applications/{application_id}", response_model=ApplicationDetail)
def get_application(
    org_id: str,
    application_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Get single application detail (enforces reviewer & department authorization)."""
    application = _get_application_or_404(db, org_id, application_id)
    assert_recruitment_reviewer(db, member, application)
    return application


@router.put("/applications/{application_id}/assign-hr", response_model=ApplicationDetail)
def assign_application_hr(
    org_id: str,
    application_id: str,
    payload: AssignHRUpdate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Assign or reassign an HR reviewer to an application."""
    if not _can_manage_recruitment(db, member):
        raise ForbiddenException("Owner or recruitment.manage permission required")

    application = _get_application_or_404(db, org_id, application_id)

    if payload.assigned_hr_member_id:
        _validate_assigned_hr_member(
            db, org_id, application.opening.department_id, payload.assigned_hr_member_id
        )

    application.assigned_hr_member_id = payload.assigned_hr_member_id
    record_recruitment_event(
        db,
        application,
        action="REASSIGN_HR",
        actor_id=member.user_id,
        metadata={"new_hr_id": payload.assigned_hr_member_id},
    )
    db.commit()
    db.refresh(application)
    return application


# ---------------------------------------------------------------------------
# CV Screening & Approval
# ---------------------------------------------------------------------------
@router.post("/applications/{application_id}/cv-approval")
def submit_cv_approval(
    org_id: str,
    application_id: str,
    payload: CVApprovalCreate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Review and approve/reject candidate submitted CV, unlocking candidate assessment or advancing stage."""
    application = _get_application_or_404(db, org_id, application_id)
    assert_recruitment_reviewer(db, member, application)

    if application.stage != RecruitmentStageEnum.INVITED:
        raise ConflictException(f"Chỉ có thể thẩm định CV khi đơn ứng tuyển ở trạng thái INVITED (Chờ duyệt). Hiện tại là {application.stage.value}")

    opening = application.opening
    candidate = application.candidate
    candidate_user = db.query(models.User).filter(models.User.email == candidate.email).first() if candidate else None

    workflow = RecruitmentWorkflow(db)
    from src.backend.api.v1.notifications import send_user_notification

    if payload.decision == "APPROVE":
        needs_test = opening.requires_assessment if opening else False
        action = "APPROVE_CV" if needs_test else "APPROVE_CV_NO_TEST"
        msg = f"Hồ sơ CV của bạn cho vị trí '{opening.title if opening else ''}' đã được ban tuyển dụng phê duyệt."
        if needs_test:
            msg += " Hệ thống đã mở bài kiểm tra đánh giá năng lực, vui lòng hoàn thành bài test."
        else:
            msg += " Vui lòng chờ thông báo lịch phỏng vấn từ ban tuyển dụng."

        workflow.advance(
            application.id,
            RecruitmentCommand(action=action, metadata={"decision": "APPROVE", "reason": payload.reason}),
            actor_member=member,
            expected_version=payload.expected_version,
        )

        if needs_test:
            try:
                from src.backend.api.v1.candidate_recruitment import ensure_application_assessment_attempt
                ensure_application_assessment_attempt(db, application)
            except Exception as att_err:
                import logging
                logging.getLogger(__name__).warning(f"Could not provision assessment attempt on CV approval: {att_err}")

        if candidate_user:
            send_user_notification(
                db=db,
                user_id=candidate_user.id,
                title="Hồ sơ CV đã được phê duyệt! 🎉",
                content=msg,
                type="CV_APPROVED",
                link="/candidate/discovery?tab=applications",
            )

        if candidate:
            try:
                org = application.organization
                import secrets
                from src.backend.core.config import get_settings
                from src.backend.services.email_service import send_candidate_cv_approved_email

                raw_token = secrets.token_urlsafe(32)
                token_hash = hash_recruitment_token(raw_token)
                now_utc = datetime.now(timezone.utc)

                inv = db.query(RecruitmentInvitation).filter_by(application_id=application.id).first()
                if inv:
                    inv.token_hash = token_hash
                    inv.expires_at = now_utc + timedelta(days=30)
                    inv.revoked_at = None
                else:
                    inv = RecruitmentInvitation(
                        organization_id=application.organization_id,
                        application_id=application.id,
                        token_hash=token_hash,
                        expires_at=now_utc + timedelta(days=30),
                        max_uses=100,
                    )
                    db.add(inv)
                db.flush()

                cfg = get_settings()
                frontend_base = (cfg.frontend_base_url or "http://localhost:3001").rstrip("/")
                test_link = f"{frontend_base}/assessment?token={raw_token}"

                send_candidate_cv_approved_email(
                    candidate_email=candidate.email,
                    candidate_name=candidate.full_name or "Ứng viên",
                    opening_title=opening.title if opening else "Vị trí tuyển dụng",
                    organization_name=org.name if org else "Axiom Enterprise",
                    test_url=test_link,
                    requires_test=needs_test,
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to send CV approval email: {e}")

        return {"success": True, "stage": application.stage.value, "message": "CV đã được duyệt thành công"}
    else:
        workflow.advance(
            application.id,
            RecruitmentCommand(action="REJECT_CV", metadata={"decision": "REJECT", "reason": payload.reason}),
            actor_member=member,
            expected_version=payload.expected_version,
        )
        if candidate:
            try:
                org = application.organization
                send_candidate_rejection_email(
                    candidate_email=candidate.email,
                    candidate_name=candidate.full_name,
                    opening_title=opening.title if opening else "Vị trí tuyển dụng",
                    organization_name=org.name if org else "Axiom Enterprise",
                    reason=payload.reason,
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to send rejection email: {e}")

        if candidate_user:
            send_user_notification(
                db=db,
                user_id=candidate_user.id,
                title="Thông báo kết quả duyệt hồ sơ ứng tuyển",
                content=f"Rất tiếc hồ sơ ứng tuyển của bạn cho vị trí '{opening.title if opening else ''}' chưa phù hợp ở thời điểm hiện tại.",
                type="APPLICATION_REJECTED",
                link="/candidate/discovery?tab=applications",
            )
        return {"success": True, "stage": application.stage.value, "message": "CV đã bị từ chối"}


# ---------------------------------------------------------------------------
# HR Review & Owner Approval
# ---------------------------------------------------------------------------
@router.post("/applications/{application_id}/hr-review", response_model=HRReviewResponse)
def submit_hr_review(
    org_id: str,
    application_id: str,
    payload: HRReviewCreate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Submit HR Review decision and advance recruitment workflow."""
    application = _get_application_or_404(db, org_id, application_id)
    assert_recruitment_reviewer(db, member, application)

    # Check idempotency
    existing = db.query(HRReview).filter(HRReview.application_id == application.id).first()
    if existing:
        if existing.decision == payload.decision and existing.reason == payload.reason:
            return existing
        raise ConflictException("HR review already submitted with a different decision")

    if application.stage != RecruitmentStageEnum.HR_REVIEW_PENDING:
        if application.stage in [
            RecruitmentStageEnum.INTERVIEW_SCHEDULED,
            RecruitmentStageEnum.INTERVIEW_COMPLETED,
            RecruitmentStageEnum.ASSESSMENT_SUBMITTED,
        ]:
            application.stage = RecruitmentStageEnum.HR_REVIEW_PENDING
            db.commit()
            db.refresh(application)
        else:
            raise ConflictException(f"Cannot submit HR review in stage {application.stage}")

    if payload.decision == HRDecisionEnum.RECOMMEND_HIRE:
        action = "HR_HIRE"
    elif payload.decision == HRDecisionEnum.RECOMMEND_REJECT:
        action = "HR_NO_HIRE"
    elif payload.decision == HRDecisionEnum.NEEDS_MORE_EVIDENCE:
        action = "REQUEST_ASSESSMENT" if (application.opening and application.opening.requires_assessment) else "REQUEST_INTERVIEW"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid decision")

    review = HRReview(
        application_id=application.id,
        reviewer_member_id=member.id,
        decision=payload.decision,
        reason=payload.reason,
        ai_diff_reason=payload.ai_diff_reason,
    )
    db.add(review)

    workflow = RecruitmentWorkflow(db)
    try:
        workflow.advance(
            application.id,
            RecruitmentCommand(
                action=action,
                metadata={"reason": payload.reason, "decision": payload.decision.value},
            ),
            actor_member=member,
            expected_version=payload.expected_version,
        )
    except RecruitmentConflict as e:
        db.rollback()
        raise ConflictException(str(e))

    if payload.decision == HRDecisionEnum.RECOMMEND_REJECT:
        candidate = application.candidate
        candidate_user = db.query(models.User).filter(models.User.email == candidate.email).first() if candidate else None
        opening = application.opening
        org = application.organization
        if candidate:
            try:
                send_candidate_rejection_email(
                    candidate_email=candidate.email,
                    candidate_name=candidate.full_name,
                    opening_title=opening.title if opening else "Vị trí tuyển dụng",
                    organization_name=org.name if org else "Axiom Enterprise",
                    reason=payload.reason,
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to send rejection email: {e}")
        if candidate_user:
            from src.backend.api.v1.notifications import send_user_notification
            send_user_notification(
                db=db,
                user_id=candidate_user.id,
                title="Thông báo kết quả đánh giá tuyển dụng",
                content=f"Rất tiếc hồ sơ ứng tuyển của bạn cho vị trí '{opening.title if opening else ''}' chưa đạt yêu cầu trong đợt tuyển dụng này.",
                type="APPLICATION_REJECTED",
                link="/candidate/discovery?tab=applications",
            )

    db.refresh(review)
    return review


@router.post("/applications/{application_id}/owner-approval", response_model=OwnerApprovalResponse)
def submit_owner_approval(
    org_id: str,
    application_id: str,
    payload: OwnerApprovalCreate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Submit final Owner/Manager approval decision and advance recruitment workflow."""
    if not (_is_owner(member) or getattr(member.role, "name", "").upper() == "MANAGER" or has_effective_permission(db, member, "recruitment.approve")):
        raise ForbiddenException("Owner, Manager or recruitment.approve permission required")

    application = _get_application_or_404(db, org_id, application_id)

    # Check idempotency
    existing = db.query(OwnerApproval).filter(OwnerApproval.application_id == application.id).first()
    if existing:
        if existing.decision == payload.decision:
            return existing
        raise ConflictException("Owner approval already submitted with a different decision")

    if application.stage != RecruitmentStageEnum.OWNER_APPROVAL_PENDING:
        raise ConflictException(f"Cannot submit owner approval in stage {application.stage}")

    if payload.decision == OwnerDecisionEnum.APPROVE:
        action = "OWNER_APPROVE"
    elif payload.decision == OwnerDecisionEnum.REJECT:
        action = "OWNER_REJECT"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid decision")

    approval = OwnerApproval(
        application_id=application.id,
        approver_user_id=member.user_id,
        decision=payload.decision,
        reason=payload.reason,
    )
    db.add(approval)

    workflow = RecruitmentWorkflow(db)
    try:
        workflow.advance(
            application.id,
            RecruitmentCommand(
                action=action,
                metadata={"reason": payload.reason, "decision": payload.decision.value},
            ),
            actor_member=member,
            expected_version=payload.expected_version,
        )
    except RecruitmentConflict as e:
        db.rollback()
        raise ConflictException(str(e))

    if payload.decision == OwnerDecisionEnum.REJECT:
        candidate = application.candidate
        candidate_user = db.query(models.User).filter(models.User.email == candidate.email).first() if candidate else None
        opening = application.opening
        org = application.organization
        if candidate:
            try:
                send_candidate_rejection_email(
                    candidate_email=candidate.email,
                    candidate_name=candidate.full_name,
                    opening_title=opening.title if opening else "Vị trí tuyển dụng",
                    organization_name=org.name if org else "Axiom Enterprise",
                    reason=payload.reason,
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to send rejection email: {e}")
        if candidate_user:
            from src.backend.api.v1.notifications import send_user_notification
            send_user_notification(
                db=db,
                user_id=candidate_user.id,
                title="Thông báo kết quả phê duyệt tuyển dụng",
                content=f"Rất tiếc hồ sơ ứng tuyển của bạn cho vị trí '{opening.title if opening else ''}' chưa được phê duyệt trong đợt tuyển dụng này.",
                type="APPLICATION_REJECTED",
                link="/candidate/discovery?tab=applications",
            )

    db.refresh(approval)
    return approval


class RejectApplicationRequest(BaseModel):
    reason: Optional[str] = None
    expected_version: Optional[int] = None


@router.post("/applications/{application_id}/reject")
def reject_application(
    org_id: str,
    application_id: str,
    payload: RejectApplicationRequest = RejectApplicationRequest(),
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Directly reject a recruitment application at any active stage, sending email & in-app notification."""
    application = _get_application_or_404(db, org_id, application_id)
    assert_recruitment_reviewer(db, member, application)

    if application.stage in TERMINAL_STAGES:
        raise ConflictException(f"Đơn ứng tuyển đã ở trạng thái kết thúc ({application.stage.value}).")

    workflow = RecruitmentWorkflow(db)
    try:
        workflow.advance(
            application.id,
            RecruitmentCommand(
                action="REJECT",
                metadata={"reason": payload.reason, "rejected_by": member.user_id},
            ),
            actor_member=member,
            expected_version=payload.expected_version or application.version,
        )
    except RecruitmentConflict as e:
        db.rollback()
        raise ConflictException(str(e))

    candidate = application.candidate
    candidate_user = db.query(models.User).filter(models.User.email == candidate.email).first() if candidate else None
    opening = application.opening
    org = application.organization

    if candidate:
        try:
            send_candidate_rejection_email(
                candidate_email=candidate.email,
                candidate_name=candidate.full_name,
                opening_title=opening.title if opening else "Vị trí tuyển dụng",
                organization_name=org.name if org else "Axiom Enterprise",
                reason=payload.reason,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to send rejection email: {e}")

    if candidate_user:
        from src.backend.api.v1.notifications import send_user_notification
        send_user_notification(
            db=db,
            user_id=candidate_user.id,
            title="Thông báo kết quả ứng tuyển",
            content=f"Rất tiếc hồ sơ ứng tuyển của bạn cho vị trí '{opening.title if opening else ''}' chưa đạt yêu cầu trong đợt tuyển dụng này.",
            type="APPLICATION_REJECTED",
            link="/candidate/discovery?tab=applications",
        )

    return {"success": True, "stage": application.stage.value, "message": "Đã từ chối đơn ứng tuyển và gửi thông báo."}


@router.post("/applications/{application_id}/move-stage")
def move_application_stage(
    org_id: str,
    application_id: str,
    payload: MoveStageRequest,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Universal pipeline kanban drag & drop stage transition endpoint."""
    application = _get_application_or_404(db, org_id, application_id)
    assert_recruitment_reviewer(db, member, application)

    target_stage_str = payload.target_stage.strip().upper()
    try:
        target_stage_enum = RecruitmentStageEnum(target_stage_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái mục tiêu '{payload.target_stage}' không hợp lệ.",
        )

    current_stage = application.stage
    if current_stage == target_stage_enum:
        return {
            "success": True,
            "stage": application.stage.value,
            "version": application.version,
            "message": "Hồ sơ đã ở giai đoạn này.",
        }

    # If moving to ASSESSMENT_PENDING from INVITED, perform CV approval (with test provisioning and email dispatch)
    if target_stage_enum == RecruitmentStageEnum.ASSESSMENT_PENDING and current_stage == RecruitmentStageEnum.INVITED:
        return submit_cv_approval(
            org_id=org_id,
            application_id=application_id,
            payload=CVApprovalCreate(
                decision="APPROVE",
                reason=payload.reason or "Duyệt hồ sơ CV qua thao tác kéo thả Pipeline",
                expected_version=payload.expected_version or application.version,
            ),
            db=db,
            member=member,
        )

    # If moving to REJECTED, perform rejection flow
    if target_stage_enum == RecruitmentStageEnum.REJECTED:
        return reject_application(
            org_id=org_id,
            application_id=application_id,
            payload=RejectApplicationRequest(
                reason=payload.reason or "Từ chối hồ sơ qua thao tác kéo thả Pipeline",
                expected_version=payload.expected_version or application.version,
            ),
            db=db,
            member=member,
        )

    # For other transitions (e.g. INTERVIEW_SCHEDULED, HR_REVIEW_PENDING, OWNER_APPROVAL_PENDING, APPROVED, HIRED, etc.):
    application.stage = target_stage_enum
    application.version = (application.version or 1) + 1

    # Audit log
    from src.backend.services.recruitment_workflow import record_recruitment_event
    record_recruitment_event(
        db=db,
        application=application,
        action=f"DRAG_DROP_MOVE_TO_{target_stage_str}",
        actor_id=member.user_id,
        metadata={"previous_stage": current_stage.value, "target_stage": target_stage_str, "reason": payload.reason},
    )

    db.commit()
    db.refresh(application)

    return {
        "success": True,
        "stage": application.stage.value,
        "version": application.version,
        "message": f"Đã chuyển ứng viên sang giai đoạn {target_stage_str}",
    }


@router.post("/applications/{application_id}/issue-onboarding", response_model=IssueOnboardingResponse)
def issue_application_onboarding(
    org_id: str,
    application_id: str,
    payload: IssueOnboardingRequest,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Issue employee onboarding invitation to an approved candidate."""
    if not (_is_owner(member) or getattr(member.role, "name", "").upper() == "MANAGER" or has_effective_permission(db, member, "recruitment.approve")):
        raise ForbiddenException("Owner, Manager or recruitment.approve permission required")

    service = OnboardingService(db)
    issued = service.issue_invitation(application_id, member, idempotency_key=payload.idempotency_key)
    return IssueOnboardingResponse(
        invitation_id=issued.invitation.id,
        application_id=application_id,
        raw_token=issued.raw_token,
        register_url=issued.register_url,
        status=issued.invitation.status.value,
    )


# ---------------------------------------------------------------------------
# Interviews
# ---------------------------------------------------------------------------
@router.post(
    "/applications/{application_id}/interviews",
    response_model=InterviewSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def schedule_application_interview(
    org_id: str,
    application_id: str,
    payload: InterviewScheduleCreate,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Schedule an interview session linked to a dedicated meeting."""
    application = _get_application_or_404(db, org_id, application_id)
    assert_recruitment_reviewer(db, member, application)

    service = InterviewService(db)
    return service.schedule(
        application_id=application.id,
        scheduled_at=payload.scheduled_at,
        interviewer_member_ids=payload.interviewer_member_ids,
        actor_member=member,
    )


@router.post(
    "/interviews/{interview_id}/complete",
    response_model=InterviewSessionResponse,
)
def complete_interview_session(
    org_id: str,
    interview_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Mark an interview session as completed and advance application stage."""
    service = InterviewService(db)
    return service.complete_interview(interview_id, actor_member=member)


# ---------------------------------------------------------------------------
# AI Evaluation
# ---------------------------------------------------------------------------
@router.post(
    "/applications/{application_id}/ai-evaluations",
    response_model=AIEvaluationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def run_application_ai_evaluation(
    org_id: str,
    application_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
    evaluator: CandidateEvaluator = Depends(get_candidate_evaluator),
):
    """Trigger evidence-backed AI evaluation of candidate assessments and interviews."""
    application = _get_application_or_404(db, org_id, application_id)
    assert_recruitment_reviewer(db, member, application)

    service = EvaluationService(db)
    return await service.run(
        application_id=application.id,
        actor_member=member,
        evaluator=evaluator,
    )


# ---------------------------------------------------------------------------
# Interview Dialogue Scorecard & Archive Confirmation
# ---------------------------------------------------------------------------
@router.get(
    "/interviews/by-meeting/{meeting_id}",
    response_model=InterviewSessionResponse,
)
def get_interview_by_meeting_endpoint(
    org_id: str,
    meeting_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Find interview session associated with a meeting ID."""
    interview = (
        db.query(models.InterviewSession)
        .join(models.RecruitmentApplication)
        .filter(
            models.InterviewSession.meeting_id == meeting_id,
            models.RecruitmentApplication.organization_id == org_id,
        )
        .first()
    )
    if not interview:
        raise NotFoundException("Interview session not found for this meeting")
    return interview


@router.get(
    "/interviews/{interview_id}/scorecard",
)
def get_interview_scorecard_endpoint(
    org_id: str,
    interview_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Retrieve or generate AI interaction dialogue scorecard for an interview session."""
    service = EvaluationService(db)
    return service.get_interview_scorecard(interview_id)


@router.post(
    "/interviews/{interview_id}/archive-confirm",
)
def confirm_interview_archive_endpoint(
    org_id: str,
    interview_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Confirm and transfer interview session to the Organization Meeting & Document Archive."""
    service = EvaluationService(db)
    return service.archive_interview_to_repository(interview_id, actor_member=member)


# ---------------------------------------------------------------------------
# Candidate Attached Resume Viewer
# ---------------------------------------------------------------------------
@router.get(
    "/applications/{application_id}/resume",
    response_model=UserResumeResponse,
)
def get_application_resume_endpoint(
    org_id: str,
    application_id: str,
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Retrieve full Canva Studio resume associated with candidate application."""
    application = _get_application_or_404(db, org_id, application_id)
    assert_recruitment_reviewer(db, member, application)

    candidate = application.candidate
    if not candidate or not candidate.cv_url:
        raise NotFoundException("Candidate did not attach a resume")

    if candidate.cv_url.startswith("resume://"):
        resume_id = candidate.cv_url.replace("resume://", "").strip()
        resume = db.query(models.UserResume).filter_by(id=resume_id).first()
        if not resume:
            raise NotFoundException("Resume record not found")
        return resume

    # Handle direct uploaded file URL, data URL, or external link
    file_url = candidate.cv_url
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', candidate.full_name or 'Candidate')
    is_pdf = ".pdf" in file_url.lower() or "application/pdf" in file_url.lower()

    cv_data = {
        "fileName": f"{clean_name}_CV.pdf" if is_pdf else f"{clean_name}_CV",
        "dataUrl": file_url,
        "pdf_data_url": file_url if is_pdf else None,
        "file_url": file_url,
        "candidateName": candidate.full_name,
        "email": candidate.email,
        "phone": candidate.phone,
    }

    return UserResumeResponse(
        id=f"cv-{candidate.id}",
        user_id=candidate.id,
        title=f"CV - {candidate.full_name or 'Ứng viên'}",
        template_id="pdf" if is_pdf else "custom",
        file_url=file_url,
        cv_data_json=json.dumps(cv_data, ensure_ascii=False),
        is_primary=True,
        ats_score=92,
        created_at=candidate.created_at or datetime.now(timezone.utc),
        updated_at=candidate.created_at or datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Smart Assessment Question File Parser (.docx, .txt, .json, .csv, .md)
# ---------------------------------------------------------------------------
def parse_questions_content(text: str) -> List[Dict[str, Any]]:
    """Parse assessment questions from raw text or JSON format with Vietnamese support."""
    s_clean = text.strip()
    if (s_clean.startswith("[") and s_clean.endswith("]")) or (s_clean.startswith("{") and s_clean.endswith("}")):
        try:
            parsed = json.loads(s_clean)
            q_list = parsed if isinstance(parsed, list) else (parsed.get("questions") or parsed.get("data") or [])
            if isinstance(q_list, list) and len(q_list) > 0:
                out = []
                for idx, item in enumerate(q_list):
                    is_essay = item.get("type") == "ESSAY" or ("options" not in item and "choices" not in item)
                    raw_opts = item.get("options") or item.get("choices") or []
                    out.append({
                        "id": str(item.get("id") or f"q_{idx + 1}"),
                        "type": "ESSAY" if is_essay else "MULTIPLE_CHOICE",
                        "question": str(item.get("question") or item.get("title") or item.get("text") or f"Câu hỏi {idx + 1}"),
                        "options": [str(o) for o in raw_opts] if not is_essay else None,
                        "correct_option": item.get("correct_option") if item.get("correct_option") is not None else item.get("answer", 0),
                        "rubric": str(item.get("rubric") or item.get("criteria") or "") if is_essay else None,
                        "points": float(item.get("points") or (30 if is_essay else 20)),
                    })
                return out
        except Exception:
            pass

    lines = text.splitlines()
    cleaned = []
    for l in lines:
        s = l.strip()
        s = s.replace('"""', '').replace("'''", "").strip()
        if re.match(r"^#\s*[-=]{3,}", s) or re.match(r"^#\s*PHẦN\s*\d+", s, re.I):
            continue
        if re.match(r"^#\s*BỘ\s*CÂU\s*HỎI", s, re.I) or re.match(r"^#\s*Bao\s*gồm", s, re.I):
            continue
        cleaned.append(s)

    q_pattern = re.compile(
        r"^(?:câu\s*hỏi|câu|bài\s*tập\s*tự\s*luận|bài\s*tập|bài|question|q)\s*\d+[\s:.-]*|^\d+[\s:.)-]\s*",
        re.I,
    )

    blocks = []
    cur_block = []
    for l in cleaned:
        if not l:
            continue
        if q_pattern.match(l):
            if cur_block:
                blocks.append(cur_block)
                cur_block = []
        cur_block.append(l)
    if cur_block:
        blocks.append(cur_block)

    opt_pattern = re.compile(r"^(?:\*|\+)?([A-Ea-e])[\s:.)\/-]\s*(.*)$")
    ans_pattern = re.compile(r"^(?:đáp\s*án\s*đúng|đáp\s*án|key|answer|đ\/a|correct)[\s:.-]*([A-Ea-e0-9])", re.I)
    rubric_pattern = re.compile(r"^(?:tiêu\s*chí|barem|rubric|đáp\s*án\s*và\s*code|đáp\s*án\s*mẫu|giải\s*thích|gợi\s*ý)[\s:.-]*(.*)$", re.I)
    points_pattern = re.compile(r"^(?:điểm\s*số|điểm|points?|pts?|score)[\s:=-]*(\d+(?:\.\d+)?)|(?:\[|\()(\d+(?:\.\d+)?)\s*(?:điểm|pts?|points?)(?:\]|\))", re.I)

    questions = []
    for b_idx, block in enumerate(blocks):
        if not block:
            continue

        header_line = block[0]
        stripped_header = q_pattern.sub("", header_line).strip()

        explicit_points = None
        pts_in_header = re.search(r"(?:\[|\()(\d+(?:\.\d+)?)\s*(?:điểm|pts?|points?)(?:\]|\))", header_line, re.I)
        if pts_in_header:
            try:
                explicit_points = float(pts_in_header.group(1))
            except Exception:
                pass
            stripped_header = re.sub(r"^(?:\[|\()(?:\d+(?:\.\d+)?)\s*(?:điểm|pts?|points?)(?:\]|\))[\s:.-]*", "", stripped_header, flags=re.I).strip()
            stripped_header = re.sub(r"(?:\[|\()(?:\d+(?:\.\d+)?)\s*(?:điểm|pts?|points?)(?:\]|\))$", "", stripped_header, flags=re.I).strip()

        q_lines = []
        if stripped_header:
            q_lines.append(stripped_header)

        options = []
        correct_opt = 0
        rubric_parts = []
        state = "QUESTION"

        for line in block[1:]:
            pts_match = points_pattern.match(line)
            if pts_match:
                val = pts_match.group(1) or pts_match.group(2)
                if val:
                    try:
                        explicit_points = float(val)
                    except Exception:
                        pass
                continue

            ans_match = ans_pattern.match(line)
            if ans_match:
                char = ans_match.group(1).upper()
                if char in "ABCDE":
                    correct_opt = ord(char) - ord("A")
                elif char.isdigit():
                    correct_opt = int(char)
                state = "ANSWER"
                continue

            rub_match = rubric_pattern.match(line)
            if rub_match:
                content = rub_match.group(1).strip()
                if content:
                    rubric_parts.append(content)
                state = "RUBRIC"
                continue

            opt_match = opt_pattern.match(line)
            if opt_match and state in ("QUESTION", "OPTIONS"):
                letter = opt_match.group(1).upper()
                content = opt_match.group(2).strip()
                cur_idx = len(options)
                options.append(f"{letter}. {content}")
                if line.startswith("*"):
                    correct_opt = cur_idx
                state = "OPTIONS"
                continue

            if state == "QUESTION":
                q_lines.append(line)
            elif state in ("ANSWER", "RUBRIC"):
                rubric_parts.append(line)
            elif state == "OPTIONS":
                if options:
                    options[-1] += " " + line
                else:
                    q_lines.append(line)

        final_q_text = " ".join(q_lines).strip()
        if not final_q_text:
            final_q_text = f"Câu hỏi số {b_idx + 1}"

        is_essay = len(options) < 2
        rubric_text = "\n".join(rubric_parts).strip()
        if is_essay and not rubric_text:
            rubric_text = "Đánh giá cấu trúc code, thuật toán xử lý và độ chính xác kỹ thuật."

        default_pts = 30 if is_essay else 20
        final_points = int(explicit_points) if explicit_points is not None and explicit_points.is_integer() else (explicit_points if explicit_points is not None else default_pts)

        questions.append({
            "id": f"q_{b_idx + 1}",
            "type": "ESSAY" if is_essay else "MULTIPLE_CHOICE",
            "question": final_q_text,
            "options": options if not is_essay else None,
            "correct_option": correct_opt if not is_essay else None,
            "rubric": rubric_text if is_essay else None,
            "points": final_points,
        })

    return questions


@router.post("/parse-question-file")
async def parse_question_file_endpoint(
    org_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    member: OrganizationMember = Depends(deps.get_current_org_member),
):
    """Parse assessment questions from uploaded file (.docx, .txt, .json, .csv, .md)."""
    filename = file.filename or "unknown"
    content_bytes = await file.read()

    raw_text = ""
    if filename.lower().endswith(".docx"):
        try:
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
                tree = ET.fromstring(z.read("word/document.xml"))
                ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                paras = []
                for p in tree.findall(".//w:p", ns):
                    texts = [t.text for t in p.findall(".//w:t", ns) if t.text]
                    if texts:
                        paras.append("".join(texts))
                raw_text = "\n".join(paras)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Không thể giải nén file DOCX: {str(e)}")
    else:
        try:
            raw_text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                raw_text = content_bytes.decode("utf-16")
            except Exception:
                raw_text = content_bytes.decode("latin1", errors="replace")

    questions = parse_questions_content(raw_text)
    return {
        "success": True,
        "filename": filename,
        "raw_text_length": len(raw_text),
        "total_questions": len(questions),
        "multiple_choice_count": sum(1 for q in questions if q["type"] == "MULTIPLE_CHOICE"),
        "essay_count": sum(1 for q in questions if q["type"] == "ESSAY"),
        "total_points": sum(q.get("points", 20) for q in questions),
        "questions": questions,
    }

