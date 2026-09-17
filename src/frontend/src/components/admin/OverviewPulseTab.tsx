'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MatIcon } from '@/components/ui/MatIcon';
import { OrgAnalytics, Meeting, OrgMemberDetail, meetingsApi } from '@/lib/api';
import { resolveMeetingState, getMeetingStateBadge, MeetingState } from '@/lib/meetingState';
import { MeetingDetailsModal } from '@/components/knowledge/MeetingDetailsModal';

interface OverviewPulseTabProps {
  metrics: OrgAnalytics;
  liveMeetings: Meeting[];
  upcomingMeetings?: Meeting[];
  endedMeetings?: Meeting[];
  allMeetings?: Meeting[];
  pendingMeetings: Meeting[];
  managers: OrgMemberDetail[];
  onApproveMeeting: (meetingId: string) => Promise<void>;
  onRejectMeeting: (meetingId: string) => Promise<void>;
  onStartEarly?: (meetingId: string) => Promise<void>;
  onCreateExecutiveMeeting: (data: {
    title: string;
    agenda: string;
    scheduled_at: string;
    department_id?: string;
    participant_ids: string[];
  }) => Promise<void>;
  onRefresh?: () => void;
}

export function OverviewPulseTab({
  metrics,
  liveMeetings,
  upcomingMeetings = [],
  endedMeetings = [],
  allMeetings = [],
  pendingMeetings,
  managers,
  onApproveMeeting,
  onRejectMeeting,
  onStartEarly,
  onCreateExecutiveMeeting,
  onRefresh,
}: OverviewPulseTabProps) {
  const router = useRouter();

  // 3-State Meeting Filter State
  const [meetingFilter, setMeetingFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'ENDED'>('ALL');
  const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [startingEarlyId, setStartingEarlyId] = useState<string | null>(null);

  // Executive Meeting Modal State
  const [isExecModalOpen, setIsExecModalOpen] = useState(false);
  const [execTitle, setExecTitle] = useState(
    'Hội Nghị Ban Điều Hành Cấp Cao — Định Hướng Chiến Lược Qwen DX-OS'
  );
  const [execAgenda, setExecAgenda] = useState(
    'Chương trình làm việc: 1. Đánh giá chỉ số thực thi quý; 2. Thống nhất cơ chế bảo mật On-Premise; 3. Giao chỉ tiêu cho các khối phòng ban.'
  );
  const [execSchedule, setExecSchedule] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Agenda File Upload State
  const [execUploadedFile, setExecUploadedFile] = useState<string | null>(null);
  const [isParsingExecFile, setIsParsingExecFile] = useState(false);
  const execFileInputRef = useRef<HTMLInputElement>(null);

  const handleExecFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingExecFile(true);
    try {
      const fileNameLower = file.name.toLowerCase();
      let extractedContent = '';
      if (
        fileNameLower.endsWith('.txt') ||
        fileNameLower.endsWith('.md') ||
        fileNameLower.endsWith('.markdown')
      ) {
        extractedContent = (await file.text()).trim();
      } else {
        const res = await meetingsApi.parseAgenda(file);
        if (res.error) throw new Error(res.error);
        extractedContent = (res.content || '').trim();
      }
      if (extractedContent) {
        setExecAgenda(extractedContent);
        setExecUploadedFile(file.name);
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể trích xuất nội dung tệp. Vui lòng thử lại hoặc dán trực tiếp.');
    } finally {
      setIsParsingExecFile(false);
      if (execFileInputRef.current) execFileInputRef.current.value = '';
    }
  };

  const toggleManager = (id: string) => {
    setSelectedManagerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllManagers = () => {
    if (selectedManagerIds.length === managers.length) {
      setSelectedManagerIds([]);
    } else {
      setSelectedManagerIds(managers.map((m) => m.user_id));
    }
  };

  const handleSubmitExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (execAgenda.trim().length < 20) {
      alert('Agenda phải đạt chuẩn tối thiểu 20 ký tự theo quy định Agenda Gate DX-OS.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreateExecutiveMeeting({
        title: execTitle.trim(),
        agenda: execAgenda.trim(),
        scheduled_at: new Date(execSchedule).toISOString(),
        participant_ids: selectedManagerIds,
      });
      setIsExecModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Không thể tạo cuộc họp cấp cao');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinMeeting = (meetingId: string, mode: 'audit' | 'intervene') => {
    router.push(`/meetings/${meetingId}`);
  };

  const handleApprove = async (meetingId: string) => {
    setActionLoadingId(meetingId);
    try {
      await onApproveMeeting(meetingId);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (meetingId: string) => {
    setActionLoadingId(meetingId);
    try {
      await onRejectMeeting(meetingId);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Executive Action Bar ── */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Trung tâm Chỉ huy Doanh nghiệp
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
              Live Pulse
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Giám sát vận hành thời gian thực, thẩm định phê duyệt cuộc họp phòng ban và điều hành các phiên họp trọng yếu.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title="Làm mới số liệu"
            >
              <MatIcon name="refresh" className="text-[18px]" />
            </button>
          )}

          <button
            onClick={() => setIsExecModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <MatIcon name="add_moderator" className="text-[18px]" />
            <span>Tạo cuộc họp cấp cao</span>
          </button>
        </div>
      </div>

      {/* ── 4 Top Executive Pulse KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cuộc họp tháng */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng cuộc họp tháng
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MatIcon name="groups" filled className="text-[20px]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {metrics.total_meetings_this_month}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-emerald-200/60 dark:border-emerald-800/60">
              <MatIcon name="trending_up" className="text-[14px]" />
              <span>{metrics.meetings_growth}</span>
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <MatIcon name="verified" className="text-blue-500 text-[14px]" />
            <span>{metrics.total_departments} Phòng ban đang hoạt động</span>
          </p>
        </div>

        {/* Card 2: Tỷ lệ đúng giờ */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tỷ lệ đúng giờ
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MatIcon name="timer" filled className="text-[20px]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {metrics.on_time_punctual_rate}%
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
              Kỷ luật DX-OS
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <MatIcon name="speed" className="text-emerald-500 text-[14px]" />
            <span>Cổng Agenda bắt buộc ≥ 20 ký tự</span>
          </p>
        </div>

        {/* Card 3: Thực thi tác vụ Action Items */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Thực thi Action Items
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <MatIcon name="fact_check" filled className="text-[20px]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {metrics.task_execution_rate}%
            </span>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-md">
              Đạt chuẩn
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <MatIcon name="task_alt" className="text-purple-500 text-[14px]" />
            <span>Tự động trích xuất & giao việc Jira</span>
          </p>
        </div>

        {/* Card 4: Tiết kiệm thời gian nhờ AI */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tiết kiệm nhờ Qwen AI
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MatIcon name="auto_awesome" filled className="text-[20px]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {metrics.hours_saved_by_ai}
            </span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md">
              Giờ làm việc
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <MatIcon name="psychology" className="text-amber-500 text-[14px]" />
            <span>Tự động lập biên bản & nghị quyết</span>
          </p>
        </div>
      </div>

      {/* ── DUAL CORE WORKSPACE: QUẢN LÝ XÉT DUYỆT VS ĐIỀU HÀNH TRỰC TIẾP ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── ZONE A: TRUNG TÂM XÉT DUYỆT CUỘC HỌP (APPROVAL WORKFLOW) ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            {/* Header Zone A */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <MatIcon name="assignment" className="text-[18px]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Xét duyệt yêu cầu cuộc họp
                    </h3>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        pendingMeetings.length > 0
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                      }`}
                    >
                      {pendingMeetings.length > 0
                        ? `${pendingMeetings.length} YÊU CẦU CHỜ DUYỆT`
                        : 'ĐÃ DUYỆT HẾT'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Thẩm quyền Chủ tịch: Phê duyệt Agenda trước khi kích hoạt phòng LiveKit.
                  </p>
                </div>
              </div>
            </div>

            {/* List of Pending Meetings or Empty State */}
            <div className="mt-4 space-y-3">
              {pendingMeetings.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                    <MatIcon name="check_circle" className="text-[26px]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Không có yêu cầu nào chờ phê duyệt
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Toàn bộ đề xuất họp từ các phòng ban đã được xử lý. Hệ thống đang vận hành theo chuẩn kỷ luật DX-OS.
                  </p>
                </div>
              ) : (
                pendingMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/70 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 transition-all flex flex-col gap-3 shadow-2xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono">
                          {m.department_name || 'Khối Chung'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Đề xuất bởi:{' '}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {m.host_name || 'Nhân sự'}
                          </strong>
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {m.title}
                      </h4>

                      {/* Agenda Quote */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                        "{m.description || m.agenda || 'Không có mô tả chi tiết'}"
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <MatIcon name="schedule" className="text-[13px]" />
                          <span>
                            {m.scheduled_at
                              ? new Date(m.scheduled_at).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                })
                              : 'Chưa đặt lịch'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MatIcon name="groups" className="text-[13px]" />
                          <span>{m.participant_count || 1} người tham gia</span>
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <button
                        disabled={actionLoadingId === m.id}
                        onClick={() => handleReject(m.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                      >
                        {actionLoadingId === m.id ? 'Đang xử lý...' : 'Từ chối'}
                      </button>
                      <button
                        disabled={actionLoadingId === m.id}
                        onClick={() => handleApprove(m.id)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
                      >
                        {actionLoadingId === m.id ? 'Đang duyệt...' : 'Phê duyệt'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tiêu chuẩn phê duyệt: Agenda Gate ≥ 20 ký tự</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <MatIcon name="verified_user" className="text-[13px]" />
              <span>Quy chế DX-OS</span>
            </span>
          </div>
        </div>

        {/* ── ZONE B: RADAR ĐIỀU HÀNH CUỘC HỌP 3 TRẠNG THÁI (SẮP, ĐANG, KẾT THÚC) ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            {/* Header Zone B */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Trung tâm điều hành cuộc họp
                  </h3>
                </div>
              </div>

              {/* 3-State Filter Switcher */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shrink-0 gap-1 overflow-x-auto">
                {(() => {
                  const effectiveAll =
                    allMeetings && allMeetings.length > 0
                      ? allMeetings.filter((m) => (m as any).approval_status !== 'PENDING')
                      : [...liveMeetings, ...(upcomingMeetings || []), ...(endedMeetings || [])];

                  const liveCount = effectiveAll.filter((m) => resolveMeetingState(m) === 'LIVE').length;
                  const upcomingCount = effectiveAll.filter((m) => resolveMeetingState(m) === 'UPCOMING').length;
                  const endedCount = effectiveAll.filter((m) => resolveMeetingState(m) === 'ENDED').length;

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setMeetingFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          meetingFilter === 'ALL'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Tất cả ({effectiveAll.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setMeetingFilter('LIVE')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          meetingFilter === 'LIVE'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Đang họp ({liveCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMeetingFilter('UPCOMING')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          meetingFilter === 'UPCOMING'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                      >
                        Sắp diễn ra ({upcomingCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => setMeetingFilter('ENDED')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          meetingFilter === 'ENDED'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        Đã kết thúc ({endedCount})
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* List of Meetings based on Filter */}
            <div className="mt-4 space-y-3">
              {(() => {
                const effectiveAll =
                  allMeetings && allMeetings.length > 0
                    ? allMeetings.filter((m) => (m as any).approval_status !== 'PENDING')
                    : [...liveMeetings, ...(upcomingMeetings || []), ...(endedMeetings || [])];

                const displayed = effectiveAll.filter((m) => {
                  const s = resolveMeetingState(m);
                  if (meetingFilter === 'ALL') return true;
                  return s === meetingFilter;
                });

                if (displayed.length === 0) {
                  return (
                    <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
                        <MatIcon name="calendar_month" className="text-[26px]" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {meetingFilter === 'LIVE' && 'Hiện chưa có cuộc họp nào đang diễn ra'}
                        {meetingFilter === 'UPCOMING' && 'Không có cuộc họp nào sắp diễn ra'}
                        {meetingFilter === 'ENDED' && 'Chưa có cuộc họp nào kết thúc trong danh mục'}
                        {meetingFilter === 'ALL' && 'Hiện chưa có cuộc họp nào được ghi nhận'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        Bạn có thể mở phòng họp cấp cao với các Trưởng phòng ngay bây giờ hoặc xem các cuộc họp khác.
                      </p>
                      <button
                        onClick={() => setIsExecModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <MatIcon name="add_moderator" className="text-[16px]" />
                        <span>Mở phòng họp cấp cao ngay</span>
                      </button>
                    </div>
                  );
                }

                return displayed.map((meeting) => {
                  const state = resolveMeetingState(meeting);
                  const badge = getMeetingStateBadge(state);
                  const isLive = state === 'LIVE';
                  const isUpcoming = state === 'UPCOMING';
                  const isEnded = state === 'ENDED';

                  return (
                    <div
                      key={meeting.id}
                      onClick={() => {
                        if (isEnded) {
                          setSelectedMeetingForDetails({ id: String(meeting.id), title: meeting.title });
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all flex flex-col gap-3 shadow-2xs group ${
                        isEnded ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-600' : ''
                      } ${
                        isLive
                          ? 'border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 hover:border-emerald-400'
                          : isUpcoming
                            ? 'border-blue-200 dark:border-blue-800/70 bg-white dark:bg-slate-800/30 hover:border-blue-300'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800/50 opacity-95'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                            {meeting.department_name || 'Khối Doanh Nghiệp'}
                          </span>

                          {/* Dynamic State Badge (SẮP, ĐANG, KẾT THÚC) */}
                          <div
                            className={`flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${badge.color}`}
                          >
                            {badge.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                            <span>{badge.label}</span>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {meeting.title}
                        </h4>

                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap gap-2">
                          <span
                            className={`flex items-center gap-1 font-mono font-semibold ${
                              isLive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isUpcoming
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-500'
                            }`}
                          >
                            <MatIcon name="schedule" className="text-[14px]" />
                            <span>
                              {isLive && (
                                meeting.started_at
                                  ? `Bắt đầu lúc: ${new Date(meeting.started_at).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`
                                  : 'Đang diễn ra trực tiếp'
                              )}
                              {isUpcoming && (
                                meeting.scheduled_at
                                  ? `Dự kiến: ${new Date(meeting.scheduled_at).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })} (${new Date(meeting.scheduled_at).toLocaleDateString('vi-VN')})`
                                  : 'Chưa tới giờ bắt đầu'
                              )}
                              {isEnded && (
                                meeting.ended_at
                                  ? `Kết thúc: ${new Date(meeting.ended_at).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: '2-digit',
                                      month: '2-digit',
                                    })}`
                                  : 'Cuộc họp đã kết thúc'
                              )}
                            </span>
                          </span>

                          <span>
                            Chủ trì:{' '}
                            <strong className="text-slate-700 dark:text-slate-200">
                              {meeting.host_name || 'Ban Điều Hành'}
                            </strong>
                          </span>

                          <span className="flex items-center gap-1 font-mono">
                            <MatIcon name="groups" className="text-[14px]" />
                            <span>{meeting.participant_count || 1} người</span>
                          </span>
                        </div>

                        {/* State-Specific Status Banner */}
                        {isLive && (
                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex items-center gap-0.5 h-4 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60">
                              <span className="w-0.5 h-3 bg-emerald-500 rounded-full animate-pulse" />
                              <span className="w-0.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-75" />
                              <span className="w-0.5 h-2.5 bg-emerald-500 rounded-full animate-pulse delay-150" />
                              <span className="w-0.5 h-2 bg-emerald-500 rounded-full animate-pulse" />
                              <span className="text-[9.5px] text-emerald-700 dark:text-emerald-400 font-mono ml-1 font-bold">
                                STT & AI MOM ENGINE ACTIVE
                              </span>
                            </div>
                          </div>
                        )}

                        {isUpcoming && (
                          <div className="flex items-center gap-2 pt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            <MatIcon name="info" className="text-[14px]" />
                            <span>Phòng họp đã lên lịch. Chủ tịch / Quản trị viên có thể bấm "Bắt đầu sớm" để triệu tập họp ngay.</span>
                          </div>
                        )}

                        {isEnded && (
                          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
                            <MatIcon name="archive" className="text-[14px] text-slate-400" />
                            <span>Cuộc họp đã kết thúc. Nhấp vào đây để xem Biên bản AI tóm tắt & Kho tri thức lưu trữ.</span>
                          </div>
                        )}
                      </div>

                      {/* State-Specific Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        {isLive && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleJoinMeeting(meeting.id, 'audit')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                              title="Dự thính âm thanh ẩn danh để kiểm toán mà không bật mic/camera"
                            >
                              <MatIcon name="headset_mic" className="text-[15px] text-blue-600 dark:text-blue-400" />
                              <span>Dự thính</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleJoinMeeting(meeting.id, 'intervene')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                              title="Tham gia phòng họp với quyền Chủ tọa Lãnh đạo"
                            >
                              <MatIcon name="record_voice_over" className="text-[15px]" />
                              <span>Vào điều hành</span>
                            </button>
                          </>
                        )}

                        {isUpcoming && (
                          <button
                            type="button"
                            disabled={startingEarlyId === String(meeting.id)}
                            onClick={async () => {
                              setStartingEarlyId(String(meeting.id));
                              try {
                                if (onStartEarly) {
                                  await onStartEarly(String(meeting.id));
                                } else {
                                  router.push(`/meetings/${meeting.id}`);
                                }
                              } finally {
                                setStartingEarlyId(null);
                              }
                            }}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                            title="Bắt đầu phòng họp ngay và tự động gửi thông báo triệu tập tới các thành viên được mời"
                          >
                            <MatIcon name="play_arrow" className="text-[16px]" />
                            <span>{startingEarlyId === String(meeting.id) ? 'Đang khởi động...' : 'Bắt đầu sớm & Triệu tập'}</span>
                          </button>
                        )}

                        {isEnded && (
                          <button
                            type="button"
                            onClick={() => setSelectedMeetingForDetails({ id: String(meeting.id), title: meeting.title })}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                            title="Mở Kho lưu trữ biên bản AI tóm tắt, quyết sách và danh sách task của cuộc họp đã kết thúc"
                          >
                            <MatIcon name="auto_awesome" className="text-[15px] text-amber-500" />
                            <span>Biên bản AI & Kho Lưu Trữ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Bảo vệ trong mạng riêng VPC On-Premise chuẩn E2EE</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
              <MatIcon name="verified_user" className="text-[13px]" />
              <span>Axiom Sovereign LiveKit</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── MODAL XEM BIÊN BẢN VÀ KHO LƯU TRỮ CUỘC HỌP KẾT THÚC ── */}
      {selectedMeetingForDetails && (
        <MeetingDetailsModal
          meetingId={selectedMeetingForDetails.id}
          meetingTitle={selectedMeetingForDetails.title}
          onClose={() => setSelectedMeetingForDetails(null)}
        />
      )}

      {/* ── LOWER STRATEGIC DECK: KỶ LUẬT PROTOCOL & SỨC KHỎE HẠ TẦNG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Protocol Discipline Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MatIcon name="gavel" className="text-amber-500 text-[18px]" />
              <span>Quy chế kỷ luật cuộc họp (DX-OS Protocol)</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded font-mono">
              100% Tuân thủ
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Đảm bảo tính chặt chẽ trong từng phiên họp: Agenda bắt buộc, AI ghi biên bản tự động và mã hóa độc lập.
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <MatIcon name="check_circle" className="text-emerald-500 text-[16px]" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Cổng Agenda bắt buộc (≥ 20 ký tự)
                </span>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Đang bật</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <MatIcon name="check_circle" className="text-emerald-500 text-[16px]" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Trợ lý Ghi chép MoM Qwen AI
                </span>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Tự động trích xuất</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <MatIcon name="shield" className="text-blue-500 text-[16px]" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Lưu trữ On-Premise Sovereign
                </span>
              </div>
              <span className="font-bold text-blue-600 dark:text-blue-400">AES-256 E2EE</span>
            </div>
          </div>
        </div>

        {/* Infrastructure Health Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MatIcon name="dns" className="text-blue-500 text-[18px]" />
              <span>Sẵn sàng hạ tầng trực tuyến</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded font-mono">
              99.98% SLA
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span>LiveKit WebRTC Server</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Port 7880 • Sẵn sàng</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[98%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span>PostgreSQL Core Database</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">Port 5433 • Đã kết nối</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[100%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span>Ollama LLM Engine (Extraction Model)</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">Port 11434 • GPU Active</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[88%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Tạo Cuộc Họp Cấp Cao (Executive Meeting Modal) ── */}
      {isExecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <MatIcon name="add_moderator" className="text-[22px]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Khởi tạo cuộc họp ban điều hành cấp cao
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cuộc họp chính thức do Chủ tịch chủ trì cùng các Trưởng phòng ban (Managers).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExecModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer transition-all"
              >
                <MatIcon name="close" className="text-[18px]" />
              </button>
            </div>

            <form onSubmit={handleSubmitExecutive} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề cuộc họp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={execTitle}
                  onChange={(e) => setExecTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tiêu đề cuộc họp cấp cao..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chương trình làm việc (Agenda) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={execFileInputRef}
                      onChange={handleExecFileUpload}
                      accept=".txt,.md,.markdown,.json,.docx,.pdf,.csv"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => execFileInputRef.current?.click()}
                      disabled={isParsingExecFile}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200/70 dark:border-blue-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <MatIcon name="upload_file" className="text-[14px]" />
                      <span>{isParsingExecFile ? 'Đang đọc...' : 'Nạp file (.txt, .md, .docx, .pdf)'}</span>
                    </button>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        execAgenda.trim().length >= 20 ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {execAgenda.trim().length}/20 ký tự
                    </span>
                  </div>
                </div>

                {execUploadedFile && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] mb-2">
                    <span className="truncate">
                      📎 Đã nạp từ tệp: <strong>{execUploadedFile}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setExecUploadedFile(null);
                        setExecAgenda('');
                      }}
                      className="text-emerald-700 hover:text-rose-600 font-bold ml-2 cursor-pointer"
                      title="Xóa tệp"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <textarea
                  required
                  rows={3}
                  value={execAgenda}
                  onChange={(e) => setExecAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập hoặc tải lên Agenda chi tiết cho cuộc họp cấp cao..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thời gian bắt đầu dự kiến <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={execSchedule}
                  onChange={(e) => setExecSchedule(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Managers Multi-select */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mời các Trưởng phòng ban ({selectedManagerIds.length}/{managers.length} đã chọn)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllManagers}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold cursor-pointer"
                  >
                    {selectedManagerIds.length === managers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả Trưởng phòng'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  {managers.length === 0 ? (
                    <p className="text-xs text-slate-400 col-span-2 text-center py-2">
                      Chưa có trưởng phòng nào trong hệ thống. Bạn có thể bổ nhiệm tại tab Cơ cấu nhân sự.
                    </p>
                  ) : (
                    managers.map((m) => {
                      const isSelected = selectedManagerIds.includes(m.user_id);
                      return (
                        <div
                          key={m.user_id}
                          onClick={() => toggleManager(m.user_id)}
                          className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-400 dark:bg-blue-950/60 dark:border-blue-600'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <MatIcon name="check" className="text-[12px]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {m.full_name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {m.department_name || 'Trưởng phòng'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsExecModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || execAgenda.trim().length < 20}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang khởi tạo...' : 'Khởi tạo cuộc họp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
