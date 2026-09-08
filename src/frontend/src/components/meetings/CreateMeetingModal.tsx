'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  FileText,
  Upload,
  Clock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { meetingsApi, ApiRequestError } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (meetingId: string) => void;
}

export function CreateMeetingModal({ isOpen, onClose, onCreated }: CreateMeetingModalProps) {
  const router = useRouter();
  const activeOrganization = useAuthStore((state) => state.activeOrganization);

  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [agendaText, setAgendaText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsParsingFile(true);

    try {
      const fileNameLower = file.name.toLowerCase();
      let extractedContent = '';

      if (
        fileNameLower.endsWith('.txt') ||
        fileNameLower.endsWith('.md') ||
        fileNameLower.endsWith('.markdown')
      ) {
        extractedContent = (await file.text()).trim();
      } else {
        // Send to backend text_extractor (handles docx, pdf, xlsx, json, csv without binary garbage)
        const res = await meetingsApi.parseAgenda(file);
        if (res.error) {
          throw new Error(res.error);
        }
        extractedContent = (res.content || '').trim();
      }

      if (!extractedContent) {
        setError('Không tìm thấy nội dung văn bản trong tệp hoặc tệp rỗng.');
        return;
      }

      setAgendaText(extractedContent);
      setUploadedFileName(file.name);
    } catch (err: any) {
      console.warn('File read error:', err);
      setError(err?.message || 'Không thể trích xuất nội dung tệp. Bạn có thể dán trực tiếp nội dung.');
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập chủ đề cuộc họp');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        description: agendaText.trim() || undefined,
        agenda: agendaText.trim() || undefined,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        organization_id: activeOrganization?.id || undefined,
      };

      const created = await meetingsApi.create(payload);

      onClose();
      if (onCreated) {
        onCreated(created.id);
      } else {
        router.push(`/meetings/${created.id}`);
      }
    } catch (err) {
      console.error('Failed to create meeting with agenda:', err);
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Không thể khởi tạo cuộc họp. Vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Thiết Lập Cuộc Họp & Agenda
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Khởi tạo phòng họp và nạp kế hoạch để trợ lý Asightant hỗ trợ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Meeting Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chủ Đề Cuộc Họp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Họp Báo Cáo Tiến Độ & Thống Nhất Kế Hoạch Tuần"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Scheduled At */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Thời Gian Dự Kiến <span className="text-slate-400 font-normal">(tùy chọn)</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Agenda & Kế Hoạch Cuộc Họp (Nhập tay + 1 nút Import File duy nhất) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Kế Hoạch & Agenda Cuộc Họp</span>
              </label>

              {/* Nút Import File duy nhất */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.markdown,.json,.docx,.pdf,.csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isParsingFile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang đọc tệp...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import File (.txt, .md, .docx, .pdf)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {uploadedFileName && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
                <span className="truncate">📎 Đã nạp từ tệp: <strong>{uploadedFileName}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFileName(null);
                    setAgendaText('');
                  }}
                  className="text-emerald-700 hover:text-rose-600 ml-2 font-bold cursor-pointer"
                  title="Xóa nội dung file"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Ô nhập tay / chỉnh sửa Agenda */}
            <textarea
              rows={6}
              value={agendaText}
              onChange={(e) => setAgendaText(e.target.value)}
              placeholder="Nhập hoặc dán nội dung Agenda cuộc họp tại đây (các mục tiêu, gạch đầu dòng công việc, người phụ trách, thời lượng)... Hoặc nhấn nút 'Import File' ở trên để nạp tệp."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 leading-relaxed transition-all resize-y"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>💡 Asightant sẽ đọc toàn bộ nội dung này để trả lời và tổng kết trong phòng họp.</span>
              <span>{agendaText.length} ký tự</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                <>
                  <span>Tạo & Vào Phòng Ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
