# Recruitment Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng luồng tuyển dụng hoàn chỉnh từ lời mời ứng viên, assessment, interview, AI evaluation, HR Manager review đến Owner approval và onboarding.

**Architecture:** Recruitment là module độc lập, có `RecruitmentApplication` làm aggregate root và một workflow service duy nhất kiểm soát transition, permission, optimistic locking và audit. Candidate dùng session riêng, không dùng employee JWT; Meeting và Organization Invitation chỉ được truy cập qua các service hẹp ở ranh giới module.

**Tech Stack:** Python 3.10+, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, PyJWT, pytest, Next.js 16.2.12, React 19.2.4, TypeScript, Tailwind CSS 4, LiveKit.

**Spec:** `docs/superpowers/specs/2026-09-27-recruitment-pipeline-design.md`

## Global Constraints

- Không tạo role `HR`; HR Manager là một `MANAGER` có direct membership grant `recruitment.review`.
- `recruitment.approve` chỉ thuộc role `OWNER`, không tự động cấp cho `ADMIN`.
- Backend luôn kiểm tra Organization, Department, assignment và permission; frontend visibility không thay thế authorization.
- Candidate không được tạo thành User hoặc Organization Member trước khi Owner duyệt và onboarding hoàn tất.
- AI Evaluation phải có evidence, model/prompt/rubric version và không được tự tạo quyết định tuyển dụng.
- Interview phải yêu cầu consent trước khi ghi âm, tạo transcript hoặc chạy AI Evaluation.
- Mọi transition dùng optimistic locking; version cũ hoặc transition sai trả `409 Conflict`.
- Token tuyển dụng chỉ lưu SHA-256 hash; raw token chỉ xuất hiện lúc phát hành và trong email.
- Mọi frontend trigger có nội dung động phải khóa width, dùng `truncate` và `title` theo `AGENTS.md`.
- Sau mỗi thay đổi trong `src/frontend`, chạy `docker compose up -d --build frontend` tại repository root và báo người dùng refresh `http://localhost:3001`.

## File Map

### Backend domain and persistence

- Modify `src/backend/models.py`: enums và persistence models của recruitment, member permission grant, onboarding link.
- Create `src/backend/alembic/versions/c8f1a2b3d4e5_add_recruitment_pipeline.py`: recruitment schema, retention policy và indexes.
- Create `src/backend/schemas/recruitment.py`: request/response contracts; không chứa authorization hoặc transition logic.
- Modify `src/backend/seeds/seed_rbac.py`: seed permission idempotently và chỉ cấp quyền role-level đúng phạm vi.

### Backend services

- Create `src/backend/services/recruitment_permissions.py`: effective permission, owner check, department/assignment scope.
- Create `src/backend/services/recruitment_workflow.py`: state machine, optimistic locking và audit.
- Create `src/backend/services/candidate_auth.py`: token hashing, invitation exchange và candidate JWT.
- Create `src/backend/services/assessment_service.py`: snapshot definition và submission.
- Create `src/backend/services/interview_service.py`: Meeting link, consent và LiveKit guest access.
- Create `src/backend/services/candidate_evaluator.py`: evaluator protocol, LLM adapter và persisted evidence report.
- Create `src/backend/services/recruitment_retention.py`: redact dữ liệu nhạy cảm đã quá retention window.
- Create `src/backend/services/onboarding_service.py`: idempotent Organization Invitation và completion link.

### Backend API

- Modify `src/backend/api/deps.py`: strict authentication và direct permission grants.
- Create `src/backend/api/v1/recruitment.py`: Owner/HR organization-scoped API.
- Create `src/backend/api/v1/candidate_recruitment.py`: candidate-session API.
- Modify `src/backend/api/v1/org_invitations.py`: secure onboarding token lookup và mark application `HIRED`.
- Modify `src/backend/api/v1/router.py`: register both routers.
- Create `src/backend/alembic/versions/d9e2f3a4b5c6_secure_onboarding_invitations.py`: hash existing onboarding tokens và thêm idempotent recruitment link.

### Backend tests

- Create `src/backend/tests/recruitment_fixtures.py`: deterministic organization/role/member/department factories.
- Create `src/backend/tests/test_recruitment_permissions.py`.
- Create `src/backend/tests/test_recruitment_workflow.py`.
- Create `src/backend/tests/test_recruitment_api.py`.
- Create `src/backend/tests/test_candidate_assessment.py`.
- Create `src/backend/tests/test_recruitment_interview.py`.
- Create `src/backend/tests/test_candidate_evaluator.py`.
- Create `src/backend/tests/test_recruitment_retention.py`.
- Create `src/backend/tests/test_recruitment_onboarding.py`.
- Create `src/backend/tests/test_recruitment_e2e.py`.

### Frontend

- Create `src/frontend/src/lib/recruitment-api.ts`: domain types and API calls.
- Create `src/frontend/src/components/admin/RecruitmentTab.tsx`: Owner pipeline and approval workspace.
- Modify `src/frontend/src/components/admin/CurlyBracketSidebar.tsx` and `src/frontend/src/app/admin/page.tsx`: expose Owner recruitment navigation through the components actually used by the route.
- Create `src/frontend/src/components/manager/ManagerRecruitmentTab.tsx`: assigned-candidate review workspace.
- Modify `src/frontend/src/components/manager/ManagerCurlyBracketSidebar.tsx` and `src/frontend/src/app/manager/page.tsx`: permission-gated Manager navigation.
- Create `src/frontend/src/app/(candidate)/candidate/layout.tsx`.
- Create `src/frontend/src/app/(candidate)/candidate/invite/[token]/page.tsx`.
- Create `src/frontend/src/app/(candidate)/candidate/applications/page.tsx`.
- Create `src/frontend/src/app/(candidate)/candidate/assessments/[attemptId]/page.tsx`.
- Create `src/frontend/src/app/(candidate)/candidate/interviews/[sessionId]/page.tsx`.

---

### Task 1: Effective permissions and strict organization membership

**Files:**

- Modify: `src/backend/models.py`
- Modify: `src/backend/api/deps.py`
- Modify: `src/backend/seeds/seed_rbac.py`
- Modify: `src/backend/conftest.py`
- Create: `src/backend/services/recruitment_permissions.py`
- Create: `src/backend/tests/recruitment_fixtures.py`
- Create: `src/backend/tests/test_recruitment_permissions.py`

**Interfaces:**

- Produces: `has_effective_permission(db, member, permission_code) -> bool`.
- Produces: `load_active_org_member(db, organization_id, user_id) -> OrganizationMember`.
- Produces: `require_active_org_member(...) -> OrganizationMember`.
- Produces: `assert_recruitment_reviewer(db, member, application) -> None`.
- Produces: `OrganizationMemberPermission(member_id, permission_id, granted_by_id)`.

- [ ] **Step 1: Add failing permission tests**

```python
def test_direct_review_grant_applies_only_to_selected_manager(db_session, recruitment_org):
    selected, other, permission = recruitment_org.selected_manager, recruitment_org.other_manager, recruitment_org.review_permission
    db_session.add(models.OrganizationMemberPermission(
        member_id=selected.id,
        permission_id=permission.id,
        granted_by_id=recruitment_org.owner.user_id,
    ))
    db_session.commit()

    assert has_effective_permission(db_session, selected, "recruitment.review") is True
    assert has_effective_permission(db_session, other, "recruitment.review") is False


def test_inactive_membership_is_rejected(db_session, recruitment_org):
    recruitment_org.selected_manager.status = models.OrgMemberStatusEnum.SUSPENDED
    db_session.commit()
    with pytest.raises(ForbiddenException):
        load_active_org_member(
            db_session,
            recruitment_org.organization.id,
            recruitment_org.selected_manager.user_id,
        )
```

- [ ] **Step 2: Run the tests and verify the missing grant/dependency failure**

Run: `uv run pytest src/backend/tests/test_recruitment_permissions.py -q`

Expected: collection or assertion failure because `OrganizationMemberPermission` and effective permission helpers do not exist.

- [ ] **Step 3: Add the member-level grant model and effective permission query**

```python
class OrganizationMemberPermission(database.Base):
    __tablename__ = "organization_member_permissions"
    __table_args__ = (UniqueConstraint("member_id", "permission_id"),)

    member_id = Column(String, ForeignKey("organization_members.id"), primary_key=True)
    permission_id = Column(String, ForeignKey("permissions.id"), primary_key=True)
    granted_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
```

```python
def has_effective_permission(db: Session, member: OrganizationMember, code: str) -> bool:
    role_grant = (
        db.query(RolePermission)
        .join(Permission, Permission.id == RolePermission.permission_id)
        .filter(RolePermission.role_id == member.role_id, Permission.code == code)
        .first()
    )
    direct_grant = (
        db.query(OrganizationMemberPermission)
        .join(Permission, Permission.id == OrganizationMemberPermission.permission_id)
        .filter(OrganizationMemberPermission.member_id == member.id, Permission.code == code)
        .first()
    )
    return bool(role_grant or direct_grant)
```

- [ ] **Step 4: Make organization dependencies fail closed**

`get_current_org_member` must raise authentication/forbidden errors instead of returning `None`, require `ACTIVE`, and verify a path `org_id` matches `X-Organization-ID` when both are present. `require_permission` must call `has_effective_permission` and return a non-optional member.

```python
if member is None:
    raise ForbiddenException("Active organization membership required")
if member.status != OrgMemberStatusEnum.ACTIVE:
    raise ForbiddenException("Organization membership is not active")
```

`get_current_user` must accept only JWT claims with `type == "access"`; refresh and future candidate tokens must not authenticate employee endpoints. Register fixture factories in `src/backend/conftest.py` with `pytest_plugins = ("src.backend.tests.recruitment_fixtures",)` and ensure dependency overrides are removed after every test.

- [ ] **Step 5: Seed recruitment permissions without granting review to every Manager**

Add `recruitment.manage`, `recruitment.review`, and `recruitment.approve` to `ALL_PERMISSIONS`. Add `manage` and `approve` explicitly to `OWNER`; do not add any recruitment permission to `MANAGER` or `ADMIN`. Replace the current early return when permissions exist with per-code upserts so existing installations receive new permissions.

- [ ] **Step 6: Run permission tests and the existing suite**

Run: `uv run pytest src/backend/tests/test_recruitment_permissions.py -q`

Expected: all permission tests pass.

Run: `uv run pytest src/backend/tests -q`

Expected: existing tests pass with no endpoint silently accepting a missing member.

- [ ] **Step 7: Commit the permission foundation**

```bash
git add src/backend/models.py src/backend/api/deps.py src/backend/seeds/seed_rbac.py src/backend/conftest.py src/backend/services/recruitment_permissions.py src/backend/tests/recruitment_fixtures.py src/backend/tests/test_recruitment_permissions.py
git commit -m "feat: add member-scoped recruitment permissions"
```

### Task 2: Recruitment persistence and migration

**Files:**

- Modify: `src/backend/models.py`
- Create: `src/backend/schemas/recruitment.py`
- Create: `src/backend/alembic/versions/c8f1a2b3d4e5_add_recruitment_pipeline.py`
- Create: `src/backend/tests/test_recruitment_models.py`

**Interfaces:**

- Produces: `RecruitmentApplication.stage`, `.version`, `.assigned_hr_member_id`.
- Produces: `RecruitmentAuditEvent` for append-only domain history.
- Produces: Pydantic enums and create/read contracts used by every later API task.

- [ ] **Step 1: Write model invariant tests**

```python
def test_one_active_application_per_candidate_and_opening(db_session, recruitment_org):
    first = make_application(db_session, recruitment_org)
    duplicate = models.RecruitmentApplication(
        organization_id=first.organization_id,
        opening_id=first.opening_id,
        candidate_id=first.candidate_id,
        assigned_hr_member_id=first.assigned_hr_member_id,
    )
    db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_candidate_is_not_a_user_or_member(db_session, recruitment_org):
    candidate = make_candidate(db_session, recruitment_org, email="candidate@axiom.test")
    assert db_session.query(models.User).filter_by(email=candidate.email).first() is None
    assert db_session.query(models.OrganizationMember).filter_by(organization_id=candidate.organization_id).count() == 0
```

- [ ] **Step 2: Run the model tests to establish red**

Run: `uv run pytest src/backend/tests/test_recruitment_models.py -q`

Expected: collection fails on missing recruitment models.

- [ ] **Step 3: Add enums and persistence models**

Add these enums with exact values:

```python
class RecruitmentStageEnum(str, enum.Enum):
    INVITED = "INVITED"
    ASSESSMENT_PENDING = "ASSESSMENT_PENDING"
    ASSESSMENT_SUBMITTED = "ASSESSMENT_SUBMITTED"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED"
    HR_REVIEW_PENDING = "HR_REVIEW_PENDING"
    OWNER_APPROVAL_PENDING = "OWNER_APPROVAL_PENDING"
    APPROVED = "APPROVED"
    ONBOARDING_INVITED = "ONBOARDING_INVITED"
    HIRED = "HIRED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
```

Create `JobOpening`, `Candidate`, `RecruitmentApplication`, `RecruitmentAuditEvent`, `RecruitmentInvitation`, `RecruitmentPolicy`, `AssessmentDefinition`, `AssessmentAttempt`, `InterviewSession`, `AIEvaluation`, `HRReview`, and `OwnerApproval`. `JobOpening` stores `requires_assessment`, competency rubric JSON and rubric version. Candidate stores nullable PII plus a stable `email_hash` and `redacted_at` so retention can anonymize completed records without breaking audit identity. `RecruitmentPolicy.retention_days` defaults to `180`; `RecruitmentApplication.terminal_at` is stamped on every terminal transition. Use `Text` for serialized JSON to preserve SQLite/PostgreSQL test parity. Add indexes on `(organization_id, stage)`, `(opening_id, stage)`, `token_hash`, and `meeting_id`; add uniqueness for `(opening_id, candidate_id)`, one policy per organization, one HR review, and one owner approval per application.

- [ ] **Step 4: Define request/response contracts**

At minimum define `JobOpeningCreate`, `JobOpeningResponse`, `ApplicationInviteCreate`, `ApplicationSummary`, `ApplicationDetail`, `AssessmentDefinitionCreate`, `AssessmentSubmit`, `InterviewScheduleCreate`, `ConsentUpdate`, `HRReviewCreate`, and `OwnerApprovalCreate`. Reject free-form decision values through `Literal` or Pydantic enums.

- [ ] **Step 5: Write the Alembic upgrade and downgrade**

Set `revision = "c8f1a2b3d4e5"` and `down_revision = "b72946c793f8"`. Create tables in foreign-key order and drop them in reverse order. The migration must also create `organization_member_permissions` from Task 1.

- [ ] **Step 6: Validate migration in an isolated SQLite database**

Run: `$env:DATABASE_URL='sqlite:///./scratch/recruitment_migration.db'; uv run alembic upgrade head; uv run alembic downgrade b72946c793f8; uv run alembic upgrade head`

Expected: all three commands exit zero and final head is `c8f1a2b3d4e5`.

- [ ] **Step 7: Run model tests and commit**

Run: `uv run pytest src/backend/tests/test_recruitment_models.py -q`

Expected: all model tests pass.

```bash
git add src/backend/models.py src/backend/schemas/recruitment.py src/backend/alembic/versions/c8f1a2b3d4e5_add_recruitment_pipeline.py src/backend/tests/test_recruitment_models.py
git commit -m "feat: add recruitment domain persistence"
```

### Task 3: Workflow state machine, audit, and optimistic locking

**Files:**

- Create: `src/backend/services/recruitment_workflow.py`
- Create: `src/backend/tests/test_recruitment_workflow.py`

**Interfaces:**

- Produces: `RecruitmentCommand(action, metadata)`.
- Produces: `RecruitmentWorkflow.advance(application_id, command, actor_member, expected_version) -> RecruitmentApplication`.
- Produces: `record_recruitment_event(db, application, action, actor_id, metadata) -> RecruitmentAuditEvent` for services that do not change stage.
- Consumes: models and permission helpers from Tasks 1–2.

- [ ] **Step 1: Add failing transition tests**

```python
def test_stale_version_returns_conflict(db_session, recruitment_org):
    application = make_application(db_session, recruitment_org, stage="INVITED", version=2)
    with pytest.raises(RecruitmentConflict):
        RecruitmentWorkflow(db_session).advance(
            application.id,
            RecruitmentCommand(action="START_ASSESSMENT", metadata={}),
            recruitment_org.owner,
            expected_version=1,
        )


def test_hr_hire_moves_to_owner_queue_and_writes_audit(db_session, recruitment_org):
    application = make_application(db_session, recruitment_org, stage="HR_REVIEW_PENDING")
    updated = RecruitmentWorkflow(db_session).advance(
        application.id,
        RecruitmentCommand(action="HR_HIRE", metadata={"reason": "Strong evidence"}),
        recruitment_org.selected_manager,
        expected_version=application.version,
    )
    assert updated.stage == models.RecruitmentStageEnum.OWNER_APPROVAL_PENDING
    assert updated.version == application.version + 1
    assert db_session.query(models.RecruitmentAuditEvent).filter_by(application_id=application.id, action="HR_HIRE").count() == 1
```

- [ ] **Step 2: Run workflow tests and verify red**

Run: `uv run pytest src/backend/tests/test_recruitment_workflow.py -q`

Expected: import failure for the workflow service.

- [ ] **Step 3: Implement an explicit transition map**

```python
TRANSITIONS = {
    (RecruitmentStageEnum.INVITED, "START_ASSESSMENT"): RecruitmentStageEnum.ASSESSMENT_PENDING,
    (RecruitmentStageEnum.INVITED, "SCHEDULE_INTERVIEW"): RecruitmentStageEnum.INTERVIEW_SCHEDULED,
    (RecruitmentStageEnum.ASSESSMENT_PENDING, "SUBMIT_ASSESSMENT"): RecruitmentStageEnum.ASSESSMENT_SUBMITTED,
    (RecruitmentStageEnum.ASSESSMENT_SUBMITTED, "SCHEDULE_INTERVIEW"): RecruitmentStageEnum.INTERVIEW_SCHEDULED,
    (RecruitmentStageEnum.INTERVIEW_SCHEDULED, "COMPLETE_INTERVIEW"): RecruitmentStageEnum.INTERVIEW_COMPLETED,
    (RecruitmentStageEnum.INTERVIEW_COMPLETED, "QUEUE_HR_REVIEW"): RecruitmentStageEnum.HR_REVIEW_PENDING,
    (RecruitmentStageEnum.HR_REVIEW_PENDING, "HR_HIRE"): RecruitmentStageEnum.OWNER_APPROVAL_PENDING,
    (RecruitmentStageEnum.HR_REVIEW_PENDING, "HR_NO_HIRE"): RecruitmentStageEnum.REJECTED,
    (RecruitmentStageEnum.OWNER_APPROVAL_PENDING, "OWNER_APPROVE"): RecruitmentStageEnum.APPROVED,
    (RecruitmentStageEnum.OWNER_APPROVAL_PENDING, "OWNER_REJECT"): RecruitmentStageEnum.REJECTED,
    (RecruitmentStageEnum.APPROVED, "ISSUE_ONBOARDING"): RecruitmentStageEnum.ONBOARDING_INVITED,
    (RecruitmentStageEnum.ONBOARDING_INVITED, "COMPLETE_ONBOARDING"): RecruitmentStageEnum.HIRED,
}
```

Implement conditional compare-and-update with both `id` and `version`; if `rowcount != 1`, rollback and raise `RecruitmentConflict`. Append audit in the same transaction. Model `NEEDS_MORE_EVIDENCE` as actions `REQUEST_ASSESSMENT` and `REQUEST_INTERVIEW` returning to the matching stage. Global terminal actions `WITHDRAW`, `EXPIRE`, and `CANCEL` must list allowed source stages explicitly.

- [ ] **Step 4: Cover invalid, terminal, and retry transitions**

Add parameterized tests for every map entry, every forbidden jump, all terminal stages, and stale versions. Verify invalid operations write no audit row.

- [ ] **Step 5: Run tests and commit**

Run: `uv run pytest src/backend/tests/test_recruitment_workflow.py -q`

Expected: all workflow tests pass.

```bash
git add src/backend/services/recruitment_workflow.py src/backend/tests/test_recruitment_workflow.py
git commit -m "feat: enforce recruitment workflow transitions"
```

### Task 4: Owner and HR Manager organization API

**Files:**

- Create: `src/backend/api/v1/recruitment.py`
- Modify: `src/backend/api/v1/router.py`
- Create: `src/backend/tests/test_recruitment_api.py`

**Interfaces:**

- Produces: organization-scoped opening, application, assignment, HR review and owner approval endpoints.
- Consumes: `RecruitmentWorkflow`, effective permissions, and schemas.

- [ ] **Step 1: Add API authorization tests**

```python
def test_manager_from_other_department_cannot_read_application(client, auth_as, recruitment_org):
    auth_as(recruitment_org.other_department_manager.user)
    response = client.get(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{recruitment_org.application.id}",
        headers={"X-Organization-ID": recruitment_org.organization.id},
    )
    assert response.status_code == 403


def test_assigned_hr_can_only_submit_review_for_current_stage(client, auth_as, recruitment_org):
    auth_as(recruitment_org.selected_manager.user)
    response = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{recruitment_org.application.id}/hr-review",
        headers={"X-Organization-ID": recruitment_org.organization.id},
        json={"decision": "HIRE", "reason": "Evidence meets rubric", "expected_version": 1},
    )
    assert response.status_code == 409
```

- [ ] **Step 2: Run API tests and verify routes are absent**

Run: `uv run pytest src/backend/tests/test_recruitment_api.py -q`

Expected: `404` responses until router registration exists.

- [ ] **Step 3: Implement tenant-first resource loaders**

Every query must filter `organization_id == org_id` before matching resource ID:

```python
def get_application_or_404(db: Session, org_id: str, application_id: str) -> RecruitmentApplication:
    application = db.query(RecruitmentApplication).filter(
        RecruitmentApplication.organization_id == org_id,
        RecruitmentApplication.id == application_id,
    ).first()
    if application is None:
        raise NotFoundException("Recruitment application")
    return application
```

- [ ] **Step 4: Implement Owner opening and assignment routes**

Create opening and application list/detail endpoints plus HR Manager reassignment. Candidate/Application creation is added with secure invitation delivery in Task 5. Validate the selected member has role `MANAGER`, direct `recruitment.review`, and a `DepartmentMember` row for the opening department.

Add Owner-only `PUT /organizations/{org_id}/recruitment/managers/{member_id}/review-grant` with body `{"enabled": true}`. Enabling upserts the direct membership grant; disabling deletes it and rejects the operation with `409` while that Manager still owns an active Job Opening or Application until Owner reassigns those records.

- [ ] **Step 5: Implement HR Review and Owner Approval routes**

Persist `HRReview`/`OwnerApproval` exactly once and invoke workflow actions in the same transaction. A repeated request with identical idempotency key returns the existing decision; a different second decision returns `409`.

- [ ] **Step 6: Expose effective permissions for navigation**

Add `GET /api/v1/organizations/{org_id}/recruitment/me` returning:

```json
{
  "role": "MANAGER",
  "permissions": ["recruitment.review"],
  "department_ids": ["department-id"]
}
```

Add Owner-only `GET` and `PUT /organizations/{org_id}/recruitment/policy`; accept `retention_days` in the inclusive range `30..730`.

- [ ] **Step 7: Run API tests and commit**

Run: `uv run pytest src/backend/tests/test_recruitment_api.py -q`

Expected: tenant, department, assignment, stage and idempotency cases all pass.

```bash
git add src/backend/api/v1/recruitment.py src/backend/api/v1/router.py src/backend/tests/test_recruitment_api.py
git commit -m "feat: add owner and hr recruitment api"
```

### Task 5: Candidate invitation session and assessment

**Files:**

- Modify: `src/backend/core/security.py`
- Modify: `src/backend/services/email_service.py`
- Create: `src/backend/services/candidate_auth.py`
- Create: `src/backend/services/assessment_service.py`
- Modify: `src/backend/api/v1/recruitment.py`
- Create: `src/backend/api/v1/candidate_recruitment.py`
- Modify: `src/backend/api/v1/router.py`
- Create: `src/backend/tests/test_candidate_assessment.py`

**Interfaces:**

- Produces: `hash_recruitment_token(raw_token) -> str`.
- Produces: `create_candidate_access_token(application_id, candidate_id, expires_delta) -> str` with `type="candidate"`.
- Produces: `get_current_candidate_application(...) -> RecruitmentApplication`.
- Produces: assessment assignment/read/submit endpoints.

- [ ] **Step 1: Add token isolation and snapshot tests**

```python
def test_raw_candidate_token_is_not_persisted(db_session, recruitment_invitation):
    assert recruitment_invitation.raw_token not in recruitment_invitation.record.token_hash
    assert recruitment_invitation.record.token_hash == hashlib.sha256(recruitment_invitation.raw_token.encode()).hexdigest()


def test_submitted_attempt_keeps_definition_snapshot(db_session, assessment_attempt):
    original = assessment_attempt.questions_snapshot
    assessment_attempt.definition.questions_json = json.dumps([{"id": "changed"}])
    db_session.commit()
    assert assessment_attempt.questions_snapshot == original
```

- [ ] **Step 2: Run assessment tests and verify red**

Run: `uv run pytest src/backend/tests/test_candidate_assessment.py -q`

Expected: missing candidate auth and assessment service failures.

- [ ] **Step 3: Implement candidate token exchange**

Generate 32 random bytes with `secrets.token_urlsafe(32)`, persist only SHA-256, and return the raw value exactly once. `POST /api/v1/recruitment/invitations/{token}/session` validates hash, expiry, revocation and use count, then returns a 30-minute candidate JWT whose claims are `sub=candidate_id`, `application_id`, and `type=candidate`.

Add `send_recruitment_invitation_email` using the existing email adapter. Persist delivery as `PENDING`, `SENT` or `FAILED` plus `delivery_attempts`; an SMTP failure leaves the application at `INVITED`, records `FAILED`, and allows an idempotent resend endpoint instead of claiming the email was sent.

Add Owner-only `POST /organizations/{org_id}/recruitment/applications` to create Candidate, Application and Recruitment Invitation in one transaction, then dispatch email after commit. Add `POST /applications/{application_id}/resend-invitation` with an idempotency key and rate limit metadata.

- [ ] **Step 4: Implement assessment snapshot and one-time submit**

```python
attempt = AssessmentAttempt(
    application_id=application.id,
    definition_id=definition.id,
    definition_version=definition.version,
    questions_snapshot=definition.questions_json,
    rubric_snapshot=definition.rubric_json,
    status=AssessmentAttemptStatusEnum.PENDING,
    expires_at=expires_at,
)
```

On submit, validate all required question IDs against the snapshot, reject expired or already-submitted attempts, store normalized answers JSON, stamp `submitted_at`, and advance with `SUBMIT_ASSESSMENT`.

Add Owner-only endpoints to create a versioned Assessment Definition for a Job Opening and assign an attempt to an Application. Reject assignment when `requires_assessment` is false; for those openings, scheduling the first interview uses the direct `INVITED -> INTERVIEW_SCHEDULED` transition.

- [ ] **Step 5: Implement candidate routes**

Add session exchange, `GET /applications/me`, assessment detail/submit and withdraw. Every resource lookup must include the application ID from the candidate JWT.

- [ ] **Step 6: Run tests and commit**

Run: `uv run pytest src/backend/tests/test_candidate_assessment.py -q`

Expected: raw-token, expiry, replay, cross-candidate access, snapshot and submission tests pass.

```bash
git add src/backend/core/security.py src/backend/services/email_service.py src/backend/services/candidate_auth.py src/backend/services/assessment_service.py src/backend/api/v1/recruitment.py src/backend/api/v1/candidate_recruitment.py src/backend/api/v1/router.py src/backend/tests/test_candidate_assessment.py
git commit -m "feat: add candidate assessment flow"
```

### Task 6: Interview scheduling, consent, and scoped guest access

**Files:**

- Create: `src/backend/services/interview_service.py`
- Modify: `src/backend/api/v1/recruitment.py`
- Modify: `src/backend/api/v1/candidate_recruitment.py`
- Create: `src/backend/tests/test_recruitment_interview.py`

**Interfaces:**

- Produces: `InterviewService.schedule(...) -> InterviewSession`.
- Produces: `InterviewService.record_consent(...) -> InterviewSession`.
- Produces: `InterviewService.issue_guest_access(...) -> GuestMeetingAccess`.
- Consumes: existing `Meeting` and LiveKit configuration.

- [ ] **Step 1: Add interview security tests**

```python
def test_guest_access_is_scoped_to_linked_meeting(candidate_client, interview_session):
    response = candidate_client.post(f"/api/v1/recruitment/interviews/{interview_session.id}/guest-access")
    assert response.status_code == 200
    claims = decode_livekit_token(response.json()["token"])
    assert claims["video"]["room"] == f"meeting-{interview_session.meeting_id}"
    assert claims["video"]["roomJoin"] is True


def test_ai_source_is_blocked_without_consent(db_session, interview_session):
    interview_session.consent_recording = False
    with pytest.raises(ForbiddenException):
        InterviewService(db_session).assert_ai_consent(interview_session.id)
```

- [ ] **Step 2: Run interview tests and verify red**

Run: `uv run pytest src/backend/tests/test_recruitment_interview.py -q`

Expected: missing InterviewService.

- [ ] **Step 3: Implement scheduling through existing Meeting**

Create Meeting with the same organization and department as the application, `meeting_type="RECRUITMENT_INTERVIEW"`, and one `InterviewSession` link. Reject interviewers who are not active members of the organization. Advance application with `SCHEDULE_INTERVIEW` in the same transaction.

- [ ] **Step 4: Implement explicit consent and completion**

Candidate consent payload contains `recording`, `transcription`, and `ai_evaluation`; store each boolean plus `consented_at`. Completion requires the linked meeting to be completed and advances `COMPLETE_INTERVIEW`, then `QUEUE_HR_REVIEW`.

- [ ] **Step 5: Generate short-lived candidate LiveKit access**

Use identity `candidate_{candidate_id}_{interview_session_id}`, room `meeting-{meeting_id}`, TTL 2 hours, and metadata containing only candidate display name, target language and interview session ID. Do not trigger organization-wide meeting queries.

- [ ] **Step 6: Run tests and commit**

Run: `uv run pytest src/backend/tests/test_recruitment_interview.py -q`

Expected: meeting scope, expiry, revocation, consent and completion tests pass.

```bash
git add src/backend/services/interview_service.py src/backend/api/v1/recruitment.py src/backend/api/v1/candidate_recruitment.py src/backend/tests/test_recruitment_interview.py
git commit -m "feat: link recruitment interviews to meetings"
```

### Task 7: Evidence-backed AI Evaluation

**Files:**

- Create: `src/backend/services/candidate_evaluator.py`
- Modify: `src/backend/api/v1/recruitment.py`
- Create: `src/backend/tests/test_candidate_evaluator.py`

**Interfaces:**

- Produces: `CandidateEvaluator` protocol with `evaluate(input: EvaluationInput) -> EvaluationResult`.
- Produces: `LLMCandidateEvaluator` adapter using `generate_json`.
- Produces: `get_candidate_evaluator() -> CandidateEvaluator` as an overridable FastAPI dependency.
- Produces: `EvaluationService.run(application_id, actor, evaluator) -> AIEvaluation`.

- [ ] **Step 1: Add evaluator contract tests with a fake adapter**

```python
class FakeEvaluator:
    async def evaluate(self, evaluation_input: EvaluationInput) -> EvaluationResult:
        return EvaluationResult(
            competencies=[CompetencyScore(name="Communication", score=4, confidence=0.82)],
            evidence=[Evidence(source_type="TRANSCRIPT", source_id="seg-1", quote="I validated the rollout", timestamp="00:04:12")],
            concerns=[],
            follow_up_questions=["How would you measure rollback risk?"],
            recommendation="PROCEED_TO_HUMAN_REVIEW",
        )
```

Assert the persisted evaluation stores model, prompt and rubric versions, evidence source IDs, and never changes application stage or creates `HRReview`.

- [ ] **Step 2: Run evaluator tests and verify red**

Run: `uv run pytest src/backend/tests/test_candidate_evaluator.py -q`

Expected: missing evaluator types and service.

- [ ] **Step 3: Implement strict input and output types**

Use dataclasses or Pydantic models for `EvaluationInput`, `CompetencyScore`, `Evidence`, and `EvaluationResult`. Reject evidence whose `source_id` is not in the supplied assessment answer/transcript segment set. Clamp competency score to the rubric scale and confidence to `0..1`.

- [ ] **Step 4: Implement the LLM adapter**

Prompt content includes only the versioned rubric, submitted answers, transcript segments and allowed source IDs. Instruct the model to avoid protected traits and output JSON matching the result schema. Set status `FAILED` with a sanitized error code when the model times out or output validation fails; keep source snapshots untouched.

- [ ] **Step 5: Add Owner/HR run and retry endpoint**

`POST /organizations/{org_id}/recruitment/applications/{application_id}/ai-evaluations` requires assignment plus `recruitment.review`, or Owner access, and injects `CandidateEvaluator` through `get_candidate_evaluator` so tests can replace external AI. Retry creates a new immutable run linked by `previous_run_id`; it never overwrites a prior report.

- [ ] **Step 6: Run tests and commit**

Run: `uv run pytest src/backend/tests/test_candidate_evaluator.py -q`

Expected: successful, malformed-output, timeout, invalid-evidence and no-auto-decision cases pass.

```bash
git add src/backend/services/candidate_evaluator.py src/backend/api/v1/recruitment.py src/backend/tests/test_candidate_evaluator.py
git commit -m "feat: add evidence-backed candidate evaluation"
```

### Task 8: Recruitment privacy retention

**Files:**

- Create: `src/backend/services/recruitment_retention.py`
- Create: `src/backend/tests/test_recruitment_retention.py`
- Create: `scripts/purge_recruitment_data.py`

**Interfaces:**

- Produces: `purge_expired_recruitment_data(db, organization_id, now) -> RetentionResult`.
- Consumes: `RecruitmentPolicy.retention_days` and terminal application timestamps.

- [ ] **Step 1: Add retention boundary tests**

```python
def test_retention_redacts_old_terminal_application_but_keeps_audit(db_session, old_rejected_application):
    result = purge_expired_recruitment_data(
        db_session,
        old_rejected_application.organization_id,
        now=datetime.now(timezone.utc),
    )
    db_session.refresh(old_rejected_application.candidate)
    assert result.redacted_applications == 1
    assert old_rejected_application.candidate.full_name is None
    assert old_rejected_application.candidate.email is None
    assert old_rejected_application.candidate.phone is None
    assert old_rejected_application.assessment_attempts[0].answers_json is None
    assert db_session.query(models.RecruitmentAuditEvent).filter_by(application_id=old_rejected_application.id).count() > 0


def test_retention_never_redacts_active_application(db_session, active_application):
    result = purge_expired_recruitment_data(db_session, active_application.organization_id, now=datetime.now(timezone.utc))
    assert result.redacted_applications == 0
```

- [ ] **Step 2: Run retention tests and verify red**

Run: `uv run pytest src/backend/tests/test_recruitment_retention.py -q`

Expected: missing retention service.

- [ ] **Step 3: Implement deterministic redaction**

Only process terminal `REJECTED`, `WITHDRAWN`, `EXPIRED`, `CANCELLED`, or `HIRED` applications where `terminal_at < now - retention_days`. Clear Candidate full name/email/phone, Assessment answers, AI input snapshots and evidence quotes, then delete Transcript Segments belonging to the dedicated recruitment Meeting; keep email hash, decisions, score summaries, stage events and actor/timestamp audit. Never modify the employee User created after a hired Candidate onboards. Write one `RETENTION_REDACTED` audit event per application and make reruns no-op.

- [ ] **Step 4: Add an operations entry point**

`scripts/purge_recruitment_data.py` opens the configured database session, accepts required `--organization-id` and optional ISO `--now`, invokes the service, prints only counts, and exits nonzero on failure. It must never print Candidate PII.

- [ ] **Step 5: Run tests and commit**

Run: `uv run pytest src/backend/tests/test_recruitment_retention.py -q`

Expected: old-terminal, active, custom policy, tenant isolation and idempotent rerun tests pass.

```bash
git add src/backend/services/recruitment_retention.py src/backend/tests/test_recruitment_retention.py scripts/purge_recruitment_data.py
git commit -m "feat: enforce recruitment data retention"
```

### Task 9: Owner approval and idempotent onboarding

**Files:**

- Create: `src/backend/services/onboarding_service.py`
- Modify: `src/backend/models.py`
- Modify: `src/backend/api/v1/recruitment.py`
- Modify: `src/backend/api/v1/org_invitations.py`
- Modify: `src/backend/schemas/organization.py`
- Create: `src/backend/alembic/versions/d9e2f3a4b5c6_secure_onboarding_invitations.py`
- Create: `src/backend/tests/test_recruitment_onboarding.py`

**Interfaces:**

- Produces: `OnboardingService.issue_invitation(application_id, owner_member, idempotency_key) -> IssuedInvitation`.
- Produces: `OnboardingService.complete_from_invitation(invitation_id, user_id) -> RecruitmentApplication`.
- Consumes: existing Organization Invitation acceptance flow.

- [ ] **Step 1: Add onboarding boundary tests**

```python
def test_cannot_issue_onboarding_before_owner_approval(db_session, recruitment_org):
    application = make_application(db_session, recruitment_org, stage="OWNER_APPROVAL_PENDING")
    with pytest.raises(RecruitmentConflict):
        OnboardingService(db_session).issue_invitation(application.id, recruitment_org.owner, "key-1")


def test_retry_returns_same_invitation(db_session, approved_application, recruitment_org):
    service = OnboardingService(db_session)
    first = service.issue_invitation(approved_application.id, recruitment_org.owner, "key-1")
    second = service.issue_invitation(approved_application.id, recruitment_org.owner, "key-1")
    assert first.invitation.id == second.invitation.id
    assert db_session.query(models.OrganizationInvitation).filter_by(recruitment_application_id=approved_application.id).count() == 1
```

- [ ] **Step 2: Run onboarding tests and verify red**

Run: `uv run pytest src/backend/tests/test_recruitment_onboarding.py -q`

Expected: missing service and onboarding link.

- [ ] **Step 3: Implement idempotent invitation issuance**

Require stage `APPROVED`, Owner role, target department, and a configured employee role. Store `recruitment_application_id` and idempotency key on Organization Invitation. Advance with `ISSUE_ONBOARDING` only after invitation commit succeeds.

- [ ] **Step 4: Harden organization invitation token storage**

Replace raw token lookup with SHA-256 hash lookup. Creation returns the raw token only in the immediate response/email result; list responses omit it. Migrate existing pending raw tokens by hashing their values in the Alembic data migration before renaming the column to `token_hash`.

Create revision `d9e2f3a4b5c6` with `down_revision = "c8f1a2b3d4e5"`. Add `recruitment_application_id` and `idempotency_key` with unique indexes, backfill `token_hash = sha256(token)` for existing rows, then remove the raw `token` column. The downgrade recreates `token` as nullable because a secure hash cannot be reversed.

- [ ] **Step 5: Mark the application hired only after invitation acceptance**

After existing code creates User membership and DepartmentMember, call `complete_from_invitation` in the same transaction. Verify email matches Candidate email and advance `COMPLETE_ONBOARDING`; a retry of acceptance remains idempotent.

- [ ] **Step 6: Run tests and commit**

Run: `uv run pytest src/backend/tests/test_recruitment_onboarding.py -q`

Expected: pre-approval rejection, Owner-only approval, idempotency, hashed token, membership timing and completion tests pass.

```bash
git add src/backend/models.py src/backend/services/onboarding_service.py src/backend/api/v1/recruitment.py src/backend/api/v1/org_invitations.py src/backend/schemas/organization.py src/backend/tests/test_recruitment_onboarding.py src/backend/alembic/versions/d9e2f3a4b5c6_secure_onboarding_invitations.py
git commit -m "feat: connect owner approval to onboarding"
```

### Task 10: Owner and HR Manager recruitment workspaces

**Files:**

- Create: `src/frontend/src/lib/recruitment-api.ts`
- Create: `src/frontend/src/components/admin/RecruitmentTab.tsx`
- Modify: `src/frontend/src/components/admin/CurlyBracketSidebar.tsx`
- Modify: `src/frontend/src/app/admin/page.tsx`
- Create: `src/frontend/src/components/manager/ManagerRecruitmentTab.tsx`
- Modify: `src/frontend/src/components/manager/ManagerCurlyBracketSidebar.tsx`
- Modify: `src/frontend/src/app/manager/page.tsx`

**Interfaces:**

- Produces: typed `recruitmentApi` methods matching Tasks 4, 6, 7 and 9.
- Produces: Owner pipeline with approval action.
- Produces: permission-gated HR Manager review workspace.

- [ ] **Step 1: Add exact frontend domain types and client methods**

```typescript
export type RecruitmentStage =
  | 'INVITED'
  | 'ASSESSMENT_PENDING'
  | 'ASSESSMENT_SUBMITTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'HR_REVIEW_PENDING'
  | 'OWNER_APPROVAL_PENDING'
  | 'APPROVED'
  | 'ONBOARDING_INVITED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'CANCELLED';
```

Expose `getContext`, `listOpenings`, `createOpening`, `listApplications`, `getApplication`, `assignHR`, `submitHRReview`, `runEvaluation`, `submitOwnerApproval`, and `issueOnboarding` through the existing authenticated API conventions.

- [ ] **Step 2: Build the Owner pipeline view**

Use a stable five-column summary (`Mời`, `Bài test`, `Phỏng vấn`, `HR review`, `Owner duyệt`) with stage counts and a detail panel. Add an Owner-only HR access panel that grants/revokes `recruitment.review` for Managers and blocks revocation until active assignments are reassigned. Keep the stage and Manager filter triggers fixed at `w-[180px] shrink-0`; render labels as `<span className="truncate" title={label}>{label}</span>`. The approval panel displays AI evidence and HR reasoning separately and requires a reason when Owner rejects.

- [ ] **Step 3: Wire Owner navigation**

Add `recruitment` to `AdminSectionKey` and `NAV_SECTIONS` in `CurlyBracketSidebar.tsx`, render `RecruitmentTab` from `admin/page.tsx`, and change the keyboard shortcut upper bound from the hard-coded number to `NAV_SECTIONS.length`. Do not duplicate navigation labels in page-local arrays.

- [ ] **Step 4: Build permission-gated HR workspace**

Fetch `/recruitment/me` before exposing the recruitment nav item. Change `ManagerCurlyBracketSidebar` to receive a `sections: ManagerNavSectionItem[]` prop and use that same filtered array for rendering and keyboard shortcuts; only append the `recruitment` item when effective permissions contain `recruitment.review`. `ManagerRecruitmentTab` only lists assigned applications; its decision form supports `HIRE`, `NO_HIRE`, and `NEEDS_MORE_EVIDENCE`, requires a reason, shows rubric/evidence/transcript links, and never exposes Owner approval controls.

- [ ] **Step 5: Run frontend lint and build container**

Run: `npm --prefix src/frontend run lint`

Expected: zero ESLint errors.

Run: `docker compose up -d --build frontend`

Expected: frontend container builds and reaches running state.

- [ ] **Step 6: Smoke-test both workspaces**

Open `http://localhost:3001/admin` as Owner and `http://localhost:3001/manager` as the granted Manager. Verify a non-HR Manager has no Recruitment navigation and direct API access still returns `403`.

- [ ] **Step 7: Commit the internal workspaces**

```bash
git add src/frontend/src/lib/recruitment-api.ts src/frontend/src/components/admin/RecruitmentTab.tsx src/frontend/src/components/admin/CurlyBracketSidebar.tsx src/frontend/src/app/admin/page.tsx src/frontend/src/components/manager/ManagerRecruitmentTab.tsx src/frontend/src/components/manager/ManagerCurlyBracketSidebar.tsx src/frontend/src/app/manager/page.tsx
git commit -m "feat: add recruitment workspaces"
```

### Task 11: Candidate portal and interview join

**Files:**

- Create: `src/frontend/src/app/(candidate)/candidate/layout.tsx`
- Create: `src/frontend/src/app/(candidate)/candidate/invite/[token]/page.tsx`
- Create: `src/frontend/src/app/(candidate)/candidate/applications/page.tsx`
- Create: `src/frontend/src/app/(candidate)/candidate/assessments/[attemptId]/page.tsx`
- Create: `src/frontend/src/app/(candidate)/candidate/interviews/[sessionId]/page.tsx`
- Create: `src/frontend/src/lib/store/useCandidateStore.ts`
- Modify: `src/frontend/src/lib/recruitment-api.ts`

**Interfaces:**

- Produces: isolated candidate session store and portal.
- Consumes: candidate endpoints from Tasks 5–6.

- [ ] **Step 1: Create an isolated candidate auth store**

Store only candidate JWT, expiry and application summary under `axiom-candidate-session`. Never place the candidate token in `useAuthStore` and never attach `X-Organization-ID` to candidate requests.

- [ ] **Step 2: Implement invitation exchange and timeline**

The invite page exchanges the path token, removes it from browser history using `router.replace('/candidate/applications')`, and renders neutral errors for expired/revoked links. The application page renders current stage, deadlines and available actions without employee navigation.

- [ ] **Step 3: Implement Assessment form with stable controls**

Render questions from the immutable snapshot, autosave only in local state, validate required responses and disable duplicate submission. Any dynamic select uses a fixed `w-[220px] shrink-0` trigger, truncated label and `title`.

- [ ] **Step 4: Implement consent and LiveKit guest join**

Require three explicit consent checkboxes before requesting guest access. Use the returned token and room URL only for the linked interview session; show expiry and meeting-completed states without falling back to employee meeting APIs.

- [ ] **Step 5: Run lint and rebuild Docker frontend**

Run: `npm --prefix src/frontend run lint`

Expected: zero ESLint errors.

Run: `docker compose up -d --build frontend`

Expected: frontend container builds and candidate routes return rendered pages.

- [ ] **Step 6: Manual accessibility and privacy smoke test**

Keyboard through invitation, assessment and consent screens; verify visible focus, form labels, validation messages and no organization sidebar/data. Confirm browser storage contains no raw invitation token after exchange.

- [ ] **Step 7: Commit the candidate portal**

```bash
git add src/frontend/src/app/\(candidate\) src/frontend/src/lib/store/useCandidateStore.ts src/frontend/src/lib/recruitment-api.ts
git commit -m "feat: add candidate recruitment portal"
```

### Task 12: End-to-end coverage and release verification

**Files:**

- Create: `src/backend/tests/test_recruitment_e2e.py`
- Modify: `src/backend/tests/recruitment_fixtures.py`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-09-27-recruitment-pipeline-design.md`

**Interfaces:**

- Validates: all backend services and APIs as one lifecycle.
- Documents: permission grant, local test data and operational failure behavior.

- [ ] **Step 1: Write the full lifecycle test**

First add the named helpers below to `recruitment_fixtures.py`. Each helper performs the real HTTP call, asserts the expected success status and returns a typed `SimpleNamespace`; `membership_count` queries the shared test session. This keeps the lifecycle readable without bypassing any API boundary.

```python
def test_recruitment_lifecycle_to_hired(client, auth_as, recruitment_org, fake_evaluator):
    opening = create_opening_as_owner(client, auth_as, recruitment_org)
    invitation = invite_candidate_as_owner(client, opening)
    candidate = exchange_candidate_session(client, invitation.raw_token)
    submit_assessment(client, candidate)
    interview = schedule_and_complete_interview(client, auth_as, candidate.application_id)
    run_ai_evaluation(client, auth_as, candidate.application_id, fake_evaluator)
    submit_hr_hire(client, auth_as, candidate.application_id)
    approve_as_owner(client, auth_as, candidate.application_id)
    onboarding = issue_onboarding(client, auth_as, candidate.application_id)
    accept_onboarding(client, onboarding.raw_token)

    application = load_application(client, auth_as, candidate.application_id)
    assert application["stage"] == "HIRED"
    assert membership_count(recruitment_org.organization.id, candidate.email) == 1
```

- [ ] **Step 2: Add alternate lifecycle tests**

Add complete scenarios for skipped assessment, HR `NO_HIRE`, Owner rejection, Candidate withdrawal, AI failure with continued human review, invitation replay, cross-tenant IDs and stale Owner approval version.

- [ ] **Step 3: Run the backend suite**

Run: `uv run pytest src/backend/tests -q`

Expected: all backend tests pass with zero failures.

- [ ] **Step 4: Validate migration history**

Run: `uv run alembic heads`

Expected: exactly one head, `d9e2f3a4b5c6`.

Run: `$env:DATABASE_URL='sqlite:///./scratch/recruitment_release.db'; uv run alembic upgrade head`

Expected: upgrade exits zero.

- [ ] **Step 5: Run final frontend verification and required Docker build**

Run: `npm --prefix src/frontend run lint`

Expected: zero ESLint errors.

Run: `npm --prefix src/frontend run build`

Expected: Next.js production build exits zero.

Run: `docker compose up -d --build frontend`

Expected: frontend container is running; refresh `http://localhost:3001`.

- [ ] **Step 6: Update documentation with exact operating steps**

Document how Owner grants/revokes `recruitment.review`, how to create a Job Opening, how Candidate invitation expiry works, how to retry failed AI Evaluation, and how Owner approval creates onboarding. Mark the design spec status `Implemented` only after all verification commands pass.

- [ ] **Step 7: Review the final diff and commit**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: only Task 12 files are uncommitted.

```bash
git add src/backend/tests/test_recruitment_e2e.py src/backend/tests/recruitment_fixtures.py README.md docs/superpowers/specs/2026-09-27-recruitment-pipeline-design.md
git commit -m "test: verify recruitment lifecycle"
```

## Completion Gate

The feature is complete only when all of these are true:

- Backend test suite passes, including tenant, department, assignment and stale-version cases.
- Alembic reports one head and a clean database upgrades successfully.
- Frontend lint and production build pass.
- Required frontend Docker image rebuild succeeds and the container is running.
- Candidate cannot access employee data or become a member before onboarding acceptance.
- AI failure leaves a visible failed run and does not block human review.
- HR Manager and Owner decisions are distinct, attributed and audited.
- Repository diff contains no secrets, raw stored invitation tokens or unrelated user changes.
