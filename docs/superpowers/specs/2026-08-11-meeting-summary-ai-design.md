# Meeting Summary AI - Design Specification

## 1. Overview

Replace the existing "Nội dung cuộc họp" (Transcript) tab with a comprehensive "Meeting Summary AI" tab. This new layout will feature a draggable vertical split-pane to simultaneously view polished meeting notes and near-realtime action items.

## 2. UI/UX Design

- **Tab Rename:** `Nội dung cuộc họp` -> `Meeting Summary AI`.
- **Layout Engine:** Use `react-resizable-panels` to create a top/bottom split pane.
- **Top Pane (Meeting Notes):**
  - Displays the transcript as a continuous document (e.g., `[Speaker] 10:05 AM: ...`).
  - Independent vertical scrollbar (`overflow-y-auto`).
  - Auto-scrolls to the bottom when new notes arrive.
  - Data: Sourced directly from the polished STT `vi_text` via WebSocket/DB.
- **Bottom Pane (Follow-up Tasks):**
  - Displays Action Items, one per line.
  - Independent vertical scrollbar.
  - Format: `[Highlight Task-Key] - Description (Assignee)`.

## 3. Data & Near-Realtime Extraction Algorithm

To achieve "near-realtime" Action Item extraction without overloading the LLM or suffering from huge latency by reprocessing the entire meeting:

### The "Micro-Batching" Algorithm

1. **Trigger Condition:** Instead of processing the entire meeting transcript, the system will track unprocessed transcript segments.
2. **Chunking Strategy:** Every time **5 to 10 new sentences** are saved (or every ~60 seconds of active talking), the backend will group just these new sentences into a "Micro-Batch".
3. **Extraction:** A background task (non-blocking) is spawned to send this specific Micro-Batch to the LLM (Ollama) to extract tasks.
4. **Saving:** Any tasks identified in this short window are instantly appended to the `action_items` table.
5. **Frontend Sync:** The UI will periodically poll `GET /api/v1/meetings/{id}/action-items` every 10 seconds. Newly extracted tasks will appear almost instantly in the Bottom Pane.

### Advantages

- **Fast:** Extracting from 10 sentences takes <2 seconds for the LLM.
- **Token Efficient:** Never re-reads old transcript data.
- **Real-time Feel:** Users see tasks pop up dynamically as the meeting progresses.
