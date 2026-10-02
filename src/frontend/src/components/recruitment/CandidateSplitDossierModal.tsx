'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Send,
  Calendar,
  Award,
  Video,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import {
  recruitmentApi,
  RecruitmentApplication,
  RecruitmentStage,
  UserResume,
} from '@/lib/recruitment-api';
import { OrgMemberDetail } from '@/lib/api';
import { CVData } from '@/types/cv';
import { CVTemplateRenderer } from '@/components/cv/CVTemplateRenderer';

const STAGE_LABELS: Record<string, { label: string; badge: string }> = {
  INVITED: {
    label: 'Đã mời',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  ASSESSMENT_PENDING: {
    label: 'Chờ làm test',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  ASSESSMENT_SUBMITTED: {
    label: 'Đã nộp test',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  INTERVIEW_SCHEDULED: {
    label: 'Đã lên lịch PV',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  INTERVIEW_COMPLETED: {
    label: 'Đã phỏng vấn',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  HR_REVIEW_PENDING: {
    label: 'Chờ HR duyệt',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  OWNER_APPROVAL_PENDING: {
    label: 'Chờ Owner duyệt',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  ONBOARDING_INVITED: {
    label: 'Đã gửi Onboarding',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  },
  HIRED: {
    label: 'Đã tuyển dụng',
    badge: 'bg-emerald-600 text-white',
  },
  REJECTED: {
    label: 'Không đạt',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  },
  WITHDRAWN: {
    label: 'Rút hồ sơ',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
  EXPIRED: {
    label: 'Hết hạn',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
};

export interface CandidateSplitDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: RecruitmentApplication;
  organizationId: string;
  userRole?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  canManage?: boolean;
  availableMembers?: OrgMemberDetail[];
  onStageChange?: (applicationId: string, nextStage: RecruitmentStage, version?: number) => Promise<void>;
  onOwnerApprove?: (applicationId: string, version?: number) => Promise<void>;
  onOwnerReject?: (applicationId: string, version?: number, reason?: string) => Promise<void>;
  onReject?: (applicationId: string, version?: number, reason?: string) => Promise<void>;
  onAssignHR?: (hrMemberId: string | null) => Promise<void>;
  onIssueOnboarding?: (applicationId: string) => Promise<void>;
  onReviewAssessment?: (attemptId: string) => void;
  onReviewInterview?: (sessionId: string) => void;
  onSubmitHRReview?: (decision: 'HIRE' | 'NO_HIRE' | 'NEEDS_MORE_EVIDENCE', reason: string, aiDiff?: string) => Promise<void>;
  onNotify?: (msg: string) => void;
  onRefresh?: () => void;
}

export function CandidateSplitDossierModal({
  isOpen,
  onClose,
  application,
  organizationId,
  userRole = 'OWNER',
  canManage = true,
  availableMembers = [],
  onStageChange,
  onOwnerApprove,
  onOwnerReject,
  onReject,
  onAssignHR,
  onIssueOnboarding,
  onReviewAssessment,
  onReviewInterview,
  onSubmitHRReview,
  onNotify,
  onRefresh,
}: CandidateSplitDossierModalProps) {
  // Mobile active tab ('dossier' | 'cv')
  const [activeMobileTab, setActiveMobileTab] = useState<'dossier' | 'cv'>('dossier');

  // Resume state
  const [resume, setResume] = useState<UserResume | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [zoomScale, setZoomScale] = useState(0.85);

  // Form states for HR Review / Stage actions
  const [reviewDecision, setReviewDecision] = useState<'HIRE' | 'NO_HIRE' | 'NEEDS_MORE_EVIDENCE'>('HIRE');
  const [reviewReason, setReviewReason] = useState('');
  const [aiDiffReason, setAiDiffReason] = useState('');
  const [ownerRejectReason, setOwnerRejectReason] = useState('');
  const [generalRejectReason, setGeneralRejectReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load CV document
  useEffect(() => {
    let ignore = false;
    if (!isOpen || !application?.id) return;

    setLoadingResume(true);
    recruitmentApi
      .getApplicationResume(organizationId, application.id)
      .then((doc: UserResume) => {
        if (!ignore) {
          setResume(doc);
          setLoadingResume(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          console.warn('Could not load CV document:', err);
          setLoadingResume(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, application?.id, organizationId]);

  // Derived candidate attributes with robust fallbacks
  const rawCandName =
    application.candidate?.full_name ||
    (application as any).candidate_name ||
    'Ứng viên';
  const candName = rawCandName.replace(/\s*\(Chưa gia nhập\)/gi, '').trim() || 'Ứng viên';
  const opTitle =
    application.opening?.title ||
    (application as any).opening_title ||
    'Vị trí tuyển dụng';
  const candEmail =
    application.candidate?.email ||
    (application as any).candidate_email ||
    'N/A';
  const candPhone =
    application.candidate?.phone ||
    (application as any).candidate_phone ||
    'Chưa có';
  const stageMeta = STAGE_LABELS[application.stage] || {
    label: application.stage,
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  };

  const lastAttempt = application.assessment_attempts?.[0];
  const lastInterview = application.interview_sessions?.[0];
  const aiEval = application.ai_evaluations?.[0];
  const hrReview = application.hr_review;

  // Parse CV data
  const pdfInfo = useMemo<{ fileName: string; dataUrl: string } | null>(() => {
    if (!resume?.cv_data_json) return null;
    try {
      const parsed = JSON.parse(resume.cv_data_json);
      if (parsed.pdf_data_url || parsed.dataUrl || resume.template_id === 'pdf-upload' || resume.template_id === 'pdf') {
        return {
          fileName: parsed.fileName || resume.title,
          dataUrl: parsed.pdf_data_url || parsed.dataUrl,
        };
      }
    } catch {
      // not a json or pdf
    }
    return null;
  }, [resume]);

  const parsedCvData = useMemo<CVData | null>(() => {
    if (pdfInfo) return null;
    if (!resume?.cv_data_json) return null;
    try {
      return JSON.parse(resume.cv_data_json) as CVData;
    } catch {
      return null;
    }
  }, [resume?.cv_data_json, pdfInfo]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Stage Action Handlers
  const handleApproveCV = async () => {
    if (!onStageChange) return;
    setIsActionLoading(true);
    try {
      await onStageChange(application.id, 'ASSESSMENT_PENDING', application.version);
      onNotify?.('Đã duyệt CV thành công! Ứng viên được chuyển sang bước làm bài kiểm tra.');
    } catch (err: any) {
      onNotify?.(err.message || 'Lỗi duyệt CV');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectCV = async () => {
    if (!onReject) return;
    setIsActionLoading(true);
    try {
      await onReject(application.id, application.version, 'Không đạt vòng sơ loại hồ sơ CV');
      onNotify?.('Đã từ chối hồ sơ ứng viên');
    } catch (err: any) {
      onNotify?.(err.message || 'Lỗi khi từ chối hồ sơ');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOwnerApproveAction = async () => {
    if (!onOwnerApprove) return;
    setIsActionLoading(true);
    try {
      await onOwnerApprove(application.id, application.version);
      onNotify?.('Chủ sở hữu đã phê duyệt tuyển dụng thành công!');
    } catch (err: any) {
      onNotify?.(err.message || 'Lỗi phê duyệt tuyển dụng');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOwnerRejectAction = async () => {
    if (!onOwnerReject) return;
    if (!ownerRejectReason.trim()) {
      onNotify?.('Vui lòng nhập lý do từ chối tuyển dụng');
      return;
    }
    setIsActionLoading(true);
    try {
      await onOwnerReject(application.id, application.version, ownerRejectReason.trim());
      onNotify?.('Đã từ chối hồ sơ tuyển dụng');
      setOwnerRejectReason('');
    } catch (err: any) {
      onNotify?.(err.message || 'Lỗi từ chối tuyển dụng');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleManagerSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitHRReview) return;
    if (!reviewReason.trim() || reviewReason.trim().length < 5) {
      onNotify?.('Vui lòng nhập lý do đánh giá chi tiết (tối thiểu 5 ký tự)');
      return;
    }
    setIsActionLoading(true);
    try {
      await onSubmitHRReview(reviewDecision, reviewReason.trim(), aiDiffReason.trim() || undefined);
      setReviewReason('');
      setAiDiffReason('');
    } catch (err: any) {
      onNotify?.(err.message || 'Lỗi gửi đánh giá');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGeneralRejectAction = async () => {
    if (!onReject) return;
    setIsActionLoading(true);
    try {
      await onReject(application.id, application.version, generalRejectReason.trim() || undefined);
      onNotify?.('Đã đánh rớt hồ sơ ứng viên');
      setGeneralRejectReason('');
    } catch (err: any) {
      onNotify?.(err.message || 'Lỗi từ chối ứng viên');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-[96vw] xl:max-w-7xl h-[92vh] max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ── Top Dual-Screen Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
              {(candName.charAt(0) || 'U').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md" title={candName}>
                  {candName}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${stageMeta.badge}`}>
                  {stageMeta.label}
                </span>
                {application.stage === 'OWNER_APPROVAL_PENDING' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Chờ Owner Phê Duyệt
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Vị trí: <strong className="text-slate-700 dark:text-slate-300">{opTitle}</strong> • Email: {candEmail} • SĐT: {candPhone}
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Tab Switcher (< lg screens) */}
            <div className="flex lg:hidden items-center bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveMobileTab('dossier')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeMobileTab === 'dossier'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Hồ Sơ Ứng Viên
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab('cv')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeMobileTab === 'cv'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Bản CV Chi Tiết
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 2-Screen Split View Body ── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── SCREEN 1 (LEFT 5/12 COLS): CANDIDATE DOSSIER & WORKFLOW ─── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div
            className={`lg:col-span-5 h-full overflow-y-auto p-4 sm:p-5 space-y-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 ${
              activeMobileTab === 'cv' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Candidate Overview Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MatIcon name="person" size={16} className="text-blue-600" />
                <span>Thông Tin Ứng Tuyển</span>
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">Họ tên:</span>
                  <strong className="text-slate-800 dark:text-slate-100">{candName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Vị trí:</span>
                  <strong className="text-slate-800 dark:text-slate-100">{opTitle}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Email:</span>
                  <span className="truncate block" title={candEmail}>{candEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Số điện thoại:</span>
                  <span>{candPhone}</span>
                </div>
              </div>

              {application.candidate?.cv_url && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="text-slate-400 mr-1.5">Link ngoài:</span>
                  <a
                    href={application.candidate.cv_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{application.candidate.cv_url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {application.candidate?.notes && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                  &ldquo;{application.candidate.notes}&rdquo;
                </div>
              )}
            </div>

            {/* Assessment Test Results Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MatIcon name="quiz" size={16} className="text-purple-600" />
                  <span>Bài Kiểm Tra Năng Lực</span>
                </span>
                {lastAttempt && onReviewAssessment && (
                  <button
                    type="button"
                    onClick={() => onReviewAssessment(lastAttempt.id)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 cursor-pointer border border-purple-200 dark:border-purple-800"
                  >
                    Chi Tiết Bài Làm
                  </button>
                )}
              </div>

              {lastAttempt ? (
                <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Điểm số đạt được:</span>
                    <span className="text-lg font-black text-purple-700 dark:text-purple-300">
                      {lastAttempt.score != null ? `${lastAttempt.score} / 100` : 'Đang chấm'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                    {lastAttempt.status === 'SUBMITTED' ? '✓ Đã hoàn thành' : 'Đang làm bài'}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Chưa có dữ liệu bài kiểm tra.</p>
              )}
            </div>

            {/* Interview Sessions Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MatIcon name="video_camera_front" size={16} className="text-amber-600" />
                  <span>Phỏng Vấn & Đánh Giá</span>
                </span>
                {lastInterview?.status === 'COMPLETED' && onReviewInterview && (
                  <button
                    type="button"
                    onClick={() => onReviewInterview(lastInterview.id)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 hover:bg-amber-100 cursor-pointer border border-amber-200 dark:border-amber-800"
                  >
                    Xem Biên Bản
                  </button>
                )}
              </div>

              {lastInterview ? (
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Trạng thái buổi họp:</span>
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
                      {lastInterview.status === 'COMPLETED' ? 'Đã phỏng vấn xong' : 'Đã lên lịch phỏng vấn'}
                    </span>
                  </div>
                  {lastInterview.scheduled_at && (
                    <span className="text-[11px] text-slate-500">
                      {new Date(lastInterview.scheduled_at).toLocaleString('vi-VN')}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Chưa có lịch phỏng vấn.</p>
              )}
            </div>

            {/* AI Evaluation & HR Review Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MatIcon name="rate_review" size={16} className="text-indigo-600" />
                <span>Đánh Giá Từ HR & Phân Tích AI</span>
              </span>

              {hrReview && (
                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200">Đề xuất chuyên môn:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      hrReview.decision === 'HIRE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {hrReview.decision === 'HIRE' ? 'Đề xuất tuyển' : 'Không đạt'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic">{hrReview.reason}</p>
                </div>
              )}

              {aiEval?.summary ? (
                <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs space-y-1">
                  <span className="font-bold text-purple-900 dark:text-purple-200 block">
                    Gợi ý AI: {aiEval.recommendation}
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {aiEval.summary}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Chưa có kết quả phân tích AI.</p>
              )}
            </div>

            {/* Stage Decision Actions (Dành cho Quản lý / Owner) */}
            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MatIcon name="admin_panel_settings" size={16} className="text-blue-600" />
                <span>Quyết Định Tuyển Dụng</span>
              </span>

              {/* OWNER Specific: HR Assignment */}
              {userRole === 'OWNER' && onAssignHR && availableMembers.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 block">
                    Phân công Quản lý / HR phụ trách
                  </label>
                  <AxiomSelect
                    value={application.assigned_hr_member_id || 'NONE'}
                    onChange={(val) => onAssignHR(val === 'NONE' ? null : val)}
                    options={[
                      { value: 'NONE', label: 'Chưa phân công' },
                      ...availableMembers.map((m) => ({
                        value: m.id,
                        label: `${m.full_name} (${m.role})`,
                        triggerLabel: m.full_name,
                      })),
                    ]}
                    width="100%"
                    triggerClassName="w-full shrink-0"
                  />
                </div>
              )}

              {/* If stage === INVITED: Approve CV or Reject CV */}
              {application.stage === 'INVITED' && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Ứng viên vừa nộp hồ sơ. Thẩm định CV và quyết định mở bài kiểm tra:
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleApproveCV}
                      disabled={isActionLoading}
                      className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      Duyệt CV & Mở Bài Test
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectCV}
                      disabled={isActionLoading}
                      className="px-3 py-2.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                    >
                      Từ Chối CV
                    </button>
                  </div>
                </div>
              )}

              {/* MANAGER Review Form */}
              {userRole === 'MANAGER' && ['ASSESSMENT_SUBMITTED', 'INTERVIEW_COMPLETED', 'HR_REVIEW_PENDING'].includes(application.stage) && (
                <form onSubmit={handleManagerSubmitReview} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Đề xuất của quản lý:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewDecision('HIRE')}
                        className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          reviewDecision === 'HIRE'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Đề xuất Tuyển
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewDecision('NO_HIRE')}
                        className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          reviewDecision === 'NO_HIRE'
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Không Tuyển
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewDecision('NEEDS_MORE_EVIDENCE')}
                        className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          reviewDecision === 'NEEDS_MORE_EVIDENCE'
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Cần Dữ Liệu
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Lý do đánh giá chi tiết *
                    </label>
                    <textarea
                      required
                      minLength={5}
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="Nhận xét chi tiết về năng lực, văn hóa và kết quả..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Giải trình nếu khác biệt so với gợi ý AI (nếu có)
                    </label>
                    <input
                      type="text"
                      value={aiDiffReason}
                      onChange={(e) => setAiDiffReason(e.target.value)}
                      placeholder="ví dụ: Đánh giá cao tư duy thực tế hơn..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="w-full py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isActionLoading ? 'Đang gửi...' : 'Gửi Đánh Giá Tới Owner'}
                  </button>
                </form>
              )}

              {/* OWNER Approval Stage Action */}
              {userRole === 'OWNER' && application.stage === 'OWNER_APPROVAL_PENDING' && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold">
                    Quản lý chuyên môn đã đề xuất tuyển dụng. Cần quyết định cuối cùng từ Owner:
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleOwnerApproveAction}
                      disabled={isActionLoading}
                      className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      ✓ Phê Duyệt Tuyển Dụng
                    </button>
                    <button
                      type="button"
                      onClick={handleOwnerRejectAction}
                      disabled={isActionLoading}
                      className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      ✕ Từ Chối
                    </button>
                  </div>
                </div>
              )}

              {/* Status notices */}
              {application.stage === 'OWNER_APPROVAL_PENDING' && userRole !== 'OWNER' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold text-center">
                  Hồ sơ đã gửi đánh giá và đang chờ Owner phê duyệt cuối cùng.
                </div>
              )}

              {application.stage === 'APPROVED' && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center">
                    Ứng viên đã được duyệt! Sẵn sàng phát hành thư mời onboarding.
                  </div>
                  {userRole === 'OWNER' && onIssueOnboarding && (
                    <button
                      type="button"
                      onClick={() => onIssueOnboarding(application.id)}
                      disabled={isActionLoading}
                      className="w-full py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      Phát Hành Thư Mời Onboarding
                    </button>
                  )}
                </div>
              )}

              {(application.stage === 'HIRED' || application.stage === 'ONBOARDING_INVITED') && (
                <div className="p-3.5 rounded-xl bg-emerald-600 text-white font-bold text-xs text-center shadow-xs">
                  Ứng viên đã tuyển dụng vào công ty
                </div>
              )}

              {application.stage === 'REJECTED' && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-xs text-center">
                  Ứng viên không đạt / Đã từ chối
                </div>
              )}

              {/* General Reject Button for active stages */}
              {!['INVITED', 'OWNER_APPROVAL_PENDING', 'APPROVED', 'ONBOARDING_INVITED', 'HIRED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'CANCELLED'].includes(application.stage) && (
                <button
                  type="button"
                  onClick={handleGeneralRejectAction}
                  disabled={isActionLoading}
                  className="w-full py-2 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer disabled:opacity-50"
                >
                  Đánh Rớt Ứng Viên
                </button>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── SCREEN 2 (RIGHT 7/12 COLS): LIVE CV ARTBOARD & VIEWER ───── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div
            className={`lg:col-span-7 h-full flex flex-col bg-slate-100/90 dark:bg-slate-950 overflow-hidden ${
              activeMobileTab === 'dossier' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* CV Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {resume?.title || `Bản CV của ${candName}`}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase shrink-0">
                  {pdfInfo ? 'File PDF' : resume?.template_id ? `Mẫu ${resume.template_id}` : 'CV'}
                </span>
                {resume?.ats_score && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 shrink-0">
                    ★ ATS {resume.ats_score}%
                  </span>
                )}
              </div>

              {/* Actions & Zoom Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {!pdfInfo && parsedCvData && (
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setZoomScale((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                      title="Thu nhỏ"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 w-11 text-center select-none">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomScale((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(2))))}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                      title="Phóng to"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(0.85)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 cursor-pointer"
                      title="Khôi phục kích thước chuẩn vừa màn hình"
                    >
                      <RotateCcw className="w-3 h-3 inline mr-0.5" />
                      Chuẩn
                    </button>
                  </div>
                )}

                {pdfInfo?.dataUrl && (
                  <a
                    href={pdfInfo.dataUrl}
                    download={pdfInfo.fileName || `${candName}_CV.pdf`}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Tải file PDF gốc về máy"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải PDF</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="In bản CV này"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In CV</span>
                </button>
              </div>
            </div>

            {/* CV Viewport */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex flex-col items-center justify-start">
              {loadingResume ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs">Đang tải bản CV ứng viên...</p>
                </div>
              ) : pdfInfo?.dataUrl ? (
                /* Native PDF Embed filling viewport cleanly */
                <div className="w-full h-full flex flex-col items-center">
                  <iframe
                    src={pdfInfo.dataUrl}
                    className="w-full h-full min-h-[72vh] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl bg-white"
                    title={pdfInfo.fileName || 'Bản CV'}
                  />
                </div>
              ) : parsedCvData ? (
                /* Scaled A4 Canva CV */
                <div className="w-full flex flex-col items-center justify-start pb-10">
                  <div
                    style={{
                      width: `${794 * zoomScale}px`,
                      height: `${1123 * zoomScale}px`,
                      maxWidth: '100%',
                    }}
                    className="relative overflow-hidden shadow-2xl rounded-sm ring-1 ring-slate-200/80 bg-white"
                  >
                    <div
                      style={{
                        width: '794px',
                        height: '1123px',
                        transform: `scale(${zoomScale})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      <CVTemplateRenderer data={parsedCvData} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-semibold">Chưa có bản CV nào được lưu hoặc liên kết với hồ sơ này.</p>
                  {application.candidate?.cv_url && (
                    <a
                      href={application.candidate.cv_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <span>Mở liên kết CV ngoài</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
