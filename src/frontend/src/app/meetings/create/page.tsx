'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { meetingsApi, ApiRequestError } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Paperclip,
} from 'lucide-react';

export default function CreateMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeOrganization = useAuthStore((state) => state.activeOrganization);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  // Files to upload after meeting is created
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setPendingFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...selected.filter((f) => !existing.has(f.name))];
    });
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
      // 1. Create the meeting
      const payload = {
        title: formData.title,
        description: formData.description,
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

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return '📄';
    if (ext === 'docx' || ext === 'doc') return '📝';
    if (ext === 'xlsx' || ext === 'xls') return '📊';
    return '📃';
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-6 md:p-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header Back Button */}
        <Link
          href="/meetings"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Meetings</span>
        </Link>

        <div className="bg-[#131B2E] border border-blue-950/80 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="border-b border-blue-950/60 pb-5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Deploy New Meeting</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure a structured meeting for automated AI post-meeting analytics.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Meeting Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Q3 Architecture Review & Security Gate"
                className="w-full px-4 py-3 rounded-xl bg-[#0B0F19] border border-blue-900/40 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* ── File Attachments ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                  Tài liệu đính kèm
                  <span className="text-slate-500 normal-case font-normal">(tùy chọn)</span>
                </label>
                {pendingFiles.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {pendingFiles.length} file sẵn sàng
                  </span>
                )}
              </div>

              {/* Drop zone */}
              <label className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-950/10 cursor-pointer hover:border-emerald-500/60 hover:bg-emerald-950/20 transition-all group">
                <Upload className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-emerald-400 font-semibold">
                  Click để chọn tài liệu
                </span>
                <span className="text-[11px] text-slate-500">
                  PDF, Word (.docx), Excel (.xlsx), TXT — sẽ được upload sau khi tạo meeting
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

              {/* Selected file list */}
              {pendingFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {pendingFiles.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-emerald-500/20"
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
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-500 text-center">
                    ✨ AI chatbot sẽ dùng các file này để trả lời câu hỏi trong cuộc họp
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {pendingFiles.length > 0
                      ? `Đang tạo và upload ${pendingFiles.length} file...`
                      : 'Deploying Meeting...'}
                  </span>
                </>
              ) : (
                'Deploy & Open Conference'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
