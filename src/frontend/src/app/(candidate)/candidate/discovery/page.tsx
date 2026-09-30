'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Building2,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  AlertCircle,
  ChevronRight,
  Star,
  Award,
  Zap,
  BarChart3,
  Search,
  Filter,
  Calendar,
  ExternalLink,
  Loader2,
  Check,
  Send,
  HelpCircle,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import {
  candidatePortalApi,
  type PublicJobOpening,
  type CandidateApplication,
  type CVReviewResult,
  type UserResume,
} from '@/lib/recruitment-api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { CVInteractiveStudio } from '@/components/cv/CVInteractiveStudio';

function CandidateDiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authUser = useAuthStore((state) => state.user);

  // Tabs: 'cv' | 'jobs' | 'applications'
  const activeTab = searchParams.get('tab') || 'cv';

  const setTab = (tabName: string) => {
    router.push(`/candidate/discovery?tab=${tabName}`);
  };

  // State: Openings
  const [openings, setOpenings] = useState<PublicJobOpening[]>([]);
  const [isLoadingOpenings, setIsLoadingOpenings] = useState(true);
  const [selectedOpening, setSelectedOpening] = useState<PublicJobOpening | null>(null);

  // State: Applications
  const [myApplications, setMyApplications] = useState<CandidateApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  // State: Apply Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyingJob, setApplyingJob] = useState<PublicJobOpening | null>(null);
  const [applyCvUrl, setApplyCvUrl] = useState('');
  const [applyCoverLetter, setApplyCoverLetter] = useState('');
  const [applyPhone, setApplyPhone] = useState(authUser?.phone || '');
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(null);

  // State: AI CV Reviewer
  const [cvInputText, setCvInputText] = useState('');
  const [cvTargetRole, setCvTargetRole] = useState('');
  const [isReviewingCV, setIsReviewingCV] = useState(false);
  const [cvReviewResult, setCvReviewResult] = useState<CVReviewResult | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);

  // Fetch Openings
  const fetchOpenings = async (query = '') => {
    setIsLoadingOpenings(true);
    try {
      const data = await candidatePortalApi.getPublicOpenings({ q: query || undefined });
      setOpenings(data);
    } catch (err: unknown) {
      console.error('Failed to load openings:', err);
    } finally {
      setIsLoadingOpenings(false);
    }
  };

  // Fetch Candidate Applications
  const fetchMyApplications = async () => {
    setIsLoadingApps(true);
    try {
      const data = await candidatePortalApi.getMyApplications();
      setMyApplications(data);
    } catch (err: unknown) {
      console.error('Failed to load applications:', err);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    void (async () => {
      await Promise.resolve();
      if (!ignore) {
        await fetchOpenings();
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    if (activeTab === 'applications') {
      void (async () => {
        await Promise.resolve();
        if (!ignore) {
          await fetchMyApplications();
        }
      })();
    }
    return () => {
      ignore = true;
    };
  }, [activeTab]);

  // Handle CV Review Submission
  const handleReviewCV = async () => {
    if (!cvInputText.trim() || cvInputText.trim().length < 30) {
      setCvError('Vui lòng nhập nội dung CV chi tiết (ít nhất 30 ký tự) để AI có thể đánh giá.');
      return;
    }
    setCvError(null);
    setIsReviewingCV(true);
    try {
      const result = await candidatePortalApi.reviewCV({
        cv_text: cvInputText.trim(),
        target_role: cvTargetRole.trim() || undefined,
      });
      setCvReviewResult(result);
    } catch (err: unknown) {
      setCvError((err as Error)?.message || 'Không thể đánh giá CV vào lúc này. Vui lòng thử lại.');
    } finally {
      setIsReviewingCV(false);
    }
  };

  // State: Saved Resumes & CV Studio Mode
  const [savedResumes, setSavedResumes] = useState<UserResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [applySourceType, setApplySourceType] = useState<'vault' | 'custom'>('vault');
  const [cvStudioSubMode, setCvStudioSubMode] = useState<'studio' | 'quick_scan'>('studio');

  // Fetch Saved Resumes Vault
  const fetchSavedResumes = async () => {
    try {
      const list = await candidatePortalApi.getSavedResumes();
      setSavedResumes(list);
      if (list.length > 0 && !selectedResumeId) {
        const primary = list.find((r) => r.is_primary) || list[0];
        setSelectedResumeId(primary.id);
      }
    } catch (err) {
      console.warn('Failed to load saved resumes:', err);
    }
  };

  useEffect(() => {
    let ignore = false;
    void (async () => {
      await Promise.resolve();
      if (!ignore) {
        await fetchSavedResumes();
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Handle Apply Submission
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob) return;

    setApplyErrorMessage(null);
    setIsSubmittingApply(true);
    try {
      const chosenResume = savedResumes.find((r) => r.id === selectedResumeId);
      await candidatePortalApi.applyToJob(applyingJob.id, {
        cv_url:
          applySourceType === 'custom'
            ? applyCvUrl.trim() || undefined
            : chosenResume
            ? `resume://${chosenResume.id}`
            : undefined,
        cv_text: applySourceType === 'custom' ? cvInputText : chosenResume?.cv_data_json,
        cover_letter: applyCoverLetter.trim() || undefined,
        phone: applyPhone.trim() || undefined,
        resume_id: applySourceType === 'vault' ? selectedResumeId || undefined : undefined,
      });
      setApplySuccessMessage(`Đã nộp hồ sơ thành công vào vị trí ${applyingJob.title}!`);
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setApplyingJob(null);
        setApplySuccessMessage(null);
        setTab('applications');
      }, 1500);
    } catch (err: unknown) {
      setApplyErrorMessage((err as Error)?.message || 'Nộp hồ sơ thất bại. Bạn có thể đã ứng tuyển vị trí này rồi.');
    } finally {
      setIsSubmittingApply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          CLEAN NAVIGATION HEADER (Đã xóa khung đen theo yêu cầu)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>Canva CV Studio</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Thiết kế hồ sơ chuyên nghiệp, kéo thả căn chỉnh tự do, tối ưu ATS và ứng tuyển trực tiếp.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTab('cv')}
            className={`w-48 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'cv'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="truncate" title="Tạo CV & Canva Studio">Tạo CV & Canva Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('jobs')}
            className={`w-44 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'jobs'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span className="truncate" title="Vị trí tuyển dụng">Vị trí tuyển dụng ({openings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('applications')}
            className={`w-44 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="truncate" title="Hồ sơ đã ứng tuyển">Hồ sơ đã nộp</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: JOB OPENINGS & COMPANY DISCOVERY
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'jobs' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
            <span>Danh sách các vị trí tuyển dụng mở từ các phòng ban ({openings.length})</span>
          </div>

          {/* Openings Grid */}
          {isLoadingOpenings ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="text-xs font-semibold text-slate-500">Đang tải danh sách việc làm mới nhất...</div>
            </div>
          ) : openings.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
              <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Không tìm thấy vị trí tuyển dụng phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hiện tại các doanh nghiệp chưa mở vị trí theo từ khóa này. Hãy thử tìm từ khóa khác hoặc quay lại sau.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openings.map((op) => (
                <div
                  key={op.id}
                  className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Company & Dept */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                          {op.organization_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span className="truncate max-w-[200px]" title={op.organization_name}>{op.organization_name}</span>
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">{op.department_name}</span>
                        </div>
                      </div>

                      {op.requires_assessment && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          Có Bài Test
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {op.title}
                      </h3>
                      {op.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {op.description}
                        </p>
                      )}
                    </div>

                    {/* Requirements Tags */}
                    {op.requirements && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                        <strong>Yêu cầu:</strong> {op.requirements}
                      </div>
                    )}

                    {/* 3-Stage Process Pipeline Badge */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>Vòng 1: CV</span>
                        <span>→</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Vòng 2: Test</span>
                        <span>→</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Vòng 3: AI Phỏng vấn</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Fixed width trigger buttons) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOpening(op)}
                      className="w-36 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer truncate"
                      title="Xem chi tiết tuyển dụng"
                    >
                      Xem chi tiết
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setApplyingJob(op);
                        setIsApplyModalOpen(true);
                      }}
                      className="w-36 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer truncate"
                      title="Ứng tuyển vị trí này"
                    >
                      <span>Ứng tuyển ngay</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: AI CV STUDIO & ATS REVIEWER
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'cv' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Sub-Mode Selector */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>CV Studio & Bộ Công Cụ Tối Ưu Hồ Sơ Ứng Tuyển</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết kế CV theo chuẩn Harvard / Modern Tech hoặc dùng AI quét điểm ATS tức thì.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              <button
                type="button"
                onClick={() => setCvStudioSubMode('studio')}
                className={`w-44 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
                  cvStudioSubMode === 'studio'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Studio Soạn Thảo CV Chuẩn Harvard / Modern Tech"
              >
                Studio Soạn Thảo CV
              </button>
              <button
                type="button"
                onClick={() => setCvStudioSubMode('quick_scan')}
                className={`w-44 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
                  cvStudioSubMode === 'quick_scan'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Quét & Chấm Điểm ATS Nhanh"
              >
                Quét Điểm ATS Nhanh
              </button>
            </div>
          </div>

          {/* Sub-Mode 1: Interactive Studio */}
          {cvStudioSubMode === 'studio' && (
            <CVInteractiveStudio
              onSelectResumeForApply={(r) => {
                if (openings.length > 0) {
                  setApplyingJob(openings[0]);
                }
                setSelectedResumeId(r.id);
                setApplySourceType('vault');
                setIsApplyModalOpen(true);
              }}
            />
          )}

          {/* Sub-Mode 2: Fast ATS Scanner */}
          {cvStudioSubMode === 'quick_scan' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: CV Input & Preset selector (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
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
                      onChange={(e) => setCvTargetRole(e.target.value)}
                      placeholder="Ví dụ: Senior AI Fullstack Engineer"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nội dung CV (Kinh nghiệm, Kỹ năng, Dự án, Học vấn):
                    </label>
                    <textarea
                      rows={15}
                      value={cvInputText}
                      onChange={(e) => setCvInputText(e.target.value)}
                      placeholder="Dán toàn bộ nội dung CV của bạn tại đây..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {cvError && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{cvError}</span>
                    </div>
                  )}

                  {/* AI Analyze Trigger (Fixed width trigger per AGENTS.md) */}
                  <button
                    type="button"
                    onClick={handleReviewCV}
                    disabled={isReviewingCV || cvInputText.trim().length < 30}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={cvInputText.trim().length < 30 ? 'Vui lòng nhập ít nhất 30 ký tự nội dung CV' : 'Bắt đầu phân tích & chấm điểm CV'}
                  >
                    {isReviewingCV ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI đang quét & phân tích ATS...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>AI Phân Tích & Chấm Điểm CV</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: AI Scorecard & Recommendations (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {!cvReviewResult && !isReviewingCV && (
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
                      onClick={handleReviewCV}
                      disabled={isReviewingCV || cvInputText.trim().length < 30}
                      className="w-48 mx-auto mt-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer truncate disabled:opacity-50 disabled:cursor-not-allowed"
                      title={cvInputText.trim().length < 30 ? 'Vui lòng nhập ít nhất 30 ký tự nội dung CV' : 'Bắt đầu phân tích CV'}
                    >
                      Bắt đầu đánh giá ngay
                    </button>
                  </div>
                )}

                {isReviewingCV && (
                  <div className="p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
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

                {cvReviewResult && !isReviewingCV && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Score Card Header */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                            Bảng Đánh Giá AI
                          </span>
                          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                            Điểm Đánh Giá Hồ Sơ: {cvReviewResult.overall_score}/100
                          </h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {cvReviewResult.summary_evaluation}
                          </p>
                        </div>

                        {/* Overall Gauge Badge */}
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/50 border border-indigo-100 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                          <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                            {cvReviewResult.overall_score}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">ATS INDEX</span>
                        </div>
                      </div>

                      {/* Sub Pillar Breakdown */}
                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <div className="text-base font-extrabold text-blue-600">{cvReviewResult.ats_score}%</div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Độ Chuẩn ATS</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <div className="text-base font-extrabold text-emerald-600">{cvReviewResult.metrics_score}%</div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Số Liệu Đo Lường</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <div className="text-base font-extrabold text-amber-600">{cvReviewResult.structure_score}%</div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Bố Cục Phân Mục</div>
                        </div>
                      </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Strengths */}
                      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2">
                        <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Điểm Mạnh Nổi Bật ({cvReviewResult.strengths.length})</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                          {cvReviewResult.strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Weaknesses */}
                      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
                        <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Cần Cải Thiện ({cvReviewResult.weaknesses.length})</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                          {cvReviewResult.weaknesses.map((w, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-600 font-bold">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actionable Suggestions */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <span>Hướng Dẫn Chỉnh Sửa CV Trước Khi Nộp</span>
                      </h4>
                      <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        {cvReviewResult.suggestions.map((sug, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{sug}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Keywords Checked */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Từ Khóa Chuyên Môn Đã Đối Soát (ATS Matching)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {cvReviewResult.keyword_matches.map((kw, idx) => (
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

                    {/* CTA: Apply using this CV */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setTab('jobs')}
                        className="w-56 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer truncate"
                        title="Chuyển sang tìm việc để ứng tuyển"
                      >
                        <span>Khám phá việc làm để nộp CV</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: MY APPLICATIONS & STAGE TRACKER
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'applications' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Tiến Trình Ứng Tuyển Của Bạn
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi trạng thái duyệt CV, bài kiểm tra năng lực và phòng phỏng vấn trực tuyến.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchMyApplications}
              className="w-36 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer truncate"
              title="Làm mới tiến trình"
            >
              Làm mới trạng thái
            </button>
          </div>

          {isLoadingApps ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="text-xs font-semibold text-slate-500">Đang tải hồ sơ của bạn...</div>
            </div>
          ) : myApplications.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Bạn chưa nộp hồ sơ nào</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy chuyển qua tab <strong>Cơ hội việc làm</strong> để khám phá và nộp hồ sơ vào các công ty đang tuyển dụng.
              </p>
              <button
                type="button"
                onClick={() => setTab('jobs')}
                className="w-44 mx-auto mt-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer truncate"
                title="Khám phá việc làm"
              >
                Khám phá việc làm ngay
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myApplications.map((app) => {
                const isApproved = app.stage === 'APPROVED' || app.stage === 'ONBOARDING_INVITED' || app.stage === 'HIRED';
                const isRejected = app.stage === 'REJECTED';

                return (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 px-2 py-0.5 rounded-full">
                            {app.organization_name}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 font-medium">{app.department_name || 'Bộ phận kỹ thuật'}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                          {app.opening_title}
                        </h3>
                      </div>

                      {/* Status Badge (Fixed width trigger per AGENTS.md rule) */}
                      <div className="w-44 shrink-0">
                        <span
                          className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold text-center block truncate ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isRejected
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                          title={`Trạng thái: ${app.stage}`}
                        >
                          {app.stage === 'INVITED' && 'Vòng 1: Đang duyệt CV'}
                          {app.stage === 'ASSESSMENT_PENDING' && 'Vòng 2: Chờ làm bài test'}
                          {app.stage === 'ASSESSMENT_SUBMITTED' && 'Vòng 2: Đã nộp bài test'}
                          {app.stage === 'INTERVIEW_SCHEDULED' && 'Vòng 3: Đã lên lịch phỏng vấn'}
                          {app.stage === 'INTERVIEW_COMPLETED' && 'Vòng 3: Hoàn thành phỏng vấn'}
                          {app.stage === 'HR_REVIEW_PENDING' && 'Chờ Trưởng phòng duyệt'}
                          {app.stage === 'OWNER_APPROVAL_PENDING' && 'Chờ Giám đốc duyệt'}
                          {isApproved && 'ĐÃ ĐƯỢC CHẤP THUẬN'}
                          {isRejected && 'Chưa phù hợp'}
                        </span>
                      </div>
                    </div>

                    {/* 4-Stage Visual Progress Bar */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
                        <div className="space-y-1">
                          <div className="w-6 h-6 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </div>
                          <span className="text-slate-700 dark:text-slate-300">1. Nộp CV</span>
                        </div>

                        <div className="space-y-1">
                          <div
                            className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold ${
                              app.assessment_status === 'COMPLETED'
                                ? 'bg-emerald-600 text-white'
                                : app.stage === 'ASSESSMENT_PENDING'
                                ? 'bg-amber-500 text-white animate-pulse'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {app.assessment_status === 'COMPLETED' ? '✓' : '2'}
                          </div>
                          <span className="text-slate-700 dark:text-slate-300">2. Test Năng Lực</span>
                          {app.assessment_score !== null && app.assessment_score !== undefined && (
                            <div className="text-[10px] text-emerald-600 font-bold">{app.assessment_score} đ</div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div
                            className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold ${
                              app.interview_status === 'COMPLETED'
                                ? 'bg-emerald-600 text-white'
                                : app.stage === 'INTERVIEW_SCHEDULED'
                                ? 'bg-blue-600 text-white animate-pulse'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {app.interview_status === 'COMPLETED' ? '✓' : '3'}
                          </div>
                          <span className="text-slate-700 dark:text-slate-300">3. AI Phỏng Vấn</span>
                        </div>

                        <div className="space-y-1">
                          <div
                            className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isApproved
                                ? 'bg-emerald-600 text-white'
                                : isRejected
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isApproved ? '✓' : '4'}
                          </div>
                          <span className="text-slate-700 dark:text-slate-300">4. Giám Đốc Duyệt</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Triggers */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-slate-400">
                        Nộp ngày: {new Date(app.created_at).toLocaleDateString('vi-VN')}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Interview Room CTA */}
                        {app.interview_meeting_id && (
                          <button
                            type="button"
                            onClick={() => router.push(`/meetings/${app.interview_meeting_id}`)}
                            className="w-48 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer truncate"
                            title="Vào phòng phỏng vấn trực tuyến"
                          >
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>Vào phòng phỏng vấn</span>
                          </button>
                        )}

                        {/* Test CTA */}
                        {app.requires_assessment && app.assessment_status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => router.push(`/candidate/applications`)}
                            className="w-44 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer truncate"
                            title="Làm bài kiểm tra năng lực"
                          >
                            <span>Làm bài kiểm tra</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          JOB DETAIL MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedOpening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {selectedOpening.organization_name}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {selectedOpening.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Bộ phận: {selectedOpening.department_name}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOpening(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Mô Tả Công Việc:</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                {selectedOpening.description || 'Chưa cập nhật mô tả chi tiết.'}
              </p>
            </div>

            {/* Requirements */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Yêu Cầu Năng Lực & Kinh Nghiệm:</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                {selectedOpening.requirements || 'Trao đổi chi tiết khi phỏng vấn.'}
              </p>
            </div>

            {/* Roadmap */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 text-xs space-y-1.5">
              <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quy trình 3 vòng tuyển dụng:</span>
              </div>
              <p className="text-indigo-800/80 dark:text-indigo-300 text-[11px] leading-relaxed">
                1. Sàng lọc hồ sơ (AI ATS) → 2. Bài test năng lực trực tuyến {selectedOpening.requires_assessment ? '(Bắt buộc)' : '(Miễn trừ)'} → 3. Phỏng vấn trực tiếp với AI Dialogue Rubric (Chấm điểm STAR & Độ chính xác) → Trưởng phòng & Giám đốc phê duyệt.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedOpening(null)}
                className="w-36 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer truncate"
                title="Đóng cửa sổ"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => {
                  setApplyingJob(selectedOpening);
                  setSelectedOpening(null);
                  setIsApplyModalOpen(true);
                }}
                className="w-48 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Ứng tuyển ngay vị trí này"
              >
                <span>Nộp CV Ứng Tuyển</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          APPLY MODAL
      ───────────────────────────────────────────────────────────── */}
      {isApplyModalOpen && applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200">
                  Nộp Đơn Ứng Tuyển
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                  {applyingJob.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{applyingJob.organization_name}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsApplyModalOpen(false);
                  setApplyingJob(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {applyErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{applyErrorMessage}</span>
              </div>
            )}

            {applySuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{applySuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-3">
              {/* CV Source Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chọn Nguồn Hồ Sơ CV:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApplySourceType('vault')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      applySourceType === 'vault'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Kho CV Cá Nhân ({savedResumes.length})</span>
                    {applySourceType === 'vault' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplySourceType('custom')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      applySourceType === 'custom'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Đường Link CV Ngoài</span>
                    {applySourceType === 'custom' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                </div>
              </div>

              {/* Source Option 1: Saved CV Picker */}
              {applySourceType === 'vault' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bản CV Sử Dụng:
                  </label>
                  {savedResumes.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                      <p>Bạn chưa lưu bản CV nào trong kho cá nhân.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsApplyModalOpen(false);
                          setTab('cv');
                          setCvStudioSubMode('studio');
                        }}
                        className="py-1 px-3 bg-amber-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        Mở Studio Soạn & Lưu CV Ngay
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    >
                      {savedResumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.template_id.toUpperCase()}) {r.ats_score ? `- ATS: ${r.ats_score}%` : ''} {r.is_primary ? '★ Mặc định' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Source Option 2: Custom CV Link */}
              {applySourceType === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đường dẫn CV (PDF / Google Drive / Portfolio):
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={applyCvUrl}
                      onChange={(e) => setApplyCvUrl(e.target.value)}
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
                  value={applyPhone}
                  onChange={(e) => setApplyPhone(e.target.value)}
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
                  value={applyCoverLetter}
                  onChange={(e) => setApplyCoverLetter(e.target.value)}
                  placeholder="Tôi rất hào hứng được ứng tuyển vào vị trí này vì các kinh nghiệm phù hợp..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="w-32 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer truncate"
                  title="Hủy nộp"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingApply}
                  className="w-48 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 truncate"
                  title="Gửi hồ sơ ứng tuyển"
                >
                  {isSubmittingApply ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang nộp...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Xác Nhận Nộp CV</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandidateDiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="text-xs font-semibold text-slate-500">Đang tải Cổng Ứng Viên...</div>
        </div>
      }
    >
      <CandidateDiscoveryContent />
    </Suspense>
  );
}
