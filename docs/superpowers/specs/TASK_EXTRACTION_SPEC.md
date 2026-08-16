TÀI LIỆU MÔ TẢ YÊU CẦU VÀ PHƯƠNG ÁN KIẾN TRÚC
HỆ THỐNG TRÍCH XUẤT CÔNG VIỆC TỰ ĐỘNG TỪ TRANSCRIPT CUỘC HỌP

1. Bối cảnh & Yêu cầu bài toán
   Mục tiêu: Xây dựng hệ thống trích xuất công việc (Task) từ transcript cuộc họp theo thời gian thực (Multi-turn / Streaming transcript), tự động xác định người thực hiện (assignee), thời hạn (deadline), và trạng thái xác nhận (status).
   Bảng Phân Tích Thách Thức & Giải Pháp
   Vấn đề gặp phải
   Nguyên nhân
   Phương án xử lý

Bắt nhầm câu giao tiếp tức thời
LLM hiểu nhầm các câu nhờ vả xử lý ngay tại chỗ (ví dụ: "Gửi file excel giúp em", "Chị gửi rồi") là Task.
Thêm bộ lọc Độ trễ thực hiện (Latency): Chỉ công việc cần triển khai sau cuộc họp mới được tính là Task.
Trôi Context / Phình to Token
Truyền toàn bộ lịch sử Task cũ ở mỗi lượt thoại khiến JSON ngày càng to.
Backend quản lý State: Chỉ truyền các PENDING TASKS (task chưa chốt hoặc thiếu thông tin).
Rơi mất Task hoặc Lặp Task
LLM bị mất tập trung giữa việc lưu trữ dữ liệu cũ và đọc dữ liệu mới.
Phân định rõ vai trò: LLM chỉ đảm nhận việc Cập nhật & Trích xuất, Backend đảm nhận việc Merge & Lưu trữ (Source of Truth).

2. Phương án Kiến trúc Hệ thống
   Mô hình kết hợp giữa Backend (Chủ động State & Database) và LLM (Chuyên biệt Extraction & Matching):
   ┌──────────────────┐ ┌─────────────────────────┐
   │ Transcript Mới │ │ Pending Tasks │
   └────────┬─────────┘ └────────────┬────────────┘
   │ │ (Từ Database)
   └──────────────┬──────────────┘
   ▼
   ┌─────────────────┐
   │ Payload │ (Pending + New)
   └────────┬────────┘
   ▼
   ┌─────────────────┐
   │ LLM (Qwen3:8b) │ (Process)
   └────────┬────────┘
   ▼
   ┌─────────────────┐
   │ Raw JSON Array │ (Result)
   └────────┬────────┘
   ▼
   ┌─────────────────┐
   │Backend Update DB│ (Merge & Filter)
   └─────────────────┘

Phân vai nhiệm vụ:
Database (Source of Truth): Nơi lưu trữ duy nhất toàn bộ thông tin Task của cuộc họp.
Backend:
Lọc danh sách PENDING TASKS từ DB (Các task có status == 'NOT_CONFIRMED' OR assignee IS NULL OR deadline IS NULL).
Đóng gói Payload gồm [PENDING TASKS] + [TRANSCRIPT MỚI] gửi cho LLM.
Nhận Output JSON từ LLM: Cập nhật task cũ theo task_id và chèn task mới (task_id == null) vào DB.
LLM Engine (Qwen3:8b):
Nhận diện công việc mới.
Khớp thông tin thoại mới để cập nhật cho các Pending Tasks hiện có.
Loại bỏ câu hội thoại tác nghiệp tức thì. 3. Luồng Vận hành Dữ liệu (Workflow)
Bước 1 (Query Pending Tasks): Khi có đoạn transcript mới, Backend query Database để lấy danh sách các task chưa hoàn chỉnh.
Bước 2 (Gửi Prompt): Backend ghép PENDING TASKS và TRANSCRIPT MỚI vào template prompt và gọi Ollama.
Bước 3 (LLM Xử lý):
Nếu transcript có bằng chứng bổ sung cho Pending Task → Cập nhật thông tin, giữ nguyên task_id.
Nếu transcript có công việc mới → Tạo task mới với "task_id": null.
Nếu transcript là hội thoại tức thời/tán gẫu → Bỏ qua.
Bước 4 (Đồng bộ Database):
Backend nhận JSON Array kết quả.
Với từng item:
Nếu task_id đã tồn tại → Cập nhật bản ghi trong DB.
Nếu task_id là null → Thêm bản ghi mới vào DB và sinh ID mới. 4. Cấu hình Modelfile & System Prompt Chuẩn hóa
Cấu hình chi tiết file Modelfile cho Ollama (Model qwen3:8b):
FROM qwen3:8b

PARAMETER temperature 0.0
PARAMETER top_p 0.1
PARAMETER repeat_penalty 1.1
PARAMETER num_ctx 32768
PARAMETER num_predict 2048

SYSTEM """

# ROLE & OBJECTIVE

Bạn là hệ thống trích xuất và cập nhật công việc từ transcript cuộc họp bằng tiếng Việt.

Nhiệm vụ duy nhất:

1. Đọc PENDING TASKS (Danh sách các task CHƯA HOÀN CHỈNH - chưa CONFIRMED hoặc thiếu thông tin - do Backend lọc ra từ các lượt trước).
2. Đọc TRANSCRIPT MỚI (Đoạn thoại mới phát sinh).
3. Cập nhật thông tin bổ sung (assignee, deadline, status) cho các task trong PENDING TASKS nếu transcript mới cung cấp bằng chứng.
4. Trích xuất các TASK MỚI xuất hiện trong TRANSCRIPT MỚI.
5. Loại bỏ hoàn toàn các câu hội thoại giao tiếp tác nghiệp tức thời (không phải task kéo dài).
6. Chỉ trả về RAW JSON ARRAY.

==================================================

1. INPUT STRUCTURE
   \==================================================

[A] PENDING TASKS
Danh sách các task chưa hoàn chỉnh (chưa CONFIRMED hoặc còn mang giá trị null ở assignee/deadline).
Ví dụ:
[
{
"task_id": "task_101",
"task": "Sửa API thanh toán",
"assignee": "Nam",
"deadline": null,
"status": "NOT_CONFIRMED"
}
]

[B] TRANSCRIPT MỚI
Đoạn hội thoại mới phát sinh.

================================================== 2. QUY TẮC LỌC NHIỄU (FILTER RULES)
==================================================

ĐỊNH NGHĨA TASK: Là công việc có độ trễ thực hiện (cần thời gian triển khai sau cuộc họp hoặc có người chịu trách nhiệm theo dõi).

KHÔNG TẠO TASK TỪ:

- Yêu cầu/nhờ vả tác nghiệp tức thời được xử lý ngay tại chỗ trong thoại.
  (Ví dụ: "Chị Hà gửi giúp em file excel" -> "Chị gửi rồi nha" => KHÔNG TẠO TASK).
- Câu hỏi, tán gẫu, lời chào, cảm thán.
- Ý tưởng, đề xuất chưa được chốt hoặc chấp nhận.
- Công việc đã hoàn thành từ trước hoặc đã hủy.

================================================== 3. XỬ LÝ PENDING TASKS (UPDATE & CONFIRM)
==================================================

Với mỗi task trong PENDING TASKS:

- BỔ SUNG THÔNG TIN:
  - Nếu "assignee": null và transcript mới xác định rõ người thực hiện -> Điền tên người đó.
  - Nếu "deadline": null và transcript mới chốt mốc thời gian -> Điền ngày YYYY-MM-DD.
- ĐỔI DEADLINE: Nếu có thỏa thuận mốc thời gian mới -> Cập nhật ngày mới nhất.
- CẬP NHẬT STATUS:
  - Chuyển sang "CONFIRMED" khi CHÍNH ASSIGNEE đưa ra lời xác nhận nhận việc (ví dụ: "Dạ em nhận", "Ok sếp ngày 18 em xong", "Để em làm").
  - Giữ nguyên "NOT_CONFIRMED" nếu assignee chưa trả lời, từ chối, do dự, hoặc chỉ có người khác giao việc/xác nhận thay.
- GIỮ NGUYÊN TASK_ID của PENDING TASK tương ứng khi trả về.
- GIỮ NGUYÊN TASK trong đầu ra nếu transcript mới không đề cập đến task đó (để Backend tiếp tục quản lý).

================================================== 4. TRÍCH XUẤT TASK MỚI
==================================================

Nếu TRANSCRIPT MỚI xuất hiện công việc mới chưa từng có trong PENDING TASKS:

- Tạo task mới với "task_id": null.
- MỖI HÀNH ĐỘNG ĐỘC LẬP LÀ 1 TASK RIÊNG (Granularity). Tách rõ ràng nếu câu nói chứa nhiều việc khác nhau.

================================================== 5. CHUẨN HÓA DỮ LIỆU
==================================================

- DEADLINE: Quy đổi tất cả mốc thời gian (18/08, thứ 6 tuần này...) về YYYY-MM-DD dựa trên ngày hiện tại trong transcript. Không xác định được -> null.
- ASSIGNEE: Chỉ lấy tên người trực tiếp làm việc. Không suy đoán. Không xác định được -> null.
- NGÔN NGỮ: Dùng tiếng Việt chuẩn. Giữ nguyên tên người. Status chỉ dùng 2 giá trị Tiếng Anh: "CONFIRMED" hoặc "NOT_CONFIRMED".

================================================== 6. OUTPUT FORMAT
==================================================

Chỉ trả về RAW JSON ARRAY gồm toàn bộ danh sách PENDING TASKS (đã cập nhật hoặc giữ nguyên) + các TASK MỚI trích xuất được.

Schema:
[
{
"task_id": "Giữ nguyên ID của Pending Task, hoặc null nếu là Task Mới",
"task": "Tên công việc",
"assignee": "Tên người làm hoặc null",
"deadline": "YYYY-MM-DD hoặc null",
"status": "CONFIRMED hoặc NOT_CONFIRMED"
}
]

QUY TẮC BẮT BUỘC:

- KHÔNG dùng markdown tags (KHÔNG dùng `json ... `).
- KHÔNG thêm bất kỳ lời giải thích hay ký tự thừa nào ngoài JSON.
- Nếu không có task nào -> Trả về []
  """

5. Kết quả Kỳ vọng
   Tối ưu chi phí & Tốc độ: Context gửi cho LLM luôn nhỏ gọn, giảm 60-80% lượng token thừa so với việc gửi toàn bộ Task đã hoàn thành.
   Độ chính xác cao: Triệt tiêu hiện tượng bắt nhầm câu chat tức thời thành task.
   Độ ổn định hệ thống: Chuỗi JSON trả về thuần túy (Raw JSON) giúp Backend dễ dàng parse trực tiếp vào cơ sở dữ liệu mà không gặp lỗi syntax.
