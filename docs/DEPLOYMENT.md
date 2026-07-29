# Hướng Dẫn Triển Khai (Deployment)

Tài liệu hướng dẫn cài đặt và vận hành hệ thống Axiom trên môi trường Local (Phát triển) và Production (Thực tế).

## 1. Môi Trường Phát Triển (Local / Dev)

### Yêu Cầu Cài Đặt (Prerequisites)
- **Node.js** >= 18.x (Cho Frontend)
- **Python** >= 3.10 (Cho Backend)
- **Git**

### Bước 1: Khởi Động Backend (FastAPI)
Mở một Terminal mới:
```bash
cd backend

# (Tùy chọn) Tạo môi trường ảo
python -m venv venv
source venv/bin/activate  # Trên Linux/Mac
venv\Scripts\activate     # Trên Windows

# Cài đặt thư viện
pip install -r requirements.txt

# Khởi động server
uvicorn main:app --reload
```
API của bạn sẽ chạy tại: `http://localhost:8000`

### Bước 2: Khởi Động Frontend (Next.js)
Mở một Terminal mới (Giữ nguyên terminal Backend đang chạy):
```bash
cd frontend

# Cài đặt thư viện Node
npm install

# Khởi động giao diện web
npm run dev
```
Trang web của bạn sẽ chạy tại: `http://localhost:3000`

---

## 2. Môi Trường Sản Xuất (Production) - Hướng Dẫn Nhanh

Trong môi trường thực tế dành cho Doanh nghiệp, hệ thống này thiết kế để triển khai **On-Premise (Nội bộ)**.

### Backend Deployment (Docker)
Khuyến nghị sử dụng Docker và Gunicorn để chạy FastAPI:
```bash
# Lệnh tham khảo
docker build -t smart-meeting-api ./backend
docker run -d -p 8000:8000 smart-meeting-api
```

### Frontend Deployment (Vercel hoặc Nginx)
- Frontend có thể build tĩnh (`npm run build`) và host trên bất kỳ web server nào như Nginx, hoặc sử dụng hệ sinh thái như Vercel/Netlify nếu không có yêu cầu chặn mạng nội bộ tuyệt đối.

### Jitsi Meet Server 
Trong code MVP hiện tại (tại `[id]/page.tsx`), hệ thống đang sử dụng domain public `meet.jit.si`. 
Khi triển khai cho doanh nghiệp, bạn cần tự host một máy chủ Jitsi (Tham khảo: [Jitsi Meet Handbook](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart)) và trỏ domain trong mã nguồn Next.js về máy chủ đó để đảm bảo tính riêng tư dữ liệu 100%.
