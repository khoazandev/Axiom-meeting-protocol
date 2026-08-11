"""Department CRUD API endpoints (nested under organizations)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.core.exceptions import ForbiddenException, NotFoundException
from src.backend.database import get_db
from src.backend.models import (
    Department,
    DepartmentMember,
    Organization,
    OrganizationMember,
    Role,
    User,
)
from src.backend.schemas.organization import (
    DepartmentCreate,
    DepartmentMemberAdd,
    DepartmentMemberResponse,
    DepartmentResponse,
)

router = APIRouter(
    prefix="/organizations/{org_id}/departments",
    tags=["departments"],
)


def _require_org_membership(db: Session, org_id: str, user_id: str) -> OrganizationMember:
    """Verify the user is a member of the organization."""
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise ForbiddenException("Not a member of this organization")
    return membership


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    org_id: str,
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Create a new department within the organization."""
    _require_org_membership(db, org_id, current_user.id)

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise NotFoundException("Organization")

    dept = Department(
        organization_id=org_id,
        name=payload.name,
        description=payload.description,
        parent_id=payload.parent_id,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/", response_model=list[DepartmentResponse])
@router.get("", response_model=list[DepartmentResponse])
def list_departments(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all departments in the organization."""
    _require_org_membership(db, org_id, current_user.id)
    return db.query(Department).filter(Department.organization_id == org_id).all()


@router.post(
    "/{dept_id}/members",
    response_model=DepartmentMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_department_member(
    org_id: str,
    dept_id: str,
    payload: DepartmentMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Add a user to a department. User must already be an org member."""
    _require_org_membership(db, org_id, current_user.id)

    dept = db.query(Department).filter(
        Department.id == dept_id,
        Department.organization_id == org_id,
    ).first()
    if not dept:
        raise NotFoundException("Department")

    # Verify target user is an org member
    target_membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == payload.user_id,
        )
        .first()
    )
    if not target_membership:
        raise ForbiddenException("User is not a member of this organization")

    # Determine role (default to MEMBER)
    role_id = payload.role_id
    if not role_id:
        member_role = db.query(Role).filter(
            Role.name == "MEMBER", Role.is_system == True
        ).first()
        role_id = member_role.id

    dm = DepartmentMember(
        department_id=dept_id,
        user_id=payload.user_id,
        role_id=role_id,
    )
    db.add(dm)
    db.commit()
    db.refresh(dm)
    return dm
