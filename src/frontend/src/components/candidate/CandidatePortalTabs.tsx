'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Briefcase, FileCheck, FolderCheck } from 'lucide-react';
import { CandidateTab } from '@/lib/candidateNavigation';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

interface CandidatePortalTabsProps {
  activeTab: CandidateTab;
  onTabChange?: (tab: CandidateTab) => void;
}

export function CandidatePortalTabs({ activeTab, onTabChange }: CandidatePortalTabsProps) {
  const { t } = useLanguageStore();

  const tabs: {
    id: CandidateTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'jobs', label: t.candidate.tabJobs, icon: Briefcase },
    { id: 'cv', label: t.candidate.tabCV, icon: Sparkles },
    { id: 'vault', label: t.candidate.tabVault, icon: FolderCheck },
    { id: 'applications', label: t.candidate.tabApplications, icon: FileCheck },
  ];

  return (
    <div className="w-full sm:w-auto overflow-x-auto scrollbar-none py-1">
      <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 gap-1 select-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/candidate/discovery?tab=${tab.id}`}
              onClick={() => onTabChange?.(tab.id)}
              title={tab.label}
              className={`shrink-0 w-36 sm:w-40 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs border border-neutral-200 dark:border-neutral-700'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-white/40 dark:hover:bg-neutral-800/40'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                  isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'
                }`}
              />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
