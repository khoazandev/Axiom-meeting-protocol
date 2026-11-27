'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { notificationApi, AppNotification } from '@/lib/api';
import { Search, Bell, Plus, User, LogOut, ShieldCheck, CheckCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function AppHeader() {
  const router = useRouter();
  const { user, activeOrganization, logout } = useAuthStore();
  const { t } = useLanguageStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const mounted = useMounted();

  // Load notifications and setup SSE stream
  useEffect(() => {
    if (!user) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    notificationApi
      .list(20)
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      })
      .catch(() => {});

    if (!token) return;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/notifications/stream?token=${encodeURIComponent(token)}`);
      eventSource.addEventListener('notification', (e) => {
        try {
          const item: AppNotification = JSON.parse(e.data);
          setNotifications((prev) => [item, ...prev]);
          setUnreadCount((c) => c + 1);
        } catch {}
      });
    } catch {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      try {
        await notificationApi.markAsRead(notif.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
      } catch {}
    }
    if (notif.link) {
      setShowNotifications(false);
      router.push(notif.link);
    }
  };

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
        {/* Theme Toggle Button */}
        <ThemeToggle />

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
            className="relative p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl p-4 shadow-xl z-50">
              <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {t.header.notifications} ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer font-medium"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>{t.header.markAllRead}</span>
                  </button>
                )}
              </div>
              <div className="space-y-2 text-xs max-h-80 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Không có thông báo mới
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        notif.is_read
                          ? 'bg-muted/40 border-border text-muted-foreground'
                          : 'bg-primary/5 border-primary/20 text-foreground'
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between gap-2">
                        <span className="truncate">{notif.title}</span>
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.content}
                      </div>
                      <div className="text-[9px] text-muted-foreground/70 mt-1">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
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
