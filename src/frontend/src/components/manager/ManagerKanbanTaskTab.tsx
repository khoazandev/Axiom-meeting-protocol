'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Kanban,
  Plus,
  Clock,
  CheckCircle2,
  Sparkles,
  Search,
  AlertCircle,
  Video,
  User,
  CheckSquare,
  Square,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import {
  jiraApi,
  meetingApi,
  organizationAdminApi,
  Issue,
  JiraProject,
  OrgMemberDetail,
} from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { generateInitialsAvatar } from '@/components/profile/UserProfileModal';

export type TaskStatusKey = 'TODO' | 'IN_PROGRESS' | 'IN_PREVIEW' | 'DONE';
export type TaskPriorityKey = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SubtaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface EnrichedKanbanTask {
  id: string;
  key: string;
  title: string;
  description?: string;
  status: TaskStatusKey;
  priority: TaskPriorityKey;
  assigneeId?: string | null;
  assigneeName: string;
  assigneeAvatar: string;
  assigneeRole: string;
  meetingId?: string;
  meetingTitle?: string;
  subtasks: SubtaskItem[];
  dueDate?: string;
}

const KANBAN_COLUMNS: {
  key: TaskStatusKey;
  label: string;
  dotColor: string;
  headerBg: string;
}[] = [
  {
    key: 'TODO',
    label: 'Cần Làm',
    dotColor: 'bg-slate-400',
    headerBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  },
  {
    key: 'IN_PROGRESS',
    label: 'Đang Làm',
    dotColor: 'bg-blue-500',
    headerBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
  },
  {
    key: 'IN_PREVIEW',
    label: 'Chờ Duyệt',
    dotColor: 'bg-amber-500',
    headerBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
  },
  {
    key: 'DONE',
    label: 'Hoàn Thành',
    dotColor: 'bg-emerald-500',
    headerBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
  },
];

interface ManagerKanbanTaskTabProps {
  onNotify: (msg: string) => void;
}

export function ManagerKanbanTaskTab({ onNotify }: ManagerKanbanTaskTabProps) {
  const { user, activeOrganization } = useAuthStore();
  const resolvedOrgId =
    activeOrganization?.id ||
    (user as any)?.organization_id ||
    '2846981f-7028-4ef4-9cad-d2c3719703c4';

  const isManagerOrAdmin =
    user?.role === 'MANAGER' || user?.role === 'OWNER' || user?.role === 'ADMIN';

  // Data States
  const [activeProject, setActiveProject] = useState<JiraProject | null>(null);
  const [tasks, setTasks] = useState<EnrichedKanbanTask[]>([]);
  const [deptMembers, setDeptMembers] = useState<OrgMemberDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState('ALL');

  // Drag State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Task Details Modal State
  const [selectedTask, setSelectedTask] = useState<EnrichedKanbanTask | null>(null);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Add Task Modal State
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriorityKey>('HIGH');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Subtasks local storage sync helper
  const loadSubtasksForTask = (taskId: string, description?: string): SubtaskItem[] => {
    try {
      const stored = localStorage.getItem(`axiom_subtasks_${taskId}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }

    // If description has subtask lines e.g. "- [ ] item" or "- [x] item"
    if (description && description.includes('- [')) {
      const lines = description.split('\n');
      const items: SubtaskItem[] = [];
      lines.forEach((l, idx) => {
        const match = l.match(/^-\s*\[([ xX])\]\s*(.+)$/);
        if (match) {
          items.push({
            id: `sub-${taskId}-${idx}`,
            title: match[2].trim(),
            isCompleted: match[1].toLowerCase() === 'x',
          });
        }
      });
      if (items.length > 0) return items;
    }

    // Default 2 default decomposed subtasks if empty
    return [
      {
        id: `sub-${taskId}-1`,
        title: 'Nghiên cứu yêu cầu & chuẩn bị tài liệu kỹ thuật',
        isCompleted: true,
      },
      {
        id: `sub-${taskId}-2`,
        title: 'Thực hiện giải pháp & tự kiểm thử (Self-test)',
        isCompleted: false,
      },
    ];
  };

  const saveSubtasksForTask = (taskId: string, subtasks: SubtaskItem[]) => {
    try {
      localStorage.setItem(`axiom_subtasks_${taskId}`, JSON.stringify(subtasks));
    } catch {
      // ignore
    }
  };

  // 1. Initial Load: Projects, Issues & Members
  useEffect(() => {
    loadKanbanData();
  }, [user?.department_id, resolvedOrgId]);

  const loadKanbanData = async () => {
    setIsLoading(true);
    try {
      // Load department members
      const membersRes = await organizationAdminApi.getMembers(resolvedOrgId);
      const members = Array.isArray(membersRes) ? membersRes : [];
      const filteredMembers = user?.department_id
        ? members.filter((m) => m.department_id === user.department_id)
        : members;
      const effectiveMembers = filteredMembers.length > 0 ? filteredMembers : members;
      setDeptMembers(effectiveMembers);

      // Load Jira Projects
      let projects = await jiraApi.getProjects({
        department_id: user?.department_id || undefined,
        organization_id: resolvedOrgId,
      });

      let proj: JiraProject | null = null;
      if (projects && projects.length > 0) {
        proj = projects[0];
      } else {
        // Auto-create initial project for this department
        try {
          proj = await jiraApi.createProject({
            key: 'ENG',
            name: user?.department_name || 'Khối Kỹ Thuật',
            description: 'Dự án quản lý công việc và phân bổ nhiệm vụ sau cuộc họp',
            department_id: user?.department_id || undefined,
            organization_id: resolvedOrgId,
          });
        } catch {
          // If already exists or error, fetch all
          const allProj = await jiraApi.getProjects();
          if (allProj && allProj.length > 0) proj = allProj[0];
        }
      }

      setActiveProject(proj);

      if (proj) {
        await fetchIssuesForProject(proj.id, effectiveMembers);
      }
    } catch (err) {
      console.error('Failed to load Jira Kanban data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIssuesForProject = async (projectId: string, membersList: OrgMemberDetail[]) => {
    try {
      const rawIssues = await jiraApi.getIssues(projectId);

      // Map raw issues to EnrichedKanbanTask
      const enriched: EnrichedKanbanTask[] = (rawIssues || []).map((issue: any) => {
        let mappedStatus: TaskStatusKey = 'TODO';
        const st = (issue.status || '').toUpperCase();
        if (st === 'IN_PROGRESS') mappedStatus = 'IN_PROGRESS';
        else if (st === 'IN_REVIEW' || st === 'IN_PREVIEW') mappedStatus = 'IN_PREVIEW';
        else if (st === 'DONE' || st === 'RESOLVED') mappedStatus = 'DONE';

        const assignee = membersList.find((m) => m.user_id === issue.assignee_id);
        const assigneeName = assignee?.full_name || issue.assignee_name || 'Chưa phân công';
        const assigneeAvatar = assignee?.avatar_url || generateInitialsAvatar(assigneeName);
        const assigneeRole = assignee?.role || 'Thành viên';

        return {
          id: issue.id,
          key: issue.key || `TASK-${issue.id.slice(0, 4)}`,
          title: issue.summary || 'Nhiệm vụ không tên',
          description: issue.description || '',
          status: mappedStatus,
          priority: (issue.priority || 'MEDIUM').toUpperCase() as TaskPriorityKey,
          assigneeId: issue.assignee_id,
          assigneeName,
          assigneeAvatar,
          assigneeRole,
          meetingId: issue.meeting_id,
          subtasks: loadSubtasksForTask(issue.id, issue.description),
          dueDate: issue.due_date,
        };
      });

      setTasks(enriched);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    }
  };

  // Sync tasks from completed meetings into this project
  const handleSyncMeetingTasks = async () => {
    if (!activeProject) return;
    setIsSyncing(true);
    try {
      // Find latest completed meeting
      const meetings = await meetingApi.listWithFilters({
        department_id: user?.department_id || undefined,
      });
      const completed = (meetings || []).filter((m) => {
        const s = (m.status || '').toUpperCase();
        return s === 'ENDED' || s === 'COMPLETED';
      });

      if (completed.length === 0) {
        onNotify('Không tìm thấy cuộc họp đã kết thúc nào để đồng bộ Action Items.');
        return;
      }

      let syncedCount = 0;
      for (const mtg of completed.slice(0, 3)) {
        try {
          const synced = await jiraApi.syncMeetingTasksToJira(mtg.id, {
            target_project_id: activeProject.id,
          });
          syncedCount += (synced || []).length;
        } catch {
          // ignore
        }
      }

      await fetchIssuesForProject(activeProject.id, deptMembers);
      onNotify(`Đã đồng bộ ${syncedCount} Action Items từ các cuộc họp về Bảng Kanban!`);
    } catch (err) {
      console.error('Failed to sync tasks from meetings:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Create new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeProject) return;

    setIsCreatingTask(true);
    try {
      const created = await jiraApi.createIssue({
        project_id: activeProject.id,
        summary: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        priority: newTaskPriority,
        status: 'TODO',
        assignee_id: newTaskAssigneeId || undefined,
      });

      const assignee = deptMembers.find((m) => m.user_id === created.assignee_id);
      const assigneeName = assignee?.full_name || 'Chưa phân công';

      const enrichedItem: EnrichedKanbanTask = {
        id: created.id,
        key: created.key || `TASK-${Date.now().toString().slice(-4)}`,
        title: created.summary,
        description: created.description || '',
        status: 'TODO',
        priority: (created.priority || 'HIGH').toUpperCase() as TaskPriorityKey,
        assigneeId: created.assignee_id,
        assigneeName,
        assigneeAvatar: assignee?.avatar_url || generateInitialsAvatar(assigneeName),
        assigneeRole: assignee?.role || 'Thành viên',
        subtasks: [
          {
            id: `sub-${created.id}-1`,
            title: 'Nghiên cứu và phân rã công việc',
            isCompleted: false,
          },
          { id: `sub-${created.id}-2`, title: 'Triển khai và báo cáo kết quả', isCompleted: false },
        ],
      };

      setTasks((prev) => [enrichedItem, ...prev]);
      setIsAddTaskOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskAssigneeId('');
      onNotify(`Đã thêm nhiệm vụ mới: "${enrichedItem.title}"`);
    } catch (err: any) {
      console.error('Failed to create issue:', err);
      alert(err?.message || 'Không thể tạo nhiệm vụ. Vui lòng thử lại.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // ── Drag & Drop Permission Enforcer ──
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    // If task is already DONE, lock and forbid dragging!
    if (target?.status === 'DONE') {
      e.preventDefault();
      onNotify('Nhiệm vụ đã Hoàn Thành (DONE) không thể chuyển ngược lại!');
      return;
    }
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: TaskStatusKey) => {
    e.preventDefault();
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    setDraggedTaskId(null);
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // RULE 1: If current status is DONE, CANNOT be dragged out!
    if (task.status === 'DONE') {
      onNotify('Nhiệm vụ đã Hoàn Thành (DONE) không thể chuyển ngược lại!');
      return;
    }

    // Same column - do nothing
    if (task.status === targetColumn) return;

    // RULE 2: ONLY MANAGER (or ADMIN/OWNER) can drag to DONE!
    if (targetColumn === 'DONE' && !isManagerOrAdmin) {
      onNotify('Chỉ Quản lý (Manager) mới có quyền phê duyệt Hoàn Thành (DONE)!');
      return;
    }

    // Optimistic Update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: targetColumn } : t)));

    try {
      // Backend status mapping: IN_PREVIEW -> IN_REVIEW
      const backendStatus = targetColumn === 'IN_PREVIEW' ? 'IN_REVIEW' : targetColumn;
      await jiraApi.updateIssue(taskId, { status: backendStatus });

      if (targetColumn === 'DONE') {
        onNotify(`Quản lý đã nghiệm thu & HOÀN THÀNH nhiệm vụ "${task.key}"!`);
      } else if (targetColumn === 'IN_PREVIEW') {
        onNotify(`Đã chuyển "${task.key}" sang Chờ Duyệt (IN PREVIEW) để Quản lý nghiệm thu.`);
      } else {
        onNotify(`Đã chuyển trạng thái "${task.key}" sang ${targetColumn}.`);
      }
    } catch (err) {
      console.error('Failed to update issue status on server:', err);
    }
  };

  // Subtask Handlers
  const handleToggleSubtask = (subtaskId: string) => {
    if (!selectedTask) return;

    const updatedSubtasks = selectedTask.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );

    const updatedTask = { ...selectedTask, subtasks: updatedSubtasks };
    setSelectedTask(updatedTask);
    saveSubtasksForTask(selectedTask.id, updatedSubtasks);

    setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updatedTask : t)));
  };

  const handleAddSubtask = () => {
    if (!selectedTask || !newSubtaskInput.trim()) return;

    const newSub: SubtaskItem = {
      id: `sub-${selectedTask.id}-${Date.now()}`,
      title: newSubtaskInput.trim(),
      isCompleted: false,
    };

    const updatedSubtasks = [...selectedTask.subtasks, newSub];
    const updatedTask = { ...selectedTask, subtasks: updatedSubtasks };
    setSelectedTask(updatedTask);
    saveSubtasksForTask(selectedTask.id, updatedSubtasks);

    setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updatedTask : t)));
    setNewSubtaskInput('');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!selectedTask) return;

    const updatedSubtasks = selectedTask.subtasks.filter((st) => st.id !== subtaskId);
    const updatedTask = { ...selectedTask, subtasks: updatedSubtasks };
    setSelectedTask(updatedTask);
    saveSubtasksForTask(selectedTask.id, updatedSubtasks);

    setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updatedTask : t)));
  };

  // Priority Styles
  const getPriorityBadge = (p: TaskPriorityKey) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800';
      case 'HIGH':
        return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800';
      case 'MEDIUM':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inKey = t.key.toLowerCase().includes(q);
        const inAssignee = t.assigneeName.toLowerCase().includes(q);
        if (!inTitle && !inKey && !inAssignee) return false;
      }
      if (selectedAssigneeFilter !== 'ALL') {
        if (t.assigneeId !== selectedAssigneeFilter) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, selectedAssigneeFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Bảng Nhiệm Vụ Mini Jira (Kanban Board)
            </h2>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
              <Sparkles size={11} />
              <span>{activeProject?.key || 'ENG'} SPRINT</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi tiến độ đầu việc sau cuộc họp. Thành viên kéo task tới Chờ Duyệt (IN PREVIEW)
            để Quản lý nghiệm thu sang Hoàn Thành (DONE).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm task, mã số, nhân sự..."
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 w-44 sm:w-56 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Member Filter Dropdown (Fixed Width) */}
          <div className="shrink-0 w-36">
            <select
              value={selectedAssigneeFilter}
              onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 truncate"
            >
              <option value="ALL">Tất cả nhân sự</option>
              {deptMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleSyncMeetingTasks}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Đồng bộ nhiệm vụ từ các cuộc họp gần nhất"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-blue-600' : ''} />
            <span>Đồng Bộ Họp</span>
          </button>

          {/* Add Task Button */}
          <button
            type="button"
            onClick={() => setIsAddTaskOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
          >
            <Plus size={14} />
            <span>Tạo Task</span>
          </button>
        </div>
      </div>

      {/* ── Kanban Columns Grid ── */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Đang tải bảng nhiệm vụ Kanban...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);

            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3 flex flex-col min-h-[520px] transition-colors hover:border-blue-300/40"
              >
                {/* Column Header */}
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 ${col.headerBg}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                    <span className="text-xs font-extrabold tracking-wide uppercase">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Cards List */}
                <div className="space-y-3 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xs italic">
                      Kéo thả task vào đây
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isDone = task.status === 'DONE';
                      const completedSubtasks = task.subtasks.filter((st) => st.isCompleted).length;
                      const totalSubtasks = task.subtasks.length;
                      const progressPct =
                        totalSubtasks > 0
                          ? Math.round((completedSubtasks / totalSubtasks) * 100)
                          : isDone
                            ? 100
                            : 0;

                      return (
                        <div
                          key={task.id}
                          draggable={!isDone}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setSelectedTask(task)}
                          className={`bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-2xs transition-all space-y-2.5 select-none ${
                            isDone
                              ? 'border-emerald-200/80 dark:border-emerald-900/40 opacity-90 cursor-pointer'
                              : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md cursor-grab active:cursor-grabbing'
                          }`}
                        >
                          {/* Task Top: Key & Priority */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10.5px] font-mono font-black text-slate-500 dark:text-slate-400">
                              {task.key}
                            </span>
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          {/* Task Title */}
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed">
                            {task.title}
                          </h4>

                          {/* Subtasks Progress Bar */}
                          {totalSubtasks > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                <span className="flex items-center gap-1">
                                  <CheckSquare size={11} className="text-blue-500" />
                                  <span>Tiến độ subtask</span>
                                </span>
                                <span>
                                  {completedSubtasks}/{totalSubtasks} ({progressPct}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Footer: Assignee Avatar & Done Lock Indicator */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                            <div className="flex items-center gap-1.5 truncate">
                              <img
                                src={task.assigneeAvatar}
                                alt={task.assigneeName}
                                className="w-5 h-5 rounded-full object-cover shrink-0"
                              />
                              <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[110px]">
                                {task.assigneeName}
                              </span>
                            </div>

                            {isDone ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 size={12} />
                                <span>Khóa DONE</span>
                              </span>
                            ) : task.status === 'IN_PREVIEW' ? (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                Chờ duyệt
                              </span>
                            ) : null}
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

      {/* ── MODAL CHI TIẾT NHIỆM VỤ & QUẢN LÝ SUBTASK ── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl space-y-5 my-8">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                    {selectedTask.key}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(
                      selectedTask.priority
                    )}`}
                  >
                    {selectedTask.priority}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Cột: {selectedTask.status}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            {selectedTask.description && (
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {selectedTask.description}
              </div>
            )}

            {/* Assignee & Status Row */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Người Phụ Trách:
                </span>
                <div className="flex items-center gap-2">
                  <img
                    src={selectedTask.assigneeAvatar}
                    alt={selectedTask.assigneeName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedTask.assigneeName}
                    </div>
                    <div className="text-[10px] text-slate-400">{selectedTask.assigneeRole}</div>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Trạng Thái Duyệt:
                </span>
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  {selectedTask.status === 'DONE' ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Hoàn Thành (Đã Khóa)
                    </span>
                  ) : selectedTask.status === 'IN_PREVIEW' ? (
                    <span className="text-amber-600">Đang Chờ Quản Lý Nghiệm Thu</span>
                  ) : (
                    <span className="text-blue-600">Đang Thực Hiện</span>
                  )}
                </div>
              </div>
            </div>

            {/* Subtasks Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-blue-600" />
                  <span>
                    Danh Sách Subtask Nhỏ (
                    {selectedTask.subtasks.filter((s) => s.isCompleted).length}/
                    {selectedTask.subtasks.length})
                  </span>
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  Click để tích chọn hoàn thành
                </span>
              </div>

              {/* Subtasks Checklist */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedTask.subtasks.map((st) => (
                  <div
                    key={st.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                      st.isCompleted
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-slate-500 dark:text-slate-400 line-through'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div
                      onClick={() => handleToggleSubtask(st.id)}
                      className="flex items-center gap-2.5 flex-1 cursor-pointer"
                    >
                      {st.isCompleted ? (
                        <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-400 shrink-0" />
                      )}
                      <span>{st.title}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(st.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      title="Xóa subtask"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Subtask Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Thêm subtask mới..."
                  value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
                >
                  Thêm
                </button>
              </div>
            </div>

            {/* Quick Status Action for Manager */}
            {isManagerOrAdmin && selectedTask.status !== 'DONE' && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                <div className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  Quyền Quản Lý: Nghiệm thu và đưa nhiệm vụ sang Hoàn Thành (DONE).
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await handleDrop({ preventDefault: () => {} } as any, 'DONE');
                    setSelectedTask(null);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer shrink-0"
                >
                  Duyệt DONE
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL TẠO NHIỆM VỤ MỚI ── */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Tạo Nhiệm Vụ Mini Jira
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên nhiệm vụ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cập nhật giao thức WebSocket STT sub-second"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả tiêu chí nghiệm thu (Acceptance criteria)..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriorityKey)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CRITICAL">Khẩn Cấp (Critical)</option>
                    <option value="HIGH">Cao (High)</option>
                    <option value="MEDIUM">Trung Bình (Medium)</option>
                    <option value="LOW">Thấp (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Gán cho nhân sự
                  </label>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chưa gán --</option>
                    {deptMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTaskOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingTask ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Tạo Task Mới</span>
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
