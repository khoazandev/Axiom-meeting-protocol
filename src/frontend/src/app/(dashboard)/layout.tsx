'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { authApi, workspaceApi } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, setAuth } = useAuthStore();
  const [hydrating, setHydrating] = useState(!user && !!token);

  useEffect(() => {
    // If token exists but user state is empty (page reload), re-hydrate from API
    if (token && !user) {
      (async () => {
        try {
          const [me, workspaces] = await Promise.all([authApi.me(), workspaceApi.list()]);
          setAuth(me, token, workspaces, workspaces[0]);
        } catch {
          // Token is invalid/expired — clear and redirect to login
          useAuthStore.getState().logout();
          router.push('/login');
        } finally {
          setHydrating(false);
        }
      })();
    } else if (!token) {
      router.push('/login');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <TopNavbar />
      <main className="px-6 py-6 md:px-8 md:py-8">
        <div className="max-w-6xl mx-auto space-y-6">{children}</div>
      </main>
    </div>
  );
}
