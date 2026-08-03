'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { Search, Bell, Plus, User, LogOut, ShieldCheck, Globe } from 'lucide-react';

export function AppHeader() {
  const { user, activeWorkspace, logout } = useAuthStore();
  const { language, setLanguage, t } = useLanguageStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <header className="h-16 px-6 bg-[#0B0F19]/90 backdrop-blur-md border-b border-blue-950/60 flex items-center justify-between sticky top-0 z-20">
      {/* Global Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t.header.searchPlaceholder}
            className="w-full pl-10 pr-12 py-2 rounded-xl bg-[#131B2E] border border-blue-950/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/60 transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-[10px] font-mono text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Language Switcher Toggle */}
        <button
          onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131B2E] border border-blue-950/80 text-xs font-semibold text-slate-300 hover:text-white hover:border-blue-800/60 transition-all cursor-pointer"
          title="Switch Language (VN / EN)"
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>{language === 'vi' ? '🇻🇳 VN' : '🇺🇸 EN'}</span>
        </button>

        {/* Workspace Badge */}
        {mounted && activeWorkspace && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/40 border border-blue-900/30 text-xs text-blue-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>{activeWorkspace.name}</span>
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-[#131B2E] border border-blue-950/80 text-slate-400 hover:text-white hover:border-blue-800/60 transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#131B2E] border border-blue-900/50 rounded-2xl p-4 shadow-2xl z-50">
              <div className="flex items-center justify-between mb-3 border-b border-blue-950 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] text-blue-400 hover:underline cursor-pointer">Mark all read</span>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-blue-950">
                  <div className="font-semibold text-white">Agenda Process Gate Enforced</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Meeting agenda validated (≥20 chars) successfully.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick New Meeting Button */}
        <Link href="/meetings/create">
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 transition-all">
            <Plus className="w-4 h-4" />
            <span>{t.nav.newMeeting}</span>
          </button>
        </Link>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-[#131B2E] border border-blue-950/80 hover:border-blue-800/60 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center">
              {user?.full_name ? user.full_name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <span className="text-xs font-semibold text-white hidden md:inline">
              {user?.full_name?.split(' ')[0] || 'User'}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#131B2E] border border-blue-900/50 rounded-2xl p-2 shadow-2xl z-50">
              <div className="px-3 py-2 border-b border-blue-950">
                <div className="text-xs font-bold text-white">{user?.full_name || 'Enterprise Account'}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-blue-950/40 transition-colors mt-1"
              >
                <User className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors mt-1 text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
