# TÀI LIỆU THUYẾT MINH SẢN PHẨM
# AXIOM DX-OS: HỆ ĐIỀU HÀNH NGHI THỨC CUỘC HỌP SỐ DOANH NGHIỆP
## (Axiom Enterprise Meeting Protocol)

---

> **Tên sản phẩm:** Hệ điều hành nghi thức cuộc họp số doanh nghiệp Axiom (Axiom DX-OS)  
> **Phiên bản:** 2.4 (Enterprise On-Premise Edition)  
> **Lĩnh vực:** Công nghệ thông tin – Chuyển đổi số doanh nghiệp (Enterprise Collaboration, Process Automation & Applied AI)  
> **Kiến trúc cốt lõi:** Mô hình 4 tầng H-P-D-I (Human – Process – Data – Intelligence)  
> **Giấy phép mã nguồn:** MIT License (100% Open-Source)  

---

## MỤC LỤC TỔNG QUAN

1. [Bài toán và Vấn đề thực tế cần giải quyết](#1-bài-toán-và-vấn-đề-thực-tế-cần-giải-quyết)
2. [Giải pháp và Các chức năng chính của sản phẩm](#2-giải-pháp-và-các-chức-năng-chính-của-sản-phẩm)
3. [Công nghệ sử dụng trong hệ thống](#3-công-nghệ-sử-dụng-trong-hệ-thống)
4. [Cách ứng dụng AI và Tự động hóa trong sản phẩm](#4-cách-ứng-dụng-ai-và-tự-động-hóa-trong-sản-phẩm)
5. [Giá trị và Khả năng ứng dụng đối với doanh nghiệp](#5-giá-trị-và-khả-năng-ứng-dụng-đối-với-doanh-nghiệp)
6. [Liên kết mã nguồn dự án](#6-liên-kết-mã-nguồn-dự-án)

---

## 1. BÀI TOÁN VÀ VẤN ĐỀ THỰC TẾ CẦN GIẢI QUYẾT

Trong kỷ nguyên chuyển đổi số và xu hướng làm việc linh hoạt (Hybrid / Remote Work), hội nghị trực tuyến và các cuộc họp nội bộ đã trở thành huyết mạch giao tiếp hàng ngày của mọi tổ chức. Tuy nhiên, các doanh nghiệp đang phải đối mặt với **5 bài toán nhức nhối** chưa có lời giải trọn vẹn:

### 1.1. Vấn nạn "Họp rác" và sự suy kiệt kỷ luật tổ chức (Meeting Bloat & Lack of Discipline)
* **Thực trạng:** Các nghiên cứu từ *Harvard Business Review* và *Doodle Index* chỉ ra rằng, cấp quản lý và nhân sự chuyên môn dành từ 35% đến 55% quỹ thời gian mỗi tuần chỉ để ngồi trong phòng họp. Đáng báo động, có tới **67% số cuộc họp bị đánh giá là lãng phí và không hiệu quả**.
* **Nguyên nhân cốt lõi:** Các cuộc họp được lên lịch quá dễ dãi và tùy tiện, không có mục tiêu rõ ràng và hoàn toàn **thiếu một bản nghị trình (Agenda) được chuẩn bị nghiêm túc trước khi diễn ra**. Thành viên tham gia trong trạng thái thụ động, nội dung thảo luận bị lan man, kéo dài vô bổ và kết thúc mà không mang lại kết quả cụ thể nào.

### 1.2. Mất chủ quyền dữ liệu và rủi ro rò rỉ bí mật kinh doanh (Data Sovereignty & Security Risks)
* **Thực trạng:** Đại đa số doanh nghiệp hiện nay đang phụ thuộc vào các nền tảng họp video SaaS trên nền tảng đám mây công cộng của nước ngoài (Zoom, Google Meet, Microsoft Teams).
* **Hiểm họa tiềm ẩn:** Những cuộc họp cấp cao bàn về chiến lược kinh doanh, báo cáo tài chính, bí quyết công nghệ, sáng chế và hồ sơ nhân sự đều được truyền tải và lưu trữ trên các máy chủ đám mây bên thứ ba. Điều này vi phạm trực tiếp các tiêu chuẩn tuân thủ an toàn thông tin (như **ISO/IEC 27001**, **GDPR**, Luật An ninh mạng Việt Nam và các quy định an toàn dữ liệu ngành Tài chính - Ngân hàng, Cơ quan Nhà nước và Y tế) – nơi yêu cầu dữ liệu nhạy cảm **bắt buộc không được phép rời khỏi hạ tầng mạng nội bộ**.

### 1.3. Sự đứt gãy luồng thông tin và thất thoát công việc hậu cuộc họp (Post-Meeting Disconnect & Task Leakage)
* **Thực trạng:** Ghi chép biên bản cuộc họp (Minutes of Meeting - MoM) thủ công là một gánh nặng hành chính lớn. Thư ký mất từ vài giờ đến hàng ngày để tổng hợp, nghe lại băng ghi âm và soạn thảo văn bản, dễ dẫn đến sai lệch hoặc bỏ sót thông tin quan trọng.
* **Hậu quả:** Sau cuộc họp, các cam kết và đầu việc (Action Items) thường bị trôi vào các nhóm chat hoặc nằm yên trên giấy tờ. Không có sự gắn kết trực tiếp giữa quyết định trong phòng họp với hệ thống quản lý dự án thực thi (Jira, Trello, Kanban), dẫn đến tình trạng "họp xong để đó", không ai chịu trách nhiệm và không có thời hạn hoàn thành rõ ràng.

### 1.4. Rào cản ngôn ngữ và sự sai lệch thuật ngữ chuyên môn
* Trong môi trường làm việc đa quốc gia hoặc các nhóm chuyên gia đa ngành, việc giao tiếp song ngữ (Anh - Việt) thường gặp trở ngại về tốc độ truyền tải. Các công cụ dịch tự động đám mây thông dụng thường dịch máy móc, làm sai lệch hoặc "ngô nghê hóa" các thuật ngữ chuyên ngành kỹ thuật, tài chính, điều hành.

### 1.5. Quy trình tuyển dụng & phỏng vấn thiếu tính khách quan và kiểm soát 2 tầng
* Các buổi phỏng vấn tuyển dụng trực tuyến thường dựa vào cảm tính nhất thời của người phỏng vấn, thiếu dữ liệu đối soát khách quan với tiêu chí mô tả công việc (Job Opening) và thiếu cơ chế phê duyệt chặt chẽ, minh bạch giữa Trưởng bộ phận (HR Manager) và Lãnh đạo cấp cao (Owner/CEO).

---

## 2. GIẢI PHÁP VÀ CÁC CHỨC NĂNG CHÍNH CỦA SẢN PHẨM

Nhằm giải quyết triệt để các bài toán trên, **Axiom** được phát triển không phải dưới dạng một ứng dụng gọi video đơn thuần, mà là một **Hệ điều hành nghi thức cuộc họp số (Digital Enterprise Operating System - DX-OS)** với triết lý kiến trúc 4 tầng **H-P-D-I**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      H - P - D - I  ARCHITECTURE                       │
├─────────────────┬──────────────────────────────────────────────────────┤
│  🧑‍💻 H - HUMAN   │ Giao diện B2B Focus Mode, LiveKit WebRTC SFU Mesh,   │
│                 │ Phụ đề thời gian thực, Thiết kế chống nhảy layout.   │
├─────────────────┼──────────────────────────────────────────────────────┤
│  ⚙️ P - PROCESS │ Cổng kiểm duyệt Agenda Gate (≥ 20 ký tự), Phân quyền │
│                 │ tổ chức RBAC đa cấp (Owner, Manager, Member).        │
├─────────────────┼──────────────────────────────────────────────────────┤
│  🔒 D - DATA    │ 100% On-Premise / Private Cloud, PostgreSQL, Redis,  │
│                 │ Tuyệt đối không rò rỉ dữ liệu ra bên ngoài.          │
├─────────────────┼──────────────────────────────────────────────────────┤
│  🧠 I - INTELL. │ Silero VAD v5, Faster-Whisper, CTranslate2 EN↔VI,    │
│                 │ Local LLM Auto MoM, Bóc tách việc cần làm sang Jira. │
└─────────────────┴──────────────────────────────────────────────────────┘
```

### Các chức năng chính của Axiom DX-OS

#### 2.1. Cổng kiểm duyệt kỷ luật nghị trình (Agenda Gate System)
* **Triệt tiêu văn hóa "họp rác":** Hệ thống thiết lập một rào chắn logic nghiệp vụ (Process Gate) được kiểm soát song song ở cả Giao diện (Frontend) và Máy chủ (Backend API).
* **Nguyên tắc bất biến:** Không một người dùng nào (kể cả quản trị viên) có thể khởi tạo phòng họp nếu không điền đầy đủ nội dung nghị trình chi tiết đạt tối thiểu **≥ 20 ký tự**, quy định rõ mục tiêu cần đạt và dự kiến thời lượng.
* Hệ thống từ chối cấp mã phòng và Token WebRTC khi chưa vượt qua cửa kiểm duyệt Agenda Gate.

#### 2.2. Phòng họp trực tuyến độ trễ thấp (Axiom LiveKit Virtual Room)
* Ứng dụng hạ tầng WebRTC tự lưu trữ (Self-hosted LiveKit SFU), đảm bảo chất lượng hình ảnh Full HD và âm thanh nổi trung thực với độ trễ truyền dẫn dưới **200ms**.
* Hỗ trợ đầy đủ tính năng: gọi nhóm, chia sẻ màn hình độ nét cao, bảng tương tác, giơ tay phát biểu, điều khiển mic/camera tập trung.
* **Chế độ Focus Mode:** Giao diện tối giản các thanh điều hướng xung quanh trong phiên họp, giúp người tham gia hoàn toàn tập trung vào nội dung thuyết trình và thảo luận.

#### 2.3. Phụ đề & Phiên dịch song ngữ thời gian thực (Real-time Live Subtitles & Translation)
* Thu âm thanh trực tiếp từ microphone qua chuẩn Web Audio API và truyền tải theo luồng nhị phân (Binary WebSocket) đến máy chủ xử lý AI cục bộ.
* Hiển thị phụ đề lời nói tức thì (Speech-to-Text) chuẩn xác cho cả tiếng Việt và tiếng Anh.
* Tự động phiên dịch song ngữ trực tiếp trên màn hình cuộc họp với độ trễ chỉ vài trăm mili-giây, tích hợp cơ chế bảo tồn thuật ngữ chuyên ngành (Term Preservation).

#### 2.4. Tự động hóa biên bản cuộc họp bằng AI (AI Minutes of Meeting - MoM)
Ngay khi cuộc họp kết thúc, hệ thống kích hoạt chuỗi xử lý AI tự động để tạo lập biên bản cuộc họp chuẩn mực hành chính trong vòng chưa đầy 60 giây:
* **Executive Summary:** Tóm tắt ngắn gọn bối cảnh và diễn biến chính của cuộc họp.
* **Key Decisions:** Liệt kê các quyết định mang tính chiến lược đã được thống nhất.
* **Action Items (Nhiệm vụ cần làm):** Tự động bóc tách từng đầu việc cụ thể, gán đúng người chịu trách nhiệm (Assignee), mức độ ưu tiên (Priority) và thời hạn hoàn thành (Deadline) dựa trên ngữ cảnh phát biểu.
* Cho phép chỉnh sửa trực tiếp, phê duyệt và xuất báo cáo dưới dạng Markdown hoặc PDF.

#### 2.5. Tích hợp Mini Jira Kanban Board & Đồng bộ 1-Click (1-Click Jira Sync)
* Axiom tích hợp sẵn một hệ thống bảng Kanban (Mini Jira) quản lý công việc theo phòng ban và cá nhân.
* **Đồng bộ hóa 1-Click:** Chỉ với một cú bấm từ trang biên bản cuộc họp (MoM), toàn bộ Action Items sẽ được chuyển hóa thành các thẻ công việc (Task Cards) trên bảng Kanban nội bộ, hoặc đồng bộ trực tiếp sang hệ thống Jira / phần mềm quản trị doanh nghiệp thông qua Webhooks.

#### 2.6. Trung tâm Tri thức doanh nghiệp (Enterprise Knowledge Hub & Semantic Search)
* Biến toàn bộ nội dung các cuộc họp thành tài sản tri thức số có thể tra cứu vĩnh viễn.
* Lưu trữ toàn diện file ghi âm, phụ đề kèm mốc thời gian (timestamp) theo từng người phát biểu.
* Cung cấp công cụ tìm kiếm ngữ nghĩa (Semantic Search): Thành viên có thể đặt câu hỏi tự nhiên để tìm kiếm lại chính xác ai đã nói gì, quyết định nào được đưa ra trong cuộc họp nào vào thời điểm nào.

#### 2.7. Quản lý Tổ chức & Quy trình Tuyển dụng có kiểm soát (Smart Recruitment & Multi-tenancy)
* **Quản trị Tổ chức đa phòng ban (Organization & Department Management):** Cách ly dữ liệu hoàn toàn giữa các tổ chức, phân cấp quyền hạn chặt chẽ (Owner, Manager, Member).
* **Quy trình Tuyển dụng 2 tầng (Two-level Recruitment Governance):**
  - Quản lý hồ sơ ứng viên (Candidate) và vị trí tuyển dụng (Job Opening).
  - Phòng phỏng vấn chuyên biệt (Interview Session) có AI phân tích câu trả lời của ứng viên đối chiếu với yêu cầu công việc (AI Evaluation).
  - Trưởng bộ phận thẩm định chuyên môn (HR Review) $\rightarrow$ Lãnh đạo cấp cao phê duyệt tiếp nhận (Owner Approval) $\rightarrow$ Hệ thống tự động gửi thư mời gia nhập (Onboarding Invitation).

#### 2.8. Quản trị & Nhật ký Kiểm toán hệ thống (Admin Console & Audit Trail)
* Bảng điều khiển quản trị tập trung: Giám sát tài nguyên máy chủ, quản lý người dùng, phân quyền truy cập.
* Nhật ký kiểm toán bảo mật (Audit Logs): Ghi nhận toàn bộ vết hoạt động (tạo phòng, xóa biên bản, xem transcript, xuất dữ liệu) phục vụ yêu cầu thanh tra và tuân thủ an toàn thông tin.

---

## 3. CÔNG NGHỆ SỬ DỤNG TRONG HỆ THỐNG

Axiom được xây dựng trên một ngăn xếp công nghệ hiện đại, bền bỉ, tối ưu hóa cho môi trường triển khai On-Premise / Private Cloud:

| Phân lớp kiến trúc | Công nghệ chính | Mục đích sử dụng & Ưu điểm vượt trội |
| :--- | :--- | :--- |
| **Frontend UI/UX** | **Next.js 16** (App Router)<br/>**React 19**<br/>**TypeScript** | Xây dựng giao diện web hiệu năng cao, Server Components tải trang nhanh chóng, quản lý trạng thái an toàn kiểu dữ liệu (Strict Typing). |
| **Styling & Visuals** | **Tailwind CSS v4**<br/>**Shadcn UI**<br/>**GSAP Motion** | Thiết kế giao diện B2B cao cấp (Electric Blue Palette), chuẩn chống nhảy giao diện (Anti-CLS Rule), vi chuyển động mượt mà và tương thích đa kích thước màn hình. |
| **Backend Core** | **FastAPI** (Python 3.12+)<br/>**Pydantic V2**<br/>**Uvicorn ASGI** | Máy chủ API bất đồng bộ (Asynchronous) tốc độ xử lý hàng chục nghìn request/giây, xác thực schema dữ liệu chặt chẽ, tương thích hoàn hảo với các thư viện AI/ML. |
| **Truyền thông Thời gian thực** | **LiveKit WebRTC Server**<br/>**Web Audio API**<br/>**FastAPI WebSockets** | Hệ thống WebRTC SFU mã nguồn mở tự lưu trữ (Self-hosted), truyền tải âm thanh/video Full HD với độ trễ < 200ms; WebSocket truyền luồng âm thanh PCM 16kHz liên tục. |
| **Cơ sở dữ liệu & ORM** | **PostgreSQL 16**<br/>**SQLAlchemy 2.0**<br/>**Alembic Migrations** | Lưu trữ dữ liệu quan hệ an toàn, đảm bảo tính toàn vẹn giao dịch (ACID), quản lý phiên bản lược đồ cơ sở dữ liệu tự động (hỗ trợ SQLite cho môi trường phát triển). |
| **Bộ nhớ đệm & Hàng đợi** | **Redis Enterprise Cache** | Lưu trữ phiên người dùng (Session Store), quản lý hàng đợi cho các tác vụ AI nền và Pub/Sub thông báo thời gian thực. |
| **AI - Lọc âm & Nhận dạng** | **Silero VAD v5**<br/>**Faster-Whisper (Large-v3)** | Thuật toán VAD lọc khoảng lặng âm thanh trực tiếp; Faster-Whisper lượng tử hóa int8 trên nền CTranslate2 giúp phiên âm tiếng Việt/tiếng Anh cực nhanh trên On-Premise. |
| **AI - Dịch thuật & LLM** | **CTranslate2 (EN↔VI)**<br/>**Ollama (Qwen 2.5 / Llama 3)** | Dịch máy song ngữ ngoại tuyến tốc độ cao; Mô hình ngôn ngữ lớn cục bộ bóc tách quyết định, tóm tắt và sinh biên bản cuộc họp theo định dạng JSON có cấu trúc. |
| **Đóng gói & Điều phối** | **Docker & Docker Compose**<br/>**Kubernetes (K8s HPA)** | Đóng gói microservices chuẩn hóa, cho phép triển khai 1 lệnh (`docker compose up -d`), hỗ trợ mở rộng tự động theo tải (Horizontal Pod Autoscaling) trong môi trường tập đoàn. |
| **Quản lý phụ thuộc** | **uv** (Astral) & **npm** | Trình quản lý gói Python viết bằng Rust với tốc độ cài đặt và giải quyết phụ thuộc nhanh gấp nhiều lần pip thông thường. |

---

## 4. CÁCH ỨNG DỤNG AI VÀ TỰ ĐỘNG HÓA TRONG SẢN PHẨM

Điểm đột phá của Axiom so với các giải pháp trên thị trường là **toàn bộ quy trình AI diễn ra cục bộ (100% On-Premise / Edge AI Pipeline)**, đảm bảo dữ liệu giọng nói và nội dung cuộc họp không bao giờ gửi ra các API đám mây công cộng bên ngoài.

```
                           SƠ ĐỒ LUỒNG AI CỤC BỘ TRONG AXIOM
                           
  [Microphone người dùng] 
            │ (16kHz PCM Stream qua Web Audio API)
            ▼
  [FastAPI WebSocket: /ws/realtime-stt]
            │
            ▼
  ┌────────────────────────────────────────────────────────────────┐
  │ 1. Lọc khoảng lặng với Silero VAD v5                           │
  │    → Phân tích năng lượng sóng âm và xác suất giọng nói.       │
  │    → Loại bỏ đoạn im lặng (speech_prob < 0.4), giảm 70% tải GPU│
  └────────────────────────────────┬───────────────────────────────┘
                                   │ (Âm thanh có tiếng nói thực)
                                   ▼
  ┌────────────────────────────────────────────────────────────────┐
  │ 2. Nhận dạng giọng nói với Faster-Whisper (Large-v3 / int8)    │
  │    → Phiên âm tức thì sang văn bản với độ trễ < 300ms.         │
  │    → Hỗ trợ nhận diện chuẩn xác cả tiếng Việt và tiếng Anh.    │
  └────────────────────────────────┬───────────────────────────────┘
                                   │ (Đoạn văn bản thô)
                                   ▼
  ┌────────────────────────────────────────────────────────────────┐
  │ 3. Khử lặp từ & Lắp bắp (Regex N-Gram Deduplicator Engine)     │
  │    → Loại bỏ hiện tượng nói lắp, lặp từ tự nhiên (2 - 8 từ).   │
  │    → Chuẩn hóa dấu câu và cấu trúc ngữ nghĩa trước khi dịch.   │
  └────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
  ┌────────────────────────────────────────────────────────────────┐
  │ 4. Dịch thuật song ngữ bảo toàn thuật ngữ (CTranslate2 Engine) │
  │    → Dịch song ngữ EN ↔ VI siêu tốc dưới 150ms.                │
  │    → Term Preservation: Giữ nguyên thuật ngữ chuyên sâu        │
  │      (VD: Kubernetes, Docker, Microservices, EBITDA, Sprint).  │
  └────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                 [HIỂN THỊ PHỤ ĐỀ SONG NGỮ REALTIME]
                                   │
                                   ▼ (Khi bấm Kết thúc cuộc họp)
  ┌────────────────────────────────────────────────────────────────┐
  │ 5. Động cơ trích xuất MoM với Local LLM (Qwen 2.5 / Llama 3)   │
  │    → Áp dụng Modelfile.task-extractor & decision-extractor.    │
  │    → Bắt buộc xuất định dạng JSON có cấu trúc (Pydantic Schema)│
  │    → Phân tách: Executive Summary, Key Decisions, Action Items │
  └────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
  ┌────────────────────────────────────────────────────────────────┐
  │ 6. Tự động hóa công việc hậu cuộc họp (1-Click Sync Automation)│
  │    → Tự động đẩy Action Items thành thẻ trên Mini Jira Kanban. │
  │    → Kích hoạt Webhooks đồng bộ hóa sang Jira / Slack nội bộ.  │
  └────────────────────────────────────────────────────────────────┘
```

### Chi tiết các bước ứng dụng AI & Tự động hóa:

#### 4.1. Lọc khoảng lặng thời gian thực với Silero VAD v5 (Voice Activity Detection)
* Trong một cuộc họp thông thường, thời gian im lặng, khoảng nghỉ hoặc tiếng thở chiếm từ 40% đến 60%.
* Axiom nhúng mô hình **Silero VAD v5** ngay tại tầng tiếp nhận WebSocket. Âm thanh chỉ được đưa vào mô hình STT khi xác suất có tiếng người nói đạt ngưỡng `speech_prob >= 0.4`. Kỹ thuật này giúp **tiết kiệm hơn 70% tài nguyên xử lý của GPU/CPU**, cho phép một máy chủ thông thường có thể phục vụ đồng thời hàng chục phòng họp cùng lúc.

#### 4.2. Nhận dạng giọng nói độ chính xác cao với Faster-Whisper Large-v3
* Thay vì sử dụng Whisper gốc vốn rất nặng, Axiom triển khai **Faster-Whisper** được tối ưu hóa bằng CTranslate2 với lượng tử hóa 8-bit (`int8`).
* Mô hình mang lại tốc độ phiên âm nhanh gấp 4 lần so với bản gốc của OpenAI, giữ trọn vẹn độ chính xác trên dữ liệu tiếng Việt (có dấu câu, ngữ cảnh phong phú) và tiếng Anh chuyên môn.

#### 4.3. Thuật toán làm sạch văn bản và khử lặp từ (Regex N-Gram Deduplicator)
* Khi phát biểu trực tiếp, người nói thường có thói quen lặp lại từ ngữ ("tôi nghĩ là... tôi nghĩ là", "chúng ta cần... chúng ta cần").
* Axiom tích hợp bộ lọc Regex N-Gram (quét cửa sổ từ 2 đến 8 từ) và thuật toán so khớp chuỗi. Văn bản được làm sạch hoàn toàn khỏi hiện tượng lắp bắp trước khi chuyển sang bước dịch thuật và lưu trữ biên bản.

#### 4.4. Dịch máy song ngữ ngoại tuyến bảo toàn thuật ngữ (CTranslate2)
* Mô hình dịch máy CTranslate2 EN↔VI vận hành độc lập không cần Internet, độ trễ dịch dưới **150ms**.
* **Cơ chế Term Preservation thông minh:** Hệ thống nhận diện các thực thể có tên và thuật ngữ kỹ thuật/tài chính để giữ nguyên dạng nguyên bản, tránh hiện tượng dịch sai lệch ngữ cảnh doanh nghiệp.

#### 4.5. Trích xuất quyết định và phân bổ việc cần làm bằng Local LLM (Auto MoM)
* Tích hợp các mô hình ngôn ngữ lớn cục bộ (như **Qwen 2.5 8B/32B** hoặc **Llama-3**) thông qua Ollama với các Modelfile được tinh chỉnh chuyên sâu (`Modelfile.task-extractor`, `Modelfile.decision-extractor`).
* Hệ thống áp dụng kỹ thuật **Structured Output (JSON Schema Enforced)**, ép buộc LLM trả về cấu trúc dữ liệu chính xác gồm:
  - Bản tóm tắt điều hành (Executive Summary).
  - Các thỏa thuận và quyết định mang tính ràng buộc (Key Decisions).
  - Danh sách công việc cụ thể (Action Items): Tự động trích xuất Tên nhiệm vụ, Mô tả chi tiết, Người chịu trách nhiệm (đối chiếu danh sách thành viên), Mức độ ưu tiên (Urgent / High / Medium / Low) và Hạn chót (dự đoán từ ngữ cảnh ngày/tháng trong cuộc họp).

#### 4.6. Tự động hóa phỏng vấn tuyển dụng (AI Evaluation in Recruitment)
* Phân tích toàn bộ bản ghi lời nói trong buổi phỏng vấn, đối chiếu với tiêu chí yêu cầu của vị trí tuyển dụng (Job Opening Criteria).
* Tự động xuất báo cáo đánh giá sơ bộ khách quan (AI Evaluation) có dẫn chứng mốc thời gian cụ thể (timestamp quote), hỗ trợ Hội đồng tuyển dụng và Ban Giám đốc đưa ra quyết định tuyển dụng công tâm, chính xác.

---

## 5. GIÁ TRỊ VÀ KHẢ NĂNG ỨNG DỤNG ĐỐI VỚI DOANH NGHIỆP

### 5.1. Giá trị kinh tế và Tối ưu hóa vận hành (Business Value & ROI)

| Tiêu chí so sánh | Quy trình truyền thống / SaaS thông thường | Ứng dụng Axiom DX-OS | Giá trị mang lại cho Doanh nghiệp |
| :--- | :--- | :--- | :--- |
| **Kỷ luật cuộc họp** | Họp tự phát, không có agenda, lan man, lãng phí thời gian. | Bắt buộc có Agenda $\ge$ 20 ký tự (Agenda Gate), có mục tiêu rõ ràng. | **Giảm 40% số cuộc họp vô ích**, tiết kiệm hàng nghìn giờ công lao động mỗi năm. |
| **Lập biên bản họp (MoM)** | Thư ký ghi chép thủ công, mất 2 - 6 giờ để hoàn thiện và gửi đi. | AI tự động sinh biên bản MoM chuẩn mực trong vòng **dưới 60 giây**. | **Tiết kiệm 85% chi phí hành chính**, thông tin được phổ biến tức thì. |
| **Theo dõi đầu việc** | Ghi chép trên sổ tay/chat, dễ thất lạc, không rõ người phụ trách. | **1-Click Sync** tự động chuyển Action Items thành thẻ trên Kanban / Jira. | **Triệt tiêu 100% tình trạng bỏ quên việc**, nâng cao năng lực thực thi cam kết. |
| **Bảo mật dữ liệu** | Dữ liệu video, âm thanh và tài liệu nằm trên cloud bên thứ ba. | **100% On-Premise**, dữ liệu lưu trữ trong mạng nội bộ công ty. | **Loại trừ hoàn toàn rủi ro rò rỉ bí mật kinh doanh**, tuân thủ luật an ninh mạng. |
| **Chi phí bản quyền** | Trả phí thuê bao hàng tháng theo số lượng nhân sự (Per-user license). | **Mã nguồn mở MIT**, tự triển khai trên máy chủ doanh nghiệp. | **Tiết kiệm hàng chục nghìn USD chi phí bản quyền SaaS** hàng năm khi quy mô tăng. |

### 5.2. Khả năng ứng dụng thực tế theo các lĩnh vực trọng yếu (Target Enterprise Verticals)

1. **Khối Ngân hàng, Tài chính và Bảo hiểm (BFSI):**
   - Đáp ứng các yêu cầu khắt khe nhất về an toàn dữ liệu tài chính, các cuộc họp hội đồng quản trị, phê duyệt tín dụng và chiến lược rủi ro không thể gửi dữ liệu lên đám mây công cộng.
2. **Cơ quan Quản lý Nhà nước và Đơn vị Hành chính:**
   - Chuẩn hóa nghi thức các cuộc họp giao ban, họp chỉ đạo điều hành; tự động tạo lập biên bản họp và nghị quyết hành chính chính xác, bảo mật theo cấp độ an toàn thông tin quốc gia.
3. **Tập đoàn Công nghệ, Viễn thông & Doanh nghiệp Số:**
   - Đội ngũ kỹ sư và phát triển sản phẩm cần môi trường họp tập trung, tích hợp tức thì các đầu việc kỹ thuật vào hệ sinh thái quản trị Jira/Kanban và hỗ trợ dịch thuật ngữ công nghệ song ngữ chuẩn xác.
4. **Hệ thống Y tế, Bệnh viện & Nghiên cứu Dược phẩm:**
   - Các buổi hội chẩn trực tuyến, trao đổi bệnh án nhạy cảm đòi hỏi sự tuân thủ nghiêm ngặt về quyền riêng tư dữ liệu y khoa (tương đương chuẩn HIPAA).
5. **Doanh nghiệp Sản xuất, Bất động sản và Chuỗi bán lẻ:**
   - Phối hợp liên phòng ban nhịp nhàng, quản lý quy trình tuyển dụng nhân sự quy mô lớn với sự giám sát chặt chẽ từ Quản lý phòng ban đến Ban Giám đốc.

### 5.3. Tính khả thi trong triển khai và Khả năng mở rộng (Deployment Feasibility)
* **Triển khai cực kỳ nhanh chóng:** Nhờ đóng gói toàn bộ hệ thống bằng Docker và Docker Compose, doanh nghiệp chỉ mất **dưới 15 phút** để cài đặt và kích hoạt toàn bộ nền tảng trên một máy chủ riêng (Bare-metal hoặc Private Cloud).
* **Khả năng co giãn linh hoạt:** Kiến trúc Microservices được chuẩn bị sẵn các cấu hình Kubernetes (K8s Manifests) tích hợp HPA (Horizontal Pod Autoscaler), sẵn sàng mở rộng quy mô phục vụ từ hàng trăm đến hàng chục nghìn người dùng đồng thời.
* **Chi phí phần cứng tối ưu:** Nhờ công nghệ lượng tử hóa mô hình int8 và bộ lọc Silero VAD, Axiom có thể vận hành ổn định trên các cấu hình máy chủ thông dụng có trang bị GPU tầm trung (như NVIDIA RTX 3060/4060 hoặc T4) hoặc thậm chí trên CPU máy chủ đa nhân.

---

## 6. LIÊN KẾT MÃ NGUỒN DỰ ÁN

* **Kho lưu trữ mã nguồn chính thức (GitHub):**  
  👉 **https://github.com/khoazandev/Axiom-meeting-protocol.git**
* **Giấy phép bản quyền:** MIT License (Tự do sử dụng, tùy biến và triển khai thương mại cho doanh nghiệp).
* **Đội ngũ phát triển:** Axiom Core Team  

---
*Tài liệu thuyết minh được biên soạn đồng bộ với kiến trúc mã nguồn và phiên bản phát hành mới nhất của dự án Axiom DX-OS.*
