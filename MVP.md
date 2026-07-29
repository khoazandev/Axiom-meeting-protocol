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
  - Native integration with LiveKit Components for seamless, secure WebRTC video calling within the browser without requiring external application installations.

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

## 🏆 3. OLP 2026 Judging Criteria Alignment (10/10 Path)

To win the first prize at the Olympics, Axiom must strictly satisfy the official OLP 2026 Hackathon rules:

1. **Open Source Quality (Kho mã nguồn mở):** 
   - All source code is hosted on an open repository (GitHub) adhering to standard Open Source compliance (MIT License, clean commit history, Issue/PR templates).
   - Code formatting and linting strictness (Prettier, CI/CD).
2. **DX-OS Theme Relevance:** The concept of an "Agenda Gate" and an On-Premise AI workflow showcases deep understanding of the "Digital Enterprise Operating System (DX-OS)" theme.
3. **Live Demonstration (Trình diễn trực tiếp):** The MVP must work end-to-end flawlessly on a local machine for the final presentation, proving the feasibility of the H-P-D-I architecture.
4. **Professionalism:** Monorepo architecture, comprehensive documentation (README, ARCHITECTURE, DEPLOYMENT), and high-end B2B UI/UX.
