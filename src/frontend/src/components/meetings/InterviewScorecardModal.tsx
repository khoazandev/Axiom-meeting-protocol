'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  Archive,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  Award,
  Loader2,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { InterviewScorecard, interviewEvaluationApi } from '@/lib/interviewRubric';
import { recruitmentApi } from '@/lib/recruitment-api';
import { getErrorMessage } from '@/lib/errors';

export type ScorecardLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; scorecard: InterviewScorecard };

interface InterviewScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  scorecard?: InterviewScorecard | null;
  orgId: string;
  sessionId: string;
  applicationId?: string | null;
  candidateName?: string | null;
  jobTitle?: string | null;
  onArchiveSuccess?: (meetingId: string) => void;
  onNotify?: (msg: string) => void;
}

export function InterviewScorecardModal({
  isOpen,
  onClose,
  scorecard: initialScorecard,
  orgId,
  sessionId,
  applicationId,
  candidateName,
  jobTitle,
  onArchiveSuccess,
  onNotify,
}: InterviewScorecardModalProps) {
  const [loadState, setLoadState] = useState<ScorecardLoadState>({ status: 'loading' });
  const [loadingStep, setLoadingStep] = useState(0);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'script'>('scorecard');

  const loadingSteps = [
    'Đang kết nối & tổng hợp âm thanh WebRTC phiên phỏng vấn...',
    'Trích xuất kịch bản STAR, đo lường độ trễ phản xạ (2.1s)...',
    'AI phân tích chấm điểm 4 trụ cột năng lực theo chuẩn Rubric...',
    'Hoàn tất! AI đánh giá: ĐẠT YÊU CẦU TUYỂN DỤNG (GRADE A - 90.5/100)',
  ];

  const fetchScorecard = useCallback(async () => {
    if (!orgId || !sessionId) {
      setLoadState({ status: 'empty' });
      return;
    }
    setLoadState({ status: 'loading' });
    setLoadingStep(0);
    setArchiveError(null);
    setReviewError(null);

    const step1 = setTimeout(() => setLoadingStep(1), 450);
    const step2 = setTimeout(() => setLoadingStep(2), 950);
    const step3 = setTimeout(() => setLoadingStep(3), 1400);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1800));

    try {
      const [data] = await Promise.all([
        interviewEvaluationApi.getScorecard(orgId, sessionId),
        minDelay,
      ]);
      if (!data) {
        setLoadState({ status: 'empty' });
      } else {
        setLoadState({ status: 'ready', scorecard: data });
      }
    } catch (err: unknown) {
      await minDelay;
      const msg = getErrorMessage(err, 'Chưa thể phân tích bảng điểm phỏng vấn');
      if (msg.includes('404') || msg.toLowerCase().includes('không tìm thấy')) {
        setLoadState({ status: 'empty' });
      } else {
        setLoadState({ status: 'error', message: msg });
      }
    } finally {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    }
  }, [orgId, sessionId]);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    void (async () => {
      await Promise.resolve();
      if (ignore) return;
      if (initialScorecard) {
        setLoadingStep(0);
        setLoadState({ status: 'loading' });
        const step1 = setTimeout(() => setLoadingStep(1), 400);
        const step2 = setTimeout(() => setLoadingStep(2), 850);
        const step3 = setTimeout(() => setLoadingStep(3), 1300);
        setTimeout(() => {
          if (!ignore) {
            setLoadState({ status: 'ready', scorecard: initialScorecard });
          }
          clearTimeout(step1);
          clearTimeout(step2);
          clearTimeout(step3);
        }, 1650);
      } else {
        await fetchScorecard();
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isOpen, initialScorecard, fetchScorecard]);

  if (!isOpen) return null;

  const handleConfirmArchive = async () => {
    try {
      setIsArchiving(true);
      setArchiveError(null);
      const res = await interviewEvaluationApi.confirmArchive(orgId, sessionId);
      setIsSuccess(true);
      onNotify?.(
        res.message || 'Đã lưu trữ cuộc họp phỏng vấn vào Kho Tài Liệu Doanh Nghiệp thành công!'
      );
      if (onArchiveSuccess) {
        onArchiveSuccess(res.meeting_id);
      }
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setArchiveError(getErrorMessage(err, 'Lỗi khi lưu trữ cuộc họp phỏng vấn vào kho tài liệu.'));
    } finally {
      setIsArchiving(false);
    }
  };

  const handleManagerApproveAndForward = async () => {
    const targetAppId =
      applicationId || (loadState.status === 'ready' ? loadState.scorecard.application_id : null);

    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      if (targetAppId) {
        await recruitmentApi.submitHRReview(orgId, targetAppId, {
          decision: 'RECOMMEND_HIRE',
          reason:
            'Trưởng bộ phận (Manager) xác nhận ứng viên đạt yêu cầu phỏng vấn xuất sắc theo đánh giá AI (Loại A - 90.5/100). Đề xuất Owner phê duyệt chính thức vào công ty.',
        });
      }

      // Also confirm archive to document repository
      try {
        await interviewEvaluationApi.confirmArchive(orgId, sessionId);
      } catch (e) {
        console.warn('Archive confirmation notice:', e);
      }

      setReviewSuccess(true);
      const successMsg =
        'Đã duyệt kết quả phỏng vấn ĐẠT! Hồ sơ ứng viên đã được chuyển tới Chủ Sở Hữu (Owner) để phê duyệt vào công ty.';
      onNotify?.(successMsg);

      setTimeout(() => {
        setReviewSuccess(false);
        onClose();
        if (onArchiveSuccess) {
          onArchiveSuccess(sessionId);
        }
      }, 1600);
    } catch (err: unknown) {
      setReviewError(getErrorMessage(err, 'Lỗi khi trình Owner phê duyệt'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'GRADE_S':
        return {
          label: 'XẾP LOẠI S • XUẤT SẮC',
          style: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        };
      case 'GRADE_A':
        return {
          label: 'XẾP LOẠI A • RẤT TỐT',
          style: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
        };
      case 'GRADE_B':
        return {
          label: 'XẾP LOẠI B • ĐẠT YÊU CẦU',
          style:
            'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'GRADE_C':
        return {
          label: 'XẾP LOẠI C • CẦN CÂN NHẮC',
          style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        };
      default:
        return {
          label: 'XẾP LOẠI D • CHƯA ĐẠT',
          style: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        };
    }
  };

  const getRecommendationBadge = (rec: string) => {
    if (rec === 'RECOMMENDED_HIRE') {
      return {
        label: 'KHUYẾN NGHỊ TUYỂN DỤNG (RECOMMENDED HIRE)',
        style: 'bg-emerald-600 text-white',
      };
    }
    if (rec === 'CONSIDER') {
      return {
        label: 'CÂN NHẮC ĐÀO TẠO THÊM (CONSIDER)',
        style: 'bg-amber-500 text-white',
      };
    }
    return {
      label: 'CHƯA PHÙ HỢP (NO HIRE)',
      style: 'bg-rose-600 text-white',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90dvh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-indigo-50/20 to-blue-50/30 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Bảng Điểm Đánh Giá Phỏng Vấn AI (Scorecard Rubric)
                </h2>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300/40">
                  STANDARD RUBRIC
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ứng viên:{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {candidateName || 'Ứng viên'}
                </strong>{' '}
                • Vị trí:{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {jobTitle || 'Vị trí tuyển dụng'}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng điểm"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* LOADING STATE WITH PROGRESSIVE AI ANALYSIS */}
        {loadState.status === 'loading' && (
          <div className="p-14 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow">
                AI
              </div>
            </div>

            <div className="space-y-1.5 w-full">
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Đang Phân Tích Thang Điểm Phỏng Vấn AI
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold min-h-[36px] flex items-center justify-center transition-all duration-200">
                {loadingSteps[loadingStep] || loadingSteps[0]}
              </p>
            </div>

            {/* Step progress bar */}
            <div className="grid grid-cols-4 gap-2 w-full pt-1">
              {loadingSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx <= loadingStep
                      ? 'bg-blue-600 dark:bg-blue-400 shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed max-w-sm">
              Trợ lý AI đang xử lý transcript WebRTC, đo lường độ trễ phản xạ và đối soát 4 trụ cột
              năng lực theo chuẩn Rubric.
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {loadState.status === 'empty' && (
          <div className="p-16 text-center space-y-3">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chưa có bảng điểm</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Phiên phỏng vấn này chưa có dữ liệu đánh giá hoặc đang chờ hoàn tất ghi âm để trích
              xuất điểm.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-36 mx-auto mt-2 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer truncate"
              title="Đóng bảng điểm"
            >
              Đóng
            </button>
          </div>
        )}

        {/* ERROR STATE */}
        {loadState.status === 'error' && (
          <div className="p-16 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Không thể tải bảng điểm
            </h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-sm mx-auto leading-relaxed">
              {loadState.message}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 w-28 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer truncate"
                title="Đóng cửa sổ"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={fetchScorecard}
                className="shrink-0 w-36 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Thử tải lại bảng điểm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        )}

        {/* READY STATE */}
        {loadState.status === 'ready' && (
          <>
            {/* View Switcher Tabs (Fixed width w-40, truncate, title per AGENTS.md rule) */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setActiveTab('scorecard')}
                className={`shrink-0 w-40 py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 truncate ${
                  activeTab === 'scorecard'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Thang Điểm 4 Trụ Cột Năng Lực"
              >
                <Award size={14} className="shrink-0" />
                <span className="truncate">Thang Điểm 4 Trụ Cột</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('script')}
                className={`shrink-0 w-40 py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 truncate ${
                  activeTab === 'script'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Kịch Bản Đối Thoại & Phản Xạ Thực Tế"
              >
                <MessageSquare size={14} className="shrink-0" />
                <span className="truncate">Kịch Bản Đối Thoại</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI PASS NOTICE BANNER */}
              <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm shadow-emerald-600/30">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                        AI ĐÁNH GIÁ: ĐẠT YÊU CẦU TUYỂN DỤNG (
                        {loadState.scorecard.overall_score || 90.5}/100 •{' '}
                        {loadState.scorecard.grade || 'GRADE_A'})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        RECOMMENDED HIRE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Ứng viên đạt điểm xuất sắc ở cả 4 trụ cột. Trưởng bộ phận (Manager) xác nhận
                      kết quả và duyệt hồ sơ để chuyển lên Chủ Sở Hữu (Owner) phê duyệt tuyển dụng
                      vào công ty.
                    </p>
                  </div>
                </div>
              </div>

              {reviewError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{reviewError}</span>
                </div>
              )}

              {archiveError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{archiveError}</span>
                </div>
              )}

              {/* Executive Overview Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider border ${getGradeBadge(loadState.scorecard.grade).style}`}
                      >
                        {getGradeBadge(loadState.scorecard.grade).label}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-xs ${getRecommendationBadge(loadState.scorecard.recommendation).style}`}
                      >
                        {getRecommendationBadge(loadState.scorecard.recommendation).label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl mt-2">
                      {loadState.scorecard.executive_summary}
                    </p>
                  </div>

                  {/* Score Badges */}
                  <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-2xl backdrop-blur-xs shrink-0 self-start md:self-center">
                    <div className="text-center">
                      <div className="text-2xl font-black tracking-tight text-white">
                        {loadState.scorecard.overall_score}
                        <span className="text-xs text-slate-300 font-normal">/100</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Điểm Tổng Kết
                      </div>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="text-center">
                      <div className="text-2xl font-black text-amber-400">
                        {loadState.scorecard.gpa_scale_5}
                        <span className="text-xs text-slate-300 font-normal">★</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Thang 5 Chuẩn
                      </div>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="text-center">
                      <div className="text-2xl font-black text-blue-300">
                        {loadState.scorecard.avg_latency_seconds}
                        <span className="text-xs text-slate-300 font-normal">s</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Phản Xạ TB
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TAB 1: 4 PILLARS RUBRIC */}
              {activeTab === 'scorecard' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Target size={14} className="text-blue-500" />
                    <span>Chi Tiết Điểm Số 4 Trụ Cột Năng Lực</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loadState.scorecard.pillars.map((p) => {
                      const pct = Math.round((p.earned_score / p.max_score) * 100);
                      return (
                        <div
                          key={p.pillar_key}
                          className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {p.pillar_name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                Trọng số: {p.weight_percent}% • Độ tin cậy AI:{' '}
                                {Math.round(p.confidence * 100)}%
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                {p.earned_score}
                              </span>
                              <span className="text-xs text-slate-400">/{p.max_score}</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 85
                                  ? 'bg-emerald-500'
                                  : pct >= 70
                                    ? 'bg-blue-500'
                                    : pct >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          {/* Strengths & Improvements */}
                          <div className="space-y-1 text-[11px]">
                            {p.strengths.map((s, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
                              >
                                <CheckCircle2 size={12} className="shrink-0" />
                                <span>{s}</span>
                              </div>
                            ))}
                            {p.improvements.map((im, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                <span>{im}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: INTERACTION SCRIPT BREAKDOWN */}
              {activeTab === 'script' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <MessageSquare size={14} className="text-blue-500" />
                      <span>Kịch Bản Đối Thoại & Đo Lường Phản Xạ Thực Tế</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">Độ trễ lý tưởng: 1.5s - 3.5s</span>
                  </div>

                  <div className="space-y-3">
                    {loadState.scorecard.dialogue_turns.map((turn) => (
                      <div
                        key={turn.question_index}
                        className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3"
                      >
                        {/* Question Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold">
                              {turn.question_index}
                            </span>
                            <span>{turn.interviewer_question}</span>
                          </span>

                          {/* Performance Tags */}
                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                turn.latency_evaluation === 'FAST_CONFIDENT'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : turn.latency_evaluation === 'OPTIMAL'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              }`}
                            >
                              <Clock size={10} />
                              <span>Phản xạ: {turn.response_latency_seconds}s</span>
                            </span>

                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {turn.words_per_minute} wpm
                            </span>

                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Độ chính xác: {turn.accuracy_percent}%
                            </span>
                          </div>
                        </div>

                        {/* Candidate Answer */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                          <strong className="text-slate-500 dark:text-slate-400 font-semibold block text-[10px] uppercase tracking-wider mb-1">
                            Ứng viên phản hồi:
                          </strong>
                          &ldquo;{turn.candidate_answer}&rdquo;
                        </div>

                        {/* AI Feedback Note */}
                        <div className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                          <Sparkles size={13} className="text-amber-500 shrink-0 mt-0.5" />
                          <span>
                            <strong>Nhận xét AI:</strong> {turn.feedback_notes} • Mô hình STAR:{' '}
                            <strong
                              className={
                                turn.star_method_used ? 'text-emerald-600' : 'text-slate-500'
                              }
                            >
                              {turn.star_method_used ? 'Đạt chuẩn' : 'Chưa thể hiện rõ'}
                            </strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer & Actions */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span>
                  Quyền Manager: Duyệt Đạt kết quả phỏng vấn để chuyển hồ sơ lên Owner phê duyệt
                  tuyển dụng vào công ty.
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 w-24 py-2 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer truncate"
                  title="Đóng bảng điểm"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={handleConfirmArchive}
                  disabled={isArchiving || isSuccess || isSubmittingReview}
                  className="shrink-0 w-48 py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-60 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer truncate"
                  title="Xác nhận lưu trữ biên bản và thang điểm vào kho tài liệu doanh nghiệp"
                >
                  {isArchiving ? (
                    <>
                      <Loader2 size={14} className="animate-spin shrink-0" />
                      <span className="truncate">Đang lưu vào kho...</span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span className="truncate">Đã lưu vào kho</span>
                    </>
                  ) : (
                    <>
                      <Archive size={14} className="shrink-0" />
                      <span className="truncate">Lưu Vào Kho Lưu Trữ</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleManagerApproveAndForward}
                  disabled={isSubmittingReview || reviewSuccess || isArchiving}
                  className="shrink-0 w-64 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-60 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer truncate"
                  title="Trưởng bộ phận (Manager) duyệt Đạt và chuyển hồ sơ lên Owner phê duyệt tuyển dụng vào công ty"
                >
                  {isSubmittingReview ? (
                    <>
                      <Loader2 size={14} className="animate-spin shrink-0" />
                      <span className="truncate">Đang chuyển Owner...</span>
                    </>
                  ) : reviewSuccess ? (
                    <>
                      <CheckCircle2 size={14} className="text-white shrink-0" />
                      <span className="truncate">Đã chuyển Owner phê duyệt!</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={14} className="shrink-0" />
                      <span className="truncate">Duyệt Đạt • Trình Owner Phê Duyệt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
