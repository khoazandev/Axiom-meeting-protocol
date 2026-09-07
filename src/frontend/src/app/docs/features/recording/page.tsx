import DocHeader from "@/components/docs/DocHeader";
import DocSection from "@/components/docs/DocSection";
import Alert from "@/components/docs/Alert";

export const metadata = { title: "LiveKit & Phụ đề Realtime | Axiom DX-OS" };

export default function RecordingPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <DocHeader title="LiveKit WebRTC & Phụ đề Realtime" description="Truyền thông hợp nhất qua WebRTC và nhận diện lời thoại trực tiếp theo thời gian thực." tag="Tính năng cốt lõi" />
      <DocSection title="Hội nghị truyền hình LiveKit On-Premise" id="webrtc">
        <p>Axiom tích hợp sâu với LiveKit Media Server tự lưu trữ. Người dùng tham gia cuộc họp trực tiếp trên trình duyệt mà không cần cài đặt thêm phần mềm mở rộng.</p>
        <Alert type="info">Âm thanh từ micro được kích hoạt VAD (Voice Activity Detection) bằng Silero VAD để chỉ gửi các gói âm thanh chứa tiếng nói qua WebSocket <code>/ws/realtime-stt</code>, giảm tải tối đa băng thông.</Alert>
      </DocSection>
      <DocSection title="Phụ đề & Phiên dịch đa ngữ" id="translation">
        <p>Mỗi câu nói được mô hình Faster-Whisper large-v3 chuyển thành văn bản và chuyển qua CTranslate2 để hiển thị phụ đề song ngữ Anh-Việt tức thì trên màn hình phòng họp.</p>
      </DocSection>
    </div>
  );
}
