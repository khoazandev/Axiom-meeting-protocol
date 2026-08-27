'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { jiraApi, JiraProject } from '@/lib/api';
import {
  Sparkles,
  Clock,
  Star,
  Grid,
  Calendar,
  Layers,
  Plus,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Filter,
  LayoutDashboard,
  Users,
  Target,
  FolderGit2,
  Settings2,
  Video,
  ChevronLeft,
  Search,
  CheckSquare,
  Bot,
  Sliders,
  Check,
} from 'lucide-react';

interface JiraSidebarProps {
  currentProjectKey?: string;
  onOpenCreateProject?: () => void;
}

export function JiraSidebar({ currentProjectKey, onOpenCreateProject }: JiraSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion states
  const [recentOpen, setRecentOpen] = useState(true);
  const [starredOpen, setStarredOpen] = useState(true);
  const [spacesOpen, setSpacesOpen] = useState(true);

  // Starred spaces in localStorage
  const [starredKeys, setStarredKeys] = useState<string[]>([]);

  // Modals for sidebar actions
  const [showAppsModal, setShowAppsModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const data = await jiraApi.getProjects();
        setProjects(data);
      } catch (err) {
        console.error('Failed to load Jira projects:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();

    // Load starred
    try {
      const saved = localStorage.getItem('axiom_starred_spaces');
      if (saved) setStarredKeys(JSON.parse(saved));
    } catch (_) {}
  }, []);

  const toggleStar = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let updated: string[];
    if (starredKeys.includes(key)) {
      updated = starredKeys.filter((k) => k !== key);
    } else {
      updated = [...starredKeys, key];
    }
    setStarredKeys(updated);
    try {
      localStorage.setItem('axiom_starred_spaces', JSON.stringify(updated));
    } catch (_) {}
  };

  const starredSpaces = projects.filter((p) => starredKeys.includes(p.key));

  if (collapsed) {
    return (
      <aside className="w-14 bg-bg-card border-r border-border flex flex-col items-center py-3 justify-between shrink-0 select-none z-20 transition-all duration-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-foreground font-bold text-sm shadow-md">
            J
          </div>
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/jira"
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            title="All Spaces"
          >
            <Layers className="w-4 h-4" />
          </Link>
          <Link
            href="/meetings"
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            title="Meetings"
          >
            <Video className="w-4 h-4" />
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="w-64 bg-bg-card border-r border-border flex flex-col justify-between shrink-0 h-[calc(100vh-56px)] sticky top-14 select-none z-20 overflow-hidden text-xs transition-colors duration-200">
        {/* Top Header Section */}
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-foreground font-bold text-xs shadow-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M11.53 2c0 2.4 1.97 4.35 4.39 4.35h2.89V3.53C18.81 2.69 18.12 2 17.28 2h-5.75zm0 5.67c0 2.4 1.97 4.35 4.39 4.35h2.89V9.2c0-.85-.69-1.53-1.53-1.53h-5.75zm-6.24 5.66c0 2.4 1.97 4.35 4.39 4.35h2.89v-2.82c0-.85-.69-1.53-1.53-1.53H5.29zm0-5.66c0 2.4 1.97 4.35 4.39 4.35h2.89V9.2c0-.85-.69-1.53-1.53-1.53H5.29z" />
              </svg>
            </div>
            <span className="font-bold text-sm text-text-primary tracking-tight">
              Jira Software
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Main Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 custom-scrollbar">
          {/* Core Links */}
          <div className="space-y-0.5">
            <Link
              href="/jira"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors font-medium"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>For you</span>
            </Link>

            {/* Recent Spaces Accordion */}
            <div>
              <button
                onClick={() => setRecentOpen(!recentOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <span>Recent</span>
                </div>
                {recentOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                )}
              </button>

              {recentOpen && (
                <div className="pl-6 space-y-0.5 pt-0.5">
                  {projects.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      href={`/jira/${p.key}/board`}
                      className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] truncate transition-colors ${
                        currentProjectKey === p.key
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Starred Spaces Accordion */}
            <div>
              <button
                onClick={() => setStarredOpen(!starredOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                  <span>Starred ({starredSpaces.length})</span>
                </div>
                {starredOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                )}
              </button>

              {starredOpen && starredSpaces.length > 0 && (
                <div className="pl-6 space-y-0.5 pt-0.5">
                  {starredSpaces.map((p) => (
                    <Link
                      key={p.id}
                      href={`/jira/${p.key}/board`}
                      className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] truncate transition-colors ${
                        currentProjectKey === p.key
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Connected Apps */}
            <button
              onClick={() => setShowAppsModal(true)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors font-medium text-left"
            >
              <Grid className="w-4 h-4 text-text-muted" />
              <span>Connected Apps</span>
            </button>
          </div>

          {/* Plans Section */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between px-2.5 py-1 text-text-muted">
              <span className="font-bold text-[11px] uppercase tracking-wider">Plans</span>
              <button
                onClick={onOpenCreateProject}
                className="p-0.5 hover:text-text-primary hover:bg-bg-elevated rounded"
                title="Create Plan"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {currentProjectKey ? (
              <Link
                href={`/jira/${currentProjectKey}/timeline`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Roadmap & Gantt</span>
              </Link>
            ) : (
              <div className="px-2.5 py-1 text-[11px] text-text-muted leading-snug">
                Manage roadmaps across teams & meetings.
              </div>
            )}
          </div>

          {/* Spaces / Workspaces Section */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between px-2.5 py-1 text-text-muted">
              <span className="font-bold text-[11px] uppercase tracking-wider">
                Spaces ({projects.length})
              </span>
              <button
                onClick={onOpenCreateProject}
                className="p-0.5 hover:text-text-primary hover:bg-bg-elevated rounded"
                title="Create Space"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Spaces List */}
            <div className="space-y-0.5 pt-1">
              {projects.map((proj) => {
                const isActive = currentProjectKey === proj.key;
                const isStarred = starredKeys.includes(proj.key);
                return (
                  <Link
                    key={proj.id}
                    href={`/jira/${proj.key}/board`}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors group ${
                      isActive
                        ? 'bg-primary/15 text-primary font-semibold border-l-2 border-blue-500'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        proj.meeting_id
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25'
                          : 'bg-blue-500/15 text-primary border border-blue-500/25'
                      }`}
                    >
                      {proj.meeting_id ? '🎙️' : proj.key.substring(0, 2)}
                    </div>
                    <span className="truncate flex-1 text-xs">{proj.name}</span>

                    <button
                      onClick={(e) => toggleStar(proj.key, e)}
                      className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-amber-500 transition-opacity ${
                        isStarred ? 'opacity-100 text-amber-500' : 'text-text-muted'
                      }`}
                      title={isStarred ? 'Unstar' : 'Star space'}
                    >
                      <Star
                        className={`w-3 h-3 ${isStarred ? 'fill-amber-500 text-amber-500' : ''}`}
                      />
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Global Utilities & Filters */}
          <div className="pt-2 border-t border-border space-y-0.5">
            <button
              onClick={() => setShowFiltersModal(true)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors text-left"
            >
              <Filter className="w-3.5 h-3.5 text-text-muted" />
              <span>Filters</span>
            </button>

            {currentProjectKey ? (
              <Link
                href={`/jira/${currentProjectKey}/summary`}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-text-muted" />
                <span>Dashboards</span>
              </Link>
            ) : (
              <Link
                href="/jira"
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-text-muted" />
                <span>Dashboards</span>
              </Link>
            )}

            <Link
              href="/meetings"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-text-muted" />
              <span>Teams & Meetings</span>
            </Link>

            <button
              onClick={() => setShowGoalsModal(true)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors text-left"
            >
              <Target className="w-3.5 h-3.5 text-text-muted" />
              <span>Goals & Targets</span>
            </button>

            <Link
              href="/jira"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-text-muted" />
              <span>Projects Directory</span>
            </Link>
          </div>
        </div>

        {/* Footer / Customize */}
        <div className="p-3 border-t border-border">
          <button
            onClick={onOpenCreateProject}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors text-xs"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Customize sidebar</span>
          </button>
        </div>
      </aside>

      {/* Connected Apps Modal */}
      {showAppsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-text-primary">Connected Apps & AI Pipeline</h2>
              <button
                onClick={() => setShowAppsModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-bg-elevated border border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold text-text-primary">AI Task Extractor</div>
                    <div className="text-[11px] text-text-muted">
                      Extracts action items from meeting audio
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>

              <div className="p-3 rounded-xl bg-bg-elevated border border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-bold text-text-primary">LiveKit WebRTC Server</div>
                    <div className="text-[11px] text-text-muted">
                      Real-time video & audio streaming
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-primary border border-primary/20">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals Modal */}
      {showGoalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-text-primary">Sprint Goals & Milestones</h2>
              <button
                onClick={() => setShowGoalsModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Define sprint objectives, key milestones, and completion criteria for current active
              sprints.
            </p>
            <div className="p-3 rounded-xl bg-bg-elevated border border-border text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-text-primary">
                <Target className="w-4 h-4 text-primary" />
                <span>Active Sprint Target</span>
              </div>
              <p className="text-text-muted text-[11px]">
                Deliver all critical and high-priority action items extracted from recent meetings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filters Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-text-primary">Quick Issue Filters</h2>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-xs">
              <Link
                href={currentProjectKey ? `/jira/${currentProjectKey}/board` : '/jira'}
                onClick={() => setShowFiltersModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-bg-elevated text-text-primary transition-colors"
              >
                <span>Only My Assigned Issues</span>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              </Link>
              <Link
                href={currentProjectKey ? `/jira/${currentProjectKey}/board` : '/jira'}
                onClick={() => setShowFiltersModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-bg-elevated text-text-primary transition-colors"
              >
                <span>Meeting Extracted Items</span>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              </Link>
              <Link
                href={currentProjectKey ? `/jira/${currentProjectKey}/list` : '/jira'}
                onClick={() => setShowFiltersModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-bg-elevated text-text-primary transition-colors"
              >
                <span>High & Critical Priority Tasks</span>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
