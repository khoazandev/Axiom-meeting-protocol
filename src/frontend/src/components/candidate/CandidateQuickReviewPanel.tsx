'use client';

import React from 'react';
import {
  Sparkles,
  AlertCircle,
  Cpu,
  Loader2,
  CheckCircle2,
  Zap,
  Check,
  ArrowRight,
} from 'lucide-react';
import { CVReviewResult } from '@/lib/recruitment-api';

export interface CandidateQuickReviewPanelProps {
  cvInputText: string;
  onCvInputTextChange: (value: string) => void;
  cvTargetRole: string;
  onCvTargetRoleChange: (value: string) => void;
  isReviewing: boolean;
  errorMessage: string | null;
  reviewResult: CVReviewResult | null;
  onReview: () => void;
  onGoToJobs?: () => void;
}

export function CandidateQuickReviewPanel({
  cvInputText,
  onCvInputTextChange,
  cvTargetRole,
  onCvTargetRoleChange,
  isReviewing,
  errorMessage,
  reviewResult,
  onReview,
  onGoToJobs,
}: CandidateQuickReviewPanelProps) {
  const isInputValid = cvInputText.trim().length >= 30;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: CV Input & Target Role (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Nội Dung Hồ Sơ Cá Nhân (CV)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dán nội dung CV thực tế của bạn để AI phân tích theo tiêu chuẩn ATS.
            </p>
          </div>

          {/* Target Role Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vị trí ứng tuyển mục tiêu:
            </label>
            <input
              type="text"
              value={cvTargetRole}
              onChange={(e) => onCvTargetRoleChange(e.target.value)}
              placeholder="Ví dụ: Senior AI Fullstack Engineer"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* CV Content Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nội dung CV (Kinh nghiệm, Kỹ năng, Dự án, Học vấn):
            </label>
            <textarea
              rows={14}
              value={cvInputText}
              onChange={(e) => onCvInputTextChange(e.target.value)}
              placeholder="Dán toàn bộ nội dung CV của bạn tại đây (tối thiểu 30 ký tự)..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
              <span>{cvInputText.trim().length} ký tự</span>
              <span>Yêu cầu: ≥ 30 ký tự</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* AI Analyze Trigger */}
          <button
            type="button"
            onClick={onReview}
            disabled={isReviewing || !isInputValid}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isInputValid ? 'Vui lòng nhập ít nhất 30 ký tự nội dung CV' : 'Bắt đầu phân tích & chấm điểm CV'}
          >
            {isReviewing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">AI đang quét & phân tích ATS...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="truncate">AI Phân Tích & Chấm Điểm CV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: AI Scorecard & Recommendations (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {!reviewResult && !isReviewing && (
          <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
            <Cpu className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Sẵn sàng phân tích CV bằng AI
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Hệ thống sẽ đối soát CV với tiêu chuẩn ATS doanh nghiệp, kiểm tra mật độ số liệu định lượng, cấu trúc các phân mục và đề xuất các chỉnh sửa cụ thể trước khi bạn nộp hồ sơ.
            </p>
            <button
              type="button"
              onClick={onReview}
              disabled={isReviewing || !isInputValid}
              className="shrink-0 w-48 mx-auto mt-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer truncate disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isInputValid ? 'Vui lòng nhập ít nhất 30 ký tự nội dung CV' : 'Bắt đầu phân tích CV'}
            >
              Bắt đầu đánh giá ngay
            </button>
          </div>
        )}

        {isReviewing && (
          <div className="p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Đang xử lý thuật toán ATS & Metric Scoring...
              </h3>
              <p className="text-xs text-slate-500">
                Trích xuất cấu trúc STAR, từ khóa kỹ năng và số liệu đo lường hiệu năng.
              </p>
            </div>
          </div>
        )}

        {reviewResult && !isReviewing && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Score Card Header */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    Bảng Đánh Giá AI
                  </span>
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                    Điểm Đánh Giá Hồ Sơ: {reviewResult.overall_score}/100
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {reviewResult.summary_evaluation}
                  </p>
                </div>

                {/* Overall Gauge Badge */}
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 border border-blue-100 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                  <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {reviewResult.overall_score}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">ATS INDEX</span>
                </div>
              </div>

              {/* Sub Pillar Breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-base font-extrabold text-blue-600">{reviewResult.ats_score}%</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Độ Chuẩn ATS</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-base font-extrabold text-emerald-600">{reviewResult.metrics_score}%</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Số Liệu Đo Lường</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-base font-extrabold text-amber-600">{reviewResult.structure_score}%</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Bố Cục Phân Mục</div>
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Điểm Mạnh Nổi Bật ({reviewResult.strengths.length})</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                  {reviewResult.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold shrink-0">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Cần Cải Thiện ({reviewResult.weaknesses.length})</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                  {reviewResult.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold shrink-0">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actionable Suggestions */}
            {reviewResult.suggestions.length > 0 && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Hướng Dẫn Chỉnh Sửa CV Trước Khi Nộp</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {reviewResult.suggestions.map((sug, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{sug}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords Checked */}
            {reviewResult.keyword_matches.length > 0 && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Từ Khóa Chuyên Môn Đã Đối Soát (ATS Matching)
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {reviewResult.keyword_matches.map((kw, idx) => (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 ${
                        kw.found
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500'
                      }`}
                    >
                      {kw.found ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">-</span>}
                      <span>{kw.keyword}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {onGoToJobs && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onGoToJobs}
                  className="shrink-0 w-56 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer truncate"
                  title="Chuyển sang tìm việc để ứng tuyển"
                >
                  <span className="truncate">Khám phá việc làm để nộp CV</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
