from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Jira Project Schemas
# ---------------------------------------------------------------------------
class JiraProjectBase(BaseModel):
    key: str = Field(..., max_length=20, description="Project Key prefix, e.g. SMA, PROJ")
    name: str
    description: Optional[str] = None
    meeting_id: Optional[str] = None
    organization_id: Optional[str] = None
    department_id: Optional[str] = None


class JiraProjectCreate(JiraProjectBase):
    pass


class JiraProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class JiraProjectResponse(JiraProjectBase):
    id: str
    created_by_id: str
    issue_counter: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Sprint Schemas
# ---------------------------------------------------------------------------
class SprintCreate(BaseModel):
    project_id: str
    name: str
    goal: Optional[str] = None
    duration: Optional[str] = "TWO_WEEKS"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SprintStart(BaseModel):
    goal: Optional[str] = None
    duration: Optional[str] = "TWO_WEEKS"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SprintComplete(BaseModel):
    move_incomplete_to_sprint_id: Optional[str] = None  # None = Backlog


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    duration: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None


class SprintResponse(BaseModel):
    id: str
    project_id: str
    name: str
    goal: Optional[str] = None
    duration: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Issue Comment Schemas
# ---------------------------------------------------------------------------
class IssueCommentCreate(BaseModel):
    content: str


class IssueCommentResponse(BaseModel):
    id: str
    issue_id: str
    author_id: str
    author_name: Optional[str] = None
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Issue Schemas
# ---------------------------------------------------------------------------
class IssueCreate(BaseModel):
    project_id: str
    summary: str
    description: Optional[str] = None
    type: str = "TASK"  # EPIC, STORY, TASK, BUG, SUBTASK
    status: str = "TODO"
    priority: str = "MEDIUM"
    story_points: Optional[int] = None
    parent_id: Optional[str] = None
    epic_id: Optional[str] = None
    sprint_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    meeting_id: Optional[str] = None
    transcript_segment_id: Optional[str] = None


class IssueUpdate(BaseModel):
    summary: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    story_points: Optional[int] = None
    parent_id: Optional[str] = None
    epic_id: Optional[str] = None
    sprint_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    sprint_position: Optional[int] = None
    board_position: Optional[int] = None


class IssueReorder(BaseModel):
    sprint_id: Optional[str] = None  # None = Backlog
    status: Optional[str] = None
    position: int = 0


class IssueResponse(BaseModel):
    id: str
    project_id: str
    key: str
    summary: str
    description: Optional[str] = None
    type: str
    status: str
    priority: str
    story_points: Optional[int] = None
    parent_id: Optional[str] = None
    epic_id: Optional[str] = None
    sprint_id: Optional[str] = None
    sprint_position: int
    board_position: int
    reporter_id: str
    reporter_name: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_date: Optional[datetime] = None
    meeting_id: Optional[str] = None
    transcript_segment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IssueDetailResponse(IssueResponse):
    comments: List[IssueCommentResponse] = []
    subtasks: List[IssueResponse] = []


# ---------------------------------------------------------------------------
# Sync Meeting to Jira
# ---------------------------------------------------------------------------
class MeetingSyncToJiraRequest(BaseModel):
    project_key: Optional[str] = None
    project_name: Optional[str] = None
    create_new_project: bool = True
    target_project_id: Optional[str] = None
    sprint_name: Optional[str] = None
