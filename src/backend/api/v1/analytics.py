import datetime
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import (
    AuditLog,
    Issue,
    JiraProject,
    Meeting,
    OrganizationMember,
    User,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/export", response_class=PlainTextResponse)
def export_organization_analytics(
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Export multi-tenant organization analytics (meetings, Jira issues, audit events) in NDJSON format."""
    # Verify user is an active member with OWNER or ADMIN role
    member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.status == "ACTIVE",
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not an active member of this organization",
        )

    role_name = member.role.name.upper() if member.role else ""
    if role_name not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Owner role required to export organization analytics",
        )

    records = []

    # Export meeting records
    meetings = db.query(Meeting).filter(Meeting.organization_id == org_id).all()
    for m in meetings:
        records.append({
            "event_type": "meeting_record",
            "organization_id": org_id,
            "meeting_id": m.id,
            "title": m.title,
            "status": str(m.status.value) if hasattr(m.status, "value") else str(m.status),
            "meeting_type": m.meeting_type,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    # Export task records from Jira Issues
    issues = (
        db.query(Issue)
        .join(JiraProject, JiraProject.id == Issue.project_id)
        .filter(JiraProject.organization_id == org_id)
        .all()
    )
    for issue in issues:
        records.append({
            "event_type": "task_record",
            "organization_id": org_id,
            "task_id": issue.id,
            "key": issue.key,
            "title": issue.summary,
            "priority": str(issue.priority.value) if hasattr(issue.priority, "value") else str(issue.priority),
            "status": str(issue.status.value) if hasattr(issue.status, "value") else str(issue.status),
            "type": str(issue.type.value) if hasattr(issue.type, "value") else str(issue.type),
            "created_at": issue.created_at.isoformat() if issue.created_at else None,
        })

    # Export audit records
    audits = db.query(AuditLog).filter(AuditLog.organization_id == org_id).all()
    for a in audits:
        records.append({
            "event_type": "audit_event",
            "organization_id": org_id,
            "action": a.action,
            "resource": a.resource,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    if not records:
        records.append({
            "event_type": "analytics_snapshot",
            "organization_id": org_id,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "status": "INITIALIZED",
        })

    ndjson_content = "\n".join(json.dumps(r) for r in records) + "\n"
    return PlainTextResponse(content=ndjson_content, media_type="application/x-ndjson")


@router.get("/summary")
def get_organization_analytics_summary(
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Get high-level aggregated analytics counts for the organization."""
    member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.status == "ACTIVE",
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not an active member of this organization",
        )

    role_name = member.role.name.upper() if member.role else ""
    if role_name not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Owner role required to view organization analytics",
        )

    meetings_count = db.query(Meeting).filter(Meeting.organization_id == org_id).count()
    issues_count = (
        db.query(Issue)
        .join(JiraProject, JiraProject.id == Issue.project_id)
        .filter(JiraProject.organization_id == org_id)
        .count()
    )
    audits_count = db.query(AuditLog).filter(AuditLog.organization_id == org_id).count()
    members_count = db.query(OrganizationMember).filter(OrganizationMember.organization_id == org_id).count()

    return {
        "organization_id": org_id,
        "total_meetings": meetings_count,
        "total_tasks": issues_count,
        "total_audit_events": audits_count,
        "total_members": members_count,
    }
