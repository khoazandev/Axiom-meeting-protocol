'use client';

import React, { useEffect, useState, use } from 'react';
import { jiraApi, JiraProject, Sprint, Issue } from '@/lib/api';
import { JiraSidebar } from '@/components/jira/layout/JiraSidebar';
import { JiraWorkspaceHeader } from '@/components/jira/layout/JiraWorkspaceHeader';
import { SprintSection } from '@/components/jira/backlog/SprintSection';
import { BacklogPool } from '@/components/jira/backlog/BacklogPool';
import { IssueDetailDrawer } from '@/components/jira/modals/IssueDetailDrawer';
import { CreateIssueModal } from '@/components/jira/modals/CreateIssueModal';
import { StartSprintModal } from '@/components/jira/modals/StartSprintModal';
import { CompleteSprintModal } from '@/components/jira/modals/CompleteSprintModal';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function JiraBacklogPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = use(params);

  const [project, setProject] = useState<JiraProject | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawer
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState<string | null>(null);
  const [startingSprint, setStartingSprint] = useState<Sprint | null>(null);
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const proj = await jiraApi.getProject(projectKey);
      setProject(proj);

      const sprintList = await jiraApi.getSprints(proj.key);
      setSprints(sprintList);

      const issueList = await jiraApi.getIssues(proj.key);
      setIssues(issueList);
    } catch (err) {
      console.error('Failed to load backlog data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectKey]);

  const handleCreateSprint = async () => {
    if (!project) return;
    try {
      const nextNum = sprints.length + 1;
      const sprint = await jiraApi.createSprint({
        project_id: project.id,
        name: `${project.key} Sprint ${nextNum}`,
        goal: '',
      });
      setSprints((prev) => [...prev, sprint]);
    } catch (err) {
      console.error('Failed to create sprint:', err);
    }
  };

  const handleMoveIssueToSprint = async (issueId: string, sprintId: string | null) => {
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, sprint_id: sprintId } : i)));

    try {
      await jiraApi.updateIssue(issueId, { sprint_id: sprintId || '' });
    } catch (err) {
      console.error('Failed to move issue:', err);
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

  const handleSprintStarted = (started: Sprint) => {
    setSprints((prev) => prev.map((s) => (s.id === started.id ? started : s)));
  };

  const handleSprintCompleted = (completed: Sprint) => {
    loadData();
  };

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

  const backlogIssues = issues.filter((i) => !i.sprint_id);

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-bg-base">
      <JiraSidebar currentProjectKey={project.key} />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-5">
        <JiraWorkspaceHeader
          project={project}
          onCreateIssueClick={() => {
            setTargetSprintId(null);
            setShowCreateModal(true);
          }}
        />

        {/* Sprints Toolbar */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Sprint Planning ({sprints.length} Sprints)
          </h2>
          <button
            onClick={handleCreateSprint}
            className="px-3.5 py-1.5 rounded-xl bg-bg-card border border-border hover:border-blue-500 text-xs font-semibold text-text-primary hover:text-primary transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Sprint</span>
          </button>
        </div>

        {/* Sprints List */}
        <div className="space-y-4">
          {sprints.map((sprint) => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              issues={issues.filter((i) => i.sprint_id === sprint.id)}
              onStartSprint={(s) => setStartingSprint(s)}
              onCompleteSprint={(s) => setCompletingSprint(s)}
              onIssueClick={(issue) => setSelectedIssueId(issue.id)}
              onDropIssueToSprint={(issueId, sId) => handleMoveIssueToSprint(issueId, sId)}
              onCreateIssueInSprint={(sId) => {
                setTargetSprintId(sId);
                setShowCreateModal(true);
              }}
            />
          ))}
        </div>

        {/* Backlog Issues Pool */}
        <div className="pt-2">
          <BacklogPool
            issues={backlogIssues}
            onIssueClick={(issue) => setSelectedIssueId(issue.id)}
            onDropIssueToBacklog={(issueId) => handleMoveIssueToSprint(issueId, null)}
            onCreateIssueInBacklog={() => {
              setTargetSprintId(null);
              setShowCreateModal(true);
            }}
          />
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
          defaultSprintId={targetSprintId}
          onClose={() => setShowCreateModal(false)}
          onIssueCreated={handleIssueCreated}
        />
      )}

      {/* Start Sprint Modal */}
      {startingSprint && (
        <StartSprintModal
          sprint={startingSprint}
          onClose={() => setStartingSprint(null)}
          onSprintStarted={handleSprintStarted}
        />
      )}

      {/* Complete Sprint Modal */}
      {completingSprint && (
        <CompleteSprintModal
          sprint={completingSprint}
          issues={issues.filter((i) => i.sprint_id === completingSprint.id)}
          otherSprints={sprints}
          onClose={() => setCompletingSprint(null)}
          onSprintCompleted={handleSprintCompleted}
        />
      )}
    </div>
  );
}
