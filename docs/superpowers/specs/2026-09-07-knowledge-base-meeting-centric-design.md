# Knowledge Base Redesign: Meeting-Centric

## 1. Goal

Transition the Axiom Knowledge Base from a flat document list to a meeting-centric dashboard. The new interface will group resources (summaries, transcripts, and documents) by Meeting rather than showing unstructured workspace documents.

## 2. Architecture & Data Model

### Database Models (`models.py`)

- Update `KnowledgeDocument` to require a `meeting_id` field.
- **Migration**: Create an Alembic migration to add `meeting_id` (ForeignKey to `meetings.id`) to `KnowledgeDocument`.

### Backend APIs (`api/v1/knowledge.py`)

- **POST `/documents`**: Add `meeting_id` to the upload payload. Ensure the document is linked to the specified meeting.
- **GET `/documents`**: Will be deprecated or filtered by `meeting_id`.
- **GET `/query` (Semantic Search)**: Ensure search results map back to the correct Meeting ID so the frontend can redirect the user to the corresponding Meeting modal/page when a document is clicked.

## 3. Frontend Implementation (`knowledge/page.tsx`)

### The Main View

- Instead of a grid of uploaded documents, display a list/grid of past Meetings (fetched from `/meetings`).
- Retain the Semantic Search bar at the top, which continues to search across all documents and transcripts globally.

### Meeting Details View (Modal / Slide-out Panel)

- When a user clicks on a Meeting, a modal or side-panel opens.
- The panel contains 3 tabs:
  1. **Biên bản (Summary)**: Fetches and displays data from `/meetings/{id}/summary` (Title, Key Decisions, Action Items).
  2. **Bản ghi (Transcript)**: Fetches and displays data from `/meetings/{id}/transcripts`.
  3. **Tài liệu (Documents)**: Displays documents uploaded specifically for this meeting.
- The "Upload Document" functionality will be moved inside the "Tài liệu" tab of this meeting view.

## 4. Verification Plan

- **Database**: Run migrations and verify `knowledge_documents` table contains `meeting_id`.
- **API**: Call `POST /knowledge/documents` and verify the file is attached to the correct meeting.
- **Frontend**: Navigate to Knowledge Base, ensure meetings are listed, and the three tabs (Summary, Transcript, Documents) load data correctly for a selected meeting.
