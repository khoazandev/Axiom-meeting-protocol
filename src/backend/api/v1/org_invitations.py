"""Organization Invitation API endpoints."""

import datetime
import uuid
from datetime import timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.core.exceptions import ForbiddenException, NotFoundException
from src.backend.database import get_db
from src.backend.models import (
    Organization,
    OrganizationInvitation,
    OrganizationMember,
    OrgInvitationStatusEnum,
    OrgMemberStatusEnum,
    Role,
    User,
)
from src.backend.schemas.organization import OrgInvitationCreate, OrgInvitationResponse

# Org-scoped invitation routes
router = APIRouter(
    prefix="/organizations/{org_id}/invitations",
    tags=["invitations"],
)

# Global invitation acceptance route (no org scope needed)
accept_router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.post("/", response_model=OrgInvitationResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=OrgInvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    org_id: str,
    payload: OrgInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Invite a user to the organization via email."""
    # Verify inviter is an org member
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        raise ForbiddenException("Not a member of this organization")

    # Default role to MEMBER
    role_id = payload.role_id
    if not role_id:
        member_role = db.query(Role).filter(
            Role.name == "MEMBER", Role.is_system == True
        ).first()
        role_id = member_role.id

    invitation = OrganizationInvitation(
        organization_id=org_id,
        email=payload.email,
        role_id=role_id,
        department_id=payload.department_id,
        invited_by_id=current_user.id,
        token=str(uuid.uuid4()),
        expires_at=datetime.datetime.now(timezone.utc) + datetime.timedelta(days=7),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


@router.get("/", response_model=list[OrgInvitationResponse])
@router.get("", response_model=list[OrgInvitationResponse])
def list_invitations(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all pending invitations for the organization."""
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        raise ForbiddenException("Not a member of this organization")

    return (
        db.query(OrganizationInvitation)
        .filter(OrganizationInvitation.organization_id == org_id)
        .all()
    )


@accept_router.post("/{token}/accept")
def accept_invitation(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Accept an organization invitation using the token."""
    invitation = (
        db.query(OrganizationInvitation)
        .filter(
            OrganizationInvitation.token == token,
            OrganizationInvitation.status == OrgInvitationStatusEnum.PENDING,
        )
        .first()
    )
    if not invitation:
        raise NotFoundException("Invitation not found or already used")

    # Check expiry
    now = datetime.datetime.now(timezone.utc)
    if invitation.expires_at.replace(tzinfo=timezone.utc) < now:
        invitation.status = OrgInvitationStatusEnum.EXPIRED
        db.commit()
        raise ForbiddenException("Invitation has expired")

    # Create org membership
    member = OrganizationMember(
        organization_id=invitation.organization_id,
        user_id=current_user.id,
        role_id=invitation.role_id,
        status=OrgMemberStatusEnum.ACTIVE,
    )
    db.add(member)

    # If department specified, add to department too
    if invitation.department_id:
        from src.backend.models import DepartmentMember

        dm = DepartmentMember(
            department_id=invitation.department_id,
            user_id=current_user.id,
            role_id=invitation.role_id,
        )
        db.add(dm)

    invitation.status = OrgInvitationStatusEnum.ACCEPTED
    invitation.accepted_at = now
    db.commit()

    return {"status": "accepted", "organization_id": invitation.organization_id}
