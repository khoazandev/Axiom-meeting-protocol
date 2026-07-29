# Hướng Dẫn Đóng Góp (Contributing Guidelines)

Dự án này được xây dựng với mục tiêu tham gia **Olympic Phần mềm Nguồn mở 2026**. Do đó, mã nguồn phải đạt chuẩn công nghiệp cao nhất. Bất kỳ kỹ sư nào tham gia dự án cũng **phải tuân thủ nghiêm ngặt** hai bộ quy tắc sau:

## 1. Phát Triển Dựa Trên Kiểm Thử (Superpowers TDD)

Chúng tôi không chấp nhận mã nguồn (Backend) không có test. Xin hãy tuân thủ chu trình **Red-Green-Refactor**:

1. **Red:** Viết một bài test cho tính năng bạn muốn làm trước khi viết code thật. Chạy test và chứng kiến nó thất bại (Red).
2. **Green:** Viết đoạn code ngắn nhất, đơn giản nhất (chỉ vừa đủ) để làm cho bài test đó Pass (Green).
3. **Refactor:** Tối ưu hóa lại đoạn code vừa viết cho sạch đẹp (Clean code), nhưng vẫn đảm bảo test luôn Pass.

**Lệnh chạy test:**
```bash
cd backend
pytest -v
```

## 2. Kỷ Luật Thiết Kế (Taste Skill)

Giao diện (Frontend) không được code tùy tiện. Dự án này phục vụ khối khách hàng doanh nghiệp B2B (Enterprise), do đó:

- **Tuyệt đối không dùng:** Các màu sắc mặc định của AI (tím lịm tìm sim, gradient quá lòe loẹt), các cấu trúc giao diện cẩu thả.
- **Bắt buộc dùng:** 
  - Phông chữ **Geist** (Geist Sans).
  - Bảng màu **Electric Blue** làm điểm nhấn (`oklch(0.546 0.245 262.881)`).
  - Sử dụng các components của **Shadcn UI** thay vì viết CSS chay (trừ khi thật sự cần thiết).
  - Duy trì các không gian trắng (Whitespace) rõ ràng, sử dụng đường viền tinh tế (`border-border/40`).
- Dữ liệu rỗng (Empty states) phải có giải thích rõ ràng và Call-to-Action (Nút hành động).

## 3. Quy Trình Pull Request (PR)
- Code Frontend và Backend phải được tách bạch rõ ràng, không gộp chung vào 1 commit trừ khi là thay đổi tài liệu.
- Viết Commit message rõ ràng: `[Frontend] Thêm nút tạo cuộc họp` hoặc `[Backend] Thêm API update meeting`.
