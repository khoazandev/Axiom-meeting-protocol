import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import AuditLog, RoleEnum, User, WorkspaceMember

router = APIRouter(prefix="/admin", tags=["admin"])


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    user_id: Optional[str] = None
    action: str
    resource: str
    ip_address: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime.datetime


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    member: WorkspaceMember = Depends(deps.require_role([RoleEnum.OWNER, RoleEnum.ADMIN])),
    db: Session = Depends(get_db),
):
    return (
        db.query(AuditLog)
        .filter(AuditLog.workspace_id == member.workspace_id)
        .order_by(AuditLog.created_at.desc())
        .all()
    )
