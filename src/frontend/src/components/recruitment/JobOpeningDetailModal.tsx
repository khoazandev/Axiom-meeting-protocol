'use client';

import React from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { JobOpening } from '@/lib/recruitment-api';

export interface JobOpeningDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  opening: JobOpening | null;
  departmentName?: string;
  deptIconName?: string;
  companyInfo?: {
    name: string;
    tagline?: string;
    logo_url?: string;
    banner_url?: string;
    website?: string;
    size?: string;
    headquarters?: string;
    industry?: string;
    description?: string;
  };
  onEdit?: (opening: JobOpening) => void;
}

export function JobOpeningDetailModal({
  isOpen,
  onClose,
  opening,
  departmentName,
  deptIconName = 'work_outline',
  companyInfo,
  onEdit,
}: JobOpeningDetailModalProps) {
  if (!isOpen || !opening) return null;

  const statusLabel =
    opening.status === 'ACTIVE'
      ? 'Đang Tuyển Dụng'
      : opening.status === 'PAUSED'
        ? 'Tạm Dừng Tuyển'
        : opening.status === 'CLOSED'
          ? 'Đã Đóng Tuyển'
          : 'Bản Nháp';

  const statusColor =
    opening.status === 'ACTIVE'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
      : opening.status === 'PAUSED'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
        : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30';

  // Parse rubric metadata fallback if top-level fields are missing
  const parsedMeta = React.useMemo(() => {
    if (!opening?.competency_rubric_json) return null;
    try {
      return JSON.parse(opening.competency_rubric_json);
    } catch {
      return null;
    }
  }, [opening?.competency_rubric_json]);

  const displayLevel = opening.level || parsedMeta?.level || 'Tất cả cấp bậc';
  const displayWorkType = opening.work_type || parsedMeta?.work_type || 'Toàn thời gian';
  const displaySalaryRange = opening.salary_range || parsedMeta?.salary_range || 'Thỏa thuận';
  const displayLocation = opening.location || parsedMeta?.location || 'Tại văn phòng';
  const displayBenefits = opening.benefits || parsedMeta?.benefits;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Banner Header (Proportional & Anti-Distortion) */}
        <div className="h-40 sm:h-48 w-full relative bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 overflow-hidden shrink-0">
          {companyInfo?.banner_url ? (
            <img
              src={companyInfo.banner_url}
              alt="Company Banner"
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px] flex items-center justify-center">
              <MatIcon name="domain" size={48} className="text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

          {/* Top Floating Badges */}
          <div className="absolute top-3.5 left-4 sm:left-6 flex flex-wrap items-center gap-2 z-20">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-blue-200 border border-white/15 shadow-2xs">
              <MatIcon name={deptIconName} size={15} className="text-blue-400 shrink-0" />
              <span>{departmentName || 'Bộ Phận Chuyên Môn'}</span>
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-2xs border ${
              opening.status === 'ACTIVE'
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40'
                : opening.status === 'PAUSED'
                  ? 'bg-amber-950/80 text-amber-200 border-amber-500/40'
                  : 'bg-slate-900/80 text-slate-200 border-slate-700/60'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>{statusLabel}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-30 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-lg"
            title="Đóng chi tiết"
          >
            <MatIcon name="close" size={20} />
          </button>
        </div>

        {/* Elevated Floating Logo (Never Covered by Banner) */}
        <div className="relative z-20 -mt-10 sm:-mt-11 px-6 flex items-end justify-between gap-4">
          <div className="w-20 h-20 rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-xl ring-4 ring-white dark:ring-slate-900 shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden p-1.5">
              {companyInfo?.logo_url ? (
                <img
                  src={companyInfo.logo_url}
                  alt={companyInfo.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
                  {companyInfo?.name?.charAt(0) || 'A'}
                </div>
              )}
            </div>
          </div>

          <div className="mb-1 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <MatIcon name="verified" size={14} className="text-emerald-500" />
              <span>Doanh Nghiệp Đã Xác Minh</span>
            </span>
          </div>
        </div>

        {/* Header Title Bar */}
        <div className="px-6 pt-2 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            {opening.title}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {companyInfo?.name || 'Axiom Enterprise'}
            </span>
            {companyInfo?.tagline && (
              <>
                <span>•</span>
                <span className="italic text-slate-500 dark:text-slate-400">
                  &ldquo;{companyInfo.tagline}&rdquo;
                </span>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Job Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <MatIcon name="military_tech" size={14} className="text-amber-500" />
                <span>Cấp bậc</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {displayLevel}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <MatIcon name="schedule" size={14} className="text-emerald-500" />
                <span>Hình thức</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {displayWorkType}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <MatIcon name="payments" size={14} className="text-blue-500" />
                <span>Mức lương</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {displaySalaryRange}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <MatIcon name="location_on" size={14} className="text-rose-500" />
                <span>Địa điểm</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={displayLocation}>
                {displayLocation}
              </p>
            </div>
          </div>

          {/* Company Profile Section */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/60 dark:to-blue-950/20 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              {companyInfo?.logo_url ? (
                <img
                  src={companyInfo.logo_url}
                  alt={companyInfo.name}
                  className="w-11 h-11 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                  {companyInfo?.name?.charAt(0) || 'A'}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {companyInfo?.name || 'Axiom Enterprise'}
                </h4>
                {companyInfo?.tagline && (
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                    {companyInfo.tagline}
                  </p>
                )}
              </div>
            </div>

            {companyInfo?.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {companyInfo.description}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
              {companyInfo?.industry && (
                <div className="flex items-center gap-1.5 truncate">
                  <MatIcon name="category" size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{companyInfo.industry}</span>
                </div>
              )}
              {companyInfo?.size && (
                <div className="flex items-center gap-1.5 truncate">
                  <MatIcon name="groups" size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{companyInfo.size}</span>
                </div>
              )}
              {companyInfo?.headquarters && (
                <div className="flex items-center gap-1.5 truncate">
                  <MatIcon name="domain" size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{companyInfo.headquarters}</span>
                </div>
              )}
            </div>
          </div>

          {/* Job Description */}
          {opening.description && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <MatIcon name="subject" size={16} className="text-blue-600" />
                <span>Mô Tả Công Việc</span>
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {opening.description}
              </div>
            </div>
          )}

          {/* Job Requirements */}
          {opening.requirements && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <MatIcon name="checklist" size={16} className="text-emerald-600" />
                <span>Yêu Cầu Tuyển Dụng</span>
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {opening.requirements}
              </div>
            </div>
          )}

          {/* Benefits & Perks */}
          {displayBenefits && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <MatIcon name="card_giftcard" size={16} className="text-purple-600" />
                <span>Chế Độ Đãi Ngộ & Phúc Lợi</span>
              </h4>
              <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {displayBenefits}
              </div>
            </div>
          )}

          {/* Assessment Test Info (if applicable) */}
          {(opening.requires_assessment || (parsedMeta?.questions_count && parsedMeta.questions_count > 0)) && (
            <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MatIcon name="quiz" size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Bài Test Năng Lực Đầu Vào
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {parsedMeta?.questions_count ? `${parsedMeta.questions_count} câu hỏi đánh giá` : 'Đề thi trắc nghiệm & tự luận'}
                    {parsedMeta?.passing_score ? ` • Điểm chuẩn đạt: ${parsedMeta.passing_score}%` : ''}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
                Bắt buộc
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <MatIcon name="lock" size={13} />
            <span>Thông tin vị trí tuyển dụng chính thức của doanh nghiệp</span>
          </span>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(opening);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 cursor-pointer transition-colors flex items-center gap-1.5 border border-amber-200/80 dark:border-amber-800/60"
              >
                <MatIcon name="edit" size={14} />
                <span>Chỉnh Sửa Tin</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 cursor-pointer transition-colors shadow-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
