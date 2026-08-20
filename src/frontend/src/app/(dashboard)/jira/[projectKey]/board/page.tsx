'use client';

import React, { useEffect, useState, use } from 'react';
import { jiraApi, JiraProject, Sprint, Issue } from '@/lib/api';
import { JiraSidebar } from '@/components/jira/layout/JiraSidebar';
import { JiraWorkspaceHeader } from '@/components/jira/layout/JiraWorkspaceHeader';
import { BoardColumn } from '@/components/jira/board/BoardColumn';
import { BoardFilters } from '@/components/jira/board/BoardFilters';
import { IssueDetailDrawer } from '@/components/jira/modals/IssueDetailDrawer';
import { CreateIssueModal } from '@/components/jira/modals/CreateIssueModal';
import { Loader2, Plus, Play, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function JiraBoardPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = use(params);

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
      const proj = await jiraApi.getProject(projectKey);
      setProject(proj);

      const sprintList = await jiraApi.getSprints(proj.key);
      setSprints(sprintList);

      const active = sprintList.find((s) => s.status === 'ACTIVE') || sprintList[0] || null;
      setActiveSprint(active);

      if (active) {
        const issueList = await jiraApi.getIssues(proj.key, { sprint_id: active.id });
        setIssues(issueList);
      } else {
        const issueList = await jiraApi.getIssues(proj.key);
        setIssues(issueList);
      }
    } catch (err) {
      console.error('Failed to load board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectKey]);

  // Handle Drag and Drop status change
  const handleDropIssue = async (issueId: string, targetStatus: string) => {
    setIssues((prev) =>
      prev.map((item) => (item.id === issueId ? { ...item, status: targetStatus } : item))
    );

    try {
      await jiraApi.updateIssue(issueId, { status: targetStatus });
    } catch (err) {
      console.error('Failed to update issue status:', err);
      loadData();
    }
  };

  const handleIssueUpdated = (updated: Issue) => {
    setIssues((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleIssueDeleted = (deletedId: string) => {
    setIssues((prev) => prev.filter((item) => item.id !== deletedId));
  };

  const handleIssueCreated = (newIssue: Issue) => {
    setIssues((prev) => [...prev, newIssue]);
  };

  const filteredIssues = issues.filter((issue) => {
    if (searchQuery && !issue.summary.toLowerCase().includes(searchQuery.toLowerCase()) && !issue.key.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (typeFilter !== 'ALL' && issue.type !== typeFilter) {
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
      <div className="flex items-center justify-center p-24">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-text-primary">Project Not Found</h2>
        <Link href="/jira" className="text-xs text-blue-400 hover:underline font-semibold">
          Back to Spaces
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-bg-base">
      {/* Left Full Jira Sidebar */}
      <JiraSidebar currentProjectKey={project.key} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
        {/* Jira Workspace Header with Breadcrumb and Tabs */}
        <JiraWorkspaceHeader
          project={project}
          onCreateIssueClick={() => {
            setQuickCreateStatus('TODO');
            setShowCreateModal(true);
          }}
        />

        {/* Board Search & Filter Toolbar */}
        <BoardFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          onlyMyIssues={onlyMyIssues}
          onOnlyMyIssuesToggle={() => setOnlyMyIssues(!onlyMyIssues)}
        />

        {/* Kanban Board Columns Container */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar min-h-[calc(100vh-320px)]">
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
      </main>

      {/* Slide-over Issue Detail Drawer */}
      <IssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onIssueUpdated={handleIssueUpdated}
        onIssueDeleted={handleIssueDeleted}
      />

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal
          projectId={project.id}
          sprints={sprints}
          defaultSprintId={activeSprint?.id || null}
          defaultStatus={quickCreateStatus}
          onClose={() => setShowCreateModal(false)}
          onIssueCreated={handleIssueCreated}
        />
      )}
    </div>
  );
}
