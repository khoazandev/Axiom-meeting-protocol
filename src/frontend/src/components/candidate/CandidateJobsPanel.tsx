'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Briefcase,
  Building2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Clock,
  Layers,
  CheckCircle2,
  ShieldCheck,
  FileCheck2,
  MapPin,
  DollarSign,
  X,
  ExternalLink,
  Globe,
  Users,
  FileText,
} from 'lucide-react';
import { MatIcon } from '@/components/ui/MatIcon';
import { getDepartmentIcon } from '@/lib/departmentIcons';
import { PublicJobOpening, CandidateApplication } from '@/lib/recruitment-api';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { CompanyLogo } from '@/lib/companyLogos';

export interface CandidateJobsPanelProps {
  openings: PublicJobOpening[];
  isLoading: boolean;
  errorMessage: string | null;
  searchKeyword: string;
  onSearchKeywordChange: (value: string) => void;
  onSearch: () => void;
  onApply: (opening: PublicJobOpening) => void;
  onRetry: () => void;
  applications?: CandidateApplication[];
  onViewApplications?: () => void;
}

export function CandidateJobsPanel({
  openings,
  isLoading,
  errorMessage,
  searchKeyword,
  onSearchKeywordChange,
  onSearch,
  onApply,
  onRetry,
  applications,
  onViewApplications,
}: CandidateJobsPanelProps) {
  const { t, language } = useLanguageStore();
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedDetailJob, setSelectedDetailJob] = useState<PublicJobOpening | null>(null);
  const [selectedCompanyProfile, setSelectedCompanyProfile] = useState<PublicJobOpening | null>(null);

  // Extract unique departments for filter chips
  const departments = useMemo(() => {
    const set = new Set<string>();
    openings.forEach((job) => {
      if (job.department_name) set.add(job.department_name);
    });
    return Array.from(set);
  }, [openings]);

  // Filter openings by department if selected
  const filteredOpenings = useMemo(() => {
    if (selectedDept === 'ALL') return openings;
    return openings.filter((job) => job.department_name === selectedDept);
  }, [openings, selectedDept]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────
          HERO BANNER (Adaptive Light / Dark Minimalist)
      ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white p-6 sm:p-8 border border-neutral-200/90 dark:border-neutral-800 shadow-xs dark:shadow-xl">
        {/* Subtle geometric decorative grid */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-white/10 text-[11px] font-bold tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-300" />
              <span>Cổng Tuyển Dụng Bảo Mật On-Premise</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              {t.candidate.jobsTitle}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-normal leading-relaxed">
              {t.candidate.jobsSubtitle}
            </p>
          </div>

          {/* Quick Stats Bento Metric */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 text-center min-w-[100px]">
              <div className="text-xl font-black text-neutral-900 dark:text-white">{openings.length}</div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 mt-0.5 tracking-wider">
                {t.candidate.openRoles}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 text-center min-w-[110px]">
              <div className="text-xl font-black text-neutral-900 dark:text-white">ATS AI</div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 mt-0.5 tracking-wider">
                {t.candidate.autoScan}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          SEARCH BAR & FILTER CHIPS (Anti-Layout-Shift Compliant)
      ────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => onSearchKeywordChange(e.target.value)}
                placeholder={t.candidate.searchPlaceholder}
                className="w-full pl-10 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:bg-white dark:focus:bg-neutral-800 focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              title={t.candidate.searchBtn}
              className="shrink-0 w-24 h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-60 truncate"
            >
              <span className="truncate">{t.candidate.searchBtn}</span>
            </button>
          </form>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRetry}
            disabled={isLoading}
            title={t.candidate.refreshBtn}
            className="shrink-0 w-28 h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-50 truncate"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="truncate">{t.candidate.refreshBtn}</span>
          </button>
        </div>

        {/* Department Filter Chips */}
        {departments.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>{t.candidate.departmentLabel}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDept('ALL')}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDept === 'ALL'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-2xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {t.candidate.allDepartments} ({openings.length})
            </button>
            {departments.map((dept) => {
              const count = openings.filter((j) => j.department_name === dept).length;
              const isSelected = selectedDept === dept;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-2xs'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {dept} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          ERROR STATE
      ────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4 text-rose-700 dark:text-rose-300 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 w-28 py-1.5 px-3 bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 font-semibold rounded-xl border border-rose-200 dark:border-rose-800 text-xs hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Thử lại</span>
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          LOADING SKELETON (Matching Owner Preview Card Structure)
      ────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs animate-pulse"
            >
              <div className="h-36 w-full bg-slate-200 dark:bg-slate-800" />
              <div className="p-5 pt-0 space-y-3.5">
                <div className="-mt-10 flex items-end justify-between">
                  <div className="w-20 h-20 rounded-2xl bg-slate-300 dark:bg-slate-700 border-4 border-white dark:border-slate-900" />
                  <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                  <div className="h-3.5 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                </div>
                <div className="h-14 bg-slate-50 dark:bg-slate-800/40 rounded-xl" />
                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
                  <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          EMPTY STATE
      ────────────────────────────────────────────────────────── */}
      {!isLoading && !errorMessage && filteredOpenings.length === 0 && (
        <div className="p-12 text-center rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {t.candidate.noJobsFound}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              Không có đợt tuyển dụng nào khớp với bộ lọc &quot;{searchKeyword || selectedDept}&quot;. Vui lòng thử lại với từ khóa khác.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedDept('ALL');
              onSearchKeywordChange('');
              onRetry();
            }}
            className="shrink-0 w-36 py-2 px-4 mx-auto bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.candidate.resetFilters}</span>
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          SUCCESS JOB CARDS GRID (Harmonized with Owner Live Preview)
      ────────────────────────────────────────────────────────── */}
      {!isLoading && filteredOpenings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOpenings.map((job) => {
            return (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Cover Banner Header (Proportional & Anti-Distortion) */}
                  <div className="h-36 sm:h-40 w-full relative bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                    {job.organization_banner_url ? (
                      <img
                        src={job.organization_banner_url}
                        alt="Company Banner"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px] flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent pointer-events-none" />

                    {/* Banner Badges */}
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/15 shadow-2xs">
                        {t.candidate.hiringBadge}
                      </span>
                    </div>
                  </div>

                  {/* Elevated Floating Logo (Never Covered by Banner) */}
                  <div className="relative z-20 -mt-10 sm:-mt-11 px-5 flex items-end justify-between gap-3">
                    <div className="w-20 h-20 rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-xl ring-2 ring-black/5 dark:ring-white/10 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                      <div className="w-full h-full rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden p-1">
                        {job.organization_logo_url ? (
                          <img
                            src={job.organization_logo_url}
                            alt={job.organization_name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <CompanyLogo orgName={job.organization_name} size={60} />
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCompanyProfile(job)}
                      className="mb-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Xem hồ sơ công ty</span>
                    </button>
                  </div>

                  {/* Info Container */}
                  <div className="p-5 pt-3 relative space-y-3.5">
                    {/* Job Title & Company Name */}
                    <div>
                      <h4
                        onClick={() => setSelectedDetailJob(job)}
                        className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 cursor-pointer"
                        title={job.title}
                      >
                        {job.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={job.organization_name}>
                          {job.organization_name}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
                          <MatIcon
                            name={getDepartmentIcon({ name: job.department_name })}
                            size={13}
                            className="text-blue-600 dark:text-blue-400 shrink-0"
                          />
                          <span className="truncate">{job.department_name || 'Bộ Phận Tuyển Dụng'}</span>
                        </span>
                      </div>
                      {job.organization_tagline && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5 italic truncate" title={job.organization_tagline}>
                          &ldquo;{job.organization_tagline}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* 2x2 Specs Grid (Identical to Owner Live Preview) */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate" title={`Cấp bậc: ${job.level || 'Tất cả cấp bậc'}`}>
                        <MatIcon name="military_tech" size={14} className="text-amber-500 shrink-0" />
                        <span className="truncate">{job.level || 'Tất cả cấp bậc'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate" title={`Hình thức: ${job.work_type || 'Toàn thời gian'}`}>
                        <MatIcon name="schedule" size={14} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{job.work_type || 'Toàn thời gian'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate" title={`Mức lương: ${job.salary_range || 'Thỏa thuận'}`}>
                        <MatIcon name="payments" size={14} className="text-blue-500 shrink-0" />
                        <span className="truncate font-semibold text-emerald-600 dark:text-emerald-400">{job.salary_range || 'Thỏa thuận'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate" title={`Địa điểm: ${job.location || 'Tại văn phòng'}`}>
                        <MatIcon name="location_on" size={14} className="text-rose-500 shrink-0" />
                        <span className="truncate">{job.location || 'Tại văn phòng'}</span>
                      </div>
                    </div>

                    {/* Description Box (Identical to Owner Live Preview) */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 line-clamp-3">
                      {job.description || 'Chưa có thông tin giới thiệu công việc.'}
                    </p>
                  </div>
                </div>

                {/* Bottom: Date & Actions (Anti-Layout-Shift Compliant) */}
                <div className="p-5 pt-0">
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium truncate">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.candidate.postedDate} {new Date(job.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailJob(job)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        Chi Tiết
                      </button>

                      {(() => {
                        const existingApp = applications?.find((a) => a.opening_id === job.id);
                        const isRejected = existingApp
                          ? ['REJECTED', 'WITHDRAWN', 'CANCELLED', 'EXPIRED'].includes(existingApp.stage)
                          : false;

                        if (isRejected) {
                          return (
                            <span
                              className="shrink-0 w-36 h-8.5 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-bold text-xs truncate select-none"
                              title="Hồ sơ của bạn đã có kết quả dừng tuyển dụng ở vị trí này và không thể nộp lại. Bạn có thể ứng tuyển vào các vị trí khác của công ty."
                            >
                              <MatIcon name="block" size={14} className="shrink-0 text-rose-500" />
                              <span className="truncate">Đã Dừng Tuyển</span>
                            </span>
                          );
                        }

                        if (existingApp) {
                          return (
                            <button
                              type="button"
                              onClick={onViewApplications}
                              title="Bạn đã nộp hồ sơ vào vị trí này. Nhấn để xem tiến trình hồ sơ"
                              className="shrink-0 w-32 h-8.5 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-xs truncate cursor-pointer transition-colors"
                            >
                              <MatIcon name="check_circle" size={14} className="shrink-0 text-amber-600" />
                              <span className="truncate">Đã Nộp Hồ Sơ</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            type="button"
                            onClick={() => onApply(job)}
                            title={`Nộp hồ sơ ứng tuyển vị trí ${job.title}`}
                            className="shrink-0 w-32 h-8.5 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-2xs transition-all cursor-pointer truncate"
                          >
                            <span className="truncate">{t.candidate.applyNowBtn}</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          COMPANY & JOB DETAIL MODAL (Spacious & Screen-Responsive)
      ────────────────────────────────────────────────────────── */}
      {selectedDetailJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 overflow-hidden">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Cover Banner (Proportional & Anti-Distortion) */}
            <div className="h-48 sm:h-56 w-full relative bg-gradient-to-r from-neutral-950 via-slate-900 to-neutral-950 overflow-hidden shrink-0">
              {selectedDetailJob.organization_banner_url ? (
                <img
                  src={selectedDetailJob.organization_banner_url}
                  alt="Company Banner"
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full opacity-25 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px] flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-white/10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

              <button
                type="button"
                onClick={() => setSelectedDetailJob(null)}
                className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-lg"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Elevated Floating Logo & Verified Badge (Never Covered by Banner) */}
            <div className="relative z-20 -mt-12 sm:-mt-14 px-6 sm:px-8 flex items-end justify-between gap-4 shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1.5 bg-white dark:bg-neutral-900 shadow-2xl ring-4 ring-white dark:ring-neutral-900 shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-2xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center overflow-hidden p-2">
                  {selectedDetailJob.organization_logo_url ? (
                    <img
                      src={selectedDetailJob.organization_logo_url}
                      alt={selectedDetailJob.organization_name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <CompanyLogo orgName={selectedDetailJob.organization_name} size={64} />
                  )}
                </div>
              </div>

              <div className="mb-2 flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Doanh Nghiệp Đã Xác Minh</span>
                </span>
              </div>
            </div>

            {/* Modal Body: Spacious 2-Column Responsive Layout */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-3 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (Col 1-4): Company Details Card */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Company Profile Box */}
                  <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-3">
                    <div>
                      <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                        {selectedDetailJob.organization_name}
                      </h3>
                      {selectedDetailJob.organization_tagline && (
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 italic">
                          &ldquo;{selectedDetailJob.organization_tagline}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Company Specs List */}
                    <div className="space-y-2 text-xs pt-2 border-t border-neutral-200/70 dark:border-neutral-700/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-neutral-400 text-[11px]">Ngành nghề:</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
                          {selectedDetailJob.organization_industry || 'Công nghệ'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-neutral-400 text-[11px]">Quy mô:</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
                          {selectedDetailJob.organization_size || '500+ nhân sự'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-neutral-400 text-[11px]">Trụ sở:</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
                          {selectedDetailJob.organization_headquarters || 'Hà Nội'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-neutral-400 text-[11px]">Website:</span>
                        {selectedDetailJob.organization_website ? (
                          <a
                            href={selectedDetailJob.organization_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[150px]"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{selectedDetailJob.organization_website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        ) : (
                          <span className="text-neutral-400">Chưa cập nhật</span>
                        )}
                      </div>
                    </div>

                    {/* Company Description */}
                    {selectedDetailJob.organization_description && (
                      <div className="pt-2 border-t border-neutral-200/70 dark:border-neutral-700/60 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        <span className="font-bold text-neutral-900 dark:text-white block mb-1 text-[11px] uppercase tracking-wider">
                          Về Doanh Nghiệp
                        </span>
                        <p>{selectedDetailJob.organization_description}</p>
                      </div>
                    )}
                  </div>

                  {/* Key Job Quick Facts */}
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2.5">
                    <span className="font-bold text-neutral-900 dark:text-white block text-[11px] uppercase tracking-wider">
                      Thông Tin Công Việc
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                        <span className="text-neutral-400 text-[10px] block">Cấp bậc</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                          {selectedDetailJob.level || 'Tất cả'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                        <span className="text-neutral-400 text-[10px] block">Hình thức</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                          {selectedDetailJob.work_type || 'Toàn thời gian'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                        <span className="text-neutral-400 text-[10px] block">Mức lương</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                          {selectedDetailJob.salary_range || 'Thỏa thuận'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                        <span className="text-neutral-400 text-[10px] block">Địa điểm</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block" title={selectedDetailJob.location || undefined}>
                          {selectedDetailJob.location || 'Tại văn phòng'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (Col 5-12): Detailed Job Opening Breakdown */}
                <div className="lg:col-span-8 space-y-5">
                  {/* Job Title Header */}
                  <div className="space-y-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <MatIcon
                          name={getDepartmentIcon({ name: selectedDetailJob.department_name })}
                          size={14}
                          className="text-blue-600 dark:text-blue-400 shrink-0"
                        />
                        <span>{selectedDetailJob.department_name || 'Bộ Phận Tuyển Dụng'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Đang Tuyển Dụng</span>
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                      {selectedDetailJob.title}
                    </h2>
                  </div>

                  {/* Job Description */}
                  {selectedDetailJob.description && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Mô Tả Công Việc</span>
                      </h4>
                      <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                        {selectedDetailJob.description}
                      </div>
                    </div>
                  )}

                  {/* Job Requirements */}
                  {selectedDetailJob.requirements && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <MatIcon name="checklist" size={16} className="text-emerald-600" />
                        <span>Yêu Cầu Tuyển Dụng</span>
                      </h4>
                      <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                        {selectedDetailJob.requirements}
                      </div>
                    </div>
                  )}

                  {/* Benefits & Perks */}
                  {selectedDetailJob.benefits && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <MatIcon name="card_giftcard" size={16} className="text-purple-600" />
                        <span>Quyền Lợi & Đãi Ngộ</span>
                      </h4>
                      <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 text-xs sm:text-sm text-purple-950 dark:text-purple-200 whitespace-pre-wrap leading-relaxed">
                        {selectedDetailJob.benefits}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-8 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-900/70 shrink-0">
              <div className="hidden sm:block min-w-0">
                <span className="text-xs font-bold text-neutral-900 dark:text-white truncate block">
                  {selectedDetailJob.title}
                </span>
                <span className="text-[11px] text-neutral-500 truncate block">
                  {selectedDetailJob.organization_name}
                </span>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDetailJob(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                {(() => {
                  const detailApp = applications?.find((a) => a.opening_id === selectedDetailJob.id);
                  const isDetailRej = detailApp
                    ? ['REJECTED', 'WITHDRAWN', 'CANCELLED', 'EXPIRED'].includes(detailApp.stage)
                    : false;

                  if (isDetailRej) {
                    return (
                      <div
                        className="px-5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2 select-none"
                        title="Bạn đã từng ứng tuyển vào vị trí này và hồ sơ đã có kết quả dừng tuyển dụng. Không thể nộp lại vào cùng tin tuyển dụng."
                      >
                        <MatIcon name="block" size={16} className="text-rose-500 shrink-0" />
                        <span>Đã Dừng Tuyển Dụng (Không thể nộp lại)</span>
                      </div>
                    );
                  }

                  if (detailApp) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDetailJob(null);
                          if (onViewApplications) onViewApplications();
                        }}
                        className="px-5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                        title="Xem tiến trình hồ sơ đã nộp"
                      >
                        <MatIcon name="check_circle" size={16} className="text-amber-600 shrink-0" />
                        <span>Xem Tiến Trình Đã Nộp</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const job = selectedDetailJob;
                        setSelectedDetailJob(null);
                        onApply(job);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Nộp Hồ Sơ Ứng Tuyển Ngay</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          COMPANY PROFILE MODAL (Screen-Responsive & Anti-Distortion)
      ────────────────────────────────────────────────────────── */}
      {selectedCompanyProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 overflow-hidden">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Cover Banner */}
            <div className="h-44 sm:h-52 w-full relative bg-gradient-to-r from-neutral-950 via-slate-900 to-neutral-950 overflow-hidden shrink-0">
              {selectedCompanyProfile.organization_banner_url ? (
                <img
                  src={selectedCompanyProfile.organization_banner_url}
                  alt={selectedCompanyProfile.organization_name}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px] flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

              <button
                type="button"
                onClick={() => setSelectedCompanyProfile(null)}
                className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-lg"
                title="Đóng hồ sơ công ty"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Floating Logo & Verification */}
            <div className="relative z-20 -mt-12 sm:-mt-14 px-6 sm:px-8 flex items-end justify-between gap-4 shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1.5 bg-white dark:bg-neutral-900 shadow-2xl ring-4 ring-white dark:ring-neutral-900 shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-2xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center overflow-hidden p-2">
                  {selectedCompanyProfile.organization_logo_url ? (
                    <img
                      src={selectedCompanyProfile.organization_logo_url}
                      alt={selectedCompanyProfile.organization_name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <CompanyLogo orgName={selectedCompanyProfile.organization_name} size={64} />
                  )}
                </div>
              </div>

              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Doanh Nghiệp Đã Xác Minh</span>
              </span>
            </div>

            {/* Profile Content Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-4 space-y-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                  {selectedCompanyProfile.organization_name}
                </h3>
                {selectedCompanyProfile.organization_tagline && (
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1 italic">
                    &ldquo;{selectedCompanyProfile.organization_tagline}&rdquo;
                  </p>
                )}
              </div>

              {/* Company Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 block font-medium">Ngành nghề</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block mt-0.5">
                    {selectedCompanyProfile.organization_industry || 'Công nghệ phần mềm'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block font-medium">Quy mô</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block mt-0.5">
                    {selectedCompanyProfile.organization_size || '500+ nhân viên'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block font-medium">Trụ sở chính</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block mt-0.5">
                    {selectedCompanyProfile.organization_headquarters || 'Hà Nội'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block font-medium">Website</span>
                  {selectedCompanyProfile.organization_website ? (
                    <a
                      href={selectedCompanyProfile.organization_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate mt-0.5"
                    >
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="truncate">{selectedCompanyProfile.organization_website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ) : (
                    <span className="font-bold text-neutral-400 truncate block mt-0.5">Chưa cập nhật</span>
                  )}
                </div>
              </div>

              {/* About Description */}
              {selectedCompanyProfile.organization_description && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Giới Thiệu Về Doanh Nghiệp</span>
                  </h4>
                  <div className="p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {selectedCompanyProfile.organization_description}
                  </div>
                </div>
              )}

              {/* Active Openings from this Company */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Vị Trí Đang Tuyển Dụng Tại {selectedCompanyProfile.organization_name}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {openings
                    .filter(
                      (op) =>
                        op.organization_name === selectedCompanyProfile.organization_name ||
                        op.organization_id === selectedCompanyProfile.organization_id
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3 shadow-2xs hover:border-blue-400 dark:hover:border-blue-700 transition-all"
                      >
                        <div className="min-w-0">
                          <h5 className="text-xs font-extrabold text-neutral-900 dark:text-white truncate">
                            {item.title}
                          </h5>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                            {item.work_type || 'Toàn thời gian'} • {item.salary_range || 'Thỏa thuận'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompanyProfile(null);
                            setSelectedDetailJob(item);
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Chi Tiết
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:px-8 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3 bg-neutral-50/70 dark:bg-neutral-900/70 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCompanyProfile(null)}
                className="px-5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
