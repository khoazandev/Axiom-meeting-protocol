'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageFlip } from './PageFlipWrapper';

export function WholePageFlipWidget() {
  const pathname = usePathname();
  const isCareersPage = pathname.startsWith('/careers') || pathname.startsWith('/recruitment');
  const { triggerFlip, isFlipping } = usePageFlip();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFlipping) return;
    if (isCareersPage) {
      triggerFlip('home');
    } else {
      triggerFlip('careers');
    }
  };

  if (!mounted) return null;

  return createPortal(
    <aside
      aria-label="3D Page Turn Switch"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] pointer-events-auto select-none flex items-center justify-end pr-2 group cursor-pointer"
    >
      {/* 1. Một vệt nhỏ ở mép màn hình khi chưa rê chuột (Slender streak) */}
      {!isHovered && (
        <div
          className="w-[2.5px] h-10 rounded-l-full bg-slate-400/50 dark:bg-white/40 transition-all duration-300 group-hover:opacity-0"
          aria-hidden="true"
        />
      )}

      {/* 2. Khi rê chuột vào: Hiển thị icon mũi tên cong KHÔNG BACKGROUND, đã lật chiều */}
      <AnimatePresence>
        {isHovered && (
          <motion.button
            type="button"
            onClick={handleClick}
            initial={{ opacity: 0, x: 12, scale: 0.85 }}
            animate={{ opacity: 1, x: -4, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.85 }}
            whileHover={{ scale: 1.15, x: -6 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            title={isCareersPage ? 'Lật về Trang Chủ' : 'Lật sang Tuyển Dụng'}
            className="bg-transparent border-0 p-2 cursor-pointer text-slate-800 dark:text-neutral-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors drop-shadow-md flex items-center justify-center focus:outline-none"
          >
            {isCareersPage ? (
              // Ở trang Tuyển Dụng: Lật mũi tên cong hướng về Trang Chủ (sang phải)
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 14 5-5-5-5" />
                <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
              </svg>
            ) : (
              // Ở Trang Chủ: Lật mũi tên cong uốn vào trong lật sang Tuyển Dụng (sang trái)
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
              </svg>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </aside>,
    document.body
  );
}
