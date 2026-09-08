'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MemberCurlyBracketSidebar,
  MemberSectionKey,
  MEMBER_NAV_SECTIONS,
} from '@/components/member/MemberCurlyBracketSidebar';
import { MemberMeetingsTab } from '@/components/member/MemberMeetingsTab';
import { MemberTasksTab } from '@/components/member/MemberTasksTab';
import { MemberJiraWorkspaceTab } from '@/components/member/MemberJiraWorkspaceTab';
import { MemberCalendarTab } from '@/components/member/MemberCalendarTab';
import { MemberKnowledgeTab } from '@/components/member/MemberKnowledgeTab';
import { MemberSettingsTab } from '@/components/member/MemberSettingsTab';
import { UserProfileModal, generateInitialsAvatar } from '@/components/profile/UserProfileModal';
import { useAuthStore } from '@/lib/store/useAuthStore';
import Logo from '@/components/Logo';
import {
  Search,
  CheckCircle2,
  Video,
  Clock,
  Bell,
  LogOut,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';

function MemberWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, user } = useAuthStore();

  const tabParam = searchParams.get('tab') as MemberSectionKey | null;
  const initialTab: MemberSectionKey =
    tabParam && MEMBER_NAV_SECTIONS.some((s) => s.id === tabParam) ? tabParam : 'meetings';

  // Navigation State
  const [activeSection, setActiveSection] = useState<MemberSectionKey>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync tab with URL if param changes
  useEffect(() => {
    if (tabParam && MEMBER_NAV_SECTIONS.some((s) => s.id === tabParam)) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Clock ticker matching Owner page
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectSection = (section: MemberSectionKey) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSection =
    MEMBER_NAV_SECTIONS.find((s) => s.id === activeSection) || MEMBER_NAV_SECTIONS[0];
  const CurrentIcon = currentSection.icon;

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-blue-500 selection:text-white antialiased">
      {/* ── 1. Floating Auto-Hide Curly Bracket Sidebar (Mirrors Owner /admin) ── */}
      <MemberCurlyBracketSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* ── 2. Top Executive Command Header (Mirrors Owner Sovereign Header) ── */}
      <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 h-16 flex items-center justify-between gap-4 shadow-2xs">
        {/* Left: Brand Identity identical to Owner Page */}
        <div className="flex items-center gap-3">
          <Link href="/member" className="flex items-center gap-2 group">
            <Logo size={34} showText={true} subtitle="DX-OS" />
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 text-[11px] text-blue-600 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Rê chuột mép trái để mở menu</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            THÀNH VIÊN
          </div>
        </div>

        {/* Center: Search & Live Chronometer matching Owner Page */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl mx-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {timeStr || '14:55:00'} ICT
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
              Sẵn sàng
            </span>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm task, cuộc họp, sprint, tài liệu... (⌘K)"
              className="w-full pl-9 pr-12 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Actions matching Owner Page */}
        <div className="flex items-center gap-2.5">
          {/* Quick Meeting Action */}
          <button
            type="button"
            onClick={() => handleSelectSection('meetings')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Video size={14} />
            <span>+ Vào Họp Nhanh</span>
          </button>

          {/* Notification Button */}
          <button
            type="button"
            onClick={() => showToast('Tất cả hệ thống bình thường • 0 cảnh báo khẩn cấp')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
            title="Thông báo cá nhân"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Member Profile Trigger (Click to open UserProfileModal) */}
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 pl-1 group cursor-pointer"
            title="Xem & Chỉnh sửa hồ sơ cá nhân / avatar"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-950 group-hover:ring-emerald-500 transition-all">
              <img
                src={user?.avatar_url || generateInitialsAvatar(user?.full_name || 'Alex Rivera')}
                alt={user?.full_name || 'Alex Rivera'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
                {user?.full_name || 'Alex Rivera'}
              </div>
              <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                KỸ SƯ AI
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* ── 3. Tab Page Content Stage (Mirrors Owner /admin Tab Page Content Stage) ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Active Page Header Banner & Tab Switcher Bar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <CurrentIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentSection.label}
                </h1>
                {currentSection.badge && (
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${currentSection.badgeColor}`}
                  >
                    {currentSection.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentSection.sublabel} • Phím tắt chuyển nhanh:{' '}
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  {currentSection.shortcut}
                </kbd>
              </p>
            </div>
          </div>

          {/* Quick Horizontal Pill Switcher Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto max-w-full">
            {MEMBER_NAV_SECTIONS.map((sec) => {
              const isSelected = activeSection === sec.id;
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectSection(sec.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{sec.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab View Container - 100% Full Width, EXACTLY 1 SIDEBAR */}
        <div className="w-full transition-opacity duration-200">
          {activeSection === 'meetings' && <MemberMeetingsTab onNotify={showToast} />}

          {activeSection === 'tasks' && (
            <MemberTasksTab
              onNotify={showToast}
              onNavigateToJira={() => handleSelectSection('jira')}
            />
          )}

          {activeSection === 'jira' && <MemberJiraWorkspaceTab onNotify={showToast} />}

          {activeSection === 'calendar' && <MemberCalendarTab onNotify={showToast} />}

          {activeSection === 'knowledge' && <MemberKnowledgeTab onNotify={showToast} />}

          {activeSection === 'settings' && <MemberSettingsTab onNotify={showToast} />}
        </div>
      </main>

      {/* User Profile & Avatar Customization Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onNotify={showToast}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700/50 text-xs font-semibold">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F8FC] dark:bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MemberWorkspaceInner />
    </Suspense>
  );
}
