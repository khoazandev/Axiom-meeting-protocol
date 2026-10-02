import asyncio
import datetime
from datetime import timezone
import json
import logging
from typing import AsyncGenerator, Dict, List, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import Notification, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int


# ─────────────────────────────────────────────────────────────
# Real-time In-Memory Broadcaster for SSE
# ─────────────────────────────────────────────────────────────
class NotificationBroadcaster:
    def __init__(self):
        # Map user_id -> Set of asyncio.Queue
        self._listeners: Dict[str, Set[asyncio.Queue]] = {}

    def register(self, user_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        if user_id not in self._listeners:
            self._listeners[user_id] = set()
        self._listeners[user_id].add(q)
        return q

    def unregister(self, user_id: str, q: asyncio.Queue):
        if user_id in self._listeners:
            self._listeners[user_id].discard(q)
            if not self._listeners[user_id]:
                del self._listeners[user_id]

    async def broadcast_to_user(self, user_id: str, payload: dict):
        if user_id in self._listeners:
            for q in list(self._listeners[user_id]):
                try:
                    q.put_nowait(payload)
                except Exception as e:
                    logger.warning(f"Error queueing notification to user {user_id}: {e}")


broadcaster = NotificationBroadcaster()


def send_user_notification(
    db: Session,
    user_id: str,
    title: str,
    content: str,
    type: str = "SYSTEM",
    link: Optional[str] = None,
) -> Notification:
    """Helper to persist a notification to DB and broadcast to any active SSE subscribers."""
    notif = Notification(
        user_id=user_id,
        title=title,
        content=content,
        type=type,
        link=link,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Broadcast event asynchronously if event loop is running
    payload = {
        "id": notif.id,
        "user_id": notif.user_id,
        "title": notif.title,
        "content": notif.content,
        "type": notif.type,
        "link": notif.link,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
    }

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(broadcaster.broadcast_to_user(user_id, payload))
    except Exception as e:
        logger.debug(f"Could not async broadcast notification immediately: {e}")

    return notif


@router.get("", response_model=NotificationListResponse)
def get_user_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all notifications for the current user and calculate unread count."""
    items = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )

    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )

    return NotificationListResponse(
        notifications=items,
        unread_count=unread_count,
    )


@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.is_read = True
    db.commit()
    return {"success": True, "id": notification_id}


@router.post("/mark-all-read")
def mark_all_notifications_read(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all unread notifications as read for current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"success": True}


async def event_generator(user_id: str) -> AsyncGenerator[str, None]:
    q = broadcaster.register(user_id)
    try:
        # Initial greeting event
        init_data = json.dumps({"event": "connected", "user_id": user_id, "timestamp": datetime.datetime.now(timezone.utc).isoformat()})
        yield f"event: connected\ndata: {init_data}\n\n"

        while True:
            try:
                # Wait for next event or heartbeat
                payload = await asyncio.wait_for(q.get(), timeout=25.0)
                data_str = json.dumps(payload, default=str)
                yield f"event: notification\ndata: {data_str}\n\n"
            except asyncio.TimeoutError:
                # Periodic keep-alive ping
                yield f": ping - {datetime.datetime.now(timezone.utc).isoformat()}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        broadcaster.unregister(user_id, q)


@router.get("/stream", response_class=StreamingResponse)
async def notifications_stream(
    token: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(deps.get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Server-Sent Events (SSE) stream for instantaneous realtime notification delivery."""
    resolved_user = current_user
    if not resolved_user and token:
        from src.backend.core.security import decode_token
        payload = decode_token(token)
        if payload and payload.get("sub"):
            resolved_user = db.query(User).filter(User.id == payload.get("sub")).first()

    if not resolved_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required for notification stream")

    return StreamingResponse(
        event_generator(resolved_user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
