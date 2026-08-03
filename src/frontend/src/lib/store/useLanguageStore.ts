import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language, translations } from '../i18n/translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['en'];
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'vi',
      t: translations['vi'],
      setLanguage: (lang: Language) => {
        set({
          language: lang,
          t: translations[lang] || translations['en'],
        });
      },
    }),
    {
      name: 'axiom-language-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = translations[state.language] || translations['vi'];
        }
      },
    }
  )
);
