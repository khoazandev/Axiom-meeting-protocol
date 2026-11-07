# Decision Extractor & Live Combiner Pipeline

## 1. Goal

Implement a live `DecisionExtractor` module that runs incrementally during a meeting (similar to the existing `TaskExtractor`), extracting decisions every 5 turns. When the meeting ends, a "Combiner AI" will take the distilled output from both extractors to generate a highly structured Meeting Note in a Markdown Table format. Additionally, enhance the Meeting Creation flow to explicitly capture an `Agenda Outline` for better transcript-to-agenda alignment.

## 2. Architecture & Data Flow

### 2.1 Database Models

- **[NEW] `MeetingDecision` Model:**
  - Fields: `id`, `meeting_id`, `transcript_segment_id`, `description`, `status` (e.g. `PROPOSED`, `AGREED`), `created_at`, `updated_at`.
  - Serves as the persistence layer for extracted decisions, enabling search, history, and traceability exactly like `FollowUpTask`.

### 2.2 Live Extraction (Incremental Map)

- **Trigger:** In `src/backend/api/v1/meeting_content.py`, when `turn_accumulator.add_segment()` yields a batch of 5 segments.
- **Action:** Spawn two asynchronous tasks in parallel:
  1. `TaskExtractorService.extract` -> updates `FollowUpTask`.
  2. `DecisionExtractorService.extract` -> updates `MeetingDecision`.
- **DecisionExtractor Prompt:** Focuses strictly on identifying formal agreements, approvals, and resolved debate points.

### 2.3 Meeting End Combiner (Reduce)

- **Trigger:** When the meeting ends and `turn_accumulator` is flushed.
- **CombinerService:**
  1. Queries all `FollowUpTask` records for the meeting.
  2. Queries all `MeetingDecision` records for the meeting.
  3. Uses a highly constrained LLM prompt to generate the final Meeting Note in a Markdown Table format.
- **Combiner Prompt Structure:**
  - Enforces the `MEETING NAME`, `A - INFORMATION`, `B - ACTION` format.
  - Injects the `Agenda Outline` (captured during meeting creation) to allow the AI to cross-reference discussions against the planned agenda.
  - Hard constraint: DO NOT hallucinate. Only use data provided in the injected Task/Decision JSON arrays.
  - Includes styling rules (`**bold**` for facts, `🚨` for problems, `❓` for open questions) as part of the `Summary` cell.

## 3. Components to Modify/Create

### Frontend (UI/UX)

- `src/frontend/src/app/meetings/create/page.tsx` **[MODIFY]**:
  - Enhance the meeting creation form to clearly separate "Meeting Description" and "Agenda Outline".
  - The `Agenda Outline` field will enforce structured input (e.g., bullet points) to help the AI map transcript topics directly to agenda items.

### Database & Models

- `src/backend/models.py`: Add `MeetingDecision` model. Add relationship to `Meeting`. (Ensure `Meeting` model's `description` field can accommodate the Agenda, or add a specific `agenda` column if needed).
- `alembic/versions/`: Generate migration script for `MeetingDecision`.

### Services

- `src/backend/services/decision_extractor.py` **[NEW]**: Implement `DecisionExtractorService` handling Ollama queries for decisions.
- `Modelfile.decision-extractor` **[NEW]**: Create the Ollama modelfile based on a strong instruct model (e.g., Qwen or Llama).
- `src/backend/services/meeting_end_service.py` **[MODIFY]**: Replace the old `_generate_meeting_summary` logic with the new `CombinerService` that injects decisions, tasks, and the `Agenda Outline`.

### API Endpoints

- `src/backend/api/v1/meeting_content.py` **[MODIFY]**: Update the background task dispatcher to call both extractors when a batch is ready.

## 4. Open Questions & Ambiguities

1. **Decision Tracking:** Should decisions have an `assignee` or just a `description`? For now, we will stick to `description` as decisions are usually team-wide, unlike tasks.
2. **Context Window Limit:** Will the combined JSON of tasks + decisions exceed the LLM context window? Generally, tasks and decisions are short, so this is highly efficient and safe for 8k-128k context windows.
3. **Agenda Storage:** Should the `Agenda Outline` replace the `description` field in the database, or should it be a separate column? (Will clarify in implementation).

## 5. Next Steps

1. User reviews this updated spec.
2. If approved, we will transition to the implementation plan phase.
