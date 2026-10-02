'use client';

import React, { useState, useEffect } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';

interface ProtocolPoliciesTabProps {
  onNotify?: (msg: string) => void;
}

interface GovernancePolicy {
  id: string;
  name: string;
  category: 'GATE' | 'AI' | 'SECURITY' | 'COMPLIANCE';
  icon: string;
  description: string;
  ruleDetail: string;
  enabled: boolean;
  impactLevel: 'CAO' | 'TRUNG BÌNH' | 'BẢO MẬT';
}

const DEFAULT_POLICIES: GovernancePolicy[] = [
  {
    id: 'agenda_gate',
    name: 'Agenda Gatekeeper (Cổng Kiểm Duyệt Chương Trình)',
    category: 'GATE',
    icon: 'gavel',
    description: 'Bắt buộc cuộc họp phải có chương trình nghị sự tối thiểu 10 ký tự rõ ràng trước khi cho phép bắt đầu.',
    ruleDetail: 'Khóa nút "Bắt đầu cuộc họp" và cảnh báo Host nếu chưa nhập nội dung thảo luận.',
    enabled: true,
    impactLevel: 'CAO',
  },
  {
    id: 'auto_mom',
    name: 'Auto AI MoM & Task Extraction (Trích Xuất Biên Bản Tự Động)',
    category: 'AI',
    icon: 'auto_awesome',
    description: 'Sau khi phòng họp kết thúc, AI Ollama/Qwen tự động tổng hợp biên bản và trích xuất Action Items.',
    ruleDetail: 'Tự động tạo thẻ nhiệm vụ và gửi thông báo hành động đến người được giao việc.',
    enabled: true,
    impactLevel: 'CAO',
  },
  {
    id: 'punctuality_guard',
    name: 'Punctuality Enforcement (Kiểm Soát Giờ Giấc Đại Biểu)',
    category: 'COMPLIANCE',
    icon: 'schedule',
    description: 'Ghi nhận và đánh dấu các đại biểu tham gia trễ quá 15 phút sau khi cuộc họp đã bắt đầu.',
    ruleDetail: 'Hạ điểm chuyên cần và gửi thông báo cảnh báo chuyên cần tới Trưởng phòng ban.',
    enabled: true,
    impactLevel: 'TRUNG BÌNH',
  },
  {
    id: 'preflight_check',
    name: 'Pre-Flight Hardware Check (Kiểm Tra Thiết Bị Đầu Vào)',
    category: 'GATE',
    icon: 'mic_external_on',
    description: 'Bắt buộc thành viên kiểm tra micro, camera và chất lượng kết nối WebRTC trước khi bước vào phòng họp.',
    ruleDetail: 'Ngăn ngừa lỗi gián đoạn âm thanh hoặc mất tín hiệu trong các cuộc họp trọng thể.',
    enabled: true,
    impactLevel: 'TRUNG BÌNH',
  },
  {
    id: 'tamper_proof_audit',
    name: 'Tamper-Proof Audit Trail (Kiểm Toán Bất Biến SHA-256)',
    category: 'SECURITY',
    icon: 'verified_user',
    description: 'Băm mã hóa SHA-256 toàn bộ biên bản cuộc họp và nhật ký hành động để ngăn chặn sửa đổi trái phép.',
    ruleDetail: 'Đảm bảo tính pháp lý và độ tin cậy tuyệt đối cho các cuộc họp biểu quyết của Ban điều hành.',
    enabled: true,
    impactLevel: 'BẢO MẬT',
  },
  {
    id: 'incident_auto_report',
    name: 'Automated Incident Alert (Báo Cáo Vi Phạm Kỷ Luật Tự Động)',
    category: 'COMPLIANCE',
    icon: 'notifications_active',
    description: 'Tự động phát hành báo cáo gửi tới Chủ tịch và Trưởng bộ phận khi có cuộc họp kéo dài quá 120 phút không nghỉ.',
    ruleDetail: 'Cảnh báo quá tải nhân lực và ngăn ngừa văn hóa họp tràn lan trong doanh nghiệp.',
    enabled: false,
    impactLevel: 'TRUNG BÌNH',
  },
];

export function ProtocolPoliciesTab({ onNotify }: ProtocolPoliciesTabProps) {
  const [policies, setPolicies] = useState<GovernancePolicy[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('axiom_governance_policies');
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_POLICIES;
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (policyId: string) => {
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.id === policyId) {
          const nextState = !p.enabled;
          onNotify?.(
            `Đã ${nextState ? 'BẬT' : 'TẮT'} cổng kiểm soát: ${p.name.split('(')[0].trim()}`
          );
          return { ...p, enabled: nextState };
        }
        return p;
      })
    );
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('axiom_governance_policies', JSON.stringify(policies));
      }
      setTimeout(() => {
        setIsSaving(false);
        onNotify?.('✅ Đã lưu cấu hình Cổng Kiểm Soát DX-OS vào hệ thống thành công!');
      }, 350);
    } catch {
      setIsSaving(false);
      onNotify?.('Lỗi khi lưu cấu hình cổng kiểm soát.');
    }
  };

  const enabledCount = policies.filter((p) => p.enabled).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── 1. Top Executive Banner ── */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <MatIcon name="gavel" filled className="text-[20px]" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Cổng Kiểm Soát & Kỷ Luật Họp (Governance Gates)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Đang bảo vệ: {enabledCount}/{policies.length} chính sách
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Kiểm soát chặt chẽ chuẩn mực họp doanh nghiệp: Bắt buộc Agenda Gate, tự động hóa MoM AI, chống họp tràn lan và bảo đảm an toàn dữ liệu chủ quyền.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="shrink-0 w-44 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          title="Lưu các thiết lập bật/tắt chính sách kiểm soát"
        >
          <MatIcon name={isSaving ? 'refresh' : 'save'} className={`text-[16px] ${isSaving ? 'animate-spin' : ''}`} />
          <span className="truncate">{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
        </button>
      </div>

      {/* ── 2. Governance Telemetry Bento Grid (Macro Metrics) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tuân thủ Kỷ luật</span>
            <MatIcon name="verified" size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">98.4%</div>
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            +2.1% so với tháng trước
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Đúng Giờ Agenda</span>
            <MatIcon name="timer" size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">94.2%</div>
          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            128 / 136 cuộc họp đúng giờ
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Giờ Tiết Kiệm Bởi AI</span>
            <MatIcon name="smart_toy" size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">48.5h</div>
          <div className="text-[10px] font-bold text-slate-500 mt-0.5">
            Tự động trích xuất MoM
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Chặn Họp Lan Man</span>
            <MatIcon name="block" size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">14 lần</div>
          <div className="text-[10px] font-bold text-slate-500 mt-0.5">
            Yêu cầu bổ sung mục tiêu
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Governance Toggles (Switch Grid) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MatIcon name="toggle_on" size={20} className="text-blue-600" />
              Thiết Lập Bật / Tắt Các Cổng Kiểm Soát
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Bấm vào công tắc để bật hoặc tắt các quy tắc kỷ luật cho toàn bộ tổ chức theo thời gian thực.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Click vào nút gạt để kích hoạt
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((p) => {
            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  p.enabled
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-blue-200/80 dark:border-blue-900/60 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          p.enabled
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        <MatIcon name={p.icon} size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-md ${
                              p.enabled
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {p.enabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Mức độ: {p.impactLevel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Smooth Interactive iOS/Linear Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(p.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        p.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={p.enabled}
                      title={p.enabled ? 'Nhấp để tắt chính sách này' : 'Nhấp để bật chính sách này'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          p.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5">
                  <MatIcon name="info" size={14} className="text-blue-500 shrink-0" />
                  <span className="truncate">{p.ruleDetail}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Department Compliance Breakdown Table ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MatIcon name="insights" size={18} className="text-emerald-600" />
              Báo Cáo Thống Kê & Tỷ Lệ Tuân Thủ Theo Phòng Ban
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Số liệu giám sát mức độ kỷ luật chương trình họp và chấp hành quy chuẩn DX-OS.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            Dữ liệu thời gian thực
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Bộ Phận</th>
                <th className="py-2.5 px-3 text-center">Tổng Cuộc Họp</th>
                <th className="py-2.5 px-3 text-center">Đúng Giờ</th>
                <th className="py-2.5 px-3 text-center">Agenda Gate</th>
                <th className="py-2.5 px-3 text-center">Tỷ Lệ Tuân Thủ</th>
                <th className="py-2.5 px-3 text-right">Đánh Giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              <tr>
                <td className="py-3 px-3 font-bold flex items-center gap-2">
                  <MatIcon name="groups" size={16} className="text-blue-500" />
                  <span>Bộ Phận Nhân Sự & Tuyển Dụng</span>
                </td>
                <td className="py-3 px-3 text-center">42</td>
                <td className="py-3 px-3 text-center">41</td>
                <td className="py-3 px-3 text-center text-emerald-600 font-bold">100%</td>
                <td className="py-3 px-3 text-center">
                  <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 mx-auto overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '98%' }} />
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                    Xuất sắc
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold flex items-center gap-2">
                  <MatIcon name="computer" size={16} className="text-indigo-500" />
                  <span>Bộ Phận Kỹ Thuật & Công Nghệ</span>
                </td>
                <td className="py-3 px-3 text-center">56</td>
                <td className="py-3 px-3 text-center">53</td>
                <td className="py-3 px-3 text-center text-emerald-600 font-bold">96.4%</td>
                <td className="py-3 px-3 text-center">
                  <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 mx-auto overflow-hidden">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '95%' }} />
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold">
                    Tiêu chuẩn
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold flex items-center gap-2">
                  <MatIcon name="corporate_fare" size={16} className="text-purple-500" />
                  <span>Ban Điều Hành Cấp Cao</span>
                </td>
                <td className="py-3 px-3 text-center">18</td>
                <td className="py-3 px-3 text-center">18</td>
                <td className="py-3 px-3 text-center text-emerald-600 font-bold">100%</td>
                <td className="py-3 px-3 text-center">
                  <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 mx-auto overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }} />
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                    Tuyệt đối
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
