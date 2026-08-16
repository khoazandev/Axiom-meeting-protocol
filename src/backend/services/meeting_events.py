"""
Meeting Events WebSocket Manager — Room-level event broadcasting.

Manages WebSocket connections per meeting room and broadcasts events
like `meeting_ended` and `tasks_preview` to all connected participants.
"""

import logging
from typing import Callable

from fastapi import WebSocket

logger = logging.getLogger("axiom.meeting_events")


class MeetingEventsManager:
    """Manages WebSocket connections per meeting for event broadcasting."""

    def __init__(self):
        # meeting_id → set of connected WebSocket clients
        self._connections: dict[str, set[WebSocket]] = {}

    async def connect(self, meeting_id: str, websocket: WebSocket):
        """Register a WebSocket connection for a meeting."""
        await websocket.accept()
        if meeting_id not in self._connections:
            self._connections[meeting_id] = set()
        self._connections[meeting_id].add(websocket)
        logger.info(
            "Meeting events WS connected: meeting=%s, total=%d",
            meeting_id,
            len(self._connections[meeting_id]),
        )

    def disconnect(self, meeting_id: str, websocket: WebSocket):
        """Remove a WebSocket connection for a meeting."""
        if meeting_id in self._connections:
            self._connections[meeting_id].discard(websocket)
            if not self._connections[meeting_id]:
                del self._connections[meeting_id]
            logger.info("Meeting events WS disconnected: meeting=%s", meeting_id)

    async def broadcast(self, meeting_id: str, event: dict):
        """Broadcast an event to all connected clients in a meeting."""
        connections = self._connections.get(meeting_id, set()).copy()
        if not connections:
            return

        disconnected = set()
        for ws in connections:
            try:
                await ws.send_json(event)
            except Exception:
                disconnected.add(ws)

        # Clean up disconnected clients
        for ws in disconnected:
            self.disconnect(meeting_id, ws)

        logger.info(
            "Broadcast event '%s' to meeting %s: %d clients",
            event.get("type", "unknown"),
            meeting_id,
            len(connections) - len(disconnected),
        )

    def get_connection_count(self, meeting_id: str) -> int:
        """Get number of connected clients for a meeting."""
        return len(self._connections.get(meeting_id, set()))


# Global singleton
meeting_events_manager = MeetingEventsManager()
