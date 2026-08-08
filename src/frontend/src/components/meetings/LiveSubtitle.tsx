'use client';

import React from 'react';
import type { TranslationStream } from '@/hooks/useTranslationSocket';

interface LiveSubtitleProps {
  streamData: TranslationStream | null;
  interimText: string;
}

export function LiveSubtitle({ streamData, interimText }: LiveSubtitleProps) {
  if (!streamData && !interimText) return null;

  return (
    <div className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4 pointer-events-none">
      <div className="bg-black/70 backdrop-blur-md text-white p-3 rounded-xl w-full text-center shadow-lg transition-all border border-white/10">
        <p className="text-xs text-gray-400 mb-0.5 font-medium italic">
          {interimText || streamData?.vi_text}
        </p>
        <p className="text-lg font-bold text-white leading-tight min-h-[1.5rem]">
          {interimText ? '...' : streamData?.en_text || '...'}
        </p>
      </div>
    </div>
  );
}
