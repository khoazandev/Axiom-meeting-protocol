'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useThemeStore } from '@/lib/store/useThemeStore';

export function SwingingLightPullCord() {
  const { theme, setTheme } = useThemeStore();
  const [isDragging, setIsDragging] = useState(false);
  const cordY = useMotionValue(0);

  // Determine current active theme
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const triggerToggle = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([15, 30, 15]);
    }
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleDragEnd = (_: unknown, info: { offset: { y: number } }) => {
    setIsDragging(false);

    // If dragged down past 12px, trigger the toggle!
    if (info.offset.y > 12) {
      triggerToggle();
    }

    // Always spring back to origin with elastic rebound physics
    animate(cordY, 0, {
      type: 'spring',
      stiffness: 600,
      damping: 14,
      mass: 0.8,
    });
  };

  const handleClick = () => {
    if (isDragging) return;
    triggerToggle();
    // Rebound pull animation on click: animate down then spring back up
    animate(cordY, 15, {
      type: 'spring',
      stiffness: 600,
      damping: 15,
      mass: 0.8,
      onComplete: () => {
        animate(cordY, 0, {
          type: 'spring',
          stiffness: 500,
          damping: 14,
          mass: 0.8,
        });
      },
    });
  };

  return (
    <div
      className="relative flex flex-col items-center select-none z-50 touch-none group"
      title={
        isDark
          ? 'Nắm kéo cọng dây xuống để Tắt đèn (Chuyển sang Giao diện Sáng)'
          : 'Nắm kéo cọng dây xuống để Bật đèn (Chuyển sang Giao diện Tối)'
      }
    >
      {/* Ceiling Mount Bracket */}
      <div className="w-3.5 h-1 rounded-full bg-neutral-400 dark:bg-neutral-600 shadow-2xs border border-neutral-300 dark:border-neutral-500" />

      {/* Gentle Pendulum Swinging Container (Đu đưa nhẹ nhàng khi nghỉ) */}
      <motion.div
        animate={isDragging ? { rotate: 0 } : { rotate: [-3.5, 3.5, -3.5] }}
        transition={
          isDragging
            ? { duration: 0.1 }
            : { repeat: Infinity, duration: 3.2, ease: 'easeInOut' }
        }
        style={{ transformOrigin: 'top center' }}
        className="flex flex-col items-center origin-top"
      >
        {/* Draggable Cord Assembly (Nắm kéo thả với lò xo đàn hồi nảy về 0) */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 30 }}
          dragElastic={0.2}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          style={{ y: cordY }}
          className="flex flex-col items-center origin-top cursor-grab active:cursor-grabbing px-2 py-0.5"
        >
          {/* Upper Metallic Beaded Chain (4 beads) */}
          <div className="flex flex-col items-center space-y-[2px] py-[2px]">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-[2.5px] h-[2.5px] rounded-full transition-colors ${
                  isDark
                    ? 'bg-amber-300 shadow-[0_0_3px_rgba(251,191,36,0.8)]'
                    : 'bg-neutral-600 dark:bg-neutral-400 shadow-2xs'
                }`}
              />
            ))}
          </div>

          {/* Vintage Connector Ring */}
          <div className="w-[4px] h-[4px] rounded-full border border-neutral-400 dark:border-neutral-500 bg-neutral-300 dark:bg-neutral-600 my-[1px]" />

          {/* Lower Metallic Beaded Chain (3 beads) */}
          <div className="flex flex-col items-center space-y-[2px] py-[2px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-[2.5px] h-[2.5px] rounded-full transition-colors ${
                  isDark
                    ? 'bg-amber-300 shadow-[0_0_3px_rgba(251,191,36,0.8)]'
                    : 'bg-neutral-600 dark:bg-neutral-400 shadow-2xs'
                }`}
              />
            ))}
          </div>

          {/* Teardrop Bell Pull Handle (Quả chuông giật đèn đẹp mắt, dễ nắm) */}
          <div
            className={`relative transition-all duration-200 mt-0.5 group-hover:scale-110 active:scale-95 ${
              isDark
                ? 'filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                : 'filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.3)]'
            }`}
          >
            <svg
              className={`w-3.5 h-4.5 transition-colors duration-200 ${
                isDark
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-neutral-800 fill-neutral-800 dark:text-neutral-200 dark:fill-neutral-200'
              }`}
              viewBox="0 0 24 30"
              fill="currentColor"
            >
              <rect x="9" y="1" width="6" height="3" rx="1.5" />
              <path d="M8 4 L16 4 L17 10 L7 10 Z" />
              <path d="M7 10 C7 10 4 15 4 19 C4 23.5 7.5 27 12 27 C16.5 27 20 23.5 20 19 C20 15 17 10 17 10 Z" />
              <circle cx="12" cy="28.5" r="1.5" />
            </svg>

            {/* Glowing Aura Ring in Dark Mode */}
            {isDark && (
              <span className="absolute -inset-1 rounded-full bg-amber-400/35 blur-[2px] animate-pulse pointer-events-none" />
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Floating Micro-Badge Tooltip */}
      <div className="absolute top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-neutral-900/90 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap z-50">
        {isDark ? 'Kéo để Tắt đèn (Sáng)' : 'Kéo để Bật đèn (Tối)'}
      </div>
    </div>
  );
}
