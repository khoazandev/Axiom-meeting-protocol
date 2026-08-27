'use client';

import React, { useState } from 'react';
import { JiraSidebar } from '@/components/jira/layout/JiraSidebar';
import { CreateIssueModal } from '@/components/jira/modals/CreateIssueModal';
import { JiraProject, Sprint, Issue } from '@/lib/api';

interface JiraLayoutProps {
  children: React.ReactNode;
  currentProjectKey?: string;
  project?: JiraProject | null;
  sprints?: Sprint[];
  onIssueCreated?: (issue: Issue) => void;
  onOpenCreateProject?: () => void;
}

export function JiraLayout({
  children,
  currentProjectKey,
  project,
  sprints = [],
  onIssueCreated,
  onOpenCreateProject,
}: JiraLayoutProps) {
  const [showCreateIssueModal, setShowCreateIssueModal] = useState(false);

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-bg-base">
      {/* Left Full Jira Sidebar */}
      <JiraSidebar
        currentProjectKey={currentProjectKey}
        onOpenCreateProject={onOpenCreateProject}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">{children}</main>

      {/* Global Create Issue Modal */}
      {showCreateIssueModal && project && (
        <CreateIssueModal
          projectId={project.id}
          sprints={sprints}
          onClose={() => setShowCreateIssueModal(false)}
          onIssueCreated={(issue) => {
            if (onIssueCreated) onIssueCreated(issue);
            setShowCreateIssueModal(false);
          }}
        />
      )}
    </div>
  );
}
