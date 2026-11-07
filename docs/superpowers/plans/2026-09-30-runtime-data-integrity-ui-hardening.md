# Runtime Data Integrity and UI Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove runtime mock/demo data and hard-coded identity shortcuts, then harden the recruitment, candidate, CV, interview, archive, admin, and knowledge experiences against empty/error/loading states and layout shift.

**Architecture:** Keep fixtures and opt-in seeds, but require every production UI value to come from authenticated identity, active organization state, a persisted API response, or direct user input. Replace fake fallbacks with typed nullable state and explicit empty/error states; share duplicated interview UI; add source-level guardrails so mock identifiers and seeded identities cannot leak back into runtime code.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, pytest, Next.js 16.2, React 19.2, TypeScript, Tailwind CSS v4, Zustand, ESLint 9, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-30-runtime-data-integrity-ui-hardening-design.md`

## Global Constraints

- Preserve all unrelated modified and untracked files in the existing dirty working tree.
- Keep test fixtures and opt-in seed scripts; remove mock/demo behavior only from production runtime paths.
- Do not add a frontend or backend dependency.
- Before editing Next.js code, read the relevant local guide under `src/frontend/node_modules/next/dist/docs/` as required by `src/frontend/AGENTS.md`.
- Dynamic triggers must use a fixed width, `shrink-0`, a truncated label, and `title`; do not show expanding badges unless the fixed width accounts for them.
- Use blue as the primary workspace accent; amber for pending/warning, emerald for completion, and rose for errors/rejection.
- Do not weaken tenant, meeting, or recruitment permission checks to make tests pass.
- Do not persist invented values when an API returns no result; render an empty state instead.
- Stage only explicitly named files. If a named file contains pre-existing changes that cannot be separated safely, do not commit that task automatically; report the overlap.
- After the frontend batch, run `docker compose up -d --build frontend` from the repository root and report that `http://localhost:3001` is ready to refresh.

---

### Task 1: Repair the recruitment E2E fixture without weakening production permissions

**Files:**
- Modify: `src/backend/tests/recruitment_fixtures.py`
- Test: `src/backend/tests/test_recruitment_e2e.py`
- Test: `src/backend/tests/test_candidate_discovery_portal.py`

**Interfaces:**
- Consumes: `OrganizationMemberPermission(member_id, permission_id, granted_by_id)` and permission code `recruitment.review`.
- Produces: `recruitment_org.selected_manager` with a direct review grant; `recruitment_org.other_manager` remains ungranted for negative permission tests.

- [ ] **Step 1: Re-run the failing baseline**

Run:

```powershell
uv run pytest src/backend/tests/test_candidate_discovery_portal.py src/backend/tests/test_recruitment_e2e.py -q
```

Expected: 1 pass and 9 failures with `Assigned HR member must have recruitment.review permission`.

- [ ] **Step 2: Add the fixture grant at the point the selected membership exists**

Insert after `selected_member` has been flushed:

```python
db_session.add(
    models.OrganizationMemberPermission(
        member_id=selected_member.id,
        permission_id=review_perm.id,
        granted_by_id=owner_user.id,
    )
)
```

Assert `review_perm is not None` before constructing the grant. Do not grant this permission to `other_member` or the base `MANAGER` role.

- [ ] **Step 3: Run positive and negative recruitment permission coverage**

Run:

```powershell
uv run pytest src/backend/tests/test_recruitment_e2e.py src/backend/tests/test_recruitment_permissions.py -q
```

Expected: all tests pass; wrong-department and ungranted-manager tests remain forbidden.

- [ ] **Step 4: Commit only the fixture change when safe**

```powershell
git add -- src/backend/tests/recruitment_fixtures.py
git commit -m "test: grant recruitment review permission in e2e fixture"
```

---

### Task 2: Remove backend credential, email-role, and meeting-membership shortcuts

**Files:**
- Modify: `src/backend/core/security.py`
- Modify: `src/backend/api/v1/auth.py`
- Modify: `src/backend/api/v1/org_invitations.py`
- Modify: `src/backend/api/v1/meetings_v2.py`
- Modify: `src/backend/api/v1/meeting_content.py`
- Create: `src/backend/tests/test_runtime_identity_authorization.py`

**Interfaces:**
- Consumes: `OrganizationMember`, `Role`, `DepartmentMember`, `MeetingMember`, and `Organization.created_by_id`.
- Produces: role and access decisions based only on persisted relationships; `verify_password()` accepts only the supplied hash match.

- [ ] **Step 1: Write failing regression tests for seeded-email shortcuts**

Create tests with users whose email resembles seeded accounts but whose memberships do not grant privileges:

```python
def test_verify_password_does_not_accept_another_demo_password():
    hashed = hash_password("password123")
    assert verify_password("Axiom@123456", hashed) is False


def test_seeded_admin_email_does_not_create_owner_role(db_session):
    user = models.User(email="admin@axiom.com", full_name="No Membership")
    db_session.add(user)
    db_session.commit()
    assert _resolve_user_role(user, db_session) == "CANDIDATE"


def test_manager_word_in_email_does_not_create_manager_role(db_session):
    user = models.User(email="manager@example.test", full_name="Plain Member")
    db_session.add(user)
    db_session.flush()
    assert _get_user_role_and_dept(db_session, user) == ("MEMBER", None)
```

Add an endpoint-level test proving an authenticated non-member cannot post a transcript and is not auto-added to `meeting_members`.

- [ ] **Step 2: Run the new tests and confirm the shortcuts are exposed**

Run:

```powershell
uv run pytest src/backend/tests/test_runtime_identity_authorization.py -q
```

Expected: failures for password cross-acceptance, email-based role promotion, or transcript auto-membership.

- [ ] **Step 3: Make password verification exact**

Replace `verify_password` with one bcrypt check and a false result on exceptions:

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (TypeError, ValueError):
        return False
```

- [ ] **Step 4: Resolve roles and authorization from memberships only**

In `auth.py`, remove seeded-email branches from registration and `_resolve_user_role`. Preserve explicit invitation, new-organization, and candidate flows. `_resolve_user_role` must return the active membership role when present and `CANDIDATE` otherwise.

In `org_invitations.py`, replace the `admin@axiom.com` exception with an active organization membership check whose joined role is `OWNER` or `ADMIN`.

In `meetings_v2.py`, remove email and email-substring checks. Resolve role from the organization membership belonging to `meeting.organization_id`, not the first membership on the user.

In `meeting_content.py`, restore `_require_meeting_member(db, meeting_id, current_user.id)` and delete the block that inserts a `MeetingMember` for arbitrary authenticated callers.

Audit every endpoint in that module for commented test bypasses. `list_follow_up_tasks`, topic reads/advances, summary, decisions, chat, and extraction routes must call the existing membership/role helper appropriate to the action. Delete comments that intentionally disable authorization; do not leave a second code path for scripts.

- [ ] **Step 5: Run identity, recruitment, and meeting-facing tests**

Run:

```powershell
uv run pytest src/backend/tests/test_runtime_identity_authorization.py src/backend/tests/test_recruitment_permissions.py src/backend/tests/test_recruitment_e2e.py -q
```

Expected: all tests pass.

- [ ] **Step 6: Commit the authorization boundary**

```powershell
git add -- src/backend/core/security.py src/backend/api/v1/auth.py src/backend/api/v1/org_invitations.py src/backend/api/v1/meetings_v2.py src/backend/api/v1/meeting_content.py src/backend/tests/test_runtime_identity_authorization.py
git commit -m "fix: remove runtime identity and authorization shortcuts"
```

---

### Task 3: Remove synthetic meeting tasks and mock LiveKit transcript metadata

**Files:**
- Modify: `src/backend/api/v1/meeting_content.py`
- Create: `src/backend/tests/test_meeting_content_integrity.py`
- Modify: `src/frontend/src/components/meetings/ArchiveTransferModal.tsx`

**Interfaces:**
- Consumes: persisted `TranscriptSegment`, `MeetingChatMessage`, agenda text, and `FollowUpTask` rows.
- Produces: extraction endpoint that returns real persisted tasks only; LiveKit record payload uses `source: "manual"`; `ArchiveTransferModal` receives typed task/member arrays and requires a real active organization before loading colleagues.

- [ ] **Step 1: Write failing extraction tests**

Add a local `meeting_context(db_session)` fixture returning a `SimpleNamespace` with `meeting`, `member_user`, and authenticated `headers`. Add a `capture_livekit_payload(monkeypatch, meeting_context)` helper that replaces `LiveKitAPI` with an async fake and returns the decoded body sent through `room.send_data`. Then add tests for that authorized member:

```python
def test_extract_tasks_does_not_synthesize_without_evidence(client, meeting_context):
    response = client.post(
        f"/api/v1/meetings/{meeting_context.meeting.id}/content/extract-tasks",
        headers=meeting_context.headers,
    )
    assert response.status_code == 200
    assert response.json() == []


def test_transcript_broadcast_payload_is_not_marked_mock(monkeypatch, meeting_context):
    payload = capture_livekit_payload(monkeypatch, meeting_context)
    assert payload["source"] == "manual"
    assert "is_mock" not in payload
```

Use the actual route prefix registered by `meeting_content.router`; do not introduce a duplicate endpoint.

- [ ] **Step 2: Run the tests to see synthetic data fail the assertion**

Run:

```powershell
uv run pytest src/backend/tests/test_meeting_content_integrity.py -q
```

Expected: a generated task is returned or `is_mock` is present.

- [ ] **Step 3: Delete synthetic persistence and fake names**

Remove the entire `current_count == 0` task synthesis branch, the seeded-email assignee lookup, and fallback person names. Keep the transcript/chat/agenda extraction calls, then return the database tasks that actually exist.

The module currently registers `POST /extract-tasks` twice. Keep one `trigger_task_extraction` implementation that supports transcript, chat, and agenda evidence, applies membership authorization, broadcasts the typed preview, and returns persisted rows. Delete the duplicate `extract_tasks_endpoint` route so FastAPI route order cannot select a different behavior than the tested behavior.

Change the broadcast payload and log text:

```python
payload = {
    "type": "original_transcript",
    "participant_identity": participant_identity,
    "original_text": text,
    "language": "vi",
    "is_final": True,
    "source": "manual",
}
logger.info("Broadcasted transcript to %s", meeting_id)
```

- [ ] **Step 4: Type Archive Transfer inputs and remove the organization UUID fallback**

Define concrete interfaces instead of `any[]`:

```ts
interface ArchiveTaskInput {
  id?: string;
  title?: string;
  task?: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  speaker_name?: string | null;
  deadline?: string | null;
}

interface ArchiveMeetingMember {
  id?: string;
  user_id?: string;
  user_name?: string;
  full_name?: string;
  email?: string;
  role?: string;
}
```

If `activeOrganization?.id` is absent, keep meeting attendees, skip the colleague request, and show an inline organization error rather than querying a seeded UUID.

- [ ] **Step 5: Verify backend and frontend static checks**

Run:

```powershell
uv run pytest src/backend/tests/test_meeting_content_integrity.py -q
cd src/frontend
npm.cmd exec eslint -- src/components/meetings/ArchiveTransferModal.tsx
npm.cmd exec tsc -- --noEmit --pretty false
```

Expected: all commands pass.

- [ ] **Step 6: Commit when pre-existing file overlap is reviewable**

```powershell
git add -- src/backend/api/v1/meeting_content.py src/backend/tests/test_meeting_content_integrity.py src/frontend/src/components/meetings/ArchiveTransferModal.tsx
git commit -m "fix: require evidence for meeting task extraction"
```

---

### Task 4: Implement real knowledge search and recent transcript APIs

**Files:**
- Modify: `src/backend/api/v1/knowledge.py`
- Create: `src/backend/tests/test_knowledge_search.py`
- Modify: `src/frontend/src/lib/api.ts`

**Interfaces:**
- Produces backend models:

```python
class KnowledgeMatch(BaseModel):
    type: Literal["document", "transcript"]
    id: str
    meeting_id: str | None = None
    title: str
    snippet: str
    source: str
    speaker_name: str | None = None
    created_at: datetime.datetime | None = None

class KnowledgeSearchResponse(BaseModel):
    query: str
    total_matches: int
    matches: list[KnowledgeMatch]
```

- Produces frontend `KnowledgeMatch`, `KnowledgeSearchResponse`, `knowledgeApi.search(query, signal?)`, and `knowledgeApi.recentTranscripts(limit, signal?)`.

- [ ] **Step 1: Write search and tenant-isolation tests**

Add a local `knowledge_context(db_session)` fixture that creates two organizations, one authenticated member in the first organization, one meeting per organization, and transcript segments with distinct content. The fixture returns a `SimpleNamespace` containing `headers`, `own_meeting`, and `foreign_meeting`. Test these exact behaviors:

```python
def test_search_returns_matching_transcript_content(client, knowledge_context):
    response = client.post(
        "/api/v1/knowledge/search",
        json={"query": "consensus"},
        headers=knowledge_context.headers,
    )
    assert response.json()["matches"][0]["snippet"].lower().find("consensus") >= 0


def test_search_returns_empty_matches_instead_of_system_result(client, knowledge_context):
    response = client.post(
        "/api/v1/knowledge/search",
        json={"query": "not-present"},
        headers=knowledge_context.headers,
    )
    assert response.json() == {"query": "not-present", "total_matches": 0, "matches": []}


def test_search_never_returns_another_organization_transcript(client, knowledge_context):
    response = client.post(
        "/api/v1/knowledge/search",
        json={"query": "foreign-only-phrase"},
        headers=knowledge_context.headers,
    )
    assert response.json()["matches"] == []
```

Also test `GET /api/v1/knowledge/transcripts/recent?limit=20` orders by transcript creation time descending and returns at most 20 rows.

- [ ] **Step 2: Confirm the current title-only/system-result implementation fails**

Run:

```powershell
uv run pytest src/backend/tests/test_knowledge_search.py -q
```

Expected: transcript-content, empty-result, or tenant-isolation assertions fail.

- [ ] **Step 3: Query real transcript rows**

Join `TranscriptSegment` to `Meeting`, filter `Meeting.organization_id == member.organization_id`, and use case-insensitive content/title matching. Build snippets from the real segment content with a bounded window; do not read files from disk during search and do not create a system fallback result.

Implement recent transcripts from the same tenant-scoped join. Validate `query` with `min_length=1`, strip whitespace, and cap `limit` to 1–50.

- [ ] **Step 4: Add typed frontend methods**

Add to `api.ts`:

```ts
export interface KnowledgeMatch {
  type: 'document' | 'transcript';
  id: string;
  meeting_id?: string | null;
  title: string;
  snippet: string;
  source: string;
  speaker_name?: string | null;
  created_at?: string | null;
}

export const knowledgeApi = {
  search: (query: string, signal?: AbortSignal) =>
    apiFetch<KnowledgeSearchResponse>('/api/v1/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
      signal,
    }),
  recentTranscripts: (limit = 20, signal?: AbortSignal) =>
    apiFetch<KnowledgeMatch[]>(`/api/v1/knowledge/transcripts/recent?limit=${limit}`, { signal }),
};
```

Extend the local `apiFetch` options type to accept `signal` without using `any`.

- [ ] **Step 5: Verify API behavior and types**

Run:

```powershell
uv run pytest src/backend/tests/test_knowledge_search.py -q
cd src/frontend
npm.cmd exec eslint -- src/lib/api.ts
npm.cmd exec tsc -- --noEmit --pretty false
```

Expected: tests pass and no new type errors appear. Existing unrelated `api.ts` lint errors must be resolved in this task because the file is modified.

- [ ] **Step 6: Commit the real knowledge contract**

```powershell
git add -- src/backend/api/v1/knowledge.py src/backend/tests/test_knowledge_search.py src/frontend/src/lib/api.ts
git commit -m "feat: search persisted meeting knowledge"
```

---

### Task 5: Replace Member Knowledge mock content with real loading, search, empty, and error states

**Files:**
- Modify: `src/frontend/src/components/member/MemberKnowledgeTab.tsx`

**Interfaces:**
- Consumes: `knowledgeApi.search`, `knowledgeApi.recentTranscripts`, `KnowledgeMatch` from Task 4.
- Produces: no local business-data constants; search requests cancel through `AbortController`; retry reloads recent transcripts.

- [ ] **Step 1: Record the failing source guard**

Run:

```powershell
rg -n "SAMPLE_KNOWLEDGE_BASE|setTimeout\(|Độ tin cậy: 98%" src/frontend/src/components/member/MemberKnowledgeTab.tsx
```

Expected: matches identify the mock array, simulated request, and invented confidence.

- [ ] **Step 2: Replace simulation state with API state**

Use this state model:

```ts
const [results, setResults] = useState<KnowledgeMatch[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [isSearching, setIsSearching] = useState(false);
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const requestRef = useRef<AbortController | null>(null);
```

Initial load calls `recentTranscripts(20)`. Submit aborts the previous search, calls `search(query.trim())`, and displays only returned matches. Use a shared `getErrorMessage(error: unknown, fallback: string)` helper from `src/frontend/src/lib/errors.ts`; create that file here if it does not exist:

```ts
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
```

- [ ] **Step 3: Render four explicit states**

- Loading: three fixed-height transcript skeleton cards.
- Empty: `BookOpen` icon, “Chưa có transcript phù hợp”, and a retry button when loading recent data.
- Error: inline rose panel with retry; preserve the user query.
- Success: title, real snippet, speaker/source metadata, and link to `/meetings/{meeting_id}` only when `meeting_id` exists.

Remove the AI confidence label, fake answer card, purple badge, and success toast claiming AI extraction. Rename the action to “Tìm trong biên bản”.

- [ ] **Step 4: Apply layout-stability and accessibility rules**

Give the submit button `shrink-0 w-36`, wrap its label in `truncate`, set `title="Tìm trong biên bản"`, and retain a visible focus ring. Result metadata must truncate rather than expand cards horizontally.

- [ ] **Step 5: Verify no mock source remains**

Run:

```powershell
rg -n "SAMPLE_KNOWLEDGE_BASE|setTimeout\(|Độ tin cậy: 98%" src/frontend/src/components/member/MemberKnowledgeTab.tsx
npm.cmd exec eslint -- src/components/member/MemberKnowledgeTab.tsx src/lib/errors.ts
npm.cmd exec tsc -- --noEmit --pretty false
```

Expected: `rg` returns no matches; lint and typecheck pass.

- [ ] **Step 6: Commit the real Knowledge UI**

```powershell
git add -- src/frontend/src/components/member/MemberKnowledgeTab.tsx src/frontend/src/lib/errors.ts
git commit -m "feat: connect member knowledge to persisted transcripts"
```

---

### Task 6: Remove admin mock modules, fake organization metrics, and unavailable policy controls

**Files:**
- Create: `src/frontend/src/types/admin.ts`
- Modify: `src/frontend/src/app/admin/page.tsx`
- Modify: `src/frontend/src/components/admin/DepartmentsTab.tsx`
- Modify: `src/frontend/src/components/admin/ProtocolPoliciesTab.tsx`
- Modify: `src/frontend/src/components/admin/WebhooksIntegrationTab.tsx` or delete it if the import graph remains empty
- Delete: `src/frontend/src/lib/mockAdminData.ts`
- Delete: `src/frontend/src/lib/workloadProtocolData.ts`

**Interfaces:**
- Produces `DepartmentNode` and `ProtocolPolicySettings` type definitions in `@/types/admin`.
- Consumes only `OrgAnalytics | null`, real `OrgMemberDetail[]`, real `Department[]`, and real `DepartmentProgressItem[]`.

- [ ] **Step 1: Capture every runtime mock/admin identity dependency**

Run:

```powershell
rg -n "mockAdminData|workloadProtocolData|MOCK_|DEFAULT_ORG_ANALYTICS|2846981f-7028-4ef4-9cad-d2c3719703c4|manager@axiom.internal" src/frontend/src/app/admin src/frontend/src/components/admin src/frontend/src/lib
```

Expected: matches in the admin page, departments component, and two mock libraries.

- [ ] **Step 2: Move types without moving sample records**

Create `types/admin.ts` containing only the structural interfaces still imported by production components. Do not copy initial arrays, compatibility aliases, default people, or audit records.

Update imports in `DepartmentsTab`, `ProtocolPoliciesTab`, and any surviving webhook component to `@/types/admin`.

- [ ] **Step 3: Make admin organization and analytics nullable**

Use:

```ts
const [activeOrgId, setActiveOrgId] = useState<string | null>(activeOrganization?.id ?? null);
const [analytics, setAnalytics] = useState<OrgAnalytics | null>(null);
const [loadError, setLoadError] = useState<string | null>(null);
```

Resolve the organization from `activeOrganization` or `organizationApi.list()`. If none exists, stop fetching and render an organization empty state. Remove the seeded UUID and `org-axiom-corp` special case.

Construct `DepartmentNode` from actual departments and members:

```ts
const departmentMembers = members.filter((member) => member.department_id === department.id);
const manager = departmentMembers.find((member) => member.role === 'MANAGER');
```

Use `manager?.full_name`, `manager?.email`, and `departmentMembers.length`; represent absence as `null`/“Chưa bổ nhiệm”, not a fake email. Do not map department names to fixed business codes or colors; use persisted code when available or a deterministic presentation-only helper derived from the real id/name.

- [ ] **Step 4: Replace policy editing with an honest unavailable state**

Change `ProtocolPoliciesTab` to accept no fake `initialPolicies` and no fake save callback. Render a concise configuration-unavailable panel stating that server persistence is not configured. Disable the primary action with a fixed width and `title`; do not keep editable controls that claim to save.

- [ ] **Step 5: Rebuild Departments from real progress only**

Delete mandate/local-storage/capacity imports and state. Use `departmentProgress` directly; when it is empty, map departments to zero-valued progress rows instead of `12/8/3/1` fake counts:

```ts
{
  id: department.id,
  name: department.name,
  manager_name: department.managerName ?? 'Chưa bổ nhiệm',
  member_count: department.memberCount,
  total_tasks: 0,
  done_tasks: 0,
  in_progress_tasks: 0,
  todo_tasks: 0,
  completion_rate: 0,
}
```

Rename the capacity view to “Tiến độ” and show total/done/in-progress/todo metrics. Remove weekly-hour, mandate, bottleneck, utilization, and `INITIAL_ENG_MEMBERS` sections because no server source exists.

- [ ] **Step 6: Remove unreachable webhook simulation**

If `WebhooksIntegrationTab` still has no production import after the admin page cleanup, delete it. Otherwise replace random secret/latency/success simulation with an unavailable state just like policies. Do not retain `Math.random()` business responses.

- [ ] **Step 7: Delete mock libraries and verify the import graph**

Run:

```powershell
rg -n "mockAdminData|workloadProtocolData|MOCK_|DEFAULT_ORG_ANALYTICS|2846981f-7028-4ef4-9cad-d2c3719703c4|manager@axiom.internal" src/frontend/src
npm.cmd exec eslint -- src/app/admin/page.tsx src/components/admin/DepartmentsTab.tsx src/components/admin/ProtocolPoliciesTab.tsx src/types/admin.ts
npm.cmd exec tsc -- --noEmit --pretty false
```

Expected: `rg` has no runtime matches; lint/typecheck pass for touched files.

- [ ] **Step 8: Commit the admin integrity change**

```powershell
git add -- src/frontend/src/types/admin.ts src/frontend/src/app/admin/page.tsx src/frontend/src/components/admin/DepartmentsTab.tsx src/frontend/src/components/admin/ProtocolPoliciesTab.tsx src/frontend/src/components/admin/WebhooksIntegrationTab.tsx src/frontend/src/lib/mockAdminData.ts src/frontend/src/lib/workloadProtocolData.ts
git commit -m "refactor: replace admin mock state with real progress data"
```

---

### Task 7: Remove frontend seeded organization and role fallbacks across active workspaces

**Files:**
- Modify: `src/frontend/src/lib/api.ts`
- Modify: `src/frontend/src/app/(auth)/login/page.tsx`
- Delete: `src/frontend/src/components/auth/AuthQuickAccess.tsx`
- Modify: `src/frontend/src/app/meetings/[id]/meeting-room-client.tsx`
- Modify: `src/frontend/src/components/manager/ManagerMeetingsTab.tsx`
- Modify: `src/frontend/src/components/manager/ManagerKanbanTaskTab.tsx`
- Modify: `src/frontend/src/components/manager/ManagerTeamTab.tsx`
- Modify: `src/frontend/src/components/member/MemberJiraWorkspaceTab.tsx`
- Modify: `src/frontend/src/components/member/MemberSettingsTab.tsx`
- Modify: `src/frontend/src/components/admin/SovereignNavbar.tsx`
- Modify: `src/frontend/src/components/admin/CompanyOrgTree.tsx`
- Modify: `src/frontend/src/components/profile/UserProfileModal.tsx`
- Modify: `src/frontend/src/components/layout/user-nav.tsx`
- Modify: `src/frontend/src/components/layout/app-sidebar.tsx`

**Interfaces:**
- Consumes: `useAuthStore.user.role`, `user.department_id`, and `activeOrganization.id`.
- Produces: no role, route, organization, name, or profile behavior based on known seed emails or UUIDs.

- [ ] **Step 1: Capture the exact production shortcuts**

Run the repository query from the spec audit:

```powershell
rg -n "2846981f-7028-4ef4-9cad-d2c3719703c4|admin@axiom.com|manager\.khoa@axiom\.com|member@axiom.com|password123" src/frontend/src
```

Expected: matches in login, meeting room, workspace components, navigation, profile, and API helpers.

- [ ] **Step 2: Remove quick credentials and route by authenticated role**

Delete `AuthQuickAccess` and its import/render block. After login, route only from the `authApi.me()` response:

```ts
const role = (user.role ?? '').toUpperCase();
if (role === 'OWNER' || role === 'ADMIN') router.push('/admin');
else if (role === 'MANAGER') router.push('/manager');
else if (role === 'MEMBER') router.push('/member');
else router.push('/candidate/discovery');
```

- [ ] **Step 3: Require a real organization id**

Add a helper in `api.ts`:

```ts
export function requireActiveOrganizationId(explicitId?: string): string {
  const orgId = explicitId ?? useAuthStore.getState().activeOrganization?.id;
  if (!orgId) throw new Error('Chưa chọn tổ chức đang hoạt động');
  return orgId;
}
```

Use it in `departmentApi` and workspace components. Components must catch this error and render/notify a missing-organization state; never substitute a UUID.

- [ ] **Step 4: Remove seeded-email role checks and display fallbacks**

Every role check becomes a normalized role comparison. Meeting-room owner/manager actions use `user.role`; profile default titles use `user.job_title` or a generic “Chưa cập nhật”; navigation uses role only. CompanyOrgTree selects the persisted member with role `OWNER`, not a known email.

Generic input placeholders are allowed, but rendered account email must be absent or “Chưa cập nhật”, never a seed address.

- [ ] **Step 5: Verify the shortcuts are gone and touched files lint**

Run:

```powershell
rg -n "2846981f-7028-4ef4-9cad-d2c3719703c4|admin@axiom.com|manager\.khoa@axiom\.com|member@axiom.com|password123" src/frontend/src
npm.cmd exec eslint -- src/app/'(auth)'/login/page.tsx src/app/meetings/'[id]'/meeting-room-client.tsx src/components/manager/ManagerMeetingsTab.tsx src/components/manager/ManagerKanbanTaskTab.tsx src/components/manager/ManagerTeamTab.tsx src/components/member/MemberJiraWorkspaceTab.tsx src/components/member/MemberSettingsTab.tsx src/components/profile/UserProfileModal.tsx src/components/layout/user-nav.tsx src/components/layout/app-sidebar.tsx src/lib/api.ts
npm.cmd exec tsc -- --noEmit --pretty false
```

Expected: `rg` has no production source matches and touched files have no ESLint errors.

- [ ] **Step 6: Commit only after reviewing overlaps with the pre-existing working tree**

```powershell
git add -- src/frontend/src/lib/api.ts src/frontend/src/app/'(auth)'/login/page.tsx src/frontend/src/components/auth/AuthQuickAccess.tsx src/frontend/src/app/meetings/'[id]'/meeting-room-client.tsx src/frontend/src/components/manager/ManagerMeetingsTab.tsx src/frontend/src/components/manager/ManagerKanbanTaskTab.tsx src/frontend/src/components/manager/ManagerTeamTab.tsx src/frontend/src/components/member/MemberJiraWorkspaceTab.tsx src/frontend/src/components/member/MemberSettingsTab.tsx src/frontend/src/components/admin/SovereignNavbar.tsx src/frontend/src/components/admin/CompanyOrgTree.tsx src/frontend/src/components/profile/UserProfileModal.tsx src/frontend/src/components/layout/user-nav.tsx src/frontend/src/components/layout/app-sidebar.tsx
git commit -m "fix: derive frontend access from authenticated organization state"
```

---

### Task 8: Start every new CV from real identity plus empty user-owned sections

**Files:**
- Modify: `src/frontend/src/types/cv.ts`
- Modify: `src/frontend/src/components/cv/CVInteractiveStudio.tsx`
- Modify: `src/frontend/src/app/(candidate)/candidate/discovery/page.tsx`
- Modify: `src/frontend/src/components/member/MemberSettingsTab.tsx`

**Interfaces:**
- Produces:

```ts
export interface CVIdentitySeed {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
}

export function createEmptyCVData(seed: CVIdentitySeed = {}): CVData;
```

- Consumes: saved resume JSON from `candidatePortalApi`, or authenticated user fields when creating a new resume.

- [ ] **Step 1: Confirm sample CVs are currently reachable at runtime**

Run:

```powershell
rg -n "SAMPLE_HARVARD_CV|PRESET_CVS|NGUYỄN VĂN MINH|candidate\.nam@gmail\.com|cloudsync-demo" src/frontend/src/types/cv.ts src/frontend/src/components/cv src/frontend/src/app/'(candidate)'/candidate/discovery/page.tsx
```

Expected: sample profile and preset buttons are found.

- [ ] **Step 2: Replace the sample export with an empty-data factory**

The factory must return a fresh object on every call:

```ts
export function createEmptyCVData(seed: CVIdentitySeed = {}): CVData {
  return {
    templateId: 'harvard',
    title: 'CV chưa đặt tên',
    personalInfo: {
      fullName: seed.fullName?.trim() ?? '',
      title: seed.title?.trim() ?? '',
      email: seed.email?.trim() ?? '',
      phone: seed.phone?.trim() ?? '',
      location: '',
      avatarUrl: '',
      socials: [],
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
    certifications: [],
    awards: [],
    customBlocks: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}
```

- [ ] **Step 3: Initialize CV Studio from saved data or identity**

When `resumeId` exists, load and validate its JSON. Otherwise call `createEmptyCVData` with `useAuthStore().user`. A parse failure produces an inline error and leaves the last valid editor state intact; it must not fall back to sample data.

- [ ] **Step 4: Remove quick-fill CVs and invented review defaults**

Delete `PRESET_CVS`, quick-fill buttons, and prefilled `cvInputText`/target role. Start both as empty strings. The quick-review submit remains disabled until the minimum real input length is met.

Replace `target_role: cvData.personalInfo.title || 'Senior Software Engineer'` with `target_role: cvData.personalInfo.title.trim() || undefined`.

- [ ] **Step 5: Verify empty initialization and static quality**

Run:

```powershell
rg -n "SAMPLE_HARVARD_CV|PRESET_CVS|NGUYỄN VĂN MINH|candidate\.nam@gmail\.com|cloudsync-demo" src/frontend/src
npm.cmd exec eslint -- src/types/cv.ts src/components/cv/CVInteractiveStudio.tsx src/app/'(candidate)'/candidate/discovery/page.tsx src/components/member/MemberSettingsTab.tsx
npm.cmd exec tsc -- --noEmit --pretty false
```

Expected: no sample-data matches; lint and typecheck pass for these files.

- [ ] **Step 6: Commit the empty CV model**

```powershell
git add -- src/frontend/src/types/cv.ts src/frontend/src/components/cv/CVInteractiveStudio.tsx src/frontend/src/app/'(candidate)'/candidate/discovery/page.tsx src/frontend/src/components/member/MemberSettingsTab.tsx
git commit -m "refactor: initialize CVs from user-owned data"
```

---

### Task 9: Decompose and harden Candidate Portal navigation and async states

**Files:**
- Create: `src/frontend/src/lib/candidateNavigation.ts`
- Create: `src/frontend/src/components/candidate/CandidatePortalTabs.tsx`
- Create: `src/frontend/src/components/candidate/CandidateJobsPanel.tsx`
- Create: `src/frontend/src/components/candidate/CandidateApplicationsPanel.tsx`
- Create: `src/frontend/src/components/candidate/CandidateQuickReviewPanel.tsx`
- Create: `src/frontend/src/components/candidate/CandidateApplyDialog.tsx`
- Modify: `src/frontend/src/app/(candidate)/candidate/layout.tsx`
- Modify: `src/frontend/src/app/(candidate)/candidate/discovery/page.tsx`

**Interfaces:**
- Produces `CandidateTab = 'cv' | 'jobs' | 'applications'` and:

```ts
export function resolveCandidateTab(tab: string | null): CandidateTab {
  return tab === 'jobs' || tab === 'applications' ? tab : 'cv';
}
```

- Panels consume typed data/callback props and do not fetch independently; the page remains the orchestration boundary.

- [ ] **Step 1: Read the local Next.js routing guide**

Run:

```powershell
Get-Content -Raw src/frontend/node_modules/next/dist/docs/01-app/03-building-your-application/01-routing/04-linking-and-navigating.md
```

If that path differs in Next 16.2.12, locate the corresponding `Link`, `usePathname`, and `useSearchParams` guide under `node_modules/next/dist/docs` before editing.

- [ ] **Step 2: Extract tab resolution and fixed-width navigation**

Both layout and page use `resolveCandidateTab(searchParams.get('tab'))`. `CandidatePortalTabs` renders three links with `shrink-0 w-44`, `truncate`, and full `title`. On mobile, wrap them in `overflow-x-auto`; on desktop, keep them stable without count-driven width.

- [ ] **Step 3: Split display panels from orchestration**

Use explicit props, for example:

```ts
interface CandidateJobsPanelProps {
  openings: PublicJobOpening[];
  isLoading: boolean;
  errorMessage: string | null;
  searchKeyword: string;
  onSearchKeywordChange: (value: string) => void;
  onSearch: () => void;
  onApply: (opening: PublicJobOpening) => void;
  onRetry: () => void;
}
```

Applications and quick review follow the same pattern with typed callbacks. The apply dialog owns only form-local values and submits a typed payload upward.

- [ ] **Step 4: Make request state explicit**

Add error state for openings, applications, saved resumes, CV review, and apply. Use an `AbortController` for search requests and an `isMounted`/abort cleanup for initial loads. Do not log-and-hide failures.

Each panel renders skeleton, empty, error, and success states. Disable and width-lock submit/retry controls while requests are pending.

- [ ] **Step 5: Correct account rendering**

The header shows user name/avatar only when `authUser` or candidate application identity exists. Otherwise render a fixed-width “Đăng nhập” link; do not render a fabricated “Ứng viên” account card.

- [ ] **Step 6: Verify routing, lint, and types**

Run:

```powershell
npm.cmd exec eslint -- src/lib/candidateNavigation.ts src/components/candidate src/app/'(candidate)'/candidate/layout.tsx src/app/'(candidate)'/candidate/discovery/page.tsx
npm.cmd exec tsc -- --noEmit --pretty false
```

Manual checks:

```text
/candidate/discovery?tab=cv            -> only CV tab active
/candidate/discovery?tab=jobs          -> only Jobs tab active
/candidate/discovery?tab=applications  -> only Applications tab active
/candidate/discovery?tab=unknown       -> CV tab active
```

- [ ] **Step 7: Commit the Candidate Portal decomposition**

```powershell
git add -- src/frontend/src/lib/candidateNavigation.ts src/frontend/src/components/candidate src/frontend/src/app/'(candidate)'/candidate/layout.tsx src/frontend/src/app/'(candidate)'/candidate/discovery/page.tsx
git commit -m "refactor: harden candidate portal navigation and states"
```

---

### Task 10: Share interview session UI and harden scorecard/archive interactions

**Files:**
- Create: `src/frontend/src/components/recruitment/InterviewSessionsPanel.tsx`
- Modify: `src/frontend/src/components/admin/RecruitmentTab.tsx`
- Modify: `src/frontend/src/components/manager/ManagerRecruitmentTab.tsx`
- Modify: `src/frontend/src/components/meetings/InterviewScorecardModal.tsx`
- Modify: `src/frontend/src/lib/interviewRubric.ts`
- Modify: `src/frontend/src/components/archive/MeetingArchiveRepository.tsx`

**Interfaces:**
- Consumes `InterviewSession` from `recruitment-api.ts` and `InterviewScorecard` from `interviewRubric.ts`.
- Produces:

```ts
interface InterviewSessionsPanelProps {
  sessions: InterviewSession[];
  onOpenScorecard: (sessionId: string) => void;
}
```

- [ ] **Step 1: Extract the duplicated session list**

Move the repeated Admin/Manager markup into `InterviewSessionsPanel`. Use fixed-width actions:

```text
Join:      w-28, title="Vào phòng phỏng vấn"
Scorecard: w-36, trigger label="Bảng điểm", full title in title attribute
```

Status labels are short (`Hoàn tất`, `Đang diễn ra`, `Đã lên lịch`), truncated, and dimension-locked. Detailed descriptions stay inside the panel body, not the trigger.

- [ ] **Step 2: Separate scorecard loading, empty, error, and success**

Do not use `isLoading || !internalScorecard` as one spinner branch. Model state as:

```ts
type ScorecardLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; scorecard: InterviewScorecard };
```

An API `404` maps to empty (“Chưa có bảng điểm”), other failures map to retryable error, and success renders scorecard. Remove `alert`; archive errors render inline and keep the modal open.

- [ ] **Step 3: Normalize scorecard visual language**

Use blue for primary tab/action, semantic colors for grade/result, and no purple primary surfaces. Give scorecard/script tabs a fixed `w-40`, `truncate`, and `title`. Ensure close control has `aria-label="Đóng bảng điểm"`; modal content scrolls inside `max-h-[90dvh]`.

- [ ] **Step 4: Lock Archive category filters**

Change category buttons to fixed desktop widths with compact trigger labels:

```text
All:       w-40, “Tất cả”
Official:  w-44, “Cuộc họp”
Interview: w-44, “Phỏng vấn”
```

Counts sit in a reserved-width child (`w-7 tabular-nums`). Add full `title` text and remove purple active styling. Loading uses card-shaped skeletons instead of a spinner-only blank panel.

- [ ] **Step 5: Verify shared UI and no blocking alerts**

Run:

```powershell
rg -n "interview_sessions\.map|alert\(" src/frontend/src/components/admin/RecruitmentTab.tsx src/frontend/src/components/manager/ManagerRecruitmentTab.tsx src/frontend/src/components/meetings/InterviewScorecardModal.tsx
npm.cmd exec eslint -- src/components/recruitment/InterviewSessionsPanel.tsx src/components/admin/RecruitmentTab.tsx src/components/manager/ManagerRecruitmentTab.tsx src/components/meetings/InterviewScorecardModal.tsx src/lib/interviewRubric.ts src/components/archive/MeetingArchiveRepository.tsx
npm.cmd exec tsc -- --noEmit --pretty false
```

Expected: duplicated maps and `alert` are absent; lint/typecheck pass for touched files.

- [ ] **Step 6: Commit the shared interview experience**

```powershell
git add -- src/frontend/src/components/recruitment/InterviewSessionsPanel.tsx src/frontend/src/components/admin/RecruitmentTab.tsx src/frontend/src/components/manager/ManagerRecruitmentTab.tsx src/frontend/src/components/meetings/InterviewScorecardModal.tsx src/frontend/src/lib/interviewRubric.ts src/frontend/src/components/archive/MeetingArchiveRepository.tsx
git commit -m "refactor: unify interview scorecard experience"
```

---

### Task 11: Stabilize real-time hooks and eliminate effect-driven render loops

**Files:**
- Modify: `src/frontend/src/hooks/useMeetingEvents.ts`
- Modify: `src/frontend/src/hooks/useWebSpeech.ts`
- Modify: `src/frontend/src/components/member/MemberSettingsTab.tsx`
- Modify: `src/frontend/src/components/meetings/InterviewScorecardModal.tsx`
- Modify: `src/frontend/src/app/(auth)/register/page.tsx`

**Interfaces:**
- Produces stable reconnect scheduling through a ref and lazy initial support detection for Web Speech.
- Consumes `getErrorMessage(error: unknown, fallback)` from Task 5.

- [ ] **Step 1: Capture current React lint failures**

Run:

```powershell
npm.cmd exec eslint -- src/hooks/useMeetingEvents.ts src/hooks/useWebSpeech.ts src/components/member/MemberSettingsTab.tsx src/components/meetings/InterviewScorecardModal.tsx src/app/'(auth)'/register/page.tsx
```

Expected: `react-hooks/immutability`, `react-hooks/set-state-in-effect`, or explicit-`any` failures.

- [ ] **Step 2: Make meeting reconnect self-referential through a ref**

Use:

```ts
const connectRef = useRef<() => void>(() => undefined);

const connect = useCallback(() => {
  // existing connection setup
  reconnectTimeoutRef.current = window.setTimeout(() => connectRef.current(), 5000);
}, [meetingId, enabled]);

useEffect(() => {
  connectRef.current = connect;
}, [connect]);
```

Cleanup closes the event source/socket and clears the timeout exactly once.

- [ ] **Step 3: Initialize browser support without a synchronous effect setState**

Use a lazy initializer:

```ts
const [isSupported] = useState(
  () => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
);
```

The setup effect returns early when unsupported without setting state. Replace caught `any` values with `unknown` and narrow them.

- [ ] **Step 4: Move fetch starts to cancellable effect-local async functions**

For Member Settings, Scorecard, and Register invitation loading, define the async function inside the effect, use an `AbortController` or `cancelled` flag, and only set state from resolved/rejected callbacks when still active. Reset state from the user action that changes tabs/token, not synchronously at the top of the effect.

- [ ] **Step 5: Re-run focused lint and typecheck**

Run:

```powershell
npm.cmd exec eslint -- src/hooks/useMeetingEvents.ts src/hooks/useWebSpeech.ts src/components/member/MemberSettingsTab.tsx src/components/meetings/InterviewScorecardModal.tsx src/app/'(auth)'/register/page.tsx
npm.cmd exec tsc -- --noEmit --pretty false
```

Expected: zero errors in this focused set.

- [ ] **Step 6: Commit hook stabilization**

```powershell
git add -- src/frontend/src/hooks/useMeetingEvents.ts src/frontend/src/hooks/useWebSpeech.ts src/frontend/src/components/member/MemberSettingsTab.tsx src/frontend/src/components/meetings/InterviewScorecardModal.tsx src/frontend/src/app/'(auth)'/register/page.tsx
git commit -m "fix: stabilize frontend async effects"
```

---

### Task 12: Add a repository guardrail against runtime mock-data regressions

**Files:**
- Create: `src/backend/tests/test_runtime_data_integrity.py`

**Interfaces:**
- Produces a source-level regression test scoped to production backend/frontend paths.
- Allows explicit seeds, test fixtures, documentation, visual template assets, and form placeholder text.

- [ ] **Step 1: Write the guardrail with explicit banned tokens**

Use repository-relative production paths and exclusions:

```python
BANNED_RUNTIME_TOKENS = (
    "mockAdminData",
    "workloadProtocolData",
    "SAMPLE_KNOWLEDGE_BASE",
    "SAMPLE_HARVARD_CV",
    "PRESET_CVS",
    "2846981f-7028-4ef4-9cad-d2c3719703c4",
    "is_mock",
)

def test_production_sources_do_not_reference_runtime_mock_data():
    violations: list[str] = []
    for root in (REPO_ROOT / "src/backend/api", REPO_ROOT / "src/backend/core", REPO_ROOT / "src/frontend/src"):
        for path in (*root.rglob("*.py"), *root.rglob("*.ts"), *root.rglob("*.tsx")):
            text = path.read_text(encoding="utf-8")
            for token in BANNED_RUNTIME_TOKENS:
                if token in text:
                    violations.append(f"{path.relative_to(REPO_ROOT)}: {token}")
    assert violations == []
```

Add a second targeted assertion that known seed credentials do not occur under `src/frontend/src` or backend authorization modules. Do not ban them from `src/backend/seeds`, tests, or docs.

- [ ] **Step 2: Run the guardrail and resolve only real production violations**

Run:

```powershell
uv run pytest src/backend/tests/test_runtime_data_integrity.py -q
```

Expected: pass. If it fails, remove the production shortcut rather than weakening the token list, unless the match is a documented allowed visual placeholder.

- [ ] **Step 3: Run all focused backend suites together**

Run:

```powershell
uv run pytest src/backend/tests/test_runtime_identity_authorization.py src/backend/tests/test_meeting_content_integrity.py src/backend/tests/test_knowledge_search.py src/backend/tests/test_candidate_discovery_portal.py src/backend/tests/test_recruitment_permissions.py src/backend/tests/test_recruitment_e2e.py src/backend/tests/test_runtime_data_integrity.py -q
```

Expected: all tests pass.

- [ ] **Step 4: Commit the regression guard**

```powershell
git add -- src/backend/tests/test_runtime_data_integrity.py
git commit -m "test: prevent runtime mock data regressions"
```

---

### Task 13: Final frontend quality gate, production build, and Docker refresh

**Files:**
- Modify only files reported by the focused linters when the error is caused by this implementation.
- Do not reformat or refactor unrelated legacy files.

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified frontend container and a clean scoped implementation diff.

- [ ] **Step 1: Format only the implementation files**

Run Prettier with the explicit changed file list from Tasks 3–11. Do not run a repository-wide rewrite:

```powershell
npm.cmd exec prettier -- --write src/app/admin/page.tsx src/app/'(auth)'/login/page.tsx src/app/'(auth)'/register/page.tsx src/app/'(candidate)'/candidate/layout.tsx src/app/'(candidate)'/candidate/discovery/page.tsx src/app/meetings/'[id]'/meeting-room-client.tsx src/components/admin src/components/archive/MeetingArchiveRepository.tsx src/components/candidate src/components/cv src/components/layout src/components/manager src/components/meetings src/components/member src/components/profile/UserProfileModal.tsx src/components/recruitment src/hooks/useMeetingEvents.ts src/hooks/useWebSpeech.ts src/lib/api.ts src/lib/candidateNavigation.ts src/lib/errors.ts src/lib/interviewRubric.ts src/types/admin.ts src/types/cv.ts
```

- [ ] **Step 2: Run the complete frontend static gates**

Run:

```powershell
npm.cmd run lint
npm.cmd exec tsc -- --noEmit --pretty false
npm.cmd run build
```

Expected: build and typecheck pass. The implementation should remove all errors in touched files. If unrelated legacy ESLint errors remain outside the touched set, record their exact file/count and separately confirm the touched-file lint command passes.

- [ ] **Step 3: Run whitespace and mock-data checks**

From the repository root:

```powershell
git diff --check
uv run pytest src/backend/tests/test_runtime_data_integrity.py -q
```

Expected: no whitespace errors in implementation files and the guardrail passes.

- [ ] **Step 4: Rebuild the required frontend container**

From the repository root:

```powershell
docker compose up -d --build frontend
docker compose ps frontend
```

Expected: the frontend container is running/healthy and serves `http://localhost:3001`.

- [ ] **Step 5: Perform the manual acceptance pass**

Verify:

```text
Login: no demo credential panel; real role controls redirect.
Admin: no seeded stats/org; departments show real zero/real counts; policies are honestly unavailable.
Knowledge: recent transcript, real search, empty and error states.
Candidate: direct URLs activate the correct fixed-width tab.
CV: new CV begins empty except authenticated identity fields.
Recruitment: Admin and Manager share session UI; scorecard shows loading/empty/error/success.
Archive: fixed-width filters do not shift when counts change.
Meeting: no task is synthesized without transcript/chat/agenda evidence.
```

- [ ] **Step 6: Review the final diff without disturbing unrelated work**

Run:

```powershell
git status --short
git diff --stat
git diff --check
```

Confirm every deletion is limited to runtime mock/dead demo modules and every existing untracked user asset remains present.

- [ ] **Step 7: Close verification without staging unrelated work**

If final verification required no correction, create no empty verification commit. If it exposed a correction, return to the task that owns that file, rerun that task's test command, and use the explicit staging command already written in that task. Never use `git add -A` or a dynamically generated file list.
