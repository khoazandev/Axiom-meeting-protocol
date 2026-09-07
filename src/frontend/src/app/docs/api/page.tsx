import DocHeader from '@/components/docs/DocHeader';
import DocSection from '@/components/docs/DocSection';

export const metadata = { title: 'REST API Reference | Axiom DX-OS' };

export default function APIPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <DocHeader
        title="REST API Reference"
        description="Tích hợp Axiom DX-OS vào hệ sinh thái ứng dụng của doanh nghiệp."
        tag="API & Mở rộng"
      />
      <DocSection title="Xác thực (JWT Bearer Token)" id="auth">
        <p>Tất cả các API request đều yêu cầu JWT Token trong Authorization Header.</p>
        <pre>
          <code>Authorization: Bearer YOUR_ACCESS_TOKEN</code>
        </pre>
      </DocSection>
      <DocSection title="Quản lý Cuộc họp (Meetings V2)" id="meetings-api">
        <pre>
          <code>{`POST /api/v1/meetings        # Tạo cuộc họp mới (Agenda >= 20 ký tự)
GET  /api/v1/meetings        # Danh sách cuộc họp theo tổ chức
POST /api/v1/meetings/{id}/end # Kết thúc cuộc họp & Kích hoạt AI tạo MoM`}</code>
        </pre>
      </DocSection>
      <DocSection title="Mini Jira Integration API" id="jira-api">
        <pre>
          <code>{`GET  /api/v1/jira/projects   # Danh sách dự án Jira
POST /api/v1/jira/sync-meeting # Đồng bộ Action Items từ cuộc họp sang Jira`}</code>
        </pre>
      </DocSection>
    </div>
  );
}
