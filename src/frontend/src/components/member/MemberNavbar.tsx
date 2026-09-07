"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  Bell,
  Plus,
  Video,
  CheckCircle2,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";

interface MemberNavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenQuickMeeting?: () => void;
  onLogout?: () => void;
}

export function MemberNavbar({
  searchQuery,
  onSearchChange,
  onOpenQuickMeeting,
  onLogout,
}: MemberNavbarProps) {
  const [timeStr, setTimeStr] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Clock ticker
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      {/* Left: Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm cuộc họp, task AI, dự án Jira... (⌘K)"
            className="w-full pl-9 pr-12 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions & User Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick Meeting Action */}
        <button
          type="button"
          onClick={onOpenQuickMeeting}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Tạo Cuộc Họp Nhanh</span>
        </button>

        {/* Real-time Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-semibold">
          <Clock size={12} className="text-slate-400" />
          <span>{timeStr || "--:--:--"}</span>
        </div>

        {/* Notification Pill */}
        <div className="relative">
          <button
            type="button"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
            title="Thông báo cá nhân"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Member Profile Avatar with Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-emerald-400 shadow-xs ring-2 ring-emerald-100 dark:ring-emerald-950">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                alt="Alex Rivera"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white dark:border-slate-900" />
            </div>

            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                Alex Rivera
              </p>
              <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase leading-tight">
                THÀNH VIÊN (MEMBER)
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* User Dropdown */}
          {userDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-2 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">Alex Rivera</p>
                  <p className="text-slate-400 text-[11px] truncate">alex@axiom.com</p>
                  <span className="mt-1.5 inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Vai trò: THÀNH VIÊN (MEMBER)
                  </span>
                </div>

                <div className="py-1">
                  <div className="px-3.5 py-1.5 text-[11px] text-slate-500">
                    Phòng ban: <strong className="text-slate-700 dark:text-slate-300">Khối Kỹ Thuật</strong>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left font-bold transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
