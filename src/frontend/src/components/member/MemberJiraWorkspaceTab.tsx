'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Kanban,
  Plus,
  Clock,
  CheckCircle2,
  Sparkles,
  Search,
  AlertCircle,
  Video,
  User as UserIcon,
  CheckSquare,
  Square,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  Paperclip,
  Download,
  FileText,
  Upload,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  jiraApi,
  organizationAdminApi,
  Issue,
  JiraProject,
  OrgMemberDetail,
} from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { generateInitialsAvatar } from '@/components/profile/UserProfileModal';

export type TaskStatusKey = 'TODO' | 'IN_PROGRESS' | 'IN_PREVIEW' | 'DONE';
export type TaskPriorityKey = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface TaskAttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploaderName: string;
  dataUrl?: string;
}

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

interface MemberJiraWorkspaceTabProps {
  onNotify: (msg: string) => void;
}

export function MemberJiraWorkspaceTab({ onNotify }: MemberJiraWorkspaceTabProps) {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyTasks, setOnlyMyTasks] = useState(true);

  // Drag State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverCol, setDraggedOverCol] = useState<TaskStatusKey | null>(null);

  // Task Details Modal State
  const [selectedTask, setSelectedTask] = useState<EnrichedKanbanTask | null>(null);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Task Attachments State (Import file cho manager xem)
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachmentItem[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);

  // Add Task Modal State ("Thêm Task")
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriorityKey>('HIGH');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Load attachments when selecting a task
  useEffect(() => {
    if (selectedTask) {
      try {
        const stored = localStorage.getItem(`axiom_task_att_${selectedTask.id}`);
        if (stored) {
          setTaskAttachments(JSON.parse(stored));
        } else {
          setTaskAttachments([]);
        }
      } catch {
        setTaskAttachments([]);
      }
    } else {
      setTaskAttachments([]);
    }
  }, [selectedTask?.id]);

  // Handle File Upload by Member for Manager review
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    setIsUploadingAttachment(true);
    try {
      let dataUrl: string | undefined = undefined;
      if (file.size < 4 * 1024 * 1024) {
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
      }
      const newAtt: TaskAttachmentItem = {
        id: `att-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadedAt: new Date().toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        }),
        uploaderName: user?.full_name || 'Thành Viên Mẫu',
        dataUrl,
      };
      const updated = [newAtt, ...taskAttachments];
      setTaskAttachments(updated);
      try {
        localStorage.setItem(`axiom_task_att_${selectedTask.id}`, JSON.stringify(updated));
      } catch (err) {
        console.warn('LocalStorage quota for attachment:', err);
      }
      onNotify(`Đã tải lên tệp "${file.name}" để Quản lý kiểm tra & nghiệm thu.`);
    } catch (err) {
      console.error('File upload error:', err);
      onNotify('Không thể tải tệp lên.');
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentFileInputRef.current) attachmentFileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = (attId: string) => {
    if (!selectedTask) return;
    const updated = taskAttachments.filter((a) => a.id !== attId);
    setTaskAttachments(updated);
    try {
      localStorage.setItem(`axiom_task_att_${selectedTask.id}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
    onNotify('Đã gỡ tệp đính kèm.');
  };

  const handleDownloadAttachment = (att: TaskAttachmentItem) => {
    if (att.dataUrl) {
      const a = document.createElement('a');
      a.href = att.dataUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob([`Tệp đính kèm: ${att.name}\nNgười tải: ${att.uploaderName}`], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Subtasks local storage sync helper
  const loadSubtasksForTask = (taskId: string, description?: string): SubtaskItem[] => {
    try {
      const stored = localStorage.getItem(`axiom_subtasks_${taskId}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }

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

  // Initial Load: Projects, Issues & Members
  useEffect(() => {
    loadKanbanData();
  }, [user?.department_id, resolvedOrgId]);

  const loadKanbanData = async () => {
    setIsLoading(true);
    try {
      const membersRes = await organizationAdminApi.getMembers(resolvedOrgId);
      const members = Array.isArray(membersRes) ? membersRes : [];

      const myDeptId =
        user?.department_id ||
        members.find((m) => m.user_id === user?.id || m.email === user?.email)?.department_id ||
        'f985a4ed-2f43-4659-8ce2-adc81b0fc5e5';

      const effectiveMembers = members.filter((m) => {
        if (myDeptId) {
          return m.department_id === myDeptId;
        }
        return true;
      });
      setDeptMembers(effectiveMembers);

      // Load Jira Projects prioritizing SMA (Smart Meeting AI Core) or department project
      const projects = await jiraApi.getProjects({
        department_id: user?.department_id || undefined,
        organization_id: resolvedOrgId,
      });

      let proj: JiraProject | null = null;
      if (projects && projects.length > 0) {
        proj = projects.find((p) => p.key === 'SMA') || projects[0];
      }

      setActiveProject(proj);

      if (proj) {
        await fetchIssuesForProject(proj.id, effectiveMembers);
      }
    } catch (err) {
      console.error('Failed to load Jira Kanban data for member:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIssuesForProject = async (projectId: string, membersList: OrgMemberDetail[]) => {
    try {
      const rawIssues = await jiraApi.getIssues(projectId);

      const memberIds = new Set(membersList.map((m) => m.user_id));
      if (user?.id) memberIds.add(user.id);

      const relevantIssues = (rawIssues || []).filter((issue: any) => {
        if (!issue.assignee_id) return true;
        return memberIds.has(issue.assignee_id);
      });

      const enriched: EnrichedKanbanTask[] = relevantIssues.map((issue: any) => {
        let mappedStatus: TaskStatusKey = 'TODO';
        const st = (issue.status || '').toUpperCase();
        if (st === 'IN_PROGRESS') mappedStatus = 'IN_PROGRESS';
        else if (st === 'IN_REVIEW' || st === 'IN_PREVIEW') mappedStatus = 'IN_PREVIEW';
        else if (st === 'DONE' || st === 'RESOLVED') mappedStatus = 'DONE';

        const assignee = membersList.find((m) => m.user_id === issue.assignee_id);
        const assigneeName =
          issue.assignee_id === user?.id
            ? user?.full_name || 'Thành Viên Mẫu'
            : assignee?.full_name || issue.assignee_name || 'Chưa phân công';
        const assigneeAvatar =
          issue.assignee_id === user?.id
            ? user?.avatar_url || generateInitialsAvatar(assigneeName)
            : assignee?.avatar_url || generateInitialsAvatar(assigneeName);
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
      console.error('Failed to fetch issues for member:', err);
    }
  };

  // Create new task by Member ("Thêm Task")
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeProject) return;

    setIsCreatingTask(true);
    try {
      const assignedId = newTaskAssigneeId || user?.id || undefined;
      const created = await jiraApi.createIssue({
        project_id: activeProject.id,
        summary: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        priority: newTaskPriority,
        status: 'TODO',
        assignee_id: assignedId,
      });

      const assignee = deptMembers.find((m) => m.user_id === created.assignee_id);
      const assigneeName =
        created.assignee_id === user?.id
          ? user?.full_name || 'Thành Viên Mẫu'
          : assignee?.full_name || 'Chưa phân công';

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

  // Drag & Drop Handler
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target?.status === 'DONE') {
      e.preventDefault();
      onNotify('Nhiệm vụ đã Hoàn Thành (DONE) không thể chuyển ngược lại!');
      return;
    }
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, colKey: TaskStatusKey) => {
    e.preventDefault();
    if (draggedOverCol !== colKey) {
      setDraggedOverCol(colKey);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: TaskStatusKey) => {
    e.preventDefault();
    setDraggedOverCol(null);
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

    if (task.status === targetColumn) return;

    // RULE 2: ONLY MANAGER / OWNER can drag to DONE!
    if (targetColumn === 'DONE' && !isManagerOrAdmin) {
      onNotify('Chỉ Quản lý mới có quyền duyệt sang Hoàn Thành (DONE). Hãy kéo sang Chờ Duyệt (IN PREVIEW)!');
      return;
    }

    // Optimistic Update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: targetColumn } : t)));

    try {
      const backendStatus = targetColumn === 'IN_PREVIEW' ? 'IN_REVIEW' : targetColumn;
      await jiraApi.updateIssue(taskId, { status: backendStatus });

      if (targetColumn === 'IN_PREVIEW') {
        onNotify(`Đã gửi "${task.key}" sang Chờ Duyệt (IN PREVIEW) để Quản lý nghiệm thu!`);
      } else if (targetColumn === 'DONE') {
        onNotify(`Đã nghiệm thu & Hoàn thành nhiệm vụ "${task.key}"!`);
      } else {
        onNotify(`Đã chuyển trạng thái "${task.key}" sang ${targetColumn}.`);
      }
    } catch (err) {
      console.error('Failed to update issue status on server:', err);
    }
  };

  // Move directly to IN_PREVIEW for review
  const handleSubmitForReview = async (task: EnrichedKanbanTask) => {
    const targetStatus: TaskStatusKey = 'IN_PREVIEW';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: targetStatus } : t)));
    if (selectedTask) setSelectedTask({ ...selectedTask, status: targetStatus });

    try {
      await jiraApi.updateIssue(task.id, { status: 'IN_REVIEW' });
      onNotify(`Đã chuyển "${task.key}" sang Chờ Duyệt (IN PREVIEW) để Quản lý nghiệm thu!`);
    } catch (err) {
      console.error('Failed to submit for review:', err);
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

  // Filtered Tasks (with "Chỉ việc của tôi" toggle)
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inKey = t.key.toLowerCase().includes(q);
        const inAssignee = t.assigneeName.toLowerCase().includes(q);
        if (!inTitle && !inKey && !inAssignee) return false;
      }
      if (onlyMyTasks && user?.id) {
        if (t.assigneeId !== user.id) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, onlyMyTasks, user?.id]);

  const myTasksCount = useMemo(() => {
    if (!user?.id) return tasks.length;
    return tasks.filter((t) => t.assigneeId === user.id).length;
  }, [tasks, user?.id]);

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
              <span>{activeProject?.key || 'SMA'} SPRINT</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Nhận nhiệm vụ từ cuộc họp và quản lý, tải tệp tài liệu/báo cáo và kéo task sang Chờ Duyệt (IN PREVIEW) để Quản lý nghiệm thu.
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
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 w-44 sm:w-52 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Toggle "Chỉ việc của tôi" vs "Tất cả công việc" (Fixed Dimension Locking) */}
          <button
            type="button"
            onClick={() => setOnlyMyTasks(!onlyMyTasks)}
            className={`shrink-0 w-36 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
              onlyMyTasks
                ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900'
            }`}
            title="Lọc hiển thị nhiệm vụ của riêng bạn hoặc toàn bộ phòng ban"
          >
            <Filter size={12} />
            <span className="truncate">{onlyMyTasks ? `Việc của tôi (${myTasksCount})` : 'Tất cả việc'}</span>
          </button>

          {/* Add Task Button ("Thêm Task" thay thế "Tạo task") */}
          <button
            type="button"
            onClick={() => {
              setNewTaskAssigneeId(user?.id || '');
              setIsAddTaskOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
          >
            <Plus size={14} />
            <span>Thêm Task</span>
          </button>
        </div>
      </div>

      {/* ── Kanban Columns Grid ── */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Đang đồng bộ bảng nhiệm vụ Mini Jira...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            const isColTargeted = draggedOverCol === col.key;

            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`rounded-2xl border p-3 flex flex-col min-h-[520px] transition-all duration-200 ${
                  isColTargeted
                    ? 'bg-blue-500/10 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30 shadow-md scale-[1.01]'
                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
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
                    <div
                      className={`h-32 border-2 border-dashed rounded-xl flex items-center justify-center text-xs italic transition-all ${
                        isColTargeted
                          ? 'border-blue-500 text-blue-500 bg-blue-50/50 dark:bg-blue-950/40 scale-102'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      Kéo thả task vào đây
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {colTasks.map((task) => {
                        const isDone = task.status === 'DONE';
                        const isBeingDragged = draggedTaskId === task.id;
                        const completedSubtasks = task.subtasks.filter(
                          (st) => st.isCompleted
                        ).length;
                        const totalSubtasks = task.subtasks.length;
                        const progressPct =
                          totalSubtasks > 0
                            ? Math.round((completedSubtasks / totalSubtasks) * 100)
                            : isDone
                              ? 100
                              : 0;

                        return (
                          <motion.div
                            layout
                            layoutId={task.id}
                            key={task.id}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{
                              opacity: isBeingDragged ? 0.35 : 1,
                              scale: isBeingDragged ? 0.96 : 1,
                            }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            whileHover={
                              !isDone
                                ? {
                                    y: -2,
                                    boxShadow:
                                      '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                  }
                                : {}
                            }
                            whileTap={!isDone ? { scale: 0.98 } : {}}
                            draggable={!isDone}
                            onDragStart={(e) => handleDragStart(e as any, task.id)}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDraggedOverCol(null);
                            }}
                            onClick={() => setSelectedTask(task)}
                            className={`bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-2xs space-y-2.5 select-none transition-colors ${
                              isDone
                                ? 'border-emerald-200/80 dark:border-emerald-900/40 opacity-90 cursor-pointer'
                                : isBeingDragged
                                  ? 'border-blue-500 border-dashed ring-2 ring-blue-400/40 cursor-grabbing'
                                  : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 cursor-grab active:cursor-grabbing'
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

                            {/* Task Title (Strike-through on DONE) */}
                            <h4
                              className={`text-xs font-bold line-clamp-2 leading-relaxed ${
                                isDone
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
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

                            {/* Footer: Assignee Avatar & DONE Status Indicator */}
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
                                {task.assigneeId === user?.id && (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                                    Tôi
                                  </span>
                                )}
                              </div>

                              {isDone ? (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  <CheckCircle2 size={12} />
                                  <span>DONE</span>
                                </span>
                              ) : task.status === 'IN_PREVIEW' ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  Chờ duyệt
                                </span>
                              ) : null}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL CHI TIẾT NHIỆM VỤ & TẢI TỆP ĐÍNH KÈM CHO MANAGER XEM ── */}
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
                <h3
                  className={`text-base font-black leading-snug ${
                    selectedTask.status === 'DONE'
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
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
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <span>{selectedTask.assigneeName}</span>
                      {selectedTask.assigneeId === user?.id && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-600 font-bold">
                          (Bạn)
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">{selectedTask.assigneeRole}</div>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Trạng Thái Hiện Tại:
                </span>
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  {selectedTask.status === 'DONE' ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Hoàn Thành (Đã Khóa)
                    </span>
                  ) : selectedTask.status === 'IN_PREVIEW' ? (
                    <span className="text-amber-600">Đang Chờ Quản Lý Nghiệm Thu</span>
                  ) : (
                    <span className="text-blue-600">Đang Triển Khai</span>
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
              <div className="space-y-2 max-h-44 overflow-y-auto">
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

            {/* File Attachments Section (Member import tài liệu / báo cáo cho manager xem) */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-blue-600" />
                    <span>Tài Liệu & Báo Cáo Đính Kèm ({taskAttachments.length})</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tải lên file kết quả/báo cáo để Quản lý kiểm tra & nghiệm thu
                  </p>
                </div>

                {/* Upload Trigger Button */}
                <div>
                  <input
                    type="file"
                    ref={attachmentFileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => attachmentFileInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    {isUploadingAttachment ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    <span>{isUploadingAttachment ? 'Đang tải...' : 'Tải lên tệp'}</span>
                  </button>
                </div>
              </div>

              {/* Attachments List */}
              {taskAttachments.length === 0 ? (
                <div className="py-4 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                  Chưa có tệp đính kèm nào. Nhấn "Tải lên tệp" để import tài liệu hoặc hình ảnh minh chứng.
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {taskAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText size={16} className="text-blue-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-bold text-slate-800 dark:text-slate-200 truncate"
                            title={att.name}
                          >
                            {att.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(att.size / 1024).toFixed(1)} KB • {att.uploaderName} • {att.uploadedAt}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(att)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                          title="Tải xuống tệp"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                          title="Gỡ tệp"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Transition Action for Member */}
            {selectedTask.status !== 'DONE' && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
                <div className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                  {selectedTask.status === 'IN_PREVIEW'
                    ? 'Đã chuyển sang Chờ Duyệt. Đang đợi Quản lý nghiệm thu sang Hoàn Thành (DONE).'
                    : 'Hoàn tất công việc? Gửi sang Chờ Duyệt để Quản lý nghiệm thu.'}
                </div>
                {selectedTask.status !== 'IN_PREVIEW' && (
                  <button
                    type="button"
                    onClick={() => handleSubmitForReview(selectedTask)}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer shrink-0"
                  >
                    Gửi Duyệt (IN PREVIEW)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL TẠO NHIỆM VỤ MỚI ("Thêm Task") ── */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Thêm Task Mới (Mini Jira)
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
                  placeholder="VD: Viết kịch bản kiểm thử API LiveKit"
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
                  placeholder="Mô tả tiêu chí nghiệm thu hoặc kết quả mong đợi..."
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
                    <option value={user?.id || ''}>Gán cho tôi ({user?.full_name || 'Thành Viên Mẫu'})</option>
                    {deptMembers
                      .filter((m) => m.user_id !== user?.id)
                      .map((m) => (
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
                    <span>Thêm Task</span>
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
