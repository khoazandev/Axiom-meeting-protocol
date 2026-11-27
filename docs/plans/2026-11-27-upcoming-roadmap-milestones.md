# Upcoming Roadmap Milestones Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Triển khai tuần tự các giai đoạn tiếp theo của hệ thống Axiom DX-OS bao gồm hợp nhất Git release, refactor Analytics API đa tổ chức, kết nối hệ thống thông báo thời gian thực (SSE Notifications), gia cố lưu trữ tệp đính kèm và nâng cấp tìm kiếm ngữ nghĩa trong Kho Tri thức.

**Architecture:** Sử dụng kiến trúc module hóa theo chuẩn Domain-Driven Design (DDD). Toàn bộ API kế thừa mô hình phân quyền bảo mật Enterprise đa tổ chức (`organization_id`), loại bỏ hoàn toàn các trường dữ liệu di sản (legacy workspaces), lưu trữ phân tầng tệp đính kèm và đồng bộ sự kiện qua cơ chế Server-Sent Events (SSE) nhẹ nhàng, chịu tải cao.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL, Pydantic V2, pytest, Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS v4, Docker Compose.

---

## Danh mục các Giai đoạn theo Thứ tự Ưu tiên (Phase Overview)

| Giai đoạn | Tên Giai đoạn & Mục tiêu | Độ ưu tiên | Trọng tâm kỹ thuật |
|---|---|---|---|
| **Giai đoạn 1** | **Git Release & Branch Integration** | 🔴 P0 (Bắt buộc) | Hợp nhất `feature/replace-mock-with-real-apis` vào nhánh `develop` |
| **Giai đoạn 2** | **Analytics API Refactor & Multi-Tenant Migration** | 🟠 P1 (Rất cao) | Chuyển đổi `analytics.py` sang `organization_id`, kích hoạt lại router |
| **Giai đoạn 3** | **Real-Time Notification System Integration** | 🟡 P2 (Cao) | Kích hoạt sự kiện thông báo khi giao task/họp và nối frontend SSE |
| **Giai đoạn 4** | **Attachment Storage Hardening & Retention Controls** | 🟢 P3 (Trung bình) | Kiểm soát hạn ngạch 25MB, whitelist MIME types, dọn dẹp file rác |
| **Giai đoạn 5** | **Semantic Hybrid Search in Knowledge Base** | 🔵 P4 (Mở rộng) | Kết hợp FTS (Full-Text Search) và vector embeddings cho biên bản |

---

## Chi tiết Triển khai Từng Giai đoạn

---

### Giai đoạn 1: Git Release & Branch Integration (Ưu tiên P0)

Mục tiêu: Đóng gói và hợp nhất toàn bộ kết quả của nhánh tính năng `feature/replace-mock-with-real-apis` vào nhánh phát triển chung (`develop`) đảm bảo không có conflict và giữ lịch sử git sạch sẽ.

#### Task 1.1: Kiểm tra tính toàn vẹn và tạo Pull Request Baseline
**Files:**
- Test: Toàn bộ suite pytest hiện tại (`src/backend/tests/`)
- Git target: `origin/develop`

**Bước 1: Chạy toàn bộ test backend để xác nhận chất lượng trước khi merge**
```powershell
uv run pytest src/backend/tests/test_real_api_conversions.py src/backend/tests/test_jira_api.py -q
```
Expected: 100% passed (không có lỗi hồi quy).

**Bước 2: Kiểm tra trạng thái Git**
```powershell
git status
```
Expected: `nothing to commit, working tree clean`.

**Bước 3: Tạo và bàn giao Pull Request**
- URL PR: `https://github.com/khoazandev/Axiom-meeting-protocol/pull/new/feature/replace-mock-with-real-apis`
- Cập nhật thông tin PR mô tả đầy đủ: chuyển đổi mock sang real API, single-row Kanban, responsive Calendar, icon-only tab bar với tooltip.

#### Task 1.2: Merge nhánh vào develop
**Files:**
- Branch: `develop`
- Remote: `origin/develop`

**Bước 1: Chuyển sang nhánh develop và đồng bộ commit mới nhất**
```powershell
git checkout develop
git pull origin develop
```

**Bước 2: Merge nhánh feature vào develop**
```powershell
git merge --no-ff feature/replace-mock-with-real-apis -m "Merge branch 'feature/replace-mock-with-real-apis' into develop"
```

**Bước 3: Push nhánh develop đã merge lên GitHub**
```powershell
git push origin develop
```

---

### Giai đoạn 2: Refactor & Re-enable Analytics API (Ưu tiên P1)

Mục tiêu: Tái cấu trúc file `src/backend/api/v1/analytics.py` từ mô hình `workspace` cũ sang mô hình tổ chức đa người dùng (`organization_id`), thay `WorkspaceMember` bằng `OrganizationMember`, liên kết các chỉ số hiệu suất từ bảng `Meeting`, `JiraIssue`, `ActionItem` và `AuditLog`, sau đó mở lại route trong `router.py`.

#### Task 2.1: Viết bộ kiểm thử tự động (Unit Test) cho Analytics API
**Files:**
- Create: `src/backend/tests/test_analytics_api.py`

**Bước 1: Viết test thất bại (Failing Test) xác minh endpoint `/api/v1/analytics/export` và `/api/v1/analytics/summary`**
```python
import pytest
from fastapi.testclient import TestClient

def test_export_analytics_requires_admin_or_owner(client: TestClient, member_token: str, test_org):
    response = client.get(
        f"/api/v1/analytics/export?organization_id={test_org.id}",
        headers={"Authorization": f"Bearer {member_token}"}
    )
    assert response.status_code == 403

def test_export_analytics_success(client: TestClient, admin_token: str, test_org):
    response = client.get(
        f"/api/v1/analytics/export?organization_id={test_org.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert "event_type" in response.text
```

**Bước 2: Chạy test để xác nhận thất bại**
```powershell
uv run pytest src/backend/tests/test_analytics_api.py -v
```
Expected: FAIL (404 Not Found do endpoint chưa được mở trong router hoặc 500 do phụ thuộc model cũ).

#### Task 2.2: Refactor `src/backend/api/v1/analytics.py`
**Files:**
- Modify: `src/backend/api/v1/analytics.py`
- Modify: `src/backend/api/v1/router.py:57`

**Bước 1: Thay thế toàn bộ logic Workspace bằng Organization**
```python
# Cập nhật imports
from src.backend.models import AuditLog, Meeting, RoleEnum, JiraIssue, ActionItem, OrganizationMember
from src.backend.api import deps

@router.get("/export", response_class=PlainTextResponse)
def export_organization_analytics(
    organization_id: str,
    member: OrganizationMember = Depends(deps.require_org_role([RoleEnum.OWNER, RoleEnum.ADMIN])),
    db: Session = Depends(get_db),
):
    # Lấy meetings theo organization_id
    meetings = db.query(Meeting).filter(Meeting.organization_id == organization_id).all()
    # Lấy tasks/action items theo organization_id
    issues = db.query(JiraIssue).filter(JiraIssue.organization_id == organization_id).all()
    # Lấy audit logs
    audits = db.query(AuditLog).filter(AuditLog.organization_id == organization_id).all()
    ...
```

**Bước 2: Mở lại router trong `src/backend/api/v1/router.py`**
Bỏ comment dòng 57:
```python
from src.backend.api.v1.analytics import router as analytics_router
...
api_v1_router.include_router(analytics_router)
```

**Bước 3: Chạy lại test để xác nhận thành công**
```powershell
uv run pytest src/backend/tests/test_analytics_api.py -v
```
Expected: PASS.

**Bước 4: Commit thay đổi**
```powershell
git add src/backend/api/v1/analytics.py src/backend/api/v1/router.py src/backend/tests/test_analytics_api.py
git commit -m "feat(analytics): refactor analytics endpoints to multi-tenant schema and re-enable router"
```

---

### Giai đoạn 3: Real-Time Notification System Integration (Ưu tiên P2)

Mục tiêu: Tự động phát sinh bản ghi thông báo và broadcast qua SSE (`Server-Sent Events`) khi có sự kiện quan trọng: được giao việc (`assignee_id`), cuộc họp mới được xếp lịch, hoặc được chuyển giao task. Nối trực tiếp chuông thông báo trên Header của Frontend vào luồng SSE.

#### Task 3.1: Thêm Event Hook tạo thông báo khi giao việc trong Jira API
**Files:**
- Modify: `src/backend/api/v1/jira.py`
- Modify: `src/backend/api/v1/notifications.py`
- Test: `src/backend/tests/test_notification_events.py`

**Bước 1: Viết test kiểm tra tự động tạo notification khi tạo/giao Issue**
```python
def test_create_issue_generates_notification(client: TestClient, admin_token: str, member_user: User, test_org):
    # Giao việc cho member_user
    payload = {
        "title": "Nhiệm vụ kiểm tra thông báo",
        "organization_id": test_org.id,
        "assignee_id": member_user.id,
        "priority": "HIGH"
    }
    res = client.post("/api/v1/jira/issues", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201

    # Kiểm tra notification của member_user
    notif_res = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {member_user.token}"})
    assert notif_res.status_code == 200
    assert any("Nhiệm vụ kiểm tra thông báo" in n["title"] for n in notif_res.json()["notifications"])
```

**Bước 2: Cập nhật hàm tạo Issue và Broadcast notification**
Trong `src/backend/api/v1/jira.py`:
```python
if issue.assignee_id and issue.assignee_id != current_user.id:
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=issue.assignee_id,
        title=f"Bạn vừa được giao nhiệm vụ: {issue.title}",
        content=f"Được giao bởi {current_user.full_name or current_user.email}",
        type="task_assignment",
        link=f"/member?tab=jira&issue={issue.id}",
        is_read=False,
    )
    db.add(notif)
    db.commit()
    broadcaster.broadcast(issue.assignee_id, notif)
```

**Bước 3: Chạy test xác nhận**
```powershell
uv run pytest src/backend/tests/test_notification_events.py -v
```
Expected: PASS.

#### Task 3.2: Tích hợp SSE Hook trên Frontend Header
**Files:**
- Modify: `src/frontend/src/components/layout/app-header.tsx`
- Modify: `src/frontend/src/lib/api.ts`

**Bước 1: Bổ sung hook lắng nghe `EventSource` từ `/api/v1/notifications/stream`**
Khi user đăng nhập:
```typescript
useEffect(() => {
  if (!token) return;
  const eventSource = new EventSource(`/api/v1/notifications/stream?token=${token}`);
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setUnreadCount((prev) => prev + 1);
    toast.info(data.title);
  };
  return () => eventSource.close();
}, [token]);
```

**Bước 2: Commit thay đổi**
```powershell
git add src/backend/api/v1/jira.py src/frontend/src/components/layout/app-header.tsx
git commit -m "feat(notifications): trigger real-time SSE alerts on task assignment"
```

---

### Giai đoạn 4: Attachment Storage Hardening & Retention Controls (Ưu tiên P3)

Mục tiêu: Đảm bảo volume `/app/storage/attachments` an toàn tuyệt đối, chống tấn công Path Traversal, kiểm soát chặt chẽ danh sách định dạng MIME cho phép (PDF, DOCX, XLSX, PNG, JPG, ZIP), và cung cấp dịch vụ định kỳ dọn dẹp các tệp mồ côi (orphaned files).

#### Task 4.1: Thắt chặt Validation MIME Type và File Magic
**Files:**
- Modify: `src/backend/api/v1/jira.py:120-170`
- Test: `src/backend/tests/test_attachment_security.py`

**Bước 1: Viết test từ chối file độc hại (Failing Test)**
```python
def test_reject_executable_attachment(client: TestClient, admin_token: str, test_issue):
    files = {"file": ("malicious.exe", b"MZ......", "application/x-dosexec")}
    res = client.post(f"/api/v1/jira/issues/{test_issue.id}/attachments", files=files, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400
    assert "Định dạng tệp không được hỗ trợ" in res.json()["detail"]
```

**Bước 2: Cài đặt Whitelist định dạng an toàn trong `jira.py`**
```python
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".csv", ".txt", ".png", ".jpg", ".jpeg", ".zip"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv", "text/plain", "image/png", "image/jpeg", "application/zip"
}
```

**Bước 3: Chạy test bảo mật**
```powershell
uv run pytest src/backend/tests/test_attachment_security.py -v
```
Expected: PASS.

**Bước 4: Commit**
```powershell
git add src/backend/api/v1/jira.py src/backend/tests/test_attachment_security.py
git commit -m "security(storage): enforce mime-type whitelist and anti-traversal validation"
```

---

### Giai đoạn 5: Semantic Hybrid Search in Knowledge Base (Ưu tiên P4)

Mục tiêu: Nâng cấp tìm kiếm trong Kho Tài Liệu & Tri Thức (`/api/v1/knowledge/search`). Không chỉ so sánh chuỗi ký tự cơ bản mà kết hợp tìm kiếm ngữ nghĩa (Semantic Search) thông qua embedding của mô hình câu hỏi và nội dung biên bản cuộc họp.

#### Task 5.1: Xây dựng Service Hybrid Search kết hợp FTS và Vector Chunks
**Files:**
- Modify: `src/backend/services/embedding_service.py`
- Modify: `src/backend/api/v1/knowledge.py`
- Test: `src/backend/tests/test_hybrid_knowledge_search.py`

**Bước 1: Viết test tìm kiếm ngữ nghĩa theo ý nghĩa câu hỏi**
```python
def test_semantic_query_retrieves_relevant_transcript(client: TestClient, member_token: str, test_org):
    # Tìm kiếm với từ đồng nghĩa không trùng chữ chính xác
    res = client.get(
        f"/api/v1/knowledge/search?query=chiến lược doanh thu quý tới&organization_id={test_org.id}",
        headers={"Authorization": f"Bearer {member_token}"}
    )
    assert res.status_code == 200
    results = res.json()["matches"]
    assert len(results) > 0
```

**Bước 2: Tích hợp hàm chấm điểm Cosine Similarity trong `knowledge.py`**
- Truy xuất các đoạn `knowledge_chunks` và `transcript_segments` có liên quan.
- Chấm điểm kết hợp BM25/FTS và khoảng cách vector.
- Trả về danh sách kết quả kèm nhãn ngữ cảnh và timestamp cuộc họp.

**Bước 3: Chạy test xác nhận**
```powershell
uv run pytest src/backend/tests/test_hybrid_knowledge_search.py -v
```
Expected: PASS.

#### Task 5.2: Tái build Docker Container và Kiểm thử Toàn diện hệ thống
**Files:**
- Execute: `docker compose up -d --build frontend`
- URL: `http://localhost:3001`

**Bước 1: Chạy build lại frontend**
```powershell
docker compose up -d --build frontend
```

**Bước 2: Kiểm tra trạng thái phản hồi HTTP 200**
```powershell
curl.exe -I http://localhost:3001
```

**Bước 3: Commit hoàn thành kế hoạch**
```powershell
git add docs/plans/2026-11-27-upcoming-roadmap-milestones.md
git commit -m "docs(plans): complete roadmap implementation plan with prioritized phases"
```

---

## Tiêu chí Nghiệm thu Tổng thể (Acceptance Criteria)

1. **Git:** Nhánh `feature/replace-mock-with-real-apis` được merge an toàn vào `develop` không xảy ra conflict.
2. **Analytics:** Router `/api/v1/analytics` xuất báo cáo dữ liệu đa tổ chức sạch sẽ, trả mã 200 với admin/owner và 403 với member thông thường.
3. **Notifications:** Khi giao task mới từ Kanban hoặc lịch họp, thành viên nhận được thông báo SSE trên frontend trong vòng dưới 500ms.
4. **Storage:** Từ chối 100% các tệp đính kèm chứa mã thực thi nguy hiểm (`.exe`, `.sh`, `.bat`, script không nằm trong whitelist) và chặn vượt quá 25MB.
5. **Knowledge Search:** Trả về kết quả tìm kiếm ngữ nghĩa chính xác theo nội dung cuộc thảo luận thực tế.
