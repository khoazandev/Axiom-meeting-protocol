'use client';

import React, { useState, useMemo } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { TimelineGanttItem, DepartmentProgressItem } from '@/lib/api';
import { AxiomSelect } from '@/components/ui/AxiomSelect';

interface DepartmentCalendarViewProps {
  departments: DepartmentProgressItem[];
  tasks: TimelineGanttItem[];
  onRefresh?: () => void;
}

interface CalendarDayInfo {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0 = Su, 1 = Mo, ..., 6 = Sa
}

interface WeekTaskSpan {
  task: TimelineGanttItem;
  colStart: number; // 0 to 6
  colSpan: number;  // 1 to 7
  isStartOfTask: boolean;
  isEndOfTask: boolean;
  progress: number;
  deptColor: string;
  deptCode: string;
}

export function DepartmentCalendarView({
  departments,
  tasks,
  onRefresh,
}: DepartmentCalendarViewProps) {
  // Current calendar month view state
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<TimelineGanttItem | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const prevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const nextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const goToToday = () => {
    const d = new Date();
    d.setDate(1);
    setCurrentDate(d);
  };

  const handleMonthChange = (newMonthStr: string) => {
    const m = parseInt(newMonthStr, 10);
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(m);
      return d;
    });
  };

  const handleYearChange = (newYearStr: string) => {
    const y = parseInt(newYearStr, 10);
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setFullYear(y);
      return d;
    });
  };

  const goToQuarter = (quarterNum: number) => {
    const qMonth = (quarterNum - 1) * 3;
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(qMonth);
      return d;
    });
  };

  // Department symbols legend & color mapping
  const deptLegends = [
    { code: 'ENG', name: 'Kỹ thuật', color: '#2563EB' },
    { code: 'PROD', name: 'Sản phẩm', color: '#8B5CF6' },
    { code: 'BIZ', name: 'Kinh doanh', color: '#EC4899' },
    { code: 'OPS', name: 'Vận hành', color: '#10B981' },
    { code: 'FIN', name: 'Tài chính', color: '#F59E0B' },
  ];

  const getDeptColor = (task: TimelineGanttItem) => {
    if (task.department_color) return task.department_color;
    const code = (task.department_code || '').toUpperCase();
    const found = deptLegends.find((l) => l.code === code);
    if (found) return found.color;
    const name = (task.department_name || '').toLowerCase();
    if (name.includes('kỹ thuật') || name.includes('eng')) return '#2563EB';
    if (name.includes('sản phẩm') || name.includes('prod')) return '#8B5CF6';
    if (name.includes('kinh doanh') || name.includes('biz')) return '#EC4899';
    if (name.includes('vận hành') || name.includes('ops')) return '#10B981';
    if (name.includes('tài chính') || name.includes('fin')) return '#F59E0B';
    return '#3B82F6';
  };

  const getDeptCode = (task: TimelineGanttItem) => {
    if (task.department_code) return task.department_code.toUpperCase();
    const name = (task.department_name || '').toLowerCase();
    if (name.includes('kỹ thuật') || name.includes('eng')) return 'ENG';
    if (name.includes('sản phẩm') || name.includes('prod')) return 'PROD';
    if (name.includes('kinh doanh') || name.includes('biz')) return 'BIZ';
    if (name.includes('vận hành') || name.includes('ops')) return 'OPS';
    if (name.includes('tài chính') || name.includes('fin')) return 'FIN';
    return 'AXM';
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchDept = selectedDeptFilter === 'ALL' || t.department_id === selectedDeptFilter;
      const matchStatus = selectedStatusFilter === 'ALL' || t.status === selectedStatusFilter;
      return matchDept && matchStatus;
    });
  }, [tasks, selectedDeptFilter, selectedStatusFilter]);

  // Generate 42 calendar days starting on Sunday (Su Mo Tu We Th Fr Sa matching the design)
  const calendarDays: CalendarDayInfo[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    // Sunday is index 0
    const startDayOfWeek = firstDayOfMonth.getDay();

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const days: CalendarDayInfo[] = [];
    const cur = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const isCurMonth = cur.getMonth() === month;
      const isTod =
        cur.getDate() === today.getDate() &&
        cur.getMonth() === today.getMonth() &&
        cur.getFullYear() === today.getFullYear();

      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      days.push({
        date: new Date(cur),
        dateStr,
        dayNumber: cur.getDate(),
        isCurrentMonth: isCurMonth,
        isToday: isTod,
        dayOfWeek: cur.getDay(),
      });

      cur.setDate(cur.getDate() + 1);
    }

    return days;
  }, [year, month]);

  // Group 42 days into 6 week rows of 7 days each (Su -> Sa)
  const weeks = useMemo(() => {
    const result: CalendarDayInfo[][] = [];
    for (let i = 0; i < 42; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  // For each week, calculate multi-day spanning task pill tracks
  const weekSpans = useMemo(() => {
    return weeks.map((weekDays) => {
      const weekStartStr = weekDays[0].dateStr;
      const weekEndStr = weekDays[6].dateStr;

      const spansInWeek: WeekTaskSpan[] = [];

      filteredTasks.forEach((task) => {
        const taskStart = task.start_date.slice(0, 10);
        const taskDue = task.due_date.slice(0, 10);

        // Does this task intersect with this week?
        if (taskDue >= weekStartStr && taskStart <= weekEndStr) {
          // Find column start in this week (0 to 6)
          let colStart = 0;
          if (taskStart >= weekStartStr) {
            const idx = weekDays.findIndex((d) => d.dateStr === taskStart);
            if (idx !== -1) colStart = idx;
          }

          // Find column end in this week (0 to 6)
          let colEnd = 6;
          if (taskDue <= weekEndStr) {
            const idx = weekDays.findIndex((d) => d.dateStr === taskDue);
            if (idx !== -1) colEnd = idx;
          }

          const colSpan = colEnd - colStart + 1;
          const isStartOfTask = taskStart >= weekStartStr;
          const isEndOfTask = taskDue <= weekEndStr;

          // Progress percentage
          let prog = task.progress_percent ?? (task.status === 'DONE' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0);
          if (task.status === 'DONE') prog = 100;

          spansInWeek.push({
            task,
            colStart,
            colSpan,
            isStartOfTask,
            isEndOfTask,
            progress: prog,
            deptColor: getDeptColor(task),
            deptCode: getDeptCode(task),
          });
        }
      });

      // Sort spans by start column and duration
      spansInWeek.sort((a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan);

      return spansInWeek;
    });
  }, [weeks, filteredTasks]);

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];

  const weekDayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const monthSelectOptions = monthNames.map((name, idx) => ({
    value: String(idx),
    label: name,
  }));

  const yearSelectOptions = [
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' },
  ];

  const deptSelectOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'Tất cả khối' },
      ...departments.map((d) => ({ value: d.id, label: d.name })),
    ];
  }, [departments]);

  const statusSelectOptions = [
    { value: 'ALL', label: 'Tất cả tiến độ' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'DONE', label: 'Đã hoàn thành' },
    { value: 'TODO', label: 'Chưa bắt đầu' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── TOP TOOLBAR: MONTH/YEAR PICKER & SIMPLE CONTROLS ── */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: Quick Date & Month/Year Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Previous / Today / Next buttons */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
              title="Tháng trước"
            >
              <MatIcon name="chevron_left" className="text-[18px]" />
            </button>

            <button
              type="button"
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
            >
              Hôm nay
            </button>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
              title="Tháng sau"
            >
              <MatIcon name="chevron_right" className="text-[18px]" />
            </button>
          </div>

          {/* Month Selector */}
          <AxiomSelect
            value={String(month)}
            onChange={handleMonthChange}
            options={monthSelectOptions}
            width="110px"
            size="md"
          />

          {/* Year Selector */}
          <AxiomSelect
            value={String(year)}
            onChange={handleYearChange}
            options={yearSelectOptions}
            width="90px"
            size="md"
          />

          {/* Quarter buttons */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700 text-xs font-bold">
            {[1, 2, 3, 4].map((q) => {
              const isActive = Math.floor(month / 3) + 1 === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => goToQuarter(q)}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Q{q}
                </button>
              );
            })}
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
            {filteredTasks.length} nhiệm vụ
          </span>
        </div>

        {/* Right: Department and Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <AxiomSelect
            value={selectedDeptFilter}
            onChange={setSelectedDeptFilter}
            options={deptSelectOptions}
            width="170px"
            size="md"
          />

          <AxiomSelect
            value={selectedStatusFilter}
            onChange={setSelectedStatusFilter}
            options={statusSelectOptions}
            width="150px"
            size="md"
          />

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Làm mới"
            >
              <MatIcon name="refresh" className="text-[18px]" />
            </button>
          )}
        </div>
      </div>

      {/* ── DEPARTMENT IDENTIFIER LEGEND BAR ── */}
      <div className="bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <MatIcon name="label" className="text-[16px] text-slate-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Khối ban:</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {deptLegends.map((d) => (
            <div key={d.code} className="flex items-center gap-1.5">
              <span
                className="px-1.5 py-0.5 rounded-md text-[10px] font-black text-white"
                style={{ backgroundColor: d.color }}
              >
                {d.code}
              </span>
              <span className="text-slate-600 dark:text-slate-400 text-xs">{d.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CALENDAR VIEW (100% MATCHING THE ATTACHED DESIGN) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Days of Week Header: Su, Mo, Tu, We, Th, Fr, Sa */}
        <div className="grid grid-cols-7 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {weekDayHeaders.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-3 text-center text-xs font-semibold tracking-wide ${
                idx === 0 || idx === 6
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* 6 Week Rows with Spanning Multi-Day Continuous Task Pills */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {weeks.map((weekDays, weekIdx) => {
            const spans = weekSpans[weekIdx];

            return (
              <div key={weekIdx} className="relative min-h-[115px] flex flex-col border-b border-slate-100 dark:border-slate-800/80 last:border-b-0">
                {/* Dedicated Top Row: Date Numbers for each day */}
                <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800/80 border-b border-slate-100/70 dark:border-slate-800/70 bg-slate-50/20 dark:bg-slate-900/20">
                  {weekDays.map((dayInfo) => {
                    const dayFormatted = String(dayInfo.dayNumber).padStart(2, '0');

                    return (
                      <div
                        key={dayInfo.dateStr}
                        className={`py-1.5 px-2 text-right transition-colors ${
                          dayInfo.isToday
                            ? 'bg-blue-50/80 dark:bg-blue-950/40'
                            : dayInfo.isCurrentMonth
                            ? 'bg-transparent'
                            : 'bg-slate-50/40 dark:bg-slate-950/30'
                        }`}
                      >
                        <span
                          className={`text-xs inline-block ${
                            dayInfo.isToday
                              ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                              : dayInfo.isCurrentMonth
                              ? 'text-slate-700 dark:text-slate-200 font-medium'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        >
                          {dayFormatted}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Background Column Dividers for Task Area */}
                <div className="absolute inset-0 top-8 grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800/80 pointer-events-none">
                  {weekDays.map((dayInfo) => (
                    <div
                      key={`col-${dayInfo.dateStr}`}
                      className={`h-full ${
                        dayInfo.isToday ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    />
                  ))}
                </div>

                {/* Foreground Task Tracks: Spans across days as continuous rounded pills */}
                <div className="relative z-10 py-2 px-1 space-y-1.5 flex-1 min-h-[75px]">
                  {spans.map((span, spanIdx) => {
                    const { task, colStart, colSpan, isStartOfTask, isEndOfTask, progress, deptColor, deptCode } = span;

                    const isDone = progress === 100;
                    const isTodo = progress === 0;
                    const isPartial = progress > 0 && progress < 100;

                    return (
                      <div
                        key={`${task.id}-${spanIdx}`}
                        className="grid grid-cols-7 gap-0"
                      >
                        <div
                          style={{
                            gridColumnStart: colStart + 1,
                            gridColumnEnd: colStart + colSpan + 1,
                          }}
                          className="px-0.5"
                        >
                          <div
                            onClick={() => setSelectedTaskForModal(task)}
                            title={`[${deptCode}] ${task.title} • Tiến độ: ${progress}% • ${task.status}`}
                            className={`group relative h-6 sm:h-7 flex items-center px-2 cursor-pointer shadow-xs transition-transform hover:scale-[1.01] overflow-hidden select-none border border-black/5 dark:border-white/5 ${
                              isStartOfTask ? 'rounded-l-full' : 'rounded-l-none'
                            } ${isEndOfTask ? 'rounded-r-full' : 'rounded-r-none'}`}
                          >
                            {/* Finished portion in Department Color */}
                            <div
                              className="absolute inset-y-0 left-0 transition-all pointer-events-none"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: deptColor,
                              }}
                            />

                            {/* Remaining Unfinished portion in SOLID NEUTRAL GRAY (as requested) */}
                            {progress < 100 && (
                              <div
                                className="absolute inset-y-0 right-0 bg-slate-300 dark:bg-slate-700 transition-all pointer-events-none"
                                style={{
                                  width: `${100 - progress}%`,
                                }}
                              />
                            )}

                            {/* Divider seam between finished color & unfinished gray */}
                            {isPartial && (
                              <div
                                className="absolute inset-y-0 w-0.5 bg-black/20 dark:bg-white/20 z-10 pointer-events-none"
                                style={{ left: `${progress}%` }}
                              />
                            )}

                            {/* Task Content: Department Code + Title + Progress */}
                            <div className="relative z-20 flex items-center gap-1.5 min-w-0 w-full">
                              <span
                                className="text-[9px] font-black px-1.5 py-0.5 rounded text-white shrink-0 uppercase shadow-2xs"
                                style={{
                                  backgroundColor: isTodo ? deptColor : 'rgba(0,0,0,0.3)',
                                }}
                              >
                                {deptCode}
                              </span>

                              <span
                                className={`text-[11px] sm:text-xs font-semibold truncate ${
                                  isTodo
                                    ? 'text-slate-800 dark:text-slate-100'
                                    : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]'
                                }`}
                              >
                                {task.title}
                              </span>

                              {/* Unfinished percentage indicator if partially complete */}
                              {isPartial && (
                                <span className="ml-auto text-[9.5px] font-extrabold text-slate-800 dark:text-slate-100 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.2 rounded shrink-0 shadow-2xs">
                                  {progress}%
                                </span>
                              )}
                              {isDone && (
                                <span className="ml-auto text-[11px] text-white/90 shrink-0 font-bold">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TASK DETAIL MODAL ── */}
      {selectedTaskForModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedTaskForModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 text-slate-900 dark:text-white space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="px-2 py-0.5 rounded-lg text-xs font-black text-white"
                    style={{ backgroundColor: getDeptColor(selectedTaskForModal) }}
                  >
                    [{getDeptCode(selectedTaskForModal)}]
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    {selectedTaskForModal.key}
                  </span>
                </div>
                <h3 className="text-base font-bold leading-snug">
                  {selectedTaskForModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForModal(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <MatIcon name="close" className="text-[20px]" />
              </button>
            </div>

            {/* Progress Bar with Colored Finished Portion & Gray Remaining Portion */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Tiến độ công việc</span>
                <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                  {selectedTaskForModal.progress_percent ?? (selectedTaskForModal.status === 'DONE' ? 100 : selectedTaskForModal.status === 'IN_PROGRESS' ? 50 : 0)}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${selectedTaskForModal.progress_percent ?? (selectedTaskForModal.status === 'DONE' ? 100 : selectedTaskForModal.status === 'IN_PROGRESS' ? 50 : 0)}%`,
                    backgroundColor: getDeptColor(selectedTaskForModal),
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Phần đã làm (Màu khối)</span>
                <span>Phần chưa xong (Màu xám)</span>
              </div>
            </div>

            {/* Task Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Khối phòng ban</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedTaskForModal.department_name}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Người phụ trách</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  {selectedTaskForModal.assignee_avatar && (
                    <img
                      src={selectedTaskForModal.assignee_avatar}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  )}
                  <span>{selectedTaskForModal.assignee_name || 'Chưa giao'}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Thời gian bắt đầu</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {selectedTaskForModal.start_date.slice(0, 10)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Hạn chót (Due Date)</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {selectedTaskForModal.due_date.slice(0, 10)}
                </span>
              </div>
            </div>

            {selectedTaskForModal.description && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Ghi chú nhiệm vụ</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedTaskForModal.description}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTaskForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
