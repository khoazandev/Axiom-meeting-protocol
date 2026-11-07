"""Meeting End API — Host-only endpoint to end a meeting."""

from datetime import datetime, timezone
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
        FollowUpTaskStatusEnum,
        DepartmentMember,
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

    # 1. Ensure target JiraProject exists (prioritizing meeting's department project e.g. SMA)
    org_id = meeting.organization_id
    project = None
    if meeting.department_id:
        project = db.query(JiraProject).filter(JiraProject.department_id == meeting.department_id).first()
    if not project:
        project = db.query(JiraProject).filter(JiraProject.key == "SMA").first()
    if not project and org_id:
        project = db.query(JiraProject).filter(JiraProject.organization_id == org_id).first()
    if not project:
        project = db.query(JiraProject).filter(JiraProject.key == "DX").first()
    if not project:
        project = JiraProject(
            id=generate_uuid(),
            key="SMA",
            name="Smart Meeting AI Core",
            organization_id=org_id,
            department_id=meeting.department_id,
            created_by_id=current_user.id,
            issue_counter=0
        )
        db.add(project)
        db.commit()
        db.refresh(project)

    # 2. Process tasks
    for task_data in payload.tasks:
        assignee_id = task_data.assignee_id if task_data.assignee_id and str(task_data.assignee_id).strip() else None

        parsed_deadline = None
        if task_data.deadline:
            if isinstance(task_data.deadline, datetime):
                parsed_deadline = task_data.deadline
            else:
                try:
                    clean_str = str(task_data.deadline).replace("Z", "+00:00")
                    if len(clean_str) == 10:
                        parsed_deadline = datetime.strptime(clean_str, "%Y-%m-%d")
                    else:
                        parsed_deadline = datetime.fromisoformat(clean_str)
                except Exception:
                    parsed_deadline = None

        db_task = db.query(FollowUpTask).filter(
            FollowUpTask.id == task_data.id,
            FollowUpTask.meeting_id == meeting_id
        ).first()

        if not db_task and task_data.title:
            db_task = db.query(FollowUpTask).filter(
                FollowUpTask.meeting_id == meeting_id,
                FollowUpTask.title == task_data.title.strip()
            ).first()

        if not db_task:
            db_task = FollowUpTask(
                id=generate_uuid(),
                meeting_id=meeting_id,
                title=task_data.title or "Nhiệm vụ mới",
                assignee_id=assignee_id,
                deadline=parsed_deadline,
                status=FollowUpTaskStatusEnum.CONFIRMED,
                source=FollowUpTaskSourceEnum.MANUAL,
            )
            db.add(db_task)
            db.flush()
        else:
            db_task.title = task_data.title
            db_task.assignee_id = assignee_id
            db_task.deadline = parsed_deadline
            db_task.status = FollowUpTaskStatusEnum.CONFIRMED

        # Resolve issue department
        issue_dept_id = meeting.department_id or (project.department_id if project else None)
        if not issue_dept_id and assignee_id:
            user_dept = db.query(DepartmentMember).filter(DepartmentMember.user_id == assignee_id).first()
            if user_dept:
                issue_dept_id = user_dept.department_id

        # Create or Update Issue in Jira
        existing_issue = None
        if db_task.issue_id:
            existing_issue = db.query(Issue).filter(Issue.id == db_task.issue_id).first()

        if not existing_issue:
            # Safely calculate next issue counter to prevent unique constraint collisions
            all_keys = db.query(Issue.key).filter(Issue.project_id == project.id).all()
            max_num = project.issue_counter or 0
            for (k,) in all_keys:
                if k and k.startswith(f"{project.key}-"):
                    try:
                        num = int(k.split(f"{project.key}-")[1])
                        if num > max_num:
                            max_num = num
                    except (ValueError, IndexError):
                        pass
            project.issue_counter = max_num + 1
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
                department_id=issue_dept_id,
                due_date=parsed_deadline,
                meeting_id=meeting.id,
                transcript_segment_id=db_task.transcript_segment_id,
            )
            db.add(new_issue)
            db.flush()
            db_task.issue_id = new_issue.id
        else:
            existing_issue.summary = db_task.title
            existing_issue.assignee_id = assignee_id
            existing_issue.due_date = parsed_deadline
            if issue_dept_id and not existing_issue.department_id:
                existing_issue.department_id = issue_dept_id

    db.commit()
    return {"status": "success", "message": "Tasks pushed to MiniJira successfully"}

