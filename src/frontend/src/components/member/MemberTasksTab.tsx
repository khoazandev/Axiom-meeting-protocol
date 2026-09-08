'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Kanban,
  List,
  Clock,
  User,
  Video,
  Loader2,
  Calendar,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { MatIcon } from '@/components/ui/MatIcon';
import { getAuthHeaders } from '@/lib/api';
import { getStoredMemberTasks } from '@/lib/workloadProtocolData';

interface RemoteTask {
  id: string;
  title: string;
  meeting_id?: string | number | null;
  assignee_id?: string | null;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  due_date?: string | null;
}

interface MemberTask {
  id: string;
  title: string;
  meetingTitle: string;
  meetingId: string;
  mandateOrigin: string;
  assignee: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  dueDate: string;
}

interface MemberTasksTabProps {
  onNotify: (msg: string) => void;
  onNavigateToJira?: () => void;
}

const DEFAULT_ALEX_TASKS: MemberTask[] = [
  {
    id: 'tsk-01',
    title: 'Triển khai LiveKit Audio Egress & S3 Auto-Upload',
    meetingTitle: 'Họp Sprint 42 Kỹ Thuật',
    meetingId: 'ENG-SPRINT-42',
    mandateOrigin: 'MANDATE-Q3-01 (Chỉ đạo Ban Giám Đốc Q3)',
    assignee: 'Alex Rivera (Tôi)',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: 'Hôm nay, 18:00',
  },
  {
    id: 'tsk-02',
    title: 'Tối ưu hóa Buffer Whisper STT Latency < 400ms',
    meetingTitle: 'Họp Sprint 42 Kỹ Thuật',
    meetingId: 'ENG-SPRINT-42',
    mandateOrigin: 'MANDATE-Q3-01 (Chỉ đạo Ban Giám Đốc Q3)',
    assignee: 'Alex Rivera (Tôi)',
    priority: 'HIGH',
    status: 'TODO',
    dueDate: 'Ngày mai, 12:00',
  },
  {
    id: 'tsk-03',
    title: 'Nghiên cứu mô hình nén ngữ nghĩa STT đa ngôn ngữ',
    meetingTitle: 'Họp Sprint 42 Kỹ Thuật',
    meetingId: 'ENG-SPRINT-42',
    mandateOrigin: 'MANDATE-Q3-02 (Chỉ đạo Ban Giám Đốc Q3)',
    assignee: 'Alex Rivera (Tôi)',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: 'Thứ Sáu, 17:00',
  },
];

export function MemberTasksTab({ onNotify, onNavigateToJira }: MemberTasksTabProps) {
  const [tasks, setTasks] = useState<MemberTask[]>(DEFAULT_ALEX_TASKS);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadTasks() {
      try {
        setIsLoading(true);
        const headers = getAuthHeaders();
        if (!headers['Authorization']) {
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/v1/tasks', { headers });
        if (res.ok) {
          const remoteTasks = (await res.json()) as RemoteTask[];
          if (Array.isArray(remoteTasks) && remoteTasks.length > 0) {
            const mapped: MemberTask[] = remoteTasks.map((t, idx) => {
              let mappedStatus: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' = 'TODO';
              if (t.status === 'COMPLETED') mappedStatus = 'COMPLETED';
              else if (t.status === 'IN_PROGRESS') mappedStatus = 'IN_PROGRESS';
              else if (t.status === 'IN_REVIEW') mappedStatus = 'IN_REVIEW';
              else if (t.status === 'CONFIRMED') mappedStatus = 'IN_PROGRESS';
              else mappedStatus = 'TODO';

              return {
                id: t.id,
                title: t.title,
                meetingTitle: t.meeting_id
                  ? `Meeting #${String(t.meeting_id).substring(0, 8)}`
                  : 'Họp Sprint 42 Kỹ Thuật',
                meetingId: t.meeting_id ? String(t.meeting_id) : '',
                mandateOrigin: 'MANDATE-Q3-01 (Chỉ đạo Ban Giám Đốc Q3)',
                assignee: 'Alex Rivera (Tôi)',
                priority: t.priority || 'HIGH',
                status: mappedStatus,
                dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString('vi-VN') : 'Hôm nay',
              };
            });
            setTasks(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to load tasks from API:', err);
      } finally {
        const stored = getStoredMemberTasks();
        if (stored.length > 0) {
          const storedMapped: MemberTask[] = stored.map((s) => ({
            id: s.id,
            title: s.title,
            meetingTitle: s.meetingOrigin,
            meetingId: s.mandateOriginCode,
            mandateOrigin: s.mandateOriginTitle || 'Chỉ đạo cấp cao',
            assignee: s.assigneeName,
            priority:
              s.priority === 'CRITICAL' || s.priority === 'HIGH'
                ? 'HIGH'
                : s.priority === 'MEDIUM'
                  ? 'MEDIUM'
                  : 'LOW',
            status:
              s.status === 'DONE'
                ? 'COMPLETED'
                : s.status === 'IN_PROGRESS'
                  ? 'IN_PROGRESS'
                  : 'TODO',
            dueDate: s.deadline || 'Tuần này',
          }));
          setTasks((prev) => [
            ...storedMapped,
            ...prev.filter((p) => !storedMapped.some((sm) => sm.id === p.id)),
          ]);
        }
        setIsLoading(false);
      }
    }

    loadTasks();
  }, []);

  const handleAdvanceStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        let nextStatus: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' = 'IN_PROGRESS';
        if (t.status === 'TODO') nextStatus = 'IN_PROGRESS';
        else if (t.status === 'IN_PROGRESS') nextStatus = 'IN_REVIEW';
        else if (t.status === 'IN_REVIEW') nextStatus = 'COMPLETED';
        else nextStatus = 'COMPLETED';

        onNotify(`Đã cập nhật nhiệm vụ: ${t.title} -> ${nextStatus}`);
        return { ...t, status: nextStatus };
      })
    );
  };

  const columns: Array<{
    id: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
    title: string;
    dotColor: string;
  }> = [
    { id: 'TODO', title: 'Cần Làm (To Do)', dotColor: 'bg-slate-400' },
    { id: 'IN_PROGRESS', title: 'Đang Thực Hiện', dotColor: 'bg-blue-500' },
    { id: 'IN_REVIEW', title: 'Chờ Đánh Giá', dotColor: 'bg-amber-500' },
    { id: 'COMPLETED', title: 'Đã Hoàn Thành', dotColor: 'bg-emerald-500' },
  ];

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Bàn Giao Nhiệm Vụ Của Tôi
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
              <Sparkles size={11} />
              AI MEETING ACTION ITEMS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Được phân rã tự động từ cuộc họp phòng ban và liên kết trực tiếp với Nghị quyết của Ban
            Giám Đốc.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToJira && (
            <button
              type="button"
              onClick={onNavigateToJira}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Kanban size={14} />
              <span>Mở Bảng Mini Jira</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban size={13} />
              <span>Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List size={13} />
              <span>Danh Sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MY CAPACITY PULSE WIDGET ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/50 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <MatIcon name="speed" className="text-[22px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Tải Công Việc Tuần Của Tôi (Alex Rivera)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                🟢 85% - TỐI ƯU BỀN VỮNG
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              3 Tasks phụ trách • 12h họp tuần • 22h cam kết thực thi • Định mức 40h/tuần
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:w-64">
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: '85%' }}
            />
          </div>
          <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200 shrink-0">
            34h / 40h
          </span>
        </div>
      </div>

      {/* Search filter input */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Lọc nhiệm vụ theo tiêu đề..."
          className="px-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-72 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />

        <div className="text-xs text-slate-500">
          Tổng cộng: <strong>{filteredTasks.length}</strong> nhiệm vụ
        </div>
      </div>

      {/* Task Content: Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-50/80 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col min-h-[380px]"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {col.title}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-center p-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <p className="text-[11px] text-slate-400">Không có nhiệm vụ</p>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            {task.id}
                          </span>
                          <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                            {task.priority}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {task.title}
                        </h4>

                        {/* STRATEGIC MANDATE TRACEABILITY BADGE */}
                        <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-300 font-bold truncate">
                            <MatIcon name="account_tree" className="text-[13px] shrink-0" />
                            <span className="truncate">{task.mandateOrigin}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9.5px] text-slate-500 dark:text-slate-400">
                            <Video size={10} className="shrink-0 text-slate-400" />
                            <span className="truncate">{task.meetingTitle}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1 truncate max-w-[110px]">
                            <User size={11} />
                            <span>{task.assignee}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-mono">
                            <Clock size={11} />
                            <span>{task.dueDate}</span>
                          </span>
                        </div>

                        {task.status !== 'COMPLETED' && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(task.id)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>Chuyển tiếp</span>
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Content: List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                      {task.id}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {task.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                      <MatIcon name="account_tree" className="text-[13px]" />
                      <span>{task.mandateOrigin}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Video size={11} />
                      <span>{task.meetingTitle}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock size={11} />
                    <span>{task.dueDate}</span>
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    }`}
                  >
                    {task.status}
                  </span>

                  {task.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(task.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      Tiếp tục
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
