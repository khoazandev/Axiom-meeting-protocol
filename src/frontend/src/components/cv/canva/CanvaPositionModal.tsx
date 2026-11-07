'use client';

import React from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUp,
  ArrowDown,
  Layers,
  Move,
  X,
} from 'lucide-react';

interface CanvaPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLabel?: string;
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onLayerChange?: (action: 'forward' | 'backward') => void;
}

export function CanvaPositionModal({
  isOpen,
  onClose,
  selectedLabel = 'Khối phần tử',
  onAlign,
  onLayerChange,
}: CanvaPositionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-6 z-50 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
          <Move className="w-3.5 h-3.5 text-indigo-600" />
          <span>Vị Trí & Căn Chỉnh ({selectedLabel})</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Align to Page Controls */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Căn lề trên trang (Align to Page)
        </label>
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onAlign?.('left')}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 font-semibold flex flex-col items-center gap-1 cursor-pointer transition-colors"
          >
            <AlignLeft className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px]">Căn Trái</span>
          </button>
          <button
            type="button"
            onClick={() => onAlign?.('center')}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 font-semibold flex flex-col items-center gap-1 cursor-pointer transition-colors"
          >
            <AlignCenter className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px]">Căn Giữa</span>
          </button>
          <button
            type="button"
            onClick={() => onAlign?.('right')}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 font-semibold flex flex-col items-center gap-1 cursor-pointer transition-colors"
          >
            <AlignRight className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px]">Căn Phải</span>
          </button>
        </div>
      </div>

      {/* Layer Order */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Thứ tự lớp (Layer Order)
        </label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => onLayerChange?.('forward')}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Lên trên</span>
          </button>
          <button
            type="button"
            onClick={() => onLayerChange?.('backward')}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Xuống dưới</span>
          </button>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 text-center font-mono">
        Kích thước tiêu chuẩn A4: 210mm × 297mm
      </div>
    </div>
  );
}
