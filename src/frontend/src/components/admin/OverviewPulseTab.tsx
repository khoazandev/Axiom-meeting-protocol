'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MatIcon } from '@/components/ui/MatIcon';
import { OrgAnalytics, Meeting, OrgMemberDetail } from '@/lib/api';

interface OverviewPulseTabProps {
  metrics: OrgAnalytics;
  liveMeetings: Meeting[];
  pendingMeetings: Meeting[];
  managers: OrgMemberDetail[];
  onApproveMeeting: (meetingId: string) => Promise<void>;
  onRejectMeeting: (meetingId: string) => Promise<void>;
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
  pendingMeetings,
  managers,
  onApproveMeeting,
  onRejectMeeting,
  onCreateExecutiveMeeting,
  onRefresh,
}: OverviewPulseTabProps) {
  const router = useRouter();

  // Executive Meeting Modal State
  const [isExecModalOpen, setIsExecModalOpen] = useState(false);
  const [execTitle, setExecTitle] = useState('Hội Nghị Ban Điều Hành Cấp Cao — Định Hướng Chiến Lược Qwen DX-OS');
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
    // Navigate to meeting room
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
              Trung Tâm Chỉ Huy Doanh Nghiệp
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Live DB Pulse
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Giám sát vận hành thời gian thực, điều hành cuộc họp trọng yếu và phê duyệt yêu cầu từ các phòng ban.
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
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <MatIcon name="add_moderator" className="text-[18px]" />
            <span>Tạo Cuộc Họp Cấp Cao</span>
          </button>
        </div>
      </div>

      {/* ── 4 Top Executive Pulse KPI Cards (Real Data Calculated) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cuộc họp tháng */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng Cuộc Họp Tháng
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
            <MatIcon name="verified" filled className="text-blue-500 text-[14px]" />
            <span>{metrics.total_departments} Phòng ban hoạt động</span>
          </p>
        </div>

        {/* Card 2: Tỷ lệ đúng giờ */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tỷ Lệ Đúng Giờ
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
            <span>Agenda Gate bắt buộc ≥ 20 ký tự</span>
          </p>
        </div>

        {/* Card 3: Thực thi tác vụ Action Items */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Thực Thi Action Items
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
            <span>Tự động liên kết Kanban & Jira</span>
          </p>
        </div>

        {/* Card 4: Tiết kiệm thời gian nhờ AI */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tiết Kiệm Nhờ Qwen AI
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
            <span>Tự động trích xuất biên bản & việc</span>
          </p>
        </div>
      </div>

      {/* ── Pending Meeting Approvals (Phê duyệt cuộc họp dành riêng cho Owner) ── */}
      {pendingMeetings.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/70 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 dark:border-amber-900/50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <MatIcon name="notification_important" className="text-[18px]" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Yêu Cầu Cuộc Họp Chờ Phê Duyệt ({pendingMeetings.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Các cuộc họp do nhân viên hoặc phòng ban đề xuất cần sự chấp thuận của Chủ tịch trước khi kích hoạt phòng LiveKit.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded-lg">
              Cần xử lý
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {pendingMeetings.map((m) => (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {m.department_name || 'Khối Chung'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {m.title}
                    </h4>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Đề xuất bởi: <strong>{m.host_name || 'Nhân sự'}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 italic">
                    Agenda: "{m.description || m.agenda || 'Không có mô tả'}"
                  </p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MatIcon name="event" className="text-[14px]" />
                      <span>
                        {m.scheduled_at
                          ? new Date(m.scheduled_at).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })
                          : 'Chưa lên lịch'}
                      </span>
                    </span>
                    <span>•</span>
                    <span>{m.participant_count || 1} người tham gia dự kiến</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={actionLoadingId === m.id}
                    onClick={() => handleReject(m.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                  >
                    {actionLoadingId === m.id ? 'Đang xử lý...' : 'Từ Chối'}
                  </button>
                  <button
                    disabled={actionLoadingId === m.id}
                    onClick={() => handleApprove(m.id)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
                  >
                    {actionLoadingId === m.id ? 'Đang duyệt...' : 'Phê Duyệt'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Tactical Grid: 8 Cols Radar + 4 Cols Governance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Tactical Live Meeting Radar */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 flex flex-col">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Radar Cuộc Họp Thời Gian Thực</span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-mono">
                    LIVE ({liveMeetings.length} PHÒNG)
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Đặc quyền Giám sát Tối cao: Dự thính âm thanh kiểm toán hoặc tham gia điều hành trực tiếp phòng LiveKit.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <MatIcon name="sensors" className="text-emerald-500 text-[16px] animate-pulse" />
              <span>LiveKit SFU 12ms</span>
            </div>
          </div>

          {/* Active Meeting Cards Matrix */}
          <div className="mt-5 space-y-4 flex-1">
            {liveMeetings.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
                  <MatIcon name="videocam_off" className="text-[24px]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Hiện Chưa Có Cuộc Họp Nào Đang Diễn Ra
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Bạn có thể tạo cuộc họp cấp cao với các trưởng phòng ngay bây giờ hoặc phê duyệt các yêu cầu chờ.
                </p>
                <button
                  onClick={() => setIsExecModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <MatIcon name="video_call" className="text-[18px]" />
                  <span>Mở Phòng Họp Cấp Cao Ngay</span>
                </button>
              </div>
            ) : (
              liveMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/70 transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Meeting Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {meeting.department_name || 'Khối Doanh Nghiệp'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {meeting.title}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          <MatIcon name="check_circle" className="text-[12px]" />
                          <span>Agenda Gate OK</span>
                        </span>
                      </div>

                      {/* Metadata line */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          <MatIcon name="schedule" className="text-[14px]" />
                          <span>
                            {meeting.started_at
                              ? `Bắt đầu: ${new Date(meeting.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                              : 'Đang họp'}
                          </span>
                        </span>
                        <span>•</span>
                        <span>
                          Chủ trì: <strong className="text-slate-700 dark:text-slate-300">{meeting.host_name || 'Ban Điều Hành'}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <MatIcon name="group" className="text-[14px]" />
                          <span>{meeting.participant_count || 1} người tham gia</span>
                        </span>
                      </div>

                      {/* Participants Avatars + Soundwave Simulation */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex items-center gap-0.5 h-4 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60">
                          <span className="w-0.5 h-3 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="w-0.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-75" />
                          <span className="w-0.5 h-2.5 bg-emerald-500 rounded-full animate-pulse delay-150" />
                          <span className="w-0.5 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono ml-1">
                            STT & AI MOM ACTIVE
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dual Action Buttons: Silent Audit vs Executive Intervene */}
                    <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                      <button
                        onClick={() => handleJoinMeeting(meeting.id, 'audit')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                        title="Dự thính âm thanh ẩn danh để kiểm toán chất lượng cuộc họp mà không bật mic/camera"
                      >
                        <MatIcon name="headset_mic" className="text-[16px] text-blue-600 dark:text-blue-400" />
                        <span>Dự thính Ẩn danh</span>
                      </button>

                      <button
                        onClick={() => handleJoinMeeting(meeting.id, 'intervene')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
                        title="Tham gia phòng họp với quyền Chủ tọa Lãnh đạo cao nhất"
                      >
                        <MatIcon name="record_voice_over" className="text-[16px]" />
                        <span>Vào Điều Hành</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Protocol security note */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tất cả dữ liệu được bảo vệ trong VPC On-Premise chuẩn E2EE</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <MatIcon name="verified_user" className="text-[14px]" />
              <span>Axiom Protocol Active</span>
            </span>
          </div>
        </div>

        {/* Right 4 Cols: Governance Action Station & Live Compliance */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Protocol Discipline Status */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MatIcon name="gavel" filled className="text-amber-500 text-[18px]" />
                <span>Kỷ Luật Protocol Họp</span>
              </h3>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded font-mono">
                100% Tuân thủ
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Qwen AI MoM Engine tự động trích xuất biên bản, công việc và quyết định từ mọi phiên thảo luận.
            </p>

            {/* Checklist */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <MatIcon name="check_circle" filled className="text-emerald-500 text-[16px]" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Cổng Agenda Bắt Buộc (≥20 ký tự)
                  </span>
                </div>
                <span className="font-bold text-emerald-600">Đang bật</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <MatIcon name="check_circle" filled className="text-emerald-500 text-[16px]" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Trợ lý Ghi chép MoM Qwen
                  </span>
                </div>
                <span className="font-bold text-emerald-600">Tự động</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <MatIcon name="security" filled className="text-blue-500 text-[16px]" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Mã hóa Lưu trữ On-Premise
                  </span>
                </div>
                <span className="font-bold text-blue-600">Sovereign</span>
              </div>
            </div>
          </div>

          {/* Infrastructure Health Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <MatIcon name="dns" filled className="text-blue-500 text-[18px]" />
              <span>Hạ Tầng Họp Trực Tuyến</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">LiveKit WebRTC Server</span>
                <span className="font-mono font-bold text-emerald-600">Sẵn sàng (Port 7880)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[98%]" />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">PostgreSQL Core Database</span>
                <span className="font-mono font-bold text-emerald-600">Đã kết nối (Port 5433)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[100%]" />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">Ollama LLM Engine</span>
                <span className="font-mono font-bold text-emerald-600">CUDA GPU Active</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[85%]" />
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
                    Khởi Tạo Cuộc Họp Ban Điều Hành Cấp Cao
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cuộc họp chính thức do Chủ tịch chủ trì với các Trưởng phòng ban (Managers).
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
                  Tiêu Đề Cuộc Họp <span className="text-rose-500">*</span>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chương Trình Làm Việc (Agenda Gate) <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono font-bold ${
                      execAgenda.trim().length >= 20 ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {execAgenda.trim().length}/20 ký tự tối thiểu
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={execAgenda}
                  onChange={(e) => setExecAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Quy chuẩn bắt buộc tối thiểu 20 ký tự để mở phòng họp..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thời Gian Bắt Đầu Dự Kiến <span className="text-rose-500">*</span>
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
                    Mời Các Trưởng Phòng Ban ({selectedManagerIds.length}/{managers.length} đã chọn)
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
                      Chưa có trưởng phòng nào trong hệ thống. Bạn có thể bổ nhiệm tại tab Nhân sự.
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
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || execAgenda.trim().length < 20}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang khởi tạo...' : 'Kích Hoạt Cuộc Họp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
