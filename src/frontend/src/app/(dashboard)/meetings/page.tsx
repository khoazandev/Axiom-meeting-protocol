'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function MeetingsRedirectPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    const role = user?.role;
    if (role === 'OWNER' || role === 'ADMIN') {
      router.replace('/admin');
    } else if (role === 'MANAGER') {
      router.replace('/manager');
    } else {
      router.replace('/member?tab=meetings');
    }
  }, [user, token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8FC] dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Đang chuyển tiếp tới bàn làm việc...</p>
      </div>
    </div>
  );
}
