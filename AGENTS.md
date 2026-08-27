# Frontend Docker Build Rule

Mỗi khi bạn thực hiện bất kỳ thay đổi nào liên quan đến code của frontend (các file trong thư mục `src/frontend`), bạn **PHẢI** tự động chạy lệnh sau ở thư mục gốc của dự án (`c:\Users\lamphatdev\Desktop\Axiom-meeting-protocol`) để build lại docker container nhằm làm mới trang web:

```bash
docker compose up -d --build frontend
```

Sau khi chạy lệnh trên, hãy chờ hoặc báo cho người dùng biết để họ có thể refresh lại trang (`http://localhost:3001`).
