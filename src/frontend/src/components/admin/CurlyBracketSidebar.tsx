'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MatIcon } from '@/components/ui/MatIcon';
import { Pin, PinOff, ChevronRight } from 'lucide-react';
import { generateInitialsAvatar } from '@/components/profile/UserProfileModal';

export type AdminSectionKey =
  'overview' | 'members' | 'departments' | 'policies' | 'audit' | 'webhooks';

export interface NavSectionItem {
  id: AdminSectionKey;
  label: string;
  sublabel: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  shortcut: string;
}

export const NAV_SECTIONS: NavSectionItem[] = [
  {
    id: 'overview',
    label: 'Tổng quan & Radar',
    sublabel: 'Pulse & Live Meeting Radar SFU',
    icon: 'radar',
    badge: '3 Trực tiếp',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    shortcut: '⌘1',
  },
  {
    id: 'members',
    label: 'Nhân sự & RBAC',
    sublabel: '10 Thành viên & Phân quyền',
    icon: 'manage_accounts',
    badge: '10 người',
    badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    shortcut: '⌘2',
  },
  {
    id: 'departments',
    label: 'Cơ cấu Phòng ban',
    sublabel: '5 Khối & Sức khỏe Cuộc họp',
    icon: 'account_tree',
    badge: '5 khối',
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    shortcut: '⌘3',
  },
  {
    id: 'policies',
    label: 'Kỷ luật Cuộc họp',
    sublabel: 'Agenda Gate & MoM AI Pipeline',
    icon: 'gavel',
    badge: '6 quy chế',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    shortcut: '⌘4',
  },
  {
    id: 'audit',
    label: 'Kiểm toán An ninh',
    sublabel: 'Nhật ký truy vết & Xuất CSV',
    icon: 'security',
    badge: 'ISO/IEC',
    badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    shortcut: '⌘5',
  },
  {
    id: 'webhooks',
    label: 'Tích hợp & Webhook',
    sublabel: 'API Endpoint & Live Simulator',
    icon: 'webhook',
    badge: '3 Endpoints',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    shortcut: '⌘6',
  },
];

import { useAuthStore } from '@/lib/store/useAuthStore';

interface CurlyBracketSidebarProps {
  activeSection: AdminSectionKey;
  onSelectSection: (section: AdminSectionKey) => void;
  onOpenInviteModal?: () => void;
  onOpenProfile?: () => void;
}

export function CurlyBracketSidebar({
  activeSection,
  onSelectSection,
  onOpenProfile,
}: CurlyBracketSidebarProps) {
  const { user } = useAuthStore();
  // Visibility & Interaction States
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<AdminSectionKey | null>(null);

  // Debounce ref to prevent accidental closing when mouse moves slightly outside
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard navigation (Esc, ⌘1-6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPinned) {
        setIsOpen(false);
      }
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 6) {
          e.preventDefault();
          onSelectSection(NAV_SECTIONS[num - 1].id);
          // Briefly reveal sidebar to confirm selection
          setIsOpen(true);
          if (!isPinned) {
            if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = setTimeout(() => setIsOpen(false), 2000);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinned, onSelectSection]);

  // Mouse hover handlers with graceful debounce
  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setHoveredSection(null);
    }, 320); // 320ms smooth grace window
  };

  const isVisible = isOpen || isPinned;

  return (
    <>
      {/* ── 1. Invisible Edge Trigger Zone (Full height along far-left edge) ── */}
      <div
        className="fixed left-0 top-0 bottom-0 w-6 z-40"
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseEnter}
      />

      {/* ── 2. Sleek Capsule Peek Indicator (When sidebar is hidden) ── */}
      {!isVisible && (
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={handleMouseEnter}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 group flex items-center justify-center p-0.5 cursor-pointer transition-all duration-300"
          title="Rê chuột hoặc nhấp để mở menu điều khiển"
        >
          <div className="w-1.5 h-16 rounded-r-full bg-gradient-to-b from-blue-400 via-blue-600 to-indigo-600 group-hover:w-3 group-hover:h-20 shadow-[0_0_16px_rgba(59,130,246,0.6)] transition-all duration-300 flex items-center justify-end pr-0.5">
            <ChevronRight className="w-2.5 h-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </button>
      )}

      {/* ── 3. Ultra-Clean Glassmorphism Command Dock ── */}
      <aside
        className={`fixed left-4 top-1/2 -translate-y-1/2 z-50 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
          isVisible
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : '-translate-x-24 opacity-0 pointer-events-none'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Double-Bezel Floating Glass Island */}
        <div className="relative rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_24px_54px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.08)] p-2 flex flex-col items-center gap-1.5">
          {/* Header: System Live Pulse Indicator */}
          <div className="w-full flex flex-col items-center pt-1 pb-1.5 px-1">
            <div
              className="flex items-center justify-center relative group/pulse"
              title="Hệ thống Axiom DX-OS: Sẵn sàng"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
            </div>
            <div className="w-6 h-[1px] bg-slate-200/80 dark:bg-slate-800 mt-2" />
          </div>

          {/* Navigation Item Stack (6 Sections) */}
          <nav className="flex flex-col items-center gap-1.5" aria-label="Admin Navigation">
            {NAV_SECTIONS.map((section, idx) => {
              const isActive = activeSection === section.id;
              const isHovered = hoveredSection === section.id;

              return (
                <div
                  key={section.id}
                  className="relative flex items-center justify-center"
                  onMouseEnter={() => setHoveredSection(section.id)}
                  onMouseLeave={() => setHoveredSection(null)}
                >
                  {/* Action Button */}
                  <button
                    onClick={() => onSelectSection(section.id)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative group ${
                      isActive
                        ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-[0_4px_16px_rgba(59,130,246,0.45)] ring-2 ring-white/50 dark:ring-blue-400/50 scale-105 z-10'
                        : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/90 dark:hover:bg-slate-800/90 hover:scale-105'
                    }`}
                    title={`${section.label} (${section.shortcut})`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <MatIcon
                      name={section.icon}
                      size={20}
                      className={`transition-transform duration-200 ${
                        isActive ? 'text-white' : 'group-hover:scale-110'
                      }`}
                    />

                    {/* Active Highlight Glow Dot */}
                    {isActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-300 dark:bg-blue-400 ring-2 ring-blue-600 dark:ring-slate-900 shadow-sm" />
                    )}
                  </button>

                  {/* ── Flyout Tooltip Card on Hover ── */}
                  {isHovered && (
                    <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-left-2 duration-150 whitespace-nowrap">
                      <div className="px-3.5 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_12px_32px_rgba(0,0,0,0.18)] flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {section.label}
                            </span>
                            {section.badge && (
                              <span
                                className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border ${section.badgeColor}`}
                              >
                                {section.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {section.sublabel}
                          </p>
                        </div>
                        <kbd className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          {section.shortcut}
                        </kbd>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer Controls: Workspace Link + Pin Dock Button */}
          <div className="w-full flex flex-col items-center gap-1.5 pt-1.5 pb-1">
            <div className="w-6 h-[1px] bg-slate-200/80 dark:bg-slate-800" />

            {/* Owner Profile Avatar (Click to open UserProfileModal) */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="relative w-8 h-8 rounded-full overflow-hidden border border-blue-400/80 ring-2 ring-blue-100 dark:ring-blue-950/60 hover:ring-blue-500 transition-all cursor-pointer group"
              title="Xem & Chỉnh sửa hồ sơ cá nhân / avatar"
            >
              <img
                src={user?.avatar_url || generateInitialsAvatar(user?.full_name || 'Chủ Tịch')}
                alt={user?.full_name || 'Chủ Tịch'}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-slate-900" />
            </button>

            {/* Pin Toggle */}
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                isPinned
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/40'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              title={isPinned ? 'Bỏ ghim (Tự động ẩn khi rời chuột)' : 'Ghim cố định menu'}
            >
              {isPinned ? (
                <Pin className="w-3.5 h-3.5 fill-current" />
              ) : (
                <PinOff className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default CurlyBracketSidebar;
