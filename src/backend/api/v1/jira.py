"""
Mini Jira API — Full Project, Sprint, Backlog, Kanban Board & Meeting Integration endpoints.
"""

from datetime import datetime, timezone
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.core.exceptions import NotFoundException, ValidationException
from src.backend.database import get_db
from src.backend.models import (
    DurationEnum,
    FollowUpTask,
    Issue,
    IssueComment,
    IssuePriorityEnum,
    IssueStatusEnum,
    IssueTypeEnum,
    JiraProject,
    Meeting,
    MeetingMember,
    Sprint,
    SprintStatusEnum,
    TranscriptSegment,
    User,
)
from src.backend.schemas.jira import (
    IssueCommentCreate,
    IssueCommentResponse,
    IssueCreate,
    IssueDetailResponse,
    IssueReorder,
    IssueResponse,
    IssueUpdate,
    JiraProjectCreate,
    JiraProjectResponse,
    JiraProjectUpdate,
    MeetingSyncToJiraRequest,
    SprintComplete,
    SprintCreate,
    SprintResponse,
    SprintStart,
    SprintUpdate,
)

router = APIRouter(prefix="/jira", tags=["jira"])


# ── Helpers ──────────────────────────────────────────
def _generate_clean_key(name: str) -> str:
    """Generate a 3-5 uppercase character project key from name."""
    words = re.findall(r"\b[A-Za-z0-9]", name)
    if len(words) >= 2:
        key = "".join(words[:4]).upper()
    else:
        cleaned = re.sub(r"[^A-Za-z0-9]", "", name).upper()
        key = cleaned[:4] if len(cleaned) >= 2 else "MTG"
    return key


def _get_project_by_id_or_key(identifier: str, db: Session) -> JiraProject:
    project = (
        db.query(JiraProject)
        .filter((JiraProject.id == identifier) | (JiraProject.key == identifier.upper()))
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Jira Project '{identifier}' not found",
        )
    return project


# ── Projects ─────────────────────────────────────────
@router.get("/projects", response_model=List[JiraProjectResponse])
def list_jira_projects(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """List all Jira Projects accessible to user."""
    return db.query(JiraProject).order_by(JiraProject.created_at.desc()).all()


@router.post("/projects", response_model=JiraProjectResponse, status_code=status.HTTP_201_CREATED)
def create_jira_project(
    payload: JiraProjectCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new Jira Project."""
    key = payload.key.strip().upper()
    existing = db.query(JiraProject).filter(JiraProject.key == key).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project key '{key}' already exists",
        )

    project = JiraProject(
        key=key,
        name=payload.name,
        description=payload.description,
        meeting_id=payload.meeting_id,
        organization_id=payload.organization_id,
        department_id=payload.department_id,
        created_by_id=current_user.id,
        issue_counter=0,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id_or_key}", response_model=JiraProjectResponse)
def get_jira_project(
    project_id_or_key: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Get Jira Project by ID or Key (e.g. 'SMA')."""
    return _get_project_by_id_or_key(project_id_or_key, db)


# ── Sprints ──────────────────────────────────────────
@router.get("/projects/{project_id_or_key}/sprints", response_model=List[SprintResponse])
def list_project_sprints(
    project_id_or_key: str,
    status_filter: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """List all Sprints in a Project."""
    project = _get_project_by_id_or_key(project_id_or_key, db)
    query = db.query(Sprint).filter(Sprint.project_id == project.id)
    if status_filter:
        query = query.filter(Sprint.status == status_filter)
    return query.order_by(Sprint.created_at.asc()).all()


@router.post("/sprints", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
def create_sprint(
    payload: SprintCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new Planned Sprint."""
    project = db.query(JiraProject).filter(JiraProject.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    sprint = Sprint(
        project_id=project.id,
        name=payload.name,
        goal=payload.goal,
        duration=DurationEnum(payload.duration) if payload.duration in DurationEnum.__members__ else DurationEnum.TWO_WEEKS,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=SprintStatusEnum.PENDING,
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.post("/sprints/{sprint_id}/start", response_model=SprintResponse)
def start_sprint(
    sprint_id: str,
    payload: SprintStart,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Start a sprint (changes status to ACTIVE)."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    if sprint.status == SprintStatusEnum.ACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sprint is already active")

    sprint.status = SprintStatusEnum.ACTIVE
    if payload.goal:
        sprint.goal = payload.goal
    if payload.duration:
        sprint.duration = DurationEnum(payload.duration) if payload.duration in DurationEnum.__members__ else DurationEnum.TWO_WEEKS
    if payload.start_date:
        sprint.start_date = payload.start_date
    else:
        sprint.start_date = datetime.now(timezone.utc)
    if payload.end_date:
        sprint.end_date = payload.end_date

    db.commit()
    db.refresh(sprint)
    return sprint


@router.post("/sprints/{sprint_id}/complete", response_model=SprintResponse)
def complete_sprint(
    sprint_id: str,
    payload: SprintComplete,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Complete an active sprint and rollover uncompleted issues to another sprint or backlog."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    sprint.status = SprintStatusEnum.CLOSED
    sprint.end_date = datetime.now(timezone.utc)

    # Rollover incomplete issues (anything not DONE)
    incomplete_issues = (
        db.query(Issue)
        .filter(Issue.sprint_id == sprint.id, Issue.status != IssueStatusEnum.DONE)
        .all()
    )
    for issue in incomplete_issues:
        issue.sprint_id = payload.move_incomplete_to_sprint_id  # If None, goes to Backlog

    db.commit()
    db.refresh(sprint)
    return sprint


@router.put("/sprints/{sprint_id}", response_model=SprintResponse)
def update_sprint(
    sprint_id: str,
    payload: SprintUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Update sprint details."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    if payload.name is not None:
        sprint.name = payload.name
    if payload.goal is not None:
        sprint.goal = payload.goal
    if payload.duration is not None and payload.duration in DurationEnum.__members__:
        sprint.duration = DurationEnum(payload.duration)
    if payload.start_date is not None:
        sprint.start_date = payload.start_date
    if payload.end_date is not None:
        sprint.end_date = payload.end_date
    if payload.status is not None and payload.status in SprintStatusEnum.__members__:
        sprint.status = SprintStatusEnum(payload.status)

    db.commit()
    db.refresh(sprint)
    return sprint


# ── Issues ───────────────────────────────────────────
@router.get("/projects/{project_id_or_key}/issues", response_model=List[IssueResponse])
def list_project_issues(
    project_id_or_key: str,
    sprint_id: Optional[str] = Query(None, description="Sprint ID, or 'backlog' for backlog issues"),
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    assignee_id: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """List issues in a project with comprehensive filtering."""
    project = _get_project_by_id_or_key(project_id_or_key, db)
    query = db.query(Issue).filter(Issue.project_id == project.id)

    if sprint_id == "backlog":
        query = query.filter(Issue.sprint_id.is_(None))
    elif sprint_id:
        query = query.filter(Issue.sprint_id == sprint_id)

    if type_filter and type_filter in IssueTypeEnum.__members__:
        query = query.filter(Issue.type == IssueTypeEnum(type_filter))
    if status_filter and status_filter in IssueStatusEnum.__members__:
        query = query.filter(Issue.status == IssueStatusEnum(status_filter))
    if assignee_id:
        query = query.filter(Issue.assignee_id == assignee_id)

    return query.order_by(Issue.sprint_position.asc(), Issue.created_at.asc()).all()


@router.post("/issues", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
def create_issue(
    payload: IssueCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new Issue with sequential key like 'SMA-1'."""
    project = db.query(JiraProject).filter(JiraProject.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project.issue_counter += 1
    issue_key = f"{project.key}-{project.issue_counter}"

    issue_type = IssueTypeEnum(payload.type) if payload.type in IssueTypeEnum.__members__ else IssueTypeEnum.TASK
    issue_status = IssueStatusEnum(payload.status) if payload.status in IssueStatusEnum.__members__ else IssueStatusEnum.TODO
    issue_priority = IssuePriorityEnum(payload.priority) if payload.priority in IssuePriorityEnum.__members__ else IssuePriorityEnum.MEDIUM

    # Determine sprint and board position
    highest_pos = (
        db.query(Issue.sprint_position)
        .filter(Issue.project_id == project.id, Issue.sprint_id == payload.sprint_id)
        .order_by(Issue.sprint_position.desc())
        .first()
    )
    new_sprint_pos = (highest_pos[0] + 1000) if highest_pos else 1000

    issue = Issue(
        project_id=project.id,
        key=issue_key,
        summary=payload.summary,
        description=payload.description,
        type=issue_type,
        status=issue_status,
        priority=issue_priority,
        story_points=payload.story_points,
        parent_id=payload.parent_id,
        epic_id=payload.epic_id,
        sprint_id=payload.sprint_id,
        sprint_position=new_sprint_pos,
        board_position=new_sprint_pos,
        reporter_id=current_user.id,
        assignee_id=payload.assignee_id,
        due_date=payload.due_date,
        meeting_id=payload.meeting_id,
        transcript_segment_id=payload.transcript_segment_id,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


@router.get("/issues/{issue_id_or_key}", response_model=IssueDetailResponse)
def get_issue_detail(
    issue_id_or_key: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Get Issue details with subtasks and comments."""
    issue = (
        db.query(Issue)
        .filter((Issue.id == issue_id_or_key) | (Issue.key == issue_id_or_key.upper()))
        .first()
    )
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    comments = (
        db.query(IssueComment)
        .filter(IssueComment.issue_id == issue.id)
        .order_by(IssueComment.created_at.asc())
        .all()
    )
    subtasks = (
        db.query(Issue)
        .filter(Issue.parent_id == issue.id)
        .order_by(Issue.created_at.asc())
        .all()
    )

    issue_dict = IssueResponse.model_validate(issue).model_dump()
    issue_dict["comments"] = [IssueCommentResponse.model_validate(c) for c in comments]
    issue_dict["subtasks"] = [IssueResponse.model_validate(s) for s in subtasks]
    return issue_dict


@router.put("/issues/{issue_id_or_key}", response_model=IssueResponse)
def update_issue(
    issue_id_or_key: str,
    payload: IssueUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Update issue attributes."""
    issue = (
        db.query(Issue)
        .filter((Issue.id == issue_id_or_key) | (Issue.key == issue_id_or_key.upper()))
        .first()
    )
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    if payload.summary is not None:
        issue.summary = payload.summary
    if payload.description is not None:
        issue.description = payload.description
    if payload.type is not None and payload.type in IssueTypeEnum.__members__:
        issue.type = IssueTypeEnum(payload.type)
    if payload.status is not None and payload.status in IssueStatusEnum.__members__:
        issue.status = IssueStatusEnum(payload.status)
    if payload.priority is not None and payload.priority in IssuePriorityEnum.__members__:
        issue.priority = IssuePriorityEnum(payload.priority)
    if payload.story_points is not None:
        issue.story_points = payload.story_points
    if payload.parent_id is not None:
        issue.parent_id = payload.parent_id if payload.parent_id != "" else None
    if payload.epic_id is not None:
        issue.epic_id = payload.epic_id if payload.epic_id != "" else None
    if payload.sprint_id is not None:
        issue.sprint_id = payload.sprint_id if payload.sprint_id != "" else None
    if payload.assignee_id is not None:
        issue.assignee_id = payload.assignee_id if payload.assignee_id != "" else None
    if payload.due_date is not None:
        issue.due_date = payload.due_date
    if payload.sprint_position is not None:
        issue.sprint_position = payload.sprint_position
    if payload.board_position is not None:
        issue.board_position = payload.board_position

    db.commit()
    db.refresh(issue)
    return issue


@router.post("/issues/{issue_id_or_key}/reorder", response_model=IssueResponse)
def reorder_issue(
    issue_id_or_key: str,
    payload: IssueReorder,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Reorder issue in Sprint / Backlog or Kanban Board."""
    issue = (
        db.query(Issue)
        .filter((Issue.id == issue_id_or_key) | (Issue.key == issue_id_or_key.upper()))
        .first()
    )
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    if payload.sprint_id is not None:
        issue.sprint_id = payload.sprint_id if payload.sprint_id != "backlog" else None
    if payload.status is not None and payload.status in IssueStatusEnum.__members__:
        issue.status = IssueStatusEnum(payload.status)
    issue.sprint_position = payload.position
    issue.board_position = payload.position

    db.commit()
    db.refresh(issue)
    return issue


@router.delete("/issues/{issue_id_or_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(
    issue_id_or_key: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an issue and its comments."""
    issue = (
        db.query(Issue)
        .filter((Issue.id == issue_id_or_key) | (Issue.key == issue_id_or_key.upper()))
        .first()
    )
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    db.delete(issue)
    db.commit()
    return None


@router.post("/issues/{issue_id_or_key}/comments", response_model=IssueCommentResponse)
def add_issue_comment(
    issue_id_or_key: str,
    payload: IssueCommentCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Add a comment to an Issue."""
    issue = (
        db.query(Issue)
        .filter((Issue.id == issue_id_or_key) | (Issue.key == issue_id_or_key.upper()))
        .first()
    )
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    comment = IssueComment(
        issue_id=issue.id,
        author_id=current_user.id,
        content=payload.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


# ── Meeting to Jira Integration ──────────────────────
@router.get("/meetings/{meeting_id}/workspace", response_model=JiraProjectResponse)
def get_or_create_meeting_workspace(
    meeting_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Get or auto-create a Jira Project Workspace for a meeting."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    # Check if project already linked
    existing = db.query(JiraProject).filter(JiraProject.meeting_id == meeting.id).first()
    if existing:
        return existing

    # Auto generate project key from meeting title
    base_key = _generate_clean_key(meeting.title)
    key = base_key
    counter = 1
    while db.query(JiraProject).filter(JiraProject.key == key).first():
        key = f"{base_key[:3]}{counter}"
        counter += 1

    project = JiraProject(
        key=key,
        name=f"Meeting: {meeting.title}",
        description=f"Action items and task workspace for meeting '{meeting.title}'",
        meeting_id=meeting.id,
        organization_id=meeting.organization_id,
        department_id=meeting.department_id,
        created_by_id=current_user.id,
        issue_counter=0,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Create default Sprint 1
    sprint = Sprint(
        project_id=project.id,
        name=f"{key} Sprint 1",
        goal=f"Complete action items from meeting {meeting.title}",
        status=SprintStatusEnum.ACTIVE,
        start_date=datetime.now(timezone.utc),
    )
    db.add(sprint)
    db.commit()

    return project


@router.post("/meetings/{meeting_id}/sync-to-jira", response_model=List[IssueResponse])
def sync_meeting_tasks_to_jira(
    meeting_id: str,
    payload: MeetingSyncToJiraRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Export and sync extracted FollowUpTasks from a meeting into Jira Issues."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    # Target Project
    if payload.target_project_id:
        project = db.query(JiraProject).filter(JiraProject.id == payload.target_project_id).first()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target Jira project not found")
    else:
        # Get or create meeting workspace
        project = db.query(JiraProject).filter(JiraProject.meeting_id == meeting.id).first()
        if not project:
            key = payload.project_key.upper() if payload.project_key else _generate_clean_key(meeting.title)
            name = payload.project_name if payload.project_name else f"Meeting: {meeting.title}"
            project = JiraProject(
                key=key,
                name=name,
                description=f"Action items and task board for meeting '{meeting.title}'",
                meeting_id=meeting.id,
                organization_id=meeting.organization_id,
                department_id=meeting.department_id,
                created_by_id=current_user.id,
                issue_counter=0,
            )
            db.add(project)
            db.commit()
            db.refresh(project)

    # Find active sprint in project or create one
    active_sprint = (
        db.query(Sprint)
        .filter(Sprint.project_id == project.id, Sprint.status == SprintStatusEnum.ACTIVE)
        .first()
    )
    if not active_sprint:
        active_sprint = Sprint(
            project_id=project.id,
            name=payload.sprint_name if payload.sprint_name else f"{project.key} Sprint 1",
            goal=f"Sprint for action items from {meeting.title}",
            status=SprintStatusEnum.ACTIVE,
            start_date=datetime.now(timezone.utc),
        )
        db.add(active_sprint)
        db.commit()
        db.refresh(active_sprint)

    # Get follow up tasks from meeting
    follow_up_tasks = (
        db.query(FollowUpTask)
        .filter(FollowUpTask.meeting_id == meeting.id)
        .all()
    )

    created_issues = []
    for task in follow_up_tasks:
        # Check if already synced
        existing_issue = (
            db.query(Issue)
            .filter(Issue.project_id == project.id, Issue.transcript_segment_id == task.transcript_segment_id, Issue.summary == task.title)
            .first()
        )
        if existing_issue:
            created_issues.append(existing_issue)
            continue

        project.issue_counter += 1
        issue_key = f"{project.key}-{project.issue_counter}"

        issue = Issue(
            project_id=project.id,
            key=issue_key,
            summary=task.title,
            description=task.description or f"Auto-extracted from meeting '{meeting.title}'",
            type=IssueTypeEnum.TASK,
            status=IssueStatusEnum.TODO,
            priority=IssuePriorityEnum.MEDIUM,
            story_points=3,
            sprint_id=active_sprint.id,
            reporter_id=current_user.id,
            assignee_id=task.assignee_id,
            due_date=task.deadline,
            meeting_id=meeting.id,
            transcript_segment_id=task.transcript_segment_id,
            sprint_position=len(created_issues) * 1000 + 1000,
            board_position=len(created_issues) * 1000 + 1000,
        )
        db.add(issue)
        created_issues.append(issue)

    db.commit()
    for issue in created_issues:
        db.refresh(issue)

    return created_issues
