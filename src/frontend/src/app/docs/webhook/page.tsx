import DocHeader from '@/components/docs/DocHeader';
import DocSection from '@/components/docs/DocSection';
import Alert from '@/components/docs/Alert';

export const metadata = { title: 'Webhook & Sự kiện | Axiom DX-OS' };

export default function WebhookPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <DocHeader
        title="Webhook & Sự kiện Outbound"
        description="Nhận thông báo tự động khi cuộc họp kết thúc và biên bản hoàn tất."
        tag="API & Mở rộng"
      />
      <DocSection title="Cấu hình Webhook" id="config">
        <p>
          Axiom hỗ trợ cấu hình các Webhook sự kiện tại mục Quản trị. Mỗi khi cuộc họp hoàn tất hoặc
          AI trích xuất xong Follow-up Tasks, hệ thống sẽ tự động bắn POST webhook kèm chữ ký HMAC
          bảo mật.
        </p>
        <Alert type="info">
          Các sự kiện hỗ trợ bao gồm: <code>meeting.created</code>, <code>meeting.ended</code>,{' '}
          <code>task.extracted</code>, <code>jira.synced</code>.
        </Alert>
      </DocSection>
    </div>
  );
}
