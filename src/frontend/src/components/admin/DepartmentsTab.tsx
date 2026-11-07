'use client';

import React, { useState, useMemo } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { DepartmentNode } from '@/types/admin';
import { DepartmentProgressItem, TimelineGanttItem } from '@/lib/api';
import { DepartmentGanttTimeline } from './DepartmentGanttTimeline';
import {
  DEPARTMENT_ICONS,
  getDepartmentIcon,
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
  // Tab view mode: 'TIMELINE' (Gantt) vs 'PROGRESS' (Tiến độ phòng ban)
  const [activeSubTab, setActiveSubTab] = useState<'TIMELINE' | 'PROGRESS'>('TIMELINE');

  // Modal State for adding department
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  // Merge real progress: when empty, map departments to zero-valued progress rows
  const progressList: DepartmentProgressItem[] = useMemo(() => {
    if (departmentProgress && departmentProgress.length > 0) {
      return departmentProgress;
    }
    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      manager_name: d.managerName ?? 'Chưa bổ nhiệm',
      member_count: d.memberCount,
      total_tasks: 0,
      done_tasks: 0,
      in_progress_tasks: 0,
      todo_tasks: 0,
      completion_rate: 0,
      rating: 'Tiêu chuẩn',
      rating_color: '#3B82F6',
      color: d.color || '#3B82F6',
    }));
  }, [departmentProgress, departments]);

  // Macro metrics calculated from real progress
  const totalTasks = progressList.reduce((acc, d) => acc + (d.total_tasks || 0), 0);
  const doneTasks = progressList.reduce((acc, d) => acc + (d.done_tasks || 0), 0);
  const inProgressTasks = progressList.reduce((acc, d) => acc + (d.in_progress_tasks || 0), 0);
  const todoTasks = progressList.reduce((acc, d) => acc + (d.todo_tasks || 0), 0);
  const overallRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const formattedDesc = formatDeptDescriptionWithIcon(icon, description);

    onAddDepartment({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: formattedDesc,
      managerName: managerName.trim() || 'Chưa bổ nhiệm',
      managerEmail: managerEmail.trim() || null,
      color: '#4F7BF7',
    });

    setName('');
    setCode('');
    setDescription('');
    setIcon(getFirstAvailableIcon(departments));
    setManagerName('');
    setManagerEmail('');
    setIsAddModalOpen(false);
    triggerNotify(`Đã khai báo phòng ban ${name.trim()} vào cơ cấu tổ chức!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── TOP EXECUTIVE BANNER: WORKLOAD & PROGRESS RADAR ── */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-blue-800/40">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <MatIcon name="task_alt" className="text-blue-400 text-[24px]" />
                <span>Quản Lý Công Việc & Tiến Độ</span>
              </h1>
              <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
                Theo dõi tiến độ thực thi nhiệm vụ, sơ đồ phân bổ nguồn lực và lộ trình dự án các bộ phận chức năng.
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
                <span>Tiến Độ Nghiệm Thu</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">{overallRate}%</span>
                <span className="text-[11px] text-emerald-400 font-bold">● Vận hành thực tế</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {doneTasks} / {totalTasks} tasks đã hoàn thành
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="pending_actions" className="text-amber-400 text-[16px]" />
                <span>Đang Triển Khai</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">{inProgressTasks}</span>
                <span className="text-[11px] text-amber-300 font-bold">Nhiệm vụ</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Đang được các bộ phận xử lý</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="assignment" className="text-purple-400 text-[16px]" />
                <span>Chờ Tiếp Nhận</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">{todoTasks}</span>
                <span className="text-[11px] text-purple-300 font-bold">Nhiệm vụ</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Đã phân bổ từ các cuộc họp</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="domain" className="text-emerald-400 text-[16px]" />
                <span>Bộ Phận Chức Năng</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">
                  {progressList.length}
                </span>
                <span className="text-[11px] text-emerald-300 font-bold">Bộ phận</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Cơ cấu tổ chức thời gian thực</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUB-TAB SELECTOR: GANTT vs PROGRESS ── */}
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
            onClick={() => setActiveSubTab('PROGRESS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'PROGRESS'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MatIcon name="domain" className="text-[16px]" />
            <span>Tiến độ phòng ban</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Thời gian thực</span>
        </div>
      </div>

      {/* ── SUB-VIEW 1: GANTT TIMELINE ── */}
      {activeSubTab === 'TIMELINE' && (
        <DepartmentGanttTimeline departments={progressList} timelineItems={timelineItems} />
      )}

      {/* ── SUB-VIEW 2: TIẾN ĐỘ PHÒNG BAN ── */}
      {activeSubTab === 'PROGRESS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progressList.map((dept) => {
              const deptIcon = getDepartmentIcon({
                name: dept.name,
                description: dept.description,
              });
              const completion = dept.completion_rate ?? 0;

              return (
                <div
                  key={dept.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                          <MatIcon name={deptIcon} className="text-[20px]" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {dept.name}
                          </h3>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            Trưởng bộ phận: {dept.manager_name || 'Chưa bổ nhiệm'}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                        {dept.member_count} nhân sự
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          Tiến độ hoàn thành:
                        </span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          {completion}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Task Metrics Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Tổng task
                      </span>
                      <strong className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {dept.total_tasks || 0}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                        Đã xong
                      </span>
                      <strong className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                        {dept.done_tasks || 0}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                        Đang làm
                      </span>
                      <strong className="text-xs font-bold text-amber-700 dark:text-amber-300 font-mono">
                        {dept.in_progress_tasks || 0}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-medium">
                        Chờ xử lý
                      </span>
                      <strong className="text-xs font-bold text-blue-700 dark:text-blue-300 font-mono">
                        {dept.todo_tasks || 0}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL: THÊM PHÒNG BAN MỚI ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <MatIcon name="domain" className="text-blue-600" />
                <span>Thêm Bộ Phận Mới</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <MatIcon name="close" className="text-[20px]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên phòng ban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Bộ Phận Kỹ Thuật & Công Nghệ"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mã bộ phận (Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: ENG"
                    className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Biểu tượng Icon
                  </label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    {DEPARTMENT_ICONS.map((i) => (
                      <option key={i.icon} value={i.icon}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chức năng nhiệm vụ
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả tóm tắt vai trò của phòng ban trong công ty..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trưởng phòng (Họ và tên)
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Chưa bổ nhiệm"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email liên hệ
                  </label>
                  <input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="email@company.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer active:scale-95"
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
