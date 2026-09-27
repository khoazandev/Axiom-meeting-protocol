'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import {
  recruitmentApi,
  RecruitmentApplication,
  JobOpening,
  RecruitmentStage,
  RecruitmentPolicy,
  IssueOnboardingResponse,
} from '@/lib/recruitment-api';
import { OrgMemberDetail, Department } from '@/lib/api';

interface RecruitmentTabProps {
  organizationId: string;
  managers: OrgMemberDetail[];
  departments: Department[];
  onNotify?: (msg: string) => void;
}

const STAGE_COLUMNS: {
  id: string;
  title: string;
  stages: RecruitmentStage[];
  color: string;
  icon: string;
}[] = [
  {
    id: 'col-invited',
    title: 'Mời ứng tuyển',
    stages: ['INVITED'],
    color: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    icon: 'mail',
  },
  {
    id: 'col-test',
    title: 'Bài test',
    stages: ['ASSESSMENT_PENDING', 'ASSESSMENT_SUBMITTED'],
    color: 'border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-300',
    icon: 'assignment',
  },
  {
    id: 'col-interview',
    title: 'Phỏng vấn',
    stages: ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'],
    color: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    icon: 'video_camera_front',
  },
  {
    id: 'col-hr',
    title: 'HR review',
    stages: ['HR_REVIEW_PENDING'],
    color: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300',
    icon: 'rate_review',
  },
  {
    id: 'col-owner',
    title: 'Owner duyệt',
    stages: [
      'OWNER_APPROVAL_PENDING',
      'APPROVED',
      'ONBOARDING_INVITED',
      'HIRED',
      'REJECTED',
      'WITHDRAWN',
      'EXPIRED',
      'CANCELLED',
    ],
    color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    icon: 'verified_user',
  },
];

const STAGE_LABELS: Record<RecruitmentStage, { label: string; badge: string }> = {
  INVITED: { label: 'Đã mời', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  ASSESSMENT_PENDING: { label: 'Chờ làm test', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  ASSESSMENT_SUBMITTED: { label: 'Đã nộp test', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  INTERVIEW_SCHEDULED: { label: 'Đã lên lịch PV', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  INTERVIEW_COMPLETED: { label: 'Đã phỏng vấn', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  HR_REVIEW_PENDING: { label: 'Chờ HR duyệt', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  OWNER_APPROVAL_PENDING: { label: 'Chờ Owner duyệt', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  APPROVED: { label: 'Đã duyệt', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  ONBOARDING_INVITED: { label: 'Đã mời Onboarding', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  HIRED: { label: 'Đã tuyển', badge: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-800/60 dark:text-emerald-200' },
  REJECTED: { label: 'Từ chối', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
  WITHDRAWN: { label: 'Ứng viên rút', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  EXPIRED: { label: 'Hết hạn', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
};

export function RecruitmentTab({
  organizationId,
  managers,
  departments,
  onNotify,
}: RecruitmentTabProps) {
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [policy, setPolicy] = useState<RecruitmentPolicy | null>(null);

  // Filters with fixed-width anti-CLS
  const [selectedOpeningFilter, setSelectedOpeningFilter] = useState<string>('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');

  // Selected application for detail drawer
  const [selectedApp, setSelectedApp] = useState<RecruitmentApplication | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [ownerRejectReason, setOwnerRejectReason] = useState('');
  const [onboardingSuccess, setOnboardingSuccess] = useState<IssueOnboardingResponse | null>(null);

  // Modals
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || '');
  const [newRequirements, setNewRequirements] = useState('');
  const [newRequiresTest, setNewRequiresTest] = useState(false);

  const [isHRAccessModalOpen, setIsHRAccessModalOpen] = useState(false);
  const [hrGrantStates, setHrGrantStates] = useState<Record<string, boolean>>({});
  const [hrGrantError, setHrGrantError] = useState<string | null>(null);

  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [retentionDaysInput, setRetentionDaysInput] = useState<number>(180);

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    try {
      const [ops, apps, pol] = await Promise.all([
        recruitmentApi.listOpenings(organizationId),
        recruitmentApi.listApplications(organizationId),
        recruitmentApi.getPolicy(organizationId).catch(() => null),
      ]);
      setOpenings(ops);
      setApplications(apps);
      if (pol) {
        setPolicy(pol);
        setRetentionDaysInput(pol.retention_days);
      }
    } catch (err: unknown) {
      console.error('Failed to load recruitment data', err);
      onNotify?.('Lỗi tải dữ liệu tuyển dụng');
    }
  }, [organizationId, onNotify]);

  useEffect(() => {
    let ignore = false;
    if (!organizationId) return;
    Promise.all([
      recruitmentApi.listOpenings(organizationId),
      recruitmentApi.listApplications(organizationId),
      recruitmentApi.getPolicy(organizationId).catch(() => null),
    ])
      .then(([ops, apps, pol]) => {
        if (ignore) return;
        setOpenings(ops);
        setApplications(apps);
        if (pol) {
          setPolicy(pol);
          setRetentionDaysInput(pol.retention_days);
        }
      })
      .catch((err: unknown) => {
        if (ignore) return;
        console.error('Failed to load recruitment data', err);
        onNotify?.('Lỗi tải dữ liệu tuyển dụng');
      });

    return () => {
      ignore = true;
    };
  }, [organizationId, onNotify]);

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

  // Filter applications
  const filteredApps = applications.filter((app) => {
    if (selectedOpeningFilter !== 'ALL' && app.opening_id !== selectedOpeningFilter) return false;
    if (selectedStageFilter !== 'ALL' && app.stage !== selectedStageFilter) return false;
    return true;
  });

  // Handle Owner Approval
  const handleOwnerApprove = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await recruitmentApi.submitOwnerApproval(organizationId, selectedApp.id, {
        decision: 'APPROVE',
        expected_version: selectedApp.version,
      });
      onNotify?.('Đã phê duyệt tuyển dụng ứng viên!');
      await refreshDetail(selectedApp.id);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi phê duyệt tuyển dụng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOwnerReject = async () => {
    if (!selectedApp) return;
    if (!ownerRejectReason.trim()) {
      onNotify?.('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      await recruitmentApi.submitOwnerApproval(organizationId, selectedApp.id, {
        decision: 'REJECT',
        reason: ownerRejectReason.trim(),
        expected_version: selectedApp.version,
      });
      onNotify?.('Đã từ chối tuyển dụng ứng viên');
      setOwnerRejectReason('');
      await refreshDetail(selectedApp.id);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi từ chối tuyển dụng');
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
    setHrGrantError(null);
    try {
      const res = await recruitmentApi.toggleReviewGrant(organizationId, memberId, !currentVal);
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
      setIsPolicyModalOpen(false);
      onNotify?.('Đã lưu chính sách lưu trữ dữ liệu tuyển dụng');
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi cập nhật chính sách');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header & Action Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Quy Trình Tuyển Dụng & Onboarding
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              5 Giai đoạn
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản trị pipeline ứng viên từ phỏng vấn AI, HR Review đến Owner duyệt và kích hoạt nhân sự
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPolicyModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Chính sách bảo mật và lưu trữ"
          >
            <MatIcon name="privacy_tip" size={16} />
            <span>Lưu trữ: {policy?.retention_days || 180}d</span>
          </button>

          <button
            onClick={() => setIsHRAccessModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Quản lý phân quyền HR Review"
          >
            <MatIcon name="admin_panel_settings" size={16} />
            <span>Phân quyền HR</span>
          </button>

          <button
            onClick={() => setIsOpeningModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <MatIcon name="add" size={16} />
            <span>Tạo Vị Trí</span>
          </button>
        </div>
      </div>

      {/* ── Filters (Locked Trigger Widths to prevent CLS) ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Vị trí:</span>
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
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Giai đoạn:</span>
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

        <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          Tổng cộng: <strong className="text-slate-800 dark:text-slate-200">{filteredApps.length}</strong> ứng viên
        </div>
      </div>

      {/* ── 5-Column Pipeline Board ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-start">
        {STAGE_COLUMNS.map((col) => {
          const colApps = filteredApps.filter((a) => col.stages.includes(a.stage));
          return (
            <div
              key={col.id}
              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 min-h-[460px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <MatIcon name={col.icon} size={16} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {col.title}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${col.color}`}
                >
                  {colApps.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {colApps.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 text-xs">
                    <span>Trống</span>
                  </div>
                ) : (
                  colApps.map((app) => {
                    const isSelected = selectedApp?.id === app.id;
                    const stageMeta = STAGE_LABELS[app.stage];
                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left bg-white dark:bg-slate-800/90 hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span
                            className="text-xs font-bold text-slate-900 dark:text-white truncate block max-w-[130px]"
                            title={app.candidate?.full_name || 'Ứng viên'}
                          >
                            {app.candidate?.full_name || 'Ứng viên ẩn'}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${stageMeta?.badge}`}>
                            {stageMeta?.label || app.stage}
                          </span>
                        </div>

                        <p
                          className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-2"
                          title={app.opening?.title}
                        >
                          {app.opening?.title || 'Chưa gắn vị trí'}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
                          <span>v{app.version}</span>
                          <span>{new Date(app.created_at).toLocaleDateString('vi-VN')}</span>
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

      {/* ── Detail & Action Drawer ── */}
      {selectedApp && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chi Tiết Ứng Viên: {selectedApp.candidate?.full_name || 'Hồ Sơ'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    STAGE_LABELS[selectedApp.stage]?.badge
                  }`}
                >
                  {STAGE_LABELS[selectedApp.stage]?.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Vị trí: <strong>{selectedApp.opening?.title}</strong> • Email: {selectedApp.candidate?.email || 'Đã ẩn danh'} • Điện thoại: {selectedApp.candidate?.phone || 'N/A'}
              </p>
            </div>

            <button
              onClick={() => setSelectedApp(null)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <MatIcon name="close" size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Evidence & Reports */}
            <div className="lg:col-span-2 space-y-4">
              {/* HR Review Info */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MatIcon name="rate_review" size={16} />
                    Đánh giá từ HR Manager
                  </span>
                  {selectedApp.hr_review && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        selectedApp.hr_review.decision === 'HIRE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedApp.hr_review.decision === 'NO_HIRE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedApp.hr_review.decision}
                    </span>
                  )}
                </div>
                {selectedApp.hr_review ? (
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <p><strong>Lý do HR:</strong> {selectedApp.hr_review.reason}</p>
                    {selectedApp.hr_review.ai_diff_reason && (
                      <p className="text-amber-700 dark:text-amber-300">
                        <strong>Khác biệt với AI:</strong> {selectedApp.hr_review.ai_diff_reason}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có đánh giá từ HR phụ trách.</p>
                )}
              </div>

              {/* AI Evaluation Report */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MatIcon name="auto_awesome" size={16} className="text-purple-600" />
                    Báo cáo Phân tích AI & Bằng chứng
                  </span>
                  <button
                    onClick={handleRunEvaluation}
                    disabled={actionLoading}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 cursor-pointer disabled:opacity-50"
                  >
                    Chạy lại AI
                  </button>
                </div>

                {selectedApp.ai_evaluations && selectedApp.ai_evaluations.length > 0 ? (
                  <div className="space-y-3 text-xs">
                    {selectedApp.ai_evaluations.map((evalItem) => (
                      <div key={evalItem.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Gợi ý: {evalItem.recommendation}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Rubric v{evalItem.rubric_version} • {new Date(evalItem.created_at).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mb-2">{evalItem.summary}</p>

                        {evalItem.evidence_json && (
                          <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-[11px] font-mono text-slate-600 dark:text-slate-400">
                            <strong>Trích dẫn minh chứng:</strong>
                            <pre className="whitespace-pre-wrap mt-1 overflow-x-auto max-h-32">
                              {evalItem.evidence_json}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có kết quả phân tích AI cho ứng viên này.</p>
                )}
              </div>
            </div>

            {/* Right Col: Actions & Owner Decisions */}
            <div className="space-y-4">
              {/* HR Assignment */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Phân công HR phụ trách
                </label>
                <AxiomSelect
                  value={selectedApp.assigned_hr_member_id || 'NONE'}
                  onChange={(val) => handleAssignHR(val === 'NONE' ? null : val)}
                  options={[
                    { value: 'NONE', label: 'Chưa phân công' },
                    ...managers.map((m) => ({
                      value: m.id,
                      label: `${m.full_name} (${m.role})`,
                      triggerLabel: m.full_name,
                    })),
                  ]}
                  width="180px"
                  triggerClassName="w-[180px] shrink-0"
                />
              </div>

              {/* Owner Approval Panel */}
              {selectedApp.stage === 'OWNER_APPROVAL_PENDING' && (
                <div className="p-4 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 space-y-3">
                  <span className="text-xs font-bold text-orange-900 dark:text-orange-200 block">
                    Phê duyệt Tuyển Dụng (Owner Gate)
                  </span>
                  <textarea
                    value={ownerRejectReason}
                    onChange={(e) => setOwnerRejectReason(e.target.value)}
                    placeholder="Lý do phê duyệt hoặc ghi chú từ chối (bắt buộc khi từ chối)..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleOwnerApprove}
                      disabled={actionLoading}
                      className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
                    >
                      Duyệt Tuyển Dụng
                    </button>
                    <button
                      onClick={handleOwnerReject}
                      disabled={actionLoading}
                      className="flex-1 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
                    >
                      Từ Chối
                    </button>
                  </div>
                </div>
              )}

              {/* Issue Onboarding Panel */}
              {selectedApp.stage === 'APPROVED' && (
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                    Sẵn Sàng Phát Hành Onboarding
                  </span>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Ứng viên đã được duyệt. Bấm nút dưới để tạo liên kết bảo mật và gửi email thư mời gia nhập.
                  </p>
                  <button
                    onClick={handleIssueOnboarding}
                    disabled={actionLoading}
                    className="w-full py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    Phát Hành Thư Mời Onboarding
                  </button>
                </div>
              )}

              {/* Onboarding Success Box */}
              {onboardingSuccess && (
                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs space-y-1.5">
                  <span className="font-bold text-teal-900 dark:text-teal-200 block">
                    Đã tạo thư mời thành công!
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono text-[10px] break-all">
                    URL: {onboardingSuccess.register_url}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(onboardingSuccess.register_url);
                      onNotify?.('Đã sao chép liên kết Onboarding vào clipboard!');
                    }}
                    className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 border rounded cursor-pointer"
                  >
                    Sao chép liên kết
                  </button>
                </div>
              )}
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
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Khối / Phòng ban
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
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
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
                <label htmlFor="requiresTest" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
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

      {/* ── Modal: HR Access Management ── */}
      {isHRAccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Phân Quyền HR Review Cho Quản Lý
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cấp quyền trực tiếp <code>recruitment.review</code> cho các Trưởng phòng / Manager để tham gia chấm hồ sơ và phỏng vấn.
            </p>

            {hrGrantError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                {hrGrantError}
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {managers.map((m) => {
                const isGranted = hrGrantStates[m.id] ?? false;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {m.full_name}
                      </span>
                      <span className="text-[11px] text-slate-500">{m.email}</span>
                    </div>
                    <button
                      onClick={() => handleToggleHRGrant(m.id, isGranted)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                        isGranted
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {isGranted ? 'Thu hồi quyền HR' : 'Cấp quyền HR'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsHRAccessModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Retention Policy ── */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Chính Sách Lưu Trữ Dữ Liệu
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Hồ sơ ứng viên ở trạng thái kết thúc (Từ chối, Rút, Tuyển dụng) sẽ được xóa PII và minh chứng sau số ngày quy định.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Thời hạn lưu trữ (ngày, từ 30 đến 730)
                </label>
                <input
                  type="number"
                  min={30}
                  max={730}
                  value={retentionDaysInput}
                  onChange={(e) => setRetentionDaysInput(parseInt(e.target.value) || 180)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Lưu Chính Sách
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
