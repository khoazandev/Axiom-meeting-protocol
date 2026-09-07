import DocHeader from "@/components/docs/DocHeader";
import DocSection from "@/components/docs/DocSection";

export const metadata = { title: "Kiến trúc hệ thống H-P-D-I | Axiom DX-OS" };

export default function ArchitecturePage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <DocHeader title="Kiến trúc hệ thống H-P-D-I" description="Cái nhìn tổng quan về cách các tầng Human - Process - Data - Intelligence trong Axiom DX-OS vận hành." tag="Bắt đầu" />
      <DocSection title="Mô hình tổng thể 4 tầng (H-P-D-I)" id="overview">
        <p>Axiom được thiết kế nhằm đảm bảo chủ quyền dữ liệu tuyệt đối và kỷ luật quy trình:</p>
        <ul>
          <li><strong>H (Human):</strong> Ứng dụng Next.js 16 kết nối phòng họp qua LiveKit WebRTC Server (SFU mesh), hiển thị phụ đề trực tiếp đa ngôn ngữ.</li>
          <li><strong>P (Process):</strong> Cổng kiểm duyệt Agenda Gate bắt buộc nội dung chương trình họp ≥20 ký tự, phân quyền RBAC đa cấp (Host, Co-Host, Participant).</li>
          <li><strong>D (Data):</strong> Cơ sở dữ liệu PostgreSQL 16 (17 bảng quan hệ) và Redis Cache được host nội bộ trong mạng riêng của doanh nghiệp.</li>
          <li><strong>I (Intelligence):</strong> Trí tuệ nhân tạo On-Premise với Faster-Whisper large-v3, CTranslate2 EN↔VI và Qwen LLM thực hiện trích xuất nhiệm vụ và tự động hóa biên bản cuộc họp.</li>
        </ul>
      </DocSection>
    </div>
  );
}
