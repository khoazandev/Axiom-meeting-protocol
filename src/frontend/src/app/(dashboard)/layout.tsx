'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { authApi, organizationApi } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMounted(true);

    const { user, token, setAuth } = useAuthStore.getState();

    if (!token) {
      router.push('/login');
      return;
    }

    if (user) {
      setReady(true);
      return;
    }

    (async () => {
      try {
        const [me, organizations] = await Promise.all([authApi.me(), organizationApi.list()]);
        setAuth(me, token, organizations, organizations[0]);
        setReady(true);
      } catch (err) {
        useAuthStore.getState().logout();
        router.push('/login');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isJira = pathname.startsWith('/jira');

  // Single root div — prevents hydration mismatch from differing root elements
  return (
    <div
      className="min-h-screen bg-bg-base text-text-primary flex flex-col"
      suppressHydrationWarning
    >
      {!mounted || !ready ? (
        <div className="flex items-center justify-center h-screen">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <TopNavbar />
          {isJira ? (
            <div className="flex-1 w-full overflow-hidden flex flex-col">{children}</div>
          ) : (
            <main className="px-6 py-6 md:px-8 md:py-8 flex-1">
              <div className="max-w-6xl mx-auto space-y-6">{children}</div>
            </main>
          )}
        </>
      )}
    </div>
  );
}
