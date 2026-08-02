import datetime
import json
from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import AuditLog, Meeting, RoleEnum, Task, WorkspaceMember

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/export", response_class=PlainTextResponse)
def export_workspace_analytics(
    member: WorkspaceMember = Depends(deps.require_role([RoleEnum.OWNER, RoleEnum.ADMIN])),
    db: Session = Depends(get_db),
):
    ws_id = member.workspace_id
    records = []

    # Export meeting records
    meetings = db.query(Meeting).filter(Meeting.workspace_id == ws_id).all()
    for m in meetings:
        records.append({
            "event_type": "meeting_record",
            "workspace_id": ws_id,
            "meeting_id": m.id,
            "title": m.title,
            "status": str(m.status.value) if hasattr(m.status, "value") else str(m.status),
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    # Export task records
    tasks = db.query(Task).filter(Task.workspace_id == ws_id).all()
    for t in tasks:
        records.append({
            "event_type": "task_record",
            "workspace_id": ws_id,
            "task_id": t.id,
            "title": t.title,
            "priority": str(t.priority.value) if hasattr(t.priority, "value") else str(t.priority),
            "status": str(t.status.value) if hasattr(t.status, "value") else str(t.status),
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    # Export audit records
    audits = db.query(AuditLog).filter(AuditLog.workspace_id == ws_id).all()
    for a in audits:
        records.append({
            "event_type": "audit_event",
            "workspace_id": ws_id,
            "action": a.action,
            "resource": a.resource,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    if not records:
        records.append({
            "event_type": "analytics_snapshot",
            "workspace_id": ws_id,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "status": "INITIALIZED",
        })

    ndjson_content = "\n".join(json.dumps(r) for r in records) + "\n"
    return PlainTextResponse(content=ndjson_content, media_type="application/x-ndjson")
