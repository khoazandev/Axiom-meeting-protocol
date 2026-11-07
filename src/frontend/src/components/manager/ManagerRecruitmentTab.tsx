'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import { InterviewScorecardModal } from '@/components/meetings/InterviewScorecardModal';
import { CandidateAssessmentReviewPanel } from '@/components/recruitment/CandidateAssessmentReviewPanel';
import { CandidateSplitDossierModal } from '@/components/recruitment/CandidateSplitDossierModal';
import { JobOpeningDetailModal } from '@/components/recruitment/JobOpeningDetailModal';
import { CreateProfessionalJobModal } from '@/components/admin/CreateProfessionalJobModal';
import { EditJobOpeningModal } from '@/components/admin/EditJobOpeningModal';
import {
  recruitmentApi,
  RecruitmentApplication,
  JobOpening,
  RecruitmentStage,
  UserResume,
} from '@/lib/recruitment-api';
import { Department, OrgMemberDetail, departmentAdminApi, organizationAdminApi } from '@/lib/api';
import { getDepartmentIcon } from '@/lib/departmentIcons';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { CompanyLogo } from '@/lib/companyLogos';

interface ManagerRecruitmentTabProps {
  organizationId: string;
  onNotify?: (msg: string) => void;
}

type ManagerSubTab = 'openings' | 'resumes' | 'pipeline';

const STAGE_LABELS: Record<RecruitmentStage, { label: string; badge: string }> = {
  INVITED: {
    label: 'Hồ sơ mới',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  ASSESSMENT_PENDING: {
    label: 'Chờ làm test',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  ASSESSMENT_SUBMITTED: {
    label: 'Đã nộp test',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  INTERVIEW_SCHEDULED: {
    label: 'Đã lên lịch PV',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  INTERVIEW_COMPLETED: {
    label: 'Đã phỏng vấn',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  HR_REVIEW_PENDING: {
    label: 'Chờ HR đánh giá',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  OWNER_APPROVAL_PENDING: {
    label: 'Chờ Owner duyệt',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  },
  APPROVED: {
    label: 'Đã được duyệt',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  ONBOARDING_INVITED: {
    label: 'Đã mời Onboarding',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  },
  HIRED: {
    label: 'Đã tuyển',
    badge: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-800/60 dark:text-emerald-200',
  },
  REJECTED: {
    label: 'Từ chối',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  },
  WITHDRAWN: {
    label: 'Ứng viên rút',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
  EXPIRED: {
    label: 'Hết hạn',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
};

const STAGE_COLUMNS: {
  id: string;
  title: string;
  stages: RecruitmentStage[];
  color: string;
  icon: string;
}[] = [
  {
    id: 'applied',
    title: '1. Hồ Sơ Mới',
    stages: ['INVITED'],
    color: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    icon: 'mail',
  },
  {
    id: 'assessment',
    title: '2. Đánh Giá Năng Lực',
    stages: ['ASSESSMENT_PENDING', 'ASSESSMENT_SUBMITTED'],
    color: 'border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-300',
    icon: 'quiz',
  },
  {
    id: 'interview',
    title: '3. Phỏng Vấn Trực Tuyến',
    stages: ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'],
    color: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    icon: 'video_camera_front',
  },
  {
    id: 'review',
    title: '4. Đánh Giá & Đề Xuất',
    stages: ['HR_REVIEW_PENDING'],
    color: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300',
    icon: 'rate_review',
  },
  {
    id: 'decision',
    title: '5. Phê Duyệt Tuyển Dụng',
    stages: ['OWNER_APPROVAL_PENDING', 'APPROVED', 'ONBOARDING_INVITED', 'HIRED'],
    color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    icon: 'verified',
  },
  {
    id: 'rejected',
    title: '6. Không Đạt / Rớt',
    stages: ['REJECTED', 'WITHDRAWN', 'EXPIRED', 'CANCELLED'],
    color: 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300',
    icon: 'cancel',
  },
];

export function ManagerRecruitmentTab({ organizationId, onNotify }: ManagerRecruitmentTabProps) {
  const { activeOrganization } = useAuthStore();

  // Subtab navigation
  const [activeSubTab, setActiveSubTab] = useState<ManagerSubTab>('openings');

  // Core Data
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<OrgMemberDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters (Fixed Width Anti-CLS)
  const [selectedOpeningFilter, setSelectedOpeningFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');
  const [resumeSearchQuery, setResumeSearchQuery] = useState('');

  // Selected application for evaluation drawer
  const [selectedApp, setSelectedApp] = useState<RecruitmentApplication | null>(null);

  // Modals state
  const [scorecardInterviewId, setScorecardInterviewId] = useState<string | null>(null);
  const [reviewAssessmentAttemptId, setReviewAssessmentAttemptId] = useState<string | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [viewingOpeningDetail, setViewingOpeningDetail] = useState<JobOpening | null>(null);
  const [editingOpening, setEditingOpening] = useState<JobOpening | null>(null);
  const [isProfessionalModalOpen, setIsProfessionalModalOpen] = useState(false);

  // Reject Modal state
  const [rejectingApp, setRejectingApp] = useState<RecruitmentApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Drag and Drop Pipeline Candidate state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Review submission state in Drawer
  const [reviewDecision, setReviewDecision] = useState<'HIRE' | 'NO_HIRE' | 'NEEDS_MORE_EVIDENCE'>('HIRE');
  const [reviewReason, setReviewReason] = useState('');
  const [aiDiffReason, setAiDiffReason] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Expanded toggles for opening descriptions
  const [expandedOpeningIds, setExpandedOpeningIds] = useState<Record<string, boolean>>({});

  // Fetch all necessary data
  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    try {
      const [apps, ops, depts, mems] = await Promise.allSettled([
        recruitmentApi.listApplications(organizationId),
        recruitmentApi.listOpenings(organizationId),
        departmentAdminApi.list(organizationId),
        organizationAdminApi.getMembers(organizationId),
      ]);

      if (apps.status === 'fulfilled') setApplications(apps.value);
      if (ops.status === 'fulfilled') setOpenings(ops.value);
      if (depts.status === 'fulfilled') setDepartments(depts.value);
      if (mems.status === 'fulfilled') {
        const eligible = mems.value.filter((m) => ['MANAGER', 'ADMIN', 'OWNER'].includes(m.role));
        setManagers(eligible.length > 0 ? eligible : mems.value);
      }
    } catch (err) {
      console.error('Failed to load manager recruitment data', err);
      onNotify?.('Lỗi tải dữ liệu đánh giá tuyển dụng');
    } finally {
      setLoading(false);
    }
  }, [organizationId, onNotify]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const refreshSelected = async (appId: string) => {
    try {
      const updated = await recruitmentApi.getApplication(organizationId, appId);
      setSelectedApp(updated);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      // ignore
    }
  };

  // View Canva Resume
  const handleViewCanvaResume = async (appId: string) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (targetApp) {
      setSelectedApp(targetApp);
    }
  };

  // Approve CV
  const handleApproveCV = async (appId: string) => {
    setActionLoading(true);
    // Optimistic update
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, stage: 'ASSESSMENT_PENDING' as RecruitmentStage }
          : a
      )
    );
    if (selectedApp?.id === appId) {
      setSelectedApp((prev) => (prev ? { ...prev, stage: 'ASSESSMENT_PENDING' as RecruitmentStage } : null));
    }
    try {
      await recruitmentApi.approveCV(organizationId, appId, {
        decision: 'APPROVE',
        reason: 'Hồ sơ đạt tiêu chuẩn sơ loại chuyên môn',
      });
      onNotify?.('Đã phê duyệt hồ sơ ứng viên thành công!');
      await refreshSelected(appId);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi phê duyệt hồ sơ');
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Candidate Drag & Drop across Pipeline Columns
  const handlePipelineCardDrop = async (appId: string, targetColId: string) => {
    const targetCol = STAGE_COLUMNS.find((c) => c.id === targetColId);
    if (!targetCol) return;

    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    if (targetCol.stages.includes(targetApp.stage)) {
      return;
    }

    const nextStage: RecruitmentStage = targetCol.stages[0];

    // Optimistic UI update
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, stage: nextStage } : a))
    );
    if (selectedApp?.id === appId) {
      setSelectedApp((prev) => (prev ? { ...prev, stage: nextStage } : null));
    }

    try {
      if (targetColId === 'assessment' && targetApp.stage === 'INVITED') {
        await recruitmentApi.approveCV(organizationId, appId, {
          decision: 'APPROVE',
          reason: 'Duyệt hồ sơ CV và chuyển sang làm bài test qua kéo thả Pipeline',
          expected_version: targetApp.version,
        });
        onNotify?.('Đã duyệt CV và tự động gửi email mời làm bài kiểm tra năng lực cho ứng viên!');
      } else if (targetColId === 'rejected') {
        await recruitmentApi.rejectApplication(organizationId, appId, {
          reason: 'Từ chối ứng viên qua kéo thả Pipeline',
          expected_version: targetApp.version,
        });
        onNotify?.('Đã chuyển ứng viên vào danh sách Không đạt.');
      } else {
        await recruitmentApi.moveStage(organizationId, appId, {
          target_stage: nextStage,
          reason: `Chuyển sang cột "${targetCol.title}" qua kéo thả Pipeline`,
          expected_version: targetApp.version,
        });
        onNotify?.(`Đã chuyển ứng viên sang "${targetCol.title}" thành công!`);
      }
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi khi chuyển giai đoạn ứng viên');
      fetchData();
    }
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectingApp) return;
    if (!rejectReason.trim()) {
      onNotify?.('Vui lòng nhập lý do đánh giá không đạt');
      return;
    }

    const targetId = rejectingApp.id;
    setActionLoading(true);
    // Optimistic update
    setApplications((prev) =>
      prev.map((a) =>
        a.id === targetId
          ? { ...a, stage: 'REJECTED' as RecruitmentStage }
          : a
      )
    );
    if (selectedApp?.id === targetId) {
      setSelectedApp((prev) => (prev ? { ...prev, stage: 'REJECTED' as RecruitmentStage } : null));
    }

    try {
      if (rejectingApp.stage === 'HR_REVIEW_PENDING') {
        await recruitmentApi.submitHRReview(organizationId, targetId, {
          decision: 'NO_HIRE',
          reason: rejectReason.trim(),
          expected_version: rejectingApp.version,
        });
      } else {
        await recruitmentApi.rejectApplication(organizationId, targetId, {
          reason: rejectReason.trim(),
          expected_version: rejectingApp.version,
        });
      }
      onNotify?.('Đã ghi nhận kết quả không đạt và gửi thông báo tới ứng viên');
      setRejectingApp(null);
      setRejectReason('');
      if (selectedApp?.id === targetId) {
        await refreshSelected(targetId);
      }
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi xử lý đánh giá');
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  // Submit HR Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (reviewReason.trim().length < 5) {
      onNotify?.('Vui lòng nhập lý do đánh giá tối thiểu 5 ký tự');
      return;
    }

    const nextStage: RecruitmentStage = reviewDecision === 'HIRE' ? 'OWNER_APPROVAL_PENDING' : 'REJECTED';
    const appId = selectedApp.id;

    // Optimistic update
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, stage: nextStage }
          : a
      )
    );
    setSelectedApp((prev) => (prev ? { ...prev, stage: nextStage } : null));

    setSubmittingReview(true);
    try {
      await recruitmentApi.submitHRReview(organizationId, appId, {
        decision: reviewDecision,
        reason: reviewReason.trim(),
        ai_diff_reason: aiDiffReason.trim() || undefined,
        expected_version: selectedApp.version,
      });

      if (reviewDecision === 'HIRE') {
        onNotify?.('Đã chuyển tiếp đề xuất tuyển dụng lên Owner phê duyệt');
      } else if (reviewDecision === 'NO_HIRE') {
        onNotify?.('Đã gửi đánh giá không đạt và gửi thông báo cho ứng viên');
      } else {
        onNotify?.('Đã lưu kết quả đánh giá bổ sung');
      }

      setReviewReason('');
      setAiDiffReason('');
      await refreshSelected(appId);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi gửi đánh giá');
      fetchData();
    } finally {
      setSubmittingReview(false);
    }
  };

  // Candidate detail inspection handled by CandidateSplitDossierModal

  // Update opening status
  const handleUpdateOpeningStatus = async (
    openingId: string,
    status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAFT'
  ) => {
    try {
      await recruitmentApi.updateOpening(organizationId, openingId, { status });
      setOpenings((prev) =>
        prev.map((o) => (o.id === openingId ? { ...o, status } : o))
      );
      onNotify?.('Đã cập nhật trạng thái tuyển dụng!');
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi cập nhật trạng thái');
    }
  };

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (selectedOpeningFilter !== 'ALL' && app.opening_id !== selectedOpeningFilter) return false;
      if (selectedStageFilter !== 'ALL' && app.stage !== selectedStageFilter) return false;
      if (resumeSearchQuery.trim()) {
        const q = resumeSearchQuery.toLowerCase();
        const candName = app.candidate?.full_name?.toLowerCase() || (app as any).candidate_name?.toLowerCase() || '';
        const candEmail = app.candidate?.email?.toLowerCase() || (app as any).candidate_email?.toLowerCase() || '';
        const candPhone = app.candidate?.phone?.toLowerCase() || (app as any).candidate_phone?.toLowerCase() || '';
        const jobTitle = app.opening?.title?.toLowerCase() || (app as any).opening_title?.toLowerCase() || '';
        if (
          !candName.includes(q) &&
          !candEmail.includes(q) &&
          !candPhone.includes(q) &&
          !jobTitle.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [applications, selectedOpeningFilter, selectedStageFilter, resumeSearchQuery]);

  return (
    <div className="space-y-5">
      {/* ── Top Header Navigation Bar with Modern Subtabs ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <MatIcon name="fact_check" size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Đánh Giá Tuyển Dụng</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                Chuyên Môn & Pipeline
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sàng lọc hồ sơ, chấm điểm bài kiểm tra năng lực và điều phối phỏng vấn trực tuyến.
            </p>
          </div>
        </div>

        {/* 3 Main Subtabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('openings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'openings'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MatIcon name="campaign" size={16} />
            <span>Tin Tuyển Dụng</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700/70 text-[10px]">
              {openings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('resumes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'resumes'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MatIcon name="inventory_2" size={16} />
            <span>Kho Lưu Trữ Ứng Viên</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700/70 text-[10px]">
              {applications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('pipeline')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'pipeline'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MatIcon name="view_kanban" size={16} />
            <span>Quy Trình Pipeline</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px]">
              5 Giai đoạn
            </span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── SUB-TAB 1: QUẢN LÝ TIN TUYỂN DỤNG (OPENINGS) ───────────── */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'openings' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Tổng Vị Trí</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {openings.length}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-emerald-600 block">Đang Tuyển</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {openings.filter((o) => o.status === 'ACTIVE').length}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-amber-600 block">Tạm Dừng</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {openings.filter((o) => o.status !== 'ACTIVE').length}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-blue-600 block">Tổng Hồ Sơ Ứng Tuyển</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">
                {applications.length}
              </span>
            </div>
          </div>

          {/* Openings Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MatIcon name="list_alt" size={18} className="text-blue-600" />
                  <span>Danh Sách Vị Trí Tuyển Dụng & Trạng Thái</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Theo dõi nhu cầu tuyển dụng, tiêu chuẩn đãi ngộ và kết quả đánh giá từng vị trí.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProfessionalModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
                >
                  <MatIcon name="add" size={16} />
                  <span>Thêm Vị Trí Mới</span>
                </button>
              </div>
            </div>

            {openings.length === 0 ? (
              <div className="py-14 text-center text-slate-400 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
                  <MatIcon name="work_outline" size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Chưa có vị trí tuyển dụng nào</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Thiết lập vị trí đầu tiên để bắt đầu tiếp nhận hồ sơ và bài kiểm tra năng lực.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfessionalModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                >
                  Thiết Lập Vị Trí Đầu Tiên
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {openings.map((op) => {
                  const opApps = applications.filter((a) => a.opening_id === op.id);
                  const dept = departments.find((d) => d.id === op.department_id);

                  // Fallback metadata parsing
                  let parsedMeta: { level?: string; work_type?: string; salary_range?: string; location?: string } | null = null;
                  if (op.competency_rubric_json) {
                    try {
                      parsedMeta = JSON.parse(op.competency_rubric_json);
                    } catch {}
                  }
                  const opLevel = op.level || parsedMeta?.level;
                  const opWorkType = op.work_type || parsedMeta?.work_type;
                  const opSalary = op.salary_range || parsedMeta?.salary_range;
                  const opLoc = op.location || parsedMeta?.location;

                  return (
                    <div
                      key={op.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col justify-between gap-4 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md"
                    >
                      <div className="space-y-3">
                        {/* Card Top: Dept with Icon + Status Selector */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 flex items-center gap-1 truncate max-w-[170px]">
                            <MatIcon
                              name={getDepartmentIcon(dept || { name: op.title })}
                              size={13}
                              className="text-blue-600 dark:text-blue-400 shrink-0"
                            />
                            <span className="truncate">{dept?.name || 'Bộ Phận Chuyên Môn'}</span>
                          </span>

                          {/* Anti-CLS Fixed Width Status Selector */}
                          <div className="shrink-0">
                            <AxiomSelect
                              value={op.status || 'ACTIVE'}
                              onChange={(val) =>
                                handleUpdateOpeningStatus(
                                  op.id,
                                  val as 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAFT'
                                )
                              }
                              options={[
                                { value: 'ACTIVE', label: 'Đang tuyển', triggerLabel: 'Đang tuyển' },
                                { value: 'PAUSED', label: 'Tạm dừng', triggerLabel: 'Tạm dừng' },
                                { value: 'CLOSED', label: 'Đã đóng', triggerLabel: 'Đã đóng' },
                                { value: 'DRAFT', label: 'Bản nháp', triggerLabel: 'Bản nháp' },
                              ]}
                              width="125px"
                              triggerClassName="w-[125px] h-8 text-[11px] font-bold"
                            />
                          </div>
                        </div>

                        {/* Title */}
                        <div>
                          <h4
                            onClick={() => setViewingOpeningDetail(op)}
                            className="text-sm font-bold text-slate-900 dark:text-white leading-snug hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                            title="Nhấp để xem chi tiết tin tuyển dụng & đãi ngộ"
                          >
                            {op.title}
                          </h4>
                          {opLoc && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MatIcon name="location_on" size={13} className="text-slate-400 shrink-0" />
                              <span className="truncate">{opLoc}</span>
                            </p>
                          )}
                        </div>

                        {/* Meta Tags Row */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                          {opLevel && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {opLevel}
                            </span>
                          )}
                          {opWorkType && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {opWorkType}
                            </span>
                          )}
                          {opSalary && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              {opSalary}
                            </span>
                          )}
                          {op.requires_assessment && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-0.5">
                              <MatIcon name="quiz" size={12} />
                              Bài test
                            </span>
                          )}
                        </div>

                        {/* Description with More/Less Toggle */}
                        {op.description && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            <p className={expandedOpeningIds[`desc_${op.id}`] ? '' : 'line-clamp-2'}>
                              {op.description}
                            </p>
                            {op.description.length > 90 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedOpeningIds((prev) => ({
                                    ...prev,
                                    [`desc_${op.id}`]: !prev[`desc_${op.id}`],
                                  }));
                                }}
                                className="text-[10.5px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-0.5 cursor-pointer inline-flex items-center gap-0.5"
                              >
                                <span>{expandedOpeningIds[`desc_${op.id}`] ? 'Thu gọn' : '... Xem thêm'}</span>
                                <MatIcon name={expandedOpeningIds[`desc_${op.id}`] ? 'expand_less' : 'expand_more'} size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Bottom: Applicants count & Action buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <MatIcon name="group" size={14} />
                          <span>{opApps.length} hồ sơ</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingOpeningDetail(op)}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors flex items-center gap-1"
                            title="Xem chi tiết đầy đủ tin tuyển dụng"
                          >
                            <MatIcon name="info" size={13} />
                            <span>Chi Tiết</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingOpening(op)}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 cursor-pointer transition-colors flex items-center gap-1 border border-amber-200/80 dark:border-amber-800/60"
                            title="Chỉnh sửa thông tin vị trí tuyển dụng"
                          >
                            <MatIcon name="edit" size={13} />
                            <span>Chỉnh Sửa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOpeningFilter(op.id);
                              setActiveSubTab('resumes');
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer transition-colors"
                          >
                            Xem Hồ Sơ
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOpeningFilter(op.id);
                              setActiveSubTab('pipeline');
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 cursor-pointer transition-colors"
                          >
                            Quy Trình
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── SUB-TAB 2: KHO LƯU TRỮ ỨNG VIÊN (RESUMES SHOWCASE) ───── */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'resumes' && (
        <div className="space-y-4">
          {/* Search & Filters Bar (Anti-CLS with fixed widths) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <MatIcon
                  name="search"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={resumeSearchQuery}
                  onChange={(e) => setResumeSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên ứng viên, email, số điện thoại hoặc vị trí..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                />
              </div>
              {resumeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setResumeSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Vị trí:</span>
                <AxiomSelect
                  value={selectedOpeningFilter}
                  onChange={(val) => setSelectedOpeningFilter(val)}
                  options={[
                    { value: 'ALL', label: 'Tất cả vị trí', triggerLabel: 'Tất cả vị trí' },
                    ...openings.map((op) => ({
                      value: op.id,
                      label: op.title,
                      triggerLabel: op.title,
                    })),
                  ]}
                  width="180px"
                  triggerClassName="w-[180px] shrink-0"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Giai đoạn:</span>
                <AxiomSelect
                  value={selectedStageFilter}
                  onChange={(val) => setSelectedStageFilter(val)}
                  options={[
                    { value: 'ALL', label: 'Tất cả giai đoạn', triggerLabel: 'Tất cả giai đoạn' },
                    ...Object.entries(STAGE_LABELS).map(([k, v]) => ({
                      value: k,
                      label: v.label,
                      triggerLabel: v.label,
                    })),
                  ]}
                  width="170px"
                  triggerClassName="w-[170px] shrink-0"
                />
              </div>

              <span className="text-xs font-bold text-slate-500">
                ({filteredApps.length} hồ sơ)
              </span>
            </div>
          </div>

          {/* Candidates Grid / List */}
          {filteredApps.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <MatIcon name="folder_open" size={32} className="mx-auto text-slate-400" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Không tìm thấy hồ sơ ứng viên</p>
              <p className="text-xs text-slate-500">Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc phía trên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredApps.map((app) => {
                const stageMeta = STAGE_LABELS[app.stage] || {
                  label: app.stage,
                  badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
                };
                const cand = app.candidate;
                const op = app.opening;
                const rawCandName = cand?.full_name || (app as any).candidate_name || 'Ứng viên';
                const candName = rawCandName.replace(/\s*\(Chưa gia nhập\)/gi, '').trim() || 'Ứng viên';
                const opTitle = op?.title || (app as any).opening_title || 'Vị trí tuyển dụng';
                const candEmail = cand?.email || (app as any).candidate_email || '';
                const candPhone = cand?.phone || (app as any).candidate_phone || '';
                const candCvUrl = cand?.cv_url || (app as any).candidate_cv_url || '';
                const candNotes = cand?.notes || (app as any).candidate_notes || '';
                const hasCanvaCv = candCvUrl && candCvUrl.startsWith('resume://');
                const dept = departments.find((d) => d.id === op?.department_id);
                const lastAttempt = app.assessment_attempts?.[0];
                const lastInterview = app.interview_sessions?.[0];
                const aiEval = app.ai_evaluations?.[0];

                return (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3.5">
                      {/* Top: Candidate Avatar + Basic Info + Stage Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {candName.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={candName}>
                              {candName}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {candEmail} {candPhone ? `• ${candPhone}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Stage Badge */}
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${stageMeta.badge}`}>
                          {stageMeta.label}
                        </span>
                      </div>

                      {/* Applied Job & Department */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <MatIcon
                            name={getDepartmentIcon(dept || { name: opTitle })}
                            size={16}
                            className="text-blue-600 dark:text-blue-400 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate" title={opTitle}>
                              {opTitle}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                              {dept?.name || 'Bộ Phận Chuyên Môn'} {op?.salary_range ? `• ${op.salary_range}` : ''}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          title="Xem hồ sơ và CV trên 2 màn hình"
                        >
                          <MatIcon name="visibility" size={13} />
                          <span>Xem CV</span>
                        </button>
                      </div>

                      {/* Mini CV Header Preview Card */}
                      <div
                        onClick={() => setSelectedApp(app)}
                        className="group/cv p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer space-y-2 relative overflow-hidden"
                        title="Nhấp để mở xem 2 màn hình (Hồ sơ & Toàn bộ CV)"
                      >
                        {/* Decorative CV Top Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />

                        {/* CV Header Identity */}
                        <div className="flex items-start justify-between gap-2 pt-0.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {candName}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-semibold shrink-0">
                                {hasCanvaCv ? 'Axiom Studio CV' : candCvUrl ? 'CV Ngoài' : 'Chưa có CV'}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 truncate mt-0.5">
                              {opTitle}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold group-hover/cv:translate-x-0.5 transition-transform">
                            <span>Xem 2 màn hình</span>
                            <MatIcon name="arrow_forward" size={12} />
                          </div>
                        </div>

                        {/* Contact metadata chips */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {candEmail && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 truncate max-w-[140px]" title={candEmail}>
                              <MatIcon name="mail" size={11} className="shrink-0 text-slate-400" />
                              <span className="truncate">{candEmail}</span>
                            </span>
                          )}
                          {candPhone && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 truncate" title={candPhone}>
                              <MatIcon name="call" size={11} className="shrink-0 text-slate-400" />
                              <span>{candPhone}</span>
                            </span>
                          )}
                        </div>

                        {/* CV Cover Note / Introduction Excerpt if available */}
                        {candNotes ? (
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10.5px] text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800 line-clamp-2">
                            &ldquo;{candNotes}&rdquo;
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MatIcon name="check_circle" size={11} className="text-emerald-500" />
                            <span>Hồ sơ đã được lưu trữ sẵn sàng thẩm định</span>
                          </div>
                        )}
                      </div>

                      {/* Evaluation Metrics Row: Test, Interview, AI */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Assessment Test */}
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                            <MatIcon name="quiz" size={13} className="text-purple-600" />
                            <span>Bài Test Năng Lực</span>
                          </span>
                          {lastAttempt ? (
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {lastAttempt.score != null ? `${lastAttempt.score}/100` : 'Chờ chấm'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setReviewAssessmentAttemptId(lastAttempt.id)}
                                className="text-[10.5px] font-bold text-purple-600 hover:underline cursor-pointer"
                              >
                                Xem bài làm
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {op?.requires_assessment ? 'Chưa nộp bài' : 'Không có test'}
                            </span>
                          )}
                        </div>

                        {/* Interview Session */}
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                            <MatIcon name="video_camera_front" size={13} className="text-amber-600" />
                            <span>Phỏng Vấn Trực Tuyến</span>
                          </span>
                          {lastInterview ? (
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {lastInterview.status === 'COMPLETED' ? 'Đã phỏng vấn' : 'Đã lên lịch'}
                              </span>
                              {lastInterview.status === 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedApp(app);
                                    setScorecardInterviewId(lastInterview.id);
                                  }}
                                  className="text-[10.5px] font-bold text-amber-600 hover:underline cursor-pointer"
                                >
                                  Biên bản
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Chưa lên lịch</span>
                          )}
                        </div>
                      </div>

                      {/* AI Evaluation Snippet if present */}
                      {aiEval?.summary && (
                        <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2">
                          <MatIcon name="psychology" size={15} className="text-blue-600 shrink-0 mt-0.5" />
                          <p className="line-clamp-2 leading-relaxed">{aiEval.summary}</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions based on Stage */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        Nộp ngày: {new Date(app.created_at).toLocaleDateString('vi-VN')}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* If in INVITED, manager can approve CV */}
                        {app.stage === 'INVITED' && (
                          <button
                            type="button"
                            onClick={() => handleApproveCV(app.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs transition-all flex items-center gap-1"
                          >
                            <MatIcon name="check" size={14} />
                            <span>Duyệt CV</span>
                          </button>
                        )}

                        {/* Open Drawer for evaluation */}
                        {['ASSESSMENT_SUBMITTED', 'INTERVIEW_COMPLETED', 'HR_REVIEW_PENDING'].includes(app.stage) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(app);
                              setReviewDecision('HIRE');
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs transition-all flex items-center gap-1"
                          >
                            <MatIcon name="rate_review" size={14} />
                            <span>Đánh Giá Chuyên Môn</span>
                          </button>
                        )}

                        {/* If already submitted to Owner: show status badge without approve button */}
                        {app.stage === 'OWNER_APPROVAL_PENDING' && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Chờ Owner phê duyệt
                          </span>
                        )}

                        {/* If approved by owner */}
                        {app.stage === 'APPROVED' && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            Đã được Owner duyệt
                          </span>
                        )}

                        {/* If hired */}
                        {(app.stage === 'HIRED' || app.stage === 'ONBOARDING_INVITED') && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-emerald-600 text-white">
                            Đã tuyển dụng
                          </span>
                        )}

                        {/* Reject button (always available until hired or rejected) */}
                        {!['REJECTED', 'APPROVED', 'HIRED', 'ONBOARDING_INVITED'].includes(app.stage) && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingApp(app);
                              setRejectReason('');
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 cursor-pointer transition-colors"
                          >
                            Không Đạt
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

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── SUB-TAB 3: QUY TRÌNH PIPELINE (KANBAN BOARD) ───────────── */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Top Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Lọc theo vị trí:</span>
              <AxiomSelect
                value={selectedOpeningFilter}
                onChange={(val) => setSelectedOpeningFilter(val)}
                options={[
                  { value: 'ALL', label: 'Tất cả vị trí', triggerLabel: 'Tất cả vị trí' },
                  ...openings.map((op) => ({
                    value: op.id,
                    label: op.title,
                    triggerLabel: op.title,
                  })),
                ]}
                width="220px"
                triggerClassName="w-[220px] shrink-0"
              />
            </div>

            <span className="text-xs text-slate-500">
              Tổng số ứng viên trong luồng: <strong>{filteredApps.length}</strong>
            </span>
          </div>

          {/* 6 Kanban Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
            {STAGE_COLUMNS.map((col) => {
              const colApps = filteredApps.filter((a) => col.stages.includes(a.stage));
              const isColActiveDrop = dragOverColId === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverColId !== col.id) setDragOverColId(col.id);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    if (dragOverColId === col.id) setDragOverColId(null);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverColId(null);
                    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
                    if (!appId) return;
                    await handlePipelineCardDrop(appId, col.id);
                  }}
                  className={`rounded-2xl p-3 space-y-3 min-h-[500px] transition-all duration-200 ${
                    isColActiveDrop
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 border-2 border-dashed border-blue-500 ring-4 ring-blue-500/20 scale-[1.01]'
                      : 'bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Column Header */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${col.color}`}>
                    <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                      <MatIcon name={col.icon} size={15} />
                      <span className="truncate">{col.title}</span>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-900 text-current font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards inside column */}
                  <div className="space-y-2.5">
                    {colApps.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs italic">
                        {isColActiveDrop ? 'Thả ứng viên vào đây' : 'Trống'}
                      </div>
                    ) : (
                      colApps.map((app) => {
                        const rawCandName = app.candidate?.full_name || (app as any).candidate_name || 'Ứng viên';
                        const candName = rawCandName.replace(/\s*\(Chưa gia nhập\)/gi, '').trim() || 'Ứng viên';
                        const opTitle = app.opening?.title || (app as any).opening_title || 'Vị trí tuyển dụng';
                        const lastAttempt = app.assessment_attempts?.[0];
                        const lastInterview = app.interview_sessions?.[0];
                        const isDragging = draggedAppId === app.id;

                        return (
                          <div
                            key={app.id}
                            draggable={true}
                            onDragStart={(e) => {
                              setDraggedAppId(app.id);
                              e.dataTransfer.setData('text/plain', app.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setDraggedAppId(null);
                              setDragOverColId(null);
                            }}
                            onClick={() => {
                              setSelectedApp(app);
                              setReviewDecision('HIRE');
                            }}
                            className={`p-3 rounded-xl bg-white dark:bg-slate-900 border transition-all cursor-grab active:cursor-grabbing space-y-2 select-none group relative ${
                              isDragging
                                ? 'opacity-40 border-blue-500 scale-95 shadow-inner'
                                : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 shadow-2xs hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1 min-w-0">
                                <MatIcon name="drag_indicator" size={14} className="text-slate-400 group-hover:text-blue-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={candName}>
                                  {candName}
                                </span>
                              </div>
                              {app.stage === 'OWNER_APPROVAL_PENDING' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0">
                                  Chờ Owner
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-blue-600 dark:text-blue-400 truncate" title={opTitle}>
                              {opTitle}
                            </p>

                            {/* Indicators */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              {lastAttempt?.score != null && (
                                <span className="flex items-center gap-0.5">
                                  <MatIcon name="quiz" size={11} className="text-purple-600" />
                                  <span>{lastAttempt.score}/100</span>
                                </span>
                              )}
                              {lastInterview && (
                                <span className="flex items-center gap-0.5">
                                  <MatIcon name="video_camera_front" size={11} className="text-amber-600" />
                                  <span>{lastInterview.status === 'COMPLETED' ? 'Đã PV' : 'Lịch PV'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2-Screen Candidate Dossier & Live CV Dual Screen Inspection Modal */}
      {selectedApp && (
        <CandidateSplitDossierModal
          isOpen={Boolean(selectedApp)}
          onClose={() => setSelectedApp(null)}
          application={selectedApp}
          organizationId={organizationId}
          userRole="MANAGER"
          canManage={true}
          onStageChange={async (appId, nextStage) => {
            if (nextStage === 'ASSESSMENT_PENDING') {
              await handleApproveCV(appId);
            }
          }}
          onReject={async (appId, version, reason) => {
            if (reason) {
              try {
                setActionLoading(true);
                if (selectedApp.stage === 'HR_REVIEW_PENDING') {
                  await recruitmentApi.submitHRReview(organizationId, appId, {
                    decision: 'NO_HIRE',
                    reason: reason.trim(),
                    expected_version: version,
                  });
                } else {
                  await recruitmentApi.rejectApplication(organizationId, appId, {
                    reason: reason.trim(),
                    expected_version: version,
                  });
                }
                onNotify?.('Đã ghi nhận kết quả không đạt và gửi thông báo tới ứng viên');
                setSelectedApp((prev) => (prev ? { ...prev, stage: 'REJECTED' } : null));
                refreshSelected(appId);
                fetchData();
              } catch (err: any) {
                onNotify?.(err.message || 'Lỗi khi từ chối ứng viên');
              } finally {
                setActionLoading(false);
              }
            } else {
              setRejectingApp(selectedApp);
              setRejectReason('');
            }
          }}
          onSubmitHRReview={async (decision, reason, aiDiff) => {
            const nextStage: RecruitmentStage = decision === 'HIRE' ? 'OWNER_APPROVAL_PENDING' : 'REJECTED';
            const appId = selectedApp.id;
            setSelectedApp((prev) => (prev ? { ...prev, stage: nextStage } : null));
            setSubmittingReview(true);
            try {
              await recruitmentApi.submitHRReview(organizationId, appId, {
                decision,
                reason,
                ai_diff_reason: aiDiff,
                expected_version: selectedApp.version,
              });
              if (decision === 'HIRE') {
                onNotify?.('Đã chuyển tiếp đề xuất tuyển dụng lên Owner phê duyệt');
              } else if (decision === 'NO_HIRE') {
                onNotify?.('Đã gửi đánh giá không đạt và gửi thông báo cho ứng viên');
              } else {
                onNotify?.('Đã ghi nhận yêu cầu bổ sung thông tin');
              }
              await refreshSelected(appId);
              fetchData();
            } catch (err: any) {
              onNotify?.(err.message || 'Lỗi gửi đánh giá');
              fetchData();
            } finally {
              setSubmittingReview(false);
            }
          }}
          onReviewAssessment={(attemptId) => setReviewAssessmentAttemptId(attemptId)}
          onReviewInterview={(sessionId) => setScorecardInterviewId(sessionId)}
          onNotify={onNotify}
          onRefresh={() => {
            if (selectedApp) refreshSelected(selectedApp.id);
            fetchData();
          }}
        />
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── MODALS (FULL SYSTEM INTEGRATION) ──────────────────────── */}
      {/* ──────────────────────────────────────────────────────────── */}

      {/* Reject Application Modal */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <MatIcon name="cancel" size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Đánh Giá Không Đạt
                </h4>
                <p className="text-xs text-slate-500">
                  {rejectingApp.candidate?.full_name} • {rejectingApp.opening?.title}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Lý do không đạt
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do đánh giá không đạt..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRejectingApp(null);
                  setRejectReason('');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác Nhận Không Đạt'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Assessment Review Panel Modal */}
      {reviewAssessmentAttemptId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <CandidateAssessmentReviewPanel
              attemptId={reviewAssessmentAttemptId}
              attempts={
                applications
                  .flatMap((a) => a.assessment_attempts || [])
                  .filter((att) => att.id === reviewAssessmentAttemptId)
              }
              onClose={() => setReviewAssessmentAttemptId(null)}
              onScoreSubmitted={() => {
                fetchData();
                if (selectedApp) refreshSelected(selectedApp.id);
              }}
              onNotify={onNotify}
            />
          </div>
        </div>
      )}

      {/* Interview Scorecard Modal */}
      {scorecardInterviewId && (
        <InterviewScorecardModal
          isOpen={true}
          onClose={() => setScorecardInterviewId(null)}
          orgId={organizationId}
          sessionId={scorecardInterviewId}
          candidateName={selectedApp?.candidate?.full_name}
          jobTitle={selectedApp?.opening?.title}
          onNotify={onNotify}
          onArchiveSuccess={() => {
            onNotify?.('Đã lưu biên bản phỏng vấn thành công!');
            setScorecardInterviewId(null);
            fetchData();
          }}
        />
      )}

      {/* Comprehensive Job Opening Details Modal */}
      {viewingOpeningDetail && (
        <JobOpeningDetailModal
          isOpen={Boolean(viewingOpeningDetail)}
          onClose={() => setViewingOpeningDetail(null)}
          opening={viewingOpeningDetail}
          departmentName={departments.find((d) => d.id === viewingOpeningDetail.department_id)?.name}
          deptIconName={getDepartmentIcon(departments.find((d) => d.id === viewingOpeningDetail.department_id) || { name: viewingOpeningDetail.title })}
          companyInfo={{
            name: activeOrganization?.name || 'Axiom Enterprise',
            tagline: activeOrganization?.tagline || 'Digital Enterprise Protocol',
            logo_url: activeOrganization?.logo_url || undefined,
            banner_url: activeOrganization?.banner_url || undefined,
          }}
          onEdit={(op) => setEditingOpening(op)}
        />
      )}

      {/* Edit Job Opening Modal */}
      {editingOpening && (
        <EditJobOpeningModal
          isOpen={Boolean(editingOpening)}
          onClose={() => setEditingOpening(null)}
          organizationId={organizationId}
          opening={editingOpening}
          departments={departments}
          managers={managers}
          onSuccess={(updated) => {
            setOpenings((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setEditingOpening(null);
            if (viewingOpeningDetail?.id === updated.id) {
              setViewingOpeningDetail(updated);
            }
            fetchData();
          }}
          onNotify={onNotify}
        />
      )}

      {/* Professional Job Setup Multi-Step Wizard Modal */}
      {isProfessionalModalOpen && (
        <CreateProfessionalJobModal
          isOpen={isProfessionalModalOpen}
          onClose={() => setIsProfessionalModalOpen(false)}
          organizationId={organizationId}
          departments={departments}
          managers={managers}
          companyInfo={{
            name: activeOrganization?.name || 'Axiom Enterprise',
            tagline: activeOrganization?.tagline || 'Digital Enterprise Protocol',
            logo_url: activeOrganization?.logo_url || undefined,
          }}
          onSuccess={(newOp) => {
            setOpenings((prev) => [newOp, ...prev]);
            setIsProfessionalModalOpen(false);
            onNotify?.(`Đã thiết lập vị trí tuyển dụng "${newOp.title}" thành công!`);
            fetchData();
          }}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}
