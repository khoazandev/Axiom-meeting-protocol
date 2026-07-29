# Minimum Viable Product (MVP) - Axiom (DX-OS)

**Dự án thi đấu: Olympic Phần mềm Nguồn mở 2026**
**Chủ đề:** Hệ Điều Hành Doanh Nghiệp Số (DX-OS)
**Kiến trúc cốt lõi:** H (Human) - P (Process) - D (Data) - I (Intelligence)

---

## 1. Mục Tiêu Của MVP

Chứng minh được khái niệm (Proof of Concept) của một nền tảng hội nghị truyền hình dành cho doanh nghiệp B2B, trong đó công nghệ AI không chỉ "nằm ngoài lề" mà được nhúng sâu vào để ép buộc quy trình (Process Gate), số hóa con người (Human), và bảo vệ luồng dữ liệu thật (Data Sovereign).

## 2. Phạm Vi Tính Năng MVP (Theo Kiến Trúc DX-OS)

### 🧑‍💻 Lớp H (Human - Trải nghiệm Con người)

_Nơi con người tương tác với hệ thống._

- **Giao diện (Frontend):**
  - UI/UX chuẩn Taste Skill B2B SaaS cao cấp (Tông màu Electric Blue, font Geist, độ tương phản cao).
  - Trang Dashboard quản lý danh sách cuộc họp hiện đại (Bento Grid).
- **Hội nghị Video (Video Conferencing):**
  - Tích hợp Jitsi Meet API (Iframe) hoạt động trơn tru ngay trên trình duyệt mà không cần cài đặt app thứ 3.
  - Hỗ trợ phòng họp nhiều người, bật/tắt mic và camera cơ bản.

### ⚙️ Lớp P (Process - Rào chắn Quy trình)

_Hệ thống ép buộc con người phải làm việc có cấu trúc._

- **Tạo Cuộc Họp Có Điều Kiện (Agenda Gate):**
  - Người dùng không thể tạo cuộc họp nếu không có Agenda (Chương trình họp).
  - Backend API xác thực: Bắt buộc độ dài Agenda phải ≥ 20 ký tự (Đã phát triển qua quy trình TDD chuẩn).
- **Trình Bày Trong Họp:**
  - Agenda luôn luôn hiển thị bên phải màn hình họp (Split-layout) để đảm bảo không ai đi chệch hướng nội dung.

### 🧠 Lớp I (Intelligence - Trí tuệ Nhân tạo)

_AI làm nhiệm vụ trợ lý số tự động hóa._

- **Bóc Băng Ghi Âm (Transcription):**
  - Sử dụng mô hình AI (Whisper) để chuyển đổi giọng nói trong cuộc họp thành văn bản (Text) một cách tự động (Tính năng Mockup/Beta trong MVP).
- **Tóm Tắt Tự Động (AI Summary & Action Items):**
  - Gọi LLM (Llama-3 / GPT-4) xử lý đoạn Transcript để tạo ra: Quyết định của cuộc họp, và các công việc cần làm (Action Items).

### 🔒 Lớp D (Data - Dữ Liệu Sự Thật)

_Lưu trữ an toàn, on-premise._

- **Cơ sở dữ liệu (Database):**
  - Lưu trữ toàn bộ thông tin (Title, Agenda, Thời gian, Trạng thái) bằng SQLite / PostgreSQL qua SQLAlchemy.
  - Đảm bảo dữ liệu (đặc biệt là Transcript và Summary) không bị rò rỉ ra bên ngoài (định hướng On-Premise 100%).

---

## 3. Lộ Trình Triển Khai (Roadmap cho Team)

1. **Sprint 1 (Hoàn tất):** Khởi tạo khung dự án Next.js & FastAPI. Chốt UI/UX Taste Skill, định hình CSDL.
2. **Sprint 2 (Hoàn tất):** Viết TDD Backend cho Agenda Gate. Xây dựng trang Create Meeting và tích hợp Jitsi Meet.
3. **Sprint 3 (Tiếp theo):**
   - Viết tính năng mô phỏng hoặc tích hợp thật Whisper AI (Python backend) để đẩy Transcript thời gian thực / sau cuộc họp.
   - Trả kết quả tóm tắt bằng LLM và lưu vào CSDL (Lớp D & I).
4. **Sprint 4 (Hoàn thiện):**
   - Thêm tính năng đăng nhập (Auth) đơn giản để định danh người tạo cuộc họp.
   - Sửa lỗi (Bugs) và quay Video Demo thuyết trình gửi Ban Tổ Chức Olympic.

---

## 4. Tiêu Chí Đánh Giá Thành Công Của MVP (10/10)

- **Tính khả thi:** Hệ thống chạy trơn tru, Jitsi load nhanh, API phản hồi < 200ms.
- **Tính kỷ luật (Code Quality):** Code Backend 100% tuân thủ Red-Green-Refactor TDD. Frontend chuẩn Tailwind v4 & Shadcn không có mã thừa.
- **Tính đột phá (DX-OS Topic):** Khác với các app Zoom/Meet thông thường, hệ thống này làm nổi bật được "Rào chắn quy trình" (bắt buộc nhập Agenda) và "Dữ liệu thông minh" (AI Tóm tắt), đúng trọng tâm đề thi.
