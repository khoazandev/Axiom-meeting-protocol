'use client';

import React from 'react';
import {
  FileText,
  AlertCircle,
  RefreshCw,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { CandidateApplication } from '@/lib/recruitment-api';

export interface CandidateApplicationsPanelProps {
  applications: CandidateApplication[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onNavigateToMeeting?: (meetingId: string) => void;
  onNavigateToAssessment?: (applicationId: string) => void;
  onGoToJobs?: () => void;
}

export function CandidateApplicationsPanel({
  applications,
  isLoading,
  errorMessage,
  onRetry,
  onNavigateToMeeting,
  onNavigateToAssessment,
  onGoToJobs,
}: CandidateApplicationsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Tiến Trình Ứng Tuyển Của Bạn
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi trạng thái duyệt hồ sơ, làm bài kiểm tra năng lực và tham gia phỏng vấn trực tuyến.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={isLoading}
          className="shrink-0 w-36 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          title="Làm mới danh sách hồ sơ ứng tuyển"
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="truncate">Làm mới</span>
        </button>
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
            title="Thử tải lại hồ sơ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="truncate">Thử lại</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-xl w-36" />
              </div>
              <div className="h-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl w-full" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-28" />
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-36" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && applications.length === 0 && (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Bạn chưa nộp hồ sơ nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy khám phá các vị trí tuyển dụng đang mở và nộp hồ sơ để bắt đầu ứng tuyển.
          </p>
          {onGoToJobs && (
            <button
              type="button"
              onClick={onGoToJobs}
              className="shrink-0 w-44 mx-auto mt-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer truncate"
              title="Khám phá việc làm"
            >
              Khám phá việc làm ngay
            </button>
          )}
        </div>
      )}

      {/* Applications List */}
      {!isLoading && applications.length > 0 && (
        <div className="space-y-4">
          {applications.map((app) => {
            const isApproved =
              app.stage === 'APPROVED' || app.stage === 'ONBOARDING_INVITED' || app.stage === 'HIRED';
            const isRejected = app.stage === 'REJECTED';

            return (
              <div
                key={app.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                        {app.organization_name}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-medium">{app.department_name || 'Bộ phận kỹ thuật'}</span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {app.opening_title}
                    </h3>
                  </div>

                  {/* Status Badge (Fixed width per UI rule) */}
                  <div className="shrink-0 w-44">
                    <span
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold text-center block truncate ${
                        isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : isRejected
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}
                      title={`Trạng thái: ${app.stage}`}
                    >
                      {app.stage === 'INVITED' && 'Vòng 1: Đang duyệt CV'}
                      {app.stage === 'ASSESSMENT_PENDING' && 'Vòng 2: Chờ làm bài test'}
                      {app.stage === 'ASSESSMENT_SUBMITTED' && 'Vòng 2: Đã nộp bài test'}
                      {app.stage === 'INTERVIEW_SCHEDULED' && 'Vòng 3: Đã lên lịch phỏng vấn'}
                      {app.stage === 'INTERVIEW_COMPLETED' && 'Vòng 3: Hoàn thành phỏng vấn'}
                      {app.stage === 'HR_REVIEW_PENDING' && 'Chờ Trưởng phòng duyệt'}
                      {app.stage === 'OWNER_APPROVAL_PENDING' && 'Chờ Giám đốc duyệt'}
                      {isApproved && 'Đã Chấp Thuận'}
                      {isRejected && 'Chưa Phù Hợp'}
                      {!['INVITED', 'ASSESSMENT_PENDING', 'ASSESSMENT_SUBMITTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'HR_REVIEW_PENDING', 'OWNER_APPROVAL_PENDING', 'APPROVED', 'ONBOARDING_INVITED', 'HIRED', 'REJECTED'].includes(app.stage) && app.stage}
                    </span>
                  </div>
                </div>

                {/* 4-Stage Visual Progress Bar */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
                    <div className="space-y-1">
                      <div className="w-6 h-6 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">1. Nộp CV</span>
                    </div>

                    <div className="space-y-1">
                      <div
                        className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold ${
                          app.assessment_status === 'COMPLETED'
                            ? 'bg-emerald-600 text-white'
                            : app.stage === 'ASSESSMENT_PENDING'
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {app.assessment_status === 'COMPLETED' ? '✓' : '2'}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">2. Test Năng Lực</span>
                      {app.assessment_score !== null && app.assessment_score !== undefined && (
                        <div className="text-[10px] text-emerald-600 font-bold">{app.assessment_score} đ</div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div
                        className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold ${
                          app.interview_status === 'COMPLETED'
                            ? 'bg-emerald-600 text-white'
                            : app.stage === 'INTERVIEW_SCHEDULED'
                            ? 'bg-blue-600 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {app.interview_status === 'COMPLETED' ? '✓' : '3'}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">3. Phỏng Vấn</span>
                    </div>

                    <div className="space-y-1">
                      <div
                        className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isApproved
                            ? 'bg-emerald-600 text-white'
                            : isRejected
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isApproved ? '✓' : '4'}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">4. Giám Đốc Duyệt</span>
                    </div>
                  </div>
                </div>

                {/* Action Triggers */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Nộp ngày: {app.created_at ? new Date(app.created_at).toLocaleDateString('vi-VN') : '---'}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Interview Room CTA */}
                    {app.interview_meeting_id && onNavigateToMeeting && (
                      <button
                        type="button"
                        onClick={() => onNavigateToMeeting(app.interview_meeting_id!)}
                        className="shrink-0 w-48 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Vào phòng phỏng vấn trực tuyến"
                      >
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Vào phòng phỏng vấn</span>
                      </button>
                    )}

                    {/* Test CTA */}
                    {app.requires_assessment && app.assessment_status !== 'COMPLETED' && onNavigateToAssessment && (
                      <button
                        type="button"
                        onClick={() => onNavigateToAssessment(app.id)}
                        className="shrink-0 w-44 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Làm bài kiểm tra năng lực"
                      >
                        <span className="truncate">Làm bài kiểm tra</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
