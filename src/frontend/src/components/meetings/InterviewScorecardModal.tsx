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
} from 'lucide-react';
import { InterviewScorecard, interviewEvaluationApi } from '@/lib/interviewRubric';
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
  candidateName,
  jobTitle,
  onArchiveSuccess,
  onNotify,
}: InterviewScorecardModalProps) {
  const [loadState, setLoadState] = useState<ScorecardLoadState>(() =>
    initialScorecard ? { status: 'ready', scorecard: initialScorecard } : { status: 'loading' }
  );
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'script'>('scorecard');

  const fetchScorecard = useCallback(async () => {
    if (!orgId || !sessionId) {
      setLoadState({ status: 'empty' });
      return;
    }
    setLoadState({ status: 'loading' });
    setArchiveError(null);
    try {
      const data = await interviewEvaluationApi.getScorecard(orgId, sessionId);
      if (!data) {
        setLoadState({ status: 'empty' });
      } else {
        setLoadState({ status: 'ready', scorecard: data });
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Chưa thể phân tích bảng điểm phỏng vấn');
      if (msg.includes('404') || msg.toLowerCase().includes('không tìm thấy')) {
        setLoadState({ status: 'empty' });
      } else {
        setLoadState({ status: 'error', message: msg });
      }
    }
  }, [orgId, sessionId]);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    void (async () => {
      await Promise.resolve();
      if (ignore) return;
      if (initialScorecard) {
        setLoadState({ status: 'ready', scorecard: initialScorecard });
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
          style: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
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
                Ứng viên: <strong className="text-slate-700 dark:text-slate-200">{candidateName || 'Ứng viên'}</strong> • Vị trí: <span className="font-semibold text-blue-600 dark:text-blue-400">{jobTitle || 'Vị trí tuyển dụng'}</span>
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

        {/* LOADING STATE */}
        {loadState.status === 'loading' && (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Đang Phân Tích Thang Điểm Phỏng Vấn
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Trợ lý AI đang xử lý transcript, tính toán độ trễ phản hồi, tốc độ nói WPM và đối soát tiêu chuẩn STAR...
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {loadState.status === 'empty' && (
          <div className="p-16 text-center space-y-3">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Chưa có bảng điểm
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Phiên phỏng vấn này chưa có dữ liệu đánh giá hoặc đang chờ hoàn tất ghi âm để trích xuất điểm.
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
                                Trọng số: {p.weight_percent}% • Độ tin cậy AI: {Math.round(p.confidence * 100)}%
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
                              <div key={idx} className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={12} className="shrink-0" />
                                <span>{s}</span>
                              </div>
                            ))}
                            {p.improvements.map((im, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
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
                    <span className="text-[11px] text-slate-400">
                      Độ trễ lý tưởng: 1.5s - 3.5s
                    </span>
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
                            <strong className={turn.star_method_used ? 'text-emerald-600' : 'text-slate-500'}>
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
                  Xác nhận đưa biên bản và thang điểm vào Kho Lưu Trữ Tài Liệu (Dành cho Owner & HR Manager)
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 w-28 py-2 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer truncate"
                  title="Đóng bảng điểm"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={handleConfirmArchive}
                  disabled={isArchiving || isSuccess}
                  className="shrink-0 w-60 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer truncate"
                  title="Xác nhận lưu trữ biên bản và thang điểm vào kho tài liệu doanh nghiệp"
                >
                  {isArchiving ? (
                    <>
                      <Loader2 size={14} className="animate-spin shrink-0" />
                      <span className="truncate">Đang lưu trữ vào kho...</span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-200 shrink-0" />
                      <span className="truncate">Đã lưu vào kho thành công!</span>
                    </>
                  ) : (
                    <>
                      <Archive size={14} className="shrink-0" />
                      <span className="truncate">Xác Nhận & Đưa Vào Kho</span>
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
