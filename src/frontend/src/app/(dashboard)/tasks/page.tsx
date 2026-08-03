'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/api';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import {
  CheckSquare,
  Plus,
  Filter,
  Kanban,
  List,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Video,
  Loader2,
  Calendar,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  meetingTitle: string;
  meetingId: string;
  assignee: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  dueDate: string;
}



export default function TasksPage() {
  const { t } = useLanguageStore();
  const [tasks, setTasks] = useState<Task[]>([]);
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
          const remoteTasks = await res.json();
          if (Array.isArray(remoteTasks) && remoteTasks.length > 0) {
            const mapped: Task[] = remoteTasks.map((t: any) => ({
              id: t.id.substring(0, 8),
              title: t.title,
              meetingTitle: t.meeting_id ? `Meeting #${t.meeting_id}` : 'General Workspace Task',
              meetingId: t.meeting_id ? String(t.meeting_id) : '',
              assignee: t.assignee_id ? t.assignee_id.substring(0, 8) : 'Unassigned',
              priority: t.priority,
              status: t.status,
              dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No Due Date',
            }));
            setTasks(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to load tasks from API:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTasks();
  }, []);

  const columns = [
    { id: 'TODO', title: t.tasks.todo, color: 'border-border text-text-secondary' },
    { id: 'IN_PROGRESS', title: t.tasks.inProgress, color: 'border-accent/40 text-accent' },
    { id: 'IN_REVIEW', title: t.tasks.inReview, color: 'border-warning/40 text-warning' },
    { id: 'COMPLETED', title: t.tasks.completed, color: 'border-success/40 text-success' },
  ];

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-accent" />
            <h1 className="text-lg font-semibold text-text-primary">{t.tasks.title}</h1>
            {isLoading && <Loader2 className="w-4 h-4 text-accent animate-spin ml-2" />}
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {t.tasks.subTitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-bg-card border border-border p-1 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-accent text-text-primary shadow-md '
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.tasks.board}</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-accent text-text-primary shadow-md '
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.tasks.list}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.tasks.searchPlaceholder}
            className="w-full pl-4 pr-4 py-2.5 rounded-lg bg-bg-elevated border border-border text-sm text-text-primary placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
          />
        </div>
      </div>

      {/* Empty State */}
      {!isLoading && filteredTasks.length === 0 && (
        <div className="p-12 rounded-xl bg-bg-card border border-border text-center space-y-3">
          <Calendar className="w-8 h-8 text-text-muted mx-auto" />
          <div className="text-sm font-semibold text-text-primary">{t.tasks.emptyTitle}</div>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            {t.tasks.emptySub}
          </p>
        </div>
      )}

      {/* Kanban Board View */}
      {viewMode === 'kanban' && filteredTasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-bg-card/60 border border-border rounded-xl p-4 flex flex-col min-h-[480px]"
              >
                <div className={`flex items-center justify-between pb-3 border-b border-border mb-4 ${col.color}`}>
                  <span className="text-xs font-bold ">{col.title}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-border text-text-secondary border border-border">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl bg-bg-card border border-border shadow-md hover:border-blue-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-accent font-semibold">{task.id}</span>
                        <span
                          className={`text-[9px] font-bold  px-2 py-0.5 rounded-full ${
                            task.priority === 'HIGH'
                              ? 'bg-red-500/20 text-danger border border-red-500/30'
                              : task.priority === 'MEDIUM'
                              ? 'bg-warning/10 text-warning border border-amber-500/30'
                              : 'bg-slate-500/20 text-text-secondary border border-slate-500/30'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-text-primary leading-relaxed">{task.title}</h4>

                      <div className="p-2 rounded-lg bg-bg-base border border-border flex items-center gap-1.5 text-[10px] text-text-secondary">
                        <Video className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{task.meetingTitle}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-text-secondary pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-text-muted" />
                          <span className="truncate max-w-[100px]">{task.assignee}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="w-3 h-3 text-text-muted" />
                          {task.dueDate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List Table View */}
      {viewMode === 'list' && filteredTasks.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="bg-bg-card text-text-secondary text-[10px] font-bold  border-b border-border">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">{t.tasks.colTitle}</th>
                <th className="px-4 py-3">{t.tasks.colMeeting}</th>
                <th className="px-4 py-3">{t.tasks.colAssignee}</th>
                <th className="px-4 py-3">{t.tasks.colPriority}</th>
                <th className="px-4 py-3">{t.tasks.colStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-border/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-accent">{task.id}</td>
                  <td className="px-4 py-3 font-semibold text-text-primary">{task.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{task.meetingTitle}</td>
                  <td className="px-4 py-3 text-text-secondary">{task.assignee}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold  ${
                        task.priority === 'HIGH'
                          ? 'bg-red-500/20 text-danger border border-red-500/30'
                          : 'bg-warning/10 text-warning border border-amber-500/30'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3  text-[10px] font-bold text-accent">
                    {task.status.replace('_', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
