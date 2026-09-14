
from sqlalchemy.orm import Session
with open("src/backend/api/v1/meeting_end.py", "a", encoding="utf-8") as f:
    f.write("""
from src.backend.schemas.meeting import PushToJiraRequest

@router.post("/{meeting_id}/push-to-jira")
def push_to_jira_endpoint(
    meeting_id: str,
    payload: PushToJiraRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    from src.backend.models import FollowUpTask, JiraProject, Issue, IssueTypeEnum, IssueStatusEnum, IssuePriorityEnum
    from src.backend.core.utils import generate_uuid

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException("Meeting")
    _require_host(db, meeting_id, current_user.id)

    # 1. Ensure a default JiraProject exists for this org
    org_id = meeting.organization_id
    project = None
    if org_id:
        project = db.query(JiraProject).filter(JiraProject.organization_id == org_id).first()
    
    if not project:
        # Fallback to a default project if none exists
        project = db.query(JiraProject).filter(JiraProject.key == "DX").first()
        if not project:
            project = JiraProject(
                id=generate_uuid(),
                key="DX",
                name="Core Workspace",
                organization_id=org_id,
                created_by_id=current_user.id,
                issue_counter=0
            )
            db.add(project)
            db.commit()
            db.refresh(project)

    # 2. Process tasks
    for task_data in payload.tasks:
        db_task = db.query(FollowUpTask).filter(
            FollowUpTask.id == task_data.id,
            FollowUpTask.meeting_id == meeting_id
        ).first()
        if not db_task:
            continue
        
        # Update FollowUpTask with edits
        db_task.title = task_data.title
        db_task.assignee_id = task_data.assignee_id
        db_task.deadline = task_data.deadline

        # Create Issue if not already pushed
        if not db_task.issue_id:
            project.issue_counter += 1
            issue_key = f"{project.key}-{project.issue_counter}"
            new_issue = Issue(
                id=generate_uuid(),
                project_id=project.id,
                key=issue_key,
                summary=db_task.title,
                description=db_task.description or "",
                type=IssueTypeEnum.TASK,
                status=IssueStatusEnum.TODO,
                priority=IssuePriorityEnum.MEDIUM,
            )
            db.add(new_issue)
            db.flush()
            db_task.issue_id = new_issue.id

    db.commit()
    return {"status": "success", "message": "Tasks pushed to MiniJira successfully"}
""")

