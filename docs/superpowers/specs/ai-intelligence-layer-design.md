# Spec: AI Intelligence Layer — Technical Design

> Companion spec for: `phase-3-ai-meeting-summary.md` + Phase 1 (Action Items)

---

## Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│ transcript_      │     │ AI Services          │     │ Database     │
│ segments (DB)    │────▶│                      │────▶│              │
│                  │     │ ┌─────────────────┐  │     │ action_items │
│ Collected text   │     │ │ Action Item     │  │     │ meeting_     │
│ per meeting      │     │ │ Extractor  ✅   │  │     │ summaries    │
│                  │     │ └─────────────────┘  │     │              │
│                  │     │ ┌─────────────────┐  │     │              │
│                  │     │ │ Meeting         │  │     │              │
│                  │     │ │ Summarizer  ❌  │  │     │              │
│                  │     │ └─────────────────┘  │     │              │
└──────────────────┘     └────────┬────────────┘     └──────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Ollama          │
                         │ qwen3:0.6b      │
                         │ localhost:11434  │
                         └─────────────────┘
```

---

## Service Pattern (shared by all AI services)

Every AI service follows the same pattern:

```python
# 1. Collect data
transcript_text = collect_transcript_text(db, meeting_id)

# 2. Chunk if needed
chunks = chunk_transcript(text, max_chars=settings.xxx_max_chars)

# 3. Call LLM per chunk
for chunk in chunks:
    result = call_ollama(chunk, system_prompt=settings.xxx_system_prompt)
    if result is None:
        result = heuristic_fallback(chunk)  # offline fallback
    all_results.extend(result)

# 4. Parse and deduplicate
parsed = parse_llm_json(raw_response)

# 5. Save to DB (skip duplicates)
save_to_database(db, meeting_id, parsed)
```

---

## Action Item Extractor (✅ DONE)

### API Contracts

**Manual trigger:**

```
POST /api/v1/meetings/{meeting_id}/extract-action-items
Authorization: Bearer <token>

Response 200:
{
  "extracted_count": 5,
  "items": [
    {
      "task": "Update API documentation",
      "owner": "Khoa",
      "due_date": "Friday",
      "priority": "HIGH",
      "status": "TODO"
    }
  ]
}
```

**Auto-trigger:** Fires when `PATCH /meetings/{id}` sets `status: "COMPLETED"`

### DB Schema

```sql
action_items (
  id          VARCHAR PK,
  meeting_id  VARCHAR FK → meetings.id,
  title       VARCHAR NOT NULL,       -- the task
  description TEXT,                    -- "Owner: X\nDue: Y\nPriority: Z"
  assignee_id VARCHAR FK → users.id,  -- optional, if owner matches a user
  status      ENUM(TODO, IN_PROGRESS, DONE),
  due_at      DATETIME,
  created_at  DATETIME,
  updated_at  DATETIME
)
```

### Config (env vars)

```
EXTRACTION_MODEL=qwen3:0.6b
EXTRACTION_TIMEOUT=120
EXTRACTION_MAX_TRANSCRIPT_CHARS=6000
EXTRACTION_SYSTEM_PROMPT=<configurable PM prompt>
```

---

## Meeting Summarizer (❌ TODO)

### API Contracts

**Manual trigger:**

```
POST /api/v1/meetings/{meeting_id}/generate-summary
Authorization: Bearer <token>

Response 200:
{
  "summary": "The team discussed sprint goals and assigned key tasks...",
  "key_points": [
    "API documentation needs updating for v2",
    "Login page bug is blocking QA"
  ],
  "decisions": [
    "Deploy staging by Monday",
    "Khoa to lead API docs effort"
  ]
}
```

**Auto-trigger:** Same as action items — fires on meeting COMPLETED.

### DB Schema (exists)

```sql
meeting_summaries (
  id          VARCHAR PK,
  meeting_id  VARCHAR FK → meetings.id UNIQUE,
  summary     TEXT NOT NULL,
  key_points  TEXT,          -- JSON array stored as text
  decisions   TEXT,          -- JSON array stored as text
  created_at  DATETIME,
  updated_at  DATETIME
)
```

### Config (env vars)

```
SUMMARY_MODEL=qwen3:0.6b
SUMMARY_TIMEOUT=120
SUMMARY_SYSTEM_PROMPT=<configurable summarizer prompt>
```

---

## LLM Response Parsing

All AI services must handle these qwen3 response formats:

````
# Format 1: Clean JSON
[{"task": "...", "owner": "..."}]

# Format 2: Wrapped in think tags
<think>Let me analyze...</think>[{"task": "...", "owner": "..."}]

# Format 3: Markdown code block
```json
[{"task": "...", "owner": "..."}]
````

# Format 4: JSON embedded in explanation

Here are the items: [{"task": "...", "owner": "..."}] Done!

`````

**Parser** (`_parse_llm_json`):
1. Strip `<think>...</think>` tags
2. Try `json.loads(raw)`
3. Try regex extract from ````json ... ````
4. Try regex extract `\[.*\]`
5. Return `None` if all fail

---

## Heuristic Fallback (when Ollama offline)

### Action Items — Keyword patterns:
- EN: `"will"`, `"should"`, `"needs to"`, `"must"`, `"please"`, `"TODO"`
- VI: `"cần"`, `"phải"`, `"sẽ"`, `"hãy"`

### Summary — Text statistics:
- Take first + last 20% of transcript as summary
- Count unique speakers as participants
- Extract sentences with decision keywords ("decided", "agreed", "approved")

---

## Trigger Flow

`````

PATCH /meetings/{id} { status: "COMPLETED" }
│
▼
┌─────────────────────┐
│ update_meeting() │
│ meetings_v2.py │
├─────────────────────┤
│ if COMPLETED: │
│ extract_actions() │ ──▶ action_item_extractor.py
│ generate_summary()│ ──▶ meeting_summarizer.py (TODO)
└─────────────────────┘

```

```
