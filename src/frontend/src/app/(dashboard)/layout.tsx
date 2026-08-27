'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
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

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      suppressHydrationWarning
    >
      {!mounted || !ready ? (
        <div className="flex items-center justify-center h-screen">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset className="flex flex-col min-h-screen overflow-x-hidden">
            <Header />
            {isJira ? (
              <div className="flex-1 w-full overflow-hidden flex flex-col">{children}</div>
            ) : (
              <main className="px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 flex-1">
                <div className="max-w-7xl mx-auto space-y-6">{children}</div>
              </main>
            )}
          </SidebarInset>
        </SidebarProvider>
      )}
    </div>
  );
}
