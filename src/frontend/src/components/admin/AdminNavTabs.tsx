'use client';

import React from 'react';
import { MaterialIcon, MaterialIconName } from '@/components/ui/MaterialIcon';

export type AdminTabKey =
  'pulse' | 'members' | 'departments' | 'policies' | 'security' | 'webhooks';

interface AdminNavTabsProps {
  activeTab: AdminTabKey;
  onChangeTab: (tab: AdminTabKey) => void;
  badgeCounts?: {
    liveMeetings?: number;
    totalMembers?: number;
    departments?: number;
    securityAlerts?: number;
  };
}

interface TabDef {
  key: AdminTabKey;
  label: string;
  icon: MaterialIconName;
  badge?: number | string;
  badgeColor?: string;
}

export function AdminNavTabs({ activeTab, onChangeTab }: AdminNavTabsProps) {
  const tabs: TabDef[] = [
    {
      key: 'pulse',
      label: 'Tổng Quan',
      icon: 'speed',
    },
    {
      key: 'members',
      label: 'Nhân Sự & RBAC',
      icon: 'groups',
    },
    {
      key: 'departments',
      label: 'Quản Lý Công Việc',
      icon: 'task_alt',
    },
    {
      key: 'policies',
      label: 'Cổng Kiểm Soát',
      icon: 'gavel',
    },
    {
      key: 'security',
      label: 'Kiểm Toán & An Ninh',
      icon: 'security',
    },
    {
      key: 'webhooks',
      label: 'Tích Hợp & Webhooks',
      icon: 'webhook',
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/80 dark:border-slate-800 mb-6">
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChangeTab(t.key)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              isActive
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-slate-800'
            }`}
          >
            <MaterialIcon
              name={t.icon}
              className={`w-4 h-4 ${isActive ? 'text-blue-400 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
            />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
