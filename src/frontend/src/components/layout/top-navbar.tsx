'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { useThemeStore } from '@/lib/store/useThemeStore';
import {
  Video,
  CheckSquare,
  CalendarDays,
  FolderOpen,
  Bell,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Settings,
  ShieldCheck,
  Globe,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/meetings', icon: Video, labelKey: 'meetings' as const },
  { href: '/tasks', icon: CheckSquare, labelKey: 'tasks' as const },
  { href: '/calendar', icon: CalendarDays, labelKey: 'calendar' as const },
  { href: '/knowledge', icon: FolderOpen, labelKey: 'knowledge' as const },
];

export function TopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeWorkspace, logout } = useAuthStore();
  const { language, setLanguage, t } = useLanguageStore();
  const { theme, setTheme } = useThemeStore();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile drawer on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const userInitial = user?.full_name
    ? user.full_name[0].toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U';

  return (
    <>
      {/* ── Desktop Navbar ── */}
      <header className="h-14 px-4 md:px-6 bg-bg-base border-b border-border flex items-center justify-between sticky top-0 z-40">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/meetings" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-xs">A</span>
            </div>
            <span className="text-text-primary font-semibold text-sm hidden sm:inline">Axiom</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    active
                      ? 'text-text-primary bg-bg-elevated'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{t.nav[item.labelKey]}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors duration-150"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'vi' ? 'VN' : 'EN'}</span>
          </button>

          {/* Theme Toggle */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors duration-150"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : theme === 'system' ? (
                <Monitor className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-bg-card border border-border rounded-xl p-1 shadow-lg z-50">
                {[
                  { value: 'light' as const, label: 'Sáng', icon: Sun },
                  { value: 'dark' as const, label: 'Tối', icon: Moon },
                  { value: 'system' as const, label: 'Hệ thống', icon: Monitor },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                      theme === opt.value
                        ? 'text-text-primary bg-bg-elevated'
                        : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50'
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors duration-150"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-bg-card border border-border rounded-xl p-3 shadow-lg z-50">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border-subtle">
                  <span className="text-sm font-semibold text-text-primary">
                    {t.header.notifications}
                  </span>
                  <span className="text-xs text-accent hover:underline cursor-pointer">
                    {t.header.markAllRead}
                  </span>
                </div>
                <div className="text-sm text-text-muted py-4 text-center">
                  Không có thông báo mới
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-bg-elevated transition-colors duration-150"
            >
              <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground font-semibold text-xs flex items-center justify-center">
                {userInitial}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-bg-card border border-border rounded-xl p-1.5 shadow-lg z-50">
                {/* User info */}
                <div className="px-3 py-2.5 border-b border-border-subtle">
                  <div className="text-sm font-semibold text-text-primary">
                    {user?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-text-muted truncate mt-0.5">{user?.email}</div>
                  {activeWorkspace && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{activeWorkspace.name}</span>
                    </div>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/admin"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors duration-150"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t.nav.admin}</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors duration-150"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{t.nav.settings}</span>
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-border-subtle pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors duration-150"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.header.signOut}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-[280px] bg-bg-card border-r border-border z-50 md:hidden flex flex-col animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                  <span className="text-accent-foreground font-bold text-xs">A</span>
                </div>
                <span className="text-text-primary font-semibold text-sm">Axiom</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                      active
                        ? 'text-text-primary bg-bg-elevated'
                        : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{t.nav[item.labelKey]}</span>
                  </Link>
                );
              })}

              <div className="!mt-4 pt-3 border-t border-border-subtle space-y-0.5">
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50 transition-colors duration-150"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>{t.nav.admin}</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50 transition-colors duration-150"
                >
                  <Settings className="w-5 h-5" />
                  <span>{t.nav.settings}</span>
                </Link>
              </div>
            </nav>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-border-subtle space-y-2">
              {/* Theme Toggle Row */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-elevated">
                {[
                  { value: 'light' as const, icon: Sun },
                  { value: 'dark' as const, icon: Moon },
                  { value: 'system' as const, icon: Monitor },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 flex items-center justify-center p-2 rounded-md text-xs transition-colors ${
                      theme === opt.value
                        ? 'bg-bg-card text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* User Info + Logout */}
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground font-semibold text-xs flex items-center justify-center shrink-0">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {user?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-text-muted truncate">{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
