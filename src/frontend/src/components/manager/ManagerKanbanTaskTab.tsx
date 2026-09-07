'use client';

import React, { useState } from 'react';
import {
  Kanban,
  Plus,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  AlertCircle,
  Video,
} from 'lucide-react';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface KanbanTask {
  id: string;
  title: string;
  sourceMeeting: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: {
    name: string;
    avatar: string;
    role: string;
  };
  deadline: string;
  aiConfidenceScore: number;
}

const INITIAL_TASKS: KanbanTask[] = [
  {
    id: 'task-01',
    title: 'Triển khai LiveKit Audio Egress & S3 Auto-Upload',
    sourceMeeting: 'ENG-SPRINT-42',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    assignee: {
      name: 'Alex Rivera',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      role: 'Senior AI Engineer',
    },
    deadline: 'Hôm nay, 18:00',
    aiConfidenceScore: 98,
  },
  {
    id: 'task-02',
    title: 'Tối ưu hóa Audio Buffer cho Whisper STT Latency < 400ms',
    sourceMeeting: 'ENG-SPRINT-42',
    status: 'TODO',
    priority: 'HIGH',
    assignee: {
      name: 'Alex Rivera',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      role: 'Senior AI Engineer',
    },
    deadline: 'Ngày mai, 12:00',
    aiConfidenceScore: 95,
  },
  {
    id: 'task-03',
    title: 'Kiểm thử tải đồng thời 50 Room LiveKit với docker-compose',
    sourceMeeting: 'ENG-SPRINT-42',
    status: 'TODO',
    priority: 'MEDIUM',
    assignee: {
      name: 'Phạm Quốc Bảo',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      role: 'DevOps Engineer',
    },
    deadline: '08/09/2026',
    aiConfidenceScore: 92,
  },
  {
    id: 'task-04',
    title: 'Sửa lỗi Anti-Layout-Shift trên Dropdown phân quyền',
    sourceMeeting: 'ENG-DAILY-SYNC',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignee: {
      name: 'Lê Thị Hồng',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      role: 'Frontend Lead',
    },
    deadline: 'Hôm nay, 21:00',
    aiConfidenceScore: 99,
  },
  {
    id: 'task-05',
    title: 'Viết Unit Test cho Agenda Gatekeeper Rule',
    sourceMeeting: 'ENG-SPRINT-41',
    status: 'DONE',
    priority: 'MEDIUM',
    assignee: {
      name: 'Đặng Thùy Dung',
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
      role: 'QA Automation',
    },
    deadline: 'Đã hoàn thành',
    aiConfidenceScore: 96,
  },
  {
    id: 'task-06',
    title: 'Đồng bộ bảng User Schema với PostgreSQL 16 & Prisma',
    sourceMeeting: 'ENG-SPRINT-41',
    status: 'DONE',
    priority: 'HIGH',
    assignee: {
      name: 'Vũ Hải Đăng',
      avatar:
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
      role: 'Backend Specialist',
    },
    deadline: 'Đã hoàn thành',
    aiConfidenceScore: 100,
  },
];

const COLUMNS: { key: TaskStatus; label: string; dotColor: string }[] = [
  { key: 'TODO', label: 'Cần Làm (To Do)', dotColor: 'bg-slate-400' },
  { key: 'IN_PROGRESS', label: 'Đang Làm (In Progress)', dotColor: 'bg-blue-500' },
  { key: 'DONE', label: 'Hoàn Thành (Done)', dotColor: 'bg-emerald-500' },
];

interface ManagerKanbanTaskTabProps {
  onNotify: (msg: string) => void;
}

export function ManagerKanbanTaskTab({ onNotify }: ManagerKanbanTaskTabProps) {
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_TASKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('HIGH');

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sourceMeeting.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const moveTask = (taskId: string, direction: 'next' | 'prev') => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        let nextStatus: TaskStatus = task.status;
        if (direction === 'next') {
          if (task.status === 'TODO') nextStatus = 'IN_PROGRESS';
          else if (task.status === 'IN_PROGRESS') nextStatus = 'DONE';
        } else {
          if (task.status === 'DONE') nextStatus = 'IN_PROGRESS';
          else if (task.status === 'IN_PROGRESS') nextStatus = 'TODO';
        }

        return { ...task, status: nextStatus };
      })
    );
    const target = tasks.find((t) => t.id === taskId);
    onNotify(`Đã cập nhật trạng thái nhiệm vụ: "${target?.title.slice(0, 30)}..."`);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      sourceMeeting: 'HỌP NỘI BỘ',
      status: 'TODO',
      priority: newTaskPriority,
      assignee: {
        name: 'Alex Rivera',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        role: 'Senior AI Engineer',
      },
      deadline: 'Hôm nay',
      aiConfidenceScore: 97,
    };

    setTasks([newTask, ...tasks]);
    setIsAddTaskOpen(false);
    setNewTaskTitle('');
    onNotify(`Đã thêm nhiệm vụ mới vào bảng Kanban: "${newTask.title}"`);
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800';
      case 'HIGH':
        return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800';
      case 'MEDIUM':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Bảng Nhiệm Vụ AI (Jira Kanban)
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
              <Sparkles size={11} />
              AI ACTION ITEMS DISPATCHER
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Các đầu việc tự động trích xuất từ biên bản họp phòng ban, cho phép Trưởng phòng giao
            việc và giám sát tiến độ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm task, nhân sự, phòng..."
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 w-52 focus:w-64 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddTaskOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>Thêm Task</span>
          </button>
        </div>
      </div>

      {/* 3-Column Jira Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const columnTasks = filteredTasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {col.label}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {columnTasks.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-400">Không có nhiệm vụ nào</p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all space-y-3"
                    >
                      {/* Task Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${getPriorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Video size={10} />
                            {task.sourceMeeting}
                          </span>
                        </div>

                        <span
                          className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-0.5"
                          title="Độ tin cậy trích xuất AI"
                        >
                          <Sparkles size={10} />
                          {task.aiConfidenceScore}% AI
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                        {task.title}
                      </h4>

                      {/* Assignee & Deadline */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <img
                            src={task.assignee.avatar}
                            alt={task.assignee.name}
                            title={`${task.assignee.name} - ${task.assignee.role}`}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                            {task.assignee.name}
                          </span>
                        </div>

                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          {task.deadline}
                        </span>
                      </div>

                      {/* Quick Move Buttons */}
                      <div className="flex items-center justify-between pt-1">
                        {task.status !== 'TODO' ? (
                          <button
                            type="button"
                            onClick={() => moveTask(task.id, 'prev')}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Chuyển về trạng thái trước"
                          >
                            <ArrowLeft size={12} />
                            <span>Lùi lại</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        {task.status !== 'DONE' && (
                          <button
                            type="button"
                            onClick={() => moveTask(task.id, 'next')}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer ml-auto transition-colors"
                            title="Chuyển sang trạng thái tiếp theo"
                          >
                            <span>Tiến độ</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Thêm Task */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Giao Nhiệm Vụ Mới (Khối Kỹ Thuật)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên nhiệm vụ *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mô tả cụ thể việc cần làm..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mức độ ưu tiên
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['URGENT', 'HIGH', 'MEDIUM'] as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTaskPriority(p)}
                      className={`py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        newTaskPriority === p
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTaskOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
