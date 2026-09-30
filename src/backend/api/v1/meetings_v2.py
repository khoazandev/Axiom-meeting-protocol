import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status, File, UploadFile
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from src.backend.api import deps
from src.backend.core.exceptions import AuthenticationException, ForbiddenException, NotFoundException
from src.backend.database import get_db
from src.backend.models import (
    Meeting,
    MeetingMember,
    MeetingMemberRoleEnum,
    MeetingMemberStatusEnum,
    MeetingStatusEnum,
    FollowUpTask,
    TranscriptSegment,
    MeetingSummary,
    MeetingDocument,
    KnowledgeChunk,
    User,
)
from src.backend.models import Department, DepartmentMember, AuditLog, OrganizationMember, OrgMemberStatusEnum, Organization, Role
from src.backend.schemas.meeting import (
    MeetingApprovalRequest,
    MeetingCreate,
    MeetingMemberAdd,
    MeetingMemberResponse,
    MeetingResponse,
    MeetingUpdate,
)


router = APIRouter(prefix="/meetings", tags=["meetings"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_meeting_or_404(db: Session, meeting_id: str) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise NotFoundException("Meeting")
    return meeting


def _get_user_role_and_dept(
    db: Session, user: User, organization_id: str | None = None,
) -> tuple[str, str | None]:
    """
    Returns (role_name, department_id).
    role_name is 'OWNER', 'ADMIN', 'MANAGER', or 'MEMBER'.
    """
    if not user:
        return "MEMBER", None

    # A meeting role belongs to its organization, not another organization on the user.
    om_query = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user.id,
        OrganizationMember.status == OrgMemberStatusEnum.ACTIVE,
    )
    if organization_id is not None:
        om_query = om_query.filter(OrganizationMember.organization_id == organization_id)
    om = om_query.first()
    om_role_name = ""
    if om and om.role_id:
        r = db.query(Role).filter(Role.id == om.role_id).first()
        if r:
            om_role_name = r.name.upper()

    # Check DepartmentMember
    dm_query = db.query(DepartmentMember).filter(DepartmentMember.user_id == user.id)
    if organization_id is not None:
        dm_query = dm_query.join(Department, DepartmentMember.department_id == Department.id).filter(
            Department.organization_id == organization_id,
        )
    dm = dm_query.first() if om else None
    dept_id = dm.department_id if dm else None
    dm_role_name = ""
    if dm and dm.role_id:
        r = db.query(Role).filter(Role.id == dm.role_id).first()
        if r:
            dm_role_name = r.name.upper()

    if om_role_name in ("OWNER", "ADMIN"):
        return om_role_name, dept_id

    if om_role_name == "MANAGER" or dm_role_name == "MANAGER":
        return "MANAGER", dept_id

    return "MEMBER", dept_id


def _is_high_level_meeting(meeting: Meeting) -> bool:
    """
    Check if a meeting is a high-level executive meeting.
    High-level meetings include:
    - Meetings without a department (organization-wide / executive board)
    - Meetings with meeting_type in ('EXECUTIVE', 'BOARD')
    - Meetings with titles indicating executive / board / leadership
    """
    if meeting.department_id is None:
        return True
    m_type = str(getattr(meeting, "meeting_type", "") or "").upper()
    if m_type in ("EXECUTIVE", "BOARD"):
        return True
    title_lower = (meeting.title or "").lower()
    keywords = ["cấp cao", "ban điều hành", "hội nghị ban", "executive", "hội đồng", "toàn công ty"]
    return any(kw in title_lower for kw in keywords)


def _can_user_access_meeting(db: Session, meeting: Meeting, user: User) -> bool:
    if not user:
        return False

    role, user_dept_id = (
        _get_user_role_and_dept(db, user, meeting.organization_id)
        if meeting.organization_id else ("MEMBER", None)
    )

    # 1. OWNER / ADMIN has universal access
    if role in ("OWNER", "ADMIN"):
        return True

    is_high_level = _is_high_level_meeting(meeting)

    # 2. High-level meetings: ONLY OWNER, ADMIN, and MANAGER can see / access
    if is_high_level:
        if role == "MANAGER":
            return True
        # Regular members are NEVER allowed to access high-level meetings
        return False

    # 3. For regular department meetings:
    # Creator always has access
    if meeting.created_by_id == user.id:
        return True

    # Department access: If meeting belongs to user's department
    if user_dept_id and meeting.department_id == user_dept_id:
        return True

    # Direct invited member of this regular meeting
    is_meeting_member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.meeting_id == meeting.id,
            MeetingMember.user_id == user.id,
        )
        .first()
    )
    if is_meeting_member:
        return True

    return False


def _require_meeting_member(db: Session, meeting_id: str, user_id: str) -> MeetingMember:
    meeting = _get_meeting_or_404(db, meeting_id)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthenticationException("Người dùng không tồn tại")

    if not _can_user_access_meeting(db, meeting, user):
        raise ForbiddenException("Bạn không có quyền truy cập cuộc họp này")

    member = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.meeting_id == meeting_id,
            MeetingMember.user_id == user_id,
        )
        .first()
    )
    if member:
        return member

    role_name, _ = (
        _get_user_role_and_dept(db, user, meeting.organization_id)
        if meeting.organization_id else ("MEMBER", None)
    )
    is_host = role_name in ("OWNER", "ADMIN") or meeting.created_by_id == user.id
    new_member = MeetingMember(
        meeting_id=meeting_id,
        user_id=user_id,
        role=MeetingMemberRoleEnum.HOST if is_host else MeetingMemberRoleEnum.PARTICIPANT,
        status=MeetingMemberStatusEnum.ACCEPTED,
    )
    db.add(new_member)
    try:
        db.commit()
        db.refresh(new_member)
    except Exception:
        db.rollback()
        existing = (
            db.query(MeetingMember)
            .filter(
                MeetingMember.meeting_id == meeting_id,
                MeetingMember.user_id == user_id,
            )
            .first()
        )
        if existing:
            return existing
    return new_member


def _is_meeting_org_admin(db: Session, meeting: Meeting, user: User) -> bool:
    if not meeting.organization_id:
        return False
    if db.query(Organization).filter(
        Organization.id == meeting.organization_id,
        Organization.created_by_id == user.id,
    ).first():
        return True
    return _get_user_role_and_dept(db, user, meeting.organization_id)[0] in ("OWNER", "ADMIN")


def _enrich_meeting(m: Meeting, db: Session) -> dict:
    host_member = (
        db.query(MeetingMember)
        .filter(MeetingMember.meeting_id == m.id, MeetingMember.role == MeetingMemberRoleEnum.HOST)
        .first()
    )
    host_user = (
        db.query(User)
        .filter(User.id == (host_member.user_id if host_member else m.created_by_id))
        .first()
    )
    dept = db.query(Department).filter(Department.id == m.department_id).first() if m.department_id else None
    count = db.query(MeetingMember).filter(MeetingMember.meeting_id == m.id).count()
    summary_obj = db.query(MeetingSummary).filter(MeetingSummary.meeting_id == m.id).first()
    task_cnt = db.query(FollowUpTask).filter(FollowUpTask.meeting_id == m.id).count()

    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "agenda": m.description,
        "organization_id": m.organization_id,
        "department_id": m.department_id,
        "department_name": dept.name if dept else "Khối Doanh Nghiệp",
        "created_by_id": m.created_by_id,
        "host_name": host_user.full_name if host_user else "Ban Tổ Chức",
        "host_avatar": host_user.avatar_url if host_user else None,
        "status": m.status.value if hasattr(m.status, "value") else str(m.status),
        "approval_status": getattr(m, "approval_status", "APPROVED") or "APPROVED",
        "meeting_type": getattr(m, "meeting_type", "OFFICIAL") or "OFFICIAL",
        "scheduled_at": m.scheduled_at,
        "started_at": m.started_at,
        "ended_at": m.ended_at,
        "participant_count": max(count, 1),
        "summary": summary_obj.summary if summary_obj else None,
        "key_points": summary_obj.key_points if summary_obj else None,
        "decisions": summary_obj.decisions if summary_obj else None,
        "task_count": task_cnt,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }


# ---------------------------------------------------------------------------
# Meeting CRUD
# ---------------------------------------------------------------------------
@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Create a new meeting. Creator is auto-added as HOST."""
    approval_st = payload.approval_status or "APPROVED"
    m_type = payload.meeting_type or "OFFICIAL"

    org_id = payload.organization_id
    if not org_id and current_user:
        user_org = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.user_id == current_user.id)
            .first()
        )
        if user_org:
            org_id = user_org.organization_id

    dept_id = payload.department_id
    if not dept_id and current_user:
        user_dept = (
            db.query(DepartmentMember)
            .filter(DepartmentMember.user_id == current_user.id)
            .first()
        )
        if user_dept:
            dept_id = user_dept.department_id

    sched_at = payload.scheduled_at or getattr(payload, "scheduled_start_time", None)

    meeting = Meeting(
        title=payload.title,
        description=payload.description or payload.agenda,
        organization_id=org_id,
        department_id=dept_id,
        created_by_id=current_user.id,
        scheduled_at=sched_at,
        status=MeetingStatusEnum.SCHEDULED,
        approval_status=approval_st,
        meeting_type=m_type,
    )
    db.add(meeting)
    db.flush()

    # Auto-add creator as HOST
    host = MeetingMember(
        meeting_id=meeting.id,
        user_id=current_user.id,
        role=MeetingMemberRoleEnum.HOST,
        status=MeetingMemberStatusEnum.ACCEPTED,
    )
    db.add(host)

    # Add optional participants (safely verify user existence)
    if payload.participant_ids:
        valid_user_ids = {
            u[0] for u in db.query(User.id).filter(User.id.in_(payload.participant_ids)).all()
        }
        for pid in payload.participant_ids:
            if pid != current_user.id and pid in valid_user_ids:
                member = MeetingMember(
                    meeting_id=meeting.id,
                    user_id=pid,
                    role=MeetingMemberRoleEnum.PARTICIPANT,
                    status=MeetingMemberStatusEnum.INVITED,
                )
                db.add(member)

    # Audit log
    audit = AuditLog(
        organization_id=org_id,
        user_id=current_user.id,
        action="CREATE_MEETING",
        resource=f"meeting:{meeting.id}",
        details=f"Tạo cuộc họp '{meeting.title}' (loại: {m_type}, duyệt: {approval_st})",
    )
    db.add(audit)

    db.commit()
    db.refresh(meeting)
    return _enrich_meeting(meeting, db)


@router.get("/", response_model=list[MeetingResponse])
@router.get("", response_model=list[MeetingResponse])
def list_my_meetings(
    status_filter: str | None = None,
    approval_filter: str | None = None,
    meeting_type_filter: str | None = None,
    org_id: str | None = None,
    department_id: str | None = None,
    all_org_meetings: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List meetings with role-based visibility:
    - OWNER / ADMIN: All meetings
    - MANAGER: High-level meetings + meetings of own department + meetings created/invited
    - MEMBER: Only meetings of own department (never high-level meetings)
    """
    query = db.query(Meeting)

    if org_id:
        query = query.filter(Meeting.organization_id == org_id)

    if status_filter:
        query = query.filter(Meeting.status == status_filter)
    if approval_filter:
        query = query.filter(Meeting.approval_status == approval_filter)
    if meeting_type_filter:
        query = query.filter(Meeting.meeting_type == meeting_type_filter)

    meetings = [
        meeting for meeting in query.order_by(Meeting.created_at.desc()).all()
        if _can_user_access_meeting(db, meeting, current_user)
        and (
            not department_id
            or meeting.department_id == department_id
            or (
                _is_high_level_meeting(meeting)
                and meeting.organization_id
                and _get_user_role_and_dept(db, current_user, meeting.organization_id)[0] == "MANAGER"
            )
        )
    ]
    return [_enrich_meeting(m, db) for m in meetings]


@router.patch("/{meeting_id}/approval", response_model=MeetingResponse)
def update_meeting_approval(
    meeting_id: str,
    payload: MeetingApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Owner or Admin approves or rejects a meeting proposal."""
    meeting = _get_meeting_or_404(db, meeting_id)
    if not _is_meeting_org_admin(db, meeting, current_user):
        raise ForbiddenException("Only an organization owner or admin can approve meetings")
    old_approval = getattr(meeting, "approval_status", "PENDING")
    meeting.approval_status = payload.approval_status

    # Audit log
    audit = AuditLog(
        organization_id=meeting.organization_id,
        user_id=current_user.id,
        action=f"MEETING_APPROVAL_{payload.approval_status}",
        resource=f"meeting:{meeting.id}",
        details=f"Phê duyệt cuộc họp '{meeting.title}' sang '{payload.approval_status}'. Lý do: {payload.reason or 'Không có'}",
    )
    db.add(audit)
    db.commit()
    db.refresh(meeting)
    return _enrich_meeting(meeting, db)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get meeting details. User must be a member."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)
    return _enrich_meeting(meeting, db)


@router.patch("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(
    meeting_id: str,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Update meeting details. Only HOST or creator can update."""
    meeting = _get_meeting_or_404(db, meeting_id)
    if meeting.created_by_id != current_user.id and not _is_meeting_org_admin(db, meeting, current_user):
        member = _require_meeting_member(db, meeting_id, current_user.id)
        if member.role not in (MeetingMemberRoleEnum.HOST, MeetingMemberRoleEnum.CO_HOST):
            raise ForbiddenException("Only the creator, host, or organization admin can update a meeting")

    if payload.title is not None:
        meeting.title = payload.title
    if payload.description is not None:
        meeting.description = payload.description
    elif payload.agenda is not None:
        meeting.description = payload.agenda
    if payload.scheduled_at is not None:
        meeting.scheduled_at = payload.scheduled_at
    if payload.status is not None:
        old_status = meeting.status
        meeting.status = payload.status
        if payload.status in ("IN_PROGRESS", "STARTED"):
            if not meeting.started_at:
                meeting.started_at = datetime.now(timezone.utc)
        if payload.status in ("COMPLETED", "ENDED"):
            if not meeting.ended_at:
                meeting.ended_at = datetime.now(timezone.utc)
            if old_status not in ("COMPLETED", "ENDED"):
                try:
                    from src.backend.services.action_item_extractor import extract_action_items
                    extract_action_items(db, meeting_id, current_user.id)
                except Exception as e:
                    logger.warning(f"Failed to auto-extract action items for meeting {meeting_id}: {e}")

    db.commit()
    db.refresh(meeting)
    return _enrich_meeting(meeting, db)


@router.post("/{meeting_id}/start-early")
def start_meeting_early(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Start a scheduled meeting early and set status to IN_PROGRESS."""
    meeting = _get_meeting_or_404(db, meeting_id)
    if meeting.created_by_id != current_user.id and not _is_meeting_org_admin(db, meeting, current_user):
        member = _require_meeting_member(db, meeting_id, current_user.id)
        if member.role not in (MeetingMemberRoleEnum.HOST, MeetingMemberRoleEnum.CO_HOST):
            raise ForbiddenException("Only the creator, host, or organization admin can start a meeting")
    meeting.status = MeetingStatusEnum.IN_PROGRESS
    if not meeting.started_at:
        meeting.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(meeting)
    return _enrich_meeting(meeting, db)



@router.delete("/{meeting_id}")
def delete_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Delete a meeting. Only creator, HOST or organization admin can delete."""
    meeting = _get_meeting_or_404(db, meeting_id)

    # Check if user is Owner/Admin
    is_owner = _is_meeting_org_admin(db, meeting, current_user)

    # If meeting is in the archive (COMPLETED or ENDED), ONLY OWNER can delete!
    status_val = str(getattr(meeting.status, "value", meeting.status) or "").upper()
    if status_val in ("COMPLETED", "ENDED") or meeting.status == MeetingStatusEnum.COMPLETED:
        if not is_owner:
            raise ForbiddenException("Chỉ Quản trị viên tối cao (Owner) mới có quyền xóa cuộc họp trong kho lưu trữ.")
    else:
        # Non-archived meeting: Creator, Host, or Owner can delete
        is_creator = meeting.created_by_id == current_user.id
        is_host = False
        member = (
            db.query(MeetingMember)
            .filter(
                MeetingMember.meeting_id == meeting_id,
                MeetingMember.user_id == current_user.id,
            )
            .first()
        )
        if member and member.role == MeetingMemberRoleEnum.HOST:
            is_host = True

        if not (is_creator or is_host or is_owner):
            raise ForbiddenException("Bạn không có quyền xóa cuộc họp này. Chỉ người tạo, chủ tọa hoặc Owner mới có quyền xóa.")

    # Delete dependent child rows in strict FK dependency order
    from sqlalchemy import text
    try:
        # 1. Update issue self-references (parent_id, epic_id)
        db.execute(
            text(
                'UPDATE issues SET parent_id = NULL, epic_id = NULL '
                'WHERE meeting_id = :mid OR project_id IN (SELECT id FROM jira_projects WHERE meeting_id = :mid)'
            ),
            {'mid': meeting_id},
        )

        # 2. Delete extraction corrections (references transcript_segments)
        db.execute(text('DELETE FROM extraction_corrections WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 3. Delete follow-up tasks (references issues, transcript_segments, topics)
        db.execute(
            text(
                'DELETE FROM follow_up_tasks '
                'WHERE meeting_id = :mid OR issue_id IN ('
                '  SELECT id FROM issues WHERE meeting_id = :mid OR project_id IN ('
                '    SELECT id FROM jira_projects WHERE meeting_id = :mid'
                '  )'
                ')'
            ),
            {'mid': meeting_id},
        )

        # 4. Delete issue comments (references issues)
        db.execute(
            text(
                'DELETE FROM issue_comments WHERE issue_id IN ('
                '  SELECT id FROM issues WHERE meeting_id = :mid OR project_id IN ('
                '    SELECT id FROM jira_projects WHERE meeting_id = :mid'
                '  )'
                ')'
            ),
            {'mid': meeting_id},
        )

        # 5. Delete issues (references jira_projects, sprints, meetings)
        db.execute(
            text(
                'DELETE FROM issues WHERE meeting_id = :mid OR project_id IN ('
                '  SELECT id FROM jira_projects WHERE meeting_id = :mid'
                ')'
            ),
            {'mid': meeting_id},
        )

        # 6. Delete sprints (references jira_projects)
        db.execute(
            text('DELETE FROM sprints WHERE project_id IN (SELECT id FROM jira_projects WHERE meeting_id = :mid)'),
            {'mid': meeting_id},
        )

        # 7. Delete jira projects
        db.execute(text('DELETE FROM jira_projects WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 8. Delete topics (references meetings)
        db.execute(text('DELETE FROM topics WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 9. Delete knowledge chunks & documents
        db.execute(text('DELETE FROM knowledge_chunks WHERE meeting_id = :mid'), {'mid': meeting_id})
        db.execute(text('DELETE FROM knowledge_documents WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 10. Delete meeting summaries
        db.execute(text('DELETE FROM meeting_summaries WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 11. Delete meeting decisions
        db.execute(text('DELETE FROM meeting_decisions WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 12. Delete meeting chat messages
        db.execute(text('DELETE FROM meeting_chat_messages WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 13. Delete transcript segments
        db.execute(text('DELETE FROM transcript_segments WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 14. Delete meeting documents
        db.execute(text('DELETE FROM meeting_documents WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 15. Delete meeting members
        db.execute(text('DELETE FROM meeting_members WHERE meeting_id = :mid'), {'mid': meeting_id})

        # 16. Delete meeting itself via SQL
        db.execute(text('DELETE FROM meetings WHERE id = :mid'), {'mid': meeting_id})

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete meeting {meeting_id}: {e}", exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể xóa cuộc họp: {str(e)}",
        )

    return {"message": "Đã xóa cuộc họp thành công", "deleted_id": meeting_id}


@router.post("/parse-agenda")
async def parse_agenda_file(
    file: UploadFile = File(...),
    current_user: User | None = Depends(deps.get_optional_current_user),
):
    """
    Parse an uploaded agenda file (.docx, .pdf, .txt, .md, .csv, .xlsx)
    and return clean text content without binary garbage.
    """
    from src.backend.services import text_extractor

    try:
        content = await file.read()
        if not content:
            return {"filename": file.filename, "content": "", "char_count": 0}

        clean_text = text_extractor.extract_text(content, file.filename or "agenda.txt", file.content_type or "")
        clean_text = clean_text.strip()
        return {
            "filename": file.filename,
            "content": clean_text,
            "char_count": len(clean_text),
        }
    except Exception as e:
        logger.error(f"Error parsing agenda file {file.filename}: {e}")
        return {
            "filename": file.filename,
            "content": "",
            "char_count": 0,
            "error": f"Không thể trích xuất nội dung tệp: {str(e)}",
        }


# ---------------------------------------------------------------------------
# MeetingMember Management
# ---------------------------------------------------------------------------
@router.get("/{meeting_id}/members", response_model=list[MeetingMemberResponse])
def list_meeting_members(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all members of a meeting."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    from sqlalchemy.orm import joinedload
    return (
        db.query(MeetingMember)
        .options(joinedload(MeetingMember.user))
        .filter(MeetingMember.meeting_id == meeting_id)
        .all()
    )


@router.post(
    "/{meeting_id}/members",
    response_model=MeetingMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_meeting_member(
    meeting_id: str,
    payload: MeetingMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Add a user to a meeting."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    # Map string role to enum
    try:
        role_enum = MeetingMemberRoleEnum(payload.role)
    except ValueError:
        role_enum = MeetingMemberRoleEnum.PARTICIPANT

    member = MeetingMember(
        meeting_id=meeting_id,
        user_id=payload.user_id,
        role=role_enum,
        status=MeetingMemberStatusEnum.INVITED,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete(
    "/{meeting_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_meeting_member(
    meeting_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Remove a member from a meeting."""
    _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    target = (
        db.query(MeetingMember)
        .filter(
            MeetingMember.id == member_id,
            MeetingMember.meeting_id == meeting_id,
        )
        .first()
    )
    if not target:
        raise NotFoundException("Meeting member")

    db.delete(target)
    db.commit()


# ---------------------------------------------------------------------------
# LiveKit Token & In-Meeting RAG
# ---------------------------------------------------------------------------
from pydantic import BaseModel as _PydanticBaseModel
from livekit import api as livekit_api
from src.backend.core.config import get_settings
from src.backend.services.chat_service import build_rag_answer


class TokenResponse(_PydanticBaseModel):
    token: str


class RagQueryRequest(_PydanticBaseModel):
    question: str
    live_transcript: str | None = None
    chat_history: list[dict] | None = None


class RagSourceItem(_PydanticBaseModel):
    type: str
    snippet: str
    filename: str | None = None
    timestamp: int | None = None


class RagQueryResponse(_PydanticBaseModel):
    question: str
    answer: str
    sources: list[RagSourceItem]
    context_used: list[str]


import uuid

import json

@router.get("/{meeting_id}/token", response_model=TokenResponse)
def get_meeting_token(
    meeting_id: str,
    participant_name: str,
    language: str = "vi",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Generate a LiveKit access token for a meeting room."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    # Auto-start meeting if still scheduled and not yet ended
    if (meeting.status == MeetingStatusEnum.SCHEDULED or not meeting.started_at) and not meeting.ended_at and meeting.status not in (MeetingStatusEnum.COMPLETED, MeetingStatusEnum.CANCELLED):
        meeting.status = MeetingStatusEnum.IN_PROGRESS
        if not meeting.started_at:
            meeting.started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(meeting)

    settings = get_settings()
    token = livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    import uuid
    session_suffix = uuid.uuid4().hex[:6]
    unique_identity = f"user_{current_user.id}___{session_suffix}"
    token.with_identity(unique_identity)
    token.with_name(participant_name)
    token.with_metadata(json.dumps({"target_lang": language}))
    token.with_grants(
        livekit_api.VideoGrants(
            room_join=True,
            room=f"meeting-{meeting_id}",
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            can_update_own_metadata=True,
        )
    )

    # Automatically ensure AI Agent is dispatched to the room
    try:
        def _auto_dispatch():
            async def _inner():
                try:
                    http_url = settings.livekit_url.replace("ws://", "http://").replace("wss://", "https://")
                    lk = livekit_api.LiveKitAPI(http_url, settings.livekit_api_key, settings.livekit_api_secret)
                    room_name = f"meeting-{meeting_id}"
                    try:
                        participants = await lk.room.list_participants(livekit_api.ListParticipantsRequest(room=room_name))
                        has_agent = any(
                            p.identity.startswith("agent-")
                            or "agent" in p.identity.lower()
                            or getattr(p, "kind", None) == livekit_api.ParticipantKind.PARTICIPANT_KIND_AGENT
                            for p in participants.participants
                        )
                    except Exception:
                        has_agent = False

                    if not has_agent:
                        try:
                            dispatches = await lk.agent_dispatch.list_dispatch(room_name)
                            for d in dispatches:
                                try:
                                    await lk.agent_dispatch.delete_dispatch(d.id, room_name)
                                except Exception:
                                    pass
                        except Exception:
                            pass

                        req = livekit_api.CreateAgentDispatchRequest(room=room_name, agent_name="")
                        await lk.agent_dispatch.create_dispatch(req)
                    await lk.aclose()
                except Exception as ex:
                    logger.debug(f"Agent dispatch check error: {ex}")
            import asyncio
            asyncio.run(_inner())
        import threading
        threading.Thread(target=_auto_dispatch, daemon=True).start()
    except Exception as e:
        logger.warning(f"Failed to auto-dispatch agent for meeting {meeting_id}: {e}")

    return TokenResponse(token=token.to_jwt())


@router.post("/{meeting_id}/rag/query", response_model=RagQueryResponse)
async def rag_query(
    meeting_id: str,
    payload: RagQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """In-meeting RAG chatbot query: provides comprehensive answer using Agenda, Transcripts, and Notes."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_meeting_member(db, meeting_id, current_user.id)

    sources = []

    # 1. Full Agenda from meeting description
    if meeting.description and meeting.description.strip():
        sources.append({
            "type": "agenda",
            "snippet": f"Agenda / Kế hoạch cuộc họp:\n{meeting.description.strip()}"
        })

    # 2. Transcripts from DB if available
    try:
        from src.backend.models import TranscriptSegment
        segments = (
            db.query(TranscriptSegment)
            .filter(TranscriptSegment.meeting_id == meeting_id)
            .order_by(TranscriptSegment.sequence.asc())
            .all()
        )
        if segments:
            lines = [f"- {s.speaker_name or 'Người tham gia'}: {s.content}" for s in segments[-25:]]
            sources.append({
                "type": "transcript",
                "snippet": "Biên bản phát biểu cuộc họp gần đây:\n" + "\n".join(lines)
            })
    except Exception as e:
        logger.debug(f"Could not load transcript segments for meeting {meeting_id}: {e}")

    # 3. Meeting Summary & Decisions if available
    summary = None
    try:
        from src.backend.models import MeetingSummary
        summary = db.query(MeetingSummary).filter(MeetingSummary.meeting_id == meeting_id).first()
        if summary and summary.summary:
            sources.append({
                "type": "file",
                "snippet": f"Tóm tắt cuộc họp: {summary.summary}\nCác điểm chính: {summary.key_points or ''}\nNghị quyết thống nhất: {summary.decisions or ''}"
            })
    except Exception as e:
        logger.debug(f"Could not load meeting summary for meeting {meeting_id}: {e}")

    # 4. Load Follow-up Tasks & Decisions for high-accuracy response
    tasks_list = []
    decisions_list = []
    try:
        from src.backend.models import FollowUpTask, MeetingDecision
        db_tasks = db.query(FollowUpTask).filter(FollowUpTask.meeting_id == meeting_id).all()
        tasks_list = [
            {
                "title": t.title,
                "assignee": t.assignee_name or "Chưa phân công",
                "deadline": t.deadline.strftime("%d/%m/%Y") if t.deadline else "Theo tiến độ",
                "status": t.status or "TODO"
            }
            for t in db_tasks
        ]
        db_decisions = db.query(MeetingDecision).filter(MeetingDecision.meeting_id == meeting_id).all()
        decisions_list = [d.decision_text for d in db_decisions if d.decision_text]
    except Exception as e:
        logger.debug(f"Could not load tasks/decisions for meeting {meeting_id}: {e}")

    # Resolve host name safely
    host_name = "Chủ trì cuộc họp"
    try:
        host_member = (
            db.query(MeetingMember)
            .filter(MeetingMember.meeting_id == meeting_id, MeetingMember.role == MeetingMemberRoleEnum.HOST)
            .first()
        )
        if host_member and host_member.user:
            host_name = host_member.user.full_name
        elif getattr(meeting, "created_by", None):
            host_name = meeting.created_by.full_name
    except Exception:
        pass

    meeting_info = {
        "title": meeting.title or "Cuộc họp nội bộ",
        "description": meeting.description or meeting.agenda or "",
        "agenda": meeting.agenda or meeting.description or "",
        "host_name": host_name,
        "summary": summary.summary if summary else "",
        "key_points": summary.key_points if summary else "",
        "decisions": decisions_list or ([summary.decisions] if summary and summary.decisions else []),
        "tasks": tasks_list,
        "transcript_segments": [
            {
                "speaker": s.speaker_name or "Đại biểu",
                "content": s.content or ""
            }
            for s in (segments if 'segments' in locals() and segments else [])
        ]
    }

    import inspect
    rag_result = build_rag_answer(
        question=payload.question,
        sources=sources,
        live_transcript=payload.live_transcript,
        meeting_info=meeting_info,
        chat_history=payload.chat_history,
    )
    if inspect.isawaitable(rag_result):
        answer = await rag_result
    else:
        answer = rag_result

    return RagQueryResponse(
        question=payload.question,
        answer=answer,
        sources=[],  # Removed extracted sources per user request
        context_used=[],
    )


from pydantic import BaseModel

class QuickTranslateRequest(BaseModel):
    text: str
    from_lang: str = "vi"
    to_lang: str = "en"

class QuickTranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    from_lang: str
    to_lang: str


@router.post("/translate", response_model=QuickTranslateResponse)
def translate_sentence(
    req: QuickTranslateRequest,
    current_user: User | None = Depends(deps.get_optional_current_user)
):
    """
    Sub-second bilingual translation using CTranslate2 INT8 models (~100-180ms).
    """
    from src.backend import ct2_translator
    text = req.text.strip()
    if not text:
        return QuickTranslateResponse(
            original_text="",
            translated_text="",
            from_lang=req.from_lang,
            to_lang=req.to_lang
        )

    from_l = (req.from_lang or "vi").lower().split("-")[0]
    to_l = (req.to_lang or "en").lower().split("-")[0]

    translated = None
    if from_l == "vi" and to_l == "en":
        translated = ct2_translator.translate_vi_to_en(text)
    elif from_l == "en" and to_l == "vi":
        translated = ct2_translator.translate_en_to_vi(text)
    elif from_l == "vi":
        translated = ct2_translator.translate_vi_to_en(text)
    elif from_l == "en":
        translated = ct2_translator.translate_en_to_vi(text)
    else:
        translated = ct2_translator.translate_vi_to_en(text) or text

    return QuickTranslateResponse(
        original_text=text,
        translated_text=translated or text,
        from_lang=req.from_lang,
        to_lang=req.to_lang
    )
