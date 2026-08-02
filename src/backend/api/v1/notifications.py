import asyncio
import json
from typing import AsyncGenerator
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.backend.api import deps
from src.backend.models import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


async def event_generator(user_id: str) -> AsyncGenerator[str, None]:
    # Send initial connection acknowledgment event
    initial_event = {
        "event": "connected",
        "user_id": user_id,
        "message": "Real-time notification stream active",
    }
    yield f"data: {json.dumps(initial_event)}\n\n"

    # In production stream, yield live workspace events
    await asyncio.sleep(0.1)


@router.get("/stream", response_class=StreamingResponse)
async def notifications_stream(current_user: User = Depends(deps.get_current_user)):
    return StreamingResponse(
        event_generator(current_user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
