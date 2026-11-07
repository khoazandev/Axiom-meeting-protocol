'use client';

import React from 'react';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

export function FlagLanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div
      className="inline-flex items-center p-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs gap-1 select-none"
      role="group"
      aria-label="Chọn ngôn ngữ hệ thống"
    >
      {/* 🇻🇳 Vietnam Flag Button */}
      <button
        type="button"
        onClick={() => setLanguage('vi')}
        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
          language === 'vi'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white opacity-70 hover:opacity-100 border border-transparent'
        }`}
        title="Tiếng Việt (Việt Nam)"
      >
        {/* Quốc kỳ Việt Nam chuẩn tỷ lệ 2:3, tâm (15,10), R=6, 5 cánh đều, không bị cắt đáy */}
        <span className="w-[21px] h-[14px] rounded-[3px] overflow-hidden shadow-2xs border border-red-700/20 shrink-0 inline-flex items-center justify-center bg-[#DA251D]">
          <svg viewBox="0 0 30 20" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect width="30" height="20" fill="#DA251D" />
            <polygon
              points="15,4 16.347,8.146 20.706,8.146 17.18,10.708 18.527,14.854 15,12.292 11.473,14.854 12.82,10.708 9.294,8.146 13.653,8.146"
              fill="#FFFF00"
            />
          </svg>
        </span>
        <span className="font-extrabold text-[11px] tracking-tight">VIE</span>
      </button>

      {/* 🇬🇧 UK Flag Button */}
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
          language === 'en'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white opacity-70 hover:opacity-100 border border-transparent'
        }`}
        title="English (United Kingdom / International)"
      >
        {/* Crisp Union Jack UK Flag SVG (Tỷ lệ 3:2 cân đối hoàn hảo) */}
        <span className="w-[21px] h-[14px] rounded-[3px] overflow-hidden shadow-2xs border border-blue-900/20 shrink-0 inline-flex items-center justify-center bg-[#012169]">
          <svg viewBox="0 0 60 40" className="w-full h-full overflow-hidden" preserveAspectRatio="xMidYMid meet">
            {/* Blue Field */}
            <rect width="60" height="40" fill="#012169" />
            {/* White Diagonals */}
            <line x1="0" y1="0" x2="60" y2="40" stroke="#FFFFFF" strokeWidth="8" />
            <line x1="60" y1="0" x2="0" y2="40" stroke="#FFFFFF" strokeWidth="8" />
            {/* Red Diagonals */}
            <line x1="0" y1="0" x2="60" y2="40" stroke="#C8102E" strokeWidth="4" />
            <line x1="60" y1="0" x2="0" y2="40" stroke="#C8102E" strokeWidth="4" />
            {/* White Cross */}
            <rect x="25" width="10" height="40" fill="#FFFFFF" />
            <rect y="15" width="60" height="10" fill="#FFFFFF" />
            {/* Red Cross */}
            <rect x="27" width="6" height="40" fill="#C8102E" />
            <rect y="17" width="60" height="6" fill="#C8102E" />
          </svg>
        </span>
        <span className="font-extrabold text-[11px] tracking-tight">ENG</span>
      </button>
    </div>
  );
}
