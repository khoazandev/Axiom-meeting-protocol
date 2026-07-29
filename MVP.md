# Minimum Viable Product (MVP) - Axiom (DX-OS)

**Competition Project:** 2026 Open Source Software Olympics
**Topic:** Digital Enterprise Operating System (DX-OS)
**Product Category:** Smart Meeting AI (Core internal communication system for enterprises).

---

## 🎯 1. Core Goal (The "Why")

Solve the problem of fragmented and inefficient internal enterprise meetings. Axiom acts as an integrated operating system specifically for meetings, forcing users to comply with organizational discipline (having clear agendas), while keeping data 100% on-premise for absolute security, and utilizing AI to minimize post-meeting reporting tasks.

## 🧱 2. MVP Scope (H-P-D-I Architecture)

### 🧑‍💻 H (Human - Interface Layer)

- **Design Standard:** B2B Enterprise SaaS (Taste Skill UI guidelines).
- **Core Feature:**
  - Modern, minimalist meeting dashboard.
  - Native integration with Jitsi Meet for seamless, secure video calling within the browser without requiring external application installations.

### ⚙️ P (Process - Business Logic & Discipline)

- **Agenda Gate:** A strict protocol that prevents the creation of a meeting room if the user fails to provide a detailed agenda (minimum 20 characters).
- **Quality Assurance:** Ensured via TDD (Test-Driven Development) methodology.

### 🔒 D (Data - Storage & Sovereignty)

- **Data Sovereignty:** Uses SQLite for MVP (easily scalable to PostgreSQL). All data is stored locally within the enterprise's server, completely decoupled from public clouds.
- **Data Schema:** Robust schema tracking meetings, transcripts, and action items.

### 🧠 I (Intelligence - AI Layer) _[Upcoming Phase 3]_

- **Audio Transcription:** Offline voice-to-text processing (Whisper).
- **Summarization & Action Items:** Post-meeting automated summarization (LLaMA-3).

---

## 🏆 3. Evaluation Criteria (10/10 Path)

To win the first prize at the Olympics, Axiom must demonstrate:

1. **Feasibility:** Must work end-to-end flawlessly on a local machine.
2. **Discipline:** Must strictly follow TDD and UI/UX TasteSkill guidelines.
3. **Breakthrough:** The concept of an "Agenda Gate" and an On-Premise AI workflow showcases deep understanding of Enterprise needs (DX-OS).
4. **Professionalism:** Monorepo architecture imitating the 2025 champion's repository structure.
