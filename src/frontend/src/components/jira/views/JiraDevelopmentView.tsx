'use client';

import React, { useState } from 'react';
import { JiraProject, Issue, jiraApi } from '@/lib/api';
import {
  Code2,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  RefreshCw,
  Zap,
  Mic,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface JiraDevelopmentViewProps {
  project: JiraProject;
  issues: Issue[];
  onSyncMeetingTasks?: () => void;
}

export function JiraDevelopmentView({ project, issues, onSyncMeetingTasks }: JiraDevelopmentViewProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (!project.meeting_id) return;
    try {
      setIsSyncing(true);
      const res = await jiraApi.syncMeetingTasksToJira(project.meeting_id, {
        target_project_id: project.id,
      });
      setSyncResult(`Synced ${res.length} action items successfully!`);
      if (onSyncMeetingTasks) onSyncMeetingTasks();
    } catch (err) {
      console.error('Failed to sync tasks:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const meetingIssues = issues.filter((i) => i.transcript_segment_id);

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Sync Card */}
      <div className="p-5 rounded-2xl bg-bg-card border border-border space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-bold text-text-primary">AI Action Item Pipeline & Development Sync</h2>
            </div>
            <p className="text-xs text-text-secondary">
              Real-time synchronization between Meeting Speech-to-Text (`faster-whisper`), LLM Task Extractor and Jira Issues.
            </p>
          </div>

          {project.meeting_id && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm shrink-0 disabled:opacity-60"
            >
              {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Sync Action Items from Meeting</span>
            </button>
          )}
        </div>

        {syncResult && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{syncResult}</span>
          </div>
        )}
      </div>

      {/* Synchronized Items List */}
      <div className="p-5 rounded-2xl bg-bg-card border border-border space-y-4 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>Synchronized Meeting Tasks ({meetingIssues.length})</span>
        </h3>

        {meetingIssues.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted italic bg-bg-elevated/30 rounded-xl border border-border/50">
            No issues synchronized directly from meeting transcripts yet. Click &quot;Sync Action Items&quot; above to import.
          </div>
        ) : (
          <div className="space-y-2">
            {meetingIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated/40 border border-border/70 text-xs"
              >
                <div className="flex items-center gap-3 truncate pr-3">
                  <span className="font-mono text-xs font-bold text-blue-400">{issue.key}</span>
                  <span className="font-semibold text-text-primary truncate">{issue.summary}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-text-muted">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-bg-elevated border border-border">
                    {issue.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
