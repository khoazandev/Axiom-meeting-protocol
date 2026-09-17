'use client';

import React, { useState, useMemo } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { DepartmentNode } from '@/lib/mockAdminData';
import {
  MOCK_DEPARTMENTS_CAPACITY,
  MOCK_EXECUTIVE_MANDATES,
  INITIAL_ENG_MEMBERS,
  DepartmentCapacityMetric,
  ExecutiveMandate,
  getStoredMandates,
} from '@/lib/workloadProtocolData';
import { DepartmentProgressItem, TimelineGanttItem } from '@/lib/api';
import { DepartmentGanttTimeline } from './DepartmentGanttTimeline';
import {
  DEPARTMENT_ICONS,
  getDepartmentIcon,
  getUsedDepartmentIcons,
  getFirstAvailableIcon,
  formatDeptDescriptionWithIcon,
} from '@/lib/departmentIcons';

interface DepartmentsTabProps {
  departments: DepartmentNode[];
  departmentProgress?: DepartmentProgressItem[];
  timelineItems?: TimelineGanttItem[];
  onAddDepartment: (
    newDept: Omit<DepartmentNode, 'id' | 'memberCount' | 'activeMeetingsCount'>
  ) => void;
  onNotify?: (msg: string) => void;
  loadingProgress?: boolean;
  onRefreshProgress?: () => void;
}

export function DepartmentsTab({
  departments,
  departmentProgress = [],
  timelineItems = [],
  onAddDepartment,
  onNotify,
  loadingProgress = false,
  onRefreshProgress,
}: DepartmentsTabProps) {
  // Tab view mode: 'TIMELINE' (Gantt) vs 'CAPACITY' (Tổng quan phòng ban)
  const [activeSubTab, setActiveSubTab] = useState<'TIMELINE' | 'CAPACITY'>('TIMELINE');

  // Capacity States
  const [deptList, setDeptList] = useState<DepartmentCapacityMetric[]>(MOCK_DEPARTMENTS_CAPACITY);
  const [mandates, setMandates] = useState<ExecutiveMandate[]>(() => getStoredMandates());

  React.useEffect(() => {
    setMandates(getStoredMandates());
  }, []);

  const [capacityFilter, setCapacityFilter] = useState<
    'ALL' | 'OVERLOADED_OR_FULL' | 'OPTIMAL' | 'AVAILABLE'
  >('ALL');

  // Drawer / Modal States
  const [selectedDeptForDetail, setSelectedDeptForDetail] =
    useState<DepartmentCapacityMetric | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for adding department
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('code');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');

  const triggerNotify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  // Merge real progress with capacity metrics if available
  const mergedDeptProgress: DepartmentProgressItem[] = useMemo(() => {
    if (departmentProgress && departmentProgress.length > 0) {
      return departmentProgress;
    }
    // Fallback based on departments prop
    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      manager_name: d.managerName,
      member_count: d.memberCount || 1,
      total_tasks: 12,
      done_tasks: 8,
      in_progress_tasks: 3,
      todo_tasks: 1,
      completion_rate: 67,
      rating: 'TỐT',
      rating_color: 'text-emerald-500',
      color: d.color || '#3b82f6',
    }));
  }, [departmentProgress, departments]);

  // Filtered departments for capacity tab
  const filteredDepts = deptList.filter((d) => {
    if (capacityFilter === 'OVERLOADED_OR_FULL') {
      return d.status === 'OVERLOADED' || d.status === 'FULL';
    }
    if (capacityFilter === 'OPTIMAL') return d.status === 'OPTIMAL';
    if (capacityFilter === 'AVAILABLE') return d.status === 'AVAILABLE';
    return true;
  });

  // Calculate top macro metrics
  const totalWeeklyCap = deptList.reduce((acc, d) => acc + d.totalWeeklyHours, 0);
  const totalCommitted = deptList.reduce((acc, d) => acc + d.totalCommittedHours, 0);
  const avgUtilization = Math.round((totalCommitted / totalWeeklyCap) * 100) || 78;
  const totalMandatesHours = mandates.reduce((acc, m) => acc + m.allocatedHours, 0);
  const totalDecomposedTasks = mandates.reduce((acc, m) => acc + m.decomposedTasksCount, 0);
  const totalTargetTasks = mandates.reduce((acc, m) => acc + m.totalTasksTarget, 0);
  const overallDecomposeRate =
    totalTargetTasks > 0 ? Math.round((totalDecomposedTasks / totalTargetTasks) * 100) : 85;

  const totalRealIssues = mergedDeptProgress.reduce((acc, d) => acc + d.total_tasks, 0);
  const completedRealIssues = mergedDeptProgress.reduce((acc, d) => acc + d.done_tasks, 0);
  const overallRealProgress =
    totalRealIssues > 0 ? Math.round((completedRealIssues / totalRealIssues) * 100) : 72;

  const handleUrgeManager = (mandate: ExecutiveMandate) => {
    triggerNotify(
      `Đã gửi thông báo đôn đốc Trưởng phòng ${mandate.managerName} đẩy nhanh phân rã quyết sách ${mandate.code}`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const formattedDesc = formatDeptDescriptionWithIcon(icon, description);

    onAddDepartment({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: formattedDesc,
      managerName: managerName.trim() || 'Chưa bổ nhiệm',
      managerEmail: managerEmail.trim() || 'unassigned@axiom.internal',
      color: '#4F7BF7',
    });

    // Also push to local capacity metrics
    const newCapacityDept: DepartmentCapacityMetric = {
      code: code.trim().toUpperCase() as any,
      name: name.trim(),
      managerName: managerName.trim() || 'Chưa bổ nhiệm',
      managerEmail: managerEmail.trim() || 'unassigned@axiom.internal',
      memberCount: 1,
      totalWeeklyHours: 40,
      meetingHoursTotal: 0,
      taskHoursCommitted: 0,
      totalCommittedHours: 0,
      utilizationRate: 0,
      status: 'AVAILABLE',
      activeMeetingsCount: 0,
      mandatesCount: 0,
      zeroTaskCount: 1,
      optimalTaskCount: 0,
      overloadedCount: 0,
      bottlenecksAlert: null,
      mandates: [],
    };
    setDeptList([...deptList, newCapacityDept]);

    setName('');
    setCode('');
    setDescription('');
    setIcon(getFirstAvailableIcon(departments));
    setManagerName('');
    setManagerEmail('');
    setIsAddModalOpen(false);
    triggerNotify(`Đã khai báo phòng ban ${name.trim()} vào cây cơ cấu tổ chức!`);
  };

  const getCapacityStatusBadge = (status: DepartmentCapacityMetric['status']) => {
    switch (status) {
      case 'OVERLOADED':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300',
          dot: 'bg-rose-500',
          text: 'QUÁ TẢI',
        };
      case 'FULL':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500',
          text: 'ĐẦY TẢI',
        };
      case 'OPTIMAL':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
          dot: 'bg-emerald-500',
          text: 'TỐI ƯU',
        };
      case 'AVAILABLE':
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300',
          dot: 'bg-slate-400',
          text: 'DƯ THỪA CÔNG SUẤT',
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── TOP EXECUTIVE BANNER: WORKLOAD & MANDATE RADAR ── */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-blue-800/40">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <MatIcon name="domain" className="text-blue-400 text-[24px]" />
                <span>Cơ cấu phòng ban</span>
              </h1>
              <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
                Theo dõi lịch làm việc, tiến độ Jira và phân bổ tải trọng các khối ban chức năng.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {onRefreshProgress && (
                <button
                  type="button"
                  onClick={onRefreshProgress}
                  disabled={loadingProgress}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-white/20 active:scale-95"
                  title="Làm mới tiến độ"
                >
                  <MatIcon
                    name="refresh"
                    className={`text-[16px] ${loadingProgress ? 'animate-spin' : ''}`}
                  />
                  <span>Làm mới</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-95 border border-blue-400/40"
              >
                <MatIcon name="add" className="text-[16px]" />
                <span>Thêm phòng ban</span>
              </button>
            </div>
          </div>

          {/* 4 Macro KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="trending_up" className="text-blue-400 text-[16px]" />
                <span>Tiến Độ Tổng Thể</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">{overallRealProgress}%</span>
                <span className="text-[11px] text-emerald-400 font-bold">● Vận hành ổn định</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {completedRealIssues} / {totalRealIssues} tasks đã nghiệm thu
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="speed" className="text-indigo-400 text-[16px]" />
                <span>Tải Năng Lực Toàn Cục</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">{avgUtilization}%</span>
                <span className="text-[11px] text-indigo-300 font-bold">Tuần làm việc</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {totalCommitted}h / {totalWeeklyCap}h công suất
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="account_tree" className="text-purple-400 text-[16px]" />
                <span>Nghị Quyết Phân Rã</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">
                  {overallDecomposeRate}%
                </span>
                <span className="text-[11px] text-purple-300 font-bold">
                  {mandates.length} Trọng tâm
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {totalDecomposedTasks}/{totalTargetTasks} tasks gán cho nhân viên
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="domain" className="text-emerald-400 text-[16px]" />
                <span>Khối Chức Năng</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">
                  {mergedDeptProgress.length}
                </span>
                <span className="text-[11px] text-emerald-300 font-bold">Khối phòng ban</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Toàn bộ dữ liệu đồng bộ thời gian thực
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUB-TAB SELECTOR: GANTT vs OVERVIEW ── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('TIMELINE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'TIMELINE'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MatIcon name="calendar_view_week" className="text-[16px]" />
            <span>Lộ trình Gantt</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('CAPACITY')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'CAPACITY'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MatIcon name="domain" className="text-[16px]" />
            <span>Tổng quan phòng ban</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Thời gian thực</span>
        </div>
      </div>

      {/* ── SUB-VIEW 1: GANTT TIMELINE ── */}
      {activeSubTab === 'TIMELINE' && (
        <DepartmentGanttTimeline
          departments={mergedDeptProgress}
          timelineItems={timelineItems}
        />
      )}

      {/* ── SUB-VIEW 2: TỔNG QUAN PHÒNG BAN ── */}
      {activeSubTab === 'CAPACITY' && (
        <div className="space-y-6">
          {/* SECTION: NGHỊ QUYẾT CẤP CAO TRÍCH XUẤT TỪ CUỘC HỌP BAN LÃNH ĐẠO */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <MatIcon name="assignment" className="text-blue-600 dark:text-blue-400 text-[20px]" />
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Nghị Quyết Ban Lãnh Đạo Đang Phân Rã Xuống Các Khối (Executive Mandates)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {mandates.length} Trọng tâm chiến lược
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chỉ đạo từ cuộc họp của Chủ Tịch & Trưởng Phòng. AI theo dõi xem Trưởng phòng đã
                  phân rã thành bao nhiêu task cho nhân viên.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mandates.map((m) => {
                const percent = Math.round((m.decomposedTasksCount / m.totalTasksTarget) * 100);
                const isCompleted = percent === 100;

                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400/80 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-mono font-bold tracking-wider">
                          {m.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {isCompleted ? 'ĐÃ PHÂN RÃ 100%' : `ĐANG PHÂN RÃ (${percent}%)`}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {m.title}
                      </h3>

                      <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Phòng ban đích:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {m.targetDepartmentName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Trưởng khối chịu trách nhiệm:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {m.managerName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Nguồn gốc chỉ đạo:</span>
                          <span className="italic truncate max-w-[200px]" title={m.sourceMeetingTitle}>
                            {m.sourceMeetingTitle}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-500">
                            Tiến độ phân rã: {m.decomposedTasksCount}/{m.totalTasksTarget} tasks
                          </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {m.allocatedHours}h tải ({m.storyPoints} SP)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Hạn chót: {m.deadline}</span>

                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleUrgeManager(m)}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <MatIcon name="notifications_active" className="text-[14px]" />
                          <span>Đôn đốc Trưởng phòng</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION: BẢN ĐỒ TẢI TRỌNG CÁC PHÒNG BAN */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <MatIcon
                    name="grid_view"
                    className="text-indigo-600 dark:text-indigo-400 text-[20px]"
                  />
                  <span>Năng Lực Vận Hành Các Khối</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Theo dõi tải công việc và phân bổ nhân sự theo từng phòng ban.
                </p>
              </div>

              {/* Filter Bar with Dimension Locking (Fixed Width, Anti-CLS) */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setCapacityFilter('ALL')}
                  className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                    capacityFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Tất cả các phòng ban"
                >
                  Tất Cả ({deptList.length})
                </button>

                <button
                  type="button"
                  onClick={() => setCapacityFilter('OVERLOADED_OR_FULL')}
                  className={`w-32 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                    capacityFilter === 'OVERLOADED_OR_FULL'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Phòng ban đầy tải hoặc quá tải"
                >
                  Đầy / Quá Tải
                </button>

                <button
                  type="button"
                  onClick={() => setCapacityFilter('OPTIMAL')}
                  className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                    capacityFilter === 'OPTIMAL'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Phòng ban tải tối ưu"
                >
                  Tối Ưu
                </button>

                <button
                  type="button"
                  onClick={() => setCapacityFilter('AVAILABLE')}
                  className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                    capacityFilter === 'AVAILABLE'
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Phòng ban còn dư thừa công suất"
                >
                  Dư Thừa
                </button>
              </div>
            </div>

            {/* Bento Grid of Departments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredDepts.map((dept) => {
                const badge = getCapacityStatusBadge(dept.status);
                // Find matching department from props to get icon
                const matchedDept = departments.find(
                  (d) => d.code === dept.code || d.name === dept.name
                );
                const deptIcon = matchedDept
                  ? getDepartmentIcon(matchedDept)
                  : 'domain';

                return (
                  <div
                    key={dept.code}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-blue-400/80 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar: Icon + Code & Capacity Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <MatIcon name={deptIcon} className="text-[18px]" />
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold">
                            {dept.code}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${badge.bg}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                          <span>{badge.text}</span>
                        </span>
                      </div>

                      {/* Title & Manager */}
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {dept.name}
                      </h3>

                      <div className="mt-2 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                          {dept.managerAvatar ? (
                            <img
                              src={dept.managerAvatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            dept.managerName.charAt(0)
                          )}
                        </div>
                        <span>
                          Trưởng phòng:{' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {dept.managerName}
                          </strong>
                        </span>
                      </div>

                      {/* CAPACITY METER BAR */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                            <MatIcon name="speed" className="text-blue-500 text-[15px]" />
                            <span>Tải công việc</span>
                          </span>
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                            {dept.utilizationRate}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-500 ${
                              dept.status === 'OVERLOADED'
                                ? 'bg-rose-500'
                                : dept.status === 'FULL'
                                  ? 'bg-amber-500'
                                  : dept.status === 'OPTIMAL'
                                    ? 'bg-emerald-500'
                                    : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(dept.utilizationRate, 100)}%` }}
                          />
                        </div>

                        {/* Hours Breakdown */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                          <span>{dept.meetingHoursTotal}h họp</span>
                          <span className="text-slate-300 dark:text-slate-600">+</span>
                          <span>{dept.taskHoursCommitted}h tasks</span>
                          <span className="text-slate-300 dark:text-slate-600">=</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {dept.totalCommittedHours}h / {dept.totalWeeklyHours}h
                          </span>
                        </div>
                      </div>

                      {/* Member Capacity Distribution Chips */}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                          <div className="font-mono text-xs text-slate-800 dark:text-slate-200">
                            {dept.zeroTaskCount}
                          </div>
                          <div>Rảnh</div>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          <div className="font-mono text-xs font-black">
                            {dept.optimalTaskCount}
                          </div>
                          <div>Tối ưu</div>
                        </div>
                        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                          <div className="font-mono text-xs font-black">
                            {dept.overloadedCount}
                          </div>
                          <div>Quá tải</div>
                        </div>
                      </div>

                      {/* Bottleneck alert if any */}
                      {dept.bottlenecksAlert && (
                        <div className="mt-3 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                          <MatIcon
                            name="warning"
                            className="text-[14px] text-amber-600 shrink-0 mt-0.5"
                          />
                          <span>{dept.bottlenecksAlert}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer action */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                        <MatIcon name="groups" className="text-[16px]" />
                        <span>{dept.memberCount} nhân sự</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedDeptForDetail(dept)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        <span>Chi tiết</span>
                        <MatIcon name="arrow_forward" className="text-[14px]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DEEP-DIVE: CHI TIẾT TẢI NHÂN SỰ & QUYẾT SÁCH CỦA PHÒNG BAN ── */}
      {selectedDeptForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setSelectedDeptForDetail(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[22px]" />
            </button>

            {/* Header */}
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-mono font-bold">
                  {selectedDeptForDetail.code}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedDeptForDetail.name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Trưởng phòng: <strong>{selectedDeptForDetail.managerName}</strong>
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                <span className="font-mono">{selectedDeptForDetail.managerEmail}</span>
              </p>
            </div>

            {/* Content Body: Scrollable list of members in this department */}
            <div className="overflow-y-auto py-4 space-y-4 pr-1">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Danh sách nhân sự</span>
                <span className="text-[11px] font-normal text-slate-400">
                  40h/tuần = 100%
                </span>
              </div>

              {selectedDeptForDetail.code === 'ENG' ? (
                <div className="space-y-3">
                  {INITIAL_ENG_MEMBERS.map((mem) => {
                    const isZero = mem.activeTasksCount === 0;
                    const isOver = mem.capacityPercent > 100;

                    return (
                      <div
                        key={mem.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={mem.avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {mem.name}
                              </h4>
                              {isZero && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                  0 Task • Trống việc
                                </span>
                              )}
                              {isOver && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                  Quá tải nguy hiểm
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400">
                              {mem.title}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {mem.weeklyMeetingHours}h họp + {mem.estimatedTaskHours}h task · {mem.activeTasksCount} nhiệm vụ
                            </p>
                          </div>
                        </div>

                        {/* Capacity Percentage Pill */}
                        <div className="text-right shrink-0">
                          <div
                            className={`font-mono text-sm font-black ${
                              isOver
                                ? 'text-rose-600 dark:text-rose-400'
                                : isZero
                                  ? 'text-slate-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {mem.capacityPercent}%
                          </div>
                          <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                isOver ? 'bg-rose-500' : isZero ? 'bg-slate-400' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(mem.capacityPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500">
                  Phòng ban gồm {selectedDeptForDetail.memberCount} nhân sự đang vận hành theo cơ
                  chế phân tán. Tổng công suất khả dụng: {selectedDeptForDetail.totalWeeklyHours}
                  h/tuần.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDeptForDetail(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM PHÒNG BAN MỚI ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[20px]" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MatIcon name="domain_add" filled className="text-[20px]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Thêm phòng ban
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Khai báo phòng ban mới vào cơ cấu tổ chức.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên phòng ban <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Khối Truyền Thông"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="MKT"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              {/* Icon Picker - Exclusive */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Biểu tượng nhận diện
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Mỗi phòng ban một biểu tượng riêng
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  {DEPARTMENT_ICONS.map((item) => {
                    const usedBy = getUsedDepartmentIcons(departments)[item.icon];
                    const isUsed = Boolean(usedBy);
                    const isSelected = icon === item.icon;

                    return (
                      <button
                        key={item.icon}
                        type="button"
                        disabled={isUsed}
                        onClick={() => setIcon(item.icon)}
                        title={
                          isUsed
                            ? `${item.label} (Đã dùng: ${usedBy})`
                            : `${item.label} - ${item.domain}`
                        }
                        className={`relative p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                          isUsed
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 pointer-events-none'
                            : isSelected
                            ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 scale-105 cursor-pointer font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer'
                        }`}
                      >
                        <MatIcon name={item.icon} className="text-[20px]" />
                        <span className="text-[9.5px] truncate max-w-full font-medium">
                          {item.label}
                        </span>
                        {isUsed && (
                          <span
                            className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[8px] font-bold border border-slate-300 dark:border-slate-600"
                            title={`Đã gán cho ${usedBy}`}
                          >
                            Đã dùng
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chức năng
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Chịu trách nhiệm thương hiệu, chiến dịch và nội dung..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trưởng phòng
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Nguyễn Văn An"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email trưởng phòng
                  </label>
                  <input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="an.nguyen@axiom.vn"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Tạo phòng ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
