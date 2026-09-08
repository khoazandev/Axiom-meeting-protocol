'use client';

import React, { useState } from 'react';
import { Issue } from '@/lib/api';
import { IssueCard } from './IssueCard';
import { Plus } from 'lucide-react';

interface BoardColumnProps {
  id: string;
  title: string;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onDropIssue: (issueId: string, targetStatus: string) => void;
  onCreateQuickIssue?: (status: string) => void;
}

export function BoardColumn({
  id,
  title,
  issues,
  onIssueClick,
  onDropIssue,
  onCreateQuickIssue,
}: BoardColumnProps) {
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
      onDropIssue(issueId, id);
    }
  };

  const handleDragStart = (e: React.DragEvent, issue: Issue) => {
    e.dataTransfer.setData('text/plain', issue.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const getHeaderTextColor = () => {
    switch (id) {
      case 'TODO':
        return 'text-text-secondary';
      case 'IN_PROGRESS':
        return 'text-blue-500';
      case 'IN_REVIEW':
        return 'text-amber-500';
      case 'DONE':
        return 'text-emerald-500';
      default:
        return 'text-text-primary';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col flex-1 min-w-[280px] max-w-[340px] rounded-2xl bg-bg-elevated/40 border p-3 transition-colors duration-150 ${
        isOver ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5' : 'border-border/80'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-2 select-none">
        <div className="flex items-center gap-2">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${getHeaderTextColor()}`}>
            {title}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-bg-card text-text-muted border border-border">
            {issues.length}
          </span>
        </div>

        {onCreateQuickIssue && (
          <button
            onClick={() => onCreateQuickIssue(id)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors"
            title="Create issue in this column"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Issues List Container */}
      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 custom-scrollbar min-h-[120px]">
        {issues.length === 0 ? (
          <div className="h-28 rounded-xl border border-dashed border-border/80 flex items-center justify-center text-xs text-text-muted italic bg-bg-card/30 select-none">
            Drop cards here
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={() => onIssueClick(issue)}
              onDragStart={handleDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}
