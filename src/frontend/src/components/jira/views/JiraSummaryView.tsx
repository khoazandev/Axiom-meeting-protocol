'use client';

import React from 'react';
import { JiraProject, Sprint, Issue } from '@/lib/api';
import { IssueTypeIcon } from '@/components/jira/IssueTypeIcon';
import { PriorityIcon } from '@/components/jira/PriorityIcon';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface JiraSummaryViewProps {
  project: JiraProject;
  sprints: Sprint[];
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
}

export function JiraSummaryView({ project, sprints, issues, onIssueClick }: JiraSummaryViewProps) {
  const totalIssues = issues.length;
  const doneIssues = issues.filter((i) => i.status === 'DONE');
  const inProgressIssues = issues.filter(
    (i) => i.status === 'IN_PROGRESS' || i.status === 'IN_REVIEW'
  );
  const todoIssues = issues.filter((i) => i.status === 'TODO');

  const completionRate = totalIssues > 0 ? Math.round((doneIssues.length / totalIssues) * 100) : 0;

  // Group by priority
  const criticalCount = issues.filter((i) => i.priority === 'CRITICAL').length;
  const highCount = issues.filter((i) => i.priority === 'HIGH').length;
  const mediumCount = issues.filter((i) => i.priority === 'MEDIUM').length;
  const lowCount = issues.filter((i) => i.priority === 'LOW').length;

  // Group by type
  const epics = issues.filter((i) => i.type === 'EPIC').length;
  const stories = issues.filter((i) => i.type === 'STORY').length;
  const tasks = issues.filter((i) => i.type === 'TASK').length;
  const bugs = issues.filter((i) => i.type === 'BUG').length;

  return (
    <div className="space-y-6 pt-2">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{completionRate}%</span>
            <span className="text-xs text-muted-foreground">
              ({doneIssues.length}/{totalIssues} completed)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-card overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>In Progress</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{inProgressIssues.length}</span>
            <span className="text-xs text-muted-foreground">tasks active</span>
          </div>
          <div className="text-[11px] text-primary font-medium">Being actively worked on</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>To Do Backlog</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{todoIssues.length}</span>
            <span className="text-xs text-muted-foreground">pending tasks</span>
          </div>
          <div className="text-[11px] text-amber-400 font-medium">Ready for next sprint</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Critical / High</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">{criticalCount + highCount}</span>
            <span className="text-xs text-muted-foreground">urgent items</span>
          </div>
          <div className="text-[11px] text-rose-400 font-medium">Requires immediate focus</div>
        </div>
      </div>

      {/* Main Grid: Status Breakdown & Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Status Breakdown</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-foreground mb-1">
                <span>To Do</span>
                <span>
                  {todoIssues.length} (
                  {totalIssues > 0 ? Math.round((todoIssues.length / totalIssues) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-card overflow-hidden">
                <div
                  className="h-full bg-slate-500"
                  style={{
                    width: `${totalIssues > 0 ? (todoIssues.length / totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-foreground mb-1">
                <span>In Progress / In Review</span>
                <span>
                  {inProgressIssues.length} (
                  {totalIssues > 0 ? Math.round((inProgressIssues.length / totalIssues) * 100) : 0}
                  %)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-card overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${totalIssues > 0 ? (inProgressIssues.length / totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-foreground mb-1">
                <span>Done</span>
                <span>
                  {doneIssues.length} (
                  {totalIssues > 0 ? Math.round((doneIssues.length / totalIssues) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-card overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${totalIssues > 0 ? (doneIssues.length / totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Types Distribution */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Issue Types Breakdown</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-card/50 border border-border flex items-center gap-3">
              <IssueTypeIcon type="STORY" />
              <div>
                <div className="text-xs font-bold text-foreground">{stories} Stories</div>
                <div className="text-[11px] text-muted-foreground">Feature requests</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card/50 border border-border flex items-center gap-3">
              <IssueTypeIcon type="TASK" />
              <div>
                <div className="text-xs font-bold text-foreground">{tasks} Tasks</div>
                <div className="text-[11px] text-muted-foreground">General tasks</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card/50 border border-border flex items-center gap-3">
              <IssueTypeIcon type="BUG" />
              <div>
                <div className="text-xs font-bold text-foreground">{bugs} Bugs</div>
                <div className="text-[11px] text-muted-foreground">Defects reported</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card/50 border border-border flex items-center gap-3">
              <IssueTypeIcon type="EPIC" />
              <div>
                <div className="text-xs font-bold text-foreground">{epics} Epics</div>
                <div className="text-[11px] text-muted-foreground">Major initiatives</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Issues List */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Recently Updated Work</span>
        </h3>

        <div className="space-y-2">
          {issues.slice(0, 5).map((issue) => (
            <div
              key={issue.id}
              onClick={() => onIssueClick(issue)}
              className="flex items-center justify-between p-3 rounded-xl bg-card/40 hover:bg-card border border-border cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3 truncate pr-4">
                <IssueTypeIcon type={issue.type} />
                <span className="font-mono text-xs font-bold text-primary">{issue.key}</span>
                <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {issue.summary}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <PriorityIcon priority={issue.priority} />
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-card text-muted-foreground border border-border">
                  {issue.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
