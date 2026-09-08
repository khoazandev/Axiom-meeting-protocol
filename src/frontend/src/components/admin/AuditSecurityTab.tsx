'use client';

import React, { useState } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import { SecurityAuditEntry } from '@/lib/mockAdminData';

interface AuditSecurityTabProps {
  logs: SecurityAuditEntry[];
}

export function AuditSecurityTab({ logs }: AuditSecurityTabProps) {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'ALL' || log.category === filterCategory;
    const matchSeverity = filterSeverity === 'ALL' || log.severity === filterSeverity;
    return matchSearch && matchCategory && matchSeverity;
  });

  const handleExportCsv = () => {
    const header = 'ID,Timestamp,Category,Severity,User,Email,IP,Action,Details\n';
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.category}","${l.severity}","${l.userName}","${l.userEmail}","${l.ipAddress}","${l.action}","${l.details.replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `axiom-security-audit-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (severity: 'INFO' | 'WARN' | 'CRITICAL') => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300/80 dark:border-rose-700 font-extrabold';
      case 'WARN':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300/80 dark:border-amber-700 font-bold';
      case 'INFO':
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MatIcon
                name="security"
                filled
                className="text-rose-600 dark:text-rose-400 text-[20px]"
              />
              <span>Nhật Ký Kiểm Toán & Giám Sát An Ninh (Audit Trail)</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300/50">
              Tamper-evident
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ghi nhận toàn bộ thao tác phân quyền, thay đổi cấu hình kỷ luật và truy xuất dữ liệu
            theo chuẩn ISO/IEC 27001.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <MatIcon name="download" className="text-[16px]" />
          <span>Tải Báo Cáo CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo hành động, email, IP hoặc chi tiết..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
          />
          <MatIcon
            name="search"
            className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter with locked width */}
          <AxiomSelect
            value={filterCategory}
            onChange={setFilterCategory}
            options={[
              { value: 'ALL', label: 'Tất cả Phân loại', icon: 'category' },
              { value: 'RBAC', label: 'RBAC & Phân quyền', icon: 'shield_person' },
              { value: 'POLICY', label: 'Chính sách & Kỷ luật', icon: 'gavel' },
              { value: 'MEETING', label: 'Họp & Phòng họp', icon: 'video_camera_front' },
              { value: 'DATA', label: 'Xuất & Tải Dữ liệu', icon: 'download' },
            ]}
            width="175px"
            variant="connected"
            size="md"
          />

          {/* Severity Filter with locked width */}
          <AxiomSelect
            value={filterSeverity}
            onChange={setFilterSeverity}
            options={[
              { value: 'ALL', label: 'Tất cả Mức độ', icon: 'filter_list' },
              {
                value: 'CRITICAL',
                label: 'CRITICAL',
                description: 'Nghiêm trọng',
                badge: 'Cấp 1',
                badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
              },
              {
                value: 'WARN',
                label: 'WARN',
                description: 'Cảnh báo',
                badge: 'Cấp 2',
                badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
              },
              {
                value: 'INFO',
                label: 'INFO',
                description: 'Thông tin',
                badge: 'Cấp 3',
                badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
              },
            ]}
            width="150px"
            variant="connected"
            size="md"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Thời Gian (ICT)</th>
                <th className="py-3 px-4">Mức Độ</th>
                <th className="py-3 px-4">Người Thực Hiện</th>
                <th className="py-3 px-4">Hành Động</th>
                <th className="py-3 px-4">Chi Tiết Sự Kiện</th>
                <th className="py-3 px-4">Địa Chỉ IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap text-[11px]">
                    {log.timestamp}
                  </td>

                  {/* Severity */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getSeverityBadge(
                        log.severity
                      )}`}
                    >
                      {log.severity}
                    </span>
                  </td>

                  {/* User */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-sans">
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {log.userName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {log.userEmail}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-sans">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </span>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase font-mono mt-0.5">
                      [{log.category}]
                    </div>
                  </td>

                  {/* Details */}
                  <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate">
                    {log.details}
                  </td>

                  {/* IP Address */}
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            Không có sự kiện kiểm toán nào khớp với bộ lọc tìm kiếm.
          </div>
        )}
      </div>
    </div>
  );
}
