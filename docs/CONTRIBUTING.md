# Contributing to Axiom

First off, thank you for considering contributing to Axiom! It's people like you that make Axiom a great Enterprise Meeting Protocol.

This project enforces strict standards to ensure the codebase remains maintainable, secure, and highly disciplined. Please read these guidelines carefully before submitting a Pull Request.

---

## 1. Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We expect all contributors to maintain a professional, respectful, and inclusive environment.

---

## 2. Core Development Philosophies

### Test-Driven Development (Superpowers TDD)

We do **not** accept backend code without tests. Please strictly follow the **Red-Green-Refactor** cycle:

1. **Red:** Write a failing test for the feature you want to build.
2. **Green:** Write the minimal code needed to make the test pass.
3. **Refactor:** Optimize the code to make it clean, while ensuring the test continues to pass.

### Design Discipline (Taste Skill)

The frontend interface must maintain a premium B2B Enterprise aesthetic.

- **DO NOT use:** Flashy colors, sloppy padding/margins, or generic UI layouts.
- **MUST use:** Geist typography, Electric Blue (#2563eb) accents, and **Shadcn UI** components.
- Ensure all empty states have clear, concise Call-to-Action buttons.

---

## 3. Getting Started

### Local Environment Setup

Axiom requires Node.js (v20+) and uv (for Python dependency management).

1. **Fork & Clone:**
   `ash
git clone https://github.com/YOUR_USERNAME/Axiom-meeting-protocol.git
cd Axiom-meeting-protocol
`
2. **Install Hooks & Dependencies:**
   We use just as a command runner.
   `ash
just install
`
3. **Environment Variables:**
   Copy .env.example to .env in both src/backend and src/frontend and configure your local LiveKit details.

---

## 4. Git & Branching Strategy

We follow a simplified Git Flow.

- main - Stable production code.
- develop - Active development branch.

### Branch Naming Convention

- Feature: eat/short-description (e.g., eat/agenda-validation)
- Bugfix: ugfix/short-description (e.g., ugfix/livekit-token-error)
- Docs: docs/short-description

### Commit Message Convention (Conventional Commits)

We strictly enforce Conventional Commits. Commits must be formatted as:
<type>[optional scope]: <description>

Examples:

- eat(api): add meeting token generation endpoint
- ix(ui): correct spacing on dashboard cards
- chore: update dependencies

**Pre-commit Hooks:** Husky and lint-staged will automatically format your code (prettier, eslint) before committing. Do not bypass them (--no-verify).

---

## 5. Pull Request (PR) Process

1. **Keep it focused:** Frontend and Backend code should generally be separated into logical, reviewable PRs unless they are tightly coupled full-stack features.
2. **Pass the CI:** Your PR will trigger GitHub Actions to run pytest and prettier. It will not be merged if tests fail.
3. **Template:** Fill out the PR template completely. Clearly state _what_ changed and _why_.
4. **Review:** A maintainer will review your code. Be open to feedback!
