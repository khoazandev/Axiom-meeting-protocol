# Axiom Product Requirements Document (MVP)

This document outlines the Minimum Viable Product (MVP) requirements for Axiom: The Enterprise Meeting Protocol.

---

## 1. Problem Statement

Corporate meetings are often unstructured, lack clear objectives, and generate untracked action items. Companies waste thousands of hours annually on meetings that could have been an email, simply because there is no protocol enforcing meeting discipline. Furthermore, using public cloud services for sensitive strategic meetings poses a severe data privacy risk.

**Axiom solves this by:**

1. Forcing discipline via strict process gates (e.g., Mandatory Agendas).
2. Hosting everything On-Premise via self-hosted WebRTC (LiveKit).
3. Automating post-meeting busywork (transcription and summaries) via Local AI (Whisper + Llama).

---

## 2. User Personas

1. **The Organizer (Manager/Lead):** Needs to schedule structured meetings, ensure participants know the agenda, and easily extract action items afterward.
2. **The Participant (Employee):** Needs a seamless, distraction-free interface to join the meeting, without downloading third-party applications.
3. **The IT Admin:** Needs to deploy the solution entirely within the company's VPC (Virtual Private Cloud) to guarantee absolute data security.

---

## 3. Core Requirements (In Scope for MVP)

### Phase 1: Core Discipline Protocol (Foundation)

- **Feature:** A dashboard listing active and upcoming meetings.
- **Feature:** "Create Meeting" process gate.
  - _Requirement:_ Users MUST enter a detailed Agenda (>20 characters) to create a meeting.
  - _Validation:_ Enforced strongly on the Backend (FastAPI).
- **Architecture:** SQLite database for rapid local development.

### Phase 2: WebRTC Integration (The Room)

- **Feature:** Real-time Video/Audio conference interface inside the browser.
- **Technology:** Integration with LiveKit Server.
- **UI:** Minimalist meeting room highlighting the validated Agenda on the sidebar.

### Phase 3: AI Intelligence Pipeline (The Brain)

- **Feature:** Automated Transcription.
  - _Technology:_ LiveKit AI Agents streaming audio to Local Whisper model.
- **Feature:** Automated Summarization.
  - _Technology:_ Passing the final transcript to LLaMA-3 (via Ollama) to generate a summary and action items.

---

## 4. Out of Scope (For MVP)

- Complex user roles (Admin vs Regular User). MVP will assume all logged-in users have standard permissions.
- Calendar integrations (Google Calendar, Outlook).
- Screen sharing annotations (Screen sharing itself is supported by LiveKit, but drawing/annotating is out of scope).
- Email notifications.

---

## 5. Success Metrics

- **Zero Data Leakage:** Can the entire system (Frontend, Backend, WebRTC, AI) run on a disconnected local network?
- **Discipline Enforcement:** Does the system successfully block 100% of attempts to create a meeting without a valid agenda?
- **Reliability:** Do backend API tests (pytest) cover >90% of the core business logic?

---

## 6. Quality Standard & Evaluation Targets

To ensure Axiom maintains world-class Open Source standards, its development aligns with the strict evaluation criteria typical of top-tier Open Source Software competitions (such as the VFOSSA OLP PMNM):

1. **Creativity & Practicality:** The solution must directly solve real-world enterprise pain points (wasted meeting hours and data privacy risks) with a unique architectural approach (DX-OS Process Gates).
2. **Open Source Tech Stack:** 100% reliance on Open Source technologies (FastAPI, Next.js, LiveKit, Whisper, LLaMA) with no vendor lock-in.
3. **Architecture & Deployment:** The H-P-D-I architecture must be clearly documented. The deployment model must support fully isolated On-Premise environments (Dockerized).
4. **Project Management & Discipline:**
   - Strict adherence to TDD (superpowers_tdd.md).
   - High-quality B2B UI/UX design ( asteskill.md).
   - Clean git history with Conventional Commits.
5. **Community Contribution:** High-quality Markdown documentation (README, CONTRIBUTING, ARCHITECTURE, DEPLOYMENT) making it effortless for new developers to onboard and contribute.
