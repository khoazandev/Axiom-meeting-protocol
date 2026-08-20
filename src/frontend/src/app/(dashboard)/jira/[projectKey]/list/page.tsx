'use client';

import React, { useEffect, useState, use } from 'react';
import { jiraApi, JiraProject, Sprint, Issue } from '@/lib/api';
import { JiraSidebar } from '@/components/jira/layout/JiraSidebar';
import { JiraWorkspaceHeader } from '@/components/jira/layout/JiraWorkspaceHeader';
import { JiraListView } from '@/components/jira/views/JiraListView';
import { IssueDetailDrawer } from '@/components/jira/modals/IssueDetailDrawer';
import { CreateIssueModal } from '@/components/jira/modals/CreateIssueModal';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function JiraListPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = use(params);

  const [project, setProject] = useState<JiraProject | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const proj = await jiraApi.getProject(projectKey);
      setProject(proj);

      const [sprintList, issueList] = await Promise.all([
        jiraApi.getSprints(proj.key),
        jiraApi.getIssues(proj.key),
      ]);
      setSprints(sprintList);
      setIssues(issueList);
    } catch (err) {
      console.error('Failed to load list data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectKey]);

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
      <JiraSidebar currentProjectKey={project.key} />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
        <JiraWorkspaceHeader project={project} onCreateIssueClick={() => setShowCreateModal(true)} />
        <JiraListView
          project={project}
          issues={issues}
          onIssueClick={(issue) => setSelectedIssueId(issue.id)}
          onIssueUpdated={(updated) => setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
          onCreateIssueClick={() => setShowCreateModal(true)}
        />
      </main>

      <IssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onIssueUpdated={(updated) => setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
        onIssueDeleted={(deletedId) => setIssues((prev) => prev.filter((i) => i.id !== deletedId))}
      />

      {showCreateModal && (
        <CreateIssueModal
          projectId={project.id}
          sprints={sprints}
          onClose={() => setShowCreateModal(false)}
          onIssueCreated={(newIssue) => setIssues((prev) => [...prev, newIssue])}
        />
      )}
    </div>
  );
}
