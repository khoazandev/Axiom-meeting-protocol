# Phase 4 Implementation Plan — AI Intelligence UI Pipeline & Enterprise Knowledge Hub

> **Goal:** Implement Phase 4 Intelligence Layer UI/UX (Live Subtitles overlay, Dual Chat, Smart Bookmarks, Auto MoM Tab with 1-Click Jira Task Sync, Knowledge Hub page, and supporting REST APIs).

---

## Task 1: Database Models & Alembic Migration for Phase 4

### Files
- **Modify:** [models.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/models.py)
- **New Migration:** [b2c3d4e5f6a7_add_phase4_tables.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/alembic/versions/b2c3d4e5f6a7_add_phase4_tables.py)
- **New Test:** [test_models_phase4.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_models_phase4.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_models_phase4.py`:
   - Create user & workspace.
   - Create `MeetingBookmark` record tied to meeting.
   - Create `KnowledgeDocument` record tied to workspace.
   - Assert fields & foreign keys.

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_models_phase4.py -v`

3. **Implement Phase 4 models** in `src/backend/models.py`:
   - Model `MeetingBookmark`: `id` (String UUID), `meeting_id` (Integer ForeignKey), `user_id` (String ForeignKey), `timestamp_seconds` (Integer), `note` (String), `is_action_item` (Boolean, default False), `created_at` (DateTime).
   - Model `KnowledgeDocument`: `id` (String UUID), `workspace_id` (String ForeignKey), `uploaded_by_id` (String ForeignKey), `filename` (String), `file_path` (String), `file_size` (Integer), `vector_status` (String, default "READY"), `created_at` (DateTime).
   - Update relationships on `Workspace`, `Meeting`, `User`.

4. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_models_phase4.py -v`

5. **Generate Alembic migration** `src/backend/alembic/versions/b2c3d4e5f6a7_add_phase4_tables.py`:
   - Create tables `meeting_bookmarks` and `knowledge_documents` using `render_as_batch=True`.

6. **Git Commit:**
   - Command: `git add src/backend/models.py src/backend/alembic/versions/b2c3d4e5f6a7_add_phase4_tables.py src/backend/tests/test_models_phase4.py && git commit -m "feat(db): add Phase 4 MeetingBookmark and KnowledgeDocument models"`

---

## Task 2: Smart Bookmarks API (`/api/v1/meetings/{id}/bookmarks`)

### Files
- **New Router:** [mom.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/mom.py)
- **Modify Router:** [router.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/router.py)
- **New Test:** [test_bookmarks_api.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_bookmarks_api.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_bookmarks_api.py`:
   - Register user, create workspace & meeting.
   - `POST /api/v1/meetings/{id}/bookmarks` with `timestamp_seconds=120`, `note="Key Decision on Release Date"`.
   - Assert 201 CREATED and returned bookmark ID.
   - `GET /api/v1/meetings/{id}/bookmarks` -> assert list contains the bookmark.

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_bookmarks_api.py -v`

3. **Implement router** in `src/backend/api/v1/mom.py`:
   - `POST /api/v1/meetings/{meeting_id}/bookmarks`: saves bookmark.
   - `GET /api/v1/meetings/{meeting_id}/bookmarks`: lists bookmarks.

4. **Register router** in `src/backend/api/v1/router.py`.

5. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_bookmarks_api.py -v`

6. **Git Commit:**
   - Command: `git add src/backend/api/v1/mom.py src/backend/api/v1/router.py src/backend/tests/test_bookmarks_api.py && git commit -m "feat(api): implement meeting bookmarks endpoints"`

---

## Task 3: Auto MoM & 1-Click Jira Task Sync API (`/api/v1/meetings/{id}/mom` & `/sync-tasks`)

### Files
- **Modify Router:** [mom.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/mom.py)
- **New Test:** [test_mom_api.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_mom_api.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_mom_api.py`:
   - Create meeting with transcript & summary.
   - `GET /api/v1/meetings/{id}/mom`: assert 200 OK with summary, key_decisions, and speaker_stats.
   - `POST /api/v1/meetings/{id}/sync-tasks`: assert 200 OK and verifies tasks are created in DB `Task` table.

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_mom_api.py -v`

3. **Implement endpoints** in `src/backend/api/v1/mom.py`:
   - `GET /api/v1/meetings/{meeting_id}/mom`: compiles summary, key decisions, speaker talk-time percentages, and action items.
   - `POST /api/v1/meetings/{meeting_id}/sync-tasks`: parses action items and inserts them into `tasks` table with workspace isolation.

4. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_mom_api.py -v`

5. **Git Commit:**
   - Command: `git add src/backend/api/v1/mom.py src/backend/tests/test_mom_api.py && git commit -m "feat(api): add Auto MoM report and 1-Click Jira task sync endpoints"`

---

## Task 4: Enterprise Knowledge Hub API (`/api/v1/knowledge/documents` & `/query`)

### Files
- **New Router:** [knowledge.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/knowledge.py)
- **Modify Router:** [router.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/router.py)
- **New Test:** [test_knowledge_api.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_knowledge_api.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_knowledge_api.py`:
   - Upload file to `/api/v1/knowledge/documents`.
   - Assert 201 CREATED.
   - `GET /api/v1/knowledge/documents` -> assert list contains file.
   - `POST /api/v1/knowledge/query` with `{"query": "Alembic"}` -> returns search results.

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_knowledge_api.py -v`

3. **Implement router** in `src/backend/api/v1/knowledge.py`:
   - Handles document upload to `storage/knowledge/{workspace_id}/`.
   - Implements semantic keyword search over uploaded documents & meeting transcripts.

4. **Register router** in `src/backend/api/v1/router.py`.

5. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_knowledge_api.py -v`

6. **Git Commit:**
   - Command: `git add src/backend/api/v1/knowledge.py src/backend/api/v1/router.py src/backend/tests/test_knowledge_api.py && git commit -m "feat(knowledge): implement enterprise knowledge hub upload and query APIs"`

---

## Task 5: Frontend Live Subtitle Overlay & Dual-Chat Panel

### Files
- **Modify Component:** [meeting-room-client.tsx](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/src/app/meetings/[id]/meeting-room-client.tsx)

### Step-by-Step Instructions
1. Upgrade `meeting-room-client.tsx`:
   - Add live scrolling subtitle overlay at bottom of video canvas with speaker avatar.
   - Add Dual Chat tabs (`Public Chat` vs `AI Assistant`) in right panel.
   - Add `📌 Bookmark` button in bottom control bar calling `/api/v1/meetings/{id}/bookmarks`.
2. Test local compilation.

---

## Task 6: Frontend Auto MoM Dashboard Tab

### Files
- **Modify Page:** [page.tsx](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/src/app/meetings/[id]/page.tsx)

### Step-by-Step Instructions
1. Upgrade `/meetings/[id]` page with top Tab navigation:
   - `Tab 1: Live Call Room`
   - `Tab 2: Minutes of Meeting (MoM)`
2. Build MoM Tab view:
   - Executive Summary markdown card.
   - Key Decisions checklist.
   - Speaker talk-time percentage progress bars.
   - `⚡ Sync Action Items to Jira Board` button with toast feedback.

---

## Task 7: Frontend Knowledge Hub Page

### Files
- **Modify Page:** [page.tsx](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/src/app/(dashboard)/knowledge/page.tsx)

### Step-by-Step Instructions
1. Upgrade `/knowledge` page:
   - Drag-and-drop file upload zone for PDF, DOCX, TXT calling `/api/v1/knowledge/documents`.
   - Grid cards of uploaded documents with `Vectorized` status badges.
   - Interactive AI Search Input box returning query results dynamically.

---

## Task 8: End-to-End System Verification

### Step-by-Step Instructions
1. Run complete Pytest test suite: `uv run pytest src/backend/ -v`.
2. Run Next.js production build: `npm run build` in `src/frontend`.
3. Verify zero errors.
4. Git Commit & Push.
