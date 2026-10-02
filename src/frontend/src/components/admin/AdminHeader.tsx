'use client';

import React from 'react';
import Link from 'next/link';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface AdminHeaderProps {
  onOpenInviteModal: () => void;
  onExportReport: () => void;
}

export function AdminHeader({ onOpenInviteModal, onExportReport }: AdminHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 md:p-6 mb-6">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-gradient-to-tr from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left Side: Title, Organization Badge & Status */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11.5px] font-bold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
              <span>Axiom Enterprise • DX-OS Console</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
              <MaterialIcon name="verified" className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>100% On-Premise Sovereign</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 text-[11px] font-bold">
              <span>BAN LÃNH ĐẠO TẬP ĐOÀN</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Trung Tâm Chỉ Huy & Quản Trị Số</span>
              <MaterialIcon name="auto_awesome" className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium max-w-2xl mt-0.5">
              Điều hành kỷ luật cuộc họp, cơ cấu phòng ban, giám sát điều hành thời gian thực và
              kiểm toán an ninh thông tin chuẩn On-Premise.
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onExportReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[12.5px] font-semibold transition-all hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer shadow-2xs"
          >
            <MaterialIcon name="description" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Xuất Báo Cáo DX-OS</span>
          </button>

          <button
            type="button"
            onClick={onOpenInviteModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[12.5px] font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <MaterialIcon name="person" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Mời Thành Viên</span>
          </button>

          <Link
            href="/meetings/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white text-[12.5px] font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer group"
          >
            <MaterialIcon
              name="bolt"
              className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform"
            />
            <span>Tạo Họp Lãnh Đạo</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
