'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  Video,
  Kanban,
  Calendar,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FolderGit2,
} from 'lucide-react';

export type ManagerNavKey = 'meetings' | 'kanban' | 'calendar' | 'team' | 'analytics';

interface ManagerSidebarProps {
  activeTab: ManagerNavKey;
  onSelectTab: (tab: ManagerNavKey) => void;
  departmentName?: string;
  activeMeetingsCount?: number;
  pendingTasksCount?: number;
}

export function ManagerSidebar({
  activeTab,
  onSelectTab,
  departmentName = 'Khối Kỹ Thuật (Engineering)',
  activeMeetingsCount = 1,
  pendingTasksCount = 6,
}: ManagerSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navGroups = [
    {
      title: 'ĐIỀU HÀNH CUỘC HỌP',
      items: [
        {
          id: 'meetings' as ManagerNavKey,
          label: 'Cuộc Họp Phòng Ban',
          icon: Video,
          badge: activeMeetingsCount > 0 ? `${activeMeetingsCount} Live` : undefined,
          badgeClass: 'bg-emerald-500 text-white animate-pulse',
        },
        {
          id: 'kanban' as ManagerNavKey,
          label: 'Bảng Nhiệm Vụ AI (Kanban)',
          icon: Kanban,
          badge: pendingTasksCount > 0 ? `${pendingTasksCount} Tasks` : undefined,
          badgeClass: 'bg-blue-500 text-white',
        },
        {
          id: 'calendar' as ManagerNavKey,
          label: 'Lịch Trình Nội Bộ',
          icon: Calendar,
        },
      ],
    },
    {
      title: 'NHÂN SỰ & HIỆU SUẤT',
      items: [
        {
          id: 'team' as ManagerNavKey,
          label: 'Nhân Sự Phòng Ban',
          icon: Users,
          badge: '12 TV',
          badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        {
          id: 'analytics' as ManagerNavKey,
          label: 'Sức Khỏe Kỷ Luật & Quá Tải',
          icon: BarChart3,
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-18' : 'w-68'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          {!collapsed ? (
            <Link href="/manager" className="flex items-center gap-2.5 overflow-hidden">
              <Logo size={28} showText={true} subtitle="MANAGER" />
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

        {/* Manager & Department Badge */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          {!collapsed ? (
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-blue-400">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                    alt="Manager"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white dark:border-slate-900" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Trần Minh Khoa
                  </div>
                  <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    TRƯỞNG PHÒNG
                  </div>
                </div>
              </div>

              <div className="pt-1.5 border-t border-blue-100/80 dark:border-blue-900/60 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <FolderGit2 size={13} className="text-blue-500 shrink-0" />
                <span className="truncate font-semibold">{departmentName}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-blue-400">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                  alt="Manager"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-thin">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!collapsed && (
                <div className="px-2.5 pb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.title}
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      title={collapsed ? item.label : undefined}
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
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!collapsed && item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-white/20 text-white' : item.badgeClass
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
        <Link
          href="/member"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          title="Bàn làm việc thành viên"
        >
          <LogOut size={16} className="text-slate-400 shrink-0" />
          {!collapsed && <span>Bàn Làm Việc Thành Viên</span>}
        </Link>
      </div>
    </aside>
  );
}
