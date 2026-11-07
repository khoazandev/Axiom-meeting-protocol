'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Search,
  Sparkles,
  Plus,
  Loader2,
  Phone,
  Briefcase,
  Check,
  Building2,
  Calendar,
} from 'lucide-react';
import { MatIcon } from '@/components/ui/MatIcon';
import { organizationAdminApi, invitationApi, jiraApi, OrgMemberDetail, Issue } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { generateInitialsAvatar } from '@/components/profile/UserProfileModal';

interface ManagerTeamTabProps {
  onNotify: (msg: string) => void;
}

export interface EnrichedTeamMember extends OrgMemberDetail {
  workloadStatus: 'OVERLOADED' | 'OPTIMAL' | 'ZERO_TASK';
  activeTasks: number;
  completedTasks: number;
  committedHours: number;
  capacityPercent: number;
  tasksList: string[];
}

export function ManagerTeamTab({ onNotify }: ManagerTeamTabProps) {
  const { user, activeOrganization, updateUser } = useAuthStore();
  const resolvedOrgId =
    activeOrganization?.id ||
    (user as { organization_id?: string } | null)?.organization_id ||
    null;

  const [members, setMembers] = useState<EnrichedTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<
    'ALL' | 'OVERLOADED' | 'OPTIMAL' | 'ZERO_TASK'
  >('ALL');

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteJobTitle, setInviteJobTitle] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Quick Task Assignment Modal State
  const [selectedMemberForAssign, setSelectedMemberForAssign] = useState<EnrichedTeamMember | null>(
    null
  );
  const [taskToAssignTitle, setTaskToAssignTitle] = useState('');
  const [taskToAssignDesc, setTaskToAssignDesc] = useState('');
  const [taskToAssignPriority, setTaskToAssignPriority] = useState<
    'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  >('HIGH');
  const [taskToAssignDueDate, setTaskToAssignDueDate] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Member Detailed View Modal State
  const [selectedMemberForDetails, setSelectedMemberForDetails] =
    useState<EnrichedTeamMember | null>(null);
  const [allDepartmentIssues, setAllDepartmentIssues] = useState<Issue[]>([]);

  // Load Real Members and Tasks
  useEffect(() => {
    loadTeamData();
  }, [user?.department_id, resolvedOrgId]);

  const loadTeamData = async () => {
    setIsLoading(true);
    if (!resolvedOrgId) {
      setIsLoading(false);
      setMembers([]);
      return;
    }
    try {
      const [membersRes, projectsRes] = await Promise.allSettled([
        organizationAdminApi.getMembers(resolvedOrgId),
        jiraApi.getProjects({
          department_id: user?.department_id || undefined,
          organization_id: resolvedOrgId,
        }),
      ]);

      const rawMembers: OrgMemberDetail[] =
        membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)
          ? membersRes.value
          : [];

      // 1. Resolve manager's exact department ID and Name
      const myDeptId =
        user?.department_id ||
        rawMembers.find(
          (m) =>
            (m.user_id === user?.id || m.email === user?.email) &&
            (m.role || '').toUpperCase() === 'MANAGER'
        )?.department_id ||
        rawMembers.find((m) => m.user_id === user?.id || m.email === user?.email)?.department_id ||
        null;

      const myDeptName =
        user?.department_name ||
        rawMembers.find((m) => m.department_id === myDeptId)?.department_name ||
        'Bộ Phận Kỹ Thuật & Công Nghệ';

      // Keep AuthStore synchronized if department was unset
      if (myDeptId && (!user?.department_id || !user?.department_name)) {
        updateUser({ department_id: myDeptId, department_name: myDeptName });
      }

      // 2. Strictly isolate subordinate members for manager's department only:
      // Exclude OWNER, ADMIN, other MANAGER, and self. NEVER leak members from other departments!
      const effectiveMembers = rawMembers.filter((m) => {
        const role = (m.role || '').toUpperCase();
        if (role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER') return false;
        if (m.user_id === user?.id || m.email === user?.email) return false;
        if (myDeptId) {
          return m.department_id === myDeptId;
        }
        return false; // Zero leakage if department unresolved
      });

      // Fetch issues from relevant projects to calculate member capacity
      let issues: Issue[] = [];
      if (
        projectsRes.status === 'fulfilled' &&
        Array.isArray(projectsRes.value) &&
        projectsRes.value.length > 0
      ) {
        try {
          const targetProjects = projectsRes.value.filter(
            (p) => p.department_id === myDeptId || p.key === 'ENG' || !p.department_id
          );
          const projectsToQuery = targetProjects.length > 0 ? targetProjects : projectsRes.value;
          const issueLists = await Promise.all(
            projectsToQuery.map((p) => jiraApi.getIssues(p.id).catch(() => []))
          );
          issues = issueLists.flat();
        } catch {
          // ignore
        }
      }
      setAllDepartmentIssues(issues);

      // Enrich members with real active/completed tasks count and capacity percentage
      const enriched: EnrichedTeamMember[] = effectiveMembers.map((m) => {
        const memberIssues = issues.filter((i) => i.assignee_id === m.user_id);
        const activeCount = memberIssues.filter(
          (i) => (i.status || '').toUpperCase() !== 'DONE'
        ).length;
        const completedCount = memberIssues.filter(
          (i) => (i.status || '').toUpperCase() === 'DONE'
        ).length;

        // Fallback to m.tasks_count if issues list is empty
        const effectiveActive = memberIssues.length > 0 ? activeCount : m.tasks_count || 0;

        const committedHours = effectiveActive * 6 + (m.meetings_count || 1) * 2;
        const capPct = Math.min(140, Math.round((committedHours / 40) * 100));

        let status: 'OVERLOADED' | 'OPTIMAL' | 'ZERO_TASK' = 'OPTIMAL';
        if (effectiveActive === 0) status = 'ZERO_TASK';
        else if (capPct > 100 || effectiveActive >= 5) status = 'OVERLOADED';

        const tasksList = memberIssues.map((i) => i.summary).slice(0, 3);

        return {
          ...m,
          workloadStatus: status,
          activeTasks: effectiveActive,
          completedTasks: completedCount,
          committedHours,
          capacityPercent: capPct,
          tasksList,
        };
      });

      setMembers(enriched);
    } catch (err) {
      console.error('Failed to load department team data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered members by search and capacity filter
  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.role || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (capacityFilter === 'OVERLOADED') return m.workloadStatus === 'OVERLOADED';
      if (capacityFilter === 'OPTIMAL') return m.workloadStatus === 'OPTIMAL';
      if (capacityFilter === 'ZERO_TASK') return m.workloadStatus === 'ZERO_TASK';
      return true;
    });
  }, [members, searchQuery, capacityFilter]);

  // Team Stats
  const totalActiveTasks = members.reduce((acc, m) => acc + m.activeTasks, 0);
  const zeroTaskCount = members.filter((m) => m.workloadStatus === 'ZERO_TASK').length;
  const optimalCount = members.filter((m) => m.workloadStatus === 'OPTIMAL').length;
  const overloadedCount = members.filter((m) => m.workloadStatus === 'OVERLOADED').length;

  // Invite Member Handler
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    if (!resolvedOrgId) {
      onNotify('Chưa chọn tổ chức đang hoạt động.');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      await invitationApi.create(resolvedOrgId, {
        full_name: inviteName.trim(),
        email: inviteEmail.trim(),
        role_id: 'MEMBER',
        department_id: user?.department_id || undefined,
        job_title: inviteJobTitle.trim() || undefined,
        phone: invitePhone.trim() || undefined,
      });

      onNotify(`Đã gửi lời mời tham gia phòng ban tới email: ${inviteEmail}`);
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteJobTitle('');
      setInvitePhone('');
      await loadTeamData();
    } catch (err: unknown) {
      console.error('Failed to invite department member:', err);
      alert(
        (err as Error)?.message || 'Không thể gửi lời mời. Vui lòng kiểm tra lại địa chỉ email.'
      );
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // Quick Assign Task Handler
  const handleConfirmAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForAssign || !taskToAssignTitle.trim()) return;
    if (!resolvedOrgId) {
      onNotify('Chưa chọn tổ chức đang hoạt động.');
      return;
    }

    setIsSubmittingAssign(true);
    try {
      // Find or get project
      const projects = await jiraApi.getProjects({
        department_id: user?.department_id || undefined,
        organization_id: resolvedOrgId,
      });
      let targetProj =
        projects?.find(
          (p) => p.department_id === user?.department_id || p.key === 'ENG' || p.key === 'SMA'
        ) || (projects && projects[0] ? projects[0] : null);

      if (!targetProj) {
        targetProj = await jiraApi.createProject({
          key: 'ENG',
          name: user?.department_name || 'Bộ Phận Kỹ Thuật & Công Nghệ',
          description: 'Dự án quản lý công việc và phân bổ nhiệm vụ của phòng ban',
          department_id: user?.department_id || undefined,
          organization_id: resolvedOrgId,
        });
      }

      await jiraApi.createIssue({
        project_id: targetProj.id,
        summary: taskToAssignTitle.trim(),
        description: taskToAssignDesc.trim() || undefined,
        assignee_id: selectedMemberForAssign.user_id,
        priority: taskToAssignPriority,
        due_date: taskToAssignDueDate ? new Date(taskToAssignDueDate).toISOString() : undefined,
        status: 'TODO',
      });

      onNotify(
        `Đã giao nhiệm vụ "${taskToAssignTitle}" cho ${selectedMemberForAssign.full_name} thành công!`
      );
      setSelectedMemberForAssign(null);
      setTaskToAssignTitle('');
      setTaskToAssignDesc('');
      setTaskToAssignPriority('HIGH');
      setTaskToAssignDueDate('');
      await loadTeamData();
    } catch (err: any) {
      console.error('Failed to assign task:', err);
      alert(err?.message || 'Không thể giao việc.');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── TOP KPI EXECUTIVE BANNER (LIGHT & UNIFIED THEME) ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-6">
        {/* Subtle Decorative Gradient Orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-gradient-to-tr from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold tracking-wide uppercase mb-2">
              <MatIcon name="tune" className="text-[14px]" />
              <span>ĐIỀU PHỐI NĂNG LỰC & TẢI NHÂN SỰ</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Đội Ngũ {user?.department_name || 'Bộ Phận Kỹ Thuật'}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-1 leading-relaxed">
              Giám sát khối lượng công việc thực tế của từng nhân viên sau các cuộc họp, nhận diện
              kịp thời nhân sự quá tải hoặc đang rảnh việc (0 task) để cân bằng.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <UserPlus size={15} />
            <span>Mời Nhân Sự Vào Phòng</span>
          </button>
        </div>

        {/* High-Level Team Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Tổng Nhân Sự
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {members.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Thành viên phòng ban</div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/70">
            <div className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
              Tải Tối Ưu
            </div>
            <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
              {optimalCount}
            </div>
            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">
              Tiến độ ổn định
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/70">
            <div className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400">
              Rảnh Việc (0 Task)
            </div>
            <div className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">
              {zeroTaskCount}
            </div>
            <div className="text-[10px] text-amber-600/80 dark:text-amber-400 mt-0.5">
              Sẵn sàng nhận việc
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-800/70">
            <div className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-400">
              Nguy Cơ Quá Tải
            </div>
            <div className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-1">
              {overloadedCount}
            </div>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-400 mt-0.5">
              Cần san sẻ đầu việc
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR (Fixed Width Dimensions to Prevent Layout Shift) ── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Capacity Filter Pills (Dimension Locked) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCapacityFilter('ALL')}
            className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
              capacityFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tất Cả ({members.length})
          </button>

          <button
            type="button"
            onClick={() => setCapacityFilter('OPTIMAL')}
            className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
              capacityFilter === 'OPTIMAL'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tối Ưu ({optimalCount})
          </button>

          <button
            type="button"
            onClick={() => setCapacityFilter('ZERO_TASK')}
            className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
              capacityFilter === 'ZERO_TASK'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            0 Task ({zeroTaskCount})
          </button>

          <button
            type="button"
            onClick={() => setCapacityFilter('OVERLOADED')}
            className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
              capacityFilter === 'OVERLOADED'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Quá Tải ({overloadedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email..."
            className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 w-52 sm:w-60 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* ── MEMBER CARDS GRID ── */}
      {isLoading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Đang tải danh sách nhân sự phòng ban...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Không tìm thấy nhân sự phù hợp
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((mem) => {
            const isOverloaded = mem.workloadStatus === 'OVERLOADED';
            const isZeroTask = mem.workloadStatus === 'ZERO_TASK';

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
                  {/* Top: Avatar, Name & Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={mem.avatar_url || generateInitialsAvatar(mem.full_name)}
                        alt={mem.full_name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                      />
                      <div className="truncate">
                        <h3
                          className="text-sm font-extrabold text-slate-900 dark:text-white truncate"
                          title={mem.full_name}
                        >
                          {mem.full_name}
                        </h3>
                        <p
                          className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate"
                          title={mem.job_title || 'Kỹ sư Kỹ thuật (Software Engineer)'}
                        >
                          {mem.job_title ||
                            (mem.role === 'MEMBER'
                              ? 'Kỹ sư Kỹ thuật (Software Engineer)'
                              : mem.role)}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate" title={mem.email}>
                          {mem.email}
                        </p>
                        {mem.phone && (
                          <p
                            className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5"
                            title={mem.phone}
                          >
                            <Phone size={10} className="text-slate-400" />
                            <span>{mem.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`w-20 text-center text-[10px] font-black py-0.5 rounded-full uppercase shrink-0 truncate ${
                        isOverloaded
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : isZeroTask
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {isOverloaded ? 'QUÁ TẢI' : isZeroTask ? '0 TASK' : 'TỐI ƯU'}
                    </span>
                  </div>

                  {/* Workload Progress Meter */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 mb-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Clock size={12} className="text-blue-500" />
                        <span>Tải làm việc:</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {mem.committedHours}h / 40h ({mem.capacityPercent}%)
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isOverloaded
                            ? 'bg-rose-500'
                            : isZeroTask
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, mem.capacityPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Task counts */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pb-2">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-center">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {mem.activeTasks}
                      </div>
                      <div>Đang Thực Hiện</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-center">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {mem.meetings_count || 0}
                      </div>
                      <div>Cuộc Họp Tham Gia</div>
                    </div>
                  </div>

                  {/* Recent Assigned Tasks */}
                  <div className="mt-1 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Briefcase size={11} className="text-blue-500" />
                        <span>Nhiệm vụ phụ trách:</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {mem.activeTasks}
                      </span>
                    </div>
                    {mem.tasksList && mem.tasksList.length > 0 ? (
                      <ul className="space-y-1">
                        {mem.tasksList.map((t, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate" title={t}>
                              {t}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Chưa có nhiệm vụ đang xử lý
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMemberForDetails(mem)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center truncate"
                  >
                    Chi Tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMemberForAssign(mem);
                      setTaskToAssignTitle('');
                      setTaskToAssignDesc('');
                      setTaskToAssignPriority('HIGH');
                      setTaskToAssignDueDate('');
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer text-center truncate"
                  >
                    <Plus size={13} />
                    <span>Giao Việc</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL CHI TIẾT & QUẢN LÝ NHÂN SỰ ── */}
      {selectedMemberForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={
                    selectedMemberForDetails.avatar_url ||
                    generateInitialsAvatar(selectedMemberForDetails.full_name)
                  }
                  alt={selectedMemberForDetails.full_name}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/20"
                />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {selectedMemberForDetails.full_name}
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {selectedMemberForDetails.job_title || 'Kỹ sư Kỹ thuật (Software Engineer)'}
                  </p>
                  <p className="text-xs text-slate-400">{selectedMemberForDetails.email}</p>
                  {selectedMemberForDetails.phone && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {selectedMemberForDetails.phone}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberForDetails(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Workload Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                  {selectedMemberForDetails.activeTasks}
                </div>
                <div className="text-[11px] text-slate-500">Đang Thực Hiện</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {selectedMemberForDetails.completedTasks}
                </div>
                <div className="text-[11px] text-slate-500">Đã Hoàn Thành</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {selectedMemberForDetails.capacityPercent}%
                </div>
                <div className="text-[11px] text-slate-500">Tải Công Việc</div>
              </div>
            </div>

            {/* List of Tasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Danh Sách Nhiệm Vụ Được Giao
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMemberForAssign(selectedMemberForDetails);
                    setTaskToAssignTitle('');
                    setTaskToAssignDesc('');
                    setTaskToAssignPriority('HIGH');
                    setTaskToAssignDueDate('');
                    setSelectedMemberForDetails(null);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Giao việc mới
                </button>
              </div>

              {allDepartmentIssues.filter((i) => i.assignee_id === selectedMemberForDetails.user_id)
                .length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 italic">
                  Nhân sự này hiện chưa có nhiệm vụ nào được phân bổ.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {allDepartmentIssues
                    .filter((i) => i.assignee_id === selectedMemberForDetails.user_id)
                    .map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] font-bold text-slate-400 mr-2">
                            {task.key}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {task.summary}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            task.status === 'DONE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : task.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedMemberForDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GIAO VIỆC TRỰC TIẾP ── */}
      {selectedMemberForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Giao Nhiệm Vụ Cho Nhân Sự
                </h3>
                <p
                  className="text-xs text-blue-600 dark:text-blue-400 font-bold truncate max-w-xs"
                  title={selectedMemberForAssign.email}
                >
                  {selectedMemberForAssign.full_name} ({selectedMemberForAssign.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberForAssign(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAssign} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên nhiệm vụ cần giao *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nghiên cứu phương án tối ưu nén âm thanh WebRTC Opus"
                  value={taskToAssignTitle}
                  onChange={(e) => setTaskToAssignTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={taskToAssignPriority}
                    onChange={(e) => setTaskToAssignPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CRITICAL">Khẩn cấp (Critical)</option>
                    <option value="HIGH">Cao (High)</option>
                    <option value="MEDIUM">Trung bình (Medium)</option>
                    <option value="LOW">Thấp (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Hạn hoàn thành
                  </label>
                  <input
                    type="date"
                    value={taskToAssignDueDate}
                    onChange={(e) => setTaskToAssignDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả chi tiết / Hướng dẫn
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú yêu cầu kỹ thuật hoặc kết quả đầu ra cần đạt được..."
                  value={taskToAssignDesc}
                  onChange={(e) => setTaskToAssignDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedMemberForAssign(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingAssign ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang giao việc...</span>
                    </>
                  ) : (
                    <span>Xác Nhận Giao Việc</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL MỜI NHÂN SỰ VÀO PHÒNG BAN ── */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Mời Nhân Sự Vào Phòng Ban
              </h3>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Họ và tên nhân sự *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Địa chỉ Email doanh nghiệp *
                </label>
                <input
                  type="email"
                  required
                  placeholder="VD: a.nguyen@axiom.internal"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Vị trí chuyên môn
                  </label>
                  <input
                    type="text"
                    placeholder="VD: AI Engineer"
                    value={inviteJobTitle}
                    onChange={(e) => setInviteJobTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="VD: 0912345678"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingInvite ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang gửi lời mời...</span>
                    </>
                  ) : (
                    <span>Gửi Lời Mời</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
