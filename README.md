<div align="center">
  <img src="src/frontend/public/logo.jpg" alt="Axiom Logo" width="120" style="border-radius: 20px;"/>
  <br/>
  <h1>⚡ Axiom: Enterprise Meeting Protocol</h1>

**Digital Enterprise Operating System (DX-OS)** <br />
_A High Security On-Premise Meeting Protocol for the Modern Enterprise_

  <br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_14-black?logo=next.js)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![LiveKit](https://img.shields.io/badge/WebRTC-LiveKit-ff4081)](https://livekit.io/)
[![Design](https://img.shields.io/badge/Design-TasteSkill-2563eb)](https://tasteskill.dev)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
</div>

---

## 📖 Introduction

**Axiom** is designed as a **"Digital Enterprise Operating System (DX-OS)"**. It is an open-source Enterprise Meeting Protocol designed around the **H-P-D-I** architecture. Axiom solves the problem of fragmented and inefficient internal enterprise meetings by forcing users to comply with organizational discipline (e.g., having clear agendas), keeping data 100% on-premise for absolute security, and utilizing AI to minimize post-meeting reporting tasks.

- 🧑‍💻 **H (Human):** A focused, distraction-free interface. Native LiveKit WebRTC integration.
- ⚙️ **P (Process):** Process gates that enforce discipline (e.g., forcing a detailed agenda before allowing a meeting).
- 🔒 **D (Data):** On-Premise database ensuring absolute data sovereignty for enterprises.
- 🧠 **I (Intelligence):** Ready for real-time audio transcription (Whisper) & meeting summarization (Llama-3).

---

## ✨ Key Features

- **🚀 LiveKit WebRTC:** Browser-based, high-performance video calling powered by LiveKit Server, optimized for real-time AI agents. No external software required.
- **🛡️ Agenda Gate (Discipline Protocol):** Enforces clear, transparent meeting agendas. You cannot create a meeting without a detailed >20-character agenda strictly validated by the Backend.
- **🎨 Premium B2B Aesthetic:** World-class UI/UX following Taste Skill guidelines. High contrast, minimalist layouts, Electric Blue accents, and premium typography (Geist, Outfit).
- **🔐 Absolute Data Sovereignty:** Run it in your own VPC. SQLite (Dev) and PostgreSQL (Prod) support keeps meeting metadata and transcriptions 100% internal.
- **🧪 TDD Tested:** Hyper-disciplined Test-Driven Development (Red-Green-Refactor) ensuring highly reliable APIs.

---

## 🛠️ Technology Stack

| Category            | Technology                                                  | Purpose                                                          |
| :------------------ | :---------------------------------------------------------- | :--------------------------------------------------------------- |
| **Frontend**        | [Next.js 16](https://nextjs.org/) / React 19                | Server-side rendering, routing, static UI delivery.              |
| **Styling**         | [Tailwind CSS v4](https://tailwindcss.com/) / Shadcn UI     | Utility-first rapid styling and accessible component primitives. |
| **Backend**         | [FastAPI](https://fastapi.tiangolo.com/)                    | High performance async Python API, Pydantic validation.          |
| **Real-time Comms** | [LiveKit](https://livekit.io/)                              | Enterprise WebRTC infrastructure.                                |
| **Database**        | [SQLAlchemy](https://www.sqlalchemy.org/) / SQLite          | Relational ORM for strictly-typed data modeling.                 |
| **Package Manager** | [uv](https://github.com/astral-sh/uv) (Python) / npm (Node) | Extremely fast, reliable dependency resolution.                  |

---

## 🚀 Quick Start (Local Development)

Getting Axiom running locally requires Node.js (v20+), Python (v3.12+), and uv. For detailed production deployment, refer to [DEPLOYMENT.md](./docs/DEPLOYMENT.md).

### 1. Clone & Install

`ash
git clone https://github.com/khoazandev/Axiom-meeting-protocol.git
cd Axiom-meeting-protocol

# Install Frontend dependencies

npm ci

# Install Backend dependencies (using uv)

uv sync --all-extras
`

### 2. Configure Environment

We provide .env.example files to make setup seamless.

**Backend (src/backend/.env):**
`env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
`

**Frontend (src/frontend/.env.local):**
`env
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
`

### 3. Start the Servers

You will need two terminal windows.

**Terminal 1 (Backend):**
`ash
cd src/backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
`

**Terminal 2 (Frontend):**
`ash
cd src/frontend
npm run dev
`

Visit http://localhost:3000 to interact with the Axiom DX-OS interface.

---

## 🏆 Open Source Compliance & Standards

Axiom adheres to the highest Open Source software standards:

- ✅ **Fully Open Source**: Published under the MIT License.
- ✅ **Standardized Documentation**: Comprehensive .md files covering architecture, deployment, and contribution guidelines.
- ✅ **Clean Code**: High-quality, formatted code via Prettier, ESLint, and strict typing.
- ✅ **CI/CD & Git Workflow**: Automated testing and formatting checks via GitHub Actions.

## 📚 Documentation Reference

For a deeper dive into the technical details and how to contribute to Axiom, please refer to our internal documentation:

- 🏛️ **[System Architecture (H-P-D-I)](./docs/ARCHITECTURE.md)**: Detailed system flow, Mermaid diagrams, and design decisions.
- 🤝 **[Contributing Guidelines](./docs/CONTRIBUTING.md)**: How to submit Pull Requests, TDD standards, and UI guidelines.
- 📦 **[Deployment Guide](./docs/DEPLOYMENT.md)**: Production deployment instructions (Docker, LiveKit Cloud vs Self-Hosted).
- 🎯 **[Product Requirements (MVP)](./MVP.md)**: The core product vision, user personas, and success metrics.

---

<div align="center">
  <br/>
  <i>Built for resilience, security, and discipline.</i>
</div>
