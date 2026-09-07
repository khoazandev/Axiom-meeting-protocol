import DocHeader from "@/components/docs/DocHeader";
import DocSection from "@/components/docs/DocSection";
import Alert from "@/components/docs/Alert";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const metadata = {
  title: "Tài liệu & Hướng dẫn | Axiom DX-OS",
  description: "Hướng dẫn sử dụng và tài liệu kỹ thuật cho Axiom Enterprise Meeting Protocol",
};

const HPDI_PILLARS = [
  {
    letter: "H",
    tag: "Human",
    title: "Phòng họp không phân tâm",
    color: "blue",
    badgeClass: "bg-blue-50 text-[#2563EB] border-blue-200/60",
    desc: "Kết nối trực tiếp qua hạ tầng LiveKit WebRTC hiệu năng cao, hỗ trợ phụ đề và dịch thoại song ngữ Anh - Việt theo thời gian thực với độ trễ thấp.",
    icon: "graphic_eq" as const,
  },
  {
    letter: "P",
    tag: "Process",
    title: "Kỷ luật Agenda Gate",
    color: "amber",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/60",
    desc: "Cơ chế bắt buộc phải có nội dung nghị trình chi tiết (tối thiểu 20 ký tự) mới được phép khởi tạo cuộc họp, triệt tiêu tình trạng họp rác.",
    icon: "gavel" as const,
  },
  {
    letter: "D",
    tag: "Data",
    title: "Chủ quyền dữ liệu On-Premise",
    color: "emerald",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    desc: "Toàn bộ mã nguồn, cơ sở dữ liệu PostgreSQL và hạ tầng AI đều vận hành cục bộ trên Private Cloud/VPC, tuyệt đối không gửi dữ liệu ra bên ngoài.",
    icon: "security" as const,
  },
  {
    letter: "I",
    tag: "Intelligence",
    title: "AI Cục bộ & Mini Jira",
    color: "purple",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200/60",
    desc: "Tự động hóa biên bản cuộc họp (MoM) với Faster-Whisper và Qwen LLM, trích xuất việc cần làm và đẩy 1-click sang Mini Jira Kanban Board.",
    icon: "psychology" as const,
  },
];

const QUICK_STEPS = [
  {
    num: "01",
    title: "Đăng nhập hệ thống",
    desc: "Đăng nhập bằng tài khoản quản trị viên hoặc thành viên tổ chức để nhận quyền truy cập.",
    href: "/login",
    linkText: "Vào trang Đăng nhập",
  },
  {
    num: "02",
    title: "Khởi tạo cuộc họp & Agenda",
    desc: "Thiết lập tiêu đề và nghị trình họp chi tiết (Agenda Gate) để đảm bảo mục tiêu cuộc họp rõ ràng.",
    href: "/member",
    linkText: "Tạo cuộc họp mới",
  },
  {
    num: "03",
    title: "Họp WebRTC & Trợ lý Realtime",
    desc: "Trải nghiệm âm thanh, video chất lượng cao, phụ đề tự động và phiên dịch song ngữ.",
    href: "/member",
    linkText: "Tham gia phòng họp",
  },
  {
    num: "04",
    title: "Nhận MoM & Đồng bộ Jira",
    desc: "AI tự động trích xuất Action Items sau khi kết thúc cuộc họp, đồng bộ vào Kanban Board.",
    href: "/jira",
    linkText: "Mở Mini Jira",
  },
];

export default function DocsPage() {
  return (
    <div className="animate-in fade-in duration-500">
      <DocHeader
        title="Giới thiệu Axiom DX-OS"
        description="Axiom là Hệ điều hành nghi thức cuộc họp số (Digital Enterprise Operating System), bảo mật dữ liệu tuyệt đối on-premise, tích hợp LiveKit WebRTC, kiểm duyệt kỷ luật Agenda Gate và tự động hóa biên bản cuộc họp với AI cục bộ."
        tag="Tổng quan"
      />

      {/* Section 1: Tại sao doanh nghiệp chọn Axiom? */}
      <DocSection title="Tại sao doanh nghiệp chọn Axiom?" id="why">
        <p>
          Trong môi trường doanh nghiệp hiện đại, các cuộc họp thường diễn ra phân mảnh, thiếu kỷ luật nghị trình và tiềm ẩn nguy cơ rò rỉ dữ liệu khi sử dụng các nền tảng đám mây công cộng. Axiom giải quyết triệt để các vấn đề này theo triết lý <strong>H-P-D-I</strong>:
        </p>

        {/* 4 Pillars Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-2">
          {HPDI_PILLARS.map((p) => (
            <div
              key={p.letter}
              className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[13px] border ${p.badgeClass}`}
                    >
                      {p.letter}
                    </span>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                      {p.tag}
                    </span>
                  </div>
                  <MaterialIcon name={p.icon} className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900 mb-1">
                  {p.title}
                </h3>
                <p className="text-[13px] text-slate-600 leading-relaxed mb-0">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      {/* Section 2: Kiến trúc hệ thống */}
      <DocSection title="Kiến trúc hệ thống H-P-D-I" id="architecture">
        <p>
          Axiom được thiết kế theo kiến trúc module phân lớp rõ ràng, đảm bảo độ trễ thấp và khả năng chịu tải cao:
        </p>

        <Alert type="info" title="Lưu ý về Bảo mật & Xử lý thời gian thực">
          Luồng âm thanh từ mic của người tham gia được phân đoạn qua WebAudio API và truyền tải qua WebSocket <code>/ws/realtime-stt</code> tới backend để Faster-Whisper int8 xử lý ngay tức thì.
        </Alert>

        {/* Formatted Architecture Terminal Card */}
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md my-2">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-[11px] text-slate-400 ml-2">architecture-topology.txt</span>
            </div>
            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
              Axiom v2.4 On-Premise
            </span>
          </div>
          <pre className="p-4 text-[12px] font-mono leading-relaxed text-slate-200 overflow-x-auto bg-transparent shadow-none border-none m-0">
{`+-------------------+       +---------------------+       +----------------------+
| Next.js Frontend  |       | FastAPI Backend     |       | Local AI Engine      |
| (React 19 / LiveKit) <---> | (Core REST & WS STT) | <---> | (Whisper, Qwen, CT2) |
+-------------------+       +---------------------+       +----------------------+
          ^                            ^                             ^
          |                            |                             |
          v                            v                             v
+-------------------+       +---------------------+       +----------------------+
| LiveKit WebRTC    |       | PostgreSQL 16 DB    |       | Redis Enterprise     |
| (Media SFU Server)|       | (17 Tables Schema)  |       | (Cache & Broker)     |
+-------------------+       +---------------------+       +----------------------+`}
          </pre>
        </div>
      </DocSection>

      {/* Section 3: Bắt đầu từ đâu? */}
      <DocSection title="Bắt đầu từ đâu?" id="next-steps">
        <p>
          Để làm quen và làm chủ quy trình làm việc với Axiom DX-OS, bạn có thể thực hiện theo các bước sau:
        </p>

        {/* 4 Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-2">
          {QUICK_STEPS.map((st) => (
            <div
              key={st.num}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="text-[12px] font-black text-[#2563EB] mb-1 font-mono">
                  BƯỚC {st.num}
                </div>
                <h4 className="text-[14px] font-bold text-slate-900 mb-1">
                  {st.title}
                </h4>
                <p className="text-[12.5px] text-slate-600 leading-relaxed mb-3">
                  {st.desc}
                </p>
              </div>
              <Link
                href={st.href}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2563EB] hover:underline"
              >
                <span>{st.linkText}</span>
                <MaterialIcon name="arrow_forward" className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>

        <Alert type="success">
          Hệ thống đã sẵn sàng! Bạn có thể xem thêm phần{" "}
          <Link href="/docs/installation" className="font-semibold text-emerald-800 underline">
            Cài đặt & Tích hợp
          </Link>{" "}
          để nắm rõ hướng dẫn triển khai Docker Compose.
        </Alert>
      </DocSection>

      {/* Next Chapter Pagination Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Cập nhật lần cuối: Tháng 9, 2026
        </div>
        <Link
          href="/docs/installation"
          className="group flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all text-right"
        >
          <div>
            <div className="text-[11px] font-medium text-slate-500">Chương tiếp theo</div>
            <div className="text-[13px] font-bold text-slate-900 group-hover:text-[#2563EB]">
              Cài đặt & Triển khai
            </div>
          </div>
          <MaterialIcon
            name="arrow_forward"
            className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-1 transition-transform"
          />
        </Link>
      </div>
    </div>
  );
}
