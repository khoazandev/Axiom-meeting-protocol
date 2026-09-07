import DocHeader from "@/components/docs/DocHeader";
import DocSection from "@/components/docs/DocSection";
import Alert from "@/components/docs/Alert";

export const metadata = {
  title: "Cài đặt & Triển khai | Axiom DX-OS",
};

export default function InstallationPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <DocHeader 
        title="Cài đặt & Triển khai"
        description="Hướng dẫn chi tiết cách khởi chạy cụm dịch vụ Axiom DX-OS bằng Docker Compose trên máy chủ hoặc môi trường phát triển cục bộ."
        tag="Bắt đầu"
      />

      <DocSection title="Khởi chạy nhanh với Docker Compose (Khuyến nghị)" id="docker">
        <p>Axiom DX-OS được container hóa toàn bộ bằng Docker Compose, bao gồm Next.js Frontend, FastAPI Backend, LiveKit Media Server, PostgreSQL 16 và Redis:</p>
        <pre><code>{`# 1. Clone mã nguồn dự án
git clone https://github.com/khoazandev/Axiom-meeting-protocol.git
cd Axiom-meeting-protocol

# 2. Khởi chạy toàn bộ các dịch vụ nền
docker compose up -d --build

# 3. Kiểm tra trạng thái các container
docker compose ps`}</code></pre>
        <Alert type="success" title="Cổng dịch vụ mặc định">
          Sau khi Docker build thành công, bạn có thể truy cập:
          <br />• <strong>Frontend:</strong> <code>http://localhost:3001</code>
          <br />• <strong>Backend API:</strong> <code>http://localhost:8001/docs</code>
          <br />• <strong>LiveKit Server:</strong> <code>ws://localhost:7880</code>
          <br />• <strong>Tài khoản mặc định:</strong> <code>admin@axiom.com</code> / <code>password123</code>
        </Alert>
      </DocSection>

      <DocSection title="Môi trường Cục bộ (Local Development)" id="local">
        <p>Nếu bạn muốn phát triển mã nguồn trực tiếp không qua Docker:</p>
        <pre><code>{`# Backend (Python 3.12+ và uv):
uv sync --all-extras
uv run alembic upgrade head
uv run uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Node.js 20+):
cd src/frontend
npm install
npm run dev`}</code></pre>
        <Alert type="warning" title="Mô hình AI Cục bộ (Ollama)">
          Đảm bảo Ollama đang chạy tại máy host (mặc định <code>http://localhost:11434</code>) với model Qwen để phục vụ trích xuất nhiệm vụ và tóm tắt biên bản cuộc họp.
        </Alert>
      </DocSection>
    </div>
  );
}
