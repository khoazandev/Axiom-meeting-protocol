# Phase 3 — AI Meeting Summary Generation

> **Goal:** After meeting ends, LLM automatically generates meeting summary (key points, decisions, overall summary) and saves to DB.
> **Priority:** 🟡 HIGH — Completes the AI post-meeting intelligence layer.
> **Estimated effort:** Small (follows same pattern as action item extraction)

---

## Context

Action item extraction pipeline (Phase 1) is complete and proven. Meeting summary follows the exact same pattern:

- Collect transcript segments → Build prompt → Send to LLM → Parse response → Save to DB
- Infrastructure (Ollama, qwen3:0.6b, config system) already working

**DB table exists:** `meeting_summaries` (id, meeting_id, summary, key_points, decisions)
**CRUD API exists:** `meeting_content.py` has POST/GET for summaries — but no auto-generation.

---

## Tasks

### Task 1: Summary Generation Service

**File:** `src/backend/services/meeting_summarizer.py` [NEW]

**Responsibilities:**

- Collect all `transcript_segments` for a meeting (reuse `collect_transcript_text()`)
- Build PM-style prompt for summarization
- Call Ollama via configurable model (`settings.summary_model`)
- Parse structured JSON response: `{ summary, key_points, decisions }`
- Save to `meeting_summaries` table
- Heuristic fallback when LLM offline

**System Prompt:**

```
You are a senior product manager writing meeting notes.
Summarize this meeting transcript into:
- "summary": 2-3 paragraph executive summary
- "key_points": Array of key discussion points
- "decisions": Array of decisions made

Return ONLY valid JSON. No markdown.
```

### Task 2: Config (No Hardcode)

**File:** `src/backend/core/config.py`

Add to Settings:

```python
summary_model: str = "qwen3:0.6b"          # SUMMARY_MODEL env var
summary_timeout: int = 120                   # SUMMARY_TIMEOUT env var
summary_system_prompt: str = "..."           # SUMMARY_SYSTEM_PROMPT env var
```

**File:** `docker-compose.yml`

```yaml
SUMMARY_MODEL: ${SUMMARY_MODEL:-qwen3:0.6b}
SUMMARY_TIMEOUT: ${SUMMARY_TIMEOUT:-120}
```

### Task 3: Auto-Trigger on Meeting Complete

**File:** `src/backend/api/v1/meetings_v2.py`

Add alongside action item extraction in `update_meeting()`:

```python
if meeting.status == MeetingStatusEnum.COMPLETED:
    extract_action_items(db, meeting_id)    # existing
    generate_meeting_summary(db, meeting_id) # new
```

### Task 4: Manual Trigger Endpoint

**File:** `src/backend/api/v1/meeting_content.py`

```python
@router.post("/generate-summary")
def generate_summary_endpoint(meeting_id, ...):
    """Manually trigger AI summary generation."""
```

### Task 5: TDD Tests

**File:** `src/backend/tests/test_meeting_summarizer.py` [NEW]

Tests:

- JSON parsing (clean, markdown, think tags)
- Summary saves to DB
- Heuristic fallback
- No duplicate summaries on re-run
- Manual endpoint
- Auto-trigger on COMPLETED

---

## Verification

```bash
# Unit tests
python -m pytest tests/test_meeting_summarizer.py -v

# E2E test (add to existing e2e script)
python src/backend/tests/test_extraction_e2e.py
```

---

## Dependencies

- Action item extraction working ✅
- Ollama connected ✅
- Config system (no hardcode) ✅
- `meeting_summaries` table exists ✅
- Summary CRUD API exists ✅
