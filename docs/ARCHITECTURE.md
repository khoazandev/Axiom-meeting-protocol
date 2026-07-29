# System Architecture (ARCHITECTURE)

This document provides a detailed technical overview of the Axiom project, built upon the core principles of the DX-OS (Digital Enterprise Operating System) architecture.

Axiom does not implement features randomly. Every line of code and every component must answer the question: **Which layer of the DX-OS architecture does it serve?**

---

## 1. H-P-D-I Deep Dive

### 🧑‍💻 H (Human - Interface Layer)

The layer interacting directly with the user. Its primary goal is to enforce focus, minimize distraction, and provide a premium enterprise aesthetic.

- **Technologies:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Shadcn UI.
- **Design Standard:** B2B Enterprise SaaS (Taste Skill), Focus Mode, Electric Blue accents.
- **Real-time Engine:** Native LiveKit WebRTC integration via @livekit/components-react.
- **Core Implementation:** src/frontend/

### ⚙️ P (Process - Business Logic Gates)

The layer enforcing organizational discipline. In Axiom, process means strict rules (e.g., No Agenda = No Meeting).

- **Technologies:** FastAPI (Python 3.12+), Pydantic V2 (Strict Data Validation).
- **Code Standard:** TDD (Test-Driven Development) defending these gates via pytest. We strictly follow the Red-Green-Refactor cycle.
- **Core Implementation:** src/backend/main.py and src/backend/test_main.py

### 🧠 I (Intelligence - AI Assistants)

The digital assistant layer. It operates silently via background tasks, turning unstructured audio into structured data.

- **Technologies:**
  - **Speech-to-Text (STT):** OpenAI Whisper (Offline capability).
  - **Large Language Model (LLM):** Llama-3 (via Ollama or local inference) for action item extraction and summarization.
- **Workflow:** LiveKit Agents connect to the room, stream audio to Whisper, generate transcripts, and push them to Llama-3 for summarization upon meeting conclusion.

### 🔒 D (Data - Single Source of Truth)

The centralized storage layer, designed for absolute security and data sovereignty. It explicitly prevents data leakage to public clouds.

- **Technologies:** SQLite (for local development) -> PostgreSQL (for production). SQLAlchemy ORM.
- **Core Implementation:** src/backend/models.py, src/backend/database.py

---

## 2. Architectural Diagrams (C4 & Sequence)

### System Context (C4 Model)

How Axiom interacts with users and external/internal systems.

`mermaid
C4Context
title System Context diagram for Axiom DX-OS

    Person(employee, "Enterprise Employee", "An employee attending or creating a meeting.")

    System(axiom, "Axiom Meeting Protocol", "Handles meeting scheduling, WebRTC video, and AI transcription/summarization.")

    System_Ext(livekit, "LiveKit Server", "Handles WebRTC routing and SFU capabilities.")
    System_Ext(ai_models, "Local AI Models", "Whisper STT and LLaMA-3 for processing.")

    Rel(employee, axiom, "Schedules and joins meetings using")
    Rel(axiom, livekit, "Connects via WebRTC SDK to")
    Rel(livekit, ai_models, "Streams audio data to")
    Rel(ai_models, axiom, "Sends transcripts and summaries to")

`

### Meeting Creation & Validation Sequence

Demonstrating the **Process (P)** gate in action.

`mermaid
sequenceDiagram
participant User
participant Frontend as Next.js (H)
participant Backend as FastAPI (P)
participant Database as PostgreSQL (D)

    User->>Frontend: Fills meeting details & Agenda
    Frontend->>Backend: POST /api/meetings/

    Note over Backend: Process Gate: Validates agenda length > 20 chars

    alt Agenda is Invalid
        Backend-->>Frontend: 400 Bad Request (Missing Agenda)
        Frontend-->>User: Displays Validation Error
    else Agenda is Valid
        Backend->>Database: INSERT into meetings
        Database-->>Backend: Success
        Backend-->>Frontend: 201 Created (Meeting ID)
        Frontend-->>User: Redirects to Meeting Dashboard
    end

`

### LiveKit WebRTC & Intelligence Pipeline

Demonstrating the **Intelligence (I)** pipeline.

`mermaid
sequenceDiagram
participant User
participant Frontend as Next.js (H)
participant LiveKit as LiveKit Server
participant AI as AI Worker (Whisper/Llama)
participant Backend as FastAPI (P)

    User->>Frontend: Joins Meeting Room
    Frontend->>Backend: GET /api/meetings/{id}/token
    Backend-->>Frontend: Returns JWT Token

    Frontend->>LiveKit: Connects to Room (WebRTC)
    LiveKit->>AI: Agent joins & subscribes to audio tracks

    Note over AI: Real-time Audio Processing

    AI->>AI: Whisper: Audio to Text

    User->>Frontend: Ends Meeting
    Frontend->>LiveKit: Disconnects
    LiveKit->>AI: Room closed event

    AI->>AI: Llama-3: Summarize Transcript
    AI->>Backend: POST /api/meetings/{id}/summary
    Backend-->>AI: 200 OK

`

---

## 3. Technology Rationale & Design Decisions (ADRs)

### ADR 1: Why Next.js (App Router) + Tailwind CSS?

- **Speed & SEO:** Server Components provide excellent load times and SEO optimization.
- **Ecosystem:** Shadcn UI and Tailwind allow rapid prototyping of high-quality B2B interfaces without massive CSS overhead.
- **Security:** Static site generation and server-side logic minimize client-side attack vectors.

### ADR 2: Why FastAPI + Pydantic?

- **Performance:** Asynchronous capabilities natively built-in.
- **Type Safety:** Pydantic V2 ensures that data entering the system is strictly validated, which is essential for the Process (P) layer.
- **Ecosystem integration:** Python is the undisputed king of AI. Using FastAPI allows seamless integration with LiveKit's Python Server SDK and AI models (Whisper/Llama).

### ADR 3: Why LiveKit instead of Jitsi/Twilio?

- **Data Sovereignty:** LiveKit can be easily self-hosted, ensuring voice/video streams never touch a third-party cloud.
- **AI Readiness:** LiveKit Agents (written in Python/Go) provide incredible infrastructure for real-time STT and LLM processing directly on the audio streams.
- **Modern WebRTC:** Superior SFU (Selective Forwarding Unit) architecture compared to legacy solutions.
