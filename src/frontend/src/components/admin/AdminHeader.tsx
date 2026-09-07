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
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-xs p-5 md:p-6 mb-6">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-gradient-to-tr from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left Side: Title, Organization Badge & Status */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-[11.5px] font-bold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Axiom Enterprise • DX-OS Console</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-semibold">
              <MaterialIcon name="verified" className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% On-Premise Sovereign</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-[11px] font-bold">
              <span>BAN LÃNH ĐẠO TẬP ĐOÀN</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Trung Tâm Chỉ Huy & Quản Trị Số</span>
              <MaterialIcon name="auto_awesome" className="w-5 h-5 text-blue-500" />
            </h1>
            <p className="text-[13px] text-slate-500 font-medium max-w-2xl mt-0.5">
              Điều hành kỷ luật cuộc họp, cơ cấu phòng ban, giám sát radar thời gian thực và kiểm
              toán an ninh thông tin chuẩn On-Premise.
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onExportReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[12.5px] font-semibold transition-all hover:border-slate-300 cursor-pointer shadow-2xs"
          >
            <MaterialIcon name="description" className="w-4 h-4 text-slate-500" />
            <span>Xuất Báo Cáo DX-OS</span>
          </button>

          <button
            type="button"
            onClick={onOpenInviteModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-700 text-[12.5px] font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <MaterialIcon name="person" className="w-4 h-4 text-blue-600" />
            <span>Mời Thành Viên</span>
          </button>

          <Link
            href="/meetings/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-[12.5px] font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer group"
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
