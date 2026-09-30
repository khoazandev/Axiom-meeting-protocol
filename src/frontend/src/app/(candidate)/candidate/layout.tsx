'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/lib/store/useCandidateStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import Logo from '@/components/Logo';
import { Briefcase, CheckCircle2, LogOut, Sparkles, LogIn } from 'lucide-react';

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const { application, clearCandidateSession } = useCandidateStore();
  const { user: authUser, logout: authLogout } = useAuthStore();

  const hasIdentity = Boolean(authUser || application?.candidate);
  const candidateName = authUser?.full_name || application?.candidate?.full_name || '';
  const candidateRole = authUser?.job_title || '';

  const handleLogout = () => {
    clearCandidateSession();
    authLogout();
    router.push('/login');
  };

  const navLinks = [
    {
      id: 'jobs',
      label: 'Cơ Hội Việc Làm',
      href: '/candidate/discovery?tab=jobs',
      icon: Briefcase,
    },
    {
      id: 'cv',
      label: 'Canva CV Studio',
      href: '/candidate/discovery?tab=cv',
      icon: Sparkles,
    },
    {
      id: 'applications',
      label: 'Hồ Sơ Đã Nộp',
      href: '/candidate/discovery?tab=applications',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Candidate Portal Minimalist Navigation Bar */}
      <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/candidate/discovery" className="flex items-center gap-2">
              <Logo size={28} showText={true} subtitle="CANDIDATE" />
            </Link>

            <nav className="hidden md:flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-6">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {hasIdentity ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {candidateName ? candidateName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden sm:block max-w-[140px]">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate text-xs" title={candidateName}>
                      {candidateName}
                    </div>
                    {candidateRole && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none truncate" title={candidateRole}>
                        {candidateRole}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="shrink-0 w-24 py-1.5 px-2.5 text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 truncate"
                  title="Đăng xuất khỏi tài khoản"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Thoát</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="shrink-0 w-28 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs text-center transition-all flex items-center justify-center gap-1.5 truncate"
                title="Đăng nhập tài khoản"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Suspense fallback={<div className="py-20 text-center text-xs text-slate-400">Đang tải...</div>}>
          {children}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <p>© 2026 Axiom Protocol • Nền tảng tuyển dụng thông minh On-Premise kết hợp AI Đánh giá CV & Phỏng vấn</p>
      </footer>
    </div>
  );
}
