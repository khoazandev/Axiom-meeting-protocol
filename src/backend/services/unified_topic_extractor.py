from datetime import datetime, timezone, timedelta
import json
import logging
import re
from typing import Dict, Any

from sqlalchemy.orm import Session
from src.backend.models import Topic, MeetingDecision, FollowUpTask, FollowUpTaskStatusEnum, FollowUpTaskSourceEnum, MeetingDecisionStatusEnum, User
from src.backend.services.meeting_events import meeting_events_manager
from src.backend.services.task_extractor import sync_extracted_tasks

logger = logging.getLogger("axiom.unified_extractor")
logger.setLevel(logging.INFO)

PROMPT_TEMPLATE = """
Bạn là một trợ lý AI phân tích biên bản cuộc họp.
Dưới đây là toàn bộ đoạn hội thoại của một chủ đề (Topic) vừa kết thúc. Mã định danh của chủ đề này là: {topic_id}

[THÔNG TIN THỜI GIAN THỰC TẾ LÚC NÀY]
Hôm nay là: {current_date}, giờ hiện tại: {current_time}.
Hãy đối chiếu thời gian thực tế này để nội suy ra ngày tháng YYYY-MM-DD chính xác cho các mốc thời gian tương đối (như "ngày mai", "chiều thứ 6 tuần sau").

Nhiệm vụ của bạn là trích xuất đồng thời CÁC QUYẾT ĐỊNH (decisions) và CÁC CÔNG VIỆC/NHIỆM VỤ (tasks) được giao trong chủ đề này.

YÊU CẦU ĐỊNH DẠNG TRẢ VỀ (JSON CHUẨN):
{{
  "topic_id": "{topic_id}",
  "decisions": [
    {{
      "description": "Mô tả ngắn gọn nội dung quyết định",
      "evidence_sentence": "Trích dẫn nguyên văn câu thoại xác nhận quyết định (LƯU Ý: KHÔNG bao gồm tên người nói ở đầu câu)"
    }}
  ],
  "tasks": [
    {{
      "task": "Nội dung công việc / Nhiệm vụ",
      "assignee": "Tên người được giao (hoặc null nếu chưa rõ)",
      "deadline": "YYYY-MM-DD (hoặc null nếu không đề cập)",
      "evidence_quote": "Trích dẫn nguyên văn câu thoại giao việc (LƯU Ý: KHÔNG bao gồm tên người nói ở đầu câu)"
    }}
  ]
}}

LƯU Ý:
- Chỉ trả về duy nhất chuỗi JSON hợp lệ, không kèm giải thích hay định dạng markdown (ví dụ: ```json).
- Nếu không có quyết định hoặc công việc nào, hãy trả về mảng rỗng [] cho khóa tương ứng.
- Phải trích dẫn NGUYÊN VĂN câu thoại làm bằng chứng (evidence), nhưng TUYỆT ĐỐI KHÔNG được tự ý chèn thêm tên người nói (ví dụ: thay vì "Khoa: Làm A đi", chỉ được trích "Làm A đi").
- Bắt buộc trả về đúng trường "topic_id" như đã cung cấp.

[B] TRANSCRIPT MỚI
{transcript_text}
"""

async def extract_topic_unified_bg(topic_id: str, transcript_text: str):
    """Background task to extract both tasks and decisions for a completed topic."""
    if not transcript_text or not transcript_text.strip():
        logger.info(f"No transcript text for topic {topic_id}, skipping unified extraction.")
        return

    vn_tz = timezone(timedelta(hours=7))
    now = datetime.now(vn_tz)
    
    prompt = PROMPT_TEMPLATE.format(
        topic_id=topic_id,
        transcript_text=transcript_text,
        current_date=now.strftime("%Y-%m-%d"),
        current_time=now.strftime("%H:%M")
    )
    
    # We use qwen2.5:7b strictly via Ollama
    from src.backend.core.llm import generate_json
    
    logger.info(f"Starting unified extraction for topic {topic_id} via qwen2.5:7b...")
    
    # Notify frontend that extraction has started
    from src.backend.database import SessionLocal
    with SessionLocal() as db:
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        if not topic:
            return
        meeting_id = topic.meeting_id

    try:
        await meeting_events_manager.broadcast(
            meeting_id, {"type": "tasks_extracting", "data": {"status": "started"}}
        )
    except Exception:
        pass

    try:
        # Call LLM
        json_str = await generate_json(
            model_or_models=["google/gemini-2.5-flash", "qwen2.5:7b"],
            prompt=prompt
        )
        
        if not json_str:
            logger.error(f"Unified extraction failed for topic {topic_id}: LLM returned None")
            return
            
        try:
            parsed = json.loads(json_str) if isinstance(json_str, str) else json_str
            
            extracted_topic_id = parsed.get("topic_id", topic_id)
            if extracted_topic_id != topic_id:
                logger.warning(f"LLM returned topic_id {extracted_topic_id} which differs from intended {topic_id}")
            
            decisions_data = parsed.get("decisions", [])
            tasks_data = parsed.get("tasks", [])
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"Failed to parse unified JSON from AI: {e}")
            return
        except Exception as e:
            logger.error(f"Unexpected error in unified_topic_extractor: {e}", exc_info=True)
            return
        
        # Save to DB
        with SessionLocal() as db:
            # 1. Sync Tasks
            valid_tasks = []
            for t in tasks_data:
                if not isinstance(t, dict) or not t.get("task"): continue
                valid_tasks.append({
                    "task_id": None,
                    "task": t.get("task"),
                    "assignee": t.get("assignee"),
                    "deadline": t.get("deadline"),
                    "status": "NOT_CONFIRMED",
                    "evidence_quote": t.get("evidence_quote", "")
                })
            
            if valid_tasks:
                synced_tasks = sync_extracted_tasks(
                    db, meeting_id, valid_tasks, 
                    source=FollowUpTaskSourceEnum.AI_FULL,
                    topic_id=extracted_topic_id
                )
                if synced_tasks:
                    payload = []
                    for t in synced_tasks:
                        payload.append({
                            "id": t.id,
                            "meeting_id": t.meeting_id,
                            "title": t.title,
                            "description": t.description,
                            "status": t.status.value if t.status else "NOT_CONFIRMED",
                            "assignee_id": t.assignee_id,
                            "assignee_name": t.assignee_name,
                            "deadline": t.deadline.isoformat() if t.deadline else None,
                            "source": t.source.value if t.source else None,
                            "evidence_quote": getattr(t, 'evidence_quote', None),
                        })
                    await meeting_events_manager.broadcast(
                        meeting_id, {"type": "tasks_preview", "data": {"tasks": payload}}
                    )

            # 2. Sync Decisions
            valid_decisions = []
            import re
            for d in decisions_data:
                if not isinstance(d, dict) or not d.get("description"): continue
                
                evidence = d.get("evidence_sentence", "")
                if evidence:
                    evidence = re.sub(r"^[\w\s]+:\s*", "", evidence).strip()
                    
                decision = MeetingDecision(
                    meeting_id=meeting_id,
                    topic_id=extracted_topic_id,
                    description=d.get("description", "Untitled Decision"),
                    key_message=evidence,
                    evidence_sentence=evidence,
                    status=MeetingDecisionStatusEnum.PROPOSED
                )
                db.add(decision)
                valid_decisions.append(decision)
            
            db.commit()
            
            if valid_decisions:
                payload = []
                for d in valid_decisions:
                    db.refresh(d)
                    payload.append({
                        "id": d.id,
                        "meeting_id": d.meeting_id,
                        "description": d.description,
                        "status": d.status.value if d.status else "PROPOSED",
                        "evidence_sentence": getattr(d, 'evidence_sentence', None),
                    })
                await meeting_events_manager.broadcast(
                    meeting_id, {"type": "decisions_preview", "data": {"decisions": payload}}
                )

    except Exception as e:
        logger.error(f"Unified extraction failed for topic {topic_id}: {e}", exc_info=True)
    finally:
        try:
            await meeting_events_manager.broadcast(
                meeting_id, {"type": "tasks_extracting", "data": {"status": "done"}}
            )
            await meeting_events_manager.broadcast(
                meeting_id, {"type": "topic_extraction_done", "data": {"topic_id": topic_id}}
            )
        except Exception:
            pass
