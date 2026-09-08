'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  Video,
  CheckSquare,
  Kanban,
  Calendar,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react';

export type MemberSectionKey =
  'meetings' | 'tasks' | 'jira' | 'calendar' | 'knowledge' | 'settings';

export interface MemberNavItem {
  id: MemberSectionKey;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  shortcut: string;
}

export const MEMBER_NAV_ITEMS: MemberNavItem[] = [
  {
    id: 'meetings',
    label: 'Cuộc Họp & Radar',
    sublabel: 'Live SFU & Vào họp nhanh',
    icon: Video,
    badge: '1 Live',
    badgeColor: 'bg-emerald-500 text-white animate-pulse',
    shortcut: '⌘1',
  },
  {
    id: 'tasks',
    label: 'Nhiệm Vụ AI Của Tôi',
    sublabel: 'Action items bóc tách sau họp',
    icon: CheckSquare,
    badge: '3 Tasks',
    badgeColor: 'bg-blue-500 text-white',
    shortcut: '⌘2',
  },
  {
    id: 'jira',
    label: 'Mini Jira Workspace',
    sublabel: 'Bảng Agile Sprint Kanban',
    icon: Kanban,
    badge: 'SMA',
    badgeColor: 'bg-purple-500 text-white',
    shortcut: '⌘3',
  },
  {
    id: 'calendar',
    label: 'Lịch Trình Cá Nhân',
    sublabel: 'Daily Standup, 1-on-1 & Sprint',
    icon: Calendar,
    shortcut: '⌘4',
  },
  {
    id: 'knowledge',
    label: 'Kho Tri Thức AI (RAG)',
    sublabel: 'Tra cứu biên bản & nghị quyết',
    icon: BookOpen,
    badge: 'AI Search',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30',
    shortcut: '⌘5',
  },
  {
    id: 'settings',
    label: 'Cài Đặt & Thiết Bị',
    sublabel: 'Microphone, Camera & Hồ sơ',
    icon: Settings,
    shortcut: '⌘6',
  },
];

interface MemberSidebarProps {
  activeSection: MemberSectionKey;
  onSelectSection: (section: MemberSectionKey) => void;
  onLogout?: () => void;
}

export function MemberSidebar({ activeSection, onSelectSection, onLogout }: MemberSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Keyboard shortcut support (⌘1 - ⌘6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 6) {
          e.preventDefault();
          onSelectSection(MEMBER_NAV_ITEMS[num - 1].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectSection]);

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-18' : 'w-72'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          {!collapsed ? (
            <Link href="/member" className="flex items-center gap-2.5 overflow-hidden">
              <Logo size={28} showText={true} subtitle="MEMBER" />
            </Link>
          ) : (
            <div className="mx-auto">
              <Logo size={28} showText={false} />
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Member Profile Identity Card */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          {!collapsed ? (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-950">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                    alt="Alex Rivera"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white dark:border-slate-900" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Alex Rivera
                  </div>
                  <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    THÀNH VIÊN (MEMBER)
                  </div>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
                <span className="truncate">Khối Kỹ Thuật (Engineering)</span>
                <span className="font-mono text-[9.5px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                  Online
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-emerald-400">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                  alt="Alex Rivera"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* Nav List */}
        <div className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-250px)] scrollbar-thin">
          {!collapsed && (
            <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              KHÔNG GIAN LÀM VIỆC CỦA BẠN
            </div>
          )}

          {MEMBER_NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    size={17}
                    className={
                      isActive
                        ? 'text-white shrink-0'
                        : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0'
                    }
                  />
                  {!collapsed && (
                    <div className="text-left overflow-hidden">
                      <div className="truncate text-xs font-bold leading-tight">{item.label}</div>
                      <div
                        className={`text-[10px] truncate leading-tight ${
                          isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.sublabel}
                      </div>
                    </div>
                  )}
                </div>

                {!collapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <kbd
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.shortcut}
                    </kbd>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          title="Đăng xuất tài khoản"
        >
          <LogOut size={16} className="text-slate-400 hover:text-rose-600 shrink-0" />
          {!collapsed && <span>Đăng Xuất</span>}
        </button>
      </div>
    </aside>
  );
}
