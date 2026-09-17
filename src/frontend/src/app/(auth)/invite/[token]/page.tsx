'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, MailCheck } from 'lucide-react';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const router = useRouter();

  useEffect(() => {
    if (token) {
      router.replace(`/register?invite_token=${encodeURIComponent(token)}`);
    }
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8FC] text-slate-900 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
          <MailCheck className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Đang xác thực Thư mời...</h1>
        <p className="text-slate-500 text-xs leading-relaxed">
          Đang chuyển hướng bạn tới biểu mẫu kích hoạt tài khoản doanh nghiệp.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-blue-600 font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Vui lòng chờ trong giây lát...</span>
        </div>
        <div className="pt-2">
          <Link
            href={`/register?invite_token=${encodeURIComponent(token)}`}
            className="text-xs font-bold text-slate-500 hover:text-blue-600 hover:underline"
          >
            Nhấn vào đây nếu không tự động chuyển hướng
          </Link>
        </div>
      </div>
    </div>
  );
}
