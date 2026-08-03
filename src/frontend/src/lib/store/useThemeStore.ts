import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme: Theme) => {
        if (typeof window === 'undefined') return;

        const root = document.documentElement;
        if (theme === 'light') {
          root.classList.remove('dark');
        } else if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          // system preference
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }

        localStorage.setItem('axiom_theme', theme);
        set({ theme });
      },
    }),
    {
      name: 'axiom_theme',
      onRehydrateStorage: () => () => {
        // Don't re-apply class on rehydrate — anti-FOUC inline script already handles it
      },
    }
  )
);
