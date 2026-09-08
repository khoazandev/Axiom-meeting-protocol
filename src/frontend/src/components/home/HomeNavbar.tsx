'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Logo from '@/components/Logo';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export function HomeNavbar() {
  const pathname = usePathname();
  const currentTab = pathname.startsWith('/docs') ? 'docs' : 'home';
  const [selectedTab, setSelectedTab] = useState<'home' | 'docs'>(currentTab);

  // Synchronize when route changes
  React.useEffect(() => {
    setSelectedTab(pathname.startsWith('/docs') ? 'docs' : 'home');
  }, [pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-8 py-3.5">
      {/* Left: Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <Logo size={34} showText={true} subtitle="DX-OS" />
      </Link>

      {/* Center: Fluid Animated Sliding Pill Nav */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-white/85 backdrop-blur-2xl border border-[#e3e7f1]/70 rounded-full p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)]">
        {/* Tab 1: Trang chủ */}
        <Link
          href="/"
          onClick={() => setSelectedTab('home')}
          className={clsx(
            'relative flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-medium transition-colors duration-200 select-none',
            selectedTab === 'home' ? 'text-white' : 'text-[#757f9c] hover:text-[#18181a]'
          )}
        >
          {selectedTab === 'home' && (
            <motion.div
              layoutId="nav-pill-active"
              className="absolute inset-0 bg-[#18181a] rounded-full shadow-[0_2px_12px_rgba(24,24,26,0.3)]"
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
              }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <MaterialIcon name="home" className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </span>
        </Link>

        {/* Tab 2: Tài liệu */}
        <Link
          href="/docs"
          onClick={() => setSelectedTab('docs')}
          className={clsx(
            'relative flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-medium transition-colors duration-200 select-none',
            selectedTab === 'docs' ? 'text-white' : 'text-[#757f9c] hover:text-[#18181a]'
          )}
        >
          {selectedTab === 'docs' && (
            <motion.div
              layoutId="nav-pill-active"
              className="absolute inset-0 bg-[#18181a] rounded-full shadow-[0_2px_12px_rgba(24,24,26,0.3)]"
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
              }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <MaterialIcon name="menu_book" className="w-3.5 h-3.5" />
            <span>Tài liệu</span>
          </span>
        </Link>
      </div>

      {/* Right: Language & Dashboard Action */}
      <div className="flex items-center gap-2">
        <button className="flex h-8 items-center justify-center gap-1.5 rounded-[10px] border border-[#e3e7f1] bg-white px-2.5 text-xs font-medium text-[#757f9c] transition-colors hover:border-[#cbd3e6] hover:text-[#18181a] shadow-sm">
          <MaterialIcon name="translate" className="w-3.5 h-3.5 text-slate-500" />
          <span>VI</span>
          <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <Link
          href="/member"
          className="hidden sm:flex h-8 items-center justify-center px-3.5 rounded-[10px] bg-[#18181a] text-xs font-semibold text-white transition-all hover:bg-black shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
        >
          Vào Không Gian Làm Việc
        </Link>
      </div>
    </nav>
  );
}
