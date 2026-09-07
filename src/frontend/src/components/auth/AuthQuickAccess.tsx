"use client";

import React from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface AuthQuickAccessProps {
  onSelect: (email: string, pass: string) => void;
}

export default function AuthQuickAccess({ onSelect }: AuthQuickAccessProps) {
  return (
    <div className="pt-3 pb-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <MaterialIcon name="bolt" className="w-3 h-3 text-amber-500" />
          <span>Tài khoản Demo (1-Click Fill)</span>
        </span>
        <span className="text-[10px] text-slate-400">Dành cho Chấm thi</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Slot 1: Chủ Tịch (OWNER) */}
        <button
          type="button"
          onClick={() => onSelect("admin@axiom.com", "password123")}
          className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-left transition-all group cursor-pointer"
        >
          <div>
            <div className="text-[11.5px] font-bold text-slate-800 group-hover:text-amber-700">
              👑 Chủ Tịch (OWNER)
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              admin@axiom.com
            </div>
          </div>
          <MaterialIcon
            name="arrow_forward"
            className="w-3 h-3 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0"
          />
        </button>

        {/* Slot 2: Trưởng Phòng (MANAGER) */}
        <button
          type="button"
          onClick={() => onSelect("manager.khoa@axiom.com", "password123")}
          className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left transition-all group cursor-pointer"
        >
          <div>
            <div className="text-[11.5px] font-bold text-slate-800 group-hover:text-blue-700">
              👔 Trưởng Phòng (MANAGER)
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              manager.khoa@axiom.com
            </div>
          </div>
          <MaterialIcon
            name="arrow_forward"
            className="w-3 h-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0"
          />
        </button>

        {/* Slot 3: Thành Viên (MEMBER) */}
        <button
          type="button"
          onClick={() => onSelect("alex@axiom.com", "password123")}
          className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition-all group cursor-pointer"
        >
          <div>
            <div className="text-[11.5px] font-bold text-slate-800 group-hover:text-emerald-700">
              👤 Thành Viên (MEMBER)
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              alex@axiom.com
            </div>
          </div>
          <MaterialIcon
            name="arrow_forward"
            className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0"
          />
        </button>
      </div>
    </div>
  );
}
