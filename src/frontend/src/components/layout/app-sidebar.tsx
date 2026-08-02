'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  Video,
  CheckSquare,
  Calendar,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building,
  Plus,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, activeWorkspace, workspaces, setActiveWorkspace } = useAuthStore();

  const navItems = [
    { label: 'Meetings', href: '/meetings', icon: Video, badge: null },
    { label: 'Tasks & Actions', href: '/tasks', icon: CheckSquare, badge: 'New' },
    { label: 'Calendar', href: '/calendar', icon: Calendar, badge: null },
    { label: 'Knowledge Hub', href: '/knowledge', icon: BookOpen, badge: 'AI' },
    { label: 'Admin Console', href: '/admin', icon: ShieldCheck, badge: 'Gov' },
    { label: 'Settings', href: '/settings', icon: Settings, badge: null },
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#0E1526] border-r border-blue-950/60 transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Workspace Header Switcher */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-blue-950/40">
        {!collapsed ? (
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Building className="w-4 h-4" />
            </div>
            <select
              value={activeWorkspace?.id || ''}
              onChange={(e) => {
                const ws = workspaces.find((w) => w.id === e.target.value);
                if (ws) setActiveWorkspace(ws);
              }}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer truncate w-full"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-[#131B2E] text-white">
                  {ws.name}
                </option>
              ))}
              {workspaces.length === 0 && (
                <option value="" className="bg-[#131B2E] text-slate-400">
                  Default Workspace
                </option>
              )}
            </select>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              {activeWorkspace?.name ? activeWorkspace.name[0].toUpperCase() : 'A'}
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Button */}
      <div className="p-3">
        <Link
          href="/meetings/create"
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 transition-all ${
            collapsed ? 'px-0' : 'px-4'
          }`}
          title="New Meeting"
        >
          <Plus className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm font-semibold">New Meeting</span>}
        </Link>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Workspace Shell
          </div>
        )}

        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
              title={item.label}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                {!collapsed && <span>{item.label}</span>}
              </div>
              {!collapsed && item.badge && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Active User Footer */}
      <div className="p-3 border-t border-blue-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              {user?.full_name ? user.full_name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.full_name || 'Enterprise User'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email || 'user@company.com'}</div>
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg bg-slate-900 border border-blue-950/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
