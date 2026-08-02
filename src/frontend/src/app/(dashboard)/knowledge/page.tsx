'use client';

import { BookOpen, Sparkles } from 'lucide-react';

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-blue-950/60 pb-5">
        <BookOpen className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Knowledge Hub RAG</h1>
      </div>

      <div className="p-12 rounded-3xl bg-[#131B2E] border border-blue-950/80 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-indigo-400 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-white">Global Vector Search & Document Hub</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Query indexed transcripts, meeting minutes (MoM), and uploaded PDF specifications using on-premise RAG.
        </p>
      </div>
    </div>
  );
}
