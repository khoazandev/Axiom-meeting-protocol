# System Architecture (ARCHITECTURE)

This document provides a detailed technical overview of the Axiom project, built upon the core principles of the DX-OS (Digital Enterprise Operating System) architecture.

## 1. H-P-D-I Overview

Axiom does not implement features randomly. Every line of code and every component must answer the question: Which layer of the DX-OS architecture does it serve?

### 🧑‍💻 H (Human - Interface Layer)
The layer interacting directly with the user, focusing on Clean UI/UX.
- **Technologies:** Next.js 14 (App Router), React 19, Tailwind CSS v4, Shadcn UI.
- **Design Standard:** B2B Enterprise SaaS (Taste Skill), Focus Mode, Electric Blue (#2563eb).
- **Core Implementation:** `src/frontend/src/app/`

### ⚙️ P (Process - Business Logic Gates)
The layer enforcing organizational discipline (e.g., No Agenda = No Meeting).
- **Technologies:** FastAPI, Pydantic (Data Validation).
- **Code Standard:** TDD (Test-Driven Development) defending these gates via `pytest`.
- **Core Implementation:** `src/backend/main.py` and `src/backend/test_main.py`

### 🧠 I (Intelligence - AI Assistants)
The digital assistant layer, operating via background tasks.
- **Technologies:** OpenAI Whisper (Offline transcription), Llama-3 (Offline summarization).
- **Workflow:** Upon meeting conclusion, a FastAPI Background Worker processes the Jitsi audio recording using local AI models.

### 🔒 D (Data - Single Source of Truth)
The centralized storage layer, designed for absolute security. It explicitly prevents data leakage to public clouds.
- **Technologies:** SQLite (Dev) -> PostgreSQL (Prod), SQLAlchemy ORM.
- **Core Implementation:** `src/backend/models.py`, `src/backend/database.py`

---

## 2. System Flow (Mermaid)

```mermaid
graph TD
    User([User]) -->|UI Interaction| Frontend[Next.js Frontend]
    Frontend -->|POST /api/meetings/| Backend[FastAPI Backend]
    
    Backend -->|Validate Agenda (Process Gate)| DB[(Database: SQLite/PostgreSQL)]
    
    User -->|Enter Meeting Room| Jitsi[Jitsi Meet IFrame]
    Jitsi -->|Streaming Audio/Video| JitsiServer[Jitsi Server On-Premise]
    
    JitsiServer -->|Recordings| AI_Worker[AI Background Task]
    AI_Worker -->|Whisper| Transcript(Raw Transcript)
    Transcript -->|LLaMA 3| Summary(Summary & Action Items)
    
    Summary --> DB
```

## 3. Technology Rationale
- **Next.js + Tailwind:** Ultra-fast development speed, SEO optimization via Server Components, and static source code security.
- **FastAPI:** High performance (Async), auto-generated Swagger documentation (OpenAPI), seamless integration with Python AI models.
- **Jitsi Meet:** 100% Open-source, self-hosted friendly infrastructure ensuring total Data Sovereignty for enterprises.
