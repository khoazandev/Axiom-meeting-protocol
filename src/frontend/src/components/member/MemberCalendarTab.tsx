'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Grid,
  List,
} from 'lucide-react';
import { meetingsApi, meetingApi, Meeting } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { resolveMeetingState, getMeetingStateBadge, MeetingState } from '@/lib/meetingState';

interface MemberCalendarTabProps {
  onNotify: (msg: string) => void;
}

interface CalendarDayColumn {
  dayName: string;
  dayShort: string;
  dateStr: string;
  fullDate: Date;
  isToday: boolean;
}

export function MemberCalendarTab({ onNotify }: MemberCalendarTabProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Smooth Scroll Refs & Loop for Grid Navigation Arrows
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Selected Meeting Modal State
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isAgendaExpanded, setIsAgendaExpanded] = useState(false);

  // Auto-scroll loop when hovering on left/right end arrows
  const startAutoScroll = (direction: 'left' | 'right') => {
    stopAutoScroll();
    const speed = direction === 'left' ? -8 : 8;
    const scrollStep = () => {
      if (gridScrollRef.current) {
        gridScrollRef.current.scrollLeft += speed;
      }
      animFrameRef.current = requestAnimationFrame(scrollStep);
    };
    animFrameRef.current = requestAnimationFrame(scrollStep);
  };

  const stopAutoScroll = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const stepScroll = (direction: 'left' | 'right') => {
    stopAutoScroll();
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollBy({
        left: direction === 'left' ? -380 : 380,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const isHighLevelMeeting = (m: Meeting) => {
    if (!m.department_id) return true;
    const typeUpper = ((m as any).meeting_type || '').toUpperCase();
    if (typeUpper === 'EXECUTIVE' || typeUpper === 'BOARD') return true;
    const titleLower = (m.title || '').toLowerCase();
    return (
      titleLower.includes('cấp cao') ||
      titleLower.includes('ban điều hành') ||
      titleLower.includes('hội nghị ban')
    );
  };

  // Fetch live meetings for member
  const loadCalendarMeetings = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await meetingApi.listWithFilters();
      if (data && Array.isArray(data)) {
        setMeetings(data.filter((m) => !isHighLevelMeeting(m)));
      } else {
        const fallback = await meetingsApi.list(0, 100);
        setMeetings((fallback || []).filter((m) => !isHighLevelMeeting(m)));
      }
    } catch (err) {
      console.error('Failed to load meetings for member calendar:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarMeetings(true);
    const interval = setInterval(() => {
      loadCalendarMeetings(false);
    }, 4000);
    const handleFocus = () => {
      loadCalendarMeetings(false);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.department_id]);

  // Compute Current Week Days
  const weekDays: CalendarDayColumn[] = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
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

  // Priority order: LIVE (1) -> UPCOMING (2) -> ENDED (3)
  const STATE_ORDER: Record<MeetingState, number> = {
    LIVE: 1,
    UPCOMING: 2,
    ENDED: 3,
  };

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const orderA = STATE_ORDER[resolveMeetingState(a)] || 99;
      const orderB = STATE_ORDER[resolveMeetingState(b)] || 99;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = new Date(a.scheduled_at || a.started_at || a.created_at || 0).getTime();
      const timeB = new Date(b.scheduled_at || b.started_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [meetings]);

  const renderMeetingStateBadge = (mtg: Meeting, isCompact = false) => {
    const state = resolveMeetingState(mtg);
    if (isCompact) {
      if (state === 'LIVE') {
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-emerald-500 text-white uppercase shrink-0 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-white animate-ping" />
            <span>LIVE</span>
          </span>
        );
      }
      if (state === 'UPCOMING') {
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 shrink-0">
            SẮP TỚI
          </span>
        );
      }
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          KẾT THÚC
        </span>
      );
    }
    const badge = getMeetingStateBadge(state);
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${badge.color}`}
      >
        {state === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
        {state === 'UPCOMING' && <Clock size={10} />}
        {state === 'ENDED' && <CheckCircle2 size={10} />}
        <span>{badge.label}</span>
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
              Lịch Trình Họp & Kế Hoạch Phòng Ban
            </h2>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {viewMode === 'grid'
                ? `${weekDays[0]?.dateStr} - ${weekDays[6]?.dateStr}`
                : `${sortedMeetings.length} cuộc họp`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi các phiên họp do Quản lý tổ chức và tham gia đúng giờ. Nhấp vào cuộc họp để xem
            chi tiết hoặc tải Agenda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dual View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Grid size={14} />
              <span>Lưới Tuần</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List size={14} />
              <span>Danh Sách</span>
            </button>
          </div>

          {/* Week Navigator Controls (Only in Grid Mode) */}
          {viewMode === 'grid' && (
            <div className="flex items-center gap-1.5">
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
                Tuần Này
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
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Đang đồng bộ dữ liệu lịch họp...</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── DẠNG 1: LƯỚI TUẦN VỚI 2 MŨI TÊN LƯỚT MƯỢT Ở 2 ĐẦU ── */
        <div className="relative group">
          {/* Mũi tên lướt lùi ở đầu */}
          <button
            type="button"
            onMouseEnter={() => startAutoScroll('left')}
            onMouseLeave={stopAutoScroll}
            onClick={() => stepScroll('left')}
            className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-xl text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:scale-110 cursor-pointer backdrop-blur-xs absolute -left-4 top-1/2 -translate-y-1/2 z-20"
            title="Rê chuột hoặc nhấp để lướt lùi sang trái"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>

          {/* Mũi tên lướt tới ở cuối */}
          <button
            type="button"
            onMouseEnter={() => startAutoScroll('right')}
            onMouseLeave={stopAutoScroll}
            onClick={() => stepScroll('right')}
            className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-xl text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:scale-110 cursor-pointer backdrop-blur-xs absolute -right-4 top-1/2 -translate-y-1/2 z-20"
            title="Rê chuột hoặc nhấp để lướt tới sang phải"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

          {/* Container lưới tuần cuộn mượt */}
          <div
            ref={gridScrollRef}
            className="overflow-x-auto custom-scrollbar pb-3 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
          >
            <div className="grid grid-cols-7 gap-3 min-w-[1260px]">
              {weekDays.map((day) => {
                const dayMeetings = meetingsByDay[day.dateStr] || [];

                return (
                  <div
                    key={day.dateStr}
                    className={`rounded-2xl border p-3 min-h-[380px] flex flex-col transition-all ${
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
                        <div className="h-28 flex items-center justify-center text-slate-400 dark:text-slate-600 text-[11px] italic text-center">
                          Không có cuộc họp
                        </div>
                      ) : (
                        dayMeetings.map((mtg) => {
                          const state = resolveMeetingState(mtg);
                          const isLive = state === 'LIVE';
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
                                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                                  <Clock size={10} />
                                  <span>{timeStr}</span>
                                </span>
                                {renderMeetingStateBadge(mtg, true)}
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
          </div>
        </div>
      ) : (
        /* ── DẠNG 2: DANH SÁCH CÁC CUỘC HỌP ── */
        <div className="space-y-3.5">
          {sortedMeetings.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Không có cuộc họp nào
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Chưa có phiên họp nào được lên lịch trong phòng ban.
              </p>
            </div>
          ) : (
            sortedMeetings.map((mtg) => {
              const state = resolveMeetingState(mtg);
              const badge = getMeetingStateBadge(state);
              const isLive = state === 'LIVE';
              const isEnded = state === 'ENDED';
              const scheduledDate = mtg.scheduled_at ? new Date(mtg.scheduled_at) : null;
              const dateFormatted = scheduledDate
                ? scheduledDate.toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Thời gian linh hoạt';
              const timeFormatted = scheduledDate
                ? scheduledDate.toLocaleTimeString('vi-VN', {
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
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md ${
                    isLive
                      ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isLive
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                      }`}
                    >
                      <Video size={22} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderMeetingStateBadge(mtg)}
                        <span className="text-xs font-mono font-bold text-slate-400">
                          MÃ: {mtg.id.slice(0, 8)}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                        {mtg.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon size={13} className="text-slate-400" />
                          <span>
                            {dateFormatted} lúc {timeFormatted}
                          </span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <Users size={13} className="text-slate-400" />
                          <span>Chủ trì: {mtg.host_name || 'Trưởng Phòng'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAgenda(mtg);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Tải Agenda cuộc họp"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">Agenda</span>
                    </button>

                    {isLive ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/meetings/${mtg.id}`);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Vào Phòng Họp</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/meetings/${mtg.id}`);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink size={13} />
                        <span>{isEnded ? 'Xem Bản Ghi' : 'Vào Sớm'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MODAL CHI TIẾT CUỘC HỌP & AGENDA ── */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {renderMeetingStateBadge(selectedMeeting)}
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {selectedMeeting.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                  {selectedMeeting.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Người Chủ Trì
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedMeeting.host_name || 'Trưởng Phòng'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Thời Gian Lên Lịch
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {selectedMeeting.scheduled_at
                      ? new Date(selectedMeeting.scheduled_at).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : 'Linh hoạt'}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase text-[10.5px]">
                    Nội Dung Chương Trình (Agenda)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAgendaExpanded(!isAgendaExpanded)}
                    className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    {isAgendaExpanded ? 'Thu gọn' : 'Xem toàn bộ'}
                  </button>
                </div>
                <div
                  className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap ${
                    isAgendaExpanded ? 'max-h-80 overflow-y-auto' : 'line-clamp-4'
                  }`}
                >
                  {selectedMeeting.agenda ||
                    selectedMeeting.description ||
                    'Chưa cập nhật chi tiết chương trình họp. Cuộc họp thảo luận định hướng chuyên môn.'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-3">
              <button
                type="button"
                onClick={() => handleDownloadAgenda(selectedMeeting)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Tải Agenda (.md)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  router.push(`/meetings/${selectedMeeting.id}`);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ExternalLink size={14} />
                <span>Tham Gia Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
