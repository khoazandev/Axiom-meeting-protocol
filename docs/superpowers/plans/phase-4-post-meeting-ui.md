# Phase 4 — Post-Meeting UI & Dashboard Enhancement

> **Goal:** Build frontend pages to display meeting results: transcript viewer, action items per meeting, meeting summary, and enhanced dashboard.
> **Priority:** 🟡 HIGH — Users need to see AI results.
> **Estimated effort:** Medium-Large (UI work)

---

## Context

Backend APIs are ready but frontend has no pages to display post-meeting results:

- Transcript segments API ✅ → No transcript viewer UI
- Action items API ✅ → Tasks page shows all tasks globally, not per-meeting
- Summary API ✅ → No summary display UI
- Meeting detail page shows LiveKit room only, no post-meeting view

---

## Tasks

### Task 1: Meeting Detail Page (Post-Meeting View)

**File:** `src/frontend/src/app/meetings/[id]/page.tsx` [MODIFY]

When meeting status is `COMPLETED`, show post-meeting view instead of LiveKit room:

```
┌──────────────────────────────────────────────────┐
│  Sprint Planning Meeting          ✅ COMPLETED    │
├──────────────────────────────────────────────────┤
│  📊 Summary    📝 Transcript    ✅ Action Items  │
├──────────────────────────────────────────────────┤
│                                                  │
│  [Tab content based on selection]                │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Sub-components:**

- `MeetingSummaryTab` — Display AI summary, key points, decisions
- `TranscriptTab` — Scrollable transcript with speaker labels, timestamps
- `ActionItemsTab` — Per-meeting action items with owner, priority, status

### Task 2: Transcript Viewer Component

**File:** `src/frontend/src/components/TranscriptViewer.tsx` [NEW]

Features:

- Display transcript segments chronologically
- Speaker labels with avatars/colors
- Timestamps on each segment
- Search/filter within transcript
- Highlight segments linked to action items

### Task 3: Per-Meeting Action Items Component

**File:** `src/frontend/src/components/MeetingActionItems.tsx` [NEW]

Features:

- List action items extracted from this specific meeting
- Show: task, owner, priority, due date, status
- Allow status toggle (TODO → IN_PROGRESS → COMPLETED)
- "Re-extract" button to trigger AI extraction again
- Visual distinction: AI-extracted vs manually created

### Task 4: Meeting Summary Display

**File:** `src/frontend/src/components/MeetingSummary.tsx` [NEW]

Features:

- Executive summary paragraph
- Key points as bullet list
- Decisions made as highlighted cards
- "Re-generate" button

### Task 5: Dashboard Enhancement

**File:** `src/frontend/src/app/(dashboard)/page.tsx` [MODIFY]

- Show recent meetings with status badges
- Quick stats: meetings this week, action items pending, items completed
- Link to meeting detail page

### Task 6: Frontend API Integration

**File:** `src/frontend/src/lib/api.ts` [MODIFY]

Add API calls:

```typescript
meetingsApi.getTranscripts(meetingId);
meetingsApi.getActionItems(meetingId);
meetingsApi.getSummary(meetingId);
meetingsApi.extractActionItems(meetingId);
meetingsApi.generateSummary(meetingId);
```

---

## Verification

### Manual Test

1. Login → Go to completed meeting
2. See 3 tabs: Summary, Transcript, Action Items
3. Summary shows AI-generated content
4. Transcript shows all segments with speakers
5. Action items show extracted tasks with owners

### Build Check

```bash
cd src/frontend && npm run build
```

---

## Dependencies

- Action item extraction API ✅
- Summary generation API (Phase 3)
- Transcript segments API ✅
- Meeting CRUD API ✅
