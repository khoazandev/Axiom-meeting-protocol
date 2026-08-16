"""
Turn Accumulator — In-memory counter for batching transcript turns.

Accumulates N transcript segment IDs per meeting before triggering
extraction pipeline. Used for real-time follow-up task preview.
"""

import logging
import threading

logger = logging.getLogger("axiom.turn_accumulator")


class TurnAccumulator:
    """In-memory counter: accumulate N transcript turns before triggering extraction."""

    BATCH_SIZE = 5

    def __init__(self, batch_size: int | None = None):
        self._counters: dict[str, list[str]] = {}  # meeting_id → segment_ids
        self._lock = threading.Lock()
        if batch_size is not None:
            self.BATCH_SIZE = batch_size

    def add_segment(self, meeting_id: str, segment_id: str) -> list[str] | None:
        """
        Add a segment ID to the accumulator for a meeting.

        Returns:
            List of segment_ids when batch threshold is reached, else None.
        """
        with self._lock:
            if meeting_id not in self._counters:
                self._counters[meeting_id] = []
            self._counters[meeting_id].append(segment_id)

            if len(self._counters[meeting_id]) >= self.BATCH_SIZE:
                batch = self._counters.pop(meeting_id)
                logger.info(
                    "Batch ready for meeting %s: %d segments",
                    meeting_id,
                    len(batch),
                )
                return batch
            return None

    def flush(self, meeting_id: str) -> list[str]:
        """Flush remaining segments for a meeting (called on meeting end)."""
        with self._lock:
            remaining = self._counters.pop(meeting_id, [])
            if remaining:
                logger.info(
                    "Flushed %d remaining segments for meeting %s",
                    len(remaining),
                    meeting_id,
                )
            return remaining

    def clear(self, meeting_id: str):
        """Clear counter for a meeting without returning segments."""
        with self._lock:
            self._counters.pop(meeting_id, None)

    def pending_count(self, meeting_id: str) -> int:
        """Get number of pending segments for a meeting."""
        with self._lock:
            return len(self._counters.get(meeting_id, []))


# Global singleton instance
turn_accumulator = TurnAccumulator()
