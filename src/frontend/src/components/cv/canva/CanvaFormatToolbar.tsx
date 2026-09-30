'use client';

import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Sparkles,
  Palette,
  Minus,
  Plus,
  Type,
  List,
} from 'lucide-react';

interface CanvaFormatToolbarProps {
  selectedElementLabel?: string | null;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  isBold: boolean;
  onToggleBold: () => void;
  isItalic: boolean;
  onToggleItalic: () => void;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  onTextAlignChange: (align: 'left' | 'center' | 'right' | 'justify') => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
  onMagicWrite: () => void;
}

const FONTS = [
  { label: 'Canva Sans (Inter)', value: 'font-sans' },
  { label: 'Harvard Serif (Merriweather)', value: 'font-serif' },
  { label: 'Developer Code (Monospace)', value: 'font-mono' },
];

const PRESET_COLORS = [
  '#0f172a', // Slate 900
  '#1e293b', // Slate 800
  '#1e3a8a', // Navy Blue
  '#4338ca', // Indigo
  '#065f46', // Emerald
  '#991b1b', // Red / Crimson
  '#854d0e', // Amber
  '#701a75', // Purple
];

export function CanvaFormatToolbar({
  selectedElementLabel,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  isBold,
  onToggleBold,
  isItalic,
  onToggleItalic,
  textAlign,
  onTextAlignChange,
  textColor,
  onTextColorChange,
  onMagicWrite,
}: CanvaFormatToolbarProps) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs select-none">
      {/* Left Formatting Group */}
      <div className="flex items-center flex-wrap gap-1.5">
        {/* Active element indicator */}
        <div className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase border border-indigo-200/50 max-w-[130px] truncate" title={selectedElementLabel || 'Toàn bộ trang'}>
          {selectedElementLabel || 'Trang A4'}
        </div>

        {/* Font Family Selector */}
        <select
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
          className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Font Size Stepper */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden h-8">
          <button
            type="button"
            onClick={() => onFontSizeChange(Math.max(8, fontSize - 1))}
            className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Giảm cỡ chữ"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-8 text-center font-bold text-slate-800 dark:text-slate-200 text-xs">
            {fontSize}
          </span>
          <button
            type="button"
            onClick={() => onFontSizeChange(Math.min(36, fontSize + 1))}
            className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Tăng cỡ chữ"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Color Palette Popover Dropdown */}
        <div className="flex items-center gap-1 pl-1">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onTextColorChange(c)}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                  textColor === c ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110 opacity-80 hover:opacity-100'
                }`}
                title={`Màu chữ ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Bold Button */}
        <button
          type="button"
          onClick={onToggleBold}
          className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
            isBold
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
          title="Chữ Đậm (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* Italic Button */}
        <button
          type="button"
          onClick={onToggleItalic}
          className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
            isItalic
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
          title="Chữ Nghiêng (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Text Alignment */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => onTextAlignChange('left')}
            className={`p-1.5 rounded-md cursor-pointer ${
              textAlign === 'left' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600' : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Căn Trái"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onTextAlignChange('center')}
            className={`p-1.5 rounded-md cursor-pointer ${
              textAlign === 'center' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600' : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Căn Giữa"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onTextAlignChange('right')}
            className={`p-1.5 rounded-md cursor-pointer ${
              textAlign === 'right' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600' : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Căn Phải"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Canva Magic Write Group */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMagicWrite}
          className="h-8 px-3 rounded-xl bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] hover:opacity-95 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98"
          title="Canva Magic Write: Dùng AI viết lại câu từ chuyên nghiệp, chuẩn STAR và ATS"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-200" />
          <span>Canva Magic Write™</span>
        </button>
      </div>
    </div>
  );
}
