'use client';

import React, { useEffect, useState, use } from 'react';
import { jiraApi, JiraProject, Sprint } from '@/lib/api';
import { JiraSidebar } from '@/components/jira/layout/JiraSidebar';
import { JiraWorkspaceHeader } from '@/components/jira/layout/JiraWorkspaceHeader';
import { JiraDocsView } from '@/components/jira/views/JiraDocsView';
import { CreateIssueModal } from '@/components/jira/modals/CreateIssueModal';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function JiraDocsPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = use(params);

  const [project, setProject] = useState<JiraProject | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const proj = await jiraApi.getProject(projectKey);
        setProject(proj);

        const sprintList = await jiraApi.getSprints(proj.key);
        setSprints(sprintList);
      } catch (err) {
        console.error('Failed to load docs data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectKey]);

  if (loading && !project) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-text-primary">Project Not Found</h2>
        <Link href="/jira" className="text-xs text-primary hover:underline font-semibold">
          Back to Spaces
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-bg-base">
      <JiraSidebar currentProjectKey={project.key} />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
        <JiraWorkspaceHeader
          project={project}
          onCreateIssueClick={() => setShowCreateModal(true)}
        />
        <JiraDocsView project={project} />
      </main>

      {showCreateModal && (
        <CreateIssueModal
          projectId={project.id}
          sprints={sprints}
          onClose={() => setShowCreateModal(false)}
          onIssueCreated={() => {}}
        />
      )}
    </div>
  );
}
