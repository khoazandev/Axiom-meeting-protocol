'use client';

import React, { useState, useEffect } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import { Department, OrgMemberDetail } from '@/lib/api';
import { recruitmentApi, JobOpening } from '@/lib/recruitment-api';
import { getDepartmentIcon } from '@/lib/departmentIcons';
import { getRolePresetsForDepartment, RolePreset } from '@/lib/departmentRolePresets';

export interface EditJobOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  opening: JobOpening;
  departments: Department[];
  managers: OrgMemberDetail[];
  onSuccess: (updatedOpening: JobOpening) => void;
  onNotify?: (msg: string) => void;
}

export function EditJobOpeningModal({
  isOpen,
  onClose,
  organizationId,
  opening,
  departments,
  managers,
  onSuccess,
  onNotify,
}: EditJobOpeningModalProps) {
  // Parse rubric metadata if present
  let initialMeta: {
    level?: string;
    salary_range?: string;
    work_type?: string;
    location?: string;
    benefits?: string;
    auto_meeting_enabled?: boolean;
    interview_duration_minutes?: number;
    interview_agenda?: string;
    passing_score?: number;
  } = {};
  if (opening.competency_rubric_json) {
    try {
      initialMeta = JSON.parse(opening.competency_rubric_json);
    } catch {}
  }

  const [title, setTitle] = useState(opening.title || '');
  const [departmentId, setDepartmentId] = useState(opening.department_id || departments[0]?.id || '');
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAFT'>(
    (opening.status as 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAFT') || 'ACTIVE'
  );
  const [level, setLevel] = useState(opening.level || initialMeta.level || 'Senior');
  const [workType, setWorkType] = useState(opening.work_type || initialMeta.work_type || 'Hybrid');
  const [salaryRange, setSalaryRange] = useState(opening.salary_range || initialMeta.salary_range || '');
  const [location, setLocation] = useState(opening.location || initialMeta.location || '');
  const [description, setDescription] = useState(opening.description || '');
  const [requirements, setRequirements] = useState(opening.requirements || '');
  const [benefits, setBenefits] = useState(opening.benefits || initialMeta.benefits || '');

  // HR Assignment & Interview settings
  const [assignedHrId, setAssignedHrId] = useState<string>(
    opening.assigned_hr_member_id || managers[0]?.id || ''
  );
  const [requiresTest, setRequiresTest] = useState(Boolean(opening.requires_assessment));
  const [passingScore, setPassingScore] = useState<number>(initialMeta.passing_score ?? 70);
  const [interviewDuration, setInterviewDuration] = useState<number>(
    initialMeta.interview_duration_minutes ?? 45
  );
  const [interviewAgenda, setInterviewAgenda] = useState<string>(
    initialMeta.interview_agenda ||
      '1. Giới thiệu tổng quan và năng lực ứng viên.\n2. Trao đổi chuyên sâu về kinh nghiệm thực chiến.\n3. Đánh giá độ phù hợp văn hóa và giải đáp định hướng nghề nghiệp.'
  );

  const [activeTab, setActiveTab] = useState<'general' | 'requirements' | 'interview'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Role presets by department
  const currentDeptObj = departments.find((d) => d.id === departmentId);
  const rolePresets = React.useMemo(
    () => getRolePresetsForDepartment(currentDeptObj?.name || ''),
    [currentDeptObj]
  );

  const handleSelectRolePreset = (preset: RolePreset) => {
    setTitle(preset.title);
    setLevel(preset.level);
    setSalaryRange(preset.salary_range);
    setWorkType(preset.work_type);
    setDescription(preset.description);
    setRequirements(preset.requirements);
    setBenefits(preset.benefits);
    onNotify?.(`✨ Đã nạp mẫu vị trí chuẩn: ${preset.title}`);
  };

  // Sync state if opening changes
  useEffect(() => {
    setTitle(opening.title || '');
    setDepartmentId(opening.department_id || departments[0]?.id || '');
    setStatus((opening.status as any) || 'ACTIVE');
    setLevel(opening.level || initialMeta.level || 'Senior');
    setWorkType(opening.work_type || initialMeta.work_type || 'Hybrid');
    setSalaryRange(opening.salary_range || initialMeta.salary_range || '');
    setLocation(opening.location || initialMeta.location || '');
    setDescription(opening.description || '');
    setRequirements(opening.requirements || '');
    setBenefits(opening.benefits || initialMeta.benefits || '');
    setAssignedHrId(opening.assigned_hr_member_id || managers[0]?.id || '');
    setRequiresTest(Boolean(opening.requires_assessment));
  }, [opening]);

  if (!isOpen) return null;

  // Filter and sort eligible managers
  const eligibleManagers = managers
    .filter((m) => ['MANAGER', 'ADMIN', 'OWNER'].includes(m.role))
    .sort((a, b) => {
      const isAHr =
        (a.department_name || '').toLowerCase().includes('nhân sự') ||
        (a.job_title || '').toLowerCase().includes('hr') ||
        (a.full_name || '').includes('Hương');
      const isBHr =
        (b.department_name || '').toLowerCase().includes('nhân sự') ||
        (b.job_title || '').toLowerCase().includes('hr') ||
        (b.full_name || '').includes('Hương');
      if (isAHr && !isBHr) return -1;
      if (!isAHr && isBHr) return 1;
      if (a.role === 'MANAGER' && b.role !== 'MANAGER') return -1;
      if (a.role !== 'MANAGER' && b.role === 'MANAGER') return 1;
      return 0;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onNotify?.('Vui lòng nhập tiêu đề vị trí tuyển dụng');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedRubric = {
        ...initialMeta,
        level,
        work_type: workType,
        salary_range: salaryRange,
        location,
        benefits,
        passing_score: passingScore,
        interview_duration_minutes: interviewDuration,
        interview_agenda: interviewAgenda,
      };

      const payload: Partial<JobOpening> = {
        title: title.trim(),
        department_id: departmentId,
        status,
        level,
        work_type: workType,
        salary_range: salaryRange.trim(),
        location: location.trim(),
        description: description.trim(),
        requirements: requirements.trim(),
        benefits: benefits.trim(),
        assigned_hr_member_id: assignedHrId || null,
        requires_assessment: requiresTest,
        competency_rubric_json: JSON.stringify(updatedRubric),
      };

      const res = await recruitmentApi.updateOpening(organizationId, opening.id, payload);
      onNotify?.(`✅ Đã cập nhật vị trí tuyển dụng "${res.title}" thành công!`);
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to update job opening:', err);
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi khi cập nhật vị trí tuyển dụng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <MatIcon name="edit_document" size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Chỉnh Sửa Vị Trí Tuyển Dụng</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {opening.title}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cập nhật thông tin công việc, yêu cầu, phúc lợi và chỉ định người phỏng vấn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <MatIcon name="close" size={20} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-5 pt-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MatIcon name="business_center" size={16} />
            <span>Thông Tin Chung</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requirements')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'requirements'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MatIcon name="description" size={16} />
            <span>Mô Tả & Phúc Lợi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interview')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'interview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MatIcon name="groups" size={16} />
            <span>Người Phụ Trách & Phỏng Vấn</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── TAB 1: THÔNG TIN CHUNG ── */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Role Presets Bar */}
              {rolePresets.length > 0 && (
                <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <MatIcon name="auto_awesome" size={15} className="text-blue-600" />
                      Gợi ý vị trí mẫu ({currentDeptObj?.name || 'Phòng ban'}):
                    </span>
                    <span className="text-[10.5px] text-blue-600/80 dark:text-blue-300/80">
                      Nhấn để áp dụng tiêu đề, mô tả và yêu cầu mẫu
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {rolePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectRolePreset(preset)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          title === preset.title
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {preset.title.split(' (')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu đề vị trí tuyển dụng *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Senior Backend Engineer (Python / Go)"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Phòng ban trực thuộc *
                  </label>
                  <AxiomSelect
                    value={departmentId}
                    onChange={(val) => setDepartmentId(val)}
                    options={departments.map((d) => ({
                      value: d.id,
                      label: d.name,
                      triggerLabel: d.name,
                      description: d.description || undefined,
                      icon: getDepartmentIcon(d),
                    }))}
                    width="100%"
                    triggerClassName="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Trạng thái tin tuyển dụng
                  </label>
                  <AxiomSelect
                    value={status}
                    onChange={(val) => setStatus(val as any)}
                    options={[
                      { value: 'ACTIVE', label: 'Đang tuyển (Công khai)', triggerLabel: 'Đang tuyển', badge: 'ACTIVE' },
                      { value: 'PAUSED', label: 'Tạm dừng nhận hồ sơ', triggerLabel: 'Tạm dừng', badge: 'PAUSED' },
                      { value: 'CLOSED', label: 'Đã đóng tuyển dụng', triggerLabel: 'Đã đóng', badge: 'CLOSED' },
                      { value: 'DRAFT', label: 'Bản nháp (Nội bộ)', triggerLabel: 'Bản nháp', badge: 'DRAFT' },
                    ]}
                    width="100%"
                    triggerClassName="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Cấp bậc (Level)
                  </label>
                  <AxiomSelect
                    value={level}
                    onChange={(val) => setLevel(val)}
                    options={[
                      { value: 'Intern / Thực tập sinh', label: 'Intern / Thực tập sinh' },
                      { value: 'Fresher', label: 'Fresher' },
                      { value: 'Junior', label: 'Junior' },
                      { value: 'Middle', label: 'Middle' },
                      { value: 'Senior', label: 'Senior' },
                      { value: 'Lead / Tech Lead', label: 'Lead / Tech Lead' },
                      { value: 'Manager / Trưởng nhóm', label: 'Manager / Trưởng nhóm' },
                      { value: 'Director / Giám đốc bộ phận', label: 'Director / Giám đốc bộ phận' },
                    ]}
                    width="100%"
                    triggerClassName="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Hình thức làm việc
                  </label>
                  <AxiomSelect
                    value={workType}
                    onChange={(val) => setWorkType(val)}
                    options={[
                      { value: 'Hybrid (3 ngày VP / 2 ngày Remote)', label: 'Hybrid (3 ngày VP / 2 ngày Remote)' },
                      { value: 'On-site (Văn phòng toàn thời gian)', label: 'On-site (Văn phòng toàn thời gian)' },
                      { value: 'Remote 100% (Làm việc từ xa)', label: 'Remote 100% (Làm việc từ xa)' },
                      { value: 'Toàn thời gian (Full-time)', label: 'Toàn thời gian (Full-time)' },
                      { value: 'Bán thời gian (Part-time)', label: 'Bán thời gian (Part-time)' },
                    ]}
                    width="100%"
                    triggerClassName="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mức lương
                  </label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="Ví dụ: 25.000.000 - 45.000.000 VNĐ hoặc Thỏa thuận"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Địa điểm làm việc
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ví dụ: Keangnam Landmark 72, Cầu Giấy, Hà Nội"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: MÔ TẢ & PHÚC LỢI ── */}
          {activeTab === 'requirements' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mô tả công việc (Job Description)
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu vị trí, nhiệm vụ hằng ngày và trách nhiệm cụ thể..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Yêu cầu ứng viên (Requirements)
                </label>
                <textarea
                  rows={4}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Yêu cầu về kinh nghiệm, kỹ năng công nghệ, phẩm chất chuyên môn..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Quyền lợi & Đãi ngộ (Benefits)
                </label>
                <textarea
                  rows={3}
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="Bảo hiểm sức khỏe, thưởng KPI, thiết bị làm việc, chế độ nghỉ phép..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ── TAB 3: NGƯỜI PHỤ TRÁCH & PHỎNG VẤN ── */}
          {activeTab === 'interview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* HR Assigned Manager */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Chỉ định Người phỏng vấn / Quản lý phụ trách (Owner hoặc Manager đều được) *
                </label>
                {eligibleManagers.length > 0 ? (
                  <AxiomSelect
                    value={assignedHrId}
                    onChange={(val) => setAssignedHrId(val)}
                    options={eligibleManagers.map((m) => ({
                      value: m.id,
                      label: `${m.full_name} (${m.role}${m.department_name ? ` • ${m.department_name}` : ''})`,
                      triggerLabel: m.full_name,
                      description: `${m.email}${m.job_title ? ` • ${m.job_title}` : ''}`,
                      badge: m.role,
                    }))}
                    width="100%"
                    triggerClassName="w-full"
                  />
                ) : (
                  <div className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs">
                    Chưa có quản lý hoặc HR nào trong hệ thống
                  </div>
                )}
              </div>

              {/* Assessment test toggle */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Yêu cầu làm bài kiểm tra đầu vào (Assessment Test)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ứng viên bắt buộc phải hoàn thành bài test và đạt điểm sàn trước khi vào vòng phỏng vấn
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requiresTest}
                    onChange={(e) => setRequiresTest(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                  />
                </div>

                {requiresTest && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Điểm đạt tối thiểu (Passing Score)
                      </label>
                      <AxiomSelect
                        value={String(passingScore)}
                        onChange={(val) => setPassingScore(parseInt(val, 10))}
                        options={[
                          { value: '50', label: '50% (Tiêu chuẩn cơ bản)' },
                          { value: '60', label: '60% (Trung bình khá)' },
                          { value: '70', label: '70% (Khuyến nghị chuẩn)' },
                          { value: '80', label: '80% (Năng lực cao)' },
                          { value: '90', label: '90% (Xuất sắc)' },
                        ]}
                        width="100%"
                        triggerClassName="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Thời lượng phỏng vấn
                      </label>
                      <AxiomSelect
                        value={String(interviewDuration)}
                        onChange={(val) => setInterviewDuration(parseInt(val, 10))}
                        options={[
                          { value: '30', label: '30 phút' },
                          { value: '45', label: '45 phút (Khuyến nghị)' },
                          { value: '60', label: '60 phút' },
                          { value: '90', label: '90 phút' },
                        ]}
                        width="100%"
                        triggerClassName="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Chương trình phỏng vấn chuẩn (Interview Agenda)
                </label>
                <textarea
                  rows={3}
                  value={interviewAgenda}
                  onChange={(e) => setInterviewAgenda(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono leading-relaxed"
                />
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="p-4 px-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <MatIcon name={isSubmitting ? 'sync' : 'save'} size={16} className={isSubmitting ? 'animate-spin' : ''} />
              <span>{isSubmitting ? 'Đang lưu cập nhật...' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
