'use client';

import { TopNavbar } from '@/components/layout/top-navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <TopNavbar />
      <main className="px-6 py-6 md:px-8 md:py-8">
        <div className="max-w-6xl mx-auto space-y-6">{children}</div>
      </main>
    </div>
  );
}
