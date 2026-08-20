'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { JiraProject } from '@/lib/api';
import { InviteSpaceMemberModal } from '@/components/jira/modals/InviteSpaceMemberModal';
import {
  PieChart,
  ListFilter,
  Kanban,
  Code2,
  Calendar,
  FileText,
  BarChart3,
  Share2,
  Zap,
  Plus,
  MoreHorizontal,
  ChevronRight,
  UserPlus,
  Copy,
  Settings,
  Trash2,
  Check,
} from 'lucide-react';

interface JiraWorkspaceHeaderProps {
  project: JiraProject;
  onCreateIssueClick?: () => void;
}

export function JiraWorkspaceHeader({ project, onCreateIssueClick }: JiraWorkspaceHeaderProps) {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'summary', label: 'Summary', icon: PieChart, href: `/jira/${project.key}/summary` },
    { id: 'list', label: 'List', icon: ListFilter, href: `/jira/${project.key}/list` },
    { id: 'board', label: 'Board', icon: Kanban, href: `/jira/${project.key}/board` },
    { id: 'backlog', label: 'Backlog', icon: ListFilter, href: `/jira/${project.key}/backlog` },
    {
      id: 'development',
      label: 'Development',
      icon: Code2,
      href: `/jira/${project.key}/development`,
    },
    { id: 'timeline', label: 'Timeline', icon: Calendar, href: `/jira/${project.key}/timeline` },
    { id: 'docs', label: 'Docs', icon: FileText, href: `/jira/${project.key}/docs` },
    { id: 'reports', label: 'Reports', icon: BarChart3, href: `/jira/${project.key}/reports` },
  ];

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-3 border-b border-border pb-2 bg-bg-card/30 -mx-4 -mt-4 px-4 sm:-mx-6 sm:-mt-6 sm:px-6 pt-4">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="space-y-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <Link href="/jira" className="hover:text-text-primary transition-colors font-medium">
              Spaces
            </Link>
            <ChevronRight className="w-3 h-3 text-text-muted" />
            <span className="text-text-secondary font-semibold">{project.key}</span>
            {project.meeting_id && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Meeting Workspace
              </span>
            )}
          </div>

          {/* Project Title & Space Avatar */}
          <div className="flex items-center gap-2.5 relative">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {project.meeting_id ? '🎙️' : project.key.substring(0, 2)}
            </div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">{project.name}</h1>

            {/* 3-dots Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-1 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                title="Space Actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* 3-dots Dropdown Menu */}
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
                  <div className="absolute left-0 top-8 z-40 w-52 rounded-xl bg-bg-card border border-border p-1.5 shadow-xl space-y-0.5 text-xs animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowInviteModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-text-primary hover:bg-blue-600/10 hover:text-blue-400 transition-colors font-medium text-left"
                    >
                      <UserPlus className="w-4 h-4 text-blue-500" />
                      <span>Add people to space</span>
                    </button>

                    <button
                      onClick={() => {
                        handleCopyLink();
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-text-primary hover:bg-bg-elevated transition-colors text-left"
                    >
                      <Copy className="w-4 h-4 text-text-muted" />
                      <span>{copied ? 'Copied URL!' : 'Copy space URL'}</span>
                    </button>

                    <Link
                      href={`/jira/${project.key}/summary`}
                      onClick={() => setShowDropdown(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-text-primary hover:bg-bg-elevated transition-colors text-left"
                    >
                      <Settings className="w-4 h-4 text-text-muted" />
                      <span>Space settings</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {project.meeting_id && (
            <Link
              href={`/meetings/${project.meeting_id}`}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Meeting Room</span>
            </Link>
          )}

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3 py-1.5 rounded-xl bg-bg-card border border-border hover:border-blue-500 text-text-primary hover:text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            title="Invite Member"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add People</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-bg-card border border-border hover:border-blue-500 text-text-muted hover:text-text-primary transition-all shadow-xs"
            title="Share Space"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={onCreateIssueClick}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Jira View Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pt-1">
        {tabs.map((tab) => {
          const isActive =
            pathname.startsWith(tab.href) ||
            (tab.id === 'board' && pathname === `/jira/${project.key}`);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? 'text-blue-500 border-blue-500 bg-blue-500/10 shadow-xs'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Add Space Member Modal */}
      <InviteSpaceMemberModal
        project={project}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}
