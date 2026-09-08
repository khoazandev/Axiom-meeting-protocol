'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JiraBacklogPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/member?tab=jira');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">
          Đang chuyển hướng sang Mini Jira (/member?tab=jira)...
        </p>
      </div>
    </div>
  );
}
