'use client';

import React, { useState } from 'react';
import { Issue } from '@/lib/api';
import { IssueTypeIcon } from '../IssueTypeIcon';
import { PriorityIcon } from '../PriorityIcon';
import { ChevronDown, ChevronRight, Plus, Inbox } from 'lucide-react';

interface BacklogPoolProps {
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onDropIssueToBacklog: (issueId: string) => void;
  onCreateIssueInBacklog: () => void;
}

export function BacklogPool({
  issues,
  onIssueClick,
  onDropIssueToBacklog,
  onCreateIssueInBacklog,
}: BacklogPoolProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isOver, setIsOver] = useState(false);

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
      onDropIssueToBacklog(issueId);
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
      {/* Backlog Header */}
      <div className="p-4 flex items-center justify-between bg-bg-elevated/40 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-text-muted" />
            <h3 className="text-sm font-bold text-text-primary">Backlog</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-bg-elevated text-text-muted border border-border">
              {issues.length} issues
            </span>
          </div>
        </div>

        <button
          onClick={onCreateIssueInBacklog}
          className="px-3 py-1.5 rounded-xl bg-accent/15 text-accent hover:bg-accent/25 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create issue</span>
        </button>
      </div>

      {/* Issues list inside backlog */}
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
                <span className="text-xs font-medium text-text-primary truncate">
                  {issue.summary}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-bg-elevated text-text-muted">
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
              Your backlog is empty. Create or sync issues from meetings here!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
