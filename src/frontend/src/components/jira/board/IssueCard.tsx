'use client';

import React from 'react';
import { Issue } from '@/lib/api';
import { IssueTypeIcon } from '../IssueTypeIcon';
import { PriorityIcon } from '../PriorityIcon';
import { Mic, CheckCircle2, ChevronRight, GitCommit } from 'lucide-react';

interface IssueCardProps {
  issue: Issue;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent, issue: Issue) => void;
}

export function IssueCard({ issue, onClick, onDragStart }: IssueCardProps) {
  const isDone = issue.status === 'DONE';
  const subtaskCount = issue.subtasks ? issue.subtasks.length : 0;
  const doneSubtaskCount = issue.subtasks
    ? issue.subtasks.filter((s) => s.status === 'DONE').length
    : 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, issue)}
      onClick={onClick}
      className={`group relative rounded-xl border p-3.5 bg-bg-card hover:bg-bg-elevated transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md select-none space-y-2.5 ${
        isDone ? 'border-emerald-500/30 opacity-80' : 'border-border hover:border-blue-500/50'
      }`}
    >
      {/* Top row: Summary */}
      <p
        className={`text-xs font-semibold text-text-primary leading-snug line-clamp-2 ${isDone ? 'line-through text-text-muted' : ''}`}
      >
        {issue.summary}
      </p>

      {/* Origin from Meeting tag if applicable */}
      {issue.transcript_segment_id && (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Mic className="w-3 h-3" />
          <span>Meeting AI</span>
        </div>
      )}

      {/* Key & Meta row */}
      <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
        <div className="flex items-center gap-1.5">
          <IssueTypeIcon type={issue.type} />
          <span className="font-mono font-bold text-[11px] text-text-secondary group-hover:text-blue-400 transition-colors">
            {issue.key}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PriorityIcon priority={issue.priority} />
          {/* Assignee Avatar */}
          <div
            title={issue.assignee_name || 'Unassigned'}
            className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-[9px] font-bold text-blue-300 uppercase shrink-0"
          >
            {issue.assignee_name ? issue.assignee_name.slice(0, 2) : 'VK'}
          </div>
        </div>
      </div>

      {/* Subtasks Accordion Footer matching Jira screenshot */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted hover:text-text-primary transition-colors">
        <div className="flex items-center gap-1.5">
          <GitCommit className="w-3 h-3 text-text-muted rotate-90" />
          <span>Subtasks</span>
          <span className="font-mono text-[10px] bg-bg-elevated px-1.5 py-0.2 rounded border border-border">
            {doneSubtaskCount}/{subtaskCount}
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
