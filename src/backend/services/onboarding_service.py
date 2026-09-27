import datetime
import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import timezone
from typing import Optional
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.config import get_settings
from src.backend.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from src.backend.services.email_service import send_org_invitation_email
from src.backend.services.recruitment_workflow import RecruitmentWorkflow, RecruitmentCommand, RecruitmentConflict


@dataclass
class IssuedInvitation:
    invitation: models.OrganizationInvitation
    raw_token: str
    register_url: str


class OnboardingService:
    def __init__(self, db: Session):
        self.db = db

    def issue_invitation(
        self,
        application_id: str,
        owner_member: models.OrganizationMember,
        idempotency_key: Optional[str] = None,
    ) -> IssuedInvitation:
        application = (
            self.db.query(models.RecruitmentApplication)
            .filter_by(id=application_id)
            .first()
        )
        if not application:
            raise NotFoundException("Application not found")

        # 1. Require Owner role
        is_owner = (
            getattr(owner_member.role, "name", None) == "OWNER"
            or (
                owner_member.organization
                and owner_member.organization.created_by_id == owner_member.user_id
            )
        )
        if not is_owner:
            raise ForbiddenException("Only Organization Owner can issue onboarding invitation")

        if owner_member.organization_id != application.organization_id:
            raise ForbiddenException("Owner member does not belong to application organization")

        # 2. Stage check: Must be APPROVED or ONBOARDING_INVITED
        if application.stage not in (
            models.RecruitmentStageEnum.APPROVED,
            models.RecruitmentStageEnum.ONBOARDING_INVITED,
        ):
            raise RecruitmentConflict(
                f"Cannot issue onboarding invitation before owner approval (current stage: {application.stage})"
            )

        # 3. Idempotency checks
        if idempotency_key:
            existing = (
                self.db.query(models.OrganizationInvitation)
                .filter_by(idempotency_key=idempotency_key)
                .first()
            )
            if existing:
                return IssuedInvitation(invitation=existing, raw_token="", register_url="")

        existing_by_app = (
            self.db.query(models.OrganizationInvitation)
            .filter_by(recruitment_application_id=application.id)
            .first()
        )
        if existing_by_app:
            return IssuedInvitation(invitation=existing_by_app, raw_token="", register_url="")

        # 4. Validate candidate email
        candidate = application.candidate
        if not candidate or not candidate.email:
            raise ValidationException("Candidate does not have a valid email for onboarding")

        # 5. Resolve target department and employee role
        target_department_id = application.opening.department_id if application.opening else None

        member_role = (
            self.db.query(models.Role)
            .filter(models.Role.name == "MEMBER", models.Role.is_system == True)
            .first()
        )
        if not member_role:
            member_role = self.db.query(models.Role).filter(models.Role.name == "MEMBER").first()
        if not member_role:
            raise ValidationException("Default employee MEMBER role not found")

        # 6. Generate secure token and invite code
        raw_token = str(uuid.uuid4())
        token_hash = hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
        invite_code = f"{secrets.randbelow(900000) + 100000}"
        now = datetime.datetime.now(timezone.utc)
        expires_at = now + datetime.timedelta(days=7)

        # Invalidate any other pending invitations for this email in this org
        prev_pendings = (
            self.db.query(models.OrganizationInvitation)
            .filter(
                models.OrganizationInvitation.organization_id == application.organization_id,
                models.OrganizationInvitation.email == candidate.email,
                models.OrganizationInvitation.status == models.OrgInvitationStatusEnum.PENDING,
            )
            .all()
        )
        for prev in prev_pendings:
            prev.status = models.OrgInvitationStatusEnum.REVOKED

        invitation = models.OrganizationInvitation(
            organization_id=application.organization_id,
            email=candidate.email,
            full_name=candidate.full_name,
            phone=candidate.phone,
            job_title=application.opening.title if application.opening else None,
            role_id=member_role.id,
            department_id=target_department_id,
            invited_by_id=owner_member.user_id,
            token_hash=token_hash,
            invite_code=invite_code,
            recruitment_application_id=application.id,
            idempotency_key=idempotency_key,
            status=models.OrgInvitationStatusEnum.PENDING,
            expires_at=expires_at,
        )
        self.db.add(invitation)
        self.db.flush()

        # 7. Advance workflow to ONBOARDING_INVITED only after invitation creation
        if application.stage == models.RecruitmentStageEnum.APPROVED:
            workflow = RecruitmentWorkflow(self.db)
            workflow.advance(
                application.id,
                RecruitmentCommand(
                    action="ISSUE_ONBOARDING",
                    metadata={"invitation_id": invitation.id, "idempotency_key": idempotency_key},
                ),
                actor_member=owner_member,
            )

        self.db.commit()
        self.db.refresh(invitation)

        # 8. Build register url and dispatch email
        settings = get_settings()
        frontend_base = (settings.frontend_base_url or "http://localhost:3001").rstrip("/")
        register_url = f"{frontend_base}/register?code={invitation.invite_code}&token={raw_token}"

        send_org_invitation_email(
            recipient_email=invitation.email,
            recipient_name=candidate.full_name,
            organization_name=application.organization.name if application.organization else "Axiom",
            inviter_name=owner_member.user.full_name if owner_member.user else "Organization Owner",
            inviter_email=owner_member.user.email if owner_member.user else "",
            department_name=application.opening.department.name if application.opening and application.opening.department else None,
            job_title=application.opening.title if application.opening else None,
            role_name=member_role.name,
            register_url=register_url,
            expires_at_str=expires_at.strftime("%d/%m/%Y %H:%M"),
            invite_code=invitation.invite_code,
        )

        return IssuedInvitation(
            invitation=invitation,
            raw_token=raw_token,
            register_url=register_url,
        )

    def complete_from_invitation(
        self,
        invitation_id: str,
        user_id: str,
    ) -> Optional[models.RecruitmentApplication]:
        invitation = (
            self.db.query(models.OrganizationInvitation)
            .filter_by(id=invitation_id)
            .first()
        )
        if not invitation or not invitation.recruitment_application_id:
            return None

        application = (
            self.db.query(models.RecruitmentApplication)
            .filter_by(id=invitation.recruitment_application_id)
            .first()
        )
        if not application:
            return None

        # Idempotent completion check
        if application.stage == models.RecruitmentStageEnum.HIRED:
            return application

        user = self.db.query(models.User).filter_by(id=user_id).first()
        if not user:
            raise NotFoundException("User not found")

        # Verify candidate email matches
        user_email = user.email.strip().lower() if user.email else ""
        cand_email = (
            application.candidate.email.strip().lower()
            if application.candidate and application.candidate.email
            else ""
        )
        user_hash = hashlib.sha256(user_email.encode("utf-8")).hexdigest()
        cand_hash = application.candidate.email_hash if application.candidate else None

        if user_email != cand_email and user_hash != cand_hash:
            raise ValidationException("User email does not match recruitment candidate email")

        # Advance application with COMPLETE_ONBOARDING
        workflow = RecruitmentWorkflow(self.db)
        updated_app = workflow.advance(
            application.id,
            RecruitmentCommand(
                action="COMPLETE_ONBOARDING",
                metadata={"user_id": user_id, "invitation_id": invitation_id},
            ),
            actor_member=None,
        )
        return updated_app
