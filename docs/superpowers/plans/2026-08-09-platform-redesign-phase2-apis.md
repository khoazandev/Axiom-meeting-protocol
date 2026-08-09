# Platform Redesign — Phase 2: Organization & Department APIs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 
> **TDD Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

**Goal:** Build Organization CRUD, Department CRUD, membership management, and org invitation flow APIs.

**Architecture:** RESTful endpoints under `/api/v1/organizations/` and `/api/v1/departments/`. Permission checks via `require_permission()` dependency. Pydantic v2 schemas for request/response validation.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy, Pydantic v2, pytest, TestClient

## Global Constraints

- All responses use `model_config = {"from_attributes": True}`
- Permission checks via `require_permission("code")` from `deps.py`
- UUIDs for all IDs
- TDD: test first, verify fail, then implement

## Scope

| Task | Component |
|------|-----------|
| 1-2 | Schemas (Organization, Department, OrgMember, OrgInvitation) |
| 3-4 | Organization CRUD API |
| 5-6 | Department CRUD API |
| 7-8 | Organization Invitation API |
| 9-10 | Re-enable and update auth registration flow |
| 11 | Update router.py to include new routes |

---

### Task 1: RED — Schema Tests

### Task 2: GREEN — Schemas

### Task 3: RED — Organization API Tests

### Task 4: GREEN — Organization API

### Task 5: RED — Department API Tests

### Task 6: GREEN — Department API

### Task 7: RED — Org Invitation API Tests

### Task 8: GREEN — Org Invitation API

### Task 9-10: Auth flow update (org creation on register)

### Task 11: Router update + full integration test
