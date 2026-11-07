# Unified Topic Extraction Flow

## 1. Understanding Summary

- **What is being built:** A single, unified extraction flow that processes Meeting Topics to extract both Tasks and Decisions simultaneously.
- **Why it exists:** To simplify the architecture, reduce database and LLM load, and centralize the extraction logic to a single prompt and a single local model.
- **Who it is for:** Meeting participants reviewing the summary after a topic concludes.
- **Key Constraints:**
  - Must completely disable/remove the real-time (micro-batching) extraction flow.
  - Extraction must only happen once per topic, triggered when the topic is marked as `COMPLETED` (via `/topics/next`).
  - Must use exactly 1 prompt to extract both Tasks and Decisions.
  - Must use exactly 1 local model (`qwen2.5:7b` via Ollama).
- **Explicit Non-Goals:** Real-time visibility of Tasks/Decisions while a topic is actively being discussed is explicitly removed.

## 2. Assumptions

- **Context Window:** The `qwen2.5:7b` local model has a sufficient context window to process the entire transcript of a typical topic.
- **Latency Tolerance:** Users accept that extracting a long transcript at the end of a topic will take a few seconds, during which the UI will wait for a WebSocket update.

## 3. Decision Log

- **Decision 1: Disable Real-time Extraction**
  - _Alternatives considered:_ Keep real-time extraction for tasks and end-of-topic for decisions.
  - _Why this option:_ The user explicitly requested a single flow to reduce complexity and system load, accepting the UI trade-off.
- **Decision 2: Unified JSON Schema**
  - _Alternatives considered:_ Two separate LLM calls, or using strict tool-calling.
  - _Why this option:_ A single prompt generating a unified JSON containing both `decisions` and `tasks` arrays minimizes LLM round-trips. `key_message` is omitted from the prompt since it's redundant with `evidence_sentence`.
- **Decision 3: Use qwen2.5:7b via Ollama**
  - _Alternatives considered:_ Fallback to Gemini or GPT-4o-mini.
  - _Why this option:_ User explicitly mandated the use of `qwen2.5:7b`.

## 4. Final Design & Architecture

### 4.1 Schema Definition

The AI prompt will instruct `qwen2.5:7b` to output strictly this JSON format:

```json
{
  "decisions": [
    {
      "description": "Mô tả ngắn gọn nội dung quyết định",
      "evidence_sentence": "Trích dẫn nguyên văn câu thoại xác nhận quyết định"
    }
  ],
  "tasks": [
    {
      "task": "Nội dung công việc / Nhiệm vụ",
      "assignee": "Tên người được giao (hoặc null nếu chưa rõ)",
      "deadline": "YYYY-MM-DD (hoặc null nếu không đề cập)",
      "evidence_quote": "Trích dẫn nguyên văn câu thoại giao việc"
    }
  ]
}
```

### 4.2 Backend Changes

1. **Remove Real-Time Flow:**
   - In `src/backend/api/v1/meeting_content.py`, remove the `turn_accumulator` logic inside `add_transcript_segment`.
2. **Unified Extraction Service:**
   - Create or refactor a service (e.g. `unified_topic_extractor.py`) containing the single prompt and the single Ollama call.
   - The service will parse the JSON, insert/update `MeetingDecision` and `FollowUpTask` records in the DB.
   - The service will broadcast WebSocket events (`tasks_preview` and `decisions_preview`) when extraction completes.
3. **Trigger Point:**
   - In `src/backend/api/v1/meeting_content.py` (inside `/topics/next`), replace the old `extract_decisions_from_topic_bg` with the new unified background task, passing `current_topic.transcript_text` to it.
