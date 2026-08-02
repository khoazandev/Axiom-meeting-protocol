# Phase 4 Design Spec — AI Intelligence UI/UX Pipeline & Enterprise Knowledge Hub

> **Status:** APPROVED  
> **Date:** 2026-08-03  
> **Scope:** Phase 4 Platform & UI/UX Intelligence (Live Subtitles, Dual-Chat, Smart Bookmarks, Auto MoM Tab, Knowledge Hub, Backend API Endpoints)

---

## 1. Overview & Objectives

Phase 4 builds the **Intelligence UI/UX Layer** of Axiom, bridging the live video room (Google Meet WebRTC interface) with post-meeting productivity (Jira-style action items and enterprise Knowledge Hub).

Following the partnership scope, deep AI model inference (Whisper STT processing & Llama-3 RAG inference) is executed on external AI servers built by the partner. Phase 4 provides:
1. **Live Meeting Subtitles & Dual-Chat System**: Real-time scrolling subtitle bar and tabbed chat (Public Chat vs. AI Assistant Chat).
2. **Smart Bookmarking**: Instant timestamped moment marking during meetings.
3. **Auto MoM Dashboard**: Integrated Tab 2 inside `/meetings/[id]` displaying Executive Summaries, Key Decisions, Speaker Talk-Time Breakdown, and **1-Click Sync to Jira Tasks**.
4. **Knowledge Hub Workspace (`/knowledge`)**: Enterprise document repository with drag-and-drop document upload and AI semantic search bar.
5. **Backend Data Endpoints**: Supporting REST APIs for bookmarks, MoM reports, task syncing, and knowledge base document management.

---

## 2. Component Design & Frontend Architecture

### 2.1 Live Meeting Room (`src/frontend/src/app/meetings/[id]/meeting-room-client.tsx`)
- **Live Subtitle Overlay Bar**: Positioned at the bottom center of the video stage. Displays real-time incoming subtitle text, speaker avatar, and auto-scroll behavior.
- **Dual-Chat Drawer Panel**:
  - `Public Chat`: Real-time text messaging between meeting attendees.
  - `AI Assistant Chat`: Interactive prompt bar allowing users to ask questions against meeting context and uploaded documents.
- **Smart Bookmark Control**: Added to LiveKit control dock — `📌 Bookmark Key Moment` & `⚡ Quick Action Item`.

### 2.2 Auto MoM Dashboard (`src/frontend/src/app/meetings/[id]/page.tsx`)
- Tabbed interface at meeting detail route `/meetings/[id]`:
  - `Tab 1`: **Live Call Room / Recording Player** (LiveKit WebRTC stage).
  - `Tab 2`: **Minutes of Meeting (MoM)**:
    - **Executive Summary Box**: Clean markdown rendering of meeting highlights.
    - **Key Decisions Checklist**: Bulleted list of binding decisions made.
    - **Speaker Analytics**: Interactive talk-time breakdown bar chart (e.g. Alice 45%, Bob 35%, Charlie 20%).
    - **1-Click Sync Button**: `⚡ Sync Action Items to Jira Board` — calls `/api/v1/meetings/{id}/sync-tasks` to create DB tasks.

### 2.3 Knowledge Hub Page (`src/frontend/src/app/(dashboard)/knowledge/page.tsx`)
- **Header**: Enterprise Knowledge Base & Semantic Search.
- **Upload Zone**: Drag-and-drop file uploader for PDF, DOCX, TXT.
- **Document List Grid**: Cards displaying file status (`Vectorized`, `Processing`), file size, uploader, and date.
- **AI Semantic Query Bar**: Natural language search box returning relevant snippets from meeting transcripts and attached docs.

---

## 3. Backend API Endpoints & Data Model (`src/backend/`)

### 3.1 Data Model Extensions (`src/backend/models.py`)
- Model `MeetingBookmark`:
  - `id` (UUID string), `meeting_id` (ForeignKey), `user_id` (ForeignKey), `timestamp_seconds` (Integer), `note` (String), `is_action_item` (Boolean), `created_at` (DateTime).
- Model `KnowledgeDocument`:
  - `id` (UUID string), `workspace_id` (ForeignKey), `uploaded_by_id` (ForeignKey), `filename` (String), `file_path` (String), `file_size` (Integer), `vector_status` (String: `READY`, `PROCESSING`), `created_at` (DateTime).

### 3.2 New Router: Bookmarks & MoM (`src/backend/api/v1/mom.py`)
- `POST /api/v1/meetings/{meeting_id}/bookmarks`: Create timestamped bookmark.
- `GET /api/v1/meetings/{meeting_id}/bookmarks`: List bookmarks for meeting.
- `GET /api/v1/meetings/{meeting_id}/mom`: Get compiled MoM summary, key decisions, speaker stats, and action items.
- `POST /api/v1/meetings/{meeting_id}/sync-tasks`: Convert MoM action items into workspace `Task` entries.

### 3.3 New Router: Knowledge Hub (`src/backend/api/v1/knowledge.py`)
- `POST /api/v1/knowledge/documents`: Upload knowledge document.
- `GET /api/v1/knowledge/documents`: List workspace documents.
- `DELETE /api/v1/knowledge/documents/{id}`: Delete knowledge document.
- `POST /api/v1/knowledge/query`: Semantic query endpoint returning matching document/transcript snippets.

---

## 4. Verification & Testing Plan

### 4.1 Pytest Suite (`src/backend/tests/`)
- `test_bookmarks_api.py`: Verify bookmark creation and timestamp indexing.
- `test_mom_api.py`: Verify MoM retrieval and 1-click task sync logic.
- `test_knowledge_api.py`: Verify document upload and query endpoints.

### 4.2 Frontend Production Build
- Verify Next.js compilation: `npm run build` in `src/frontend`.
