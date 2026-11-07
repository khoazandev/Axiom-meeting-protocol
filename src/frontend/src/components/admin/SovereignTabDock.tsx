'use client';

import React from 'react';
import { MatIcon } from '@/components/ui/MatIcon';

export type AdminTabKey =
  'overview' | 'members' | 'departments' | 'policies' | 'audit' | 'webhooks';

interface TabItem {
  id: AdminTabKey;
  label: string;
  sublabel: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  isLive?: boolean;
}

const TABS: TabItem[] = [
  {
    id: 'overview',
    label: 'Tổng quan',
    sublabel: 'Giám sát điều hành',
    icon: 'speed',
    isLive: true,
  },
  {
    id: 'members',
    label: 'Nhân sự & RBAC',
    sublabel: 'Phân quyền & Tài khoản',
    icon: 'manage_accounts',
  },
  {
    id: 'departments',
    label: 'Quản lý công việc',
    sublabel: 'Sơ đồ & Tiến độ',
    icon: 'account_tree',
  },
  {
    id: 'policies',
    label: 'Cổng kiểm soát',
    sublabel: 'Agenda Gate & Quy chế',
    icon: 'gavel',
  },
  {
    id: 'audit',
    label: 'Kiểm toán an ninh',
    sublabel: 'Nhật ký & Rủi ro',
    icon: 'security',
  },
  {
    id: 'webhooks',
    label: 'Tích hợp & API',
    sublabel: 'Webhooks & Simulator',
    icon: 'webhook',
  },
];

interface SovereignTabDockProps {
  activeTab: AdminTabKey;
  onTabChange: (tab: AdminTabKey) => void;
}

export function SovereignTabDock({ activeTab, onTabChange }: SovereignTabDockProps) {
  return (
    <nav
      className="w-full bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-16 z-40 shadow-2xs"
      aria-label="Admin Navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2.5 no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-2xs border border-blue-200/80 dark:border-blue-800/80 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {/* Google Material Icon */}
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                  }`}
                >
                  <MatIcon name={tab.icon} filled={isActive} className="text-[18px]" />
                </div>

                {/* Tab Label */}
                <span className="tracking-tight whitespace-nowrap text-xs">{tab.label}</span>

                {/* Active Indicator Underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
