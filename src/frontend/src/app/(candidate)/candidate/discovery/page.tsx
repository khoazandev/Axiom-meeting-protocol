'use client';

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  candidatePortalApi,
  type PublicJobOpening,
  type CandidateApplication,
  type UserResume,
} from '@/lib/recruitment-api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { resolveCandidateTab, type CandidateTab } from '@/lib/candidateNavigation';
import { getErrorMessage } from '@/lib/errors';

import { CandidatePortalTabs } from '@/components/candidate/CandidatePortalTabs';
import { CandidateJobsPanel } from '@/components/candidate/CandidateJobsPanel';
import { CandidateApplicationsPanel } from '@/components/candidate/CandidateApplicationsPanel';
import { SavedCVVaultPanel } from '@/components/candidate/SavedCVVaultPanel';
import {
  CandidateApplyDialog,
  type ApplyFormData,
} from '@/components/candidate/CandidateApplyDialog';
import { CVInteractiveStudio } from '@/components/cv/CVInteractiveStudio';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

function CandidateDiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authUser = useAuthStore((state) => state.user);
  const { t } = useLanguageStore();

  const activeTab = resolveCandidateTab(searchParams.get('tab'));

  const setTab = useCallback(
    (tabName: CandidateTab) => {
      router.push(`/candidate/discovery?tab=${tabName}`);
    },
    [router]
  );

  // ──────────────────────────────────────────────
  // State: Notification & Modals
  // ──────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        setOpeningsError(
          getErrorMessage(err, 'Không thể tải danh sách việc làm. Vui lòng thử lại.')
        );
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
    void (async () => {
      await Promise.resolve();
      if (!ignore) {
        await fetchMyApplications();
      }
    })();
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
  }, [activeTab, fetchSavedResumes]);



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
    void fetchSavedResumes();
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
      void fetchMyApplications();
      setApplySuccessMessage(`Đã nộp hồ sơ thành công vào vị trí ${applyingJob.title}!`);
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setApplyingJob(null);
        setApplySuccessMessage(null);
        setTab('applications');
      }, 1500);
    } catch (err: unknown) {
      setApplyErrorMessage(
        getErrorMessage(err, 'Nộp hồ sơ thất bại. Bạn có thể đã ứng tuyển vị trí này rồi.')
      );
    } finally {
      setIsSubmittingApply(false);
    }
  };

  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);

  const tabHeaders: Record<CandidateTab, { title: string; subtitle: string }> = {
    jobs: {
      title: t.candidate.jobsTitle,
      subtitle: t.candidate.jobsSubtitle,
    },
    cv: {
      title: t.candidate.cvStudioTitle,
      subtitle: t.candidate.cvStudioSubtitle,
    },
    vault: {
      title: t.candidate.vaultTitle,
      subtitle: t.candidate.vaultSubtitle,
    },
    applications: {
      title: t.candidate.applicationsTitle,
      subtitle: t.candidate.applicationsSubtitle,
    },
  };

  const currentTabHeader = tabHeaders[activeTab] || tabHeaders.jobs;

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/90 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neutral-900 dark:text-white" />
            <span>{currentTabHeader.title}</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {currentTabHeader.subtitle}
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
          applications={myApplications}
          onViewApplications={() => setTab('applications')}
        />
      )}

      {/* TAB 2: CANVA CV STUDIO */}
      {activeTab === 'cv' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <CVInteractiveStudio
            initialResumeId={editingResumeId || undefined}
            onSaveSuccess={(_resume) => {
              void fetchSavedResumes();
            }}
            onNavigateToVault={() => setTab('vault')}
            onNavigateToJobs={() => setTab('jobs')}
            onSelectResumeForApply={(resume) => {
              void fetchSavedResumes();
              setApplyingResumeId(resume.id);
              if (openings.length > 0) {
                setApplyingJob(openings[0]);
                setIsApplyModalOpen(true);
              } else {
                setTab('jobs');
              }
            }}
          />
        </div>
      )}

      {/* TAB 3: SAVED RESUMES VAULT ("Kho chứa CV trực quan") */}
      {activeTab === 'vault' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <SavedCVVaultPanel
            savedResumes={savedResumes}
            isLoading={false}
            onRefresh={fetchSavedResumes}
            onEditInStudio={(resume) => {
              setEditingResumeId(resume.id);
              setTab('cv');
            }}
            onApplyWithResume={(resume) => {
              setApplyingResumeId(resume.id);
              if (openings.length > 0) {
                setApplyingJob(openings[0]);
                setIsApplyModalOpen(true);
              } else {
                setTab('jobs');
              }
            }}
            onCreateNewInStudio={() => {
              setEditingResumeId(null);
              setTab('cv');
            }}
          />
        </div>
      )}

      {/* TAB 4: MY APPLICATIONS & STAGE TRACKER */}
      {activeTab === 'applications' && (
        <CandidateApplicationsPanel
          applications={myApplications}
          isLoading={isLoadingApps}
          errorMessage={appsError}
          savedResumes={savedResumes}
          onRetry={fetchMyApplications}
          onNavigateToMeeting={(meetingId) => router.push(`/meetings/${meetingId}`)}
          onNavigateToAssessment={(attemptOrAppId) =>
            router.push(`/candidate/assessments/${attemptOrAppId}`)
          }
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
        allOpenings={openings}
        onSelectOpening={(op) => setApplyingJob(op)}
        onRefreshResumes={fetchSavedResumes}
        applications={myApplications}
        onClose={() => {
          setIsApplyModalOpen(false);
          setApplyingJob(null);
          setApplyingResumeId(null);
        }}
        onSubmit={handleApplySubmit}
        onNavigateToCVStudio={() => {
          setIsApplyModalOpen(false);
          setTab('cv');
        }}
      />



      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700/50 text-xs font-semibold">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
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
