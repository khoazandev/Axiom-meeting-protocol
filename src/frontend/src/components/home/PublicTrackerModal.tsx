'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  Video,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Award,
  Sparkles,
} from 'lucide-react';
import { publicCareersApi, PublicTrackResponse } from '@/lib/recruitment-api';
import { CompanyLogo } from '@/lib/companyLogos';
import { toast } from 'sonner';

interface PublicTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackingCode?: string;
  initialEmail?: string;
}

const STAGES_PIPELINE = [
  { key: 'INVITED', label: '1. Tiếp Nhận Hồ Sơ' },
  { key: 'ASSESSMENT', label: '2. Đánh Giá Năng Lực' },
  { key: 'INTERVIEW', label: '3. Phỏng Vấn Chuyên Môn' },
  { key: 'APPROVAL', label: '4. Ban Lãnh Đạo Phê Duyệt' },
  { key: 'HIRED', label: '5. Bổ Nhiệm & Cấp Tài Khoản' },
];

function getStageStepIndex(stage: string): number {
  switch (stage) {
    case 'INVITED':
      return 0;
    case 'ASSESSMENT_PENDING':
    case 'ASSESSMENT_SUBMITTED':
      return 1;
    case 'INTERVIEW_SCHEDULED':
    case 'INTERVIEW_COMPLETED':
      return 2;
    case 'HR_REVIEW_PENDING':
    case 'OWNER_APPROVAL_PENDING':
      return 3;
    case 'APPROVED':
    case 'ONBOARDING_INVITED':
    case 'HIRED':
      return 4;
    default:
      return 0;
  }
}

export function PublicTrackerModal({
  isOpen,
  onClose,
  initialTrackingCode = '',
  initialEmail = '',
}: PublicTrackerModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [trackingCode, setTrackingCode] = useState(initialTrackingCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicTrackResponse | null>(null);

  useEffect(() => {
    if (initialTrackingCode) setTrackingCode(initialTrackingCode);
    if (initialEmail) setEmail(initialEmail);
    if (initialTrackingCode && initialEmail && isOpen) {
      handleQuery(initialEmail, initialTrackingCode);
    }
  }, [initialTrackingCode, initialEmail, isOpen]);

  if (!isOpen) return null;

  const handleQuery = async (queryEmail: string, queryCode: string) => {
    setError(null);
    if (!queryEmail.trim() || !queryEmail.includes('@')) {
      setError('Vui lòng nhập email chính xác để tra cứu.');
      return;
    }
    if (!queryCode.trim()) {
      setError('Vui lòng nhập mã hồ sơ (ví dụ: AXM-12345678).');
      return;
    }

    try {
      setLoading(true);
      const res = await publicCareersApi.track(queryEmail.trim(), queryCode.trim());
      setData(res);
    } catch (err: any) {
      setData(null);
      setError(err?.message || 'Không tìm thấy hồ sơ phù hợp với thông tin đã nhập.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(email, trackingCode);
  };

  const isRejected = data?.stage === 'REJECTED';
  const isHired = data?.stage === 'HIRED' || data?.stage === 'ONBOARDING_INVITED' || data?.stage === 'APPROVED';
  const currentStep = data ? getStageStepIndex(data.stage) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-10 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tra Cứu Tiến Độ Tuyển Dụng Trực Tuyến
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Theo dõi quy trình thẩm định hồ sơ theo thời gian thực tại Axiom
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={onSubmit} className="p-6 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/30 dark:bg-neutral-900/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 block">
                Địa chỉ Email ứng tuyển
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ungvien@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 block">
                Mã Hồ Sơ (Tracking Code)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="AXM-XXXXXXX"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 dark:text-neutral-500">
              Kiểm tra hộp thư Gmail để lấy mã hồ sơ do Axiom gửi.
            </span>
            <button
              type="submit"
              disabled={loading}
              className="w-36 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {loading ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang tra cứu...</span>
                </div>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Tra Cứu Ngay</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Content Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Không tìm thấy dữ liệu</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {/* Job & Org Summary Header */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CompanyLogo
                    orgName={data.organization_name}
                    logoUrl={data.organization_logo_url}
                    size={46}
                    className="shadow-xs shrink-0"
                  />
                  <div>
                    <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-bold mb-1">
                      {data.tracking_code}
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {data.opening_title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      {data.department_name || 'Bộ Phận Chuyên Môn'} • {data.organization_name}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10.5px] uppercase font-bold text-slate-400 dark:text-neutral-500 block">
                    Ngày nộp hồ sơ
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {data.applied_at ? new Date(data.applied_at).toLocaleDateString('vi-VN') : 'Mới nộp'}
                  </span>
                </div>
              </div>

              {/* Recruitment Pipeline Stepper */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-neutral-300 block">
                  Tiến Trình Ứng Tuyển
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {STAGES_PIPELINE.map((step, idx) => {
                    const isPassed = !isRejected && currentStep > idx;
                    const isCurrent = !isRejected && currentStep === idx;
                    const isFuture = !isRejected && currentStep < idx;

                    return (
                      <div
                        key={step.key}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isPassed
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : isCurrent
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 font-bold'
                            : isRejected && currentStep === idx
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400'
                            : 'bg-slate-50/50 dark:bg-neutral-800/40 border-slate-200 dark:border-neutral-800 text-slate-400 dark:text-neutral-500'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1">
                          Bước {idx + 1}
                        </div>
                        <div className="text-xs font-medium truncate" title={step.label.split('. ')[1]}>
                          {step.label.split('. ')[1]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Explanation Card */}
              <div className={`p-4 rounded-xl border ${
                isRejected
                  ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                  : isHired
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
              }`}>
                <div className="flex items-start gap-3">
                  {isRejected ? (
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  ) : isHired ? (
                    <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <FileCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                      Chi Tiết Trạng Thái Hiện Tại
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 mt-1 leading-relaxed">
                      {data.status_description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assessment Status Subcard */}
              {data.requires_assessment && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-neutral-200 block">
                      Bài Kiểm Tra Đánh Giá Năng Lực
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Trạng thái: {data.assessment_status === 'SUBMITTED' ? 'Đã hoàn thành' : 'Đang chờ thực hiện'}
                    </span>
                  </div>
                  {data.assessment_score !== null && data.assessment_score !== undefined ? (
                    <div className="px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold font-mono">
                      {data.assessment_score} / 100 Điểm
                    </div>
                  ) : null}
                </div>
              )}

              {/* Interview Status Subcard */}
              {data.interview_scheduled_at && (
                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Lịch Phỏng Vấn Trực Tuyến
                    </span>
                    <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                      {new Date(data.interview_scheduled_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                    Vui lòng chuẩn bị camera và microphone trước giờ phỏng vấn. Bạn có thể truy cập qua liên kết phòng họp gửi trong email.
                  </p>
                </div>
              )}
            </div>
          )}

          {!data && !error && (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-neutral-500">
              Nhập Email và Mã hồ sơ ở trên để kiểm tra kết quả tuyển dụng của bạn.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
