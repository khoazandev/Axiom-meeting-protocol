'use client';

import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-blue-950/60 pb-5">
        <CalendarIcon className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Calendar Intelligence</h1>
      </div>

      <div className="p-12 rounded-3xl bg-[#131B2E] border border-blue-950/80 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-blue-400 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-white">Smart Calendar Grid Coming Soon</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Synchronize organizational meetings, agenda gate slots, and automated AI reminders across your team.
        </p>
      </div>
    </div>
  );
}
