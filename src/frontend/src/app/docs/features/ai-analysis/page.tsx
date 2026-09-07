import DocHeader from "@/components/docs/DocHeader";
import DocSection from "@/components/docs/DocSection";

export const metadata = { title: "Trí tuệ nhân tạo (Local AI) | Axiom DX-OS" };

export default function AIAnalysisPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <DocHeader title="Trí tuệ nhân tạo On-Premise" description="Bóc tách giá trị, nhiệm vụ và tóm tắt cuộc họp an toàn ngay tại máy chủ nội bộ." tag="Tính năng cốt lõi" />
      <DocSection title="Tự động trích xuất biên bản (MoM) & Follow-up Tasks" id="summarize">
        <p>Khi cuộc họp kết thúc, toàn bộ transcript đã được thuật toán PunctuationRestorer phục hồi dấu câu sẽ được mô hình LLM (Qwen) phân tích với mục tiêu:</p>
        <ul>
          <li>Nhận diện ngữ cảnh và mục tiêu chính của cuộc họp.</li>
          <li>Tổng hợp các quyết định cốt lõi đã được biểu quyết hoặc thống nhất.</li>
          <li>Trích xuất các đầu việc cần làm (Action Items): ai là người phụ trách, thời hạn (deadline) và mức độ ưu tiên.</li>
          <li>Tích hợp cơ chế dự phòng Heuristic Regex tự động lọc từ khóa ngay cả khi LLM tạm thời ngoại tuyến.</li>
        </ul>
      </DocSection>
    </div>
  );
}
