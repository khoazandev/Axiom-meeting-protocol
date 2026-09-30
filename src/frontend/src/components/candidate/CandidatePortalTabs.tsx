'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Briefcase, FileCheck } from 'lucide-react';
import { CandidateTab } from '@/lib/candidateNavigation';

interface CandidatePortalTabsProps {
  activeTab: CandidateTab;
  onTabChange?: (tab: CandidateTab) => void;
}

export function CandidatePortalTabs({ activeTab, onTabChange }: CandidatePortalTabsProps) {
  const tabs: { id: CandidateTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'cv', label: 'Canva CV Studio', icon: Sparkles },
    { id: 'jobs', label: 'Cơ Hội Việc Làm', icon: Briefcase },
    { id: 'applications', label: 'Hồ Sơ Đã Nộp', icon: FileCheck },
  ];

  return (
    <div className="w-full overflow-x-auto scrollbar-none py-1">
      <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/candidate/discovery?tab=${tab.id}`}
              onClick={() => onTabChange?.(tab.id)}
              title={tab.label}
              className={`shrink-0 w-44 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
