# Agenda Tab & Topic Grouping Redesign

## 1. Understanding Summary
- **Goal:** Consolidate Topics, FollowUpTasks, and MeetingDecisions into a single, cohesive "Agenda" tab in the meeting room right-sidebar.
- **Why:** Tasks and Decisions naturally belong to the specific Topic being discussed. Separating them into a different "Transcript/Records" tab creates cognitive load and breaks the meeting flow.
- **Target Audience:** Meeting hosts, admins, and members who need a clear overview of the meeting progress and outcomes.
- **Constraints:** The right sidebar is narrow. The UI must remain clean, minimal, and prevent information overload.

## 2. Assumptions & NFRs
- **Database Schema:** `FollowUpTask` currently lacks a `topic_id`. We assume it is acceptable to update the backend schema and API to add `topic_id` to `FollowUpTask`. (`MeetingDecision` already has this).
- **Scale:** Meetings typically have < 20 topics and < 10 tasks/decisions per topic. Pagination within the sidebar is not strictly required.
- **Real-time Sync:** The existing polling/websocket mechanism is sufficient to automatically update the UI when the AI extracts a new Task or Decision.

## 3. Decision Log
| Decision | Options Considered | Rationale |
|----------|--------------------|-----------|
| **UI Layout Model** | A. Nested Accordion<br>B. Master-Detail<br>C. Flat List | **Chosen A (Nested Accordion)**. It provides the best balance of high-level overview (seeing all topics) and granular detail (expanding only the active topic), which is critical for a narrow sidebar. |
| **Visual Style** | A. Colored cards & Emojis<br>B. Minimalist text & borders | **Chosen B**. To prevent visual clutter in a tight space, we use typography (gray vs. primary text) instead of heavy background colors or excessive icons. |
| **Topic Status Labels** | A. [✅] / [▶️] / [⏳]<br>B. Text: Đã xong / Đang tiến hành / Chưa tiến hành | **Chosen B**. Text is cleaner and more professional. Replaced default terms with strictly localized text. |
| **Inline Editing** | A. Modal popups<br>B. Hover-to-edit | **Chosen B**. Clicking "Edit" on hover switches the text to an inline input, preventing modals from blocking the screen context. |

## 4. Final Design Specification

### 4.1 Data Architecture
- **Backend:** Add `topic_id` (String, ForeignKey to `topics.id`) to `FollowUpTask` model.
- **API:** Update extraction logic to associate newly extracted tasks with the `IN_PROGRESS` topic.

### 4.2 Sidebar Layout
- **Top Section: Topics Accordion**
  - List of Topics.
  - **Collapsed View:** 
    - Title of the topic.
    - Status label: `[Đã xong]` (gray, strikethrough), `[Đang tiến hành]` (primary color, bold), or `[Chưa tiến hành]` (gray).
    - Data badge: Small text right-aligned (e.g., `(2 Quyết định, 1 Task)`).
  - **Expanded View:** (Auto-expands if `IN_PROGRESS`)
    - Subtle internal divider.
    - **DECISIONS** section (small uppercase header). List of decisions as bullet points.
    - **ACTION ITEMS** section (small uppercase header). List of tasks ending with `- Assigned to: Name`.
    - "Hover-to-edit" button appears on the far right of each item row.
    - If AI is actively running but no items exist yet: Display italic text *"AI đang nghe và tự động trích xuất..."*.

- **Bottom Section: Documents**
  - Reuses the existing Document UI (filename + eye icon toggle to reveal rich text editor).
