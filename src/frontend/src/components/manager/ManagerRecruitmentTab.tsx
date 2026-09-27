'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import {
  recruitmentApi,
  RecruitmentApplication,
  JobOpening,
  RecruitmentStage,
} from '@/lib/recruitment-api';

interface ManagerRecruitmentTabProps {
  organizationId: string;
  onNotify?: (msg: string) => void;
}

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

export function ManagerRecruitmentTab({
  organizationId,
  onNotify,
}: ManagerRecruitmentTabProps) {
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedOpeningFilter, setSelectedOpeningFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');

  // Selected application
  const [selectedApp, setSelectedApp] = useState<RecruitmentApplication | null>(null);

  // Review Form States
  const [decision, setDecision] = useState<'HIRE' | 'NO_HIRE' | 'NEEDS_MORE_EVIDENCE'>('HIRE');
  const [reason, setReason] = useState('');
  const [aiDiffReason, setAiDiffReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    try {
      const [apps, ops] = await Promise.all([
        recruitmentApi.listApplications(organizationId),
        recruitmentApi.listOpenings(organizationId),
      ]);
      setApplications(apps);
      setOpenings(ops);
    } catch (err: unknown) {
      console.error('Failed to load manager recruitment applications', err);
      onNotify?.('Lỗi tải danh sách hồ sơ tuyển dụng được phân công');
    }
  }, [organizationId, onNotify]);

  useEffect(() => {
    let ignore = false;
    if (!organizationId) return;

    Promise.all([
      recruitmentApi.listApplications(organizationId),
      recruitmentApi.listOpenings(organizationId),
    ])
      .then(([apps, ops]) => {
        if (ignore) return;
        setApplications(apps);
        setOpenings(ops);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        console.error('Failed to load manager recruitment applications', err);
        onNotify?.('Lỗi tải danh sách hồ sơ tuyển dụng được phân công');
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [organizationId, onNotify]);

  const refreshSelected = async (appId: string) => {
    try {
      const updated = await recruitmentApi.getApplication(organizationId, appId);
      setSelectedApp(updated);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      // ignore
    }
  };

  const filteredApps = applications.filter((app) => {
    if (selectedOpeningFilter !== 'ALL' && app.opening_id !== selectedOpeningFilter) return false;
    if (selectedStageFilter !== 'ALL' && app.stage !== selectedStageFilter) return false;
    return true;
  });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (reason.trim().length < 5) {
      onNotify?.('Vui lòng nhập lý do đánh giá tối thiểu 5 ký tự');
      return;
    }

    setSubmitting(true);
    try {
      await recruitmentApi.submitHRReview(organizationId, selectedApp.id, {
        decision,
        reason: reason.trim(),
        ai_diff_reason: aiDiffReason.trim() || undefined,
        expected_version: selectedApp.version,
      });
      onNotify?.('Đã gửi đánh giá HR thành công!');
      setReason('');
      setAiDiffReason('');
      await refreshSelected(selectedApp.id);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi gửi đánh giá HR');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Đánh Giá Tuyển Dụng & Phỏng Vấn (HR Workspace)
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            HR Reviewer
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Xem xét kết quả kiểm tra năng lực, bằng chứng phỏng vấn và gửi đề xuất tuyển dụng chuyển tiếp lên Owner
        </p>
      </div>

      {/* ── Filters (Anti-CLS Fixed Widths) ── */}
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

        <div className="ml-auto text-xs text-slate-500">
          Được phân công: <strong className="text-slate-800 dark:text-slate-200">{filteredApps.length}</strong> hồ sơ
        </div>
      </div>

      {/* ── Main Layout: Applications List & Review Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Applications Cards */}
        <div className="lg:col-span-4 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Danh sách hồ sơ ({filteredApps.length})
          </h3>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Đang tải hồ sơ...</div>
          ) : filteredApps.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Chưa có hồ sơ nào được phân công cho bạn.
            </div>
          ) : (
            filteredApps.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              const meta = STAGE_LABELS[app.stage];
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-slate-900 ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span
                      className="text-xs font-bold text-slate-900 dark:text-white truncate block max-w-[170px]"
                      title={app.candidate?.full_name || 'Ứng viên'}
                    >
                      {app.candidate?.full_name || 'Ứng viên'}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${meta?.badge}`}>
                      {meta?.label || app.stage}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 truncate mb-2">
                    {app.opening?.title}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>{app.candidate?.email || 'Đã ẩn'}</span>
                    <span>v{app.version}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detail & Review Form */}
        <div className="lg:col-span-8">
          {selectedApp ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Candidate Info Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedApp.candidate?.full_name}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_LABELS[selectedApp.stage]?.badge}`}>
                      {STAGE_LABELS[selectedApp.stage]?.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Vị trí: <strong>{selectedApp.opening?.title}</strong> • Email: {selectedApp.candidate?.email} • SĐT: {selectedApp.candidate?.phone || 'N/A'}
                  </p>
                </div>
              </div>

              {/* AI Evaluation Report (If Available) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                  <MatIcon name="auto_awesome" size={16} className="text-purple-600" />
                  Báo Cáo Đánh Giá Từ AI
                </span>

                {selectedApp.ai_evaluations && selectedApp.ai_evaluations.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {selectedApp.ai_evaluations.map((ev) => (
                      <div key={ev.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Khuyến nghị AI: {ev.recommendation}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ev.created_at).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{ev.summary}</p>
                        {ev.evidence_json && (
                          <div className="mt-2 bg-slate-50 dark:bg-slate-800 p-2 rounded text-[11px] font-mono">
                            <span className="font-bold text-slate-500">Minh chứng phân tích:</span>
                            <pre className="whitespace-pre-wrap mt-1 overflow-x-auto max-h-24">
                              {ev.evidence_json}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có đánh giá AI.</p>
                )}
              </div>

              {/* Existing HR Review (If already reviewed) */}
              {selectedApp.hr_review && (
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200">
                      Đã gửi đánh giá: {selectedApp.hr_review.decision}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(selectedApp.hr_review.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Lý do:</strong> {selectedApp.hr_review.reason}
                  </p>
                  {selectedApp.hr_review.ai_diff_reason && (
                    <p className="text-amber-700 dark:text-amber-300">
                      <strong>Lý do khác biệt AI:</strong> {selectedApp.hr_review.ai_diff_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Review Decision Form */}
              {selectedApp.stage === 'HR_REVIEW_PENDING' && (
                <form onSubmit={handleSubmitReview} className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Biểu Mẫu Đánh Giá & Quyết Định HR
                  </span>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Quyết định tuyển dụng *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDecision('HIRE')}
                        className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          decision === 'HIRE'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Đề xuất Tuyển dụng
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision('NO_HIRE')}
                        className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          decision === 'NO_HIRE'
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Không Tuyển dụng
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision('NEEDS_MORE_EVIDENCE')}
                        className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          decision === 'NEEDS_MORE_EVIDENCE'
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Cần thêm dữ liệu
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Lý do đánh giá chi tiết * (tối thiểu 5 ký tự)
                    </label>
                    <textarea
                      required
                      minLength={5}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Nhận xét chi tiết về năng lực, văn hóa và kết quả phỏng vấn..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Giải trình nếu khác biệt so với gợi ý của AI (nếu có)
                    </label>
                    <input
                      type="text"
                      value={aiDiffReason}
                      onChange={(e) => setAiDiffReason(e.target.value)}
                      placeholder="ví dụ: Đánh giá cao tư duy giải quyết vấn đề thực tế hơn kết quả bài test..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {submitting ? 'Đang gửi...' : 'Gửi Đánh Giá HR'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              <MatIcon name="touch_app" size={32} className="mb-2 text-slate-300 dark:text-slate-600" />
              <span>Chọn một hồ sơ ứng viên ở cột bên trái để xem chi tiết và thực hiện đánh giá.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
