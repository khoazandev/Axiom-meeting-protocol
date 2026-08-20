'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { JiraProject } from '@/lib/api';
import { Kanban, ListTodo, TrendingUp, Plus, Sparkles, FolderGit2 } from 'lucide-react';

interface JiraNavHeaderProps {
  project: JiraProject;
  onCreateIssueClick: () => void;
}

export function JiraNavHeader({ project, onCreateIssueClick }: JiraNavHeaderProps) {
  const pathname = usePathname();

  const tabs = [
    {
      id: 'board',
      label: 'Board',
      href: `/jira/${project.key}/board`,
      icon: Kanban,
    },
    {
      id: 'backlog',
      label: 'Backlog',
      href: `/jira/${project.key}/backlog`,
      icon: ListTodo,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      href: `/jira/${project.key}/timeline`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="border-b border-border pb-4 space-y-4">
      {/* Top Title Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-xs">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-text-primary tracking-tight">{project.name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-bg-elevated text-text-secondary border border-border font-bold">
                {project.key}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateIssueClick}
            className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Issue</span>
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 bg-bg-elevated/40 p-1 rounded-xl border border-border/80 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
