'use client';

import React from 'react';
import { Bookmark, CheckSquare, CircleDot, AlertCircle, Layers } from 'lucide-react';

interface IssueTypeIconProps {
  type: string;
  className?: string;
}

export function IssueTypeIcon({ type, className = 'w-4 h-4' }: IssueTypeIconProps) {
  switch (type.toUpperCase()) {
    case 'EPIC':
      return (
        <span
          title="Epic"
          className="inline-flex items-center justify-center p-0.5 rounded bg-purple-500/10 text-purple-500"
        >
          <Layers className={className} />
        </span>
      );
    case 'STORY':
      return (
        <span
          title="Story"
          className="inline-flex items-center justify-center p-0.5 rounded bg-emerald-500/10 text-emerald-500"
        >
          <Bookmark className={className} />
        </span>
      );
    case 'BUG':
      return (
        <span
          title="Bug"
          className="inline-flex items-center justify-center p-0.5 rounded bg-rose-500/10 text-rose-500"
        >
          <CircleDot className={className} />
        </span>
      );
    case 'SUBTASK':
      return (
        <span
          title="Subtask"
          className="inline-flex items-center justify-center p-0.5 rounded bg-amber-500/10 text-amber-500"
        >
          <CheckSquare className={className} />
        </span>
      );
    case 'TASK':
    default:
      return (
        <span
          title="Task"
          className="inline-flex items-center justify-center p-0.5 rounded bg-blue-500/10 text-blue-500"
        >
          <CheckSquare className={className} />
        </span>
      );
  }
}
