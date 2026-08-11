# Spec: Post-Meeting UI — Technical Design

> Companion spec for: `phase-4-post-meeting-ui.md`

---

## Page Structure

### Meeting Detail Page (`/meetings/[id]`)

```
State machine:
  meeting.status === "SCHEDULED"    → Show "Meeting not started" + Join button
  meeting.status === "IN_PROGRESS"  → Show LiveKit Room (existing)
  meeting.status === "COMPLETED"    → Show Post-Meeting View (NEW)
  meeting.status === "CANCELLED"    → Show "Meeting cancelled"
```

### Post-Meeting View Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ◀ Back to Meetings                                             │
│                                                                 │
│  Sprint Planning Meeting                     ✅ Completed       │
│  Aug 10, 2026 • 45 min • 4 participants                        │
├─────────────────────────────────────────────────────────────────┤
│  [📊 Summary]  [📝 Transcript]  [✅ Action Items]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  Tab content renders here                               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab: Summary

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Meeting Summary                    [🔄 Re-generate]    │
│                                                             │
│  The team discussed sprint goals and assigned key tasks     │
│  for the upcoming release. Focus areas include API docs,    │
│  login page fix, and staging deployment.                    │
│                                                             │
│  ── Key Points ──────────────────────────────────────────   │
│  • API documentation needs updating for v2 endpoints        │
│  • Login page bug is blocking QA for 2 days                 │
│  • Security audit report pending review                     │
│                                                             │
│  ── Decisions ───────────────────────────────────────────   │
│  ┌──────────────────────────────────┐                       │
│  │ ✅ Deploy staging by Monday      │                       │
│  │ ✅ Khoa leads API docs effort    │                       │
│  └──────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Tab: Transcript

```
┌─────────────────────────────────────────────────────────────┐
│  📝 Transcript                     🔍 [Search transcript]  │
│                                                             │
│  00:00  ┌──────────────────────────────────────────────┐   │
│         │ 🟢 Khoa                                      │   │
│         │ Alright team, let's review the sprint        │   │
│         │ backlog and assign tasks.                     │   │
│         └──────────────────────────────────────────────┘   │
│                                                             │
│  00:15  ┌──────────────────────────────────────────────┐   │
│         │ 🔵 Minh                                      │   │
│         │ I'll take the security audit report.         │   │
│         │                 [📌 Linked to action item]   │   │
│         └──────────────────────────────────────────────┘   │
│                                                             │
│  00:30  ┌──────────────────────────────────────────────┐   │
│         │ 🟢 Khoa                                      │   │
│         │ Great, and I'll handle the API docs.         │   │
│         └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tab: Action Items

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Action Items (5)                [🔄 Re-extract]        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● HIGH   Update API documentation                   │   │
│  │          Owner: Khoa  •  Due: Friday  •  TODO ▼     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● MED    Fix login page bug                         │   │
│  │          Owner: Unassigned  •  Due: N/A  •  TODO ▼  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● MED    Review security audit report               │   │
│  │          Owner: Minh  •  Due: EOW  •  TODO ▼       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Legend: ● HIGH  ● MEDIUM  ● LOW                           │
│  Status: TODO → IN_PROGRESS → DONE                         │
└─────────────────────────────────────────────────────────────┘
```

---

## API Calls (Frontend)

```typescript
// src/frontend/src/lib/api.ts

meetingsApi = {
  // Existing
  get(id): Meeting
  list(): Meeting[]

  // New — Meeting Content
  getTranscripts(meetingId): TranscriptSegment[]
  getActionItems(meetingId): ActionItem[]
  getSummary(meetingId): MeetingSummary | null

  // New — AI Triggers
  extractActionItems(meetingId): { extracted_count, items }
  generateSummary(meetingId): MeetingSummary
}
```

---

## Component Tree

```
app/meetings/[id]/page.tsx
  └── MeetingDetailClient
        ├── if IN_PROGRESS → MeetingRoomClient (existing LiveKit)
        └── if COMPLETED → PostMeetingView
              ├── MeetingHeader (title, date, status, participants)
              ├── TabBar (Summary | Transcript | Action Items)
              ├── MeetingSummaryTab
              │     ├── SummaryContent
              │     ├── KeyPointsList
              │     └── DecisionsCards
              ├── TranscriptTab
              │     ├── SearchBar
              │     └── TranscriptSegmentList
              │           └── TranscriptSegmentCard (speaker, time, text)
              └── ActionItemsTab
                    ├── ExtractButton
                    └── ActionItemList
                          └── ActionItemCard (task, owner, priority, status toggle)
```

---

## Responsive Breakpoints

| Breakpoint          | Layout                              |
| ------------------- | ----------------------------------- |
| Desktop (>1024px)   | Full 3-tab layout, sidebar possible |
| Tablet (768-1024px) | Stacked tabs, full width            |
| Mobile (<768px)     | Single column, swipe between tabs   |
