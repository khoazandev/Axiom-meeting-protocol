'use client';

import React, { useState } from 'react';
import { JiraProject, Sprint, Issue, jiraApi } from '@/lib/api';
import { IssueTypeIcon } from '@/components/jira/IssueTypeIcon';
import { PriorityIcon } from '@/components/jira/PriorityIcon';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  CheckCircle2,
  Clock,
  Mic,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface JiraListViewProps {
  project: JiraProject;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onIssueUpdated: (issue: Issue) => void;
  onCreateIssueClick: () => void;
}

export function JiraListView({
  project,
  issues,
  onIssueClick,
  onIssueUpdated,
  onCreateIssueClick,
}: JiraListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredIssues = issues.filter((issue) => {
    if (
      search &&
      !issue.summary.toLowerCase().includes(search.toLowerCase()) &&
      !issue.key.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (statusFilter !== 'ALL' && issue.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleQuickStatusChange = async (
    issueId: string,
    newStatus: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const updated = await jiraApi.updateIssue(issueId, { status: newStatus });
      onIssueUpdated(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Search & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter list by summary or key..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        <button
          onClick={onCreateIssueClick}
          className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-blue-500 text-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Issue</span>
        </button>
      </div>

      {/* Issues Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-card/70 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Type</th>
                <th className="py-3 px-3 w-28">Key</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-3 w-32">Status</th>
                <th className="py-3 px-3 w-28">Priority</th>
                <th className="py-3 px-3 w-24 text-center">Points</th>
                <th className="py-3 px-4 w-36">Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                    No issues found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    onClick={() => onIssueClick(issue)}
                    className="hover:bg-card/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        <IssueTypeIcon type={issue.type} />
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-primary">{issue.key}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${issue.status === 'DONE' ? 'line-through text-muted-foreground' : 'text-foreground group-hover:text-primary'} transition-colors`}
                      >
                        {issue.summary}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={issue.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleQuickStatusChange(issue.id, e.target.value, e as any)
                        }
                        className={`text-[10px] font-bold uppercase rounded-lg px-2 py-1 border transition-all ${
                          issue.status === 'DONE'
                            ? 'bg-success/15 text-success border-emerald-500/30'
                            : issue.status === 'IN_PROGRESS' || issue.status === 'IN_REVIEW'
                              ? 'bg-blue-500/15 text-primary border-blue-500/30'
                              : 'bg-card text-muted-foreground border-border'
                        }`}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <PriorityIcon priority={issue.priority} />
                        <span className="text-[11px] font-medium text-muted-foreground capitalize">
                          {issue.priority.toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {issue.story_points ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-card border border-border text-[11px] font-bold text-muted-foreground">
                          {issue.story_points}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {issue.transcript_segment_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-success/10 text-success text-[10px] font-semibold border border-emerald-500/20">
                          <Mic className="w-3 h-3" />
                          <span>Meeting AI</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Manual</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
