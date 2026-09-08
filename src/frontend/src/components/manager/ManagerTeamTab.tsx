'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Search,
  FolderGit2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
  Send,
  Plus,
} from 'lucide-react';
import { MatIcon } from '@/components/ui/MatIcon';
import {
  INITIAL_ENG_MEMBERS,
  MemberCapacityWorkload,
  DecomposedTask,
  WorkloadStatus,
} from '@/lib/workloadProtocolData';

interface ManagerTeamTabProps {
  onNotify: (msg: string) => void;
}

export function ManagerTeamTab({ onNotify }: ManagerTeamTabProps) {
  const [members, setMembers] = useState<MemberCapacityWorkload[]>(INITIAL_ENG_MEMBERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<
    'ALL' | 'OVERLOADED' | 'OPTIMAL' | 'ZERO_TASK'
  >('ALL');

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');

  // Rebalance / Quick-Assign Modal State
  const [selectedMemberForAssign, setSelectedMemberForAssign] =
    useState<MemberCapacityWorkload | null>(null);
  const [taskToAssignTitle, setTaskToAssignTitle] = useState(
    'Viết Test Suite E2E chịu tải 500 CCU Audio Rooms'
  );
  const [taskEstimatedHours, setTaskEstimatedHours] = useState(14);
  const [taskPriority, setTaskPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('HIGH');

  // Filtered members by search and capacity filter
  const filtered = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (capacityFilter === 'OVERLOADED') return m.workloadStatus === 'OVERLOADED';
    if (capacityFilter === 'OPTIMAL') return m.workloadStatus === 'OPTIMAL';
    if (capacityFilter === 'ZERO_TASK') return m.workloadStatus === 'ZERO_TASK';
    return true;
  });

  // Calculate high-level team load stats
  const totalHours = members.reduce((acc, m) => acc + m.totalCommittedHours, 0);
  const totalMaxCapacity = members.length * 40;
  const teamAverageLoad = Math.round((totalHours / totalMaxCapacity) * 100);
  const zeroTaskCount = members.filter((m) => m.activeTasksCount === 0).length;
  const overloadedCount = members.filter((m) => m.workloadStatus === 'OVERLOADED').length;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    const newMem: MemberCapacityWorkload = {
      id: `mem-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      title: inviteTitle || 'Kỹ Sư Phần Mềm',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      departmentCode: 'ENG',
      departmentName: 'Khối Kỹ Thuật',
      status: 'ONLINE',
      weeklyMeetingHours: 4.0,
      activeTasksCount: 0,
      completedTasksCount: 0,
      estimatedTaskHours: 0,
      totalCommittedHours: 4.0,
      capacityPercent: 10,
      workloadStatus: 'ZERO_TASK',
      tasks: [],
    };

    setMembers([newMem, ...members]);
    setIsInviteOpen(false);
    setInviteEmail('');
    setInviteName('');
    setInviteTitle('');
    onNotify(`Đã gửi thư mời gia nhập Khối Kỹ Thuật tới: ${newMem.email}`);
  };

  // Quick Assign Balancing Task (e.g. to Đặng Thùy Dung)
  const handleConfirmQuickAssign = () => {
    if (!selectedMemberForAssign) return;

    const newTask: DecomposedTask = {
      id: `tsk-${Date.now()}`,
      title: taskToAssignTitle,
      mandateOriginCode: 'MANDATE-Q3-01',
      mandateOriginTitle: 'Hạ Tầng Realtime Audio & On-premise Security',
      meetingOrigin: 'Họp Sprint 42 Kỹ Thuật (Phân rã Nghị Quyết HĐQT)',
      assigneeName: selectedMemberForAssign.name,
      assigneeEmail: selectedMemberForAssign.email,
      estimatedHours: taskEstimatedHours,
      priority: taskPriority,
      status: 'IN_PROGRESS',
      deadline: 'Thứ Sáu tới',
    };

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== selectedMemberForAssign.id) return m;

        const newEstimatedHours = m.estimatedTaskHours + taskEstimatedHours;
        const newTotalCommitted = m.weeklyMeetingHours + newEstimatedHours;
        const newCapacityPercent = Math.round((newTotalCommitted / 40) * 100);
        const newStatus: WorkloadStatus =
          newCapacityPercent > 100 ? 'OVERLOADED' : newCapacityPercent >= 80 ? 'FULL' : 'OPTIMAL';

        return {
          ...m,
          activeTasksCount: m.activeTasksCount + 1,
          estimatedTaskHours: newEstimatedHours,
          totalCommittedHours: newTotalCommitted,
          capacityPercent: newCapacityPercent,
          workloadStatus: newStatus,
          tasks: [newTask, ...m.tasks],
        };
      })
    );

    const targetName = selectedMemberForAssign.name;
    setSelectedMemberForAssign(null);
    onNotify(
      `Đã giao task "${taskToAssignTitle}" cho ${targetName}. Tải công việc đã được cân bằng!`
    );
  };

  // Rebalance: Transfer a task from an overloaded member
  const handleRelieveOverloadedMember = (overloadedMember: MemberCapacityWorkload) => {
    // Find available member (0 task or lowest capacity)
    const availableMem = members.find((m) => m.activeTasksCount === 0);
    if (!availableMem) {
      onNotify('Hiện không có nhân sự trống việc (0 task) để điều chuyển ngay!');
      return;
    }

    // Move task 10 (or last task) from Ngô Minh Tuấn to available member
    if (overloadedMember.tasks.length === 0) return;
    const taskToMove = overloadedMember.tasks[overloadedMember.tasks.length - 1];

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === overloadedMember.id) {
          const updatedTasks = m.tasks.filter((t) => t.id !== taskToMove.id);
          const newEstimated = m.estimatedTaskHours - taskToMove.estimatedHours;
          const newTotal = m.weeklyMeetingHours + newEstimated;
          const newCap = Math.round((newTotal / 40) * 100);
          return {
            ...m,
            tasks: updatedTasks,
            activeTasksCount: updatedTasks.length,
            estimatedTaskHours: newEstimated,
            totalCommittedHours: newTotal,
            capacityPercent: newCap,
            workloadStatus: newCap > 100 ? 'OVERLOADED' : 'OPTIMAL',
          };
        }
        if (m.id === availableMem.id) {
          const movedTask: DecomposedTask = {
            ...taskToMove,
            assigneeName: m.name,
            assigneeEmail: m.email,
          };
          const newEstimated = m.estimatedTaskHours + taskToMove.estimatedHours;
          const newTotal = m.weeklyMeetingHours + newEstimated;
          const newCap = Math.round((newTotal / 40) * 100);
          return {
            ...m,
            tasks: [movedTask, ...m.tasks],
            activeTasksCount: m.activeTasksCount + 1,
            estimatedTaskHours: newEstimated,
            totalCommittedHours: newTotal,
            capacityPercent: newCap,
            workloadStatus: 'OPTIMAL',
          };
        }
        return m;
      })
    );

    onNotify(
      `Đã điều chuyển task "${taskToMove.title}" từ ${overloadedMember.name} sang ${availableMem.name} để giải tỏa quá tải!`
    );
  };

  const getStatusDot = (st: MemberCapacityWorkload['status']) => {
    switch (st) {
      case 'ONLINE':
        return { color: 'bg-emerald-500', text: 'Trực tuyến' };
      case 'IN_MEETING':
        return { color: 'bg-purple-500 animate-pulse', text: 'Đang họp' };
      default:
        return { color: 'bg-slate-400', text: 'Ngoại tuyến' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── TOP KPI BANNER: TEAM CAPACITY MATRIX ── */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold mb-2">
              <MatIcon name="tune" className="text-[16px]" />
              <span>MANAGER PROTOCOL • MA TRẬN ĐIỀU PHỐI TẢI & NĂNG LỰC TEAM</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Đội Ngũ Khối Kỹ Thuật (Engineering Team)</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Theo dõi phân bổ tải theo thời gian thực (0, 1 hoặc nhiều task), nhận diện nguy cơ quá
              tải (Burnout) hoặc nhân sự chưa được phân bổ công việc sau cuộc họp để kịp thời cân
              bằng.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <UserPlus size={16} />
            <span>Mời Nhân Viên Mới</span>
          </button>
        </div>

        {/* 4 Team Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <MatIcon name="speed" className="text-blue-400 text-[15px]" />
              <span>Tải Trung Bình Khối</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-white">{teamAverageLoad}%</span>
              <span className="text-[11px] text-emerald-400 font-bold">● Tối ưu</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {totalHours}h / {totalMaxCapacity}h định mức
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <MatIcon name="warning" className="text-rose-400 text-[15px]" />
              <span>Nhân Sự Quá Tải</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-rose-300">{overloadedCount}</span>
              <span className="text-[11px] text-rose-300 font-bold">(&gt;100% tải)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Cần san sẻ bớt công việc</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <MatIcon name="check_circle" className="text-emerald-400 text-[15px]" />
              <span>Nhân Sự Tải Tối Ưu</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-emerald-300">
                {members.length - zeroTaskCount - overloadedCount}
              </span>
              <span className="text-[11px] text-emerald-300 font-bold">(50-85%)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Năng suất cao, bền vững</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <MatIcon name="person_search" className="text-amber-400 text-[15px]" />
              <span>Chưa Có Task (Rảnh)</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-amber-300">{zeroTaskCount}</span>
              <span className="text-[11px] text-amber-300 font-bold">0 Task</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sẵn sàng nhận việc mới</div>
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR (FIXED-WIDTH, ZERO CLS) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          {/* Dimension Locking Filters */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCapacityFilter('ALL')}
              className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                capacityFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tất cả thành viên"
            >
              Tất Cả ({members.length})
            </button>

            <button
              type="button"
              onClick={() => setCapacityFilter('OVERLOADED')}
              className={`w-32 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                capacityFilter === 'OVERLOADED'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Nhân sự quá tải"
            >
              🔴 Quá Tải ({overloadedCount})
            </button>

            <button
              type="button"
              onClick={() => setCapacityFilter('OPTIMAL')}
              className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                capacityFilter === 'OPTIMAL'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Nhân sự tải tối ưu"
            >
              🟢 Tối Ưu
            </button>

            <button
              type="button"
              onClick={() => setCapacityFilter('ZERO_TASK')}
              className={`w-32 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                capacityFilter === 'ZERO_TASK'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Nhân sự chưa có task nào"
            >
              ⚪ 0 Task ({zeroTaskCount})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc chuyên môn..."
            className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 w-56 focus:w-64 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* ── MEMBER CAPACITY CARDS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((mem) => {
          const st = getStatusDot(mem.status);
          const isOverloaded = mem.workloadStatus === 'OVERLOADED';
          const isZeroTask = mem.activeTasksCount === 0;

          return (
            <div
              key={mem.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                isOverloaded
                  ? 'border-rose-300/80 dark:border-rose-800/80 ring-1 ring-rose-200 dark:ring-rose-900/40'
                  : isZeroTask
                    ? 'border-amber-300/80 dark:border-amber-800/80 ring-1 ring-amber-200/50 dark:ring-amber-900/30'
                    : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Header: Avatar, Status, Capacity % */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={mem.avatar}
                        alt={mem.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${st.color}`}
                        title={st.text}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {mem.name}
                      </h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
                        {mem.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{mem.email}</p>
                    </div>
                  </div>

                  {/* Workload Badge */}
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        isOverloaded
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : isZeroTask
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {isOverloaded ? 'QUÁ TẢI' : isZeroTask ? '0 TASK (RẢNH)' : 'TỐI ƯU'}
                    </span>
                  </div>
                </div>

                {/* CAPACITY METER BAR */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 mb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Clock size={12} className="text-blue-500" />
                      <span>Tải công việc:</span>
                    </span>
                    <span
                      className={`font-mono font-black text-xs ${
                        isOverloaded
                          ? 'text-rose-600 dark:text-rose-400'
                          : isZeroTask
                            ? 'text-slate-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {mem.capacityPercent}% ({mem.totalCommittedHours}h / 40h)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverloaded
                          ? 'bg-rose-500'
                          : isZeroTask
                            ? 'bg-slate-400'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(mem.capacityPercent, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                    <span>{mem.weeklyMeetingHours}h họp tuần</span>
                    <span>
                      {mem.estimatedTaskHours}h cam kết ({mem.activeTasksCount} tasks)
                    </span>
                  </div>
                </div>

                {/* Active Tasks Breakdown with Protocol Traceability */}
                <div className="mb-3 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Nhiệm vụ đang phụ trách ({mem.activeTasksCount}):</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      Hoàn thành: {mem.completedTasksCount}
                    </span>
                  </div>

                  {mem.tasks.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {mem.tasks.map((tsk) => (
                        <div
                          key={tsk.id}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-[11px] space-y-1"
                        >
                          <div
                            className="font-semibold text-slate-800 dark:text-slate-200 truncate"
                            title={tsk.title}
                          >
                            {tsk.title}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-mono font-bold truncate max-w-[150px]"
                              title={tsk.mandateOriginTitle}
                            >
                              <MatIcon name="account_tree" className="text-[12px]" />
                              <span>{tsk.mandateOriginCode}</span>
                            </span>
                            <span>{tsk.estimatedHours}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-800 text-center text-xs text-amber-800 dark:text-amber-300 font-medium">
                      Nhân sự đang có 0 task sau cuộc họp.
                    </div>
                  )}
                </div>

                {/* OVERLOAD ALERT & ACTION */}
                {isOverloaded && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 mb-3 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>Họp {mem.weeklyMeetingHours}h + 4 tasks: Nguy cơ kiệt sức!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRelieveOverloadedMember(mem)}
                      className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1"
                    >
                      <ArrowRight size={12} />
                      <span>Điều chuyển bớt 1 task sang nhân sự trống việc</span>
                    </button>
                  </div>
                )}

                {/* ZERO-TASK CALL TO ACTION */}
                {isZeroTask && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMemberForAssign(mem)}
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Giao Task Cân Bằng Tải</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Quick Actions */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => onNotify(`Đã mở lịch 1-on-1 với ${mem.name}`)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Calendar size={12} />
                  <span>Họp 1-on-1</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNotify(`Đã gửi thông điệp nhắc nhở tới ${mem.name}`)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Mail size={12} />
                  <span>Nhắn Tin</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL: GIAO TASK CÂN BẰNG TẢI TỪ QUYẾT SÁCH CẤP CAO ── */}
      {selectedMemberForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedMemberForAssign(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <img
                src={selectedMemberForAssign.avatar}
                alt=""
                className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500"
              />
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Giao Task Cho: {selectedMemberForAssign.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedMemberForAssign.title} • Hiện có 0 active task (Tải 16%)
                </p>
              </div>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 uppercase">
                  Quyết sách cấp cao thừa kế:
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                  MANDATE-Q3-01: Triển khai LiveKit Audio Egress & Bảo Mật On-premise
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                  Chỉ đạo trực tiếp từ Cuộc họp Ban Giám Đốc Q3/2026.
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Đầu việc phân rã được chọn:
                </label>
                <select
                  value={taskToAssignTitle}
                  onChange={(e) => setTaskToAssignTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Viết Test Suite E2E chịu tải 500 CCU Audio Rooms">
                    Viết Test Suite E2E chịu tải 500 CCU Audio Rooms (14h)
                  </option>
                  <option value="Audit bảo mật mã hóa AES-256 cho bản ghi STT">
                    Audit bảo mật mã hóa AES-256 cho bản ghi STT (12h)
                  </option>
                  <option value="Tối ưu hóa Buffer Whisper STT Latency < 400ms">
                    Tối ưu hóa Buffer Whisper STT Latency &lt; 400ms (18h)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ước lượng thời gian (Hours):
                  </label>
                  <input
                    type="number"
                    value={taskEstimatedHours}
                    onChange={(e) => setTaskEstimatedHours(Number(e.target.value))}
                    min={1}
                    max={40}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Độ ưu tiên:
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="CRITICAL">🔴 RẤT CAO (CRITICAL)</option>
                    <option value="HIGH">🟡 CAO (HIGH)</option>
                    <option value="MEDIUM">🟢 BÌNH THƯỜNG (MEDIUM)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-[11px] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Sau khi giao, tải của {selectedMemberForAssign.name} sẽ tăng lên{' '}
                  <strong>
                    {Math.round(
                      ((selectedMemberForAssign.weeklyMeetingHours + taskEstimatedHours) / 40) * 100
                    )}
                    % (Mức Tối Ưu)
                  </strong>
                  .
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMemberForAssign(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmQuickAssign}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
              >
                Xác Nhận Giao Việc & Cân Bằng Tải
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MỜI NHÂN VIÊN MỚI ── */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Mời Nhân Viên Mới Vào Khối Kỹ Thuật
              </h3>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Họ và tên nhân viên *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trần Đình Trọng"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email công ty *
                </label>
                <input
                  type="email"
                  required
                  placeholder="trong.tran@axiom.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chức danh chuyên môn
                </label>
                <input
                  type="text"
                  placeholder="VD: Kỹ Sư Backend / Audio AI"
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Gửi Lời Mời
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
