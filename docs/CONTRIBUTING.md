# Contributing to Axiom

First off, thank you for considering contributing to Axiom! It's people like you that make Axiom a great Enterprise Meeting Protocol.

This project enforces strict standards to ensure the codebase remains maintainable, secure, and highly disciplined. Please read these guidelines carefully before submitting a Pull Request.

---

## 1. Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](../CODE_OF_CONDUCT.md). We expect all contributors to maintain a professional, respectful, and inclusive environment.

---

## 2. Core Development Philosophies

### Test-Driven Development (Superpowers TDD)

We do **not** accept backend code without tests. Please strictly follow the **Red-Green-Refactor** cycle defined in [`superpowers_tdd.md`](../superpowers_tdd.md):

1. **Red:** Write a failing test for the feature you want to build.
2. **Green:** Write the minimal code needed to make the test pass.
3. **Refactor:** Optimize the code to make it clean, while ensuring the test continues to pass.

### Design Discipline

The frontend interface must maintain a premium B2B Enterprise aesthetic.

- **DO NOT use:** Flashy colors, sloppy padding/margins, or generic UI layouts.
- **MUST use:** Plus Jakarta Sans typography, Electric Blue accents, and **Shadcn UI** components.
- Ensure all empty states have clear, concise Call-to-Action buttons.

### Architecture Rules

- Backend code goes in the appropriate module: `core/`, `schemas/`, `api/v1/`, or `models.py`.
- **Never add business logic to `main.py`** — it is a slim app factory only.
- All API errors must use the structured format from `core/exceptions.py`.
- New API endpoints go under `api/v1/` with the `/api/v1/` prefix.
- Frontend API calls must use the centralized client at `src/frontend/src/lib/api.ts`.

---

## 3. Getting Started

### Prerequisites

- **Node.js** v20+
- **Python** v3.12+
- **uv** ([Fast Python package manager](https://github.com/astral-sh/uv))
- **Docker** (for LiveKit)

### Local Environment Setup

1. **Fork & Clone:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Axiom-meeting-protocol.git
   cd Axiom-meeting-protocol
   ```

2. **Install Dependencies:**
   ```bash
   # Backend (Python)
   uv sync --all-extras

   # Frontend (Node)
   cd src/frontend && npm ci && cd ../..
   ```

3. **Environment Variables:**

   Copy `.env.example` files and configure your local LiveKit details:
   ```bash
   # Backend
   cp src/backend/.env.example src/backend/.env

   # Frontend
   cp src/frontend/.env.example src/frontend/.env.local
   ```

4. **Run Database Migrations:**
   ```bash
   uv run alembic upgrade head
   ```

5. **Start the Servers:**
   ```bash
   # Terminal 1: Backend
   uv run uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000

   # Terminal 2: Frontend
   cd src/frontend && npm run dev
   ```

6. **Run Tests:**
   ```bash
   uv run pytest src/backend/test_main.py -v
   ```

---

## 4. Git & Branching Strategy

We follow a simplified Git Flow.

- `main` — Stable production code.
- `develop` — Active development branch.

### Branch Naming Convention

- Feature: `feat/short-description` (e.g., `feat/agenda-validation`)
- Bugfix: `bugfix/short-description` (e.g., `bugfix/livekit-token-error`)
- Docs: `docs/short-description`

### Commit Message Convention (Conventional Commits)

We strictly enforce [Conventional Commits](https://www.conventionalcommits.org/). Commits must be formatted as:

```
<type>[optional scope]: <description>
```

Examples:

- `feat(api): add meeting token generation endpoint`
- `fix(ui): correct spacing on dashboard cards`
- `refactor(backend): extract meetings router to api/v1`
- `chore: update dependencies`

**Pre-commit Hooks:** Husky and lint-staged will automatically format your code (prettier, eslint) before committing. Do not bypass them (`--no-verify`).

---

## 5. Pull Request (PR) Process

1. **Keep it focused:** Frontend and Backend code should generally be separated into logical, reviewable PRs unless they are tightly coupled full-stack features.
2. **Pass the CI:** Your PR will trigger GitHub Actions to run pytest and prettier. It will not be merged if tests fail.
3. **Template:** Fill out the PR template completely. Clearly state _what_ changed and _why_.
4. **Review:** A maintainer will review your code. Be open to feedback!

---

## 6. Project Documentation

All project documentation follows this structure:

| Document | Purpose |
|:---|:---|
| [`MASTER_PROJECT_PLAN.md`](../MASTER_PROJECT_PLAN.md) | Source of truth — roadmap, vision, standards |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture, diagrams, ADRs |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Local dev & production deployment |
| [`superpowers_tdd.md`](../superpowers_tdd.md) | TDD methodology rules |
| `CONTRIBUTING.md` | This file — how to contribute |
