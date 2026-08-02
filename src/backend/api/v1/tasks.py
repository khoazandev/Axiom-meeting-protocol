from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import Task, User, WorkspaceMember
from src.backend.schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(deps.get_current_user),
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    task = Task(
        workspace_id=member.workspace_id,
        created_by_id=current_user.id,
        meeting_id=task_in.meeting_id,
        assignee_id=task_in.assignee_id,
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority,
        status=task_in.status,
        due_date=task_in.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    status_filter: Optional[str] = None,
    meeting_id: Optional[int] = None,
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    query = db.query(Task).filter(Task.workspace_id == member.workspace_id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if meeting_id:
        query = query.filter(Task.meeting_id == meeting_id)
    return query.order_by(Task.created_at.desc()).all()


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.workspace_id == member.workspace_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    task_in: TaskUpdate,
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.workspace_id == member.workspace_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.workspace_id == member.workspace_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    db.delete(task)
    db.commit()
    return None
