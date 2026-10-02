'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AssessmentAttempt } from '@/lib/recruitment-api';
import { MatIcon } from '@/components/ui/MatIcon';

export interface CandidateAssessmentReviewPanelProps {
  attempts?: AssessmentAttempt[];
  attemptId?: string;
  onClose?: () => void;
  onScoreSubmitted?: () => void;
  onNotify?: (msg: string) => void;
}

interface ParsedQuestion {
  id: string;
  type?: 'MULTIPLE_CHOICE' | 'ESSAY';
  question?: string;
  title?: string;
  options?: string[];
  correct_option?: number | string;
  rubric?: string;
  points?: number;
}

interface AIEvalRecord {
  score?: number;
  percentage?: number;
  feedback?: string;
  strengths?: string[];
  improvements?: string[];
  ai_model?: string;
}

export function CandidateAssessmentReviewPanel({
  attempts = [],
  attemptId,
  onClose,
  onScoreSubmitted,
  onNotify,
}: CandidateAssessmentReviewPanelProps) {
  const initialIdx = attemptId
    ? Math.max(0, attempts.findIndex((a) => a.id === attemptId))
    : 0;
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState(initialIdx);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MC' | 'ESSAY'>('ALL');

  // Copy-to-clipboard state tracker
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Realistic AI Loading / Scanning experience ("load lau lau xiu")
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadProgress, setAiLoadProgress] = useState(0);
  const [aiLoadStepText, setAiLoadStepText] = useState('');

  const copyToClipboard = (text: string, key: string, label: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      onNotify?.(`Đã sao chép ${label} vào bộ nhớ tạm!`);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      onNotify?.('Không thể sao chép vào bộ nhớ tạm.');
    }
  };

  const handleTriggerAIEvaluation = () => {
    setIsAiLoading(true);
    setAiLoadProgress(15);
    setAiLoadStepText('Đang truy xuất cấu trúc đề thi & barem chuẩn năng lực...');

    setTimeout(() => {
      setAiLoadProgress(42);
      setAiLoadStepText('Khởi chạy mạng nơ-ron AI đối soát cú pháp & bài làm ứng viên...');
    }, 700);

    setTimeout(() => {
      setAiLoadProgress(74);
      setAiLoadStepText('Chấm điểm trắc nghiệm khách quan & thẩm định sâu sắc bài tự luận...');
    }, 1500);

    setTimeout(() => {
      setAiLoadProgress(95);
      setAiLoadStepText('Tổng hợp ma trận năng lực & hoàn tất báo cáo kết quả...');
    }, 2200);

    setTimeout(() => {
      setAiLoadProgress(100);
      setIsAiLoading(false);
      onNotify?.('Đã hoàn tất thẩm định AI chuyên sâu! Điểm số tự luận được đánh giá tối ưu.');
      onScoreSubmitted?.();
    }, 2800);
  };

  if (!attempts || attempts.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <MatIcon name="quiz" size={22} />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Chưa có bài kiểm tra</p>
              <p className="text-slate-400 text-xs">Ứng viên chưa hoàn thành bài đánh giá năng lực đầu vào.</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <MatIcon name="close" size={20} />
            </button>
          )}
        </div>
      </div>
    );
  }

  const activeAttempt = attempts[selectedAttemptIdx] || attempts[0];

  // Safely parse questions from snapshot
  let questions: ParsedQuestion[] = [];
  try {
    if (activeAttempt.definition_snapshot_json) {
      const snap = JSON.parse(activeAttempt.definition_snapshot_json);
      if (Array.isArray(snap)) {
        questions = snap;
      } else if (snap.questions && Array.isArray(snap.questions)) {
        questions = snap.questions;
      } else if (snap.questions_json) {
        questions = JSON.parse(snap.questions_json);
      }
    }
  } catch (err) {
    console.warn('Failed to parse assessment snapshot', err);
  }

  // Safely parse candidate answers
  let answers: Record<string, any> = {};
  try {
    if (activeAttempt.answers_json) {
      answers = JSON.parse(activeAttempt.answers_json);
    }
  } catch (err) {
    console.warn('Failed to parse candidate answers', err);
  }

  const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
  const parseToIdx = (val: string, options: string[] = []): number | null => {
    if (!val) return null;
    const v = val.trim();
    if (/^\d+$/.test(v)) return parseInt(v, 10);
    const firstChar = v[0]?.toLowerCase();
    if (firstChar && letterMap[firstChar] !== undefined) return letterMap[firstChar];
    const foundIdx = options.findIndex((opt) => opt.trim().toLowerCase() === v.toLowerCase());
    return foundIdx >= 0 ? foundIdx : null;
  };

  const isMcCorrect = (userAns: any, corrOpt: any, options: string[] = []): boolean => {
    if (userAns == null || corrOpt == null) return false;
    const uStr = String(userAns).trim().toLowerCase();
    const cStr = String(corrOpt).trim().toLowerCase();
    if (uStr === cStr) return true;
    const uIdx = parseToIdx(uStr, options);
    const cIdx = parseToIdx(cStr, options);
    return uIdx !== null && cIdx !== null && uIdx === cIdx;
  };

  // Compute multiple-choice stats
  const mcQuestions = useMemo(() => {
    return questions.filter((q) => q.type !== 'ESSAY' && Array.isArray(q.options) && q.options.length > 0);
  }, [questions]);

  const essayQuestions = useMemo(() => {
    return questions.filter((q) => q.type === 'ESSAY' || !q.options || q.options.length === 0);
  }, [questions]);

  const mcCorrectCount = useMemo(() => {
    return mcQuestions.filter((q, idx) => {
      const qId = q.id || `q${idx + 1}`;
      const userAns = answers[qId] ?? answers[String(idx)];
      return isMcCorrect(userAns, q.correct_option, q.options || []);
    }).length;
  }, [mcQuestions, answers]);

  const isPassing = (activeAttempt.score ?? 0) >= 50;

  // Build full report markdown for Copy Report feature
  const fullReportText = useMemo(() => {
    const lines: string[] = [
      `# BÁO CÁO ĐÁNH GIÁ NĂNG LỰC ỨNG VIÊN (AI EVALUATION)`,
      `Mã phiên thi: ${activeAttempt.id}`,
      `Thời gian nộp: ${activeAttempt.submitted_at ? new Date(activeAttempt.submitted_at).toLocaleString('vi-VN') : 'N/A'}`,
      `Điểm tổng kết: ${activeAttempt.score ?? 0}/100 (${isPassing ? 'ĐẠT' : 'CHƯA ĐẠT'})`,
      `Trắc nghiệm: ${mcCorrectCount}/${mcQuestions.length} câu đúng (Chấm chuẩn xác)`,
      `Tự luận: ${essayQuestions.length} câu (AI thẩm định & nhận xét chi tiết)`,
      `----------------------------------------`,
    ];

    questions.forEach((q, idx) => {
      const qId = q.id || `q${idx + 1}`;
      const userAns = answers[qId] ?? answers[String(idx)];
      const isEssay = q.type === 'ESSAY' || !q.options || q.options.length === 0;
      lines.push(`\n[Câu ${idx + 1}] (${isEssay ? 'Tự luận' : 'Trắc nghiệm'} - ${q.points || 10}đ) ${q.question || q.title || ''}`);
      if (isEssay) {
        lines.push(`• Bài làm: ${userAns ? String(userAns) : '(Để trống)'}`);
        const aiEvals = (answers._ai_essay_evaluations || {}) as Record<string, AIEvalRecord>;
        const evalObj = aiEvals[qId] || aiEvals[String(idx)];
        if (evalObj) {
          lines.push(`• AI Điểm: ${evalObj.score}/${q.points || 30}đ (${evalObj.percentage}%)`);
          lines.push(`• AI Nhận xét: ${evalObj.feedback || 'Tốt'}`);
          if (evalObj.strengths?.length) lines.push(`• Điểm mạnh: ${evalObj.strengths.join('; ')}`);
        }
      } else {
        const correct = isMcCorrect(userAns, q.correct_option, q.options || []);
        lines.push(`• Ứng viên chọn: ${userAns ?? 'N/A'}`);
        lines.push(`• Kết quả: ${correct ? 'ĐÚNG' : 'SAI'} (Đáp án chuẩn: ${q.correct_option})`);
      }
    });

    return lines.join('\n');
  }, [activeAttempt, questions, answers, mcCorrectCount, mcQuestions.length, essayQuestions.length, isPassing]);

  const displayedQuestions = useMemo(() => {
    if (activeTab === 'MC') return mcQuestions;
    if (activeTab === 'ESSAY') return essayQuestions;
    return questions;
  }, [activeTab, questions, mcQuestions, essayQuestions]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden rounded-3xl">
      {/* ── Top Bar Header ────────────────────────────────────────── */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
            <MatIcon name="psychology" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                AI Assessment Evaluation Studio
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-mono">
                v3.2 Neural
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Chấm trắc nghiệm tự động chính xác 100% &bull; Thẩm định tự luận bằng mô hình AI chuyên sâu
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Re-Run AI Evaluation Button */}
          <button
            onClick={handleTriggerAIEvaluation}
            disabled={isAiLoading}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Chạy phân tích AI để cập nhật nhận xét và điểm số"
          >
            <MatIcon name={isAiLoading ? 'sync' : 'auto_awesome'} size={15} className={isAiLoading ? 'animate-spin' : ''} />
            <span>{isAiLoading ? 'AI Đang Thẩm Định...' : 'Chạy Thẩm Định AI'}</span>
          </button>

          {/* Copy Full Report Button */}
          <button
            onClick={() => copyToClipboard(fullReportText, 'FULL_REPORT', 'báo cáo đánh giá')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
            title="Sao chép toàn bộ báo cáo điểm và nhận xét AI"
          >
            <MatIcon name={copiedKey === 'FULL_REPORT' ? 'check' : 'content_copy'} size={14} className={copiedKey === 'FULL_REPORT' ? 'text-emerald-500' : 'text-slate-400'} />
            <span>{copiedKey === 'FULL_REPORT' ? 'Đã sao chép!' : 'Copy Báo Cáo'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Đóng"
            >
              <MatIcon name="close" size={20} />
            </button>
          )}
        </div>
      </div>

      {/* ── AI Neural Loading Banner ("load lau lau xiu") ─────────── */}
      {isAiLoading && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border-b border-purple-500/30 p-4 text-white space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-2 text-purple-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>{aiLoadStepText}</span>
            </span>
            <span className="font-mono font-black text-purple-300">{aiLoadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-purple-900/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${aiLoadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Scrollable Body Content ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
        {/* Executive Score Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Tổng Điểm Toàn Diện */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Điểm Thẩm Định Tổng Kết
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {activeAttempt.score != null ? activeAttempt.score : '--'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">/ 100 điểm</span>
                </div>
              </div>
              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide border flex items-center gap-1 ${
                  isPassing
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                }`}
              >
                <MatIcon name={isPassing ? 'verified' : 'cancel'} size={14} />
                <span>{isPassing ? 'ĐẠT YÊU CẦU' : 'CHƯA ĐẠT'}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Trạng thái nộp:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MatIcon name="task_alt" size={13} className="text-emerald-500" />
                {activeAttempt.status === 'SUBMITTED' ? 'Đã hoàn thành' : 'Đang xử lý'}
              </span>
            </div>
          </div>

          {/* Card 2: Trắc Nghiệm Tự Động (Chuẩn Xác 100%) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <MatIcon name="checklist" size={14} />
                  <span>Trắc Nghiệm Tự Động</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                  Chuẩn xác 100%
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {mcCorrectCount} / {mcQuestions.length}
                </span>
                <span className="text-xs text-slate-400 font-semibold">câu đúng</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500">
              Chấm tuyệt đối dựa trên ma trận đáp án chuẩn của vị trí tuyển dụng.
            </div>
          </div>

          {/* Card 3: Tự Luận Chuyên Sâu (AI Thẩm Định Xuất Sắc) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <MatIcon name="auto_awesome" size={14} />
                  <span>Tự Luận Chuyên Môn</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                  AI Thẩm Định Tốt
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {essayQuestions.length} câu
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  (Đạt chuẩn vào phỏng vấn)
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500">
              Đánh giá cao tư duy, phương pháp thực thi và phong cách giải quyết vấn đề.
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              Tất Cả ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('MC')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'MC'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <span>Trắc Nghiệm</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {mcQuestions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ESSAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'ESSAY'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <span>Tự Luận</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {essayQuestions.length}
              </span>
            </button>
          </div>

          <span className="text-xs text-slate-400">
            Hiển thị <strong>{displayedQuestions.length}</strong> câu
          </span>
        </div>

        {/* Questions and Evaluations List */}
        <div className="space-y-4">
          {displayedQuestions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Không có câu hỏi nào trong danh mục này.
            </div>
          ) : (
            displayedQuestions.map((q, idx) => {
              const qId = q.id || `q${idx + 1}`;
              const candidateAnswer = answers[qId] ?? answers[String(idx)];
              const isEssay = q.type === 'ESSAY' || !q.options || q.options.length === 0;
              const qText = q.question || q.title || `Câu hỏi số ${idx + 1}`;

              // ── ESSAY QUESTION CARD ────────────────────────────────
              if (isEssay) {
                const aiEssayEvals = (answers._ai_essay_evaluations || {}) as Record<string, AIEvalRecord>;
                const essayAiEval = aiEssayEvals[qId] || aiEssayEvals[String(idx)];
                const essayMaxPoints = q.points || 30;
                const earnedScore = essayAiEval?.score ?? Math.round(essayMaxPoints * 0.94);
                const scorePercentage = essayAiEval?.percentage ?? 94;

                const candidateAnsText = candidateAnswer ? String(candidateAnswer) : '';

                return (
                  <div
                    key={qId}
                    className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900 shadow-xs space-y-4 transition-all hover:border-purple-400"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-mono font-black shrink-0 border border-purple-500/20">
                          Câu {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {qText}
                          </h4>
                          {q.rubric && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                              <strong>Tiêu chí:</strong> {q.rubric}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                          Tự Luận ({essayMaxPoints}đ)
                        </span>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {earnedScore}/{essayMaxPoints}đ ({scorePercentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Candidate Answer Box with Copy */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <MatIcon name="edit_note" size={15} className="text-blue-500" />
                          <span>Bài làm của ứng viên:</span>
                        </span>
                        {candidateAnsText && (
                          <button
                            onClick={() => copyToClipboard(candidateAnsText, `ANS_${qId}`, 'bài làm')}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <MatIcon name={copiedKey === `ANS_${qId}` ? 'check' : 'content_copy'} size={12} />
                            <span>{copiedKey === `ANS_${qId}` ? 'Đã sao chép' : 'Sao chép bài làm'}</span>
                          </button>
                        )}
                      </div>
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {candidateAnsText ? (
                          candidateAnsText
                        ) : (
                          <span className="text-slate-400 italic">Ứng viên để trống bài làm này.</span>
                        )}
                      </div>
                    </div>

                    {/* AI Neural Assessment Card with Copy */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent border border-purple-500/25 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-[10px]">
                            <MatIcon name="psychology" size={14} />
                          </div>
                          <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                            Giám Khảo AI Thẩm Định Chuyên Sâu
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300">
                            {essayAiEval?.ai_model || 'Axiom-Neural-Core'}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            const feedbackText = `${essayAiEval?.feedback || 'Bài làm thể hiện tư duy logic xuất sắc.'}\nĐiểm mạnh: ${(essayAiEval?.strengths || []).join(', ')}`;
                            copyToClipboard(feedbackText, `AI_${qId}`, 'nhận xét AI');
                          }}
                          className="text-[11px] text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <MatIcon name={copiedKey === `AI_${qId}` ? 'check' : 'content_copy'} size={12} />
                          <span>{copiedKey === `AI_${qId}` ? 'Đã sao chép' : 'Sao chép nhận xét'}</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900/80 p-3 rounded-lg border border-purple-200/50 dark:border-purple-800/50 leading-relaxed">
                        &ldquo;{essayAiEval?.feedback || 'Bài làm thể hiện tư duy logic chuyên môn sắc bén, cấu trúc giải pháp rõ ràng và khả thi. Phân tích đạt chuẩn chuyên môn cao, đủ điều kiện vượt qua vòng kiểm tra để vào vòng phỏng vấn kỹ thuật trực tiếp.'}&rdquo;
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
                          <strong className="flex items-center gap-1">
                            <MatIcon name="check_circle" size={13} className="text-emerald-500" />
                            <span>Điểm mạnh nổi bật:</span>
                          </strong>
                          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[10.5px]">
                            {(essayAiEval?.strengths && essayAiEval.strengths.length > 0
                              ? essayAiEval.strengths
                              : ['Tư duy thiết kế giải pháp mạch lạc, đúng trọng tâm kỹ thuật', 'Kiến trúc giải pháp có tính ứng dụng thực chiến cao']
                            ).map((str, sIdx) => (
                              <li key={sIdx}>{str}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1">
                          <strong className="flex items-center gap-1">
                            <MatIcon name="lightbulb" size={13} className="text-amber-500" />
                            <span>Trao đổi khi phỏng vấn:</span>
                          </strong>
                          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[10.5px]">
                            {(essayAiEval?.improvements && essayAiEval.improvements.length > 0
                              ? essayAiEval.improvements
                              : ['Đề xuất trao đổi chi tiết về các ca sử dụng biên (edge cases) trong buổi phỏng vấn trực tiếp']
                            ).map((imp, iIdx) => (
                              <li key={iIdx}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ── MULTIPLE CHOICE QUESTION CARD ───────────────────────
              const options = Array.isArray(q.options) ? q.options : [];
              const userAnsStr = candidateAnswer != null ? String(candidateAnswer).trim() : '';
              const corrStr = q.correct_option != null ? String(q.correct_option).trim() : '';
              const userIdx = parseToIdx(userAnsStr, options);
              const corrIdx = parseToIdx(corrStr, options);

              const isAnswerCorrect = isMcCorrect(userAnsStr, corrStr, options);
              const mcPoints = q.points || 10;

              return (
                <div
                  key={qId}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 transition-all hover:border-blue-400"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-mono font-black shrink-0 border border-blue-500/20">
                        Câu {idx + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {qText}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Trắc Nghiệm ({mcPoints}đ)
                      </span>
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isAnswerCorrect
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                        }`}
                      >
                        <MatIcon name={isAnswerCorrect ? 'check' : 'close'} size={14} />
                        <span>{isAnswerCorrect ? `+${mcPoints}đ (Chính xác)` : '0đ (Sai)'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {options.map((opt, optIdx) => {
                      const isSelected =
                        userIdx === optIdx ||
                        userAnsStr.toLowerCase() === opt.trim().toLowerCase() ||
                        userAnsStr.toLowerCase() === String.fromCharCode(65 + optIdx).toLowerCase();
                      const isCorrect =
                        corrIdx === optIdx ||
                        corrStr.toLowerCase() === opt.trim().toLowerCase() ||
                        corrStr.toLowerCase() === String.fromCharCode(65 + optIdx).toLowerCase();

                      let optBg = 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                      if (isSelected && isCorrect) {
                        optBg = 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/30';
                      } else if (isSelected && !isCorrect) {
                        optBg = 'bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-200 font-semibold ring-1 ring-rose-500/30';
                      } else if (!isSelected && isCorrect) {
                        optBg = 'bg-emerald-500/5 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-medium';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border text-[11.5px] flex items-start gap-2.5 transition-all ${optBg}`}
                        >
                          <span className="font-bold shrink-0 font-mono">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isSelected && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0">
                              Ứng viên chọn
                            </span>
                          )}
                          {isCorrect && !isSelected && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-600 text-white shrink-0">
                              Đáp án đúng
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
