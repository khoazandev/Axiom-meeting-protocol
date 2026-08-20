'use client';

import React from 'react';
import { Search, Filter, X, User } from 'lucide-react';

interface BoardFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  onlyMyIssues: boolean;
  onOnlyMyIssuesToggle: () => void;
}

export function BoardFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onlyMyIssues,
  onOnlyMyIssuesToggle,
}: BoardFiltersProps) {
  const types = ['ALL', 'STORY', 'TASK', 'BUG', 'EPIC'];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1">
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {/* Search board input */}
        <div className="relative min-w-[220px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search board..."
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl bg-bg-card border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter: Only My Issues */}
        <button
          onClick={onOnlyMyIssuesToggle}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-2xs ${
            onlyMyIssues
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-bg-card text-text-secondary border-border hover:text-text-primary hover:border-blue-500/50'
          }`}
        >
          Only My Issues
        </button>

        {/* Issue Type Pills */}
        <div className="flex items-center gap-1 bg-bg-card border border-border p-0.5 rounded-xl shadow-2xs">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => onTypeFilterChange(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                typeFilter === t
                  ? 'bg-blue-600/15 text-blue-500 font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
