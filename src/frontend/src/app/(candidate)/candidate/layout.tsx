'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/lib/store/useCandidateStore';
import Logo from '@/components/Logo';
import { LogOut, UserCheck } from 'lucide-react';

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { token, application, clearCandidateSession } = useCandidateStore();

  const handleLogout = () => {
    clearCandidateSession();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Candidate Portal Minimalist Navigation Bar */}
      <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/candidate/applications" className="flex items-center gap-2">
              <Logo size={28} showText={true} subtitle="CANDIDATE" />
            </Link>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Cổng Tuyển Dụng & Phỏng Vấn
            </span>
          </div>

          {token && (
            <div className="flex items-center gap-3">
              {application?.candidate && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                  <UserCheck size={14} className="text-emerald-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                    {application.candidate.full_name}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                title="Đăng xuất khỏi phiên ứng viên"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Rời khỏi</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <p>© 2026 Axiom Protocol • Quy trình tuyển dụng & đánh giá năng lực bảo mật</p>
      </footer>
    </div>
  );
}
