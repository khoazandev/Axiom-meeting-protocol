# Frontend Docker Build Rule

Mỗi khi bạn thực hiện bất kỳ thay đổi nào liên quan đến code của frontend (các file trong thư mục `src/frontend`), bạn **PHẢI** tự động chạy lệnh sau ở thư mục gốc của dự án (`c:\Users\lamphatdev\Desktop\Axiom-meeting-protocol`) để build lại docker container nhằm làm mới trang web:

```bash
docker compose up -d --build frontend
```

Sau khi chạy lệnh trên, hãy chờ hoặc báo cho người dùng biết để họ có thể refresh lại trang (`http://localhost:3001`).

# UI Stability & Anti-Layout-Shift Rule (Quy tắc chống biến dạng giao diện)

Khi thiết kế hoặc cập nhật các thành phần UI có nội dung thay đổi động (như Bộ lọc, Dropdown Select, Badge trạng thái, Thẻ tóm tắt...):
1. **Khóa cứng kích thước (Fixed Width / Dimension Locking)**: Phải đặt kích thước cố định rõ ràng (ví dụ `width="170px"`, `w-44`, hoặc `shrink-0 w-[...]`) cho nút kích hoạt để khi người dùng chọn mục ngắn/dài khác nhau, nút bấm KHÔNG BAO GIỜ bị phình to hoặc co nhỏ làm nhảy giao diện (Cumulative Layout Shift - CLS) của các phần tử xung quanh.
2. **Loại bỏ chú thích ngoặc đơn rườm rà trên Trigger**:
   - Nhãn nút trigger chỉ hiển thị định danh ngắn gọn súc tích (ví dụ: `ADMIN`, `MANAGER`, `MEMBER`, `OWNER` thay vì `ADMIN (Quản trị viên)`).
   - Phần giải thích chi tiết, vai trò đầy đủ và badge chỉ đưa vào danh sách popup bên trong menu khi mở ra (`description`, `badge`).
3. **Truncate an toàn**: Luôn bọc nhãn bằng `truncate` và gán thuộc tính `title` để hiển thị tooltip khi rê chuột nếu nhãn vượt quá chiều rộng cho phép.
4. **Không đặt badge mở rộng tự phát trên nút trigger**: Chỉ hiển thị badge phụ trên trigger khi thực sự cần thiết và đã tính toán đủ độ rộng cố định.
