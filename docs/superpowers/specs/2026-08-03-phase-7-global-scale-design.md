# Phase 7 Design Spec — Scale to 1 Million Users & Global Architecture

> **Status:** APPROVED  
> **Date:** 2026-08-03  
> **Scope:** Multi-language i18n framework, Event-Driven Messaging Broker, PWA Offline Service Worker, BigQuery/ClickHouse Analytics Exporter, and Complete Project Synthesis.

---

## 1. Overview & Objectives

Phase 7 completes the entire **Master Project Plan Roadmap**. It extends Axiom with multi-language global accessibility, asynchronous event-driven decoupling, PWA offline resilience, and big-data analytics pipeline export capabilities.

Key features:
1. **Multi-Language i18n Dictionary (`src/frontend/src/lib/i18n/`)**: Instant switching between Vietnamese (`vi`) and English (`en`) with `LanguageToggle` in top Header Bar.
2. **Event-Driven Messaging Broker (`src/backend/core/events.py`)**: Asynchronous Pub/Sub broker for background event dispatches.
3. **PWA Offline Service Worker (`src/frontend/public/sw.js` & `manifest.json`)**: Progressive Web App manifest and offline notes draft caching.
4. **Analytics Telemetry Export Endpoint (`/api/v1/analytics/export`)**: NDJSON streaming exporter compatible with BigQuery / ClickHouse data lakes.
5. **Project Completion & Final Verification**: 100% test pass rate across all 7 Phases.

---

## 2. Component Architecture

### 2.1 Multi-Language i18n Framework (`src/frontend/src/lib/i18n/`)
- `translations.ts`: Comprehensive dictionary mapping for UI keys:
  - Navigation labels, headers, action buttons, status tags, and form placeholders.
- `useLanguageStore.ts`: Zustand store persisting selected language (`vi` | `en`) in `localStorage`.
- `LanguageToggle`: Button rendered in Header Bar toggling between `🇻🇳 VN` and `🇺🇸 EN`.

### 2.2 Event Broker (`src/backend/core/events.py`)
- `EventBroker` class providing `publish(event_name, payload)` and `subscribe(event_name, handler)`.
- Dispatches audit logs and webhook triggers asynchronously.

### 2.3 Analytics Pipeline Exporter (`/api/v1/analytics/export`)
- `GET /api/v1/analytics/export`: Generates formatted NDJSON stream containing workspace telemetry data.

---

## 3. Verification & Testing Plan

### 3.1 Pytest Suite (`src/backend/tests/`)
- `test_events_broker.py`: Verify event publishing and subscriber callbacks.
- `test_analytics_export_api.py`: Verify NDJSON analytics exporter format.

### 3.2 Frontend Build & PWA Validation
- Verify Next.js compilation (`npm run build`).
- Verify manifest.json and Service Worker syntax.
