"""Meeting End API — Host-only endpoint to end a meeting."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.core.exceptions import NotFoundException
from src.backend.database import get_db
from src.backend.models import (
    Meeting,
    MeetingMember,
    MeetingMemberRoleEnum,
    MeetingStatusEnum,
    Organization,
    OrganizationMember,
    User,
)

router = APIRouter(prefix="/meetings", tags=["meeting-end"])


def _require_host(db: Session, meeting: Meeting, user: User):
    """Verify the user is creator, HOST, meeting member, or org admin/member."""
    if not meeting.created_by_id or meeting.created_by_id == user.id:
        return

    member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.meeting_id == meeting.id,
            MeetingMember.user_id == user.id,
        )
        .first()
    )
    if member:
        return

    created_org = db.query(Organization).filter(Organization.created_by_id == user.id).first()
    if created_org:
        return

    org_member = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .first()
    )
    if org_member:
        if not meeting.organization_id or org_member.organization_id == meeting.organization_id:
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Chỉ thành viên hoặc người tạo cuộc họp mới có quyền kết thúc và tổng kết cuộc họp",
    )


@router.post("/{meeting_id}/end")
async def end_meeting_endpoint(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    End a meeting (HOST, Creator, or Admin).

    Triggers:
    - Full follow-up task extraction from transcript
    - Meeting summary generation via AI
    - LiveKit room closure
    - Meeting status → COMPLETED
    """
    # Verify meeting exists
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException("Meeting")

    # Verify user has permission (HOST, Creator, or Admin)
    _require_host(db, meeting, current_user)

    # Execute end meeting flow
    from src.backend.services.meeting_end_service import end_meeting
    import inspect

    res = end_meeting(db, meeting_id, current_user.id)
    if inspect.isawaitable(res):
        result = await res
    else:
        result = res
    return result

from src.backend.schemas.meeting import PushToJiraRequest

@router.post("/{meeting_id}/push-to-jira")
def push_to_jira_endpoint(
    meeting_id: str,
    payload: PushToJiraRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    from src.backend.models import (
        FollowUpTask,
        FollowUpTaskSourceEnum,
        JiraProject,
        Issue,
        IssueTypeEnum,
        IssueStatusEnum,
        IssuePriorityEnum,
        generate_uuid,
    )

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException("Meeting")
    _require_host(db, meeting, current_user)

    # 1. Ensure a default JiraProject exists for this org
    org_id = meeting.organization_id
    project = None
    if org_id:
        project = db.query(JiraProject).filter(JiraProject.organization_id == org_id).first()
    
    if not project:
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
        assignee_id = task_data.assignee_id if task_data.assignee_id and str(task_data.assignee_id).strip() else None

        db_task = db.query(FollowUpTask).filter(
            FollowUpTask.id == task_data.id,
            FollowUpTask.meeting_id == meeting_id
        ).first()

        if not db_task:
            db_task = FollowUpTask(
                id=generate_uuid(),
                meeting_id=meeting_id,
                title=task_data.title or "Nhiệm vụ mới",
                assignee_id=assignee_id,
                deadline=task_data.deadline,
                status="CONFIRMED",
                source=FollowUpTaskSourceEnum.MANUAL,
            )
            db.add(db_task)
            db.flush()
        else:
            db_task.title = task_data.title
            db_task.assignee_id = assignee_id
            db_task.deadline = task_data.deadline
            db_task.status = "CONFIRMED"

        # Create Issue if not already pushed to Jira
        if not db_task.issue_id:
            project.issue_counter += 1
            issue_key = f"{project.key}-{project.issue_counter}"
            new_issue = Issue(
                id=generate_uuid(),
                project_id=project.id,
                key=issue_key,
                summary=db_task.title,
                description=db_task.description or f"Nhiệm vụ từ cuộc họp: {meeting.title}",
                type=IssueTypeEnum.TASK,
                status=IssueStatusEnum.TODO,
                priority=IssuePriorityEnum.MEDIUM,
                reporter_id=current_user.id,
                assignee_id=assignee_id,
                department_id=meeting.department_id,
                due_date=db_task.deadline,
                meeting_id=meeting.id,
                transcript_segment_id=db_task.transcript_segment_id,
            )
            db.add(new_issue)
            db.flush()
            db_task.issue_id = new_issue.id

    db.commit()
    return {"status": "success", "message": "Tasks pushed to MiniJira successfully"}
