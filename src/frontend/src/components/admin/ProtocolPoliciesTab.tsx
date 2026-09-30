'use client';

import React from 'react';
import { MatIcon } from '@/components/ui/MatIcon';

interface ProtocolPoliciesTabProps {
  onNotify?: (msg: string) => void;
}

export function ProtocolPoliciesTab(_props: ProtocolPoliciesTabProps = {}) {
  void _props;
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MatIcon name="gavel" filled className="text-amber-500 text-[20px]" />
              <span>Kỷ Luật Cuộc Họp & Cổng Kiểm Soát (Protocol Gates)</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[11px] font-bold border border-amber-300/50">
              Chính sách DX-OS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Thiết lập các tiêu chuẩn tự động hóa ngăn ngừa họp lan man, không mục tiêu và bắt buộc
            thực thi công việc.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Chính sách máy chủ hiện chưa hỗ trợ tùy biến trực tiếp"
          className="shrink-0 w-44 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75"
        >
          <MatIcon name="lock" className="text-[16px]" />
          <span className="truncate">Lưu Thay Đổi</span>
        </button>
      </div>

      {/* Configuration Unavailable Notice Panel */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <MatIcon name="info" className="text-[20px]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cấu hình chính sách tùy biến hiện chưa kết nối cơ sở dữ liệu
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
              Hệ thống hiện đang áp dụng bộ quy tắc kỷ luật mặc định ở cấp giao thức server (Agenda Gate bắt buộc, Auto MoM trích xuất tự động qua Whisper/Ollama, phân bổ Action Items vào Mini Jira). Khả năng tùy biến linh hoạt các ngưỡng kiểm soát theo từng tổ chức sẽ được kích hoạt khi server API hoàn tất endpoint lưu trữ chính sách.
            </p>
          </div>
        </div>

        {/* Current Active Baseline Policies (Read-only status) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Agenda Gatekeeper</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">BẬT (Mặc định)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bắt buộc có chương trình họp tối thiểu 10 ký tự trước khi bắt đầu.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Auto MoM & Task</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">BẬT (Mặc định)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tự động phân rã nghị quyết và tạo nhiệm vụ khi kết thúc phòng họp.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Bảo mật RBAC</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">CHẶT CHẼ</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Kiểm tra quyền hạn thành viên trực tiếp từ quan hệ phân quyền tổ chức.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
