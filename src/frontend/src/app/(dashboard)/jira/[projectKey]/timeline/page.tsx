'use client';

import React, { useEffect, useState, use } from 'react';
import { jiraApi, JiraProject, Sprint, Issue } from '@/lib/api';
import { JiraSidebar } from '@/components/jira/layout/JiraSidebar';
import { JiraWorkspaceHeader } from '@/components/jira/layout/JiraWorkspaceHeader';
import { CreateIssueModal } from '@/components/jira/modals/CreateIssueModal';
import { IssueTypeIcon } from '@/components/jira/IssueTypeIcon';
import { Loader2, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function JiraTimelinePage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = use(params);

  const [project, setProject] = useState<JiraProject | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
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

        const issueList = await jiraApi.getIssues(proj.key);
        setIssues(issueList);
      } catch (err) {
        console.error('Failed to load timeline data:', err);
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

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-5">
        <JiraWorkspaceHeader
          project={project}
          onCreateIssueClick={() => setShowCreateModal(true)}
        />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text-primary">Sprint & Roadmap Timeline</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Track deliverables, sprint burn-down and progress.
            </p>
          </div>
        </div>

        {/* Sprints Timeline Breakdown */}
        <div className="space-y-4">
          {sprints.map((sprint) => {
            const sprintIssues = issues.filter((i) => i.sprint_id === sprint.id);
            const doneIssues = sprintIssues.filter((i) => i.status === 'DONE');
            const percent =
              sprintIssues.length > 0
                ? Math.round((doneIssues.length / sprintIssues.length) * 100)
                : 0;

            return (
              <div
                key={sprint.id}
                className="p-5 rounded-2xl bg-bg-card border border-border space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold text-text-primary">{sprint.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sprint.status === 'ACTIVE'
                            ? 'bg-blue-500/15 text-primary border border-blue-500/30'
                            : sprint.status === 'CLOSED'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-bg-elevated text-text-muted'
                        }`}
                      >
                        {sprint.status}
                      </span>
                    </div>
                    {sprint.goal && <p className="text-xs text-text-muted">{sprint.goal}</p>}
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="font-bold text-text-primary">{percent}%</span>
                      <span className="text-text-muted ml-1">
                        ({doneIssues.length}/{sprintIssues.length} issues)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-bg-elevated overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Mini Issues List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                  {sprintIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-bg-elevated/40 border border-border/70 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <IssueTypeIcon type={issue.type} />
                        <span className="font-mono text-[11px] font-bold text-primary">
                          {issue.key}
                        </span>
                        <span
                          className={`truncate ${issue.status === 'DONE' ? 'line-through text-text-muted' : 'text-text-primary'}`}
                        >
                          {issue.summary}
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          issue.status === 'DONE'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-bg-elevated text-text-muted'
                        }`}
                      >
                        {issue.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

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
