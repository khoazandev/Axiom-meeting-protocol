'use client';

import React, { useState } from 'react';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Check,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { PublicJobOpening, UserResume } from '@/lib/recruitment-api';

export interface ApplyFormData {
  sourceType: 'vault' | 'custom';
  resumeId?: string;
  cvUrl?: string;
  cvText?: string;
  phone?: string;
  coverLetter?: string;
}

export interface CandidateApplyDialogProps {
  isOpen: boolean;
  opening: PublicJobOpening | null;
  savedResumes: UserResume[];
  isSubmitting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  initialPhone?: string;
  initialResumeId?: string;
  onClose: () => void;
  onSubmit: (data: ApplyFormData) => Promise<void>;
  onNavigateToCVStudio?: () => void;
}

export function CandidateApplyDialog({
  isOpen,
  opening,
  savedResumes,
  isSubmitting,
  errorMessage,
  successMessage,
  initialPhone = '',
  initialResumeId,
  onClose,
  onSubmit,
  onNavigateToCVStudio,
}: CandidateApplyDialogProps) {
  const [sourceType, setSourceType] = useState<'vault' | 'custom'>('vault');
  const [userSelectedResumeId, setUserSelectedResumeId] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [userPhone, setUserPhone] = useState<string | null>(null);

  const defaultResumeId = initialResumeId || savedResumes.find((r) => r.is_primary)?.id || savedResumes[0]?.id || '';
  const selectedResumeId = userSelectedResumeId ?? defaultResumeId;
  const phone = userPhone ?? initialPhone;

  if (!isOpen || !opening) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenResume = savedResumes.find((r) => r.id === selectedResumeId);
    await onSubmit({
      sourceType,
      resumeId: sourceType === 'vault' ? selectedResumeId || undefined : undefined,
      cvUrl: sourceType === 'custom' ? cvUrl.trim() || undefined : chosenResume ? `resume://${chosenResume.id}` : undefined,
      cvText: sourceType === 'custom' ? undefined : chosenResume?.cv_data_json,
      phone: phone.trim() || undefined,
      coverLetter: coverLetter.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              Nộp Đơn Ứng Tuyển
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
              {opening.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium">{opening.organization_name}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/60 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* CV Source Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Chọn Nguồn Hồ Sơ CV:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('vault')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                  sourceType === 'vault'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>Kho CV ({savedResumes.length})</span>
                {sourceType === 'vault' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
              <button
                type="button"
                onClick={() => setSourceType('custom')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                  sourceType === 'custom'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>Link CV Ngoài</span>
                {sourceType === 'custom' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Source Option 1: Saved CV Picker */}
          {sourceType === 'vault' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bản CV Sử Dụng:
              </label>
              {savedResumes.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <p>Bạn chưa lưu bản CV nào trong kho cá nhân.</p>
                  {onNavigateToCVStudio && (
                    <button
                      type="button"
                      onClick={onNavigateToCVStudio}
                      className="py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Mở Studio Soạn & Lưu CV Ngay
                    </button>
                  )}
                </div>
              ) : (
                <select
                  value={selectedResumeId}
                  onChange={(e) => setUserSelectedResumeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  {savedResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.template_id.toUpperCase()}) {r.ats_score ? `- ATS: ${r.ats_score}%` : ''}{' '}
                      {r.is_primary ? '★ Mặc định' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Source Option 2: Custom CV Link */}
          {sourceType === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Đường dẫn CV (PDF / Google Drive / Portfolio):
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={cvUrl}
                  onChange={(e) => setCvUrl(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc link CV cá nhân"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
                />
                <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Số điện thoại liên lạc:
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setUserPhone(e.target.value)}
              placeholder="0987 654 321"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Cover Letter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Thư giới thiệu bản thân (Cover Letter ngắn gọn):
            </label>
            <textarea
              rows={4}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tôi rất hào hứng được ứng tuyển vào vị trí này vì các kinh nghiệm phù hợp..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-32 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer truncate"
              title="Hủy nộp"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (sourceType === 'vault' && savedResumes.length === 0)}
              className="shrink-0 w-48 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 truncate"
              title="Gửi hồ sơ ứng tuyển"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">Đang nộp...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Xác Nhận Nộp CV</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
