'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MatIcon } from './MatIcon';
import { AppNotification, notificationsApi } from '@/lib/notifications-api';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const router = useRouter();
  const { token, user } = useAuthStore();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Initial Fetch & Fallback Polling
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await notificationsApi.list(30);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchNotifications();

    // 25s background polling fallback
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, [token]);

  // Realtime SSE Stream Connection
  useEffect(() => {
    if (!token) return;

    let eventSource: EventSource | null = null;
    try {
      const streamUrl = `${notificationsApi.getStreamUrl()}?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('notification', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.id) {
            setNotifications((prev) => {
              const exists = prev.some((n) => n.id === payload.id);
              if (exists) return prev;
              return [payload, ...prev];
            });
            setUnreadCount((c) => c + 1);
          }
        } catch {
          // ignore parse error
        }
      });

      eventSource.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch {
      // EventSource not supported or blocked
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [token]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      setLoading(true);
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      try {
        await notificationsApi.markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    }

    setIsOpen(false);

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INTERVIEW_SCHEDULED':
        return { name: 'video_camera_front', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60' };
      case 'CV_APPROVED':
        return { name: 'verified', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/60' };
      case 'APPLICATION_REJECTED':
      case 'CV_REJECTED':
        return { name: 'cancel', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/60' };
      case 'ONBOARDING':
      case 'ONBOARDING_INVITED':
        return { name: 'mail', color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/60' };
      case 'ASSESSMENT_READY':
        return { name: 'quiz', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/60' };
      default:
        return { name: 'notifications', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60' };
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);
      if (diffSec < 60) return 'Vừa xong';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} giờ trước`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay} ngày trước`;
      return past.toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        title="Thông báo hệ thống"
      >
        <MatIcon name="notifications" size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown (Fixed width w-80 or w-96 to prevent CLS) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Thông Báo
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                <MatIcon name="notifications_off" size={28} className="mx-auto mb-2 opacity-50" />
                <p>Bạn chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const iconInfo = getNotificationIcon(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex gap-3 transition-colors cursor-pointer text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      !notif.is_read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${iconInfo.color}`}
                    >
                      <MatIcon name={iconInfo.name} size={17} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs truncate ${
                            !notif.is_read
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'font-semibold text-slate-700 dark:text-slate-300'
                          }`}
                          title={notif.title}
                        >
                          {notif.title}
                        </h4>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {notif.content}
                      </p>

                      <div className="flex items-center justify-between gap-1 mt-1.5 text-[10px] text-slate-400">
                        <span>{formatTimeAgo(notif.created_at)}</span>
                        {notif.link && (
                          <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                            <span>Truy cập</span>
                            <MatIcon name="chevron_right" size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-400">
              Thông báo cập nhật trực tiếp theo thời gian thực (Realtime SSE)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
