'use client';

import React from 'react';
import { Search, Briefcase, Building2, Sparkles, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { PublicJobOpening } from '@/lib/recruitment-api';

export interface CandidateJobsPanelProps {
  openings: PublicJobOpening[];
  isLoading: boolean;
  errorMessage: string | null;
  searchKeyword: string;
  onSearchKeywordChange: (value: string) => void;
  onSearch: () => void;
  onApply: (opening: PublicJobOpening) => void;
  onRetry: () => void;
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
}: CandidateJobsPanelProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => onSearchKeywordChange(e.target.value)}
              placeholder="Tìm kiếm vị trí tuyển dụng, chuyên môn (vd: Fullstack, AI, DevOps...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            title="Tìm kiếm cơ hội việc làm"
            className="shrink-0 w-36 h-10 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tìm Kiếm</span>
          </button>
        </form>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4 text-rose-700 dark:text-rose-300 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 w-28 py-1.5 px-3 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-semibold rounded-lg border border-rose-200 dark:border-rose-800 text-xs hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="truncate">Thử lại</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-3"
            >
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2" />
              <div className="h-14 bg-slate-50 dark:bg-slate-800/40 rounded-lg w-full" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && openings.length === 0 && (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Chưa có vị trí tuyển dụng nào phù hợp
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Hiện chưa có đợt tuyển dụng nào mở hoặc từ khóa tìm kiếm không khớp. Vui lòng thử lại sau.
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 w-32 py-2 px-4 mx-auto bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
        </div>
      )}

      {/* Success Cards Grid */}
      {!isLoading && openings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openings.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate" title={job.title}>
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 truncate" title={job.organization_name}>
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{job.organization_name}</span>
                      </span>
                      <span>•</span>
                      <span className="truncate text-blue-600 dark:text-blue-400 font-semibold" title={job.department_name}>
                        {job.department_name}
                      </span>
                    </div>
                  </div>
                  {job.requires_assessment && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                      Bài Test
                    </span>
                  )}
                </div>

                {job.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                )}

                {job.requirements && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Yêu cầu: </span>
                    {job.requirements}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400">
                  Đăng: {new Date(job.created_at).toLocaleDateString('vi-VN')}
                </span>
                <button
                  type="button"
                  onClick={() => onApply(job)}
                  title={`Ứng tuyển vị trí ${job.title}`}
                  className="shrink-0 w-36 h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="truncate">Ứng Tuyển</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
