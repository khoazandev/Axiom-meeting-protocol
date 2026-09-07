"use client";

import React, { useState } from "react";
import { MatIcon } from "@/components/ui/MatIcon";
import { AxiomSelect } from "@/components/ui/AxiomSelect";
import { ProtocolPolicySettings } from "@/lib/mockAdminData";

interface ProtocolPoliciesTabProps {
  initialPolicies: ProtocolPolicySettings;
  onSavePolicies: (updated: ProtocolPolicySettings) => void;
}

export function ProtocolPoliciesTab({
  initialPolicies,
  onSavePolicies,
}: ProtocolPoliciesTabProps) {
  const [policies, setPolicies] =
    useState<ProtocolPolicySettings>(initialPolicies);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePolicies(policies);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form
      onSubmit={handleSave}
      className="space-y-6 animate-in fade-in duration-200"
    >
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MatIcon
                name="gavel"
                filled
                className="text-amber-500 text-[20px]"
              />
              <span>Kỷ Luật Cuộc Họp & Cổng Kiểm Soát (Protocol Gates)</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[11px] font-bold border border-amber-300/50">
              Chính sách DX-OS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Thiết lập các tiêu chuẩn tự động hóa ngăn ngừa họp lan man, không mục tiêu và bắt buộc thực thi công việc.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <MatIcon name="check" className="text-[18px]" />
          <span>Lưu Thay Đổi Chính Sách</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <MatIcon
            name="check_circle"
            filled
            className="text-emerald-600 text-[20px]"
          />
          <span>
            Đã lưu và áp dụng toàn bộ chính sách kỷ luật cuộc họp vào hệ thống thành công!
          </span>
        </div>
      )}

      {/* Policies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Policy 1: Agenda Gate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MatIcon name="gavel" filled className="text-[20px]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cổng Chương Trình Nghị Sự (Agenda Gate)
                  </h3>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    Kỷ luật cốt lõi của Axiom DX-OS
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.enforceAgendaGate}
                  onChange={(e) =>
                    setPolicies({
                      ...policies,
                      enforceAgendaGate: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Bắt buộc người tạo cuộc họp phải nhập bản Agenda cụ thể trước khi được phép mở phòng. Chặn triệt để tình trạng mở họp vô định hướng.
            </p>

            {policies.enforceAgendaGate && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Độ dài tối thiểu của Agenda:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={policies.minAgendaLength}
                    onChange={(e) =>
                      setPolicies({
                        ...policies,
                        minAgendaLength: Number(e.target.value),
                      })
                    }
                    className="w-18 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 text-center"
                  />
                  <span className="text-xs text-slate-400">ký tự</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Policy 2: Auto-MoM AI Pipeline */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-all">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <MatIcon name="smart_toy" filled className="text-[20px]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tự Động Trích Xuất Biên Bản (Auto-MoM)
                  </h3>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                    Mô hình AI Whisper + Qwen On-Premise
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.autoExtractMom}
                  onChange={(e) =>
                    setPolicies({
                      ...policies,
                      autoExtractMom: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
              </label>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Khi chủ tọa bấm kết thúc cuộc họp, AI sẽ tự động phân tích bản ghi âm STT để tổng hợp các mục tiêu đã thảo luận, quyết định chính thức và rủi ro.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Độ trễ xử lý trung bình:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                ~15 giây sau khi đóng phòng
              </strong>
            </div>
          </div>
        </div>

        {/* Policy 3: Bắt buộc Gán Người Nhận Task */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MatIcon name="fact_check" filled className="text-[20px]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bắt Buộc Gán Người Chịu Trách Nhiệm Task
                  </h3>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    1-Click Jira / Kanban Synchronization
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.requireTaskAssignee}
                  onChange={(e) =>
                    setPolicies({
                      ...policies,
                      requireTaskAssignee: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Không cho phép lưu các Action Items vô danh. Mọi công việc sau họp bắt buộc phải gắn với ít nhất một người phụ trách cụ thể và hạn hoàn thành.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Đồng bộ tự động sang:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                Sprint Backlog nội bộ
              </strong>
            </div>
          </div>
        </div>

        {/* Policy 4: Thời hạn lưu trữ Video/Audio (Retention) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between hover:border-amber-300 dark:hover:border-amber-700 transition-all">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <MatIcon name="timer" filled className="text-[20px]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thời Hạn Lưu Trữ File Ghi Âm (Retention)
                  </h3>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    Tối ưu dung lượng máy chủ On-Premise
                  </span>
                </div>
              </div>

              <AxiomSelect<number>
                value={policies.recordingStorageRetentionDays}
                onChange={(val) =>
                  setPolicies({
                    ...policies,
                    recordingStorageRetentionDays: val,
                  })
                }
                options={[
                  { value: 30, label: "30 ngày" },
                  { value: 90, label: "90 ngày", badge: "Khuyến nghị", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
                  { value: 180, label: "180 ngày" },
                  { value: 365, label: "1 năm (365 ngày)" },
                  { value: 0, label: "Lưu trữ vĩnh viễn" },
                ]}
                minWidth="180px"
                variant="connected"
                size="md"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Tự động giải phóng dung lượng đĩa cứng lưu trữ video sau thời hạn quy định, chỉ giữ lại bản text tóm tắt MoM và danh sách task.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Định dạng mã hóa tệp:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                MP4 / Opus 256-bit AES
              </strong>
            </div>
          </div>
        </div>

        {/* Policy 5: Khách Mời Bên Ngoài (Guest Access) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <MatIcon name="groups" filled className="text-[20px]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cho Phép Khách Mời Ngoài Tổ Chức
                  </h3>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    Cần sự chấp thuận của Host
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.allowGuestJoining}
                  onChange={(e) =>
                    setPolicies({
                      ...policies,
                      allowGuestJoining: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Cho phép gửi link tham gia cuộc họp cho đối tác bên ngoài mà không cần họ phải đăng ký tài khoản nhân viên tổ chức.
            </p>
          </div>
        </div>

        {/* Policy 6: Ưu Tiên Ngôn Ngữ Phiên Âm STT */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between hover:border-cyan-300 dark:hover:border-cyan-700 transition-all">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <MatIcon name="translate" filled className="text-[20px]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ngôn Ngữ Phiên Âm STT Mặc Định
                  </h3>
                  <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                    Tối ưu độ chính xác Whisper
                  </span>
                </div>
              </div>

              <AxiomSelect<string>
                value={policies.sttLanguagePriority}
                onChange={(val) =>
                  setPolicies({
                    ...policies,
                    sttLanguagePriority: val as "vi" | "en" | "multilingual",
                  })
                }
                options={[
                  { value: "vi", label: "Tiếng Việt (Ưu tiên)", badge: "Chuẩn", badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
                  { value: "en", label: "English" },
                  { value: "multilingual", label: "Song ngữ Việt - Anh" },
                ]}
                minWidth="190px"
                variant="connected"
                size="md"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Hệ thống sẽ nạp model tương ứng vào GPU/CPU của máy chủ nội bộ để đạt độ trễ thấp nhất (&lt; 200ms).
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
