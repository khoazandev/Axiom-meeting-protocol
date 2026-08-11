"""
Tasks API — maps ActionItem model to task-like endpoints for the frontend.

Uses ActionItem model from the new org-based schema instead of the old
workspace-based Task model.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import ActionItem, ActionItemStatusEnum, User

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ── Schemas ─────────────────────────────────────────
class TaskResponse(BaseModel):
    id: str
    meeting_id: str
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: str
    status: str
    due_date: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    meeting_id: str
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: str = "MEDIUM"
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None


# ── Helpers ─────────────────────────────────────────
def _action_item_to_task_response(item: ActionItem) -> dict:
    """Convert ActionItem to task-like response for frontend compatibility."""
    return {
        "id": item.id,
        "meeting_id": item.meeting_id,
        "title": item.title,
        "description": item.description,
        "assignee_id": item.assignee_id,
        "priority": "MEDIUM",  # ActionItem doesn't have priority, default
        "status": item.status.value if item.status else "TODO",
        "due_date": item.due_at.isoformat() if item.due_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else "",
        "updated_at": item.updated_at.isoformat() if item.updated_at else "",
    }


# ── Endpoints ──────────────────────────────────────
@router.get("", response_model=list[TaskResponse])
def list_tasks(
    status_filter: Optional[str] = None,
    meeting_id: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """List all action items as tasks."""
    query = db.query(ActionItem)
    if status_filter:
        query = query.filter(ActionItem.status == status_filter)
    if meeting_id:
        query = query.filter(ActionItem.meeting_id == meeting_id)
    items = query.order_by(ActionItem.created_at.desc()).all()
    return [_action_item_to_task_response(item) for item in items]


@router.get("/{task_id}")
def get_task(
    task_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(ActionItem).filter(ActionItem.id == task_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _action_item_to_task_response(item)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    item = ActionItem(
        meeting_id=task_in.meeting_id,
        title=task_in.title,
        description=task_in.description,
        assignee_id=task_in.assignee_id,
        status=ActionItemStatusEnum.TODO,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _action_item_to_task_response(item)


@router.put("/{task_id}")
def update_task(
    task_id: str,
    task_in: TaskUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(ActionItem).filter(ActionItem.id == task_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if task_in.title is not None:
        item.title = task_in.title
    if task_in.description is not None:
        item.description = task_in.description
    if task_in.assignee_id is not None:
        item.assignee_id = task_in.assignee_id
    if task_in.status is not None:
        item.status = ActionItemStatusEnum(task_in.status)

    db.commit()
    db.refresh(item)
    return _action_item_to_task_response(item)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(ActionItem).filter(ActionItem.id == task_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(item)
    db.commit()
    return None
