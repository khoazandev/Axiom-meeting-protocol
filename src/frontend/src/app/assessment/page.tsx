'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { publicCareersApi } from '@/lib/recruitment-api';
import {
  FileCheck2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Sparkles,
  FileQuestion,
  XCircle,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Building2,
  User,
  ExternalLink,
  Check,
} from 'lucide-react';

interface PublicAssessmentData {
  attempt_id: string;
  application_id: string;
  title?: string;
  opening_title?: string;
  department_name?: string;
  organization_name?: string;
  candidate_name?: string;
  candidate_email?: string;
  status: string;
  score?: number | null;
  duration_minutes: number;
  passing_score?: number;
  questions: any[];
  requires_webcam?: boolean;
  stage?: string;
  answers_json?: string | null;
  submitted_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
}

function PublicAssessmentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  // States
  const [assessment, setAssessment] = useState<PublicAssessmentData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : 'Thiếu mã truy cập bài đánh giá (token). Vui lòng kiểm tra lại liên kết trong email của bạn.'
  );

  // Pre-Exam Start Gate & Fullscreen Monitor States
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const examGracePeriodRef = useRef<number>(0);

  // Timer countdown in seconds
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Anti-Cheat Security States
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [activeWarningModal, setActiveWarningModal] = useState<{ level: number; message: string } | null>(null);
  const [isViolationTerminated, setIsViolationTerminated] = useState(false);
  const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);

  // Question navigation
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [reviewMode, setReviewMode] = useState<boolean>(false);

  // Ref trackers
  const lastViolationTimeRef = useRef<number>(0);
  const isTerminatedRef = useRef<boolean>(false);
  const submittedRef = useRef<boolean>(false);

  // Parse questions
  const questions = useMemo(() => {
    if (!assessment || !Array.isArray(assessment.questions)) return [];
    return assessment.questions.map((q: any, idx: number) => ({
      id: String(q.id || `q_${idx + 1}`),
      text: q.text || q.question || `Câu hỏi ${idx + 1}`,
      type: q.type === 'ESSAY' || q.type === 'TEXT' ? 'TEXT' : (q.type || 'MULTIPLE_CHOICE'),
      options: Array.isArray(q.options) ? q.options : [],
      required: q.required !== false,
      points: q.points ?? 10,
      rubric: q.rubric,
      description: q.description || null,
      correct_option: q.correct_option,
    }));
  }, [assessment]);

  const passingScore = assessment?.passing_score ?? 50;

  const isPassed = useMemo(() => {
    if (!submitted) return false;
    if (isViolationTerminated) return false;
    const s = assessment?.score ?? 0;
    return s >= passingScore;
  }, [submitted, isViolationTerminated, assessment?.score, passingScore]);

  // Helper to verify multiple choice correctness
  const checkAnswerCorrectness = useCallback(
    (userAns: string | undefined, correctOpt: any, options?: string[]): boolean => {
      if (!userAns || correctOpt === undefined || correctOpt === null) return false;
      const uStr = String(userAns).trim().toLowerCase();
      const cStr = String(correctOpt).trim().toLowerCase();
      if (uStr === cStr) return true;

      const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
      const revLetter: Record<number, string> = { 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e' };

      let uIdx: number | null = null;
      if (/^\d+$/.test(uStr)) {
        uIdx = parseInt(uStr, 10);
      } else if (uStr in letterMap) {
        uIdx = letterMap[uStr];
      } else if (options) {
        options.forEach((opt, idx) => {
          if (opt.trim().toLowerCase() === uStr) uIdx = idx;
          const prefix = revLetter[idx];
          if (prefix && (uStr.startsWith(`${prefix}.`) || uStr.startsWith(`${prefix})`))) {
            uIdx = idx;
          }
        });
      }

      let cIdx: number | null = null;
      if (/^\d+$/.test(cStr)) {
        cIdx = parseInt(cStr, 10);
      } else if (cStr in letterMap) {
        cIdx = letterMap[cStr];
      } else if (options) {
        options.forEach((opt, idx) => {
          if (opt.trim().toLowerCase() === cStr) cIdx = idx;
          const prefix = revLetter[idx];
          if (prefix && (cStr.startsWith(`${prefix}.`) || cStr.startsWith(`${prefix})`))) {
            cIdx = idx;
          }
        });
      }

      if (uIdx !== null && cIdx !== null) return uIdx === cIdx;
      return false;
    },
    []
  );

  // Completion metrics
  const answeredCount = useMemo(() => {
    return questions.filter((q) => Boolean(answers[q.id]?.trim())).length;
  }, [questions, answers]);

  const progressPercent = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round((answeredCount / questions.length) * 100);
  }, [answeredCount, questions.length]);

  // 1. Fetch Assessment via public Careers API
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let ignore = false;
    publicCareersApi
      .getAssessment(token)
      .then((data: PublicAssessmentData) => {
        if (ignore) return;
        setAssessment(data);

        const isAlreadySubmitted = Boolean(
          (data.status === 'SUBMITTED' && data.submitted_at) ||
          (data as any).is_submitted ||
          data.status === 'FAILED'
        );
        if (isAlreadySubmitted) {
          setSubmitted(true);
          submittedRef.current = true;
          setIsExamStarted(true);
        } else {
          setSubmitted(false);
          submittedRef.current = false;
          setIsExamStarted(false);
        }

        // Initialize previous answers
        if (data.answers_json) {
          try {
            const parsed = typeof data.answers_json === 'string' ? JSON.parse(data.answers_json) : data.answers_json;
            const initAnswers: Record<string, string> = {};
            const sourceAnswers = parsed.answers || parsed;
            if (typeof sourceAnswers === 'object' && sourceAnswers !== null) {
              Object.entries(sourceAnswers).forEach(([k, v]) => {
                if (!k.startsWith('_')) {
                  initAnswers[k] = String(v ?? '');
                }
              });
              setAnswers(initAnswers);
            }
            if (parsed.is_cheating_terminated || parsed._security_violations?.terminated) {
              setIsViolationTerminated(true);
              isTerminatedRef.current = true;
            }
          } catch {
            // ignore
          }
        }

        // Initialize timer: default duration_minutes from opening/definition
        if (!data.submitted_at && data.status !== 'SUBMITTED') {
          const dur = (data.duration_minutes || 30) * 60;
          setTimeLeft(dur);
        }

        setLoading(false);
      })
      .catch((err: any) => {
        if (ignore) return;
        console.error('Failed to load public assessment', err);
        setErrorMessage(
          err.message || 'Mã truy cập bài kiểm tra không hợp lệ, đã bị hủy hoặc đã hết hạn.'
        );
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  // Fullscreen Helpers
  const enterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen entry request rejected or cancelled', err);
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
    }
  };

  const handleStartExam = async () => {
    await enterFullscreen();
    const durSec = (assessment?.duration_minutes || 30) * 60;
    setTimeLeft(durSec);
    setIsExamStarted(true);
    examGracePeriodRef.current = Date.now() + 2000;
  };

  const handleReEnterFullscreen = async () => {
    await enterFullscreen();
    examGracePeriodRef.current = Date.now() + 2000;
  };

  // Submit assessment handler
  const doSubmitAssessment = useCallback(
    async (
      forcedTermination = false,
      terminationReason = '',
      overrideViolations = violationsCount
    ) => {
      if (!token || submittedRef.current || submitting) return;

      setSubmitting(true);
      try {
        const payload = {
          answers,
          violations_count: forcedTermination ? 3 : overrideViolations,
          is_violation_terminated: forcedTermination,
          termination_reason: forcedTermination
            ? terminationReason || 'Vi phạm quy chế phòng thi 3 lần (rời khỏi màn hình/chuyển tab)'
            : undefined,
        };

        const result = await publicCareersApi.submitAssessment(token, payload);

        setAssessment((prev) => (prev ? {
          ...prev,
          score: result.score,
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
        } : null));
        setSubmitted(true);
        submittedRef.current = true;

        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {
          // ignore
        }

        if (forcedTermination) {
          setIsViolationTerminated(true);
          isTerminatedRef.current = true;
        } else {
          setConfirmSubmitModal(false);
        }
      } catch (err: any) {
        console.error('Submission failed', err);
        if (!forcedTermination) {
          alert('Không thể nộp bài đánh giá lúc này. Vui lòng kiểm tra lại kết nối mạng.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [token, answers, submitting, violationsCount]
  );

  // 2. Countdown Timer Effect
  useEffect(() => {
    if (!isExamStarted || submitted || isViolationTerminated || timeLeft === null) return;
    if (timeLeft <= 0) {
      doSubmitAssessment(false, 'Hết thời gian làm bài kiểm tra');
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExamStarted, timeLeft, submitted, isViolationTerminated, doSubmitAssessment]);

  // 3. Anti-Cheat Security Proctoring Listeners
  useEffect(() => {
    if (!isExamStarted || submitted || isViolationTerminated || loading || !assessment) return;

    const checkAndSyncFullscreen = () => {
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
      return isFs;
    };

    const handleViolation = (reason: string) => {
      if (submittedRef.current || isTerminatedRef.current) return;
      if (Date.now() < examGracePeriodRef.current) return;

      const now = Date.now();
      // Debounce violation triggers within 3 seconds
      if (now - lastViolationTimeRef.current < 3000) return;
      lastViolationTimeRef.current = now;

      setViolationsCount((prev) => {
        const nextCount = prev + 1;
        if (nextCount === 1) {
          setActiveWarningModal({
            level: 1,
            message: `Hệ thống giám sát phát hiện bạn vừa rời khỏi bài thi (${reason}). Bạn đã bị tính 1 lần vi phạm. Tối đa 2 lần cảnh báo!`,
          });
        } else if (nextCount === 2) {
          setActiveWarningModal({
            level: 2,
            message: `CẢNH BÁO KHẨN CẤP LẦN 2/3: Bạn đã vi phạm lần 2 (${reason})! Nếu tiếp tục vi phạm lần thứ 3, bài thi sẽ bị ĐÌNH CHỈ NGAY LẬP TỨC và bạn sẽ bị ĐÁNH RỚT khỏi đợt tuyển dụng.`,
          });
        } else if (nextCount >= 3) {
          isTerminatedRef.current = true;
          setIsViolationTerminated(true);
          setActiveWarningModal(null);
          // Auto-submit and reject on backend
          doSubmitAssessment(
            true,
            `Gian lận phòng thi: Rời màn hình / vi phạm quy chế quá 3 lần (${reason})`,
            3
          );
        }
        return nextCount;
      });
    };

    // Tab visibility change
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (Date.now() >= examGracePeriodRef.current) {
          handleViolation('Chuyển tab hoặc thu nhỏ trình duyệt');
        }
      }
    };

    // Fullscreen change listener
    const onFullscreenChange = () => {
      const isFs = checkAndSyncFullscreen();
      if (!isFs) {
        if (Date.now() >= examGracePeriodRef.current) {
          handleViolation('Thoát khỏi chế độ toàn màn hình');
        }
      }
    };

    // Interval checker every 400ms to guarantee absolute detection
    const syncInterval = setInterval(() => {
      checkAndSyncFullscreen();
    }, 400);

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, [isExamStarted, submitted, isViolationTerminated, loading, assessment, doSubmitAssessment]);

  // Format time MM:SS
  const formattedTime = useMemo(() => {
    if (timeLeft === null) return '--:--';
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timeLeft]);

  const handleAnswerChange = (qId: string, value: string) => {
    if (!isFullscreen || submitted || submitting || isViolationTerminated) return;
    setAnswers((prev) => ({
      ...prev,
      [qId]: value,
    }));
  };

  const handlePreSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !assessment || submitted || submitting) return;

    // Check required questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const isRequired = q.required !== false;
      const ans = answers[q.id]?.trim();
      if (isRequired && !ans) {
        setCurrentQuestionIndex(i);
        alert(`Vui lòng hoàn thành câu hỏi bắt buộc (Câu ${i + 1}): "${q.text}"`);
        return;
      }
    }

    setConfirmSubmitModal(true);
  };

  const jumpToQuestion = (idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      setCurrentQuestionIndex(idx);
    }
  };

  // Render Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Đang khởi tạo phòng thi trực tuyến...
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Hệ thống bảo mật và bài đánh giá đang được đồng bộ hóa.
        </p>
      </div>
    );
  }

  // Render Error
  if (errorMessage || !assessment) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[75vh] p-4 sm:p-6">
        <div className="max-w-md w-full p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Không Thể Truy Cập Bài Thi
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {errorMessage || 'Không tìm thấy dữ liệu bài đánh giá năng lực.'}
          </p>
          <div className="pt-2 flex gap-2 justify-center">
            <Link
              href="/careers"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Briefcase size={14} />
              <span>Cơ Hội Tuyển Dụng</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-xs"
            >
              <span>Trang Chủ Axiom</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Disqualified Lock Screen (Violation Count >= 3)
  if (isViolationTerminated) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh] p-4 sm:p-6">
        <div className="max-w-xl w-full p-8 sm:p-10 bg-rose-950/20 border-2 border-rose-600 rounded-3xl text-center space-y-5 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-600/30">
            <Lock size={36} />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white inline-block">
              Đình Chỉ Bài Thi Do Vi Phạm Quy Chế
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400">
              Hồ Sơ Ứng Tuyển Bị Đánh Rớt Ngay Lập Tức
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
              Hệ thống giám sát thi cử đã ghi nhận <strong>3 lần vi phạm quy chế bảo mật</strong> (chuyển tab, thoát toàn màn hình hoặc thao tác ngoài ứng dụng).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 text-left space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span>Trạng thái:</span>
              <strong className="text-rose-600">ĐÃ TỪ CHỐI (REJECTED)</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Điểm số ghi nhận:</span>
              <strong className="text-rose-600 font-mono">0.0 / 100</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Số lần vi phạm:</span>
              <strong className="text-rose-600 font-mono">3 / 3 lần</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Thời gian khóa:</span>
              <span>{new Date().toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <Link
              href="/"
              className="w-[200px] h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md shrink-0 truncate cursor-pointer"
              title="Quay về trang chủ"
            >
              <ArrowLeft size={14} className="shrink-0" />
              <span className="truncate">Quay Về Trang Chủ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Pre-Exam Readiness Gate Screen (Centered Vertically and Expansive)
  if (!isExamStarted && !submitted) {
    const examDurationMinutes = assessment.duration_minutes || 30;

    return (
      <div className="flex-1 flex items-center justify-center min-h-[85vh] py-8 sm:py-12 px-4 sm:px-6">
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl p-7 sm:p-11 space-y-8 animate-in fade-in duration-200">
          {/* Header Badge & Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 shadow-2xs">
              <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
              <span>Phòng Khảo Thí Trực Tuyến Chuẩn Hóa • Axiom Enterprise</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {assessment.title || 'Bài Đánh Giá Năng Lực Ứng Viên'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
              Vui lòng đọc kỹ các quy chuẩn phòng thi bảo mật dưới đây trước khi chuyển sang chế độ toàn màn hình để bắt đầu bài làm.
            </p>
          </div>

          {/* Candidate & Opening Summary */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <User size={24} />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {assessment.candidate_name || 'Ứng viên'}
                </span>
                <span className="text-slate-500 text-xs">{assessment.candidate_email}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <Briefcase size={15} className="text-blue-600" />
              <span className="font-bold">{assessment.opening_title || 'Vị trí tuyển dụng'}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-slate-500">{assessment.department_name || 'Toàn cơ quan'}</span>
            </div>
          </div>

          {/* Exam Metrics Quick Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1 shadow-2xs">
              <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Số lượng câu hỏi</span>
              <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {questions.length} câu
              </span>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1 shadow-2xs">
              <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Thời gian làm bài</span>
              <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
                {examDurationMinutes} phút
              </span>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1 shadow-2xs">
              <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Điểm chuẩn đạt</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ≥ {passingScore} đ
              </span>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1 shadow-2xs">
              <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Giám sát khảo thí</span>
              <span className="text-xs font-black text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1 mt-1">
                <Lock size={13} /> Toàn màn hình AI
              </span>
            </div>
          </div>

          {/* Security Regulations Protocol Box */}
          <div className="p-6 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-900/60 space-y-3.5 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 font-black text-amber-900 dark:text-amber-300 uppercase tracking-wide">
              <ShieldAlert size={18} className="text-amber-600 shrink-0" />
              <span>Quy Chế Phòng Thi & Bảo Mật Nghiêm Ngặt</span>
            </div>
            <ul className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed pl-1">
              <li className="flex items-start gap-2.5">
                <span className="font-black text-amber-600 shrink-0">1.</span>
                <span><strong>Chế độ toàn màn hình bắt buộc:</strong> Trình duyệt sẽ tự động kích hoạt chế độ toàn màn hình (Fullscreen) ngay khi bạn bấm nút bắt đầu. Bạn cần duy trì chế độ này xuyên suốt quá trình làm bài.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-black text-amber-600 shrink-0">2.</span>
                <span><strong>Không chuyển ứng dụng hoặc đổi tab:</strong> Hệ thống tự động phát hiện mọi thao tác thu nhỏ trình duyệt, chuyển tab hoặc rời màn hình làm bài.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-black text-amber-600 shrink-0">3.</span>
                <span><strong>Quy chuẩn 3 lần vi phạm:</strong> Bạn có tối đa 2 lần cảnh báo nếu thao tác nhầm. Lần vi phạm thứ 3 sẽ <strong>ngay lập tức đình chỉ bài thi</strong>, gán <strong>0 điểm</strong> và <strong>tự động đánh rớt hồ sơ</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-black text-amber-600 shrink-0">4.</span>
                <span><strong>Tự động thu bài:</strong> Khi hết thời gian đếm ngược, hệ thống sẽ tự động nộp bài và chuyển kết quả tới Hội đồng Tuyển dụng thẩm định.</span>
              </li>
            </ul>
          </div>

          {/* Start Button & Link */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleStartExam}
              className="w-[240px] h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-95 cursor-pointer truncate shrink-0"
              title="Bắt đầu làm"
            >
              <Sparkles size={18} className="shrink-0" />
              <span className="truncate">Bắt Đầu Làm</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pt-1"
            >
              <ArrowLeft size={14} />
              <span>Quay về trang chủ Axiom</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── POST-SUBMISSION RESULTS DASHBOARD (Standalone Centered Stage) ──
  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[85vh] py-8 sm:py-12 px-4 sm:px-6 w-full max-w-5xl mx-auto space-y-6 my-auto animate-in fade-in duration-200">
        {isPassed ? (
          <div className="w-full p-1 sm:p-1.5 rounded-3xl bg-gradient-to-br from-emerald-200/80 via-teal-200/40 to-slate-200/40 dark:from-emerald-900/40 dark:via-teal-900/20 dark:to-slate-800/50 shadow-2xl">
            <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-2px)] p-6 sm:p-10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xl shadow-emerald-500/25">
                    <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div className="space-y-1">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-block">
                      ĐÃ ĐẠT TIÊU CHUẨN ĐẦU VÀO
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      Chúc Mừng! Bạn Đã Vượt Qua Bài Đánh Giá Năng Lực
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      Kết quả của bạn đã đủ điều kiện để tiến vào vòng phỏng vấn chuyên môn tiếp theo.
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center shrink-0 min-w-[170px] shadow-2xs">
                  <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider">Điểm số đạt được</span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono my-0.5">
                    {assessment.score ?? 0} <span className="text-sm text-slate-400 font-normal">/ 100</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold block">
                    Điểm sàn yêu cầu: ≥{passingScore} điểm
                  </span>
                </div>
              </div>

              {/* Prominent Next Step Notice Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border-2 border-blue-200 dark:border-blue-800/80 flex items-start gap-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 mt-0.5">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <strong className="text-blue-950 dark:text-blue-200 block text-base font-black">
                    Vui lòng chờ thông báo lịch phỏng vấn chi tiết qua Email!
                  </strong>
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                    Hội đồng Tuyển dụng đã ghi nhận kết quả bài thi đạt chuẩn của bạn. Lịch hẹn phỏng vấn trực tuyến cùng Trưởng bộ phận chuyên môn sẽ được gửi trực tiếp đến hộp thư: <strong className="text-blue-950 dark:text-blue-100 font-bold underline">{assessment.candidate_email || 'email ứng viên'}</strong>.
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium pt-1">
                    💡 Khi nhận được thư mời, bạn có thể bấm trực tiếp vào liên kết để tham gia phòng họp phỏng vấn dưới dạng <strong>Khách (Guest)</strong> với đúng tên đã điền trong hồ sơ ứng tuyển.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/"
                  className="w-[200px] h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 truncate"
                  title="Quay về trang chủ Axiom"
                >
                  <ArrowLeft size={16} className="shrink-0" />
                  <span className="truncate">Quay Về Trang Chủ</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setReviewMode(!reviewMode)}
                  className="w-[240px] h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 truncate"
                  title="Xem lại chi tiết bài thi"
                >
                  <FileQuestion size={16} className="shrink-0" />
                  <span className="truncate">{reviewMode ? 'Ẩn Xem Lại Câu Hỏi' : 'Xem Lại Đáp Án & Điểm Chi Tiết'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl mx-auto p-1 sm:p-1.5 rounded-3xl bg-slate-200/80 dark:bg-slate-800/60 shadow-2xl">
            <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-2px)] p-8 sm:p-10 space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <XCircle size={36} />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900 inline-block">
                  Không Đạt Điểm Sàn Đầu Vào
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Kết Quả Bài Đánh Giá Năng Lực
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Rất tiếc, điểm số hiện tại của bạn là <strong className="font-mono text-base">{assessment.score ?? 0} / 100 điểm</strong> (yêu cầu chuẩn: ≥{passingScore} điểm). Hồ sơ ứng tuyển của bạn đã dừng lại ở vòng đánh giá này. Axiom Enterprise xin trân trọng cảm ơn bạn đã quan tâm ứng tuyển.
                </p>
              </div>

              <div className="pt-3 flex flex-wrap justify-center gap-3">
                <Link
                  href="/"
                  className="w-[200px] h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md shrink-0 truncate cursor-pointer"
                  title="Quay về trang chủ"
                >
                  <ArrowLeft size={16} className="shrink-0" />
                  <span className="truncate">Quay Về Trang Chủ</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setReviewMode(!reviewMode)}
                  className="w-[220px] h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 truncate"
                  title="Xem chi tiết bài thi"
                >
                  <FileQuestion size={16} className="shrink-0" />
                  <span className="truncate">{reviewMode ? 'Ẩn Đáp Án' : 'Xem Chi Tiết Bài Thi'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Optional Review Mode */}
        {reviewMode && (
          <div className="w-full space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <FileQuestion size={20} className="text-blue-600" />
              <span>Chi Tiết Đáp Án & Điểm Đánh Giá Từng Câu</span>
            </h3>

            {questions.map((q, idx) => {
              const currentVal = answers[q.id] || '';
              const isAnswered = Boolean(currentVal.trim());
              const isQuestionCorrect =
                q.type === 'MULTIPLE_CHOICE'
                  ? checkAnswerCorrectness(currentVal, q.correct_option, q.options)
                  : null;

              return (
                <div
                  key={q.id || idx}
                  className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 space-y-4 shadow-sm ${
                    q.type === 'MULTIPLE_CHOICE'
                      ? isQuestionCorrect
                        ? 'border-emerald-300 dark:border-emerald-900/60'
                        : 'border-rose-300 dark:border-rose-900/60'
                      : isAnswered
                        ? 'border-purple-300 dark:border-purple-900/50'
                        : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-8 h-8 rounded-xl text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          q.type === 'MULTIPLE_CHOICE'
                            ? isQuestionCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                            : isAnswered
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {q.text}
                        </h4>
                        <span className="text-xs text-slate-400 font-mono">
                          {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : q.type === 'CODE' ? 'Mã nguồn' : 'Tự luận'} • {q.points || 10} điểm
                        </span>
                      </div>
                    </div>

                    {q.type === 'MULTIPLE_CHOICE' && (
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                          isQuestionCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {isQuestionCorrect ? `Đúng (+${q.points || 10}đ)` : `Sai (0/${q.points || 10}đ)`}
                      </span>
                    )}
                  </div>

                  {/* Multiple choice review */}
                  {q.type === 'MULTIPLE_CHOICE' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt: string, optIdx: number) => {
                        const optionLetter = String.fromCharCode(65 + optIdx);
                        const cleanOptText = opt.replace(/^[A-Ea-e][\.\:\)\-]\s*/, '');
                        const isCandidatePick =
                          currentVal === opt ||
                          currentVal === cleanOptText ||
                          currentVal === optionLetter ||
                          currentVal === String(optIdx);
                        const isThisCorrectOption = checkAnswerCorrectness(opt, q.correct_option, q.options);

                        let cls = 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500';
                        let tag: string | null = null;
                        if (isCandidatePick && isQuestionCorrect) {
                          cls = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30 font-bold';
                          tag = '✓ Bạn chọn (Đúng)';
                        } else if (isCandidatePick && !isQuestionCorrect) {
                          cls = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/30 font-bold';
                          tag = '✗ Bạn chọn (Sai)';
                        } else if (isThisCorrectOption) {
                          cls = 'bg-emerald-50/40 border-2 border-dashed border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold';
                          tag = '★ Đáp án đúng';
                        }

                        return (
                          <div key={optIdx} className={`p-3 rounded-xl border text-xs flex items-center justify-between ${cls}`}>
                            <span className="truncate pr-2">
                              <strong className="mr-1.5">{optionLetter}.</strong> {cleanOptText || opt}
                            </span>
                            {tag && <span className="text-[10px] shrink-0 font-bold">{tag}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Essay / Code review */}
                  {(q.type === 'TEXT' || q.type === 'CODE') && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">Câu trả lời của bạn:</span>
                      <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                        {currentVal || '(Chưa điền câu trả lời)'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── FULLSCREEN LOCKOUT SHIELD (CANDIDATE CANNOT TAKE TEST WHEN NOT IN FULLSCREEN) ──
  if (isExamStarted && !isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
        <div className="bg-slate-900 border-2 border-rose-500/90 rounded-3xl max-w-xl w-full p-7 sm:p-10 space-y-6 shadow-2xl text-center text-white">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
            <Lock size={40} />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 inline-block">
              BÀI THI BỊ TẠM DỪNG • BẮT BUỘC TOÀN MÀN HÌNH
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Bạn Không Thể Làm Bài Khi Chưa Bật Toàn Màn Hình!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              Quy chế phòng thi bảo mật Axiom yêu cầu bạn phải duy trì chế độ toàn màn hình liên tục. Toàn bộ nội dung bài thi đã được tạm ẩn để đảm bảo tính minh bạch.
            </p>
          </div>

          {/* Violations Strike Counter */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldAlert size={16} className="text-amber-400" />
                Số lần ghi nhận vi phạm quy chế:
              </span>
              <span className={`font-mono font-black text-sm ${violationsCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {violationsCount} / 3 Lần
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((strike) => {
                const isTriggered = violationsCount >= strike;
                return (
                  <div
                    key={strike}
                    className={`py-2 rounded-xl border text-center text-xs font-black transition-all ${
                      isTriggered
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {isTriggered ? `Vi Phạm ${strike}` : `Mức ${strike}`}
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              ⚠️ <strong>Cảnh báo nghiêm khắc:</strong> Lần vi phạm thứ 3 sẽ tự động <strong>đình chỉ bài thi</strong>, ghi nhận <strong>0 điểm</strong> và <strong>đánh rớt hồ sơ</strong> ngay lập tức.
            </p>
          </div>

          {/* Fullscreen Restore Button */}
          <div className="pt-2 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleReEnterFullscreen}
              className="w-[320px] h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-95 cursor-pointer truncate"
              title="Bật lại toàn màn hình để tiếp tục làm bài"
            >
              <Sparkles size={18} className="shrink-0" />
              <span className="truncate">BẬT TOÀN MÀN HÌNH ĐỂ TIẾP TỤC</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Bấm nút trên để mở lại toàn màn hình và tiếp tục làm bài thi
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE 2-COLUMN EXAMINATION ARENA (EXPANSIVE & BALANCED) ──
  return (
    <div className="w-full max-w-7xl mx-auto py-5 sm:py-7 px-4 sm:px-6 lg:px-8 space-y-6 flex-1 flex flex-col justify-between">
      {/* ── Top Command Bar ── */}
      <header className="p-4 sm:p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand Badge & Test Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            href="/careers"
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            title="Quay lại cơ hội tuyển dụng"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Axiom Assessment
              </span>
              <span className="text-xs text-slate-400 font-mono truncate">
                {assessment.department_name || 'Khảo Thí Tuyển Dụng'}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate mt-0.5">
              {assessment.title || 'Đánh Giá Năng Lực Ứng Viên'}
            </h1>
          </div>
        </div>

        {/* Right: Security Badge, Countdown Timer, Quick Submit */}
        <div className="flex items-center gap-3">
          {/* Anti-Cheat Shield Badge with live status */}
          <div
            className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-colors ${
              violationsCount === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : violationsCount === 1
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
            }`}
            title="Hệ thống giám sát bảo mật toàn màn hình"
          >
            <div className="relative flex items-center justify-center">
              {violationsCount === 0 ? (
                <>
                  <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="relative w-2 h-2 rounded-full bg-emerald-600" />
                </>
              ) : (
                <ShieldAlert size={14} className="text-rose-600 dark:text-rose-400" />
              )}
            </div>
            <span className="hidden sm:inline">Giám Sát:</span>
            <span>{violationsCount}/3 Vi Phạm</span>
          </div>

          {/* Digital Countdown Timer */}
          {timeLeft !== null && (
            <div
              className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-sm font-mono font-black shadow-xs ${
                timeLeft > 600
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                  : timeLeft > 180
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-800 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 animate-pulse'
              }`}
              title="Thời gian còn lại của bài thi"
            >
              <Clock size={16} />
              <span>{formattedTime}</span>
            </div>
          )}

          {/* Quick Submit CTA */}
          <button
            type="button"
            onClick={() => handlePreSubmit()}
            disabled={submitting}
            className="w-[120px] h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 truncate"
            title="Nộp bài thi"
          >
            <Send size={13} className="shrink-0" />
            <span className="truncate">{submitting ? 'Đang Nộp...' : 'Nộp Bài'}</span>
          </button>
        </div>
      </header>

      {/* ── 2-Column Responsive Assessment Arena ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start my-auto">
        {/* Left Column (8 cols): Question Studio */}
        <div className="lg:col-span-8 space-y-4">
          {(() => {
            const q = questions[currentQuestionIndex];
            if (!q) return null;
            const currentVal = answers[q.id] || '';
            const isRequired = q.required !== false;
            const isAnswered = Boolean(currentVal.trim());

            return (
              <div className="p-1 sm:p-1.5 rounded-3xl bg-slate-200/80 dark:bg-slate-800/60 ring-1 ring-slate-900/5 dark:ring-white/10 shadow-xl transition-all">
                <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-2px)] p-6 sm:p-8 space-y-6">
                  {/* Question Meta Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white font-mono font-black text-xs shadow-sm">
                        CÂU HỎI {String(currentQuestionIndex + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {q.type === 'MULTIPLE_CHOICE'
                          ? 'Trắc Nghiệm 1 Đáp Án'
                          : q.type === 'CODE'
                            ? 'Lập Trình Thuật Toán'
                            : 'Tự Luận Chuyên Môn'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                        +{q.points || 10} Điểm
                      </span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 border flex items-center gap-1.5 transition-colors ${
                        isAnswered
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isAnswered ? (
                        <>
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Đã trả lời</span>
                        </>
                      ) : (
                        <span>Chưa trả lời</span>
                      )}
                    </span>
                  </div>

                  {/* Question Prompt Title */}
                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-relaxed tracking-tight">
                      {q.text} {isRequired && <span className="text-rose-500" title="Bắt buộc">*</span>}
                    </h2>
                    {q.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {q.description}
                      </p>
                    )}
                  </div>

                  {/* Question Input Area */}
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div className="pt-2">
                      {q.options && q.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                          {q.options.map((opt: string, optIdx: number) => {
                            const optionLetter = String.fromCharCode(65 + optIdx);
                            const cleanOptText = opt.replace(/^[A-Ea-e][\.\:\)\-]\s*/, '');
                            const isCandidatePick =
                              currentVal === opt ||
                              currentVal === cleanOptText ||
                              currentVal === optionLetter ||
                              currentVal === String(optIdx);

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleAnswerChange(q.id, opt)}
                                className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer group select-none ${
                                  isCandidatePick
                                    ? 'bg-blue-50/90 dark:bg-blue-950/70 border-blue-600 dark:border-blue-500 text-blue-950 dark:text-blue-100 shadow-md ring-4 ring-blue-500/15 scale-[1.01]'
                                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 hover:scale-[1.005]'
                                }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                                  <span
                                    className={`w-9 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-2xs transition-colors ${
                                      isCandidatePick
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                                    }`}
                                  >
                                    {optionLetter}
                                  </span>
                                  <span className="text-sm sm:text-base font-semibold leading-relaxed break-words">
                                    {cleanOptText || opt}
                                  </span>
                                </div>

                                <div
                                  className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                    isCandidatePick
                                      ? 'border-blue-600 bg-blue-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400'
                                  }`}
                                >
                                  {isCandidatePick && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder="Nhập câu trả lời của bạn..."
                          className="w-full px-5 py-4 text-sm rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 transition-all font-medium"
                        />
                      )}
                    </div>
                  )}

                  {/* Free Text Area */}
                  {q.type === 'TEXT' && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={8}
                        value={currentVal}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Trình bày giải pháp, lập luận chuyên môn hoặc phương án xử lý chi tiết của bạn..."
                        className="w-full px-5 py-4 text-sm sm:text-base rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 leading-relaxed transition-all resize-y min-h-[220px]"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>💡 Diễn đạt mạch lạc, tập trung vào trọng tâm câu hỏi</span>
                        <span>Số ký tự: <strong>{currentVal.length}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Code Editor Area */}
                  {q.type === 'CODE' && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={10}
                        value={currentVal}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="// Viết mã nguồn, thuật toán hoặc cấu trúc dữ liệu của bạn tại đây..."
                        className="w-full font-mono text-sm px-5 py-4 rounded-2xl border border-slate-800 bg-slate-950 text-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed transition-all resize-y min-h-[260px]"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>⚡ Editor hỗ trợ viết code tiêu chuẩn</span>
                        <span>Số dòng: <strong>{currentVal ? currentVal.split('\n').length : 0}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Stepper Navigation Footer */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="w-[140px] h-12 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 truncate"
                      title="Câu trước"
                    >
                      <ChevronLeft size={16} className="shrink-0" />
                      <span className="truncate">Câu Trước</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {questions.map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 rounded-full transition-all duration-200 ${
                            i === currentQuestionIndex
                              ? 'w-6 bg-blue-600'
                              : Boolean(answers[questions[i]?.id]?.trim())
                                ? 'w-2 bg-emerald-500'
                                : 'w-2 bg-slate-300 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {currentQuestionIndex < questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                          className="w-[160px] h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0 truncate"
                          title="Câu tiếp theo"
                        >
                          <span className="truncate">Câu Tiếp Theo</span>
                          <ChevronRight size={16} className="shrink-0" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePreSubmit()}
                          disabled={submitting}
                          className="w-[180px] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 truncate"
                          title="Hoàn tất & nộp bài"
                        >
                          <Send size={14} className="shrink-0" />
                          <span className="truncate">{submitting ? 'Đang Nộp...' : 'Hoàn Tất & Nộp Bài'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Column (4 cols): Sticky Navigator & Proctoring Sidebar */}
        <aside className="lg:col-span-4 sticky top-6 space-y-4">
          {/* Card 1: Question Navigator Palette */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileQuestion size={18} className="text-blue-600" />
                <span>Bảng Điều Hướng Câu Hỏi</span>
              </span>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                {answeredCount}/{questions.length}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Tiến độ bài thi</span>
                <span>{progressPercent}% Hoàn thành</span>
              </div>
            </div>

            {/* Question Buttons Matrix */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = Boolean(answers[q.id]?.trim());

                let btnStyle = 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700';
                if (isCurrent) {
                  btnStyle = 'bg-blue-600 text-white font-black ring-4 ring-blue-500/25 shadow-md scale-105';
                } else if (isAnswered) {
                  btnStyle = 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700 font-bold';
                }

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => jumpToQuestion(idx)}
                    className={`h-11 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center justify-center ${btnStyle}`}
                    title={`Chuyển đến câu ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Matrix Legend */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-600 shrink-0" />
                <span className="truncate">Đang làm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-100 dark:bg-blue-950 border border-blue-400 shrink-0" />
                <span className="truncate">Đã trả lời</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 shrink-0" />
                <span className="truncate">Chưa làm</span>
              </div>
            </div>
          </div>

          {/* Card 2: Live Proctoring & Security Radar */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span>Giám Sát Khảo Thí AI</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Bảo Mật Bật
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <span className="text-slate-500">Chế độ hiển thị:</span>
                <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Lock size={12} className="text-blue-600" /> Toàn màn hình chuẩn
                </strong>
              </div>

              {/* 3-Strike Visual Meter */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Cảnh báo vi phạm (3 lần):</span>
                  <span className={`font-mono font-black ${violationsCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {violationsCount} / 3 Lần
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((strike) => {
                    const isTriggered = violationsCount >= strike;
                    return (
                      <div
                        key={strike}
                        className={`h-7 rounded-lg border flex items-center justify-center text-[10px] font-black transition-all ${
                          isTriggered
                            ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        {isTriggered ? `Phạt ${strike}` : `Lần ${strike}`}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              ⚠️ Rời khỏi màn hình hoặc đổi tab lần thứ 3 sẽ tự động đình chỉ bài thi và đánh rớt ứng viên.
            </p>
          </div>

          {/* Card 3: Big Final Submit CTA */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20 space-y-3">
            <div className="space-y-1">
              <h3 className="font-black text-sm">Sẵn Sàng Nộp Bài?</h3>
              <p className="text-xs text-blue-100 leading-relaxed">
                Đã hoàn thành {answeredCount}/{questions.length} câu. Bạn có thể kiểm tra lại trước khi gửi.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handlePreSubmit()}
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-white hover:bg-blue-50 text-blue-900 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Send size={14} className="text-blue-600" />
              <span>{submitting ? 'ĐANG NỘP BÀI...' : 'NỘP BÀI & XEM ĐIỂM NGAY'}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ── Warning Modal on Violation 1 & 2 ── */}
      {activeWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-md">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Cảnh Báo Vi Phạm Quy Chế ({activeWarningModal.level}/3)
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Phát Hiện Hành Vi Rời Khỏi Bài Thi
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeWarningModal.message}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
              ⚠️ Lần vi phạm thứ 3 sẽ tự động khóa bài thi với <strong>0 điểm</strong> và <strong>hồ sơ sẽ bị đánh rớt</strong> ngay lập tức.
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setActiveWarningModal(null)}
                className="w-72 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs truncate"
                title="Tôi đã hiểu và quay lại làm bài"
              >
                Tôi Đã Hiểu Và Quay Lại Làm Bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Submit Modal ── */}
      {confirmSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                <FileCheck2 size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Xác Nhận Nộp Bài Đánh Giá
                </h3>
                <p className="text-xs text-slate-500">
                  Bạn đã trả lời {answeredCount}/{questions.length} câu hỏi
                </p>
              </div>
            </div>

            {answeredCount < questions.length && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                Bạn vẫn còn <strong>{questions.length - answeredCount} câu hỏi</strong> chưa hoàn thành. Sau khi nộp, bạn sẽ không thể chỉnh sửa lại.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmSubmitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={() => doSubmitAssessment(false)}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Đang nộp bài...' : 'Xác Nhận Nộp Bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicAssessmentPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-start">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
            <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Đang tải phòng khảo thí năng lực...
            </h3>
          </div>
        }
      >
        <PublicAssessmentContent />
      </Suspense>
    </div>
  );
}
