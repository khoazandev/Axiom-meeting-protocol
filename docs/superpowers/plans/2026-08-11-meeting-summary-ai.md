# Meeting Summary AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the STT transcript tab into a "Meeting Summary AI" split-pane layout showing polished notes and near-realtime extracted action items using micro-batching.

**Architecture:**

1. The frontend adds a draggable vertical split-pane (`react-resizable-panels`) inside the meeting tab.
2. The backend modifies the `POST /api/v1/meetings/{id}/transcript_segments` endpoint to count segments. Every 5-10 segments, it triggers a non-blocking background task.
3. The `action_item_extractor` service fetches only the recent transcript chunk, runs the LLM prompt, and saves new Action Items.
4. The frontend polls `/api/v1/meetings/{id}/action-items` every 10 seconds to display new tasks.

**Tech Stack:** React, Next.js, FastAPI, SQLAlchemy, Ollama.

## Global Constraints

- Never re-process the entire meeting transcript for realtime extraction; only process the newly added chunks.
- The UI must have independent scrollbars for the top (Meeting Notes) and bottom (Follow-up Tasks) panes.
- Use `react-resizable-panels` for the split-pane.

---

### Task 1: Backend - Action Item Extractor Micro-Batching

**Files:**

- Modify: `src/backend/services/action_item_extractor.py`
- Modify: `src/backend/api/v1/meeting_content.py`

**Interfaces:**

- Consumes: `TranscriptSegment` table.
- Produces: Modified `extract_action_items(db, meeting_id, triggered_by, micro_batch_limit=None)` signature.

- [ ] **Step 1: Write the failing test (optional but recommended)**

  - Since we are modifying existing logic, we can skip direct unit test generation and focus on the implementation logic for micro-batching.

- [ ] **Step 2: Update `collect_transcript_text` in `action_item_extractor.py`**

  - Add an optional `limit: int = None` parameter.
  - If `limit` is provided, order by `sequence.desc()`, limit it, and then reverse the list to maintain chronological order.

- [ ] **Step 3: Update `extract_action_items` signature**

  - Add `micro_batch_limit: int = None` to `extract_action_items`.
  - Pass `limit=micro_batch_limit` to `collect_transcript_text`.

- [ ] **Step 4: Update `api/v1/meeting_content.py` endpoint**

  - In `create_transcript_segment`, add `background_tasks: BackgroundTasks` to the endpoint signature.
  - After saving the segment, count the total segments for the meeting: `count = db.query(TranscriptSegment).filter_by(meeting_id=meeting_id).count()`.
  - If `count > 0 and count % 5 == 0`, add a background task to call `extract_action_items(db, meeting_id, current_user.id, micro_batch_limit=10)`. Note: use a fresh DB session for the background task to avoid concurrency issues. (e.g., `db_generator = get_db(); bg_db = next(db_generator); extract_action_items(bg_db, ...)`)

- [ ] **Step 5: Commit**

```bash
git add src/backend/services/action_item_extractor.py src/backend/api/v1/meeting_content.py
git commit -m "feat: backend micro-batching for action item extraction"
```

### Task 2: Frontend - Split Pane UI & Dependencies

**Files:**

- Create/Modify: `package.json`
- Modify: `src/frontend/src/app/meetings/[id]/meeting-room-client.tsx`

**Interfaces:**

- Consumes: `react-resizable-panels` package.

- [ ] **Step 1: Install dependency**

```bash
docker-compose exec frontend npm install react-resizable-panels
```

- [ ] **Step 2: Add Split Pane layout to `meeting-room-client.tsx`**

  - Import `Panel, PanelGroup, PanelResizeHandle` from `react-resizable-panels`.
  - Rename the tab `Nội dung cuộc họp` to `Meeting Summary AI`.
  - Inside `activeRightTab === 'transcript'` (which is now AI Summary), replace the single feed with a `<PanelGroup direction="vertical">`.
  - Top `<Panel>`: wrap the existing Transcript History Feed and STT status bar. Ensure it has `overflow-y-auto`.
  - Add `<PanelResizeHandle />` (style it with a thin border and hover effect).
  - Bottom `<Panel>`: Create a placeholder div for "Follow-up Tasks" with `overflow-y-auto`.

- [ ] **Step 3: Refine Meeting Notes Styling**

  - Instead of chat bubbles, render the `vadTranscriptHistory` as a continuous document: `[SpeakerName] 10:05 AM: <vi_text>`.
  - Remove the English translation (`en_text`) from this view to keep it clean, or keep it subtle.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/package.json src/frontend/package-lock.json src/frontend/src/app/meetings/\[id\]/meeting-room-client.tsx
git commit -m "feat: frontend layout for Meeting Summary AI"
```

### Task 3: Frontend - Action Items Data Fetching

**Files:**

- Modify: `src/frontend/src/lib/api.ts`
- Modify: `src/frontend/src/app/meetings/[id]/meeting-room-client.tsx`

**Interfaces:**

- Consumes: `/api/v1/meetings/{id}/action-items` backend endpoint.

- [ ] **Step 1: Update API Client**

  - In `api.ts`, verify or add a method to `meetingsApi` to fetch action items: `getActionItems(meetingId: string)`. (This endpoint `GET /api/v1/meetings/{meeting_id}/action-items` already exists in `meeting_content.py`).

- [ ] **Step 2: Add Polling Logic to Client**

  - In `meeting-room-client.tsx`, add state: `const [actionItems, setActionItems] = useState<any[]>([])`.
  - Add a `useEffect` that runs `setInterval` every 10 seconds to call `meetingsApi.getActionItems(meetingId)` and update state. Ensure to clear the interval on unmount.

- [ ] **Step 3: Render Action Items**

  - In the Bottom `<Panel>` created in Task 2, map over `actionItems`.
  - Render each item on a single line: `[${item.status}] ${item.title} - ${item.description || ''} (Assignee: ${item.assignee_id || 'Unassigned'})`.
  - Style the `item.title` (task-key) with a highlight (e.g., bold or specific color).

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/lib/api.ts src/frontend/src/app/meetings/\[id\]/meeting-room-client.tsx
git commit -m "feat: frontend polling and rendering for Follow-up Tasks"
```
