from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from src.backend.api.deps import get_current_user
from src.backend.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from src.backend.database import get_db
from src.backend.models import RoleEnum, User, Workspace, WorkspaceMember
from src.backend.schemas.workspace import WorkspaceCreate, WorkspaceMemberResponse, WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("/", response_model=WorkspaceResponse)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Workspace).filter(Workspace.slug == payload.slug).first()
    if existing:
        raise ValidationException("A workspace with this slug already exists")

    workspace = Workspace(
        name=payload.name,
        slug=payload.slug,
        owner_id=current_user.id,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    # Assign creator as OWNER
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role=RoleEnum.OWNER,
    )
    db.add(member)
    db.commit()

    return workspace


@router.get("/", response_model=list[WorkspaceResponse])
def list_user_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).all()
    workspace_ids = [m.workspace_id for m in memberships]
    return db.query(Workspace).filter(Workspace.id.in_(workspace_ids)).all()


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    x_workspace_id: str | None = Header(None, alias="X-Workspace-ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id)
        .first()
    )
    if not member:
        raise ForbiddenException("User is not a member of this workspace")

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise NotFoundException("Workspace")
    return workspace
