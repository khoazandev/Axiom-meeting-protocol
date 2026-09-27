'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { candidateApi, RecruitmentApplication } from '@/lib/recruitment-api';
import { useCandidateStore } from '@/lib/store/useCandidateStore';
import {
  FileText,
  Video,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronRight,
  Briefcase,
  UserX,
  Sparkles,
} from 'lucide-react';

const STAGE_PROGRESS_STEPS = [
  { key: 'INVITED', label: 'Tiếp Nhận', desc: 'Đã nhận hồ sơ' },
  { key: 'ASSESSMENT_PENDING', label: 'Đánh Giá', desc: 'Làm bài kiểm tra' },
  { key: 'INTERVIEW_SCHEDULED', label: 'Phỏng Vấn', desc: 'Phỏng vấn kỹ thuật' },
  { key: 'HR_REVIEW_PENDING', label: 'Thẩm Tuyển', desc: 'HR & Leader thẩm định' },
  { key: 'APPROVED', label: 'Hoàn Tất', desc: 'Phê duyệt & gia nhập' },
];

function getStageStepIndex(stage: string): number {
  switch (stage) {
    case 'INVITED':
      return 0;
    case 'ASSESSMENT_PENDING':
    case 'ASSESSMENT_SUBMITTED':
      return 1;
    case 'INTERVIEW_SCHEDULED':
    case 'INTERVIEW_COMPLETED':
      return 2;
    case 'HR_REVIEW_PENDING':
    case 'OWNER_APPROVAL_PENDING':
      return 3;
    case 'APPROVED':
    case 'ONBOARDING_OFFERED':
    case 'HIRED':
      return 4;
    default:
      return 0;
  }
}

export default function CandidateApplicationPage() {
  const router = useRouter();
  const { token, clearCandidateSession } = useCandidateStore();

  const [application, setApplication] = useState<RecruitmentApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    let ignore = false;

    if (!token) {
      router.replace('/login');
      return;
    }

    candidateApi
      .getMe(token)
      .then((data) => {
        if (!ignore) {
          setApplication(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          console.error(err);
          setError('Không thể tải thông tin hồ sơ ứng viên. Phiên làm việc có thể đã hết hạn.');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [token, router]);

  const handleWithdraw = async () => {
    if (!token) return;
    setWithdrawing(true);
    try {
      const updated = await candidateApi.withdraw(token);
      setApplication(updated);
      setWithdrawModalOpen(false);
    } catch (err: unknown) {
      console.error(err);
      alert('Không thể rút hồ sơ lúc này. Vui lòng thử lại sau.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500">Đang tải hồ sơ ứng tuyển của bạn...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-center shadow-md">
        <AlertCircle size={32} className="text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Lỗi Tải Hồ Sơ</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{error}</p>
        <button
          type="button"
          onClick={() => {
            clearCandidateSession();
            router.push('/login');
          }}
          className="mt-5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          Quay lại trang Đăng nhập
        </button>
      </div>
    );
  }

  const currentStep = getStageStepIndex(application.stage);
  const isTerminal = ['REJECTED', 'WITHDRAWN', 'EXPIRED', 'CANCELLED'].includes(application.stage);
  const activeAttempt = application.assessment_attempts?.[0];
  const activeInterview = application.interview_sessions?.[0];
  const opening = application.opening || application.job_opening;

  return (
    <div className="space-y-6">
      {/* ── 1. Application Banner ── */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-100 text-xs font-medium">
              <Briefcase size={14} />
              <span>{opening?.department?.name || 'Khối Kỹ Thuật'}</span>
              <span>•</span>
              <span className="font-mono">ID: {application.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1 text-white">
              {opening?.title || 'Vị Trí Tuyển Dụng'}
            </h1>
            <p className="text-xs text-blue-100/90 mt-1">
              Ứng viên: <strong className="text-white">{application.candidate?.full_name}</strong> ({application.candidate?.email})
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white uppercase tracking-wider">
              {application.stage}
            </span>
            <span className="text-[11px] text-blue-100">
              Cập nhật: {new Date(application.updated_at).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Progress Tracker ── */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
          Tiến Độ Tuyển Dụng & Đánh Giá
        </h2>

        {isTerminal ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <AlertCircle size={20} className="text-amber-500 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Hồ sơ ở trạng thái kết thúc: {application.stage}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cảm ơn bạn đã quan tâm ứng tuyển tại công ty. Thông tin hồ sơ được bảo lưu và bảo mật theo quy định bảo vệ dữ liệu.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {STAGE_PROGRESS_STEPS.map((step, idx) => {
                const isPassed = idx < currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div
                    key={step.key}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 shadow-xs'
                        : isPassed
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isPassed
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 size={14} /> : idx + 1}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {step.label}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Active Action Callouts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assessment Card */}
        {application.stage === 'ASSESSMENT_PENDING' && activeAttempt && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-500/80 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                <FileText size={16} />
                <span>Nhiệm vụ cần thực hiện</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bài Đánh Giá Năng Lực Trực Tuyến
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Bài kiểm tra kiến thức chuyên môn và tư duy xử lý vấn đề dành cho vị trí ứng tuyển. Vui lòng hoàn thành để hệ thống tổng hợp báo cáo đánh giá.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Trạng thái: Chưa nộp</span>
              <Link
                href={`/candidate/assessments/${activeAttempt.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all"
              >
                <span>Bắt Đầu Làm Bài</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {application.stage === 'ASSESSMENT_SUBMITTED' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 size={16} />
                <span>Đã nộp bài đánh giá</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Đang Chờ Phân Tích & Phỏng Vấn
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Hệ thống đã ghi nhận bài làm của bạn. Bộ phận tuyển dụng sẽ sớm liên hệ hoặc lên lịch phỏng vấn chuyên sâu.
              </p>
            </div>
            {activeAttempt?.score !== null && activeAttempt?.score !== undefined && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Điểm số ghi nhận: <span className="text-blue-600 font-bold">{activeAttempt.score}/100</span>
              </div>
            )}
          </div>
        )}

        {/* Interview Card */}
        {application.stage === 'INTERVIEW_SCHEDULED' && activeInterview && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/80 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Video size={16} />
                <span>Phỏng vấn kỹ thuật trực tuyến</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tham Gia Phòng Phỏng Vấn LiveKit
              </h3>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-500" />
                  <span>Bắt đầu: {new Date(activeInterview.scheduled_at).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-indigo-500" />
                  <span>Dự kiến: {new Date(new Date(activeInterview.scheduled_at).getTime() + 45 * 60000).toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Yêu cầu cấp quyền AI & Audio</span>
              <Link
                href={`/candidate/interviews/${activeInterview.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all"
              >
                <span>Vào Phòng Phỏng Vấn</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Hired / Onboarding Offered Card */}
        {(application.stage === 'ONBOARDING_INVITED' || application.stage === 'HIRED') && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/80 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles size={16} />
                <span>Chúc mừng bạn!</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Chào Mừng Bạn Đến Với Axiom
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Hồ sơ ứng tuyển của bạn đã được Ban Lãnh Đạo phê duyệt chính thức. Bạn đã sẵn sàng để bắt đầu hành trình mới cùng đội ngũ!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Candidate Details & Self-Service Withdrawal ── */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Thông Tin Ứng Tuyển & Quyền Riêng Tư
          </h2>
          {!isTerminal && (
            <button
              type="button"
              onClick={() => setWithdrawModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <UserX size={14} />
              <span>Rút hồ sơ ứng tuyển</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">Họ và tên</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {application.candidate?.full_name || 'N/A'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">Email liên hệ</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {application.candidate?.email || 'N/A'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">Số điện thoại</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {application.candidate?.phone || 'Chưa cung cấp'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 leading-relaxed">
          * Dữ liệu cá nhân của bạn được mã hóa và tự động áp dụng chính sách lưu trữ / xóa định kỳ (PII Redaction) theo tiêu chuẩn bảo mật sau khi quy trình tuyển dụng kết thúc.
        </p>
      </div>

      {/* Withdraw Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Xác Nhận Rút Hồ Sơ Ứng Tuyển
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Bạn có chắc chắn muốn rút hồ sơ ứng tuyển vị trí này? Thao tác này là không thể hoàn tác và toàn bộ bài đánh giá hoặc lịch phỏng vấn sẽ bị hủy bỏ.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setWithdrawModalOpen(false)}
                disabled={withdrawing}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
              >
                {withdrawing ? 'Đang xử lý...' : 'Xác Nhận Rút'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
