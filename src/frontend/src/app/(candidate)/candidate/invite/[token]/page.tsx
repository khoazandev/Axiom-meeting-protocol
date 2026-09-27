'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { candidateApi } from '@/lib/recruitment-api';
import { useCandidateStore } from '@/lib/store/useCandidateStore';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CandidateInviteExchangePage() {
  const params = useParams();
  const router = useRouter();
  const { setCandidateSession, setApplication } = useCandidateStore();

  const rawToken = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';

  const [loading, setLoading] = useState(Boolean(rawToken));
  const [errorMessage, setErrorMessage] = useState<string | null>(
    rawToken ? null : 'Mã liên kết tuyển dụng không hợp lệ.'
  );

  useEffect(() => {
    let ignore = false;

    if (!rawToken) return;

    candidateApi
      .exchangeSession(rawToken)
      .then(async (session) => {
        if (ignore) return;
        setCandidateSession({
          token: session.access_token,
          applicationId: session.application_id,
          candidateId: session.candidate_id,
          expiresIn: session.expires_in,
        });

        // Optionally pre-fetch candidate profile
        try {
          const app = await candidateApi.getMe(session.access_token);
          if (!ignore) {
            setApplication(app);
          }
        } catch {
          // If getMe fails, we will still navigate and load it there
        }

        if (!ignore) {
          // Replace browser history so token is scrubbed from URL
          router.replace('/candidate/applications');
        }
      })
      .catch((err: unknown) => {
        if (ignore) return;
        console.error('Failed to exchange candidate session', err);
        setErrorMessage(
          'Liên kết tuyển dụng không hợp lệ, đã bị hủy hoặc đã hết thời gian hiệu lực. Vui lòng liên hệ bộ phận tuyển dụng để được hỗ trợ.'
        );
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [rawToken, router, setCandidateSession, setApplication]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
          <Loader2 size={28} className="animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Đang xác thực liên kết ứng tuyển...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Hệ thống đang kiểm tra chữ ký bảo mật và thiết lập phiên làm việc ứng viên an toàn.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="max-w-md w-full p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-lg">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-base font-black text-slate-900 dark:text-white">
          Không Thể Truy Cập Hồ Sơ Ứng Tuyển
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
          {errorMessage}
        </p>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Quay về trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
