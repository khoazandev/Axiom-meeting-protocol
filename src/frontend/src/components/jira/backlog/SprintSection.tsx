'use client';

import React, { useState } from 'react';
import { Sprint, Issue } from '@/lib/api';
import { IssueTypeIcon } from '../IssueTypeIcon';
import { PriorityIcon } from '../PriorityIcon';
import { Play, CheckCircle2, ChevronDown, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';

interface SprintSectionProps {
  sprint: Sprint;
  issues: Issue[];
  onStartSprint: (sprint: Sprint) => void;
  onCompleteSprint: (sprint: Sprint) => void;
  onIssueClick: (issue: Issue) => void;
  onDropIssueToSprint: (issueId: string, sprintId: string) => void;
  onCreateIssueInSprint: (sprintId: string) => void;
}

export function SprintSection({
  sprint,
  issues,
  onStartSprint,
  onCompleteSprint,
  onIssueClick,
  onDropIssueToSprint,
  onCreateIssueInSprint,
}: SprintSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isOver, setIsOver] = useState(false);

  const isActive = sprint.status === 'ACTIVE';
  const totalPoints = issues.reduce((acc, curr) => acc + (curr.story_points || 0), 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const issueId = e.dataTransfer.getData('text/plain');
    if (issueId) {
      onDropIssueToSprint(issueId, sprint.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, issue: Issue) => {
    e.dataTransfer.setData('text/plain', issue.id);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl border bg-bg-card transition-all duration-150 overflow-hidden shadow-xs ${
        isOver ? 'border-accent ring-2 ring-accent/20 bg-accent/5' : 'border-border'
      }`}
    >
      {/* Sprint Header */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-bg-elevated/40 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary">{sprint.name}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'bg-bg-elevated text-text-muted border border-border'
                }`}
              >
                {isActive ? 'ACTIVE' : 'PLANNED'}
              </span>
            </div>
            {sprint.goal && (
              <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{sprint.goal}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="font-semibold text-text-primary">{issues.length}</span> issues
            {totalPoints > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold text-[11px]">
                {totalPoints} pts
              </span>
            )}
          </div>

          {isActive ? (
            <button
              onClick={() => onCompleteSprint(sprint)}
              className="px-3.5 py-1.5 rounded-xl bg-success text-white text-xs font-semibold hover:bg-success/90 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete Sprint</span>
            </button>
          ) : (
            <button
              onClick={() => onStartSprint(sprint)}
              disabled={issues.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Sprint</span>
            </button>
          )}
        </div>
      </div>

      {/* Issues list inside sprint */}
      {isOpen && (
        <div className="divide-y divide-border/60">
          {issues.map((issue) => (
            <div
              key={issue.id}
              draggable
              onDragStart={(e) => handleDragStart(e, issue)}
              onClick={() => onIssueClick(issue)}
              className="flex items-center justify-between px-4 py-3 hover:bg-bg-elevated/60 transition-colors cursor-pointer group select-none"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <IssueTypeIcon type={issue.type} />
                <span className="font-mono text-xs font-bold text-text-secondary group-hover:text-accent transition-colors">
                  {issue.key}
                </span>
                <span
                  className={`text-xs font-medium truncate ${
                    issue.status === 'DONE' ? 'line-through text-text-muted' : 'text-text-primary'
                  }`}
                >
                  {issue.summary}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    issue.status === 'DONE'
                      ? 'bg-success/15 text-success'
                      : issue.status === 'IN_PROGRESS'
                        ? 'bg-accent/15 text-accent'
                        : 'bg-bg-elevated text-text-muted'
                  }`}
                >
                  {issue.status.replace('_', ' ')}
                </span>
                <PriorityIcon priority={issue.priority} />
                {issue.story_points !== null && (
                  <span className="w-5 h-5 rounded-full bg-bg-elevated text-text-muted font-bold text-[10px] flex items-center justify-center border border-border">
                    {issue.story_points}
                  </span>
                )}
                <div
                  title={issue.assignee_name || 'Unassigned'}
                  className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[9px] font-bold flex items-center justify-center uppercase"
                >
                  {issue.assignee_name ? issue.assignee_name.slice(0, 2) : '?'}
                </div>
              </div>
            </div>
          ))}

          {issues.length === 0 && (
            <div className="p-8 text-center text-xs text-text-muted border-2 border-dashed border-border/30 m-3 rounded-xl">
              Drag issues here to plan this sprint
            </div>
          )}

          {/* Quick Create in Sprint */}
          <div className="p-2 bg-bg-base/30">
            <button
              onClick={() => onCreateIssueInSprint(sprint.id)}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-border/70 hover:border-accent hover:bg-accent/5 text-xs text-text-muted hover:text-accent font-medium flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create issue in {sprint.name}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
