'use client';

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  candidatePortalApi,
  type PublicJobOpening,
  type CandidateApplication,
  type CVReviewResult,
  type UserResume,
} from '@/lib/recruitment-api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { resolveCandidateTab, type CandidateTab } from '@/lib/candidateNavigation';
import { getErrorMessage } from '@/lib/errors';

import { CandidatePortalTabs } from '@/components/candidate/CandidatePortalTabs';
import { CandidateJobsPanel } from '@/components/candidate/CandidateJobsPanel';
import { CandidateApplicationsPanel } from '@/components/candidate/CandidateApplicationsPanel';
import { CandidateQuickReviewPanel } from '@/components/candidate/CandidateQuickReviewPanel';
import { CandidateApplyDialog, type ApplyFormData } from '@/components/candidate/CandidateApplyDialog';
import { CVInteractiveStudio } from '@/components/cv/CVInteractiveStudio';

function CandidateDiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authUser = useAuthStore((state) => state.user);

  const activeTab = resolveCandidateTab(searchParams.get('tab'));

  const setTab = useCallback(
    (tabName: CandidateTab) => {
      router.push(`/candidate/discovery?tab=${tabName}`);
    },
    [router]
  );

  // ──────────────────────────────────────────────
  // State: Openings
  // ──────────────────────────────────────────────
  const [openings, setOpenings] = useState<PublicJobOpening[]>([]);
  const [isLoadingOpenings, setIsLoadingOpenings] = useState(true);
  const [openingsError, setOpeningsError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const searchAbortRef = useRef<AbortController | null>(null);

  const fetchOpenings = useCallback(async (query = '') => {
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setIsLoadingOpenings(true);
    setOpeningsError(null);
    try {
      const data = await candidatePortalApi.getPublicOpenings({
        q: query.trim() || undefined,
      });
      if (!controller.signal.aborted) {
        setOpenings(data);
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setOpeningsError(getErrorMessage(err, 'Không thể tải danh sách việc làm. Vui lòng thử lại.'));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingOpenings(false);
      }
    }
  }, []);

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
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    };
  }, [fetchOpenings]);

  // ──────────────────────────────────────────────
  // State: Applications
  // ──────────────────────────────────────────────
  const [myApplications, setMyApplications] = useState<CandidateApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

  const fetchMyApplications = useCallback(async () => {
    setIsLoadingApps(true);
    setAppsError(null);
    try {
      const data = await candidatePortalApi.getMyApplications();
      setMyApplications(data);
    } catch (err: unknown) {
      setAppsError(getErrorMessage(err, 'Không thể tải hồ sơ đã nộp. Vui lòng thử lại.'));
    } finally {
      setIsLoadingApps(false);
    }
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
  }, [activeTab, fetchMyApplications]);

  // ──────────────────────────────────────────────
  // State: Saved Resumes Vault
  // ──────────────────────────────────────────────
  const [savedResumes, setSavedResumes] = useState<UserResume[]>([]);

  const fetchSavedResumes = useCallback(async () => {
    try {
      const list = await candidatePortalApi.getSavedResumes();
      setSavedResumes(list);
    } catch (err: unknown) {
      console.warn('Failed to load saved resumes:', err);
    }
  }, []);

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
  }, [fetchSavedResumes]);

  // ──────────────────────────────────────────────
  // State: AI CV Reviewer
  // ──────────────────────────────────────────────
  const [cvInputText, setCvInputText] = useState('');
  const [cvTargetRole, setCvTargetRole] = useState('');
  const [isReviewingCV, setIsReviewingCV] = useState(false);
  const [cvReviewResult, setCvReviewResult] = useState<CVReviewResult | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [cvStudioSubMode, setCvStudioSubMode] = useState<'studio' | 'quick_scan'>('studio');

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
      setCvError(getErrorMessage(err, 'Không thể đánh giá CV vào lúc này. Vui lòng thử lại.'));
    } finally {
      setIsReviewingCV(false);
    }
  };

  // ──────────────────────────────────────────────
  // State: Apply Modal Dialog
  // ──────────────────────────────────────────────
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyingJob, setApplyingJob] = useState<PublicJobOpening | null>(null);
  const [applyingResumeId, setApplyingResumeId] = useState<string | null>(null);
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(null);

  const handleApplyOpening = (opening: PublicJobOpening) => {
    setApplyingJob(opening);
    setApplyingResumeId(null);
    setApplyErrorMessage(null);
    setApplySuccessMessage(null);
    setIsApplyModalOpen(true);
  };

  const handleApplySubmit = async (formData: ApplyFormData) => {
    if (!applyingJob) return;

    setApplyErrorMessage(null);
    setIsSubmittingApply(true);
    try {
      await candidatePortalApi.applyToJob(applyingJob.id, {
        cv_url: formData.cvUrl,
        cv_text: formData.cvText,
        cover_letter: formData.coverLetter,
        phone: formData.phone,
        resume_id: formData.resumeId,
      });
      setApplySuccessMessage(`Đã nộp hồ sơ thành công vào vị trí ${applyingJob.title}!`);
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setApplyingJob(null);
        setApplySuccessMessage(null);
        setTab('applications');
      }, 1500);
    } catch (err: unknown) {
      setApplyErrorMessage(getErrorMessage(err, 'Nộp hồ sơ thất bại. Bạn có thể đã ứng tuyển vị trí này rồi.'));
    } finally {
      setIsSubmittingApply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
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

        <CandidatePortalTabs activeTab={activeTab} onTabChange={setTab} />
      </div>

      {/* TAB 1: JOB OPENINGS & COMPANY DISCOVERY */}
      {activeTab === 'jobs' && (
        <CandidateJobsPanel
          openings={openings}
          isLoading={isLoadingOpenings}
          errorMessage={openingsError}
          searchKeyword={searchKeyword}
          onSearchKeywordChange={setSearchKeyword}
          onSearch={() => fetchOpenings(searchKeyword)}
          onApply={handleApplyOpening}
          onRetry={() => fetchOpenings(searchKeyword)}
        />
      )}

      {/* TAB 2: AI CV STUDIO & ATS REVIEWER */}
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
                className={`shrink-0 w-44 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
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
                className={`shrink-0 w-44 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
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
              onSelectResumeForApply={(resume) => {
                setApplyingResumeId(resume.id);
                if (openings.length > 0) {
                  setApplyingJob(openings[0]);
                }
                setIsApplyModalOpen(true);
              }}
            />
          )}

          {/* Sub-Mode 2: Fast ATS Scanner */}
          {cvStudioSubMode === 'quick_scan' && (
            <CandidateQuickReviewPanel
              cvInputText={cvInputText}
              onCvInputTextChange={setCvInputText}
              cvTargetRole={cvTargetRole}
              onCvTargetRoleChange={setCvTargetRole}
              isReviewing={isReviewingCV}
              errorMessage={cvError}
              reviewResult={cvReviewResult}
              onReview={handleReviewCV}
              onGoToJobs={() => setTab('jobs')}
            />
          )}
        </div>
      )}

      {/* TAB 3: MY APPLICATIONS & STAGE TRACKER */}
      {activeTab === 'applications' && (
        <CandidateApplicationsPanel
          applications={myApplications}
          isLoading={isLoadingApps}
          errorMessage={appsError}
          onRetry={fetchMyApplications}
          onNavigateToMeeting={(meetingId) => router.push(`/meetings/${meetingId}`)}
          onNavigateToAssessment={() => router.push(`/candidate/applications`)}
          onGoToJobs={() => setTab('jobs')}
        />
      )}

      {/* APPLY MODAL */}
      <CandidateApplyDialog
        isOpen={isApplyModalOpen}
        opening={applyingJob}
        savedResumes={savedResumes}
        isSubmitting={isSubmittingApply}
        errorMessage={applyErrorMessage}
        successMessage={applySuccessMessage}
        initialPhone={authUser?.phone || ''}
        initialResumeId={applyingResumeId || undefined}
        onClose={() => {
          setIsApplyModalOpen(false);
          setApplyingJob(null);
          setApplyingResumeId(null);
        }}
        onSubmit={handleApplySubmit}
        onNavigateToCVStudio={() => {
          setIsApplyModalOpen(false);
          setTab('cv');
          setCvStudioSubMode('studio');
        }}
      />
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
