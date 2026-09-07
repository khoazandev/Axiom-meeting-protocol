import DocHeader from "@/components/docs/DocHeader";
import DocSection from "@/components/docs/DocSection";

export const metadata = { title: "Mini Jira & Kanban Board | Axiom DX-OS" };

export default function KanbanPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <DocHeader title="Mini Jira & Kanban Board" description="Hệ thống quản lý công việc và Sprint chuyên nghiệp tích hợp trực tiếp với cuộc họp." tag="Tính năng cốt lõi" />
      <DocSection title="1-Click Đồng bộ từ Cuộc họp sang Jira" id="sync-jira">
        <p>Mỗi khi AI trích xuất các Follow-up Tasks trong cuộc họp, chủ tọa hoặc người tham gia có thể đồng bộ trực tiếp các đầu việc này thành các Issue trên Jira Project:</p>
        <ul>
          <li><strong>Phân cấp Issue:</strong> Hỗ trợ đầy đủ EPIC, STORY, TASK, BUG và SUBTASK.</li>
          <li><strong>Quản lý Chu kỳ Sprint:</strong> Lập kế hoạch Sprint, thời lượng (1-4 tuần), mục tiêu và trạng thái (Pending, Active, Closed).</li>
          <li><strong>Bảng Kanban tương tác:</strong> Kéo thả công việc giữa các cột TODO, IN_PROGRESS, IN_REVIEW và DONE.</li>
          <li><strong>Bình luận & Theo dõi:</strong> Đầy đủ tính năng trao đổi thảo luận trực tiếp trên từng Issue.</li>
        </ul>
      </DocSection>
    </div>
  );
}
