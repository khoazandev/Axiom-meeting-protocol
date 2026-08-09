"""Organization CRUD API endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import (
    Organization,
    OrganizationMember,
    OrgMemberStatusEnum,
    Role,
    User,
)
from src.backend.schemas.organization import OrganizationCreate, OrganizationResponse

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Create a new organization. The creator is automatically added as OWNER."""
    org = Organization(
        name=payload.name,
        created_by_id=current_user.id,
    )
    db.add(org)
    db.flush()

    # Auto-add creator as OWNER member
    owner_role = (
        db.query(Role)
        .filter(Role.name == "OWNER", Role.is_system == True)
        .first()
    )
    if owner_role:
        member = OrganizationMember(
            organization_id=org.id,
            user_id=current_user.id,
            role_id=owner_role.id,
            status=OrgMemberStatusEnum.ACTIVE,
        )
        db.add(member)

    db.commit()
    db.refresh(org)
    return org


@router.get("/", response_model=list[OrganizationResponse])
@router.get("", response_model=list[OrganizationResponse])
def list_my_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all organizations the current user is a member of."""
    memberships = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == current_user.id)
        .all()
    )
    org_ids = [m.organization_id for m in memberships]
    return db.query(Organization).filter(Organization.id.in_(org_ids)).all()


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get organization details. User must be a member."""
    from src.backend.core.exceptions import ForbiddenException, NotFoundException

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise NotFoundException("Organization")

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

    return org
