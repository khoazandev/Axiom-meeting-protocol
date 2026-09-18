import json
import logging
from sqlalchemy.orm import Session
from src.backend.core.llm import generate_json
from src.backend.database import SessionLocal
from src.backend import models
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

async def extract_decisions_from_topic_bg(topic_id: str, transcript_text: str):
    """Background task to extract both decisions and tasks for a completed topic."""
    if not transcript_text or not transcript_text.strip():
        logger.info(f"No transcript text for topic {topic_id}, skipping extraction.")
        return

    prompt = f"""
    You are an AI assistant that extracts key decisions and action items (tasks) from a specific topic discussion in a meeting transcript.
    
    Extract two things:
    1. "decisions": Formal decisions made, agreements reached.
       - "description": A brief summary of the decision.
       - "key_message": Core intent or result (1 short sentence).
       - "evidence_sentence": Exact verbatim quote of confirmation.
       
    2. "tasks": Action items or follow-up tasks assigned.
       - "title": Short title of the task.
       - "description": Detailed description or "Phân công cho: [Name]" if assignee is mentioned.
       - "assignee_name": Name of the person assigned (if any), otherwise null.
       
    Respond ONLY with a JSON object containing these two arrays. Example:
    {{
      "decisions": [
        {{
          "description": "Approve new UI",
          "key_message": "UI approved",
          "evidence_sentence": "We will proceed with the UI."
        }}
      ],
      "tasks": [
        {{
          "title": "Design new mockup",
          "description": "Create a high fidelity mockup. Phân công cho: John",
          "assignee_name": "John"
        }}
      ]
    }}
    If there are no decisions or tasks, return an empty array for them.

    Transcript:
    {transcript_text}
    """

    models_to_try = ["google/gemini-2.5-flash", "openai/gpt-4o-mini"]
    
    try:
        extracted = await generate_json(models_to_try, prompt)
        if extracted and isinstance(extracted, dict):
            with SessionLocal() as db:
                topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
                if not topic:
                    return
                
                # Insert Decisions
                decisions = extracted.get("decisions", [])
                if isinstance(decisions, list):
                    for dec in decisions:
                        if not isinstance(dec, dict): continue
                        db.add(models.MeetingDecision(
                            meeting_id=topic.meeting_id,
                            topic_id=topic.id,
                            description=dec.get("description", "Untitled Decision"),
                            key_message=dec.get("key_message", ""),
                            evidence_sentence=dec.get("evidence_sentence", ""),
                            status=models.MeetingDecisionStatusEnum.AGREED
                        ))
                
                # Insert Tasks
                tasks = extracted.get("tasks", [])
                if isinstance(tasks, list):
                    for t in tasks:
                        if not isinstance(t, dict): continue
                        
                        assignee_name = t.get("assignee_name")
                        desc = t.get("description", "")
                        
                        db.add(models.FollowUpTask(
                            meeting_id=topic.meeting_id,
                            topic_id=topic.id,
                            title=t.get("title", "Untitled Task"),
                            description=desc,
                            status=models.FollowUpTaskStatusEnum.NOT_CONFIRMED,
                            source=models.FollowUpTaskSourceEnum.AI_REALTIME
                        ))
                
                db.commit()
                
                # Notify frontend about new tasks/decisions for this meeting
                try:
                    from src.backend.services.meeting_events import meeting_events_manager
                    # Use asyncio.create_task to run the async broadcast outside of the db lock, though we're in async context already
                    asyncio.create_task(
                        meeting_events_manager.broadcast(
                            topic.meeting_id, 
                            {"type": "topic_extraction_done", "data": {"topic_id": topic_id}}
                        )
                    )
                except Exception as ex:
                    logger.error(f"Error broadcasting event: {ex}")
                    
    except Exception as e:
        logger.error(f"Error extracting insights for topic {topic_id}: {e}")
