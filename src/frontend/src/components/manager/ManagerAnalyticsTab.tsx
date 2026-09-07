"use client";

import React from "react";
import {
  BarChart3,
  Flame,
  CheckCircle2,
  Clock,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  HeartPulse,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface ManagerAnalyticsTabProps {
  onNotify: (msg: string) => void;
}

export function ManagerAnalyticsTab({ onNotify }: ManagerAnalyticsTabProps) {
  const handleExemptStandup = (memberName: string) => {
    onNotify(
      `Đã phê duyệt miễn họp Standup 3 ngày cho ${memberName} để giảm tải kiệt sức!`
    );
  };

  const handleConvertToAsync = (memberName: string) => {
    onNotify(
      `Đã chuyển chế độ họp của ${memberName} sang Báo Cáo Văn Bản Async!`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Sức Khỏe Kỷ Luật & Chống Kiệt Sức Họp
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck size={12} />
              MEETING HEALTH INDEX: 94/100
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi kỷ luật cuộc họp, tỷ lệ hoàn thành Action Items và bảo vệ nhân sự kỹ thuật khỏi tình trạng kiệt sức (Meeting Fatigue).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Khối Kỹ Thuật • Tuần 36/2026
          </span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Có Agenda Trước Họp
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            96.2%
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp size={12} />
            +4.1% so với tháng trước
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Bắt Đầu Đúng Giờ
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            91.5%
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
            <TrendingUp size={12} />
            Đúng tiêu chuẩn &lt; 3 phút trễ
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Thời Lượng Họp TB
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            34 phút
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
            Tiết kiệm 16 phút/cuộc họp
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Nghị Quyết Hoàn Thành
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            89.4%
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            88/98 Action Items xong đúng hạn
          </p>
        </div>
      </div>

      {/* Burnout Alert Warning Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
            <Flame size={20} />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Cảnh Báo Quá Tải Họp (Meeting Burnout Alert)
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                  1 NHÂN SỰ CẦN CAN THIỆP
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Theo tiêu chuẩn kỹ thuật Axiom DX-OS, kỹ sư dành quá 15 giờ/tuần vào các cuộc họp sẽ bị giảm 40% khả năng tập trung lập trình (Deep Work).
              </p>
            </div>

            {/* Overloaded Member Item */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                  alt="Alex Rivera"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Alex Rivera</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">
                      (17.5h họp tuần này - Vượt ngưỡng 2.5h)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Senior AI & Audio Engineer • Đang gánh 3 task AI gấp
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExemptStandup("Alex Rivera")}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                >
                  Miễn Họp Standup 3 Ngày
                </button>

                <button
                  type="button"
                  onClick={() => handleConvertToAsync("Alex Rivera")}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
                >
                  Chuyển Sang Async
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items Discipline Chart / Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white">
          Tiến Độ Giải Quyết Nghị Quyết Theo Sprint
        </h3>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Sprint 42 (Hiện tại)</span>
              <span className="font-bold text-blue-600">8/12 task (67%)</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full w-[67%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Sprint 41</span>
              <span className="font-bold text-emerald-600">14/14 task (100%)</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[100%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">Sprint 40</span>
              <span className="font-bold text-emerald-600">16/17 task (94%)</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[94%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
