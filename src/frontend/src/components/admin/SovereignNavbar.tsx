'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MatIcon } from '@/components/ui/MatIcon';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface SovereignNavbarProps {
  onOpenInviteModal?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeTab?: string;
}

export function SovereignNavbar({
  onOpenInviteModal,
  searchQuery = '',
  onSearchChange,
}: SovereignNavbarProps) {
  const router = useRouter();
  const { user, activeOrganization, logout } = useAuthStore();
  const [timeStr, setTimeStr] = useState<string>('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
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
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Section: Brand & Sovereign Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5 group focus:outline-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-500 p-0.5 shadow-md group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                <MatIcon
                  name="shield_person"
                  filled
                  className="text-blue-600 dark:text-blue-400 text-[22px]"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  AXIOM
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                  SOVEREIGN
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>{activeOrganization?.name || 'Axiom Enterprise'}</span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  Executive Console
                </span>
              </p>
            </div>
          </Link>
        </div>

        {/* Center Section: System Chronometer & Search Input */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl mx-4">
          {/* Live Clock & Health pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {timeStr || '14:00:00'} ICT
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
              SLA 99.98%
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1">
            <MatIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Tìm kiếm nhân sự, phòng họp, sự kiện kiểm toán..."
              className="w-full pl-9 pr-14 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Section: Actions & User Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick Invite Button */}
          {onOpenInviteModal && (
            <button
              onClick={onOpenInviteModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95"
            >
              <MatIcon name="person_add" className="text-[16px]" />
              <span>Mời nhân sự</span>
            </button>
          )}

          {/* User Profile Avatar with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
            >
              <div className="relative">
                <img
                  src={
                    user?.avatar_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                  }
                  alt="Admin"
                  className="w-8 h-8 rounded-full object-cover border border-amber-400 shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                  {user?.full_name || 'Nguyễn Thế Khang'}
                </p>
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 leading-tight">
                  CHỦ TỊCH / CEO
                </p>
              </div>
              <MatIcon name="expand_more" className="text-slate-400 text-[18px]" />
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {user?.full_name || 'Nguyễn Thế Khang'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                      {user?.email || 'admin@axiom.com'}
                    </p>
                    <span className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                      Vai trò: CHỦ TỊCH HĐQT (Tối cao)
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/manager"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <MatIcon name="dashboard_customize" className="text-[18px] text-blue-500" />
                      <span>Bàn Làm Việc Trưởng Phòng (Manager)</span>
                    </Link>
                    <Link
                      href="/member"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <MatIcon name="person" className="text-[18px] text-slate-400" />
                      <span>Bàn Làm Việc Thành Viên (Member)</span>
                    </Link>
                    <Link
                      href="/docs"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <MatIcon name="menu_book" className="text-[18px] text-slate-400" />
                      <span>Tài liệu Kỹ thuật</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        router.push('/login');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                    >
                      <MatIcon name="logout" className="text-[18px]" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
