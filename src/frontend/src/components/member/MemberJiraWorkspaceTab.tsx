'use client';

import React, { useEffect, useState } from 'react';
import { jiraApi, JiraProject, Sprint, Issue } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { BoardColumn } from '@/components/jira/board/BoardColumn';
import { BoardFilters } from '@/components/jira/board/BoardFilters';
import { IssueDetailDrawer } from '@/components/jira/modals/IssueDetailDrawer';
import { CreateIssueModal } from '@/components/jira/modals/CreateIssueModal';
import {
  Kanban,
  ListTodo,
  FileText,
  BarChart2,
  Table as TableIcon,
  Plus,
  Loader2,
  AlertCircle,
  FolderGit2,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';

type JiraSubTab = 'board' | 'backlog' | 'summary' | 'list' | 'docs';

interface MemberJiraWorkspaceTabProps {
  onNotify: (msg: string) => void;
}

export function MemberJiraWorkspaceTab({ onNotify }: MemberJiraWorkspaceTabProps) {
  const { user } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState<JiraSubTab>('board');

  // Jira State
  const [project, setProject] = useState<JiraProject | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);

  // Modals & Drawer
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quickCreateStatus, setQuickCreateStatus] = useState<string>('TODO');

  const loadData = async () => {
    try {
      setLoading(true);
      const projects = await jiraApi.getProjects();
      const defaultProj = projects.find((p) => p.key === 'SMA') || projects[0];

      if (defaultProj) {
        setProject(defaultProj);
        const sprintList = await jiraApi.getSprints(defaultProj.key);
        setSprints(sprintList);

        const active = sprintList.find((s) => s.status === 'ACTIVE') || sprintList[0] || null;
        setActiveSprint(active);

        const issueList = await jiraApi.getIssues(defaultProj.key);
        setIssues(issueList);
      }
    } catch (err) {
      console.error('Failed to load Jira board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle status drop or update
  const handleDropIssue = async (issueId: string, targetStatus: string) => {
    setIssues((prev) =>
      prev.map((item) => (item.id === issueId ? { ...item, status: targetStatus } : item))
    );

    try {
      await jiraApi.updateIssue(issueId, { status: targetStatus });
      onNotify(`Đã cập nhật trạng thái thẻ việc sang: ${targetStatus}`);
    } catch (err) {
      console.error('Failed to update issue status:', err);
      loadData();
    }
  };

  const handleIssueUpdated = (updated: Issue) => {
    setIssues((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    onNotify(`Đã lưu thay đổi cho ${updated.key}`);
  };

  const handleIssueDeleted = (deletedId: string) => {
    setIssues((prev) => prev.filter((item) => item.id !== deletedId));
    onNotify('Đã xóa công việc khỏi bảng.');
  };

  const handleIssueCreated = (newIssue: Issue) => {
    setIssues((prev) => [...prev, newIssue]);
    onNotify(`Đã tạo công việc mới: ${newIssue.key}`);
  };

  const filteredIssues = issues.filter((issue) => {
    if (
      searchQuery &&
      !issue.summary.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !issue.key.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (typeFilter !== 'ALL' && issue.type !== typeFilter) {
      return false;
    }
    if (onlyMyIssues && user?.id && issue.assignee_id !== user.id) {
      return false;
    }
    return true;
  });

  const columns = [
    { id: 'TODO', title: 'To Do' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'IN_REVIEW', title: 'In Review' },
    { id: 'DONE', title: 'Done' },
  ];

  if (loading && !project) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Đang tải không gian Mini Jira...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Jira Project Master Bar (Single Header - NO extra sidebar) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
            SMA
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {project?.name || 'Smart Meeting AI Core'}
              </h2>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                PROJ: SMA
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Khối Kỹ Thuật (Engineering)</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles size={11} />
                Sprint 1 đang chạy
              </span>
            </p>
          </div>
        </div>

        {/* Quick Action Button */}
        <button
          type="button"
          onClick={() => {
            setQuickCreateStatus('TODO');
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>Tạo Issue Mới</span>
        </button>
      </div>

      {/* Horizontal Jira Navigation Bar (Linear / Modern Jira Style) */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('board')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'board'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Kanban size={15} />
            <span>Kanban Board</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('backlog')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'backlog'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ListTodo size={15} />
            <span>Backlog & Sprints</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('summary')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'summary'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart2 size={15} />
            <span>Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('list')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'list'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TableIcon size={15} />
            <span>List Table</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('docs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'docs'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText size={15} />
            <span>Docs & Specs</span>
          </button>
        </div>
      </div>

      {/* SubTab 1: Kanban Board */}
      {activeSubTab === 'board' && (
        <div className="space-y-4">
          {/* Board Search & Filter Toolbar */}
          <BoardFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            onlyMyIssues={onlyMyIssues}
            onOnlyMyIssuesToggle={() => setOnlyMyIssues(!onlyMyIssues)}
          />

          {/* Full-width Kanban Columns Container */}
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar min-h-[550px]">
            {columns.map((col) => (
              <BoardColumn
                key={col.id}
                id={col.id}
                title={col.title}
                issues={filteredIssues.filter((i) => i.status === col.id)}
                onIssueClick={(issue) => setSelectedIssueId(issue.id)}
                onDropIssue={handleDropIssue}
                onCreateQuickIssue={(status) => {
                  setQuickCreateStatus(status);
                  setShowCreateModal(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* SubTab 2: Backlog & Sprints */}
      {activeSubTab === 'backlog' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Sprint 1 - Foundation & LiveKit Audio Pipeline (Đang chạy)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono font-semibold">
                {issues.filter((i) => i.status === 'DONE').length}/{issues.length} hoàn thành
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {issues.map((iss) => (
                <div
                  key={iss.id}
                  onClick={() => setSelectedIssueId(iss.id)}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                      {iss.key}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {iss.summary}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {iss.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: Summary */}
      {activeSubTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-500">Tổng số công việc</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {issues.length}
            </div>
            <p className="text-[11px] text-blue-600 font-semibold">Thuộc Sprint 1</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-500">Đã Hoàn Thành (Done)</span>
            <div className="text-2xl font-black text-emerald-600">
              {issues.filter((i) => i.status === 'DONE').length}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold">Tỷ lệ 25% Sprint</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-500">Đang thực hiện</span>
            <div className="text-2xl font-black text-amber-600">
              {issues.filter((i) => i.status === 'IN_PROGRESS').length}
            </div>
            <p className="text-[11px] text-amber-600 font-semibold">Đúng tiến độ cam kết</p>
          </div>
        </div>
      )}

      {/* SubTab 4: List Table */}
      {activeSubTab === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Mã Key</th>
                <th className="px-4 py-3">Tiêu đề nhiệm vụ</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Độ ưu tiên</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIssues.map((iss) => (
                <tr
                  key={iss.id}
                  onClick={() => setSelectedIssueId(iss.id)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">{iss.key}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    {iss.summary}
                  </td>
                  <td className="px-4 py-3">{iss.type}</td>
                  <td className="px-4 py-3 font-semibold">{iss.priority}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {iss.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SubTab 5: Docs & Specs */}
      {activeSubTab === 'docs' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            Tài Liệu Kỹ Thuật Dự Án (SMA Architecture Specifications)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Hệ thống Axiom tích hợp LiveKit Server SFU on-premise với Whisper STT CTranslate2 để
            giải mã phụ đề song ngữ theo thời gian thực dưới 400ms độ trễ.
          </p>
        </div>
      )}

      {/* Slide-over Issue Detail Drawer */}
      <IssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onIssueUpdated={handleIssueUpdated}
        onIssueDeleted={handleIssueDeleted}
      />

      {/* Modal Tạo Issue Mới */}
      {showCreateModal && project && (
        <CreateIssueModal
          projectId={project.id}
          sprints={sprints}
          defaultSprintId={activeSprint?.id}
          defaultStatus={quickCreateStatus}
          onClose={() => setShowCreateModal(false)}
          onIssueCreated={handleIssueCreated}
        />
      )}
    </div>
  );
}
