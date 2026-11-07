'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import { InterviewScorecardModal } from '@/components/meetings/InterviewScorecardModal';
import { InterviewSessionsPanel } from '@/components/recruitment/InterviewSessionsPanel';
import { CandidateResumeViewerModal } from '@/components/recruitment/CandidateResumeViewerModal';
import { CandidateAssessmentReviewPanel } from '@/components/recruitment/CandidateAssessmentReviewPanel';
import { CandidateSplitDossierModal } from '@/components/recruitment/CandidateSplitDossierModal';
import {
  recruitmentApi,
  RecruitmentApplication,
  JobOpening,
  RecruitmentStage,
  RecruitmentPolicy,
  IssueOnboardingResponse,
  UserResume,
} from '@/lib/recruitment-api';
import { OrgMemberDetail, Department, organizationApi, organizationAdminApi, departmentAdminApi } from '@/lib/api';
import { getDepartmentIcon } from '@/lib/departmentIcons';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { CompanyLogo } from '@/lib/companyLogos';
import { CreateProfessionalJobModal } from './CreateProfessionalJobModal';
import { EditJobOpeningModal } from './EditJobOpeningModal';
import { JobOpeningDetailModal } from '@/components/recruitment/JobOpeningDetailModal';

interface RecruitmentTabProps {
  organizationId: string;
  managers: OrgMemberDetail[];
  departments: Department[];
  onNotify?: (msg: string) => void;
}

type RecruitmentSubTab = 'company' | 'openings' | 'resumes' | 'pipeline' | 'policies';

const STAGE_COLUMNS: {
  id: string;
  title: string;
  stages: RecruitmentStage[];
  color: string;
  icon: string;
}[] = [
  {
    id: 'col-invited',
    title: '1. Hồ Sơ Mới',
    stages: ['INVITED'],
    color: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    icon: 'mail',
  },
  {
    id: 'col-test',
    title: '2. Đánh Giá Năng Lực',
    stages: ['ASSESSMENT_PENDING', 'ASSESSMENT_SUBMITTED'],
    color: 'border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-300',
    icon: 'quiz',
  },
  {
    id: 'col-interview',
    title: '3. Phỏng Vấn Trực Tuyến',
    stages: ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'],
    color: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    icon: 'video_camera_front',
  },
  {
    id: 'col-hr',
    title: '4. Đánh Giá & Đề Xuất',
    stages: ['HR_REVIEW_PENDING'],
    color: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300',
    icon: 'rate_review',
  },
  {
    id: 'col-owner',
    title: '5. Phê Duyệt Tuyển Dụng',
    stages: [
      'OWNER_APPROVAL_PENDING',
      'APPROVED',
      'ONBOARDING_INVITED',
      'HIRED',
    ],
    color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    icon: 'verified',
  },
  {
    id: 'col-rejected',
    title: '6. Không Đạt / Rớt',
    stages: [
      'REJECTED',
      'WITHDRAWN',
      'EXPIRED',
      'CANCELLED',
    ],
    color: 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300',
    icon: 'cancel',
  },
];

const STAGE_LABELS: Record<RecruitmentStage, { label: string; badge: string }> = {
  INVITED: {
    label: 'Đã mời',
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
    label: 'Chờ HR duyệt',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  OWNER_APPROVAL_PENDING: {
    label: 'Chờ Owner duyệt',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  },
  APPROVED: {
    label: 'Đã duyệt',
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

export function RecruitmentTab({
  organizationId,
  managers,
  departments,
  onNotify,
}: RecruitmentTabProps) {
  const { activeOrganization, updateOrganization } = useAuthStore();

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<RecruitmentSubTab>('company');

  // Recruitment Data
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [policy, setPolicy] = useState<RecruitmentPolicy | null>(null);

  // Filters with fixed-width anti-CLS
  const [selectedOpeningFilter, setSelectedOpeningFilter] = useState<string>('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');
  const [resumeSearchQuery, setResumeSearchQuery] = useState('');

  // Selected application for detail drawer
  const [selectedApp, setSelectedApp] = useState<RecruitmentApplication | null>(null);
  const [scorecardInterviewId, setScorecardInterviewId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [ownerRejectReason, setOwnerRejectReason] = useState('');
  const [generalRejectReason, setGeneralRejectReason] = useState('');
  const [onboardingSuccess, setOnboardingSuccess] = useState<IssueOnboardingResponse | null>(null);

  // Resume Viewer Modal State
  const [viewingResume, setViewingResume] = useState<UserResume | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [reviewAssessmentAttemptId, setReviewAssessmentAttemptId] = useState<string | null>(null);

  // Modals
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [editingOpening, setEditingOpening] = useState<JobOpening | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || '');
  const [newRequirements, setNewRequirements] = useState('');
  const [newRequiresTest, setNewRequiresTest] = useState(false);

  const [hrGrantStates, setHrGrantStates] = useState<Record<string, boolean>>({});
  const [hrGrantError, setHrGrantError] = useState<string | null>(null);

  const [retentionDaysInput, setRetentionDaysInput] = useState<number>(180);

  // Members State with proactive fallback fetch to avoid empty managers list
  const [availableMembers, setAvailableMembers] = useState<OrgMemberDetail[]>(managers || []);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [quickSelectMemberId, setQuickSelectMemberId] = useState<string>('');
  const [managerSearchQuery, setManagerSearchQuery] = useState<string>('');
  const [managerRoleFilter, setManagerRoleFilter] = useState<'ALL' | 'MANAGER' | 'ADMIN' | 'MEMBER'>('ALL');

  // Departments State with proactive fallback fetch to avoid empty departments list
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>(departments || []);

  useEffect(() => {
    if (departments && departments.length > 0) {
      setAvailableDepartments(departments);
    } else if (organizationId) {
      departmentAdminApi
        .list(organizationId)
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) {
            setAvailableDepartments(list);
          }
        })
        .catch(console.warn);
    }
  }, [departments, organizationId]);

  // Text expansion toggles for long descriptions & candidate notes (anti-overflow with More/Less)
  const [expandedOpeningIds, setExpandedOpeningIds] = useState<Record<string, boolean>>({});
  const [expandedCandidateNotes, setExpandedCandidateNotes] = useState<Record<string, boolean>>({});

  // Viewing opening detail modal
  const [viewingOpeningDetail, setViewingOpeningDetail] = useState<JobOpening | null>(null);
  const [cvApprovalReason, setCvApprovalReason] = useState<string>('');

  // Drag and Drop Trash Can state for openings
  const [isDragOverTrash, setIsDragOverTrash] = useState(false);
  const [draggedOpeningId, setDraggedOpeningId] = useState<string | null>(null);

  // Drag and Drop Pipeline Candidate state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const [isProfessionalModalOpen, setIsProfessionalModalOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // ── Company Profile Form State ──
  const [companyForm, setCompanyForm] = useState({
    name: activeOrganization?.name || 'Axiom Enterprise',
    tagline: activeOrganization?.tagline || 'Digital Enterprise Protocol & Sovereign Meeting OS',
    logo_url: activeOrganization?.logo_url || '',
    banner_url: activeOrganization?.banner_url || '',
    tax_id: activeOrganization?.tax_id || '0108923489',
    industry: activeOrganization?.industry || 'Enterprise Software & Security',
    website: activeOrganization?.website || 'https://axiom.enterprise',
    size: activeOrganization?.size || '500 - 1.000 nhân viên',
    headquarters: activeOrganization?.headquarters || 'Keangnam Landmark 72, Hà Nội',
    description:
      activeOrganization?.description ||
      'Tập đoàn tiên phong xây dựng nền tảng số hóa quản trị doanh nghiệp và giao thức hội họp an ninh chủ quyền dữ liệu.',
  });

  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Sync company form if activeOrganization changes
  useEffect(() => {
    if (activeOrganization) {
      setCompanyForm((prev) => ({
        ...prev,
        name: activeOrganization.name || prev.name,
        tagline: activeOrganization.tagline ?? prev.tagline,
        logo_url: activeOrganization.logo_url ?? prev.logo_url,
        banner_url: activeOrganization.banner_url ?? prev.banner_url,
        tax_id: activeOrganization.tax_id ?? prev.tax_id,
        industry: activeOrganization.industry ?? prev.industry,
        website: activeOrganization.website ?? prev.website,
        size: activeOrganization.size ?? prev.size,
        headquarters: activeOrganization.headquarters ?? prev.headquarters,
        description: activeOrganization.description ?? prev.description,
      }));
    }
  }, [activeOrganization]);

  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onNotify?.('Vui lòng chọn file hình ảnh (PNG, JPG, SVG, WEBP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCompanyForm((prev) => ({ ...prev, logo_url: dataUrl }));
      onNotify?.('Đã tải ảnh Logo lên!');
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onNotify?.('Vui lòng chọn file hình ảnh');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCompanyForm((prev) => ({ ...prev, banner_url: dataUrl }));
      onNotify?.('Đã tải ảnh Bìa doanh nghiệp lên!');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      const payload = {
        name: companyForm.name.trim(),
        tagline: companyForm.tagline.trim(),
        logo_url: companyForm.logo_url.trim() || null,
        banner_url: companyForm.banner_url.trim() || null,
        tax_id: companyForm.tax_id.trim() || null,
        industry: companyForm.industry.trim() || null,
        website: companyForm.website.trim() || null,
        size: companyForm.size.trim() || null,
        headquarters: companyForm.headquarters.trim() || null,
        description: companyForm.description.trim() || null,
      };

      if (organizationId) {
        await organizationApi.update(organizationId, payload);
      }
      updateOrganization(payload);
      onNotify?.('✅ Đã lưu trữ hồ sơ doanh nghiệp & hình ảnh vào cơ sở dữ liệu thành công!');
    } catch (err: unknown) {
      console.error('Failed to update company:', err);
      onNotify?.('Lỗi cập nhật thông tin doanh nghiệp');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleDeleteOpening = async (openingId: string) => {
    const target = openings.find((o) => o.id === openingId);
    if (!target) return;
    try {
      await recruitmentApi.deleteOpening(organizationId, openingId);
      setOpenings((prev) => prev.filter((o) => o.id !== openingId));
      onNotify?.(`🗑️ Đã xóa vị trí tuyển dụng "${target.title}" thành công!`);
    } catch (err: unknown) {
      console.warn('Could not delete opening, marking CLOSED:', err);
      try {
        await recruitmentApi.updateOpening(organizationId, openingId, { status: 'CLOSED' });
        setOpenings((prev) => prev.filter((o) => o.id !== openingId));
        onNotify?.(`Đã đóng vị trí tuyển dụng "${target.title}"`);
      } catch {
        onNotify?.('Không thể xóa vị trí tuyển dụng.');
      }
    }
  };

  const handleUpdateOpeningStatus = async (
    openingId: string,
    newStatus: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAFT'
  ) => {
    try {
      await recruitmentApi.updateOpening(organizationId, openingId, { status: newStatus });
      setOpenings((prev) =>
        prev.map((o) => (o.id === openingId ? { ...o, status: newStatus } : o))
      );
      onNotify?.(`Đã cập nhật trạng thái tin tuyển dụng sang ${newStatus}`);
    } catch {
      onNotify?.('Không thể cập nhật trạng thái tin tuyển dụng.');
    }
  };

  const handleViewCanvaResume = async (appId: string) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (targetApp) {
      setSelectedApp(targetApp);
    }
    setLoadingResume(true);
    try {
      const resume = await recruitmentApi.getApplicationResume(organizationId, appId);
      setViewingResume(resume);
    } catch {
      onNotify?.('Không thể tải chi tiết bản CV Canva của ứng viên.');
    } finally {
      setLoadingResume(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    try {
      const [ops, apps, pol, grants] = await Promise.all([
        recruitmentApi.listOpenings(organizationId),
        recruitmentApi.listApplications(organizationId),
        recruitmentApi.getPolicy(organizationId).catch(() => null),
        recruitmentApi.getReviewGrants(organizationId).catch(() => []),
      ]);
      setOpenings(ops);
      setApplications(apps);
      if (pol) {
        setPolicy(pol);
        setRetentionDaysInput(pol.retention_days);
      }
      if (Array.isArray(grants)) {
        const grantMap: Record<string, boolean> = {};
        grants.forEach((g) => {
          grantMap[g.member_id] = g.enabled;
        });
        setHrGrantStates(grantMap);
      }
    } catch (err: unknown) {
      console.error('Failed to load recruitment data', err);
      onNotify?.('Lỗi tải dữ liệu tuyển dụng');
    }
  }, [organizationId, onNotify]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Proactive fetch of organization members to guarantee list is never empty
  const fetchMembers = useCallback(async () => {
    const orgId = organizationId || activeOrganization?.id;
    if (!orgId) return;
    setLoadingMembers(true);
    try {
      const list = await organizationAdminApi.getMembers(orgId);
      if (Array.isArray(list) && list.length > 0) {
        setAvailableMembers(list);
      }
    } catch (err) {
      console.warn('Failed to load organization members in RecruitmentTab:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [organizationId, activeOrganization?.id]);

  useEffect(() => {
    if (managers && managers.length > 0) {
      setAvailableMembers(managers);
    }
  }, [managers]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Synchronize review grants and members whenever entering policies tab
  useEffect(() => {
    if (activeSubTab === 'policies') {
      fetchMembers();
      const orgId = organizationId || activeOrganization?.id;
      if (orgId) {
        recruitmentApi
          .getReviewGrants(orgId)
          .then((grants) => {
            if (Array.isArray(grants)) {
              const grantMap: Record<string, boolean> = {};
              grants.forEach((g) => {
                grantMap[g.member_id] = g.enabled;
              });
              setHrGrantStates(grantMap);
            }
          })
          .catch((err) => console.error('Failed to load review grants:', err));
      }
    }
  }, [activeSubTab, fetchMembers, organizationId, activeOrganization?.id]);

  // Refresh single application detail if drawer is open
  const refreshDetail = async (appId: string) => {
    try {
      const updated = await recruitmentApi.getApplication(organizationId, appId);
      setSelectedApp(updated);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      // ignore
    }
  };

  // Filter applications for pipeline
  const filteredApps = applications.filter((app) => {
    if (selectedOpeningFilter !== 'ALL' && app.opening_id !== selectedOpeningFilter) return false;
    if (selectedStageFilter !== 'ALL' && app.stage !== selectedStageFilter) return false;
    return true;
  });

  // Filter applications for Resumes Vault
  const searchedApps = applications.filter((app) => {
    if (selectedOpeningFilter !== 'ALL' && app.opening_id !== selectedOpeningFilter) return false;
    if (selectedStageFilter !== 'ALL' && app.stage !== selectedStageFilter) return false;
    if (resumeSearchQuery.trim()) {
      const q = resumeSearchQuery.toLowerCase();
      const name = app.candidate?.full_name?.toLowerCase() || (app as any).candidate_name?.toLowerCase() || '';
      const email = app.candidate?.email?.toLowerCase() || (app as any).candidate_email?.toLowerCase() || '';
      const phone = app.candidate?.phone?.toLowerCase() || (app as any).candidate_phone?.toLowerCase() || '';
      const job = app.opening?.title?.toLowerCase() || (app as any).opening_title?.toLowerCase() || '';
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !job.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Handle CV Approval / Rejection
  const handleCVApproval = async (decision: 'APPROVE' | 'REJECT', customReason?: string) => {
    if (!selectedApp) return;
    const appId = selectedApp.id;
    const nextStage: RecruitmentStage = decision === 'APPROVE' ? 'ASSESSMENT_PENDING' : 'REJECTED';
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, stage: nextStage } : a)));
    setSelectedApp((prev) => (prev ? { ...prev, stage: nextStage } : null));

    setActionLoading(true);
    try {
      await recruitmentApi.approveCV(organizationId, appId, {
        decision,
        reason: (customReason !== undefined ? customReason : cvApprovalReason).trim() || undefined,
        expected_version: selectedApp.version,
      });
      onNotify?.(
        decision === 'APPROVE'
          ? 'Đã duyệt hồ sơ CV và mở bài kiểm tra cho ứng viên!'
          : 'Đã từ chối hồ sơ ứng tuyển của ứng viên.'
      );
      setCvApprovalReason('');
      await refreshDetail(appId);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi thẩm định hồ sơ CV');
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
      return; // Already in target column
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
      if (targetColId === 'col-test' && targetApp.stage === 'INVITED') {
        await recruitmentApi.approveCV(organizationId, appId, {
          decision: 'APPROVE',
          reason: 'Duyệt hồ sơ CV và chuyển sang làm bài test qua kéo thả Pipeline',
          expected_version: targetApp.version,
        });
        onNotify?.('Đã duyệt CV và tự động gửi email mời làm bài kiểm tra năng lực cho ứng viên!');
      } else if (targetColId === 'col-rejected') {
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

  // Handle Owner Approval
  const handleOwnerApprove = async () => {
    if (!selectedApp) return;
    const appId = selectedApp.id;
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, stage: 'APPROVED' as RecruitmentStage } : a)));
    setSelectedApp((prev) => (prev ? { ...prev, stage: 'APPROVED' as RecruitmentStage } : null));

    setActionLoading(true);
    try {
      await recruitmentApi.submitOwnerApproval(organizationId, appId, {
        decision: 'APPROVE',
        expected_version: selectedApp.version,
      });
      onNotify?.('Đã phê duyệt tuyển dụng ứng viên!');
      await refreshDetail(appId);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi phê duyệt tuyển dụng');
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleOwnerReject = async (customReason?: string) => {
    if (!selectedApp) return;
    const finalReason = (customReason !== undefined ? customReason : ownerRejectReason).trim();
    if (!finalReason) {
      onNotify?.('Vui lòng nhập lý do từ chối');
      return;
    }
    const appId = selectedApp.id;
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, stage: 'REJECTED' as RecruitmentStage } : a)));
    setSelectedApp((prev) => (prev ? { ...prev, stage: 'REJECTED' as RecruitmentStage } : null));

    setActionLoading(true);
    try {
      await recruitmentApi.submitOwnerApproval(organizationId, appId, {
        decision: 'REJECT',
        reason: finalReason,
        expected_version: selectedApp.version,
      });
      onNotify?.('Đã từ chối tuyển dụng ứng viên');
      setOwnerRejectReason('');
      await refreshDetail(appId);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi từ chối tuyển dụng');
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  // Handle General Rejection (From any active stage)
  const handleGeneralReject = async (customReason?: string) => {
    if (!selectedApp) return;
    const appId = selectedApp.id;
    const finalReason = (customReason !== undefined ? customReason : generalRejectReason).trim() || undefined;
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, stage: 'REJECTED' as RecruitmentStage } : a)));
    setSelectedApp((prev) => (prev ? { ...prev, stage: 'REJECTED' as RecruitmentStage } : null));

    setActionLoading(true);
    try {
      await recruitmentApi.rejectApplication(organizationId, appId, {
        reason: finalReason,
        expected_version: selectedApp.version,
      });
      onNotify?.('Đã đánh giá không đạt và gửi email thông báo tới ứng viên!');
      setGeneralRejectReason('');
      await refreshDetail(appId);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi khi từ chối ứng viên');
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Onboarding Issuance
  const handleIssueOnboarding = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      const res = await recruitmentApi.issueOnboarding(organizationId, selectedApp.id);
      setOnboardingSuccess(res);
      onNotify?.('Đã tạo và gửi thư mời Onboarding thành công!');
      await refreshDetail(selectedApp.id);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi phát hành Onboarding');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle AI Evaluation Run
  const handleRunEvaluation = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await recruitmentApi.runEvaluation(organizationId, selectedApp.id);
      onNotify?.('Đã chạy AI đánh giá hồ sơ ứng viên thành công!');
      await refreshDetail(selectedApp.id);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi phân tích AI');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Assign HR
  const handleAssignHR = async (hrMemberId: string | null) => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await recruitmentApi.assignHR(organizationId, selectedApp.id, hrMemberId);
      onNotify?.('Đã cập nhật HR phụ trách');
      await refreshDetail(selectedApp.id);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi phân công HR');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Opening
  const handleCreateOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await recruitmentApi.createOpening(organizationId, {
        title: newTitle.trim(),
        department_id: newDeptId,
        requirements: newRequirements.trim(),
        requires_assessment: newRequiresTest,
        status: 'ACTIVE',
      });
      onNotify?.('Đã tạo vị trí tuyển dụng mới!');
      setIsOpeningModalOpen(false);
      setNewTitle('');
      setNewRequirements('');
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi tạo vị trí tuyển dụng');
    }
  };

  // Handle HR Grant Toggle
  const handleToggleHRGrant = async (memberId: string, currentVal: boolean) => {
    const orgId = organizationId || activeOrganization?.id;
    if (!orgId) return;
    setHrGrantError(null);
    try {
      const res = await recruitmentApi.toggleReviewGrant(orgId, memberId, !currentVal);
      setHrGrantStates((prev) => ({ ...prev, [memberId]: res.enabled }));
      onNotify?.(`Đã ${res.enabled ? 'cấp' : 'thu hồi'} quyền HR thành công!`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setHrGrantError(e.message || 'Không thể thay đổi quyền HR');
    }
  };

  // Handle Policy Update
  const handleSavePolicy = async () => {
    try {
      const updated = await recruitmentApi.updatePolicy(organizationId, retentionDaysInput);
      setPolicy(updated);
      onNotify?.('Đã lưu chính sách lưu trữ dữ liệu tuyển dụng');
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi cập nhật chính sách');
    }
  };

  // Note: Detailed candidate inspection and CV viewing is handled by CandidateSplitDossierModal


  return (
    <div className="space-y-6">
      {/* ── Top Header & Sub-Tab Navigation Bar ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <CompanyLogo
              orgName={companyForm.name}
              logoUrl={companyForm.logo_url}
              size={48}
              className="shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md">
                  {companyForm.name || 'Trung Tâm Quản Lý Doanh Nghiệp & Tuyển Dụng'}
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  Owner Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-md sm:max-w-xl">
                {companyForm.tagline || 'Quản lý thông tin doanh nghiệp, tin tuyển dụng, kho CV và quy trình phê duyệt Onboarding'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProfessionalModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <MatIcon name="add" size={16} />
              <span>Đăng Tin Tuyển</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Switcher with anti-CLS */}
        <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('company')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'company'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MatIcon name="domain" size={16} />
            <span>Hồ Sơ Doanh Nghiệp & Logo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('openings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'openings'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MatIcon name="campaign" size={16} />
            <span>Tin Tuyển Dụng</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {openings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('resumes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'resumes'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MatIcon name="inventory_2" size={16} />
            <span>Kho Lưu Trữ Ứng Viên</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {applications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('pipeline')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'pipeline'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MatIcon name="view_kanban" size={16} />
            <span>Quy Trình Pipeline</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px]">
              5 Giai đoạn
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('policies')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'policies'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MatIcon name="admin_panel_settings" size={16} />
            <span>Phân Quyền HR & Chính Sách</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── SUB-TAB 1: HỒ SƠ DOANH NGHIỆP & LOGO THƯƠNG HIỆU ───────── */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'company' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form: Edit Profile & Logo */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MatIcon name="edit_square" size={18} className="text-blue-600" />
                Cấu Hình Nhận Diện Doanh Nghiệp & Hình Ảnh
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Owner có thể trực tiếp cập nhật thông tin doanh nghiệp, tải Logo và Ảnh bìa (Cover Banner). Thông tin này sẽ hiển thị trực quan cho ứng viên khi xem tin tuyển dụng.
              </p>
            </div>

            {/* Media Uploaders: Logo & Cover Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Logo Uploader */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MatIcon name="badge" size={16} className="text-blue-600" />
                    <span>Logo Doanh Nghiệp</span>
                  </span>
                  {companyForm.logo_url && (
                    <button
                      type="button"
                      onClick={() => setCompanyForm((p) => ({ ...p, logo_url: '' }))}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {companyForm.logo_url ? (
                      <img
                        src={companyForm.logo_url}
                        alt="Logo Preview"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <CompanyLogo orgName={companyForm.name} size={48} />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full py-1.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <MatIcon name="upload" size={14} />
                      <span>Tải file Logo</span>
                    </button>
                    <p className="text-[10px] text-slate-400">PNG, SVG, JPG</p>
                  </div>
                </div>

                <input
                  type="url"
                  value={companyForm.logo_url}
                  onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                  placeholder="Hoặc dán URL logo (https://...)"
                  className="w-full text-[11px] p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Cover Banner Uploader */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MatIcon name="panorama" size={16} className="text-blue-600" />
                    <span>Ảnh Bìa / Banner</span>
                  </span>
                  {companyForm.banner_url && (
                    <button
                      type="button"
                      onClick={() => setCompanyForm((p) => ({ ...p, banner_url: '' }))}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                <div className="h-32 sm:h-36 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center relative shadow-2xs group">
                  {companyForm.banner_url ? (
                    <>
                      <img
                        src={companyForm.banner_url}
                        alt="Banner Preview"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => bannerInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-900 text-xs font-bold shadow-md hover:bg-white flex items-center gap-1 cursor-pointer"
                        >
                          <MatIcon name="edit" size={14} />
                          <span>Đổi ảnh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompanyForm((p) => ({ ...p, banner_url: '' }))}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 flex items-center gap-1 cursor-pointer"
                        >
                          <MatIcon name="delete" size={14} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <MatIcon name="add_photo_alternate" size={26} className="text-slate-400 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                        Chưa có ảnh bìa thương hiệu
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Tỉ lệ khuyến nghị 16:5 hoặc 3:1 (1200x380px)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBannerUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <MatIcon name="upload" size={14} />
                    <span>Tải ảnh bìa</span>
                  </button>
                </div>

                <input
                  type="url"
                  value={companyForm.banner_url}
                  onChange={(e) => setCompanyForm({ ...companyForm, banner_url: e.target.value })}
                  placeholder="Hoặc dán URL banner (https://...)"
                  className="w-full text-[11px] p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <form onSubmit={handleSaveCompanyProfile} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tên Doanh Nghiệp *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="ví dụ: Axiom Enterprise Corp"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Khẩu Hiệu / Tagline
                  </label>
                  <input
                    type="text"
                    value={companyForm.tagline}
                    onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                    placeholder="Khẩu hiệu định vị thương hiệu..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mã Số Thuế (MST)
                  </label>
                  <input
                    type="text"
                    value={companyForm.tax_id}
                    onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                    placeholder="0108923489"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Ngành Nghề Hoạt Động
                  </label>
                  <input
                    type="text"
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                    placeholder="Công nghệ & Phần mềm"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Quy Mô Nhân Sự
                  </label>
                  <input
                    type="text"
                    value={companyForm.size}
                    onChange={(e) => setCompanyForm({ ...companyForm, size: e.target.value })}
                    placeholder="500 - 1.000 nhân viên"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Trang Web Chính Thức
                  </label>
                  <input
                    type="text"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    placeholder="https://axiom.enterprise"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Địa Chỉ Trụ Sở Chính
                  </label>
                  <input
                    type="text"
                    value={companyForm.headquarters}
                    onChange={(e) => setCompanyForm({ ...companyForm, headquarters: e.target.value })}
                    placeholder="Keangnam Landmark 72, Hà Nội"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Giới Thiệu Doanh Nghiệp (Bio & Văn Hóa Doanh Nghiệp)
                </label>
                <textarea
                  rows={3}
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                  placeholder="Mô tả tóm tắt văn hóa, mục tiêu phát triển và đãi ngộ nhân sự..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingCompany}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <MatIcon name="save" size={16} />
                  <span>{isSavingCompany ? 'Đang lưu...' : 'Lưu Hồ Sơ Doanh Nghiệp'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Live Preview: Brand Card with Banner & Logo */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MatIcon name="visibility" size={16} className="text-emerald-500" />
                  Xem Trước Giao Diện Ứng Viên Sẽ Thấy
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Live Preview
                </span>
              </div>

              {/* Rich Branded Card Preview */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                {/* Cover Banner Header (Proportional & Anti-Distortion) */}
                <div className="h-44 sm:h-48 w-full relative bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                  {companyForm.banner_url ? (
                    <img
                      src={companyForm.banner_url}
                      alt="Company Banner"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent pointer-events-none" />
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                    <MatIcon name="verified" size={13} className="text-emerald-400" />
                    Doanh Nghiệp Đã Xác Minh
                  </span>
                </div>

                {/* Elevated Floating Logo (Never Covered by Banner) */}
                <div className="relative z-20 -mt-10 sm:-mt-11 px-5 flex items-end justify-between gap-3">
                  <div className="w-20 h-20 rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-xl ring-2 ring-black/5 dark:ring-white/10 shrink-0 flex items-center justify-center">
                    <div className="w-full h-full rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden p-1">
                      {companyForm.logo_url ? (
                        <img
                          src={companyForm.logo_url}
                          alt={companyForm.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <CompanyLogo orgName={companyForm.name} size={60} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Container */}
                <div className="p-5 pt-3 relative space-y-3.5">

                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {companyForm.name || 'Tên Công Ty'}
                    </h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5 italic">
                      &ldquo;{companyForm.tagline}&rdquo;
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <MatIcon name="category" size={14} className="text-slate-400" />
                      <span className="truncate">{companyForm.industry || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <MatIcon name="group" size={14} className="text-slate-400" />
                      <span className="truncate">{companyForm.size || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <MatIcon name="location_on" size={14} className="text-slate-400" />
                      <span className="truncate">{companyForm.headquarters || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <MatIcon name="language" size={14} className="text-slate-400" />
                      <span className="truncate">{companyForm.website || 'Chưa cập nhật'}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 line-clamp-3">
                    {companyForm.description || 'Chưa có thông tin giới thiệu công ty.'}
                  </p>
                </div>
              </div>

              {/* Status Notice */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <span className="font-bold block flex items-center gap-1">
                  <MatIcon name="sync" size={14} />
                  Lưu trữ trực tiếp & Đồng bộ máy chủ
                </span>
                <p className="text-[11px] text-blue-700/90 dark:text-blue-300/80">
                  Ảnh logo và banner được lưu trực tiếp vào cơ sở dữ liệu hệ thống, ứng viên nộp hồ sơ sẽ xem được toàn bộ thông tin này trên cổng tìm việc.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── SUB-TAB 2: QUẢN LÝ TIN TUYỂN DỤNG (OPENINGS) ───────────── */}
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
              <span className="text-xs font-semibold text-emerald-600 block">Đang Tuyển (Active)</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {openings.filter((o) => o.status === 'ACTIVE').length}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-amber-600 block">Tạm Dừng (Paused)</span>
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
                  Quản lý các vị trí tuyển dụng, xem chi tiết đãi ngộ hoặc chuyển vào thùng rác để xóa.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Drag and Drop Trash Can */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverTrash(true);
                  }}
                  onDragLeave={() => setIsDragOverTrash(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverTrash(false);
                    const opId = e.dataTransfer.getData('text/plain') || draggedOpeningId;
                    if (opId) {
                      handleDeleteOpening(opId);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-2 border-dashed cursor-pointer select-none ${
                    isDragOverTrash
                      ? 'border-rose-500 bg-rose-500/20 text-rose-600 scale-105 shadow-md animate-pulse ring-2 ring-rose-500/30'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-rose-400 hover:text-rose-500'
                  }`}
                  title="Thùng rác xóa vị trí tuyển dụng"
                >
                  <MatIcon
                    name={isDragOverTrash ? 'delete_forever' : 'delete'}
                    size={18}
                    className={isDragOverTrash ? 'text-rose-600 animate-bounce' : 'text-slate-400'}
                  />
                  <span>Thùng Rác</span>
                </div>

                {/* Add Opening Button */}
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
                    Hãy tạo vị trí tuyển dụng đầu tiên với bài test đánh giá và tự động hóa lịch phỏng vấn.
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
                  const dept = availableDepartments.find((d) => d.id === op.department_id);
                  const isDragging = draggedOpeningId === op.id;

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
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', op.id);
                        setDraggedOpeningId(op.id);
                      }}
                      onDragEnd={() => setDraggedOpeningId(null)}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 cursor-grab active:cursor-grabbing bg-white dark:bg-slate-900 shadow-xs hover:shadow-md ${
                        isDragging
                          ? 'opacity-30 border-dashed border-blue-400 scale-95'
                          : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Card Top: Drag Handle + Dept with Icon + Status Selector */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-grab"
                              title="Kéo vào thùng rác để xóa"
                            >
                              <MatIcon name="drag_indicator" size={18} />
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 flex items-center gap-1 truncate max-w-[150px]">
                              <MatIcon
                                name={getDepartmentIcon(dept || { name: op.title })}
                                size={13}
                                className="text-blue-600 dark:text-blue-400 shrink-0"
                              />
                              <span className="truncate">{dept?.name || 'Bộ Phận Chung'}</span>
                            </span>
                          </div>

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

                        {/* Description & Requirements with More/Less Toggle */}
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

                        {op.requirements && (
                          <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className={expandedOpeningIds[`req_${op.id}`] ? '' : 'line-clamp-2'}>
                              <strong className="text-slate-700 dark:text-slate-300">Yêu cầu:</strong>{' '}
                              {op.requirements}
                            </div>
                            {op.requirements.length > 80 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedOpeningIds((prev) => ({
                                    ...prev,
                                    [`req_${op.id}`]: !prev[`req_${op.id}`],
                                  }));
                                }}
                                className="text-[10.5px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-1 cursor-pointer inline-flex items-center gap-0.5"
                              >
                                <span>{expandedOpeningIds[`req_${op.id}`] ? 'Thu gọn' : '... Xem thêm'}</span>
                                <MatIcon name={expandedOpeningIds[`req_${op.id}`] ? 'expand_less' : 'expand_more'} size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Bottom: Applicants count & Action buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <MatIcon name="group" size={14} />
                          <span>{opApps.length} hồ sơ ứng tuyển</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingOpeningDetail(op)}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors flex items-center gap-1"
                            title="Xem chi tiết đầy đủ tin tuyển dụng, phúc lợi & công ty"
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
                            className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer transition-colors"
                          >
                            Xem Hồ Sơ
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteOpening(op.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Xóa vị trí tuyển dụng này"
                          >
                            <MatIcon name="delete" size={16} />
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
      {/* ── SUB-TAB 3: KHO CV & HỒ SƠ ỨNG VIÊN (RESUMES SHOWCASE) ───── */}
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
                  placeholder="Tìm kiếm ứng viên theo tên, email, sđt, vị trí..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Vị trí:</span>
              <AxiomSelect
                value={selectedOpeningFilter}
                onChange={(val) => setSelectedOpeningFilter(val)}
                options={[
                  { value: 'ALL', label: 'Tất cả vị trí' },
                  ...openings.map((op) => ({
                    value: op.id,
                    label: op.title,
                    triggerLabel: op.title,
                  })),
                ]}
                width="180px"
                triggerClassName="w-[180px] shrink-0"
              />

              <span className="text-xs font-semibold text-slate-500 ml-2">Giai đoạn:</span>
              <AxiomSelect
                value={selectedStageFilter}
                onChange={(val) => setSelectedStageFilter(val)}
                options={[
                  { value: 'ALL', label: 'Tất cả giai đoạn' },
                  ...Object.entries(STAGE_LABELS).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                    triggerLabel: v.label,
                  })),
                ]}
                width="180px"
                triggerClassName="w-[180px] shrink-0"
              />
            </div>
          </div>

          {/* Candidate Resumes Visual Cards Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MatIcon name="inventory_2" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Kho Lưu Trữ Hồ Sơ & Đánh Giá Ứng Viên (Candidate Talent Vault)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      Kho Độc Lập
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lưu trữ tập trung và độc lập: Hồ sơ CV, Kết quả kiểm tra đầu vào (Trắc nghiệm + AI chấm tự luận) và Bảng điểm phỏng vấn AI.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tổng cộng: <strong className="text-slate-900 dark:text-white">{searchedApps.length}</strong> ứng viên
              </span>
            </div>

            {searchedApps.length === 0 ? (
              <div className="py-14 text-center text-slate-400 space-y-2">
                <MatIcon name="folder_open" size={40} className="mx-auto text-slate-300" />
                <p className="text-xs">Không tìm thấy hồ sơ CV nào phù hợp với bộ lọc hiện tại.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {searchedApps.map((app) => {
                  const stageMeta = STAGE_LABELS[app.stage];
                  const rawCandName = app.candidate?.full_name || (app as any).candidate_name || 'Ứng viên';
                  const candName = rawCandName.replace(/\s*\(Chưa gia nhập\)/gi, '').trim() || 'Ứng viên';
                  const opTitle = app.opening?.title || (app as any).opening_title || 'Vị trí tuyển dụng';
                  const candEmail = app.candidate?.email || (app as any).candidate_email || 'Chưa có email';
                  const candPhone = app.candidate?.phone || (app as any).candidate_phone || 'Chưa có SĐT';
                  const candCvUrl = app.candidate?.cv_url || (app as any).candidate_cv_url || '';
                  const candNotes = app.candidate?.notes || (app as any).candidate_notes || '';
                  const hasCanvaCv = candCvUrl && candCvUrl.startsWith('resume://');

                  // Extract latest assessment attempt info
                  const latestAttempt = app.assessment_attempts?.[app.assessment_attempts.length - 1];
                  const hasTestSubmitted = Boolean(latestAttempt && latestAttempt.status === 'SUBMITTED');
                  let hasAiEssayEval = false;
                  try {
                    if (latestAttempt?.answers_json) {
                      const aJson = JSON.parse(latestAttempt.answers_json);
                      hasAiEssayEval = Boolean(aJson._ai_essay_evaluations && Object.keys(aJson._ai_essay_evaluations).length > 0);
                    }
                  } catch {
                    // Ignore JSON parse errors
                  }

                  const completedInterview = app.interview_sessions?.find((s) => s.status === 'COMPLETED');
                  const latestInterview = app.interview_sessions?.[app.interview_sessions.length - 1];
                  const latestAi = app.ai_evaluations?.[app.ai_evaluations.length - 1];

                  // Passing score & test status determination
                  const passingScore = 70;
                  const isNoTestRequired = !latestAttempt && (app.opening?.requires_assessment === false || !app.opening);
                  const isTestPassed = hasTestSubmitted && (latestAttempt?.score ?? 0) >= passingScore;
                  const isTestFailed = hasTestSubmitted && (latestAttempt?.score ?? 0) < passingScore;

                  // Resolve designated interviewer host name and role (Owner or Manager)
                  let interviewerName = 'Chưa chỉ định';
                  if (latestInterview?.interviewer_member_ids_json) {
                    try {
                      const ids = JSON.parse(latestInterview.interviewer_member_ids_json);
                      if (Array.isArray(ids) && ids.length > 0) {
                        const host = managers.find((m) => m.id === ids[0]);
                        if (host) interviewerName = `${host.full_name} (${host.role})`;
                      }
                    } catch {}
                  }

                  return (
                    <div
                      key={app.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between gap-4 group"
                    >
                      {/* Top: Candidate Identity Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2.5 mb-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {candName.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <h4
                                className="text-sm font-bold text-slate-900 dark:text-white truncate"
                                title={candName}
                              >
                                {candName}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 max-w-[210px] truncate" title={opTitle}>
                                  <MatIcon
                                    name={getDepartmentIcon(app.opening?.department || { name: opTitle })}
                                    size={12}
                                    className="shrink-0 text-blue-600 dark:text-blue-400"
                                  />
                                  <span className="truncate">{opTitle}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${stageMeta?.badge}`}
                          >
                            {stageMeta?.label || app.stage}
                          </span>
                        </div>

                        {/* Contact details */}
                        <div className="grid grid-cols-2 gap-2 py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] mb-3">
                          <div className="flex items-center gap-1.5 min-w-0 text-slate-600 dark:text-slate-300" title={candEmail}>
                            <MatIcon name="mail" size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{candEmail}</span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0 text-slate-600 dark:text-slate-300" title={candPhone}>
                            <MatIcon name="call" size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{candPhone}</span>
                          </div>
                        </div>

                        {/* 4-Pillar Information Matrix */}
                        <div className="space-y-2.5">
                          {/* Pillar 1: Bài Test Đầu Vào (Đạt / Fail / Không có) */}
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <MatIcon name="assignment" size={13} className="text-purple-600" />
                                1. Bài Test Đầu Vào
                              </span>
                              {isNoTestRequired ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10px]">
                                  <MatIcon name="remove_done" size={11} />
                                  Không yêu cầu
                                </span>
                              ) : isTestPassed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-[10px]">
                                  <MatIcon name="verified" size={12} className="text-emerald-600" />
                                  ĐẠT ({latestAttempt?.score ?? 0}%)
                                </span>
                              ) : isTestFailed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700 font-bold text-[10px]">
                                  <MatIcon name="cancel" size={12} className="text-rose-600" />
                                  CHƯA ĐẠT ({latestAttempt?.score ?? 0}%)
                                </span>
                              ) : latestAttempt?.status === 'IN_PROGRESS' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-[10px]">
                                  <MatIcon name="pending" size={12} />
                                  Đang làm bài
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[10px]">
                                  <MatIcon name="schedule" size={12} />
                                  Chờ làm test
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                              <span>{isNoTestRequired ? 'Vị trí không yêu cầu bài kiểm tra' : `Điểm sàn chuẩn: ≥${passingScore}%`}</span>
                              {hasAiEssayEval && (
                                <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-0.5" title="AI Ollama chấm tự luận">
                                  <MatIcon name="psychology" size={12} /> AI chấm tự luận
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Pillar 2: Bản Xem Nhanh Đầu CV & Hồ Sơ (Mini CV Header Card) */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <MatIcon name="description" size={13} className="text-blue-600" />
                                2. Hồ Sơ CV Ứng Viên
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {hasCanvaCv ? 'Axiom Studio CV' : candCvUrl ? 'CV Ngoài' : 'Chưa có CV'}
                              </span>
                            </div>

                            {/* Mini CV Paper Header Preview */}
                            <div
                              onClick={() => setSelectedApp(app)}
                              className="group/cv p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer space-y-2 relative overflow-hidden"
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
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-semibold shrink-0">
                                      Ứng viên
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
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 truncate max-w-[140px]" title={candEmail}>
                                    <MatIcon name="mail" size={11} className="shrink-0 text-slate-400" />
                                    <span className="truncate">{candEmail}</span>
                                  </span>
                                )}
                                {candPhone && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 truncate" title={candPhone}>
                                    <MatIcon name="call" size={11} className="shrink-0 text-slate-400" />
                                    <span>{candPhone}</span>
                                  </span>
                                )}
                              </div>

                              {/* CV Cover Note / Introduction Excerpt if available */}
                              {candNotes ? (
                                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[10.5px] text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800 line-clamp-2">
                                  &ldquo;{candNotes}&rdquo;
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <MatIcon name="check_circle" size={11} className="text-emerald-500" />
                                  <span>Hồ sơ đã được lưu trữ sẵn sàng thẩm định</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pillar 3: Buổi Phỏng Vấn (LiveKit WebRTC Interview) */}
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <MatIcon name="video_camera_front" size={13} className="text-amber-600" />
                                3. Buổi Phỏng Vấn
                              </span>
                              {completedInterview ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-[10px]">
                                  <MatIcon name="check_circle" size={12} className="text-emerald-600" />
                                  Đã xong
                                </span>
                              ) : latestInterview?.status === 'SCHEDULED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold text-[10px]">
                                  <MatIcon name="event" size={12} className="text-amber-600" />
                                  Đã xếp lịch
                                </span>
                              ) : latestInterview?.status === 'IN_PROGRESS' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 font-bold text-[10px] animate-pulse">
                                  <MatIcon name="videocam" size={12} />
                                  Đang họp
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Chờ xếp lịch</span>
                              )}
                            </div>
                            {latestInterview ? (
                              <div className="space-y-1 text-[10px] text-slate-600 dark:text-slate-300">
                                <div className="flex items-center justify-between">
                                  <span>Host phỏng vấn:</span>
                                  <strong className="text-slate-800 dark:text-slate-200">{interviewerName}</strong>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Thời gian:</span>
                                  <span className="text-slate-500">{new Date(latestInterview.scheduled_at).toLocaleString('vi-VN')}</span>
                                </div>
                                {latestInterview.meeting_id && (
                                  <a
                                    href={`/meetings/${latestInterview.meeting_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 py-1 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors"
                                  >
                                    <MatIcon name="meeting_room" size={12} />
                                    <span>Vào Phòng Họp Phỏng Vấn (LiveKit)</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">Tự động tạo phòng họp khi ứng viên vượt qua bài test.</p>
                            )}
                          </div>

                          {/* Pillar 4: Đánh Giá Tuyển Dụng & Quyết Định Duyệt (HR, AI & Owner Gate) */}
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <MatIcon name="verified_user" size={13} className="text-indigo-600" />
                              4. Đánh Giá & Quyết Định Tuyển Dụng
                            </span>

                            {/* AI & HR reviews */}
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                                <span className="text-slate-400 block text-[9px]">Đánh giá AI Ollama:</span>
                                {latestAi ? (
                                  <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-0.5 truncate" title={latestAi.recommendation || ''}>
                                    <MatIcon name="psychology" size={12} />
                                    <span className="truncate">{latestAi.recommendation || 'Đã phân tích'}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa đánh giá</span>
                                )}
                              </div>

                              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                                <span className="text-slate-400 block text-[9px]">Đánh giá HR:</span>
                                {app.hr_review ? (
                                  <span className={`font-bold flex items-center gap-0.5 truncate ${
                                    app.hr_review.decision === 'HIRE'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : app.hr_review.decision === 'NO_HIRE'
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                  }`}>
                                    <MatIcon name="rate_review" size={12} />
                                    <span>{app.hr_review.decision === 'HIRE' ? 'Đề xuất tuyển' : app.hr_review.decision === 'NO_HIRE' ? 'Không tuyển' : 'Cần thêm thông tin'}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa có review</span>
                                )}
                              </div>
                            </div>

                            {/* Decision Gate Pill */}
                            {app.stage === 'APPROVED' || app.stage === 'HIRED' ? (
                              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center gap-1">
                                <MatIcon name="verified" size={13} className="text-emerald-600" />
                                <span>ĐÃ DUYỆT TUYỂN DỤNG</span>
                              </div>
                            ) : app.stage === 'REJECTED' ? (
                              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[10px] flex items-center justify-center gap-1">
                                <MatIcon name="cancel" size={13} className="text-rose-600" />
                                <span>TỪ CHỐI / KHÔNG ĐƯỢC DUYỆT</span>
                              </div>
                            ) : app.stage === 'OWNER_APPROVAL_PENDING' ? (
                              <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 font-bold text-[10px] flex items-center justify-center gap-1 animate-pulse">
                                <MatIcon name="hourglass_top" size={13} className="text-orange-600" />
                                <span>CHỜ OWNER PHÊ DUYỆT</span>
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] text-center">
                                Tiến trình: {stageMeta?.label || app.stage}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedApp(app)}
                            className="py-2 px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-[11px] hover:bg-indigo-100 cursor-pointer flex items-center justify-center gap-1.5 transition-colors truncate"
                            title="Xem hồ sơ và CV trên 2 màn hình"
                          >
                            <MatIcon name="visibility" size={14} />
                            <span>Xem CV (2 Màn Hình)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedApp(app)}
                            className="py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer flex items-center justify-center gap-1.5 transition-colors truncate shadow-xs"
                            title="Xem hồ sơ chi tiết và thẩm định"
                          >
                            <MatIcon name="folder_shared" size={14} />
                            <span>Xem Chi Tiết</span>
                          </button>
                        </div>

                        {completedInterview && (
                          <button
                            type="button"
                            onClick={() => setScorecardInterviewId(completedInterview.id)}
                            className="w-full py-1.5 px-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[11px] hover:bg-purple-100 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <MatIcon name="psychology" size={14} />
                            <span>Bảng Điểm Phỏng Vấn AI Scorecard</span>
                          </button>
                        )}
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
      {/* ── SUB-TAB 4: QUY TRÌNH PIPELINE 6 GIAI ĐOẠN ──────────────── */}
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
                            onClick={() => setSelectedApp(app)}
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
                                  Chờ duyệt
                                </span>
                              )}
                              {app.stage === 'APPROVED' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0">
                                  Đã duyệt
                                </span>
                              )}
                              {app.stage === 'HIRED' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white shrink-0">
                                  Đã tuyển
                                </span>
                              )}
                              {app.stage === 'REJECTED' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 shrink-0">
                                  Không đạt
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
      {/* ── SUB-TAB 5: PHÂN QUYỀN HR & CHÍNH SÁCH TUYỂN DỤNG ───────── */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'policies' && (
        <div className="space-y-6">
          {/* HR Review Delegation Panel */}
          {(() => {
            const delegableMembers = (availableMembers.length > 0 ? availableMembers : managers).filter(
              (m) => m.role?.toUpperCase() !== 'OWNER'
            );

            const sortedDelegable = [...delegableMembers].sort((a, b) => {
              const roleWeight = (r: string) => (r === 'MANAGER' ? 1 : r === 'ADMIN' ? 2 : 3);
              const wDiff = roleWeight(a.role) - roleWeight(b.role);
              if (wDiff !== 0) return wDiff;
              return (a.full_name || '').localeCompare(b.full_name || '', 'vi');
            });

            const filteredMembers = sortedDelegable.filter((m) => {
              if (managerRoleFilter !== 'ALL' && m.role?.toUpperCase() !== managerRoleFilter) {
                return false;
              }
              if (managerSearchQuery.trim()) {
                const q = managerSearchQuery.toLowerCase();
                const matchName = m.full_name?.toLowerCase().includes(q);
                const matchEmail = m.email?.toLowerCase().includes(q);
                const matchDept = m.department_name?.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchDept) return false;
              }
              return true;
            });

            const totalGranted = sortedDelegable.filter((m) => hrGrantStates[m.id]).length;
            const totalManagers = sortedDelegable.filter((m) => m.role === 'MANAGER').length;
            const totalAdmins = sortedDelegable.filter((m) => m.role === 'ADMIN').length;
            const totalStaff = sortedDelegable.filter((m) => m.role === 'MEMBER').length;

            const selectedMember = sortedDelegable.find((m) => m.id === quickSelectMemberId);
            const isSelectedGranted = quickSelectMemberId ? (hrGrantStates[quickSelectMemberId] ?? false) : false;

            return (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MatIcon name="admin_panel_settings" size={20} className="text-blue-600" />
                      Phân Quyền HR Review Cho Các Trưởng Phòng & Quản Lý
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Cấp quyền trực tiếp <code>recruitment.review</code> cho các Quản lý hoặc nhân sự chuyên môn để tham gia sàng lọc hồ sơ, chấm điểm phỏng vấn và gửi đề xuất tuyển dụng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchMembers()}
                    disabled={loadingMembers}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shrink-0 transition-colors"
                    title="Tải lại danh sách nhân sự từ máy chủ"
                  >
                    <MatIcon name="refresh" size={15} className={loadingMembers ? 'animate-spin text-blue-600' : ''} />
                    <span>{loadingMembers ? 'Đang đồng bộ...' : 'Đồng bộ nhân sự'}</span>
                  </button>
                </div>

                {hrGrantError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <MatIcon name="error" size={16} />
                    <span>{hrGrantError}</span>
                  </div>
                )}

                {/* QUICK SELECT & DELEGATE TOOL (Chọn Quản lý để phân quyền) */}
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        <MatIcon name="touch_app" size={14} />
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Chọn nhanh Quản lý để phân quyền HR
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                      Chọn nhân sự từ menu dropdown bên dưới để cấp hoặc thu hồi quyền
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <AxiomSelect
                        value={quickSelectMemberId}
                        onChange={(val) => setQuickSelectMemberId(val)}
                        options={[
                          {
                            value: '',
                            label: '-- Chọn Quản lý để phân quyền --',
                            triggerLabel: '-- Chọn Quản lý để phân quyền --',
                            description: 'Danh sách quản lý và nhân sự công ty',
                          },
                          ...sortedDelegable.map((m) => {
                            const isG = hrGrantStates[m.id] ?? false;
                            return {
                              value: m.id,
                              label: `${m.full_name} (${m.role})`,
                              triggerLabel: m.full_name,
                              description: `${m.role} • ${m.department_name || 'Chưa gắn phòng ban'} • ${m.email}`,
                              badge: isG ? 'Đã cấp' : undefined,
                              badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                            };
                          }),
                        ]}
                        placeholder="-- Chọn Quản lý để phân quyền --"
                        className="w-full"
                        triggerClassName="w-full sm:w-[360px] truncate"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!quickSelectMemberId}
                      onClick={async () => {
                        if (!quickSelectMemberId) return;
                        await handleToggleHRGrant(quickSelectMemberId, isSelectedGranted);
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-xs ${
                        !quickSelectMemberId
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                          : isSelectedGranted
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <MatIcon
                        name={
                          !quickSelectMemberId
                            ? 'touch_app'
                            : isSelectedGranted
                            ? 'person_remove'
                            : 'verified_user'
                        }
                        size={16}
                      />
                      <span>
                        {!quickSelectMemberId
                          ? 'Chọn Quản lý để phân quyền'
                          : isSelectedGranted
                          ? 'Thu hồi quyền HR'
                          : 'Cấp quyền HR Review'}
                      </span>
                    </button>

                    {selectedMember && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <MatIcon name={getDepartmentIcon({ name: selectedMember.department_name || undefined })} size={14} className="text-blue-500 shrink-0" />
                        <span className="truncate">{selectedMember.department_name || 'Toàn công ty'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SEARCH, FILTER & STATS BAR */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                  {/* Search input */}
                  <div className="relative flex-1 max-w-md">
                    <MatIcon
                      name="search"
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={managerSearchQuery}
                      onChange={(e) => setManagerSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên quản lý, email, phòng ban..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {managerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setManagerSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <MatIcon name="close" size={14} />
                      </button>
                    )}
                  </div>

                  {/* Role Tabs & Counter Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setManagerRoleFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          managerRoleFilter === 'ALL'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Tất cả ({sortedDelegable.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setManagerRoleFilter('MANAGER')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          managerRoleFilter === 'MANAGER'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Quản lý ({totalManagers})
                      </button>
                      <button
                        type="button"
                        onClick={() => setManagerRoleFilter('ADMIN')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          managerRoleFilter === 'ADMIN'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Quản trị ({totalAdmins})
                      </button>
                      <button
                        type="button"
                        onClick={() => setManagerRoleFilter('MEMBER')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          managerRoleFilter === 'MEMBER'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Thành viên ({totalStaff})
                      </button>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <MatIcon name="verified" size={13} />
                      {totalGranted} đã phân quyền
                    </span>
                  </div>
                </div>

                {/* DIRECTORY CARDS GRID */}
                <div className="space-y-3">
                  {filteredMembers.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                      <MatIcon name="group_off" size={28} className="text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {managerSearchQuery.trim()
                          ? `Không tìm thấy nhân sự phù hợp với từ khóa "${managerSearchQuery}".`
                          : 'Chưa có nhân sự nào trong danh sách vai trò này.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setManagerSearchQuery('');
                          setManagerRoleFilter('ALL');
                          fetchMembers();
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        Xem toàn bộ nhân sự
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredMembers.map((m) => {
                        const isGranted = hrGrantStates[m.id] ?? false;
                        const deptIcon = getDepartmentIcon({ name: m.department_name || undefined });

                        return (
                          <div
                            key={m.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                              isGranted
                                ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-emerald-500/5'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div className="relative shrink-0">
                                {m.avatar_url ? (
                                  <img
                                    src={m.avatar_url}
                                    alt={m.full_name}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                                  />
                                ) : (
                                  <div
                                    className={`w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center text-white shadow-xs ${
                                      isGranted ? 'bg-emerald-600' : 'bg-blue-600'
                                    }`}
                                  >
                                    {m.full_name?.charAt(0) || 'M'}
                                  </div>
                                )}
                                {isGranted && (
                                  <span
                                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-[9px]"
                                    title="Đã phân quyền HR Review"
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={m.full_name}>
                                    {m.full_name}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      m.role === 'MANAGER'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                        : m.role === 'ADMIN'
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {m.role}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 mt-1 truncate" title={m.department_name || 'Chưa gắn phòng ban'}>
                                  <MatIcon name={deptIcon} size={14} className="text-blue-500 shrink-0" />
                                  <span className="truncate">{m.department_name || 'Chưa gắn phòng ban'}</span>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate" title={m.email}>
                                  <MatIcon name="mail" size={13} className="shrink-0 text-slate-400" />
                                  <span className="truncate">{m.email}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action & Status Row */}
                            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                              {isGranted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                  <MatIcon name="verified" size={12} className="text-emerald-600" />
                                  Đã phân quyền HR Review
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                  <MatIcon name="shield" size={12} />
                                  Chưa phân quyền
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleHRGrant(m.id, isGranted)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-colors shrink-0 flex items-center justify-center gap-1.5 ${
                                  isGranted
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                }`}
                              >
                                <MatIcon name={isGranted ? 'person_remove' : 'verified_user'} size={14} />
                                <span>{isGranted ? 'Thu hồi quyền HR' : 'Cấp quyền HR'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Retention & Privacy Policy */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MatIcon name="privacy_tip" size={18} className="text-emerald-600" />
                Chính Sách Thời Hạn Lưu Trữ Dữ Liệu Ứng Viên (PII Retention)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Hồ sơ ứng viên ở trạng thái kết thúc (Từ chối, Rút, Tuyển dụng) sẽ được xóa thông tin định danh (PII) và minh chứng nhạy cảm sau số ngày quy định nhằm tuân thủ tiêu chuẩn bảo mật dữ liệu cá nhân.
              </p>
            </div>

            <div className="max-w-md space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Thời hạn lưu trữ dữ liệu (ngày, từ 30 đến 730 ngày)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={30}
                    max={730}
                    value={retentionDaysInput}
                    onChange={(e) => setRetentionDaysInput(parseInt(e.target.value) || 180)}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSavePolicy}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs shrink-0"
                  >
                    Lưu Chính Sách
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                Thời hạn hiện tại: <strong>{policy?.retention_days || 180} ngày</strong>. Tự động thanh lọc định kỳ lúc 00:00 UTC.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Create Job Opening ── */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Tạo Vị Trí Tuyển Dụng Mới
            </h3>
            <form onSubmit={handleCreateOpening} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu đề vị trí *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ví dụ: Senior Fullstack Engineer"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Phòng ban
                </label>
                <AxiomSelect
                  value={newDeptId}
                  onChange={(val) => setNewDeptId(val)}
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                    triggerLabel: d.name,
                  }))}
                  width="180px"
                  triggerClassName="w-[180px] shrink-0"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Yêu cầu công việc
                </label>
                <textarea
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  placeholder="Kỹ năng, kinh nghiệm cần thiết..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresTest"
                  checked={newRequiresTest}
                  onChange={(e) => setNewRequiresTest(e.target.checked)}
                  className="rounded"
                />
                <label
                  htmlFor="requiresTest"
                  className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Yêu cầu làm bài test đánh giá trước khi phỏng vấn
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Tạo Vị Trí
                </button>
              </div>
            </form>
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
            onNotify?.('Đã chuyển biên bản phỏng vấn vào Kho Lưu Trữ Tài Liệu thành công!');
            setScorecardInterviewId(null);
            fetchData();
          }}
        />
      )}

      {/* Candidate Canva Studio Resume Modal */}
      {viewingResume && (
        <CandidateResumeViewerModal
          isOpen={true}
          onClose={() => setViewingResume(null)}
          resume={viewingResume}
          candidateName={selectedApp?.candidate?.full_name || (selectedApp as any)?.candidate_name}
          jobTitle={selectedApp?.opening?.title || (selectedApp as any)?.opening_title}
        />
      )}

      {/* Professional Job Setup Multi-Step Wizard Modal */}
      {isProfessionalModalOpen && (
        <CreateProfessionalJobModal
          isOpen={isProfessionalModalOpen}
          onClose={() => setIsProfessionalModalOpen(false)}
          organizationId={organizationId}
          departments={availableDepartments}
          managers={availableMembers.length > 0 ? availableMembers : managers}
          companyInfo={{
            name: companyForm.name,
            tagline: companyForm.tagline,
            logo_url: companyForm.logo_url,
          }}
          onSuccess={(newOp) => {
            setOpenings((prev) => [newOp, ...prev]);
            setIsProfessionalModalOpen(false);
            onNotify?.(`Đã thiết lập vị trí tuyển dụng chuyên nghiệp "${newOp.title}" thành công!`);
            fetchData();
          }}
          onNotify={onNotify}
        />
      )}

      {/* Comprehensive Job Opening Details Modal */}
      {viewingOpeningDetail && (
        <JobOpeningDetailModal
          isOpen={Boolean(viewingOpeningDetail)}
          onClose={() => setViewingOpeningDetail(null)}
          opening={viewingOpeningDetail}
          departmentName={availableDepartments.find((d) => d.id === viewingOpeningDetail.department_id)?.name}
          deptIconName={getDepartmentIcon(availableDepartments.find((d) => d.id === viewingOpeningDetail.department_id) || { name: viewingOpeningDetail.title })}
          companyInfo={{
            name: companyForm.name,
            tagline: companyForm.tagline,
            logo_url: companyForm.logo_url,
            banner_url: companyForm.banner_url,
            website: companyForm.website,
            size: companyForm.size,
            headquarters: companyForm.headquarters,
            industry: companyForm.industry,
            description: companyForm.description,
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
          departments={availableDepartments}
          managers={availableMembers.length > 0 ? availableMembers : managers}
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

      {/* 2-Screen Candidate Dossier & Live CV Dual Screen Inspection Modal */}
      {selectedApp && (
        <CandidateSplitDossierModal
          isOpen={Boolean(selectedApp)}
          onClose={() => setSelectedApp(null)}
          application={selectedApp}
          organizationId={organizationId}
          userRole="OWNER"
          canManage={true}
          availableMembers={availableMembers.length > 0 ? availableMembers : managers}
          onStageChange={async (appId, nextStage) => {
            if (nextStage === 'ASSESSMENT_PENDING') {
              await handleCVApproval('APPROVE');
            } else {
              setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, stage: nextStage } : a)));
              setSelectedApp((prev) => (prev ? { ...prev, stage: nextStage } : null));
            }
          }}
          onOwnerApprove={async () => {
            await handleOwnerApprove();
          }}
          onOwnerReject={async (appId, version, reason) => {
            await handleOwnerReject(reason);
          }}
          onReject={async (appId, version, reason) => {
            if (selectedApp?.stage === 'INVITED') {
              await handleCVApproval('REJECT', reason);
            } else {
              await handleGeneralReject(reason);
            }
          }}
          onAssignHR={handleAssignHR}
          onIssueOnboarding={async () => {
            await handleIssueOnboarding();
          }}
          onReviewAssessment={(attemptId) => setReviewAssessmentAttemptId(attemptId)}
          onReviewInterview={(sessionId) => setScorecardInterviewId(sessionId)}
          onNotify={onNotify}
          onRefresh={() => {
            if (selectedApp) refreshDetail(selectedApp.id);
            fetchData();
          }}
        />
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
              onNotify={onNotify}
            />
          </div>
        </div>
      )}
    </div>
  );
}
