'use client';

import React, { useState, useMemo } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { TimelineGanttItem, DepartmentProgressItem } from '@/lib/api';
import { AxiomSelect } from '@/components/ui/AxiomSelect';

interface DepartmentGanttTimelineProps {
  departments: DepartmentProgressItem[];
  timelineItems: TimelineGanttItem[];
}

export function DepartmentGanttTimeline({
  departments,
  timelineItems,
}: DepartmentGanttTimelineProps) {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [windowDays, setWindowDays] = useState<number>(21);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<TimelineGanttItem | null>(null);

  // Timeline start date state
  const [timelineStartDate, setTimelineStartDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return d;
  });

  // Shift timeline window handlers
  const shiftBackward = () => {
    setTimelineStartDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - Math.max(7, Math.floor(windowDays / 2)));
      return next;
    });
  };

  const shiftForward = () => {
    setTimelineStartDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + Math.max(7, Math.floor(windowDays / 2)));
      return next;
    });
  };

  const resetToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    setTimelineStartDate(d);
  };

  const handleMonthJump = (monthStr: string) => {
    const m = parseInt(monthStr, 10);
    setTimelineStartDate((prev) => {
      const next = new Date(prev);
      next.setMonth(m);
      next.setDate(1);
      return next;
    });
  };

  const handleYearJump = (yearStr: string) => {
    const y = parseInt(yearStr, 10);
    setTimelineStartDate((prev) => {
      const next = new Date(prev);
      next.setFullYear(y);
      return next;
    });
  };

  // Compute timeline days
  const { days, minDate, maxDate } = useMemo(() => {
    const start = new Date(timelineStartDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + windowDays);

    const dayList: Date[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      dayList.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return { days: dayList, minDate: start, maxDate: end };
  }, [timelineStartDate, windowDays]);

  const totalDays = days.length;

  const filteredItems = useMemo(() => {
    return timelineItems.filter((item) => {
      const matchDept = selectedDeptFilter === 'ALL' || item.department_id === selectedDeptFilter;
      const matchStatus = selectedStatusFilter === 'ALL' || item.status === selectedStatusFilter;
      return matchDept && matchStatus;
    });
  }, [timelineItems, selectedDeptFilter, selectedStatusFilter]);

  // Group items by department
  const groupedItems = useMemo(() => {
    const map = new Map<string, TimelineGanttItem[]>();
    departments.forEach((d) => map.set(d.id, []));

    filteredItems.forEach((item) => {
      if (!map.has(item.department_id)) {
        map.set(item.department_id, []);
      }
      map.get(item.department_id)!.push(item);
    });

    return map;
  }, [departments, filteredItems]);

  // Helper to calculate left % and width % on timeline
  const getBarPosition = (startDateStr: string, dueDateStr: string) => {
    const start = new Date(startDateStr);
    const due = new Date(dueDateStr);
    start.setHours(0, 0, 0, 0);
    due.setHours(23, 59, 59, 999);

    const minTime = minDate.getTime();
    const maxTime = maxDate.getTime();
    const totalTime = maxTime - minTime;

    const clampedStart = Math.max(start.getTime(), minTime);
    const clampedEnd = Math.min(due.getTime(), maxTime);

    if (clampedStart > maxTime || clampedEnd < minTime) {
      return { left: 0, width: 0, outOfView: true };
    }

    const leftPercent = ((clampedStart - minTime) / totalTime) * 100;
    const widthPercent = Math.max(((clampedEnd - clampedStart) / totalTime) * 100, 3.5);

    return { left: leftPercent, width: widthPercent, outOfView: false };
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const deptOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'Tất cả phòng ban' },
      ...departments.map((d) => ({ value: d.id, label: d.name })),
    ];
  }, [departments]);

  const statusOptions = [
    { value: 'ALL', label: 'Tất cả trạng thái' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'DONE', label: 'Đã hoàn thành' },
    { value: 'TODO', label: 'Chưa bắt đầu' },
  ];

  const windowOptions = [
    { value: '14', label: '14 ngày' },
    { value: '21', label: '21 ngày' },
    { value: '30', label: '30 ngày' },
    { value: '60', label: '60 ngày' },
  ];

  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];

  const monthJumpOptions = monthNames.map((name, idx) => ({
    value: String(idx),
    label: name,
  }));

  const yearJumpOptions = [
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' },
  ];

  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── TOP TOOLBAR: NAVIGATION, WINDOW & FILTERS ── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Time Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Step cluster */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={shiftBackward}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
              title="Lùi mốc thời gian"
            >
              <MatIcon name="chevron_left" className="text-[18px]" />
            </button>

            <button
              type="button"
              onClick={resetToToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
            >
              Hôm nay
            </button>

            <button
              type="button"
              onClick={shiftForward}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
              title="Tiến mốc thời gian"
            >
              <MatIcon name="chevron_right" className="text-[18px]" />
            </button>
          </div>

          {/* Direct Month Selector */}
          <AxiomSelect
            value={String(timelineStartDate.getMonth())}
            onChange={handleMonthJump}
            options={monthJumpOptions}
            width="120px"
            variant="connected"
            size="md"
          />

          {/* Direct Year Selector */}
          <AxiomSelect
            value={String(timelineStartDate.getFullYear())}
            onChange={handleYearJump}
            options={yearJumpOptions}
            width="100px"
            variant="connected"
            size="md"
          />

          {/* Window size selector */}
          <AxiomSelect
            value={String(windowDays)}
            onChange={(val) => setWindowDays(parseInt(val, 10))}
            options={windowOptions}
            width="120px"
            variant="connected"
            size="md"
          />

          {/* Date Range Banner */}
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 font-mono">
            <MatIcon name="date_range" className="text-[15px]" />
            <span>
              {formatDateLabel(minDate)} — {formatDateLabel(maxDate)}
            </span>
          </span>
        </div>

        {/* Right: Department & Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <AxiomSelect
            value={selectedDeptFilter}
            onChange={setSelectedDeptFilter}
            options={deptOptions}
            width="190px"
            variant="connected"
            size="md"
          />

          <AxiomSelect
            value={selectedStatusFilter}
            onChange={setSelectedStatusFilter}
            options={statusOptions}
            width="160px"
            variant="connected"
            size="md"
          />
        </div>
      </div>

      {/* ── LEGEND BAR WITH DEPARTMENT CODES ── */}
      <div className="bg-white/80 dark:bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
        {/* Status Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300">Đã hoàn thành</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-600 dark:text-slate-300">Đang thực hiện</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
            <span className="text-slate-600 dark:text-slate-300">Chưa bắt đầu</span>
          </div>
        </div>

        {/* Department Code Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {departments.map((d) => (
            <span
              key={d.id}
              className="px-1.5 py-0.5 rounded text-[10px] font-black text-white font-mono uppercase shadow-2xs"
              style={{ backgroundColor: d.color }}
              title={d.name}
            >
              [{d.code || d.name.slice(0, 3).toUpperCase()}]
            </span>
          ))}
        </div>
      </div>

      {/* ── GANTT ROADMAP GRID CANVAS ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[950px]">
            {/* ── TIMELINE HEADER ── */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 text-[11px] font-bold text-slate-500">
              {/* Left Column Label */}
              <div className="w-72 p-3 border-r border-slate-200 dark:border-slate-800 shrink-0 font-bold uppercase tracking-wider">
                Khối Phòng Ban & Nhiệm Vụ
              </div>

              {/* Day Columns */}
              <div
                className="flex-1 grid"
                style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))` }}
              >
                {days.map((day, idx) => {
                  const todayFlag = isToday(day);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={idx}
                      className={`text-center py-2 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center ${
                        todayFlag
                          ? 'bg-blue-100/70 dark:bg-blue-950/80 text-blue-600 font-extrabold'
                          : isWeekend
                            ? 'bg-slate-100/40 dark:bg-slate-800/20 text-slate-400'
                            : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="text-[9.5px] uppercase font-mono leading-none">
                        {day.toLocaleDateString('vi-VN', { weekday: 'narrow' })}
                      </span>
                      <span
                        className={`text-[11px] font-mono mt-0.5 ${
                          todayFlag
                            ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold'
                            : ''
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── TIMELINE ROWS GROUPED BY DEPARTMENT ── */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {departments
                .filter((d) => selectedDeptFilter === 'ALL' || d.id === selectedDeptFilter)
                .map((dept) => {
                  const deptItems = groupedItems.get(dept.id) || [];
                  const deptCode = dept.code || dept.name.slice(0, 3).toUpperCase();

                  return (
                    <div key={dept.id} className="group">
                      {/* Department Header Row */}
                      <div className="flex bg-slate-50/50 dark:bg-slate-850/30 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="w-72 p-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-black text-white uppercase font-mono shrink-0"
                              style={{ backgroundColor: dept.color }}
                            >
                              [{deptCode}]
                            </span>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {dept.name}
                            </h5>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {dept.completion_rate}%
                          </span>
                        </div>

                        {/* Background timeline grid for department header */}
                        <div
                          className="flex-1 grid relative"
                          style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))` }}
                        >
                          {days.map((day, idx) => (
                            <div
                              key={idx}
                              className={`border-r border-slate-100 dark:border-slate-800/30 ${
                                isToday(day) ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Items rows in this department */}
                      {deptItems.length === 0 ? (
                        <div className="flex py-3 text-xs text-slate-400 italic px-4 border-b border-slate-100 dark:border-slate-800/40">
                          Không có công việc nào trong khung thời gian này
                        </div>
                      ) : (
                        deptItems.map((item) => {
                          const pos = getBarPosition(item.start_date, item.due_date);
                          const taskDeptCode = item.department_code || item.key.split('-')[0];

                          return (
                            <div
                              key={item.id}
                              className="flex items-center hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100/60 dark:border-slate-800/40 text-xs"
                            >
                              {/* Left Task Summary */}
                              <div className="w-72 p-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="px-1 py-0.2 rounded text-[8.5px] font-black text-white font-mono uppercase shrink-0"
                                      style={{
                                        backgroundColor: item.department_color || '#3B82F6',
                                      }}
                                    >
                                      {taskDeptCode}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                                      {item.key}
                                    </span>
                                    <p
                                      className="font-semibold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600"
                                      title={item.title}
                                      onClick={() => setSelectedTaskForModal(item)}
                                    >
                                      {item.title}
                                    </p>
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                                    <span className="truncate max-w-[100px] font-medium text-slate-600 dark:text-slate-300">
                                      {item.assignee_name || 'Chưa giao'}
                                    </span>
                                    <span>•</span>
                                    <span className="font-mono">{item.due_date}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Gantt Bar Canvas */}
                              <div className="flex-1 h-12 relative flex items-center">
                                {/* Vertical Day Guide Lines */}
                                <div
                                  className="absolute inset-0 grid"
                                  style={{
                                    gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {days.map((day, idx) => (
                                    <div
                                      key={idx}
                                      className={`border-r border-slate-100 dark:border-slate-800/30 h-full ${
                                        isToday(day) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                                      }`}
                                    />
                                  ))}
                                </div>

                                {/* The Horizontal Gantt Bar */}
                                {!pos.outOfView && (
                                  <div
                                    onClick={() => setSelectedTaskForModal(item)}
                                    style={{
                                      left: `${pos.left}%`,
                                      width: `${pos.width}%`,
                                    }}
                                    className="absolute h-7 rounded-lg shadow-2xs flex items-center overflow-hidden transition-all group/bar cursor-pointer hover:shadow-md hover:scale-y-105 z-10"
                                    title={`${item.title} - Trạng thái: ${item.status} | Bắt đầu: ${item.start_date} → Kết thúc: ${item.due_date} | Tiến độ: ${item.progress_percent}%`}
                                  >
                                    {/* 1. Completed/Active Portion (Colored) */}
                                    <div
                                      style={{
                                        width: `${item.progress_percent}%`,
                                        backgroundColor: item.department_color || '#2563eb',
                                      }}
                                      className="h-full flex items-center px-2 text-white font-bold text-[10px] truncate shrink-0 transition-all gap-1"
                                    >
                                      <span className="font-mono text-[9px] opacity-90">
                                        {item.key}
                                      </span>
                                      {item.progress_percent > 30 && (
                                        <span className="truncate">{item.progress_percent}%</span>
                                      )}
                                    </div>

                                    {/* 2. Incomplete Portion (Muted Gray per user rule) */}
                                    <div
                                      style={{
                                        width: `${100 - item.progress_percent}%`,
                                      }}
                                      className="h-full bg-slate-200 dark:bg-slate-700 flex items-center px-2 text-slate-600 dark:text-slate-300 text-[10px] font-medium truncate"
                                    >
                                      {item.progress_percent <= 30 && (
                                        <span className="truncate font-mono">
                                          {item.progress_percent}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: TASK DETAIL ── */}
      {selectedTaskForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedTaskForModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[20px]" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded-lg text-xs font-black text-white font-mono"
                style={{ backgroundColor: selectedTaskForModal.department_color || '#3B82F6' }}
              >
                [{selectedTaskForModal.department_code || selectedTaskForModal.key.split('-')[0]}]
              </span>
              <span className="text-xs font-bold font-mono text-slate-500">
                {selectedTaskForModal.key}
              </span>
              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[180px]">
                {selectedTaskForModal.department_name}
              </span>
            </div>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
              {selectedTaskForModal.title}
            </h3>

            {selectedTaskForModal.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {selectedTaskForModal.description}
              </p>
            )}

            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Trạng thái:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    selectedTaskForModal.status === 'DONE'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : selectedTaskForModal.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {selectedTaskForModal.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Thời gian triển khai:</span>
                <span className="font-mono font-bold">
                  {selectedTaskForModal.start_date} → {selectedTaskForModal.due_date}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tiến độ công việc:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${selectedTaskForModal.progress_percent}%`,
                        backgroundColor: selectedTaskForModal.department_color || '#3B82F6',
                      }}
                    />
                  </div>
                  <span className="font-mono font-bold">
                    {selectedTaskForModal.progress_percent}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Người phụ trách:</span>
                <div className="flex items-center gap-1.5">
                  {selectedTaskForModal.assignee_avatar ? (
                    <img
                      src={selectedTaskForModal.assignee_avatar}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
                      {(selectedTaskForModal.assignee_name || 'AX').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTaskForModal.assignee_name || 'Chưa chỉ định'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mức độ ưu tiên:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {selectedTaskForModal.priority || 'MEDIUM'}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTaskForModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
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
