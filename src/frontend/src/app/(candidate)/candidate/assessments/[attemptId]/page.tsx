'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { candidateApi, AssessmentAttempt, AssessmentQuestion } from '@/lib/recruitment-api';
import { useCandidateStore } from '@/lib/store/useCandidateStore';
import {
  FileCheck2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react';

export default function CandidateAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useCandidateStore();

  const attemptId = typeof params?.attemptId === 'string' ? params.attemptId : Array.isArray(params?.attemptId) ? params.attemptId[0] : '';

  const [assessment, setAssessment] = useState<AssessmentAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    attemptId ? null : 'Mã bài kiểm tra không hợp lệ.'
  );

  const questions: AssessmentQuestion[] = React.useMemo(() => {
    if (!assessment) return [];
    if (assessment.questions_snapshot && Array.isArray(assessment.questions_snapshot)) {
      return assessment.questions_snapshot;
    }
    if (assessment.definition_snapshot_json) {
      try {
        const parsed = JSON.parse(assessment.definition_snapshot_json);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
      } catch {
        // ignore
      }
    }
    return [];
  }, [assessment]);

  useEffect(() => {
    let ignore = false;

    if (!token) {
      router.replace('/login');
      return;
    }

    if (!attemptId) return;

    candidateApi
      .getAssessment(attemptId, token)
      .then((data) => {
        if (ignore) return;
        setAssessment(data);
        if (data.submitted_at) {
          setSubmitted(true);
        }
        if (data.answers_json) {
          try {
            const parsedAnswers =
              typeof data.answers_json === 'string'
                ? JSON.parse(data.answers_json)
                : data.answers_json;
            const initialAnswers: Record<string, string> = {};
            Object.entries(parsedAnswers).forEach(([k, v]) => {
              initialAnswers[k] = String(v ?? '');
            });
            setAnswers(initialAnswers);
          } catch {
            // ignore
          }
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        console.error('Failed to load assessment', err);
        setErrorMessage('Không thể tải bài đánh giá hoặc bạn không có quyền truy cập.');
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [attemptId, token, router]);

  const handleAnswerChange = (qId: string, value: string) => {
    if (submitted || submitting) return;
    setAnswers((prev) => ({
      ...prev,
      [qId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !assessment || submitted || submitting) return;

    // Validate required questions
    for (const q of questions) {
      const isRequired = q.required !== false;
      const ans = answers[q.id]?.trim();
      if (isRequired && !ans) {
        alert(`Vui lòng hoàn thành câu hỏi: "${q.text}"`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const updated = await candidateApi.submitAssessment(assessment.id, answers, token);
      setAssessment(updated);
      setSubmitted(true);
      alert('Nộp bài đánh giá thành công!');
      router.push('/candidate/applications');
    } catch (err: unknown) {
      console.error('Submission failed', err);
      alert('Không thể nộp bài đánh giá lúc này. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500">Đang tải nội dung bài kiểm tra...</p>
      </div>
    );
  }

  if (errorMessage || !assessment) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-center shadow-md">
        <AlertCircle size={32} className="text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Lỗi Tải Bài Đánh Giá</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{errorMessage}</p>
        <Link
          href="/candidate/applications"
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <ArrowLeft size={14} />
          <span>Về trang hồ sơ</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/candidate/applications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Quay lại tổng quan</span>
        </Link>

        {submitted ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            <CheckCircle2 size={14} />
            <span>Đã Nộp Bài</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold">
            <Clock size={14} />
            <span>Đang Làm Bài</span>
          </span>
        )}
      </div>

      {/* Intro Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FileCheck2 size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              Bài Đánh Giá Năng Lực Ứng Viên
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tổng số câu hỏi: <strong>{questions.length}</strong> • Lưu trữ bất biến để đảm bảo tính minh bạch
            </p>
          </div>
        </div>

        {submitted && assessment.score !== null && assessment.score !== undefined && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 font-medium">
            <span>Điểm số kết quả:</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {assessment.score} / 100
            </span>
          </div>
        )}
      </div>

      {/* Questions Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q, idx) => {
          const currentVal = answers[q.id] || '';
          const isRequired = q.required !== false;

          return (
            <div
              key={q.id || idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {q.text} {isRequired && <span className="text-rose-500">*</span>}
                  </label>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {q.type}
                </span>
              </div>

              {/* Multiple Choice with fixed-width anti-CLS trigger */}
              {q.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2 pt-1">
                  {q.options && q.options.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = currentVal === opt;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={submitted}
                            onClick={() => handleAnswerChange(q.id, opt)}
                            title={opt}
                            className={`w-[220px] shrink-0 text-left px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center justify-between cursor-pointer disabled:cursor-not-allowed ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate" title={opt}>{opt}</span>
                            <div
                              className={`w-3.5 h-3.5 rounded-full border shrink-0 ml-2 flex items-center justify-center ${
                                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      disabled={submitted}
                      value={currentVal}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Nhập câu trả lời của bạn..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                    />
                  )}
                </div>
              )}

              {/* Text Area */}
              {q.type === 'TEXT' && (
                <textarea
                  rows={3}
                  disabled={submitted}
                  value={currentVal}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Ghi rõ quan điểm, phân tích và giải pháp của bạn..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 transition-all resize-none"
                />
              )}

              {/* Code Area */}
              {q.type === 'CODE' && (
                <textarea
                  rows={5}
                  disabled={submitted}
                  value={currentVal}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="// Viết mã nguồn hoặc cấu trúc thuật toán..."
                  className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 transition-all resize-none"
                />
              )}
            </div>
          );
        })}

        {/* Action Button */}
        {!submitted && (
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>{submitting ? 'Đang Nộp Bài...' : 'Hoàn Tất & Nộp Bài'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
