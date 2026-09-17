'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Users,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  CheckCircle2,
  ExternalLink,
  Play,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { meetingsApi, meetingApi, Meeting } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { generateInitialsAvatar } from '@/components/profile/UserProfileModal';

interface ManagerCalendarTabProps {
  onNotify: (msg: string) => void;
}

interface CalendarDayColumn {
  dayName: string;
  dayShort: string;
  dateStr: string;
  fullDate: Date;
  isToday: boolean;
}

export function ManagerCalendarTab({ onNotify }: ManagerCalendarTabProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  // Selected Meeting Modal State
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isAgendaExpanded, setIsAgendaExpanded] = useState(false);

  // Fetch real meetings
  useEffect(() => {
    loadCalendarMeetings();
  }, [user?.department_id]);

  const loadCalendarMeetings = async () => {
    setIsLoading(true);
    try {
      const data = await meetingApi.listWithFilters({
        department_id: user?.department_id || undefined,
      });
      if (data && Array.isArray(data)) {
        setMeetings(data);
      } else {
        const fallback = await meetingsApi.list(0, 100);
        setMeetings(fallback);
      }
    } catch (err) {
      console.error('Failed to load meetings for calendar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute Current Week Days
  const weekDays: CalendarDayColumn[] = useMemo(() => {
    const today = new Date();
    // Monday of current week
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon ...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + weekOffset * 7);

    const dayNames = [
      { name: 'Thứ Hai', short: 'T2' },
      { name: 'Thứ Ba', short: 'T3' },
      { name: 'Thứ Tư', short: 'T4' },
      { name: 'Thứ Năm', short: 'T5' },
      { name: 'Thứ Sáu', short: 'T6' },
      { name: 'Thứ Bảy', short: 'T7' },
      { name: 'Chủ Nhật', short: 'CN' },
    ];

    return dayNames.map((d, index) => {
      const dDate = new Date(monday);
      dDate.setDate(monday.getDate() + index);

      const isToday =
        dDate.getDate() === today.getDate() &&
        dDate.getMonth() === today.getMonth() &&
        dDate.getFullYear() === today.getFullYear();

      const dateFormatted = `${String(dDate.getDate()).padStart(2, '0')}/${String(
        dDate.getMonth() + 1
      ).padStart(2, '0')}`;

      return {
        dayName: d.name,
        dayShort: d.short,
        dateStr: dateFormatted,
        fullDate: dDate,
        isToday,
      };
    });
  }, [weekOffset]);

  // Group meetings by day of the current week
  const meetingsByDay = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    weekDays.forEach((day) => {
      map[day.dateStr] = [];
    });

    meetings.forEach((m) => {
      const rawDate = m.scheduled_at || m.started_at || m.created_at;
      if (!rawDate) return;
      const d = new Date(rawDate);
      const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(
        d.getMonth() + 1
      ).padStart(2, '0')}`;

      if (map[dateFormatted]) {
        map[dateFormatted].push(m);
      }
    });

    return map;
  }, [meetings, weekDays]);

  // Handle Download Agenda
  const handleDownloadAgenda = (mtg: Meeting) => {
    const content =
      mtg.agenda ||
      mtg.description ||
      `# Agenda: ${mtg.title}\nChủ trì: ${mtg.host_name || 'Trưởng Phòng'}\nThời gian: ${mtg.scheduled_at || 'Theo yêu cầu'}\n\nNội dung: Thảo luận tiến độ và phân chia công việc.`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = (mtg.title || 'Agenda').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${sanitizedTitle}_Agenda.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onNotify(`Đã tải xuống Agenda cuộc họp: "${mtg.title}"`);
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'LIVE') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white animate-pulse">
          LIVE
        </span>
      );
    }
    if (s === 'ENDED' || s === 'COMPLETED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          ĐÃ KẾT THÚC
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        LÊN LỊCH
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Lịch Trình Họp Phòng Ban
            </h2>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {weekDays[0]?.dateStr} - {weekDays[6]?.dateStr}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi và điều phối các phiên họp theo tuần. Nhấp vào cuộc họp để xem chi tiết hoặc
            tải Agenda.
          </p>
        </div>

        {/* Week Navigator Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Tuần trước"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Tuần Hiện Tại
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Tuần sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── 7-Day Weekly Calendar Grid ── */}
      {isLoading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Đang đồng bộ dữ liệu lịch họp...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayMeetings = meetingsByDay[day.dateStr] || [];

            return (
              <div
                key={day.dateStr}
                className={`rounded-2xl border p-3 min-h-[360px] flex flex-col transition-all ${
                  day.isToday
                    ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 ring-1 ring-blue-200 dark:ring-blue-900/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* Column Day Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                      {day.dayName}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {day.dateStr}
                    </span>
                  </div>

                  {day.isToday && (
                    <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase">
                      Hôm nay
                    </span>
                  )}
                </div>

                {/* Day Meetings List */}
                <div className="space-y-2.5 flex-1">
                  {dayMeetings.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-slate-400 dark:text-slate-600 text-[11px] italic text-center">
                      Không có cuộc họp
                    </div>
                  ) : (
                    dayMeetings.map((mtg) => {
                      const isLive = (mtg.status || '').toUpperCase() === 'LIVE';
                      const timeStr = mtg.scheduled_at
                        ? new Date(mtg.scheduled_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '14:00';

                      return (
                        <div
                          key={mtg.id}
                          onClick={() => {
                            setSelectedMeeting(mtg);
                            setIsAgendaExpanded(false);
                          }}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all space-y-1.5 ${
                            isLive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 hover:shadow-md'
                              : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock size={10} />
                              <span>{timeStr}</span>
                            </span>
                            {getStatusBadge(mtg.status)}
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                            {mtg.title}
                          </h4>

                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700/50">
                            <span className="truncate max-w-[90px]">
                              {mtg.host_name || 'Trưởng Phòng'}
                            </span>
                            <span className="flex items-center gap-0.5 font-bold">
                              <Users size={10} />
                              <span>{mtg.participant_count || 1}</span>
                            </span>
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
      )}

      {/* ── MODAL CHI TIẾT CUỘC HỌP & AGENDA ── */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl space-y-5 my-8">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(selectedMeeting.status)}
                  <span className="text-xs font-mono text-slate-400">
                    Mã phòng: {selectedMeeting.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                  {selectedMeeting.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Chủ Trì:
                </span>
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <img
                    src={
                      selectedMeeting.host_avatar ||
                      generateInitialsAvatar(selectedMeeting.host_name || 'Host')
                    }
                    alt={selectedMeeting.host_name || 'Host'}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span>{selectedMeeting.host_name || 'Trưởng Khối Kỹ Thuật'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Thời Gian Bắt Đầu:
                </span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedMeeting.scheduled_at
                    ? new Date(selectedMeeting.scheduled_at).toLocaleString('vi-VN', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })
                    : 'Bắt đầu tức thì'}
                </div>
              </div>
            </div>

            {/* Agenda Section with Truncate & Download */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-600" />
                  <span>Chương Trình Nghị Sự (Agenda)</span>
                </h4>

                <button
                  type="button"
                  onClick={() => handleDownloadAgenda(selectedMeeting)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  title="Tải xuống tệp Agenda (.md)"
                >
                  <Download size={13} />
                  <span>Tải Xuống Agenda</span>
                </button>
              </div>

              {/* Agenda Content Display */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                {selectedMeeting.agenda ? (
                  <>
                    {selectedMeeting.agenda.length > 250 && !isAgendaExpanded
                      ? `${selectedMeeting.agenda.slice(0, 250)}...`
                      : selectedMeeting.agenda}

                    {selectedMeeting.agenda.length > 250 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAgendaExpanded(!isAgendaExpanded)}
                          className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                        >
                          {isAgendaExpanded ? 'Thu gọn' : 'Xem toàn bộ...'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="italic text-slate-400">
                    Chưa có nội dung Agenda chi tiết cho cuộc họp này.
                  </span>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMeeting(null);
                  router.push(`/meetings/${selectedMeeting.id}`);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Video size={14} />
                <span>Vào Phòng Họp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
