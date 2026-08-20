'use client';

import React, { useEffect, useState, use } from 'react';
import { jiraApi, JiraProject, Issue } from '@/lib/api';
import { JiraSidebar } from '@/components/jira/layout/JiraSidebar';
import { JiraWorkspaceHeader } from '@/components/jira/layout/JiraWorkspaceHeader';
import { JiraDevelopmentView } from '@/components/jira/views/JiraDevelopmentView';
import { CreateIssueModal } from '@/components/jira/modals/CreateIssueModal';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function JiraDevelopmentPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = use(params);

  const [project, setProject] = useState<JiraProject | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const proj = await jiraApi.getProject(projectKey);
      setProject(proj);

      const issueList = await jiraApi.getIssues(proj.key);
      setIssues(issueList);
    } catch (err) {
      console.error('Failed to load dev data:', err);
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
        <JiraDevelopmentView
          project={project}
          issues={issues}
          onSyncMeetingTasks={loadData}
        />
      </main>

      {showCreateModal && (
        <CreateIssueModal
          projectId={project.id}
          onClose={() => setShowCreateModal(false)}
          onIssueCreated={(newIssue) => setIssues((prev) => [...prev, newIssue])}
        />
      )}
    </div>
  );
}
