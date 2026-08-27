'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { Search, Bell, Plus, User, LogOut, ShieldCheck, Globe } from 'lucide-react';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function AppHeader() {
  const { user, activeOrganization, logout } = useAuthStore();
  const { language, setLanguage, t } = useLanguageStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const mounted = useMounted();

  return (
    <header className="h-16 px-6 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between sticky top-0 z-20">
      {/* Global Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.header.searchPlaceholder}
            className="w-full pl-10 pr-12 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-colors shadow-sm"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Language Switcher Toggle */}
        <button
          onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm cursor-pointer"
          title="Switch Language (VN / EN)"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>{language === 'vi' ? '🇻🇳 VN' : '🇺🇸 EN'}</span>
        </button>

        {/* Workspace Badge */}
        {mounted && activeOrganization && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{activeOrganization.name}</span>
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl p-4 shadow-xl z-50">
              <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {t.header.notifications}
                </span>
                <span className="text-[10px] text-primary hover:underline cursor-pointer">
                  {t.header.markAllRead}
                </span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="p-2.5 rounded-xl bg-muted border border-border">
                  <div className="font-semibold text-foreground">Agenda Process Gate Enforced</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Meeting agenda validated (≥20 chars) successfully.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick New Meeting Button */}
        <Link href="/meetings/create">
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 transition-all">
            <Plus className="w-4 h-4" />
            <span>{t.nav.newMeeting}</span>
          </button>
        </Link>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
              {user?.full_name
                ? user.full_name[0].toUpperCase()
                : user?.email
                  ? user.email[0].toUpperCase()
                  : 'U'}
            </div>
            <span className="text-xs font-semibold text-foreground hidden md:inline">
              {user?.full_name?.split(' ')[0] || 'User'}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl p-2 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-border">
                <div className="text-xs font-bold text-foreground">
                  {user?.full_name || 'Enterprise Account'}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
              </div>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.header.accountSettings}</span>
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors mt-1 text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.header.signOut}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
