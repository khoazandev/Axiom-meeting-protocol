# Thiết kế tính năng Evidence Link (Liên kết Trích dẫn)

## 1. Tóm tắt Ý tưởng (Understanding Summary)
- Xây dựng tính năng cho phép người dùng từ tab **Agenda** (khi xem một Task hoặc Decision) có thể nhảy trực tiếp sang tab **Records** để xem chính xác câu thoại đã dẫn đến Task/Decision đó.
- Cải thiện UX bằng cách thêm hiệu ứng Highlight tự cuộn (auto-scroll) và nút quay trở về tiện dụng, giúp theo dõi bối cảnh cuộc họp rõ ràng mà không bị lạc hướng.

## 2. Các giả định (Assumptions)
- Việc tìm kiếm chuỗi trên client-side (Frontend) đảm bảo hiệu năng tức thì, không gây lag kể cả với meeting dài.
- AI sẽ luôn trả về một câu xác nhận (final agreement) nguyên văn do ta sẽ siết chặt Prompt. Nếu vì lý do nào đó AI không trích nguyên văn, tính năng tìm kiếm (substring) sẽ dựa vào độ tương đồng, nếu không thấy sẽ báo lỗi nhẹ (toast).

## 3. Nhật ký quyết định (Decision Log)
1. **Thuật toán Matching:** Sử dụng Substring/Fuzzy match trên Frontend.
   - *Lý do:* Nhanh, mượt, không bắt buộc sửa đổi schema database hay đối mặt với rủi ro AI bị ảo giác ID (hallucination).
2. **Thay đổi Prompt AI:** Bắt buộc `evidence_quote` và `evidence_sentence` phải là câu trích dẫn nguyên văn (verbatim) từ đoạn xác nhận cuối cùng, cấm tự tóm tắt.
   - *Lý do:* Đảm bảo logic substring match ở Frontend có thể hoạt động chính xác 100%.
3. **UI/UX Nút Xem Trích dẫn:** Đặt ẩn và chỉ hiện khi Hover chuột (group-hover).
   - *Lý do:* Đảm bảo tính Minimalist, không làm tab Agenda bị rối mắt khi có quá nhiều Task.
4. **UI/UX Nút Quay Lại:** Nút Floating nằm nổi ở mép dưới thanh sidebar.
   - *Lý do:* Để người dùng cuộn xem ngữ cảnh xung quanh câu thoại thoải mái mà nút quay lại luôn trong tầm tay, không phá vỡ UI gốc của tab Record.

## 4. Chi tiết Triển khai

### 4.1. Backend
Sửa đổi file `src/backend/services/task_extractor.py` và `src/backend/services/topic_extraction.py`:
- Cập nhật chuỗi hướng dẫn (system prompt): 
  - `"evidence_quote": "Must be an EXACT verbatim quote from the transcript representing the FINAL confirmation or agreement. Do not summarize."`

### 4.2. Frontend
Sửa đổi file `src/frontend/src/app/meetings/[id]/meeting-room-client.tsx`:
- **State mới:**
  - `const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);`
  - `const [returnToAgendaState, setReturnToAgendaState] = useState<{ active: boolean, expandedTopicId: string | null }>({ active: false, expandedTopicId: null });`
- **Logic Cuộn (Scroll):**
  - Viết hàm `handleViewEvidence(quote: string)`.
  - Tìm `transcript.id` chứa đoạn quote đó.
  - Set các state tương ứng và đổi tab sang `'records'`.
  - Dùng `useEffect` lắng nghe `highlightedRecordId`, nếu có thì gọi `document.getElementById('record-'+id).scrollIntoView()`.
  - Dùng `setTimeout` 3000ms để set `highlightedRecordId` về `null` (tạo hiệu ứng mờ dần).
- **Giao diện:**
  - Gắn icon Quote/Search vào li của Task/Decision với class `opacity-0 group-hover:opacity-100`.
  - Highlight CSS trên tab record: `bg-primary/20 ring-1 ring-primary transition-all duration-1000`.
  - Floating Back Button ở tab Record (z-index cao, absolute bottom-4).
