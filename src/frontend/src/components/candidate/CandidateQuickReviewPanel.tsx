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
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { CVReviewResult } from '@/lib/recruitment-api';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

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
  const { t } = useLanguageStore();
  const isInputValid = cvInputText.trim().length >= 30;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ──────────────────────────────────────────────────────────
          LEFT COLUMN: CV Input & Target Role (5 cols)
      ────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neutral-800 dark:text-neutral-200 shrink-0" />
                <span>{t.candidate.cvContentLabel}</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Dán nội dung CV thực tế của bạn để AI phân tích theo tiêu chuẩn ATS.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onCvInputTextChange(
                  `Nguyễn Văn An - Kỹ sư AI & Fullstack\nEmail: vanan.dev@axiom.internal | SĐT: 0987 654 321 | TP. Hồ Chí Minh\n\nTÓM TẮT NGHỀ NGHIỆP:\nKỹ sư phần mềm hơn 4 năm kinh nghiệm chuyên sâu kiến trúc backend phân tán với Python, FastAPI, Docker và xây dựng giao diện người dùng Next.js hiện đại. Từng trực tiếp lãnh đạo đội ngũ kỹ sư tối ưu hóa độ trễ dịch vụ và tích hợp các giải pháp AI vào quy trình doanh nghiệp.\n\nKINH NGHIỆM LÀM VIỆC:\n- Kỹ sư Backend Cấp cao tại Axiom Tech (2022 - Hiện tại):\n  + Xây dựng và vận hành hệ thống microservices phục vụ hơn 150,000 người dùng hoạt động mỗi ngày.\n  + Tối ưu hóa truy vấn cơ sở dữ liệu PostgreSQL và triển khai cụm Redis caching, giảm 42% thời gian phản hồi API (từ 210ms xuống 120ms).\n  + Thiết lập pipeline CI/CD tự động trên Docker & Kubernetes, nâng cao 3x tần suất phát hành sản phẩm.\n- Kỹ sư Phần mềm tại VNG Software (2020 - 2022):\n  + Phát triển các REST API cốt lõi bằng Python FastAPI và kết nối các dịch vụ thanh toán trực tuyến.\n  + Đạt giải thưởng Kỹ sư Tiên tiến quý 3/2021 nhờ đóng góp hoàn thành dự án trước hạn 2 tuần.\n\nHỌC VẤN:\n- Cử nhân Khoa học Máy tính - Đại học Bách Khoa (2016 - 2020) - Tốt nghiệp loại Giỏi (GPA 3.6/4.0).\n\nKỸ NĂNG CHUYÊN MÔN:\nPython, FastAPI, TypeScript, React, Next.js, Docker, Kubernetes, PostgreSQL, Redis, REST API, Microservices, CI/CD, Git, Agile / Scrum, Problem Solving, Leadership.`
                );
                onCvTargetRoleChange('Senior AI Fullstack Engineer');
              }}
              className="shrink-0 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 hover:underline cursor-pointer bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              {t.candidate.loadSampleCV}
            </button>
          </div>

          {/* Target Role Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {t.candidate.targetRoleLabel}
            </label>
            <input
              type="text"
              value={cvTargetRole}
              onChange={(e) => onCvTargetRoleChange(e.target.value)}
              placeholder="Ví dụ: Senior AI Fullstack Engineer"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:bg-white dark:focus:bg-neutral-800 focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10"
            />
          </div>

          {/* CV Content Textarea */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {t.candidate.cvContentLabel}:
            </label>
            <textarea
              rows={14}
              value={cvInputText}
              onChange={(e) => onCvInputTextChange(e.target.value)}
              placeholder="Dán toàn bộ nội dung CV của bạn tại đây (tối thiểu 30 ký tự)..."
              className="w-full p-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-800 dark:text-neutral-200 leading-relaxed focus:outline-hidden focus:bg-white dark:focus:bg-neutral-800 focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10"
            />
            <div className="flex justify-between items-center text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
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

          {/* AI Analyze Trigger (Anti-Layout-Shift Compliant) */}
          <button
            type="button"
            onClick={onReview}
            disabled={isReviewing || !isInputValid}
            className="w-full h-11 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed truncate"
            title={
              !isInputValid
                ? 'Vui lòng nhập ít nhất 30 ký tự nội dung CV'
                : 'Bắt đầu phân tích & chấm điểm CV'
            }
          >
            {isReviewing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">{t.candidate.analyzingCV}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.candidate.analyzeCVBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          RIGHT COLUMN: AI Scorecard & Recommendations (7 cols)
      ────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-7 space-y-4">
        {!reviewResult && !isReviewing && (
          <div className="p-12 rounded-3xl bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 text-center space-y-3">
            <Cpu className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Sẵn sàng phân tích CV bằng AI
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
              Hệ thống sẽ đối soát CV với tiêu chuẩn ATS doanh nghiệp, kiểm tra mật độ số liệu định
              lượng, cấu trúc các phân mục và đề xuất các chỉnh sửa cụ thể trước khi bạn nộp hồ sơ.
            </p>
            <button
              type="button"
              onClick={onReview}
              disabled={isReviewing || !isInputValid}
              className="shrink-0 w-48 h-9 mx-auto mt-2 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-bold transition-all shadow-xs cursor-pointer truncate disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !isInputValid
                  ? 'Vui lòng nhập ít nhất 30 ký tự nội dung CV'
                  : 'Bắt đầu phân tích CV'
              }
            >
              Bắt đầu đánh giá ngay
            </button>
          </div>
        )}

        {isReviewing && (
          <div className="p-16 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-neutral-900 dark:text-white animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Đang xử lý thuật toán ATS & Metric Scoring...
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Trích xuất cấu trúc STAR, từ khóa kỹ năng và số liệu đo lường hiệu năng.
              </p>
            </div>
          </div>
        )}

        {reviewResult && !isReviewing && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Score Card Header */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                    {t.candidate.scorecardTitle}
                  </span>
                  <h2 className="text-lg font-black text-neutral-900 dark:text-white mt-1">
                    {t.candidate.overallScore}: {reviewResult.overall_score}/100
                  </h2>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    {reviewResult.summary_evaluation}
                  </p>
                </div>

                {/* Overall Gauge Badge */}
                <div className="w-24 h-24 rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border border-neutral-800 dark:border-neutral-200 flex flex-col items-center justify-center shrink-0 shadow-md">
                  <span className="text-3xl font-black">
                    {reviewResult.overall_score}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-70">
                    ATS INDEX
                  </span>
                </div>
              </div>

              {/* Sub Pillar Breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center">
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                  <div className="text-base font-extrabold text-neutral-900 dark:text-white">
                    {reviewResult.ats_score}%
                  </div>
                  <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                    {t.candidate.atsMatchRate}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                  <div className="text-base font-extrabold text-neutral-900 dark:text-white">
                    {reviewResult.metrics_score}%
                  </div>
                  <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                    {t.candidate.metricsDepth}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                  <div className="text-base font-extrabold text-neutral-900 dark:text-white">
                    {reviewResult.structure_score}%
                  </div>
                  <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                    {t.candidate.structureLayout}
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="p-5 rounded-3xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200/90 dark:border-neutral-800 space-y-2">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-white shrink-0" />
                  <span>{t.candidate.strengthsTitle} ({reviewResult.strengths.length})</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                  {reviewResult.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="font-bold shrink-0 text-neutral-900 dark:text-white">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="p-5 rounded-3xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200/90 dark:border-neutral-800 space-y-2">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-neutral-900 dark:text-white shrink-0" />
                  <span>{t.candidate.weaknessesTitle} ({reviewResult.weaknesses.length})</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                  {reviewResult.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="font-bold shrink-0 text-neutral-900 dark:text-white">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actionable Suggestions */}
            {reviewResult.suggestions.length > 0 && (
              <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-neutral-800 dark:text-neutral-200 shrink-0" />
                  <span>{t.candidate.suggestionsTitle}</span>
                </h4>
                <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                  {reviewResult.suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center font-bold text-[10px] shrink-0">
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
              <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                  {t.candidate.keywordsTitle}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {reviewResult.keyword_matches.map((kw, idx) => (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                        kw.found
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-2xs'
                          : 'bg-neutral-100 text-neutral-400 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700'
                      }`}
                    >
                      {kw.found ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <span className="w-3 text-center">-</span>
                      )}
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
                  className="shrink-0 w-56 h-9 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer truncate"
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
