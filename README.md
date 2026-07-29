<div align="center">
  <img src="src/frontend/public/hero_dashboard.jpg" alt="Axiom Hero" width="800" style="border-radius: 12px;"/>

  <br />
  <br />

  # ⚡ Axiom: Enterprise Meeting Protocol

  **Digital Enterprise Operating System (DX-OS) - High Security On-Premise Meeting Protocol** <br />
  *Developed for the 2026 Open Source Software Olympics*

  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Frontend](https://img.shields.io/badge/Frontend-Next.js_14-black?logo=next.js)](https://nextjs.org/)
  [![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Design](https://img.shields.io/badge/Design-TasteSkill-2563eb)](https://tasteskill.dev)
  [![Status](https://img.shields.io/badge/Status-Active_Development-success)]()

</div>

---

## 📖 Introduction

**Axiom** is not just another video calling application. It is a **Digital Enterprise Operating System (DX-OS)** designed around the **H-P-D-I** 4-layer architecture:

- 🧑‍💻 **H (Human):** A focused, distraction-free interface. Native Jitsi Meet integration.
- ⚙️ **P (Process):** Process gates that enforce discipline (e.g., forcing a detailed agenda before allowing a meeting).
- 🔒 **D (Data):** On-Premise database ensuring absolute data sovereignty for enterprises.
- 🧠 **I (Intelligence):** Real-time audio transcription via Whisper & meeting summarization via Llama-3.

## ✨ Key Features

- **Agenda Gate:** Enforces clear, transparent meeting agendas (strictly validated by Backend).
- **Jitsi Native IFrame:** Browser-based video calling with self-hosted infrastructure readiness.
- **Taste Skill Design:** B2B Enterprise SaaS aesthetic with Electric Blue accents and premium Geist typography.
- **TDD Workflow:** Hyper-disciplined Test-Driven Development (Red-Green-Refactor) ensuring 99.9% API reliability.

---

## 📂 Standard Monorepo Structure

```text
📦 Axiom_Meeting_Protocol
 ┣ 📂 src
 ┃ ┣ 📂 backend               # Backend API (Python / FastAPI)
 ┃ ┃ ┣ 📜 main.py             # Entry point & API Routes
 ┃ ┃ ┣ 📜 models.py           # SQLAlchemy Models (Database schema)
 ┃ ┃ ┣ 📜 database.py         # SQLite/PostgreSQL connection setup
 ┃ ┃ ┗ 📜 test_main.py        # TDD Test Suite (Pytest)
 ┃ ┗ 📂 frontend              # Frontend Web (Next.js 14 / React 19)
 ┃   ┣ 📂 public              # Static assets (Images, Icons)
 ┃   ┣ 📂 src
 ┃   ┃ ┣ 📂 app               # Next.js App Router
 ┃   ┃ ┃ ┣ 📂 meetings        # Meeting Dashboard
 ┃   ┃ ┃ ┣ 📜 layout.tsx      # Base layout (Geist font, Metadata)
 ┃   ┃ ┃ ┣ 📜 page.tsx        # Landing Page
 ┃   ┃ ┃ ┗ 📜 globals.css     # TasteSkill standard colors
 ┃   ┃ ┣ 📂 components        # React Components (Shadcn UI)
 ┃   ┃ ┗ 📂 lib               # Utils
 ┃   ┣ 📜 tailwind.config.ts  # Tailwind CSS configuration
 ┃   ┗ 📜 package.json        # Frontend Dependencies
 ┣ 📂 docs                    # Technical Documentation
 ┃ ┣ 📜 ARCHITECTURE.md       # Detailed H-P-D-I Architecture
 ┃ ┣ 📜 CONTRIBUTING.md       # Contribution Guidelines (TDD & TasteSkill)
 ┃ ┗ 📜 DEPLOYMENT.md         # Deployment Guide (Dev & Prod)
 ┣ 📜 pyproject.toml          # Python dependencies (managed by uv)
 ┣ 📜 package.json            # Root dependencies (Husky, Prettier, Lint-staged)
 ┣ 📜 .justfile               # Automation scripts (Task runner)
 ┣ 📜 .pre-commit-config.yaml # Git hooks configuration
 ┣ 📜 MVP.md                  # Minimum Viable Product Scope Definition
 ┗ 📜 README.md               # Project Overview (You are reading this)
```

---

## 🚀 Quick Start (Local Development)

Please refer to the detailed guide in [DEPLOYMENT.md](./docs/DEPLOYMENT.md).

```bash
# 1. Install all dependencies (Frontend, Backend via uv, and git hooks)
just install

# 2. Run Database/Services (if Docker is configured)
# just dev

# 3. Start Backend Server (runs on localhost:8000)
just backend-dev

# 4. Start Frontend Server (runs on localhost:3000)
# In a new terminal:
just frontend-dev
```

---

## 📚 Documentation
- [System Architecture (ARCHITECTURE.md)](./docs/ARCHITECTURE.md)
- [Contributing Guidelines (CONTRIBUTING.md)](./docs/CONTRIBUTING.md)
- [Project Scope (MVP.md)](./MVP.md)

<div align="center">
  <br/>
  <i>Built with 🩵 for the 2026 Open Source Software Olympics. Resilient. Secure. Disciplined.</i>
</div>
