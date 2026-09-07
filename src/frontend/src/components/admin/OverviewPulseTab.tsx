"use client";

import React from "react";
import Link from "next/link";
import { MatIcon } from "@/components/ui/MatIcon";
import { AdminPulseMetrics, LiveRadarMeeting } from "@/lib/mockAdminData";

interface OverviewPulseTabProps {
  metrics: AdminPulseMetrics;
  liveMeetings: LiveRadarMeeting[];
  onQuickJoin: (meeting: LiveRadarMeeting, mode?: "audit" | "intervene") => void;
}

export function OverviewPulseTab({
  metrics,
  liveMeetings,
  onQuickJoin,
}: OverviewPulseTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── 4 Top Executive Pulse KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cuộc họp tháng */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cuộc Họp Tháng Này
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MatIcon name="groups" filled className="text-[20px]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {metrics.totalMeetingsThisMonth}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-emerald-200/60 dark:border-emerald-800/60">
              <MatIcon name="trending_up" className="text-[14px]" />
              <span>{metrics.meetingsGrowth}</span>
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <MatIcon name="verified" filled className="text-blue-500 text-[14px]" />
            <span>100% tuân thủ Agenda Gate DX-OS</span>
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
              {metrics.onTimePunctualRate}%
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
              Xuất sắc
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <MatIcon name="speed" className="text-emerald-500 text-[14px]" />
            <span>Thời lượng TB: 38.5 phút / cuộc</span>
          </p>
        </div>

        {/* Card 3: Thực thi tác vụ MoM */}
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
              {metrics.taskExecutionRate}%
            </span>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-md">
              +6.2%
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <MatIcon name="task_alt" className="text-purple-500 text-[14px]" />
            <span>142/155 việc hoàn thành đúng hạn</span>
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
              {metrics.hoursSavedByAi || 38.5}
            </span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md">
              Giờ làm việc
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <MatIcon name="psychology" className="text-amber-500 text-[14px]" />
            <span>Tự động tạo MoM & trích xuất việc</span>
          </p>
        </div>
      </div>

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
                    LIVE RADAR ({liveMeetings.length} PHÒNG)
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Đặc quyền Giám sát Tối cao: Dự thính âm thanh kiểm toán hoặc tham gia điều hành trực tiếp
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <MatIcon name="sensors" className="text-emerald-500 text-[16px] animate-pulse" />
              <span>WebRTC SFU 12ms</span>
            </div>
          </div>

          {/* Active Meeting Cards Matrix */}
          <div className="mt-5 space-y-4 flex-1">
            {liveMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/70 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Meeting Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {meeting.department}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {meeting.title}
                      </h4>
                      {meeting.hasAgenda !== false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          <MatIcon name="check_circle" className="text-[12px]" />
                          <span>Agenda Gate OK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                          <MatIcon name="warning" className="text-[12px]" />
                          <span>Thiếu Agenda</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        <MatIcon name="schedule" className="text-[14px]" />
                        <span>{meeting.duration || `${meeting.durationMinutes} phút`}</span>
                      </span>
                      <span>•</span>
                      <span>Chủ trì: <strong className="text-slate-700 dark:text-slate-300">{meeting.hostName}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <MatIcon name="group" className="text-[14px]" />
                        <span>{meeting.participantsCount || meeting.participantCount} người tham gia</span>
                      </span>
                    </div>

                    {/* Participants Avatars + Soundwave Simulation */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {(meeting.participants || [meeting.hostAvatar]).map((avatar: string, idx: number) => (
                          <img
                            key={idx}
                            src={avatar}
                            alt="Thành viên"
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                          />
                        ))}
                      </div>

                      {/* Equalizer Waveform */}
                      <div className="flex items-center gap-0.5 h-4 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="w-0.5 h-3 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="w-0.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-75" />
                        <span className="w-0.5 h-2.5 bg-emerald-500 rounded-full animate-pulse delay-150" />
                        <span className="w-0.5 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono ml-1">
                          STT LIVE
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Action Buttons: Silent Audit vs Executive Intervene */}
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    {/* Silent Audit button */}
                    <button
                      onClick={() => onQuickJoin(meeting, "audit")}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all active:scale-95"
                      title="Dự thính âm thanh ẩn danh để kiểm toán chất lượng cuộc họp mà không bật mic/camera"
                    >
                      <MatIcon name="headset_mic" className="text-[16px] text-blue-600 dark:text-blue-400" />
                      <span>Dự thính Ẩn danh</span>
                    </button>

                    {/* Executive Intervene button */}
                    <button
                      onClick={() => onQuickJoin(meeting, "intervene")}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95"
                      title="Tham gia phòng họp với quyền Chủ tọa Lãnh đạo cao nhất"
                    >
                      <MatIcon name="record_voice_over" className="text-[16px]" />
                      <span>Vào Điều hành</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Protocol security note */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tất cả dữ liệu được truyền qua kênh WebRTC mã hóa E2EE</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <MatIcon name="verified_user" className="text-[14px]" />
              <span>AI Protocol Active</span>
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
                94.8% Tuân thủ
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hệ thống giám sát tự động của Qwen 2.5 AI đảm bảo mọi cuộc họp đều có Agenda rõ ràng và trích xuất Action Items.
            </p>

            {/* Checklist */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <MatIcon name="check_circle" filled className="text-emerald-500 text-[16px]" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Cổng Agenda 15 phút
                  </span>
                </div>
                <span className="font-bold text-emerald-600">Đang bật</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <MatIcon name="check_circle" filled className="text-emerald-500 text-[16px]" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Trợ lý Ghi chép MoM AI
                  </span>
                </div>
                <span className="font-bold text-emerald-600">Tự động</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <MatIcon name="warning" filled className="text-amber-500 text-[16px]" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Khách ngoài Workspace
                  </span>
                </div>
                <span className="font-bold text-amber-600">Phòng chờ</span>
              </div>
            </div>
          </div>

          {/* Quick Infrastructure Health Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <MatIcon name="dns" filled className="text-blue-500 text-[18px]" />
              <span>Hạ Tầng Họp Trực Tuyến</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">LiveKit WebRTC SFU</span>
                <span className="font-mono font-bold text-emerald-600">Online (12ms)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[98%]" />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">PostgreSQL Core Database</span>
                <span className="font-mono font-bold text-emerald-600">Khỏe mạnh</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[100%]" />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">Qwen 2.5 AI MoM Worker</span>
                <span className="font-mono font-bold text-emerald-600">Sẵn sàng (GPU 28%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[72%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
