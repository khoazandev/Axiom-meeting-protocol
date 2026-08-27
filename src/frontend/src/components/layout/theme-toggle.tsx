'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none"
      aria-label="Toggle theme"
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
    </button>
  );
}
