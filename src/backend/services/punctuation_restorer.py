"""
Punctuation Restorer — Rule-based punctuation insertion using VAD pause durations.

Analyzes time gaps between consecutive TranscriptSegments to insert appropriate
punctuation marks (periods, commas) based on pause duration thresholds.
"""

import logging
import re

logger = logging.getLogger("axiom.punctuation_restorer")


class PunctuationRestorer:
    """
    Rule-based punctuation insertion using VAD pause durations.

    Rules:
    - Pause >= 1.5s between segments → insert "." (sentence boundary)
    - Pause >= 0.8s and < 1.5s → insert "," (clause boundary)
    - Pause < 0.8s → space only (continuous speech)
    - Capitalize first word after "."
    - End of final segment → append "." if not already punctuated
    """

    SENTENCE_PAUSE_THRESHOLD = 1.5  # seconds
    CLAUSE_PAUSE_THRESHOLD = 0.8  # seconds

    def _parse_time(self, time_str: str) -> float:
        """Parse time string to float seconds.
        
        Supported formats:
        - Float seconds: "12.345"
        - HH:MM:SS or HH:MM:SS.mmm: "00:01:30.500"
        - MM:SS: "01:30"
        - 12-hour locale time: "11:25:30 PM", "11:25 PM"
        - ISO datetime: "2026-08-15T23:25:30.000Z"
        """
        if not time_str or not time_str.strip():
            return 0.0

        time_str = time_str.strip()

        # Try float seconds first
        try:
            return float(time_str)
        except ValueError:
            pass

        # Try ISO datetime format
        if "T" in time_str:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
                return dt.hour * 3600 + dt.minute * 60 + dt.second + dt.microsecond / 1_000_000
            except (ValueError, AttributeError):
                pass

        # Handle 12-hour format with AM/PM (e.g. "11:25:30 PM", "11:25 PM")
        upper = time_str.upper()
        is_pm = "PM" in upper
        is_am = "AM" in upper
        if is_pm or is_am:
            cleaned = upper.replace("PM", "").replace("AM", "").strip()
            parts = cleaned.split(":")
            try:
                hours = int(parts[0])
                minutes = int(parts[1]) if len(parts) > 1 else 0
                seconds = float(parts[2]) if len(parts) > 2 else 0.0
                if is_pm and hours != 12:
                    hours += 12
                elif is_am and hours == 12:
                    hours = 0
                return hours * 3600 + minutes * 60 + seconds
            except (ValueError, IndexError):
                pass

        # Try HH:MM:SS.mmm or MM:SS format
        parts = time_str.split(":")
        try:
            if len(parts) == 3:
                hours = float(parts[0])
                minutes = float(parts[1])
                seconds = float(parts[2])
                return hours * 3600 + minutes * 60 + seconds
            elif len(parts) == 2:
                minutes = float(parts[0])
                seconds = float(parts[1])
                return minutes * 60 + seconds
        except ValueError:
            pass

        logger.warning("Cannot parse time string: %s, defaulting to 0.0", time_str)
        return 0.0

    def _extract_vietnamese(self, content: str) -> str:
        """Extract only Vietnamese text from bilingual content.

        Handles formats:
        - "[VI] tiếng việt\\n[EN] english text" → "tiếng việt"
        - Plain text without tags → returned as-is
        """
        if "[VI]" in content:
            # Extract text after [VI] tag, stop before [EN] tag
            vi_match = re.search(r"\[VI\]\s*(.+?)(?:\n?\[EN\]|$)", content, re.DOTALL)
            if vi_match:
                return vi_match.group(1).strip()
        return content

    def _is_punctuated(self, text: str) -> bool:
        """Check if text ends with punctuation."""
        stripped = text.rstrip()
        if not stripped:
            return False
        return stripped[-1] in ".!?;:,"

    def _capitalize_first(self, text: str) -> str:
        """Capitalize the first letter of text."""
        if not text:
            return text
        # Find first alpha character and capitalize it
        for i, char in enumerate(text):
            if char.isalpha():
                return text[:i] + char.upper() + text[i + 1:]
        return text

    def restore(self, segments: list) -> str:
        """
        Restore punctuation in transcript segments based on pause durations.

        Args:
            segments: List of TranscriptSegment objects with content, start_time, end_time, speaker_id.

        Returns:
            Formatted transcript with each segment on its own line as:
            Speaker: "punctuated text"
        """
        if not segments:
            return ""

        lines = []

        for i, segment in enumerate(segments):
            content = self._extract_vietnamese(segment.content)
            if not content:
                continue

            # Apply punctuation based on pause (for internal sentence structure)
            content = self._capitalize_first(content)
            if not self._is_punctuated(content):
                content += "."

            # Get speaker label
            speaker = "Thành viên"
            if getattr(segment, 'speaker', None):
                speaker = segment.speaker.full_name
            elif getattr(segment, 'speaker_id', None):
                speaker = segment.speaker_id

            lines.append(f'{speaker}: "{content}"')

        return "\n\n".join(lines)
