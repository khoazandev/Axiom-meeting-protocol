'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/lib/store/useThemeStore';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none cursor-pointer"
      aria-label="Toggle theme"
      title={isDark ? 'Chuyển sang Giao diện Sáng (Light)' : 'Chuyển sang Giao diện Tối (Dark)'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 dark:text-neutral-300" />
      )}
    </button>
  );
}
