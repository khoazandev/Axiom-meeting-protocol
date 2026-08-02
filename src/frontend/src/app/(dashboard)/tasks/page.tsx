'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

const INITIAL_TASKS: Task[] = [
  {
    id: 'TASK-101',
    title: 'Finalize Multi-Tenant Alembic batch mode migration',
    meetingTitle: 'Phase 2 Architecture Alignment',
    meetingId: '1',
    assignee: 'Principal Architect',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: 'Today',
  },
  {
    id: 'TASK-102',
    title: 'Configure JWT Auth & Workspace header injection in API client',
    meetingTitle: 'Security & Auth Sync',
    meetingId: '2',
    assignee: 'Frontend Engineer',
    priority: 'HIGH',
    status: 'COMPLETED',
    dueDate: 'Yesterday',
  },
  {
    id: 'TASK-103',
    title: 'Deploy Google Meet WebRTC control dock interface',
    meetingTitle: 'Frontend Redesign Sprint',
    meetingId: '3',
    assignee: 'UI/UX Specialist',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: 'Tomorrow',
  },
  {
    id: 'TASK-104',
    title: 'Integrate Whisper STT streaming agent on-premise',
    meetingTitle: 'AI Intelligence Pipeline Prep',
    meetingId: '4',
    assignee: 'AI Engineer',
    priority: 'HIGH',
    status: 'TODO',
    dueDate: 'Aug 5',
  },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadTasks() {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const activeWorkspaceId = localStorage.getItem('active_workspace_id');

        if (!token || !activeWorkspaceId) {
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/v1/tasks', {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Workspace-ID': activeWorkspaceId,
          },
        });

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
    { id: 'TODO', title: 'To Do', color: 'border-slate-700/60 text-slate-300' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-500/40 text-blue-400' },
    { id: 'IN_REVIEW', title: 'In Review', color: 'border-amber-500/40 text-amber-400' },
    { id: 'COMPLETED', title: 'Completed', color: 'border-emerald-500/40 text-emerald-400' },
  ];

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-blue-950/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Tasks & Action Items</h1>
            {isLoading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin ml-2" />}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Jira-style action items automatically extracted from meetings and process gate logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#131B2E] border border-blue-950 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
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
            placeholder="Filter tasks by title..."
            className="w-full pl-4 pr-4 py-2 rounded-xl bg-[#131B2E] border border-blue-950/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-[#131B2E]/60 border border-blue-950/80 rounded-2xl p-4 flex flex-col min-h-[480px]"
              >
                <div className={`flex items-center justify-between pb-3 border-b border-blue-950/60 mb-4 ${col.color}`}>
                  <span className="text-xs font-bold uppercase tracking-wider">{col.title}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950/80 text-slate-300 border border-blue-900/40">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl bg-[#131B2E] border border-blue-950/80 shadow-md hover:border-blue-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-blue-400 font-semibold">{task.id}</span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            task.priority === 'HIGH'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : task.priority === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-white leading-relaxed">{task.title}</h4>

                      <div className="p-2 rounded-lg bg-[#0B0F19] border border-blue-950 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Video className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="truncate">{task.meetingTitle}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          <span className="truncate max-w-[100px]">{task.assignee}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="w-3 h-3 text-slate-500" />
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
      {viewMode === 'list' && (
        <div className="bg-[#131B2E] border border-blue-950/80 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0E1526] text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-blue-950">
              <tr>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Meeting Origin</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-950/60">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-blue-950/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-400">{task.id}</td>
                  <td className="px-4 py-3 font-semibold text-white">{task.title}</td>
                  <td className="px-4 py-3 text-slate-400">{task.meetingTitle}</td>
                  <td className="px-4 py-3 text-slate-300">{task.assignee}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        task.priority === 'HIGH'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 uppercase tracking-wider text-[10px] font-bold text-blue-300">
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
