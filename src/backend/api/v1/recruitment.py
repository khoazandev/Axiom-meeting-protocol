"""Recruitment pipeline API endpoints for Organization Owners and HR Managers."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    AssessmentAttemptResponse,
    AIEvaluationResponse,
    AssessmentDefinitionCreate,
    AssessmentDefinitionResponse,
    HRReviewCreate,
    HRReviewResponse,
    InterviewScheduleCreate,
    InterviewSessionResponse,
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
)
from src.backend.services.assessment_service import AssessmentService
from src.backend.services.candidate_auth import generate_invitation_token
from src.backend.services.candidate_evaluator import (
    CandidateEvaluator,
    EvaluationService,
    get_candidate_evaluator,
)
from src.backend.services.email_service import send_recruitment_invitation_email
from src.backend.services.interview_service import InterviewService
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
    if getattr(member.role, "name", None) == "OWNER":
        return True
    if member.organization and member.organization.created_by_id == member.user_id:
        return True
    return False


def _can_manage_recruitment(db: Session, member: OrganizationMember) -> bool:
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
    if getattr(target_member.role, "name", None) != "MANAGER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned HR member must have role MANAGER",
        )
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned HR member must belong to the job opening department",
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

    if payload.assigned_hr_member_id:
        _validate_assigned_hr_member(db, org_id, opening.department_id, payload.assigned_hr_member_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(opening, field, val)

    db.commit()
    db.refresh(opening)
    return opening


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
    """Submit final Owner approval decision and advance recruitment workflow."""
    if not (_is_owner(member) or has_effective_permission(db, member, "recruitment.approve")):
        raise ForbiddenException("Owner or recruitment.approve permission required")

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

    db.refresh(approval)
    return approval


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
