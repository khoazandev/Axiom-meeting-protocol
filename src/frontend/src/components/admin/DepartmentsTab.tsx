"use client";

import React, { useState } from "react";
import { MatIcon } from "@/components/ui/MatIcon";
import { DepartmentNode } from "@/lib/mockAdminData";
import {
  MOCK_DEPARTMENTS_CAPACITY,
  MOCK_EXECUTIVE_MANDATES,
  INITIAL_ENG_MEMBERS,
  DepartmentCapacityMetric,
  ExecutiveMandate,
  MemberCapacityWorkload,
} from "@/lib/workloadProtocolData";

interface DepartmentsTabProps {
  departments: DepartmentNode[];
  onAddDepartment: (
    newDept: Omit<DepartmentNode, "id" | "memberCount" | "activeMeetingsCount">
  ) => void;
  onNotify?: (msg: string) => void;
}

export function DepartmentsTab({
  departments,
  onAddDepartment,
  onNotify,
}: DepartmentsTabProps) {
  // Capacity States
  const [deptList, setDeptList] = useState<DepartmentCapacityMetric[]>(
    MOCK_DEPARTMENTS_CAPACITY
  );
  const [mandates, setMandates] = useState<ExecutiveMandate[]>(
    MOCK_EXECUTIVE_MANDATES
  );
  const [capacityFilter, setCapacityFilter] = useState<
    "ALL" | "OVERLOADED_OR_FULL" | "OPTIMAL" | "AVAILABLE"
  >("ALL");

  // Drawer / Modal States
  const [selectedDeptForDetail, setSelectedDeptForDetail] =
    useState<DepartmentCapacityMetric | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for adding department
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");

  const triggerNotify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  // Filtered departments
  const filteredDepts = deptList.filter((d) => {
    if (capacityFilter === "OVERLOADED_OR_FULL") {
      return d.status === "OVERLOADED" || d.status === "FULL";
    }
    if (capacityFilter === "OPTIMAL") return d.status === "OPTIMAL";
    if (capacityFilter === "AVAILABLE") return d.status === "AVAILABLE";
    return true;
  });

  // Calculate top macro metrics
  const totalWeeklyCap = deptList.reduce((acc, d) => acc + d.totalWeeklyHours, 0);
  const totalCommitted = deptList.reduce((acc, d) => acc + d.totalCommittedHours, 0);
  const avgUtilization = Math.round((totalCommitted / totalWeeklyCap) * 100);
  const totalMandatesHours = mandates.reduce((acc, m) => acc + m.allocatedHours, 0);
  const totalDecomposedTasks = mandates.reduce((acc, m) => acc + m.decomposedTasksCount, 0);
  const totalTargetTasks = mandates.reduce((acc, m) => acc + m.totalTasksTarget, 0);
  const overallDecomposeRate = Math.round((totalDecomposedTasks / totalTargetTasks) * 100);

  const handleUrgeManager = (mandate: ExecutiveMandate) => {
    triggerNotify(
      `Đã gửi thông báo đôn đốc Trưởng phòng ${mandate.managerName} đẩy nhanh phân rã quyết sách ${mandate.code}`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    onAddDepartment({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description:
        description.trim() ||
        "Phòng ban chức năng thuộc tổ chức Axiom Enterprise.",
      managerName: managerName.trim() || "Chưa bổ nhiệm",
      managerEmail: managerEmail.trim() || "unassigned@axiom.internal",
      color: "#4F7BF7",
    });

    // Also push to local capacity metrics
    const newCapacityDept: DepartmentCapacityMetric = {
      code: code.trim().toUpperCase() as any,
      name: name.trim(),
      managerName: managerName.trim() || "Chưa bổ nhiệm",
      managerEmail: managerEmail.trim() || "unassigned@axiom.internal",
      memberCount: 1,
      totalWeeklyHours: 40,
      meetingHoursTotal: 0,
      taskHoursCommitted: 0,
      totalCommittedHours: 0,
      utilizationRate: 0,
      status: "AVAILABLE",
      activeMeetingsCount: 0,
      mandatesCount: 0,
      zeroTaskCount: 1,
      optimalTaskCount: 0,
      overloadedCount: 0,
      bottlenecksAlert: null,
      mandates: [],
    };
    setDeptList([...deptList, newCapacityDept]);

    setName("");
    setCode("");
    setDescription("");
    setManagerName("");
    setManagerEmail("");
    setIsAddModalOpen(false);
    triggerNotify(`Đã khai báo phòng ban ${name.trim()} vào cây cơ cấu tổ chức!`);
  };

  const getCapacityStatusBadge = (status: DepartmentCapacityMetric["status"]) => {
    switch (status) {
      case "OVERLOADED":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300",
          dot: "bg-rose-500",
          text: "QUÁ TẢI (>100%)",
        };
      case "FULL":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300",
          dot: "bg-amber-500",
          text: "ĐẦY TẢI (85-100%)",
        };
      case "OPTIMAL":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
          dot: "bg-emerald-500",
          text: "TỐI ƯU (50-80%)",
        };
      case "AVAILABLE":
      default:
        return {
          bg: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300",
          dot: "bg-slate-400",
          text: "DƯ THỪA CÔNG SUẤT",
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── TOP EXECUTIVE BANNER: WORKLOAD & MANDATE RADAR ── */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-blue-800/40">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold mb-2.5">
                <MatIcon name="monitoring" className="text-[16px]" />
                <span>EXECUTIVE PROTOCOL • TRUNG TÂM QUẢN TRỊ TẢI DOANH NGHIỆP</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                <span>Khối Lượng Công Việc & Năng Lực Phòng Ban</span>
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
                Tự động đo lường tỷ lệ tải thực tế từ các cuộc họp lãnh đạo, giám sát tiến độ phân rã
                Nghị Quyết Cấp Cao (Executive Mandates) xuống từng khối và phát hiện nút thắt cổ chai nguồn lực.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer shrink-0 active:scale-95 border border-blue-400/40"
            >
              <MatIcon name="add" className="text-[18px]" />
              <span>Thêm Phòng Ban Chức Năng</span>
            </button>
          </div>

          {/* 4 Macro KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="speed" className="text-blue-400 text-[16px]" />
                <span>Tải Toàn Doanh Nghiệp</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">
                  {avgUtilization}%
                </span>
                <span className="text-[11px] text-emerald-400 font-bold">
                  ● Mức cân bằng
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {totalCommitted}h / {totalWeeklyCap}h công suất tuần
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="flag" className="text-amber-400 text-[16px]" />
                <span>Nghị Quyết Cấp Cao</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">
                  {mandates.length}
                </span>
                <span className="text-[11px] text-amber-300 font-bold">
                  {totalMandatesHours}h cam kết
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Trích xuất từ Họp HĐQT Q3
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="account_tree" className="text-purple-400 text-[16px]" />
                <span>Tỷ Lệ Phân Rã Task</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">
                  {overallDecomposeRate}%
                </span>
                <span className="text-[11px] text-purple-300 font-bold">
                  {totalDecomposedTasks}/{totalTargetTasks} tasks
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Đã gán xuống nhân sự
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MatIcon name="warning" className="text-rose-400 text-[16px]" />
                <span>Cảnh Báo Cổ Chai</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-rose-300">
                  1 Khối
                </span>
                <span className="text-[11px] text-rose-300 font-bold">
                  Khối BIZ (92%)
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Cần điều chuyển nhân lực
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: NGHỊ QUYẾT CẤP CAO TRÍCH XUẤT TỪ CUỘC HỌP BAN LÃNH ĐẠO ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <MatIcon name="assignment" className="text-blue-600 dark:text-blue-400 text-[20px]" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Nghị Quyết Ban Lãnh Đạo Đang Phân Rã Xuống Các Khối (Executive Mandates)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {mandates.length} Trọng tâm chiến lược
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chỉ đạo từ cuộc họp của Chủ Tịch & Trưởng Phòng. AI theo dõi xem Trưởng phòng đã phân rã thành bao nhiêu task cho nhân viên.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mandates.map((m) => {
            const percent = Math.round((m.decomposedTasksCount / m.totalTasksTarget) * 100);
            const isCompleted = percent === 100;

            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400/80 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-mono font-bold tracking-wider">
                      {m.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {isCompleted ? "ĐÃ PHÂN RÃ 100%" : `ĐANG PHÂN RÃ (${percent}%)`}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {m.title}
                  </h3>

                  <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Phòng ban đích:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {m.targetDepartmentName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Trưởng khối chịu trách nhiệm:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {m.managerName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Nguồn gốc chỉ đạo:</span>
                      <span className="italic truncate max-w-[200px]" title={m.sourceMeetingTitle}>
                        {m.sourceMeetingTitle}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500">
                        Tiến độ phân rã: {m.decomposedTasksCount}/{m.totalTasksTarget} tasks
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {m.allocatedHours}h tải ({m.storyPoints} SP)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Hạn chót: {m.deadline}
                  </span>

                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => handleUrgeManager(m)}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <MatIcon name="notifications_active" className="text-[14px]" />
                      <span>Đôn đốc Trưởng phòng</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2: BẢN ĐỒ TẢI TRỌNG CÁC PHÒNG BAN (CAPACITY RADAR) ── */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <MatIcon name="grid_view" className="text-indigo-600 dark:text-indigo-400 text-[20px]" />
              <span>Ma Trận Tải Năng Lực Theo Khối Chức Năng</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Khóa cứng kích thước lọc chống giật layout (Anti-CLS) theo quy chuẩn hệ thống.
            </p>
          </div>

          {/* Filter Bar with Dimension Locking (Fixed Width, Anti-CLS) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setCapacityFilter("ALL")}
              className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                capacityFilter === "ALL"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Tất cả các phòng ban"
            >
              Tất Cả ({deptList.length})
            </button>

            <button
              type="button"
              onClick={() => setCapacityFilter("OVERLOADED_OR_FULL")}
              className={`w-32 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                capacityFilter === "OVERLOADED_OR_FULL"
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Phòng ban đầy tải hoặc quá tải"
            >
              Đầy / Quá Tải
            </button>

            <button
              type="button"
              onClick={() => setCapacityFilter("OPTIMAL")}
              className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                capacityFilter === "OPTIMAL"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Phòng ban tải tối ưu"
            >
              Tối Ưu
            </button>

            <button
              type="button"
              onClick={() => setCapacityFilter("AVAILABLE")}
              className={`w-28 text-center py-1.5 text-xs font-bold rounded-lg transition-all truncate cursor-pointer ${
                capacityFilter === "AVAILABLE"
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Phòng ban còn dư thừa công suất"
            >
              Dư Thừa
            </button>
          </div>
        </div>

        {/* Bento Grid of Departments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDepts.map((dept) => {
            const badge = getCapacityStatusBadge(dept.status);

            return (
              <div
                key={dept.code}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-blue-400/80 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Code & Capacity Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold">
                      {dept.code}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${badge.bg}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      <span>{badge.text}</span>
                    </span>
                  </div>

                  {/* Title & Manager */}
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {dept.name}
                  </h3>

                  <div className="mt-2 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                      {dept.managerAvatar ? (
                        <img src={dept.managerAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        dept.managerName.charAt(0)
                      )}
                    </div>
                    <span>
                      Trưởng phòng: <strong className="text-slate-800 dark:text-slate-200">{dept.managerName}</strong>
                    </span>
                  </div>

                  {/* CAPACITY METER BAR */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                        <MatIcon name="speed" className="text-blue-500 text-[15px]" />
                        <span>Tỷ lệ tải công việc (Utilization)</span>
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        {dept.utilizationRate}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-500 ${
                          dept.status === "OVERLOADED"
                            ? "bg-rose-500"
                            : dept.status === "FULL"
                            ? "bg-amber-500"
                            : dept.status === "OPTIMAL"
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                        style={{ width: `${Math.min(dept.utilizationRate, 100)}%` }}
                      />
                    </div>

                    {/* Hours Breakdown */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                      <span>{dept.meetingHoursTotal}h họp tuần</span>
                      <span>+</span>
                      <span>{dept.taskHoursCommitted}h tasks</span>
                      <span>=</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {dept.totalCommittedHours}h / {dept.totalWeeklyHours}h
                      </span>
                    </div>
                  </div>

                  {/* Member Capacity Distribution Chips */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                      <div className="font-mono text-xs text-slate-800 dark:text-slate-200">
                        {dept.zeroTaskCount} người
                      </div>
                      <div>⚪ 0 task (rảnh)</div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      <div className="font-mono text-xs font-black">
                        {dept.optimalTaskCount} người
                      </div>
                      <div>🟢 1-2 task (tối ưu)</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                      <div className="font-mono text-xs font-black">
                        {dept.overloadedCount} người
                      </div>
                      <div>🔴 Quá tải (&gt;100%)</div>
                    </div>
                  </div>

                  {/* Bottleneck alert if any */}
                  {dept.bottlenecksAlert && (
                    <div className="mt-3 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                      <MatIcon name="warning" className="text-[14px] text-amber-600 shrink-0 mt-0.5" />
                      <span>{dept.bottlenecksAlert}</span>
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                    <MatIcon name="groups" className="text-[16px]" />
                    <span>{dept.memberCount} nhân sự</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedDeptForDetail(dept)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <span>Xem Phân Bổ Tải Chi Tiết</span>
                    <MatIcon name="arrow_forward" className="text-[14px]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL DEEP-DIVE: CHI TIẾT TẢI NHÂN SỰ & QUYẾT SÁCH CỦA PHÒNG BAN ── */}
      {selectedDeptForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setSelectedDeptForDetail(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[22px]" />
            </button>

            {/* Header */}
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-mono font-bold">
                  {selectedDeptForDetail.code}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedDeptForDetail.name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Trưởng phòng phụ trách: <strong>{selectedDeptForDetail.managerName}</strong> ({selectedDeptForDetail.managerEmail})
              </p>
            </div>

            {/* Content Body: Scrollable list of members in this department */}
            <div className="overflow-y-auto py-4 space-y-4 pr-1">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Danh sách nhân sự & Tải công suất từng thành viên:</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (Tiêu chuẩn 40h/tuần = 100%)
                </span>
              </div>

              {selectedDeptForDetail.code === "ENG" ? (
                <div className="space-y-3">
                  {INITIAL_ENG_MEMBERS.map((mem) => {
                    const isZero = mem.activeTasksCount === 0;
                    const isOver = mem.capacityPercent > 100;

                    return (
                      <div
                        key={mem.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={mem.avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {mem.name}
                              </h4>
                              {isZero && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                  0 Task • Trống việc
                                </span>
                              )}
                              {isOver && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                  Quá tải nguy hiểm
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400">
                              {mem.title}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {mem.weeklyMeetingHours}h họp + {mem.estimatedTaskHours}h task ({mem.activeTasksCount} active tasks)
                            </p>
                          </div>
                        </div>

                        {/* Capacity Percentage Pill */}
                        <div className="text-right shrink-0">
                          <div
                            className={`font-mono text-sm font-black ${
                              isOver
                                ? "text-rose-600 dark:text-rose-400"
                                : isZero
                                ? "text-slate-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {mem.capacityPercent}%
                          </div>
                          <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                isOver
                                  ? "bg-rose-500"
                                  : isZero
                                  ? "bg-slate-400"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(mem.capacityPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500">
                  Phòng ban gồm {selectedDeptForDetail.memberCount} nhân sự đang vận hành theo cơ chế phân tán.
                  Tổng công suất khả dụng: {selectedDeptForDetail.totalWeeklyHours}h/tuần.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDeptForDetail(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM PHÒNG BAN MỚI (GIỮ NGUYÊN TÍNH NĂNG GỐC) ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[20px]" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <MatIcon name="account_tree" filled className="text-[20px]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Thêm Khối Phòng Ban Mới
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mở rộng cơ cấu tổ chức và phân bổ công suất vận hành.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên phòng ban
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Khối Truyền Thông"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã code
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="MKT"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chức năng nhiệm vụ
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Chịu trách nhiệm thương hiệu, chiến dịch và nội dung..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Trưởng phòng dự kiến (Họ tên)
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email trưởng phòng
                </label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="an.nguyen@axiom.internal"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer mt-2 active:scale-95"
              >
                Khai Báo Phòng Ban
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
