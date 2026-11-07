'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Logo from '@/components/Logo';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { SwingingLightPullCord } from './SwingingLightPullCord';

export function HomeNavbar() {
  const pathname = usePathname();
  const { t } = useLanguageStore();
  const getActiveTab = (): 'home' | 'docs' => {
    if (pathname.startsWith('/docs')) return 'docs';
    return 'home';
  };
  const [selectedTab, setSelectedTab] = useState<'home' | 'docs'>(getActiveTab);

  // Synchronize when route changes
  React.useEffect(() => {
    setSelectedTab(getActiveTab());
  }, [pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 dark:bg-black/85 backdrop-blur-xl border-b border-slate-200/60 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto h-full px-6 sm:px-8 flex items-center justify-between relative">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <Logo size={34} showText={true} subtitle="DX-OS" />
        </Link>

        {/* Center: Fluid Animated Sliding Pill Nav - Centered mathematically */}
        <div className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-2xl border border-[#e3e7f1]/70 dark:border-neutral-800 rounded-full p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)]">
          {/* Tab 1: Trang chủ / Home */}
          <Link
            href="/"
            onClick={() => setSelectedTab('home')}
            className={clsx(
              'relative flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-medium transition-colors duration-200 select-none',
              selectedTab === 'home'
                ? 'text-white dark:text-neutral-950'
                : 'text-[#757f9c] dark:text-neutral-400 hover:text-[#18181a] dark:hover:text-white'
            )}
          >
            {selectedTab === 'home' && (
              <motion.div
                layoutId="nav-pill-active"
                className="absolute inset-0 bg-[#18181a] dark:bg-white rounded-full shadow-[0_2px_12px_rgba(24,24,26,0.3)]"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <MaterialIcon name="home" className="w-3.5 h-3.5" />
              <span>{t.nav.home}</span>
            </span>
          </Link>

          {/* Tab 2: Tài liệu / Docs */}
          <Link
            href="/docs"
            onClick={() => setSelectedTab('docs')}
            className={clsx(
              'relative flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-medium transition-colors duration-200 select-none',
              selectedTab === 'docs'
                ? 'text-white dark:text-neutral-950'
                : 'text-[#757f9c] dark:text-neutral-400 hover:text-[#18181a] dark:hover:text-white'
            )}
          >
            {selectedTab === 'docs' && (
              <motion.div
                layoutId="nav-pill-active"
                className="absolute inset-0 bg-[#18181a] dark:bg-white rounded-full shadow-[0_2px_12px_rgba(24,24,26,0.3)]"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <MaterialIcon name="menu_book" className="w-3.5 h-3.5" />
              <span>{t.nav.docs}</span>
            </span>
          </Link>
        </div>

        {/* Right: Swinging Lamp Pull Cord & Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Swinging Light Pull Cord Toggle (Nắm kéo thả bật/tắt đèn Đen/Trắng) */}
          <div className="pt-0.5 px-1 flex items-center justify-center">
            <SwingingLightPullCord />
          </div>


          <Link
            href="/login"
            className="flex h-8 items-center justify-center px-4 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-xs font-bold text-white dark:text-neutral-950 transition-all shadow-sm active:scale-95"
          >
            {t.nav.login}
          </Link>
        </div>
      </div>
    </nav>
  );
}
