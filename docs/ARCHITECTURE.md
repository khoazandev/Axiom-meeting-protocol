# Kiến Trúc Hệ Thống (Architecture)

Tài liệu này mô tả chi tiết về mặt kỹ thuật cho dự án Axiom, được xây dựng dựa trên lõi kiến trúc DX-OS (Hệ Điều Hành Doanh Nghiệp Số).

## 1. Mô Hình Tổng Quan H-P-D-I

Smart Meeting AI không thiết kế các tính năng một cách ngẫu nhiên. Mọi đoạn code và Component đều phải trả lời được câu hỏi: Nó phục vụ cho Lớp (Layer) nào trong DX-OS?

### 🧑‍💻 Lớp H (Human - Con Người)

Lớp tương tác trực tiếp với người dùng, tập trung vào UX/UI sạch sẽ (Clean UI).

- **Công nghệ:** Next.js 14 (App Router), React 19, Tailwind CSS v4, Shadcn UI.
- **Quy chuẩn Design:** B2B Enterprise SaaS (Taste Skill), Focus Mode, màu Electric Blue (#2563eb).
- **Thực thi chính:** `frontend/src/app/`

### ⚙️ Lớp P (Process - Rào chắn Quy trình)

Lớp Business Logic ép buộc người dùng phải tuân thủ kỷ luật (VD: Không có Agenda thì không được họp).

- **Công nghệ:** FastAPI, Pydantic (Data Validation).
- **Quy chuẩn Code:** TDD (Test-Driven Development) bảo vệ các rào chắn này qua `pytest`.
- **Thực thi chính:** `backend/main.py` và `backend/test_main.py`

### 🧠 Lớp I (Intelligence - Trí Tuệ AI)

Lớp trợ lý số, hoạt động ngầm (Background Task).

- **Công nghệ:** OpenAI Whisper (Bóc băng offline), Llama-3 (Tóm tắt offline/on-premise).
- **Quy trình:** Khi cuộc họp kết thúc, Background Worker của FastAPI sẽ gọi AI Models xử lý file âm thanh Jitsi xuất ra.

### 🔒 Lớp D (Data - Dữ Liệu Sự Thật)

Lớp lưu trữ tập trung, bảo mật cao nhất, cấm rò rỉ ra public cloud.

- **Công nghệ:** SQLite (Dev) -> PostgreSQL (Prod), SQLAlchemy ORM.
- **Thực thi chính:** `backend/models.py`, `backend/database.py`

---

## 2. Sơ Đồ Hệ Thống (System Flow)

```mermaid
graph TD
    User([Người dùng]) -->|Tương tác UI| Frontend[Next.js Frontend]
    Frontend -->|POST /api/meetings/| Backend[FastAPI Backend]

    Backend -->|Validate Agenda (Process Gate)| DB[(Database: SQLite/PostgreSQL)]

    User -->|Vào phòng họp| Jitsi[Jitsi Meet IFrame]
    Jitsi -->|Streaming Audio/Video| JitsiServer[Jitsi Server On-Premise]

    JitsiServer -->|Recordings| AI_Worker[AI Background Task]
    AI_Worker -->|Whisper| Transcript(Văn bản thô)
    Transcript -->|LLaMA 3| Summary(Tóm tắt & Action Items)

    Summary --> DB
```

## 3. Lý Do Chọn Công Nghệ

- **Next.js + Tailwind:** Tốc độ phát triển cực nhanh, hỗ trợ Server Components tối ưu SEO (nếu cần) và bảo mật mã nguồn tĩnh.
- **FastAPI:** Hiệu năng cao (Async), tự động sinh tài liệu Swagger (OpenAPI), tích hợp cực tốt với các mô hình AI Python.
- **Jitsi Meet:** Mã nguồn mở, hỗ trợ self-hosting hoàn toàn 100% để đảm bảo yếu tố "Data Sovereign" (Chủ quyền dữ liệu) cho doanh nghiệp.
