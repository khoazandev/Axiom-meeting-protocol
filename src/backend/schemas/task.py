import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from src.backend.models import TaskPriorityEnum, TaskStatusEnum


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    status: TaskStatusEnum = TaskStatusEnum.TODO
    meeting_id: Optional[int] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime.datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriorityEnum] = None
    status: Optional[TaskStatusEnum] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime.datetime] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    meeting_id: Optional[int] = None
    created_by_id: str
    assignee_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    priority: TaskPriorityEnum
    status: TaskStatusEnum
    due_date: Optional[datetime.datetime] = None
    created_at: datetime.datetime
