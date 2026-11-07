'use client';

import React, { useState } from 'react';
import {
  FileText,
  AlertCircle,
  RefreshCw,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Award,
  Users,
  Eye,
  Video,
  X,
} from 'lucide-react';
import { CandidateApplication, UserResume, RecruitmentStage, candidatePortalApi } from '@/lib/recruitment-api';
import { CandidateResumeViewerModal } from '@/components/recruitment/CandidateResumeViewerModal';
import { CompanyLogo } from '@/lib/companyLogos';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

export interface CandidateApplicationsPanelProps {
  applications: CandidateApplication[];
  isLoading: boolean;
  errorMessage: string | null;
  savedResumes?: UserResume[];
  onRetry: () => void;
  onNavigateToMeeting?: (meetingId: string) => void;
  onNavigateToAssessment?: (applicationId: string) => void;
  onGoToJobs?: () => void;
}

// Stage helper to calculate progress index (0 to 4)
function getStageIndex(stage: RecruitmentStage): { currentStep: number; isApproved: boolean; isRejected: boolean } {
  const isApproved = stage === 'APPROVED' || stage === 'ONBOARDING_INVITED' || stage === 'HIRED';
  const isRejected = stage === 'REJECTED' || stage === 'WITHDRAWN' || stage === 'CANCELLED' || stage === 'EXPIRED';

  if (isApproved) return { currentStep: 4, isApproved: true, isRejected: false };
  if (isRejected) return { currentStep: 0, isApproved: false, isRejected: true };

  switch (stage) {
    case 'INVITED':
      return { currentStep: 0, isApproved: false, isRejected: false };
    case 'ASSESSMENT_PENDING':
    case 'ASSESSMENT_SUBMITTED':
      return { currentStep: 1, isApproved: false, isRejected: false };
    case 'INTERVIEW_SCHEDULED':
    case 'INTERVIEW_COMPLETED':
      return { currentStep: 2, isApproved: false, isRejected: false };
    case 'HR_REVIEW_PENDING':
      return { currentStep: 3, isApproved: false, isRejected: false };
    case 'OWNER_APPROVAL_PENDING':
      return { currentStep: 4, isApproved: false, isRejected: false };
    default:
      return { currentStep: 0, isApproved: false, isRejected: false };
  }
}

export function CandidateApplicationsPanel({
  applications,
  isLoading,
  errorMessage,
  savedResumes = [],
  onRetry,
  onNavigateToMeeting,
  onNavigateToAssessment,
  onGoToJobs,
}: CandidateApplicationsPanelProps) {
  const { t, language } = useLanguageStore();
  // Resume Viewer Modal State
  const [selectedResume, setSelectedResume] = useState<UserResume | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string | null>(null);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [selectedScheduleApp, setSelectedScheduleApp] = useState<CandidateApplication | null>(null);

  const handleViewResume = async (app: CandidateApplication) => {
    setSelectedJobTitle(app.opening_title);
    // 1. Check if matching resume exists in savedResumes by resume_id
    let found = app.resume_id ? savedResumes.find((r) => r.id === app.resume_id) : null;

    // 2. If not found in local savedResumes, fetch from backend API if resume_id is available
    if (!found && app.resume_id) {
      try {
        found = await candidatePortalApi.getSavedResume(app.resume_id);
      } catch (err) {
        console.warn('Could not fetch resume by id:', err);
      }
    }

    // 3. If still not found, check primary resume or first saved resume
    if (!found && savedResumes.length > 0) {
      found = savedResumes.find((r) => r.is_primary) || savedResumes[0];
    }

    if (found) {
      if (!found.file_url && app.cv_url) {
        found = { ...found, file_url: app.cv_url };
      }
      setSelectedResume(found);
    } else {
      // 4. Create structured synthetic resume object matching CVData schema
      const syntheticResume: UserResume = {
        id: app.resume_id || app.id,
        user_id: app.id,
        title: `Hồ sơ nộp: ${app.opening_title}`,
        template_id: app.cv_url ? 'pdf-upload' : 'harvard',
        file_url: app.cv_url || undefined,
        cv_data_json: app.cv_url
          ? JSON.stringify({ pdf_data_url: app.cv_url, fileName: `${app.opening_title}_CV.pdf` })
          : JSON.stringify({
              templateId: 'harvard',
              personalInfo: {
                fullName: 'Ứng viên',
                title: app.opening_title,
                email: '',
                phone: '',
                location: '',
                socials: [],
              },
              summary: app.cv_text || 'Hồ sơ ứng tuyển trực tuyến trên Axiom Meeting Protocol.',
              experience: [],
              education: [],
              skills: [],
              projects: [],
              sectionOrder: ['personal', 'summary'],
            }),
        is_primary: true,
        ats_score: app.ai_score ?? (app.assessment_score ? Math.round(app.assessment_score) : undefined),
        created_at: app.created_at,
        updated_at: app.updated_at,
      };
      setSelectedResume(syntheticResume);
    }
    setIsViewerModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────
          HEADER & METRICS
      ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200/90 dark:border-neutral-800">
        <div>
          <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
            <span>Tiến Trình Ứng Tuyển Của Bạn</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Theo dõi từng bước duyệt hồ sơ, làm bài test năng lực AI, phỏng vấn hội đồng và thẩm định bổ nhiệm.
          </p>
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={isLoading}
          className="shrink-0 w-36 h-9 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 truncate"
          title="Làm mới danh sách hồ sơ ứng tuyển"
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="truncate">Làm mới</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          ERROR STATE
      ────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4 text-rose-700 dark:text-rose-300 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 w-28 py-1.5 px-3 bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 font-semibold rounded-xl border border-rose-200 dark:border-rose-800 text-xs hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors flex items-center justify-center gap-1.5 truncate cursor-pointer"
            title="Thử tải lại hồ sơ"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Thử lại</span>
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          LOADING SKELETON
      ────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded-md w-1/3" />
                <div className="h-7 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-44" />
              </div>
              <div className="h-16 bg-neutral-100 dark:bg-neutral-800/40 rounded-2xl w-full" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md w-28" />
                <div className="h-9 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-40" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          EMPTY STATE
      ────────────────────────────────────────────────────────── */}
      {!isLoading && !errorMessage && applications.length === 0 && (
        <div className="p-12 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Bạn chưa có hồ sơ ứng tuyển nào
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
              Hãy khám phá các vị trí tuyển dụng đang mở và nộp hồ sơ bằng Canva CV hoặc tải lên file PDF.
            </p>
          </div>
          {onGoToJobs && (
            <button
              type="button"
              onClick={onGoToJobs}
              className="shrink-0 w-44 mx-auto mt-2 h-9 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-bold transition-all shadow-xs cursor-pointer truncate"
              title="Khám phá việc làm"
            >
              Khám phá việc làm ngay
            </button>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          APPLICATIONS LIST (Glowing 5-Stage Stepper)
      ────────────────────────────────────────────────────────── */}
      {!isLoading && applications.length > 0 && (
        <div className="space-y-5">
          {applications.map((app) => {
            const { currentStep, isApproved, isRejected } = getStageIndex(app.stage);

            const steps = [
              {
                id: 0,
                name: t.candidate.stage1Name,
                desc: app.stage === 'INVITED' ? 'Chờ HR duyệt CV' : 'Đã duyệt CV',
                isDone: currentStep > 0 || isApproved,
                isActive: currentStep === 0 && !isRejected && !isApproved,
              },
              {
                id: 1,
                name: t.candidate.stage2Name,
                desc: app.assessment_status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đánh giá năng lực',
                isDone: app.assessment_status === 'COMPLETED' || currentStep > 1 || isApproved,
                isActive: currentStep === 1 && !isRejected && !isApproved,
                score: app.assessment_score,
              },
              {
                id: 2,
                name: t.candidate.stage3Name,
                desc: app.interview_status === 'COMPLETED' ? 'Đã phỏng vấn' : 'Hội đồng chuyên môn',
                isDone: app.interview_status === 'COMPLETED' || currentStep > 2 || isApproved,
                isActive: currentStep === 2 && !isRejected && !isApproved,
              },
              {
                id: 3,
                name: t.candidate.stage4Name,
                desc: 'Chế độ & Văn hóa',
                isDone: currentStep > 3 || isApproved,
                isActive: currentStep === 3 && !isRejected && !isApproved,
              },
              {
                id: 4,
                name: t.candidate.stage5Name,
                desc: isApproved ? 'Đã trúng tuyển' : 'Giám Đốc bổ nhiệm',
                isDone: isApproved,
                isActive: currentStep === 4 && !isRejected && !isApproved,
              },
            ];

            return (
              <div
                key={app.id}
                className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-700 transition-all space-y-5"
              >
                {/* 1. Header Information & Status Badge (Locked Width) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyLogo orgName={app.organization_name} logoUrl={app.organization_logo_url} size={44} className="shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2.5 py-0.5 rounded-full truncate max-w-[200px]" title={app.organization_name}>
                          {app.organization_name}
                        </span>
                        <span className="text-xs text-neutral-300 dark:text-neutral-700">•</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">
                          {app.department_name || 'Bộ Phận Tuyển Dụng'}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-neutral-900 dark:text-white truncate" title={app.opening_title}>
                        {app.opening_title}
                      </h3>
                    </div>
                  </div>

                  {/* Status Badge (Strict width locking per anti-layout-shift rule) */}
                  <div className="shrink-0 w-44">
                    <span
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold text-center block truncate border ${
                        isApproved
                          ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-transparent shadow-xs'
                          : isRejected
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700'
                      }`}
                      title={`Trạng thái hiện tại: ${app.stage}`}
                    >
                      {app.stage === 'INVITED' && t.candidate.stageInvited}
                      {app.stage === 'ASSESSMENT_PENDING' && t.candidate.stageAssessmentPending}
                      {app.stage === 'ASSESSMENT_SUBMITTED' && t.candidate.stageAssessmentSubmitted}
                      {app.stage === 'INTERVIEW_SCHEDULED' && t.candidate.stageInterviewScheduled}
                      {app.stage === 'INTERVIEW_COMPLETED' && t.candidate.stageInterviewCompleted}
                      {app.stage === 'HR_REVIEW_PENDING' && t.candidate.stageHrReview}
                      {app.stage === 'OWNER_APPROVAL_PENDING' && t.candidate.stageOwnerApproval}
                      {isApproved && t.candidate.stageApproved}
                      {isRejected && t.candidate.stageRejected}
                      {![
                        'INVITED',
                        'ASSESSMENT_PENDING',
                        'ASSESSMENT_SUBMITTED',
                        'INTERVIEW_SCHEDULED',
                        'INTERVIEW_COMPLETED',
                        'HR_REVIEW_PENDING',
                        'OWNER_APPROVAL_PENDING',
                        'APPROVED',
                        'ONBOARDING_INVITED',
                        'HIRED',
                        'REJECTED',
                        'WITHDRAWN',
                        'EXPIRED',
                        'CANCELLED',
                      ].includes(app.stage) && app.stage}
                    </span>
                  </div>
                </div>

                {/* 2. GLOWING 5-STAGE PROGRESS STEPPER */}
                <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                  <div className="relative">
                    {/* Background Progress Bar Line */}
                    <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-neutral-200 dark:bg-neutral-700 -z-0" />

                    {/* Stepper Grid (5 Columns) */}
                    <div className="grid grid-cols-5 gap-1 text-center relative z-10">
                      {steps.map((s) => (
                        <div key={s.id} className="space-y-1.5 flex flex-col items-center">
                          {/* Step Circle Indicator */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                              s.isDone
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                                : s.isActive
                                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 ring-4 ring-neutral-300 dark:ring-neutral-700 animate-pulse'
                                  : isRejected
                                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                                    : 'bg-white dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-300 dark:border-neutral-700'
                            }`}
                          >
                            {s.isDone ? '✓' : s.id + 1}
                          </div>

                          {/* Step Label */}
                          <div className="w-full">
                            <div
                              className={`text-[11px] font-extrabold truncate ${
                                s.isActive || s.isDone
                                  ? 'text-neutral-900 dark:text-white'
                                  : 'text-neutral-400 dark:text-neutral-500'
                              }`}
                              title={s.name}
                            >
                              {s.name}
                            </div>
                            <div
                              className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate hidden sm:block mt-0.5"
                              title={s.desc}
                            >
                              {s.desc}
                            </div>
                            {s.score !== null && s.score !== undefined && (
                              <div className="text-[10px] font-extrabold text-neutral-900 dark:text-neutral-100 mt-0.5">
                                {s.score} điểm
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2.5 Interview Scheduled Callout */}
                {app.stage === 'INTERVIEW_SCHEDULED' && !isRejected && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block truncate">
                          Lịch Phỏng Vấn Chuyên Môn Trực Tuyến
                        </span>
                        <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                          {app.interview_scheduled_at
                            ? new Date(app.interview_scheduled_at).toLocaleString('vi-VN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Đã lên lịch - Chờ ban tuyển dụng mở phòng'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2.6 Disqualified / Rejected Callout */}
                {isRejected && (
                  <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>Hồ sơ ứng tuyển đã dừng lại ở đợt tuyển dụng này. Axiom Enterprise trân trọng cảm ơn sự quan tâm của bạn.</span>
                  </div>
                )}

                {/* 3. Footer Action Triggers */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Nộp: {app.created_at ? new Date(app.created_at).toLocaleDateString('vi-VN') : '---'}
                      </span>
                    </span>
                    {app.ai_score !== null && app.ai_score !== undefined && (
                      <span className="flex items-center gap-1 font-bold text-neutral-700 dark:text-neutral-300">
                        <Sparkles className="w-3 h-3 text-neutral-400" />
                        <span>ATS: {app.ai_score}/100</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Submitted Resume Button */}
                    <button
                      type="button"
                      onClick={() => handleViewResume(app)}
                      className="shrink-0 w-36 h-9 py-1.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
                      title={t.candidate.viewCVBtn}
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.candidate.viewCVBtn}</span>
                    </button>

                    {/* Stage Action Triggers - STRICTLY ONE BUTTON / STATUS PER STAGE. ZERO BUTTONS WHEN REJECTED OR IN STAGES 4 & 5 */}
                    {!isRejected && (
                      <>
                        {/* Giai đoạn 1: INVITED */}
                        {app.stage === 'INVITED' && (
                          <span
                            className="shrink-0 w-36 h-9 py-1.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 truncate"
                            title="Hồ sơ CV của bạn đang chờ HR thẩm định & phê duyệt"
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">CV chờ HR duyệt</span>
                          </span>
                        )}

                        {/* Giai đoạn 2: ASSESSMENT_PENDING */}
                        {app.stage === 'ASSESSMENT_PENDING' && onNavigateToAssessment && (
                          <button
                            type="button"
                            onClick={() => onNavigateToAssessment(app.assessment_attempt_id || app.id)}
                            className="shrink-0 w-36 h-9 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer truncate"
                            title={t.candidate.takeTestBtn}
                          >
                            <span className="truncate">{t.candidate.takeTestBtn}</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}

                        {/* Giai đoạn 2: ASSESSMENT_SUBMITTED */}
                        {app.stage === 'ASSESSMENT_SUBMITTED' && (
                          <span
                            className="shrink-0 w-36 h-9 py-1.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center justify-center gap-1.5 truncate"
                            title="Đã nộp bài kiểm tra năng lực thành công"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Đã nộp bài test</span>
                          </span>
                        )}

                        {/* Giai đoạn 3: INTERVIEW_SCHEDULED */}
                        {app.stage === 'INTERVIEW_SCHEDULED' && (
                          <button
                            type="button"
                            onClick={() => setSelectedScheduleApp(app)}
                            className="shrink-0 w-44 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer truncate"
                            title="Xem chi tiết lịch phỏng vấn & phòng họp"
                          >
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Xem Lịch Phỏng Vấn</span>
                            <ArrowRight className="w-3 h-3 shrink-0" />
                          </button>
                        )}

                        {/* Giai đoạn 3: INTERVIEW_COMPLETED */}
                        {app.stage === 'INTERVIEW_COMPLETED' && (
                          <span
                            className="shrink-0 w-36 h-9 py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center justify-center gap-1.5 truncate"
                            title="Đã hoàn thành phiên phỏng vấn"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Đã phỏng vấn</span>
                          </span>
                        )}

                        {/* Giai đoạn 4 & 5: HR_REVIEW_PENDING or OWNER_APPROVAL_PENDING - strictly NO buttons */}
                        {['HR_REVIEW_PENDING', 'OWNER_APPROVAL_PENDING'].includes(app.stage) && (
                          <span
                            className="shrink-0 w-44 h-9 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium flex items-center justify-center truncate border border-neutral-200 dark:border-neutral-700"
                            title="Hồ sơ đang trong quá trình thẩm định và phê duyệt"
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0 mr-1.5 text-neutral-400" />
                            <span className="truncate">Đang chờ phê duyệt</span>
                          </span>
                        )}

                        {/* Giai đoạn 5: Approved */}
                        {isApproved && (
                          <span
                            className="shrink-0 w-36 h-9 py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 truncate"
                            title="Hồ sơ đã được phê duyệt trúng tuyển"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Đã trúng tuyển</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          INTERVIEW SCHEDULE DETAILS MODAL
      ────────────────────────────────────────────────────────── */}
      {selectedScheduleApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    Lịch Hẹn Phỏng Vấn Tuyển Dụng
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hội đồng chuyên môn phỏng vấn trực tuyến bảo mật
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScheduleApp(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Company & Position Info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3.5">
              <CompanyLogo
                orgName={selectedScheduleApp.organization_name}
                logoUrl={selectedScheduleApp.organization_logo_url}
                size={44}
                className="shadow-2xs shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {selectedScheduleApp.opening_title}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {selectedScheduleApp.organization_name} {selectedScheduleApp.department_name ? `• ${selectedScheduleApp.department_name}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <Clock className="w-3 h-3" />
                    <span>Vòng 3: Phỏng Vấn Chuyên Sâu</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Time Card */}
            <div className="p-4 rounded-2xl bg-linear-to-br from-amber-500/5 via-amber-500/10 to-transparent dark:from-amber-950/20 dark:to-transparent border border-amber-200/70 dark:border-amber-800/60 space-y-2">
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                Thời Gian Phỏng Vấn Dự Kiến
              </span>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {selectedScheduleApp.interview_scheduled_at ? (
                  new Date(selectedScheduleApp.interview_scheduled_at).toLocaleString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                ) : (
                  <span className="text-slate-500 font-normal italic">
                    Thời gian cụ thể đang được ban nhân sự đồng bộ. Vui lòng kiểm tra lại trước phiên họp.
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Ứng viên vui lòng vào phòng họp trước <strong>5 phút</strong>, chuẩn bị microphone, webcam và đường truyền mạng ổn định.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedScheduleApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>

              {selectedScheduleApp.interview_meeting_id && onNavigateToMeeting ? (
                <button
                  type="button"
                  onClick={() => {
                    const meetingId = selectedScheduleApp.interview_meeting_id!;
                    setSelectedScheduleApp(null);
                    onNavigateToMeeting(meetingId);
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Tham Gia Buồng Phỏng Vấn Ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-bold flex items-center gap-2 cursor-not-allowed"
                >
                  <Clock className="w-4 h-4" />
                  <span>Phòng họp sẽ mở tự động</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          RESUME PREVIEW MODAL
      ────────────────────────────────────────────────────────── */}
      <CandidateResumeViewerModal
        isOpen={isViewerModalOpen}
        onClose={() => {
          setIsViewerModalOpen(false);
          setSelectedResume(null);
          setSelectedJobTitle(null);
        }}
        resume={selectedResume}
        jobTitle={selectedJobTitle}
      />
    </div>
  );
}
