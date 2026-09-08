'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { meetingsApi, ApiRequestError } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Upload,
  X,
  Paperclip,
  Sparkles,
  ListOrdered,
  Briefcase,
  Users,
  FileText,
  BookOpen,
  Clock,
  Check,
} from 'lucide-react';
import Logo from '@/components/Logo';

interface AgendaTemplate {
  id: string;
  title: string;
  icon: React.ElementType;
  badge: string;
  duration: string;
  content: string;
}

const AGENDAS_TEMPLATES: AgendaTemplate[] = [
  {
    id: 'sprint-planning',
    title: 'Sprint Planning & Architecture Review',
    icon: Briefcase,
    badge: 'Agile / Dev',
    duration: '45 phút',
    content: `## MỤC TIÊU SPRINT & KIẾN TRÚC HỆ THỐNG
1. Đánh giá kết quả Sprint trước và giải quyết nợ kỹ thuật (Technical Debt)
2. Thống nhất kiến trúc LiveKit SFU & CTranslate2 Sub-second Audio Translation
3. Review và chấm điểm Story Points cho các Jira Tasks ưu tiên cao
4. Phân bổ trách nhiệm (Assignees) & cam kết Deadline giao hàng`,
  },
  {
    id: 'daily-standup',
    title: 'Daily Standup & Blocker Sync',
    icon: Users,
    badge: 'Hàng Ngày',
    duration: '15 phút',
    content: `## DAILY STANDUP & ĐỒNG BỘ TIẾN ĐỘ
1. Thành quả đã hoàn thành trong 24 giờ qua của từng thành viên
2. Kế hoạch công việc trọng tâm trong 24 giờ tới
3. Các khó khăn / Blockers cần hỗ trợ giải tỏa ngay lập tức
4. Cập nhật trạng thái các issue trên bảng Mini Jira Kanban`,
  },
  {
    id: 'board-meeting',
    title: 'Ban Giám Đốc / Executive Strategy & MoM',
    icon: FileText,
    badge: 'Chiến Lược',
    duration: '60 phút',
    content: `## HỌP BAN ĐIỀU HÀNH & NGHỊ QUYẾT CHIẾN LƯỢC
1. Báo cáo tiến độ kinh doanh và chỉ số KPI quý hiện tại
2. Chiến lược phát triển sản phẩm công nghệ Axiom Platform
3. Quyết nghị phân bổ ngân sách và nhân sự cho các dự án trọng điểm
4. Thống nhất MoM (Minutes of Meeting) và phân quyền giám sát thực thi`,
  },
  {
    id: 'one-on-one',
    title: '1-on-1 Performance & OKR Alignment',
    icon: BookOpen,
    badge: 'Nhân Sự',
    duration: '30 phút',
    content: `## 1-ON-1 TRAO ĐỔI ĐỊNH HƯỚNG CÁ NHÂN
1. Đánh giá mức độ hoàn thành OKRs cá nhân tháng vừa qua
2. Lắng nghe phản hồi về môi trường làm việc và khối lượng công việc
3. Định hướng lộ trình phát triển năng lực chuyên môn và kỹ năng
4. Thỏa thuận các mục tiêu hành động cụ thể trong tháng tiếp theo`,
  },
];

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return '📄';
  if (ext === 'docx' || ext === 'doc') return '📝';
  if (ext === 'xlsx' || ext === 'xls') return '📊';
  return '📃';
}

export default function CreateMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeOrganization = useAuthStore((state) => state.activeOrganization);

  const [title, setTitle] = useState('');
  const [agendaText, setAgendaText] = useState('');
  const [agendaMode, setAgendaMode] = useState<'template' | 'upload' | 'text'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Files to upload after meeting is created
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleSelectTemplate = (tpl: AgendaTemplate) => {
    setSelectedTemplateId(tpl.id);
    setAgendaText(tpl.content);
    if (!title) {
      setTitle(tpl.title);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setPendingFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...selected.filter((f) => !existing.has(f.name))];
    });

    // Auto-extract text from first file if text/md
    const first = selected[0];
    if (first && (first.name.endsWith('.txt') || first.name.endsWith('.md'))) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const txt = ev.target?.result as string;
        if (txt && !agendaText) setAgendaText(txt.slice(0, 5000));
      };
      reader.readAsText(first);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (name: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1. Create the meeting with agenda
      const payload = {
        title: title.trim(),
        description: agendaText.trim() || undefined,
        agenda: agendaText.trim() || undefined,
        organization_id: activeOrganization?.id || null,
      };
      const created = await meetingsApi.create(payload);
      const meetingId = created.id;

      // 2. Upload all pending files (if any)
      if (pendingFiles.length > 0) {
        const token = localStorage.getItem('axiom_token') || '';
        const orgRaw = localStorage.getItem('axiom_organization');
        const orgId = orgRaw ? JSON.parse(orgRaw)?.id || '' : '';

        await Promise.allSettled(
          pendingFiles.map((file) => {
            const fd = new FormData();
            fd.append('file', file);
            return fetch(`/api/v1/meetings/${meetingId}/files`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'X-Organization-ID': orgId },
              body: fd,
            });
          })
        );
      }

      // 3. Navigate to meeting room
      router.push(`/meetings/${meetingId}`);
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create meeting.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header Back Button & Logo */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại bàn làm việc</span>
          </button>
          <Logo size={26} showText={true} subtitle="DEPLOY" variant="white" />
        </div>

        <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Khởi Tạo Cuộc Họp & Nhập Agenda AI
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Hệ thống sẽ nạp toàn bộ Agenda và tài liệu vào Asightant AI để đồng hành xuyên suốt
              cuộc họp.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Chủ đề cuộc họp <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Q3 Architecture Review & Security Gate"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/15 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* ── Agenda Import Section ── */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4 text-blue-400" />
                    Kế Hoạch & Agenda Cuộc Họp
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Asightant sẽ theo dõi và giải đáp câu hỏi dựa trên các mục này
                  </p>
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setAgendaMode('template')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      agendaMode === 'template'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Mẫu AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgendaMode('upload')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      agendaMode === 'upload'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tải File
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgendaMode('text')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      agendaMode === 'text'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tự Nhập
                  </button>
                </div>
              </div>

              {/* Mode 1: Templates */}
              {agendaMode === 'template' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {AGENDAS_TEMPLATES.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    const Icon = tpl.icon;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-md ring-1 ring-blue-500/40'
                            : 'bg-slate-950/60 hover:bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-1.5 rounded-lg ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold leading-snug line-clamp-1">
                              {tpl.title}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5 pt-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-white/10 font-medium text-slate-300">
                            {tpl.badge}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {tpl.duration}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode 2: Upload */}
              {agendaMode === 'upload' && (
                <label className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-blue-500/30 bg-blue-600/5 cursor-pointer hover:border-blue-500/60 hover:bg-blue-600/10 transition-all group text-center">
                  <Upload className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-white font-bold">
                    Click để chọn tài liệu Agenda
                  </span>
                  <span className="text-[11px] text-slate-400">
                    PDF, Word (.docx), Excel (.xlsx), Markdown (.md), TXT
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.md"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}

              {/* Editable Agenda Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold">Nội dung Agenda nạp vào AI:</span>
                  <span className="font-mono text-[10px]">{agendaText.length} ký tự</span>
                </div>
                <textarea
                  rows={4}
                  value={agendaText}
                  onChange={(e) => setAgendaText(e.target.value)}
                  placeholder="Nhập hoặc dán các mục thảo luận chính...&#10;1. Khảo sát nhu cầu&#10;2. Đánh giá tính khả thi&#10;3. Kế hoạch triển khai"
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-white/15 text-slate-100 text-xs font-mono leading-relaxed placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-y"
                />
              </div>

              {/* Selected file list */}
              {pendingFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Tài liệu đính kèm ({pendingFiles.length}):
                  </span>
                  {pendingFiles.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-950 border border-white/10"
                    >
                      <span className="text-base">{getFileIcon(f.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">{f.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {(f.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.name)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo phòng họp và nạp Agenda...</span>
                </>
              ) : (
                'Khởi Tạo Cuộc Họp & Mở Phòng Ngay'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
