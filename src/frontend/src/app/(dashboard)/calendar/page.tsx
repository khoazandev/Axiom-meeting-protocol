'use client';

import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';

export default function CalendarPage() {
  const { t } = useLanguageStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border pb-5">
        <CalendarIcon className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-semibold text-text-primary">{t.calendar.title}</h1>
      </div>

      <div className="p-12 rounded-xl bg-bg-card border border-border text-center space-y-3">
        <Sparkles className="w-8 h-8 text-accent mx-auto animate-pulse" />
        <h3 className="text-sm font-semibold text-text-primary">{t.calendar.noEvents}</h3>
        <p className="text-sm text-text-secondary max-w-sm mx-auto">{t.calendar.subTitle}</p>
      </div>
    </div>
  );
}
