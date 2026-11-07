"""Organization Invitation API endpoints with automated Email Dispatch & Token Verification."""

import datetime
import hashlib
import secrets
import uuid
from datetime import timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.core.config import get_settings
from src.backend.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from src.backend.database import get_db
from src.backend.models import (
    Department,
    DepartmentMember,
    Organization,
    OrganizationInvitation,
    OrganizationMember,
    OrgInvitationStatusEnum,
    OrgMemberStatusEnum,
    Role,
    User,
)
from src.backend.schemas.organization import (
    OrgInvitationCreate,
    OrgInvitationResponse,
    OrgInvitationVerifyResponse,
)
from src.backend.services.email_service import send_org_invitation_email

# Org-scoped invitation routes
router = APIRouter(
    prefix="/organizations/{org_id}/invitations",
    tags=["invitations"],
)

# Global invitation acceptance & verification route (no org scope needed)
accept_router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.post("/", response_model=OrgInvitationResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=OrgInvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    org_id: str,
    payload: OrgInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Invite a new user to the organization via Gmail/Email.
    Creates invitation record, generates secure onboarding token, and dispatches HTML invitation email.
    """
    # Verify inviter is an org member
    membership = (
        db.query(OrganizationMember)
        .join(Role, OrganizationMember.role_id == Role.id)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.status == OrgMemberStatusEnum.ACTIVE,
            Role.name.in_(("OWNER", "ADMIN")),
        )
        .first()
    )
    if not membership:
        raise ForbiddenException("Bạn không có quyền mời thành viên vào tổ chức này")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise NotFoundException("Tổ chức không tồn tại")

    # Resolve Role (Supports both role_id UUID or role name string like "MEMBER", "MANAGER", "ADMIN")
    role_id = payload.role_id
    role_obj = None
    if role_id:
        role_obj = db.query(Role).filter(
            (Role.id == role_id) | (Role.name == role_id.upper())
        ).first()

    if not role_obj:
        role_obj = db.query(Role).filter(Role.name == "MEMBER", Role.is_system == True).first()
        if not role_obj:
            role_obj = db.query(Role).filter(Role.name == "MEMBER").first()

    if role_obj and role_obj.name == "OWNER":
        from src.backend.core.exceptions import ValidationException
        raise ValidationException("Mỗi doanh nghiệp chỉ có duy nhất 1 Chủ sở hữu (Owner). Không thể phát hành thư mời cho vai trò Owner.")

    resolved_role_id = role_obj.id if role_obj else role_id

    # Resolve Department if provided
    dept_obj = None
    if payload.department_id:
        dept_obj = (
            db.query(Department)
            .filter(
                Department.id == payload.department_id,
                Department.organization_id == org_id,
            )
            .first()
        )

    # Invalidate any previous pending invitations for this email in this org
    prev_pending = (
        db.query(OrganizationInvitation)
        .filter(
            OrganizationInvitation.organization_id == org_id,
            OrganizationInvitation.email == payload.email,
            OrganizationInvitation.status == OrgInvitationStatusEnum.PENDING,
        )
        .all()
    )
    for p in prev_pending:
        p.status = OrgInvitationStatusEnum.REVOKED

    invitation_token = str(uuid.uuid4())
    token_hash = hashlib.sha256(invitation_token.strip().encode("utf-8")).hexdigest()
    # Generate random 6-digit invitation code for easy manual entry
    invite_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.datetime.now(timezone.utc) + datetime.timedelta(days=7)

    invitation = OrganizationInvitation(
        organization_id=org_id,
        email=payload.email,
        full_name=payload.full_name,
        job_title=payload.job_title,
        phone=payload.phone,
        role_id=resolved_role_id,
        department_id=dept_obj.id if dept_obj else None,
        invited_by_id=current_user.id,
        token_hash=token_hash,
        invite_code=invite_code,
        expires_at=expires_at,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    # Build activation URL & Dispatch Email
    settings = get_settings()
    frontend_base = (settings.frontend_base_url or "http://localhost:3001").rstrip("/")
    register_url = f"{frontend_base}/register?code={invitation.invite_code}&token={invitation_token}"

    email_result = send_org_invitation_email(
        recipient_email=invitation.email,
        recipient_name=payload.full_name,
        organization_name=org.name,
        inviter_name=current_user.full_name,
        inviter_email=current_user.email,
        department_name=dept_obj.name if dept_obj else None,
        job_title=payload.job_title,
        role_name=role_obj.name if role_obj else "MEMBER",
        register_url=register_url,
        expires_at_str=expires_at.strftime("%d/%m/%Y %H:%M"),
        invite_code=invitation.invite_code,
    )

    email_status = "SENT_SMTP" if email_result.get("sent") else "DISPATCHED_DEV"

    # If recipient user is already registered in system, send an in-app notification to their bell icon
    existing_user = db.query(User).filter(func.lower(User.email) == func.lower(invitation.email)).first()
    if existing_user:
        try:
            from src.backend.api.v1.notifications import send_user_notification
            send_user_notification(
                db=db,
                user_id=existing_user.id,
                title=f"Thư mời gia nhập {org.name}",
                content=f"Bạn nhận được lời mời gia nhập {org.name} với chức danh {payload.job_title or 'Thành viên'}. Mã lời mời: {invitation.invite_code}",
                type="INVITATION",
                link=register_url,
            )
        except Exception:
            pass

    return OrgInvitationResponse(
        id=invitation.id,
        organization_id=invitation.organization_id,
        email=invitation.email,
        full_name=invitation.full_name,
        job_title=invitation.job_title,
        phone=invitation.phone,
        role_id=invitation.role_id,
        department_id=invitation.department_id,
        department_name=dept_obj.name if dept_obj else None,
        status=invitation.status.value,
        token=invitation_token,
        invite_code=invitation.invite_code,
        register_url=register_url,
        email_status=email_status,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
    )


@router.get("/", response_model=list[OrgInvitationResponse])
@router.get("", response_model=list[OrgInvitationResponse])
def list_invitations(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all invitations for the organization."""
    settings = get_settings()
    frontend_base = (settings.frontend_base_url or "http://localhost:3001").rstrip("/")

    invitations = (
        db.query(OrganizationInvitation)
        .filter(OrganizationInvitation.organization_id == org_id)
        .order_by(OrganizationInvitation.created_at.desc())
        .all()
    )

    results = []
    for inv in invitations:
        dept = db.query(Department).filter(Department.id == inv.department_id).first() if inv.department_id else None
        results.append(
            OrgInvitationResponse(
                id=inv.id,
                organization_id=inv.organization_id,
                email=inv.email,
                full_name=inv.full_name,
                job_title=inv.job_title,
                phone=inv.phone,
                role_id=inv.role_id,
                department_id=inv.department_id,
                department_name=dept.name if dept else None,
                status=inv.status.value,
                token=None,
                invite_code=inv.invite_code,
                register_url=f"{frontend_base}/register?code={inv.invite_code}" if inv.invite_code else None,
                email_status="READY",
                expires_at=inv.expires_at,
                created_at=inv.created_at,
                recruitment_application_id=inv.recruitment_application_id,
                idempotency_key=inv.idempotency_key,
            )
        )
    return results


def _clean_token_input(val: str) -> str:
    cleaned = val.strip()
    if "code=" in cleaned:
        cleaned = cleaned.split("code=")[1].split("&")[0]
    elif "invite_token=" in cleaned:
        cleaned = cleaned.split("invite_token=")[1].split("&")[0]
    elif "token=" in cleaned:
        cleaned = cleaned.split("token=")[1].split("&")[0]
    elif "/invite/" in cleaned:
        cleaned = cleaned.split("/invite/")[1].split("?")[0]
    return cleaned.strip()


@accept_router.get("/verify/{token}", response_model=OrgInvitationVerifyResponse)
def verify_invitation(token: str, db: Session = Depends(get_db)):
    """
    Verifies an invitation token or 6-digit code and returns pre-filled onboarding parameters.
    """
    clean_val = _clean_token_input(token)
    hash_val = hashlib.sha256(clean_val.encode("utf-8")).hexdigest()
    invitation = (
        db.query(OrganizationInvitation)
        .filter(
            (OrganizationInvitation.token_hash == hash_val) | (OrganizationInvitation.invite_code == clean_val),
            OrganizationInvitation.status == OrgInvitationStatusEnum.PENDING,
        )
        .first()
    )
    if not invitation:
        raise NotFoundException("Mã mời không tồn tại, đã hết hạn hoặc đã được sử dụng")

    now = datetime.datetime.now(timezone.utc)
    if invitation.expires_at.replace(tzinfo=timezone.utc) < now:
        invitation.status = OrgInvitationStatusEnum.EXPIRED
        db.commit()
        raise ForbiddenException("Mã mời đã hết hạn hiệu lực (quá 7 ngày)")

    org = db.query(Organization).filter(Organization.id == invitation.organization_id).first()
    dept = (
        db.query(Department).filter(Department.id == invitation.department_id).first()
        if invitation.department_id
        else None
    )
    role_obj = db.query(Role).filter(Role.id == invitation.role_id).first()

    # List all active departments in this company for dropdown selection
    all_depts = (
        db.query(Department)
        .filter(Department.organization_id == invitation.organization_id)
        .order_by(Department.name.asc())
        .all()
    )
    dept_list = [
        {"id": d.id, "name": d.name, "description": d.description}
        for d in all_depts
    ]

    return OrgInvitationVerifyResponse(
        token=clean_val,
        invite_code=invitation.invite_code,
        email=invitation.email,
        full_name=invitation.full_name,
        phone=invitation.phone,
        job_title=invitation.job_title,
        role=role_obj.name if role_obj else "MEMBER",
        organization_id=invitation.organization_id,
        organization_name=org.name if org else "Axiom Enterprise",
        department_id=invitation.department_id,
        department_name=dept.name if dept else None,
        available_departments=dept_list,
        expires_at=invitation.expires_at,
        recruitment_application_id=invitation.recruitment_application_id,
    )


@accept_router.post("/{token}/accept")
def accept_invitation(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Accept an organization invitation using the token for an already logged-in user."""
    clean_val = _clean_token_input(token)
    hash_val = hashlib.sha256(clean_val.encode("utf-8")).hexdigest()
    invitation = (
        db.query(OrganizationInvitation)
        .filter(
            (OrganizationInvitation.token_hash == hash_val) | (OrganizationInvitation.invite_code == clean_val),
            OrganizationInvitation.status == OrgInvitationStatusEnum.PENDING,
        )
        .first()
    )
    if not invitation:
        raise NotFoundException("Thư mời không tồn tại hoặc đã được sử dụng")

    now = datetime.datetime.now(timezone.utc)
    if invitation.expires_at.replace(tzinfo=timezone.utc) < now:
        invitation.status = OrgInvitationStatusEnum.EXPIRED
        db.commit()
        raise ForbiddenException("Thư mời đã hết hạn")

    # Check if user is already a member
    existing_member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == invitation.organization_id,
            OrganizationMember.user_id == current_user.id,
        )
        .first()
    )
    if not existing_member:
        member = OrganizationMember(
            organization_id=invitation.organization_id,
            user_id=current_user.id,
            role_id=invitation.role_id,
            status=OrgMemberStatusEnum.ACTIVE,
        )
        db.add(member)

    if invitation.department_id:
        existing_dm = (
            db.query(DepartmentMember)
            .filter(
                DepartmentMember.department_id == invitation.department_id,
                DepartmentMember.user_id == current_user.id,
            )
            .first()
        )
        if not existing_dm:
            dm = DepartmentMember(
                department_id=invitation.department_id,
                user_id=current_user.id,
                role_id=invitation.role_id,
            )
            db.add(dm)

    invitation.status = OrgInvitationStatusEnum.ACCEPTED
    invitation.accepted_at = now
    db.commit()

    if invitation.recruitment_application_id:
        from src.backend.services.onboarding_service import OnboardingService
        OnboardingService(db).complete_from_invitation(invitation.id, current_user.id)

    return {"status": "accepted", "organization_id": invitation.organization_id}
