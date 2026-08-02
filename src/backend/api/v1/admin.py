import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import (
    AuditLog,
    KnowledgeDocument,
    Meeting,
    OutboundWebhook,
    RoleEnum,
    Task,
    User,
    WorkspaceMember,
)

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


class OutboundWebhookCreate(BaseModel):
    name: str
    target_url: str
    events: Optional[str] = "all"


class OutboundWebhookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    name: str
    target_url: str
    events: str
    secret_key: str
    is_active: bool
    created_at: datetime.datetime


class AdminStatsResponse(BaseModel):
    total_members: int
    total_meetings: int
    total_tasks: int
    total_documents: int
    total_audit_events: int


@router.get("/stats", response_model=AdminStatsResponse)
def get_workspace_stats(
    member: WorkspaceMember = Depends(deps.require_role([RoleEnum.OWNER, RoleEnum.ADMIN])),
    db: Session = Depends(get_db),
):
    ws_id = member.workspace_id
    total_members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws_id).count()
    total_meetings = db.query(Meeting).filter(Meeting.workspace_id == ws_id).count()
    total_tasks = db.query(Task).filter(Task.workspace_id == ws_id).count()
    total_documents = db.query(KnowledgeDocument).filter(KnowledgeDocument.workspace_id == ws_id).count()
    total_audit_events = db.query(AuditLog).filter(AuditLog.workspace_id == ws_id).count()

    return AdminStatsResponse(
        total_members=total_members,
        total_meetings=total_meetings,
        total_tasks=total_tasks,
        total_documents=total_documents,
        total_audit_events=total_audit_events,
    )


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


@router.post("/webhooks", response_model=OutboundWebhookResponse, status_code=status.HTTP_201_CREATED)
def create_outbound_webhook(
    data: OutboundWebhookCreate,
    member: WorkspaceMember = Depends(deps.require_role([RoleEnum.OWNER, RoleEnum.ADMIN])),
    db: Session = Depends(get_db),
):
    webhook = OutboundWebhook(
        workspace_id=member.workspace_id,
        name=data.name,
        target_url=data.target_url,
        events=data.events or "all",
        secret_key=f"sec_{uuid.uuid4().hex[:12]}",
        is_active=True,
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return webhook


@router.get("/webhooks", response_model=List[OutboundWebhookResponse])
def list_outbound_webhooks(
    member: WorkspaceMember = Depends(deps.require_role([RoleEnum.OWNER, RoleEnum.ADMIN])),
    db: Session = Depends(get_db),
):
    return (
        db.query(OutboundWebhook)
        .filter(OutboundWebhook.workspace_id == member.workspace_id)
        .order_by(OutboundWebhook.created_at.desc())
        .all()
    )


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outbound_webhook(
    webhook_id: str,
    member: WorkspaceMember = Depends(deps.require_role([RoleEnum.OWNER, RoleEnum.ADMIN])),
    db: Session = Depends(get_db),
):
    webhook = (
        db.query(OutboundWebhook)
        .filter(OutboundWebhook.id == webhook_id, OutboundWebhook.workspace_id == member.workspace_id)
        .first()
    )
    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    db.delete(webhook)
    db.commit()
    return None
