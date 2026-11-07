import json
import logging
from sqlalchemy.orm import Session
from src.backend.core.llm import generate_json
from src.backend.database import SessionLocal
from src.backend import models

logger = logging.getLogger(__name__)

async def extract_decisions_from_topic_bg(topic_id: str, transcript_text: str):
    """Background task to extract decisions for a completed topic."""
    if not transcript_text or not transcript_text.strip():
        logger.info(f"No transcript text for topic {topic_id}, skipping decision extraction.")
        return

    prompt = f"""
    You are an AI assistant that extracts key decisions from meeting transcripts.
    Below is the complete transcript of a specific topic discussion in a meeting.
    
    Your task is to identify any formal decisions made, agreements reached, or action items assigned.
    For each decision, extract:
    1. "description": A brief summary of the decision or action item.
    2. "key_message": The core intent or result (1 short sentence).
    3. "evidence_sentence": Must be an EXACT verbatim quote from the transcript representing the FINAL confirmation or agreement. Do not summarize or use intermediate discussion sentences.
    
    Respond ONLY with a JSON array of objects. Example:
    [
        {{
            "description": "Approve the new UI layout for the dashboard",
            "key_message": "UI layout approved",
            "evidence_sentence": "So everyone agrees we will proceed with the new UI layout."
        }}
    ]
    If no clear decisions were made, return an empty array [].

    Transcript:
    {transcript_text}
    """

    models_to_try = ["google/gemini-2.5-flash", "openai/gpt-4o-mini"]
    
    try:
        extracted_decisions = await generate_json(models_to_try, prompt)
        if extracted_decisions and isinstance(extracted_decisions, list):
            with SessionLocal() as db:
                topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
                if not topic:
                    return
                for dec in extracted_decisions:
                    if not isinstance(dec, dict):
                        continue
                    decision = models.MeetingDecision(
                        meeting_id=topic.meeting_id,
                        topic_id=topic.id,
                        description=dec.get("description", "Untitled Decision"),
                        key_message=dec.get("key_message", ""),
                        evidence_sentence=dec.get("evidence_sentence", ""),
                        status=models.MeetingDecisionStatusEnum.AGREED
                    )
                    db.add(decision)
                db.commit()
    except Exception as e:
        logger.error(f"Error extracting decisions for topic {topic_id}: {e}")
