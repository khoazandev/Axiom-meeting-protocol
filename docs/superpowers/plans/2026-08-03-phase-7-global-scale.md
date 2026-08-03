# Phase 7 Implementation Plan — Scale to 1 Million Users & Global Architecture

> **Goal:** Complete Phase 7 (Multi-language i18n dictionary system, Header language switcher, Event-Driven Messaging Broker, PWA Offline Service Worker, Analytics NDJSON Exporter, and Master Project Plan completion).

---

## Task 1: Event-Driven Messaging Broker (`src/backend/core/events.py`)

### Files

- **New Module:** [events.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/core/events.py)
- **New Test:** [test_events_broker.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_events_broker.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_events_broker.py`:
   - Test publishing an event and verifying registered subscribers receive payload.

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_events_broker.py -v`

3. **Implement event broker** `src/backend/core/events.py`.

4. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_events_broker.py -v`

5. **Git Commit:**
   - Command: `git add src/backend/core/events.py src/backend/tests/test_events_broker.py && git commit -m "feat(events): implement asynchronous Event-Driven messaging broker"`

---

## Task 2: Analytics Telemetry Exporter API (`/api/v1/analytics/export`)

### Files

- **New Router:** [analytics.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/analytics.py)
- **Modify Router:** [router.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/api/v1/router.py)
- **New Test:** [test_analytics_export_api.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_analytics_export_api.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_analytics_export_api.py`:
   - `GET /api/v1/analytics/export` -> returns 200 OK with NDJSON content.

2. **Run pytest** (expect FAIL).

3. **Implement router** `src/backend/api/v1/analytics.py` and register in `router.py`.

4. **Run pytest** (expect PASS).

5. **Git Commit:**
   - Command: `git add src/backend/api/v1/analytics.py src/backend/api/v1/router.py src/backend/tests/test_analytics_export_api.py && git commit -m "feat(analytics): implement BigQuery/ClickHouse compatible NDJSON analytics export endpoint"`

---

## Task 3: Multi-Language i18n Dictionary System (`src/frontend/src/lib/i18n/`)

### Files

- **New File:** [translations.ts](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/src/lib/i18n/translations.ts)
- **New Store:** [useLanguageStore.ts](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/src/lib/store/useLanguageStore.ts)

### Step-by-Step Instructions

1. Create `translations.ts` containing complete Vietnamese (`vi`) and English (`en`) dictionary keys.
2. Create Zustand store `useLanguageStore.ts` managing active locale state with localStorage persistence.

3. **Git Commit:**
   - Command: `git add src/frontend/src/lib/i18n/translations.ts src/frontend/src/lib/store/useLanguageStore.ts && git commit -m "feat(i18n): create multi-language dictionary system for VN and EN"`

---

## Task 4: Language Switcher Header Component (`LanguageToggle`)

### Files

- **Modify Component:** [app-header.tsx](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/src/components/layout/app-header.tsx)

### Step-by-Step Instructions

1. Update `app-header.tsx` to include `LanguageToggle` button switching between `🇻🇳 VN` and `🇺🇸 EN`.

2. **Git Commit:**
   - Command: `git add src/frontend/src/components/layout/app-header.tsx && git commit -m "feat(frontend): integrate LanguageToggle button into AppHeader"`

---

## Task 5: Progressive Web App Manifest & Service Worker (`public/`)

### Files

- **New File:** [manifest.json](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/public/manifest.json)
- **New File:** [sw.js](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/public/sw.js)

### Step-by-Step Instructions

1. Create `public/manifest.json` for PWA installation.
2. Create `public/sw.js` Service Worker for caching static assets and offline draft persistence.

3. **Git Commit:**
   - Command: `git add src/frontend/public/manifest.json src/frontend/public/sw.js && git commit -m "feat(pwa): add Progressive Web App manifest and Service Worker"`

---

## Task 6: PWA Offline Meeting Notes Draft Component

### Files

- **Modify File:** [layout.tsx](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/src/app/layout.tsx)

### Step-by-Step Instructions

1. Update `src/frontend/src/app/layout.tsx` to register PWA Service Worker and manifest link.

2. **Git Commit:**
   - Command: `git add src/frontend/src/app/layout.tsx && git commit -m "feat(pwa): register Service Worker and manifest in root app layout"`

---

## Task 7: Master Project Plan Roadmap Completion Update

### Files

- **Modify:** [MASTER_PROJECT_PLAN.md](file:///c:/Users/Admin/Desktop/Smart_metting_AI/MASTER_PROJECT_PLAN.md)

### Step-by-Step Instructions

1. Update `MASTER_PROJECT_PLAN.md` to mark all 7 Phases complete with 100% status.

2. **Git Commit:**
   - Command: `git add MASTER_PROJECT_PLAN.md && git commit -m "docs: update MASTER_PROJECT_PLAN.md to 100% completion across all 7 Phases"`

---

## Task 8: End-to-End System Verification

### Step-by-Step Instructions

1. Run complete Pytest test suite: `uv run pytest src/backend/ -v`.
2. Run Next.js production build: `npm run build` in `src/frontend`.
3. Verify zero errors.
4. Git Commit & Push.
