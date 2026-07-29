# Contributing Guidelines

This project was built with the goal of competing in the **2026 Open Source Software Olympics**. Therefore, the codebase must meet the highest industry standards. Any engineer joining this project **must strictly adhere** to the following two rule sets:

## 1. Test-Driven Development (Superpowers TDD)

We do not accept backend code without tests. Please strictly follow the **Red-Green-Refactor** cycle:

1. **Red:** Write a test for the feature you want to build before writing the actual code. Run the test and watch it fail (Red).
2. **Green:** Write the shortest, simplest code possible just to make that test pass (Green).
3. **Refactor:** Optimize the code you just wrote to make it clean, while ensuring the test continues to pass.

**Run tests via just:**

```bash
just backend-test
```

## 2. Design Discipline (Taste Skill)

The frontend interface must not be coded carelessly. This project serves B2B Enterprise clients, therefore:

- **Absolutely DO NOT use:** Default AI colors (e.g., flashy purples, excessive gradients) or sloppy layout structures.
- **MANDATORY to use:**
  - Typography: **Geist** (Geist Sans).
  - Primary Accent Color: **Electric Blue** (`oklch(0.546 0.245 262.881)`).
  - Use **Shadcn UI** components instead of writing custom CSS (unless absolutely necessary).
  - Maintain clear Whitespace and use subtle borders (`border-border/40`).
- Empty states must have clear explanations and Call-to-Action buttons.

## 3. Pull Request (PR) Process

- Frontend and Backend code should be separated cleanly; do not bundle them into a single commit unless it is a documentation change.
- Write clear commit messages: `[Frontend] Add create meeting button` or `[Backend] Add meeting update API`.
- **Pre-commit hooks** (`husky`, `lint-staged`) will automatically format your code when you commit. Do not bypass them.
