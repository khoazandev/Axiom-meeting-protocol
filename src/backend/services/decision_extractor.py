"""
Decision Extractor Service — Live transcript extraction for decisions.

- Backend queries PENDING DECISIONS from DB
- Sends [PENDING DECISIONS] + [TRANSCRIPT MỚI] to LLM
- LLM returns updated decisions + new decisions
- Backend UPSERTs results into DB
"""

import json
import logging
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from src.backend.core.config import get_settings
from src.backend.core.llm import generate_json
from src.backend.models import (
    MeetingDecision,
    MeetingDecisionStatusEnum,
)

logger = logging.getLogger("axiom.decision_extractor")


# ---------------------------------------------------------------------------
# Query Pending Decisions
# ---------------------------------------------------------------------------
def query_pending_decisions(db: Session, meeting_id: str) -> list[dict]:
    """
    Query incomplete/proposed decisions from DB for a meeting.

    Returns:
        List of dicts serializable for LLM prompt:
        [{decision_id, description, status}]
    """
    pending = (
        db.query(MeetingDecision)
        .filter(
            MeetingDecision.meeting_id == meeting_id,
            MeetingDecision.status == MeetingDecisionStatusEnum.PROPOSED,
        )
        .all()
    )

    result = []
    for decision in pending:
        result.append({
            "decision_id": decision.id,
            "description": decision.description,
            "status": decision.status.value if decision.status else "PROPOSED",
        })

    logger.info("Found %d pending decisions for meeting %s", len(result), meeting_id)
    return result


# ---------------------------------------------------------------------------
# LLM Extraction Service
# ---------------------------------------------------------------------------
class DecisionExtractorService:
    """Wrapper for Ollama decision-extractor model."""

    async def extract(
        self,
        transcript_text: str,
        pending_decisions: list[dict] | None = None,
    ) -> list[dict]:
        """
        Send [PENDING DECISIONS] + [TRANSCRIPT MỚI] to LLM via Ollama Chat API.

        Args:
            transcript_text: Punctuated transcript text.
            pending_decisions: List of pending decision dicts from query_pending_decisions().

        Returns:
            List of dicts: {decision_id, description, status}
        """
        settings = get_settings()

        # (Removed openrouter_api_key check to support local AI)

        try:
            # ── Build prompt payload ──────────────────────────────────
            # [A] PENDING DECISIONS section
            pending_section = "[A] PENDING DECISIONS\n"
            if pending_decisions:
                pending_section += json.dumps(pending_decisions, ensure_ascii=False, indent=2)
            else:
                pending_section += "[]"
            pending_section += "\n\n"

            # [B] TRANSCRIPT MỚI section
            transcript_section = f"[B] TRANSCRIPT MỚI\n{transcript_text}\n"

            system_instructions = (
                "You are an AI meeting assistant. Your task is to extract key decisions made from the meeting transcript.\n"
                "You MUST output a valid JSON array of objects, and absolutely nothing else. Do not wrap in markdown or backticks.\n"
                "Format of each object:\n"
                "{\n"
                '  "decision_id": null (if new decision) or id (if updating pending decision),\n'
                '  "description": "description of the decision made",\n'
                '  "rationale": "reasoning behind the decision" or null,\n'
                '  "status": "AGREED", "PROPOSED" or "REJECTED",\n'
                '  "proposer": "Tên người đề xuất hoặc null",\n'
                '  "evidence_quote": "Must be an EXACT verbatim quote from the transcript representing the FINAL confirmation or agreement. Do not summarize or use intermediate discussion sentences."\n'
                "}\n\n"
            )

            # Combine
            user_content = system_instructions + pending_section + transcript_section

            logger.info(
                "Calling OpenRouter model fallback list (transcript=%d chars, pending=%d decisions)",
                len(transcript_text),
                len(pending_decisions) if pending_decisions else 0,
            )
            
            raw_response = await generate_json([settings.decision_extractor_model], user_content)

            if raw_response and isinstance(raw_response, list):
                return self._validate_items(raw_response)
            
            return []

        except Exception as exc:
            logger.error("Decision extraction error: %s", exc)

        return []

    def _parse_response(self, raw: str) -> list[dict]:
        """Parse JSON array from model response."""
        # Strip thinking tags (qwen3 etc.)
        raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

        try:
            result = json.loads(raw)
            if isinstance(result, list):
                return self._validate_items(result)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown code blocks
        json_match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", raw, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group(1))
                if isinstance(result, list):
                    return self._validate_items(result)
            except json.JSONDecodeError:
                pass

        # Try finding the largest valid JSON array in raw text
        start_idx = raw.find('[')
        while start_idx != -1:
            end_idx = raw.rfind(']')
            while end_idx > start_idx:
                try:
                    result = json.loads(raw[start_idx:end_idx+1])
                    if isinstance(result, list):
                        return self._validate_items(result)
                except json.JSONDecodeError:
                    end_idx = raw.rfind(']', start_idx, end_idx)
            start_idx = raw.find('[', start_idx + 1)

        logger.warning("Failed to parse decision-extractor response full text:\n%s", raw)
        return []

    def _validate_items(self, items: list) -> list[dict]:
        """Validate and normalize extracted decision items."""
        valid_items = []
        for item in items:
            if not isinstance(item, dict):
                continue

            description = item.get("description")
            if not description:
                continue
            description = str(description).strip()
            if not description or len(description) < 5:
                continue

            # Normalize status
            status = item.get("status", "PROPOSED")
            if status:
                status = str(status).strip().upper()
            if status not in ("PROPOSED", "AGREED", "REJECTED"):
                status = "PROPOSED"

            valid_items.append({
                "decision_id": item.get("decision_id"),  # None for new decisions
                "description": description[:500],
                "status": status,
                "proposer": str(item.get("proposer")).strip() if item.get("proposer") else None,
                "evidence_quote": item.get("evidence_quote", ""),
            })
        return valid_items


# ---------------------------------------------------------------------------
# Sync (UPSERT) extracted decisions to DB
# ---------------------------------------------------------------------------
def sync_extracted_decisions(
    db: Session,
    meeting_id: str,
    extracted_items: list[dict],
    segment_ids: list[str] | None = None,
) -> list[MeetingDecision]:
    """
    Sync LLM output to database using UPSERT logic.
    """
    affected_decisions = []
    linked_segment_id = segment_ids[0] if segment_ids else None

    for item_data in extracted_items:
        description = item_data.get("description")
        if not description:
            continue
        description = str(description).strip()
        if not description or len(description) < 5:
            continue

        decision_id = item_data.get("decision_id")

        # Parse status
        status_str = item_data.get("status", "PROPOSED")
        decision_status = MeetingDecisionStatusEnum.PROPOSED
        if status_str == "AGREED":
            decision_status = MeetingDecisionStatusEnum.AGREED
        elif status_str == "REJECTED":
            decision_status = MeetingDecisionStatusEnum.REJECTED

        # Resolve Proposer ID
        proposer_str = item_data.get("proposer")
        resolved_proposer_id = None
        if proposer_str and proposer_str.lower() != "null":
            proposer_str = str(proposer_str).strip()
            from src.backend.models import User
            user = (
                db.query(User)
                .filter(User.full_name.ilike(f"%{proposer_str}%"))
                .first()
            )
            if not user:
                users = db.query(User).all()
                for u in users:
                    if u.full_name.lower() in proposer_str.lower() or proposer_str.lower() in u.full_name.lower():
                        user = u
                        break
            if user:
                resolved_proposer_id = user.id
                logger.info("Matched proposer '%s' → user_id=%s (%s)", proposer_str, user.id, user.full_name)

        # ── Find current topic if not explicitly provided ──────────────────
        active_topic_id = None
        # We can look up the IN_PROGRESS topic for this meeting
        from src.backend.models import Topic, TopicStatusEnum
        active_topic = db.query(Topic).filter(Topic.meeting_id == meeting_id, Topic.status == TopicStatusEnum.IN_PROGRESS).first()
        if active_topic:
            active_topic_id = active_topic.id

        # ── UPSERT logic ──────────────────────────────────────────
        evidence_sentence = item_data.get("evidence_quote")
        
        if decision_id:
            # UPDATE existing decision
            existing = (
                db.query(MeetingDecision)
                .filter(
                    MeetingDecision.id == decision_id,
                    MeetingDecision.meeting_id == meeting_id,
                )
                .first()
            )
            if existing:
                existing.description = description
                existing.status = decision_status
                if resolved_proposer_id:
                    existing.proposer_id = resolved_proposer_id
                if evidence_sentence:
                    existing.evidence_sentence = evidence_sentence
                # Optionally update topic if it's currently null
                if not existing.topic_id and active_topic_id:
                    existing.topic_id = active_topic_id
                affected_decisions.append(existing)
                logger.info("Updated decision %s: status=%s", decision_id, decision_status.value)
            else:
                logger.warning("decision_id=%s not found in meeting %s, skipping update", decision_id, meeting_id)
        else:
            # INSERT new decision
            decision = MeetingDecision(
                meeting_id=meeting_id,
                topic_id=active_topic_id,
                transcript_segment_id=linked_segment_id,
                description=description,
                status=decision_status,
                proposer_id=resolved_proposer_id,
                evidence_sentence=evidence_sentence,
            )
            db.add(decision)
            affected_decisions.append(decision)
            logger.info("Created new decision: '%s' (status=%s)", description, decision_status.value)

    if affected_decisions:
        db.commit()
        for decision in affected_decisions:
            db.refresh(decision)
        logger.info(
            "Synced %d decisions for meeting %s",
            len(affected_decisions),
            meeting_id,
        )

    return affected_decisions

decision_extractor_service = DecisionExtractorService()
