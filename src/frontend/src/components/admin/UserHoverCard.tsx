'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { OrgMemberDetail } from '@/lib/api';
import { MatIcon } from '@/components/ui/MatIcon';

interface UserHoverCardProps {
  member: OrgMemberDetail;
  children: React.ReactNode;
  align?: 'top' | 'bottom';
  className?: string;
}

export function UserHoverCard({
  member,
  children,
  align = 'bottom',
  className = '',
}: UserHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardWidth = 300;
    const cardHeight = 210;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    const placeAbove =
      align === 'top'
        ? spaceAbove >= cardHeight || spaceAbove > spaceBelow
        : spaceBelow < cardHeight && spaceAbove > spaceBelow;

    let top = placeAbove ? rect.top - cardHeight - 8 : rect.bottom + 8;
    if (top < 10) top = 10;
    if (top + cardHeight > window.innerHeight - 10) {
      top = window.innerHeight - cardHeight - 10;
    }

    let left = rect.left + rect.width / 2 - cardWidth / 2;
    if (left < 12) left = 12;
    if (left + cardWidth > window.innerWidth - 12) {
      left = window.innerWidth - cardWidth - 12;
    }

    setCoords({ top, left, placeAbove });
  }, [align]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    calculatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Close on window scroll to avoid floating detached card
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => {
      setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const isOwner = member.role === 'OWNER';
  const isManager = member.role === 'MANAGER' || member.role === 'ADMIN';

  const roleBadgeConfig = isOwner
    ? {
        label: 'OWNER',
        badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300/80',
        ringClass: 'ring-amber-400 dark:ring-amber-500',
        note: 'Điều hành chiến lược toàn công ty',
      }
    : isManager
    ? {
        label: 'MANAGER',
        badgeClass: 'bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300/80',
        ringClass: 'ring-blue-500',
        note: `Quản lý điều phối ${member.department_name || 'khối chuyên môn'}`,
      }
    : {
        label: 'MEMBER',
        badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        ringClass: 'ring-emerald-500',
        note: `Chuyên viên trực thuộc ${member.department_name || 'khối chuyên môn'}`,
      };

  const phoneFormatted = '+84 908 888 999';

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Floating Hover Card portaled to document.body to avoid any parent overflow clipping */}
      {mounted &&
        isOpen &&
        coords &&
        createPortal(
          <div
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="fixed z-[999999] w-[300px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.25)] p-3.5 text-left text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
          >
            {/* Header with Avatar & Basic Info */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative shrink-0">
                <div
                  className={`w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 ring-2 ${roleBadgeConfig.ringClass} flex items-center justify-center font-bold text-xs shadow-xs`}
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    member.full_name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
                  title="Trực tuyến"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">
                    {member.full_name}
                  </h4>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border shrink-0 ${roleBadgeConfig.badgeClass}`}
                  >
                    {roleBadgeConfig.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {member.email}
                </p>
              </div>
            </div>

            {/* Contact and Department Quick Details */}
            <div className="mt-2.5 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MatIcon name="phone" className="text-[14px] text-slate-400" />
                  <span>Số điện thoại</span>
                </span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                  {phoneFormatted}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MatIcon name="domain" className="text-[14px] text-slate-400" />
                  <span>Phòng ban</span>
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[140px]">
                  {member.department_name || (isOwner ? 'Ban Điều Hành' : 'Chưa phân bổ')}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MatIcon name="wifi_tethering" className="text-[14px] text-emerald-500" />
                  <span>Trạng thái</span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Trực tuyến</span>
                </span>
              </div>
            </div>

            {/* Note Section */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                {roleBadgeConfig.note}
              </p>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
