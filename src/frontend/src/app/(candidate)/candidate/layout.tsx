'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/lib/store/useCandidateStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useThemeStore } from '@/lib/store/useThemeStore';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import Logo from '@/components/Logo';
import { LogOut, LogIn, Sun, Moon, Video, Link2, X, Plus } from 'lucide-react';
import { NotificationBell } from '@/components/ui/NotificationBell';

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { application, clearCandidateSession } = useCandidateStore();
  const { user: authUser, logout: authLogout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { t } = useLanguageStore();

  const [showJoinMeetingModal, setShowJoinMeetingModal] = useState(false);
  const [meetingInput, setMeetingInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const hasIdentity = Boolean(authUser || application?.candidate);
  const candidateName = authUser?.full_name || application?.candidate?.full_name || '';
  const candidateRole = authUser?.job_title || '';

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const raw = meetingInput.trim();
    if (!raw) {
      setJoinError('Vui lòng nhập đường link hoặc mã phòng họp');
      return;
    }
    // Extract meeting ID if full URL pasted
    let meetingId = raw;
    if (raw.includes('/meetings/')) {
      const parts = raw.split('/meetings/');
      meetingId = parts[parts.length - 1].split('?')[0].split('#')[0].trim();
    } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
      try {
        const url = new URL(raw);
        const segments = url.pathname.split('/').filter(Boolean);
        meetingId = segments[segments.length - 1] || raw;
      } catch {
        meetingId = raw;
      }
    }
    if (!meetingId) {
      setJoinError('Định dạng liên kết hoặc mã phòng không hợp lệ');
      return;
    }
    setShowJoinMeetingModal(false);
    setMeetingInput('');
    router.push(`/meetings/${meetingId}`);
  };

  const handleLogout = () => {
    clearCandidateSession();
    authLogout();
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 flex flex-col font-sans antialiased selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Candidate Portal Minimalist Monochrome Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-black/90 backdrop-blur-md border-b border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/candidate/discovery" className="flex items-center gap-2 group">
              <Logo size={28} showText={true} subtitle="CANDIDATE" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark / Light Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600" />
              )}
            </button>

            {/* Realtime Notification Bell */}
            <NotificationBell />

            {/* Join Meeting via Link or Room Code */}
            <button
              type="button"
              onClick={() => setShowJoinMeetingModal(true)}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Tham gia cuộc họp trực tuyến qua đường link hoặc mã phòng"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tham Gia Họp</span>
            </button>

            {hasIdentity ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {candidateName ? candidateName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden sm:block max-w-[140px]">
                    <div
                      className="font-semibold text-neutral-900 dark:text-neutral-100 truncate text-xs"
                      title={candidateName}
                    >
                      {candidateName}
                    </div>
                    {candidateRole && (
                      <div
                        className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium leading-none truncate"
                        title={candidateRole}
                      >
                        {candidateRole}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="shrink-0 w-24 py-1.5 px-2.5 text-xs font-medium text-neutral-600 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 truncate"
                  title={t.nav.logout}
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.nav.exit}</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="shrink-0 w-28 py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-bold text-xs shadow-xs text-center transition-all flex items-center justify-center gap-1.5 truncate"
                title={t.nav.login}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.nav.login}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 relative isolate">
        <Suspense
          fallback={<div className="py-20 text-center text-xs text-neutral-400">Đang tải...</div>}
        >
          {children}
        </Suspense>
      </main>

      {/* Join Meeting Modal */}
      {showJoinMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                <span>Tham Gia Cuộc Họp Trực Tuyến</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowJoinMeetingModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              Dán liên kết cuộc họp (URL) hoặc nhập mã phòng phỏng vấn do Axiom cung cấp để vào phòng họp ngay lập tức.
            </p>

            <form onSubmit={handleJoinMeeting} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Đường dẫn cuộc họp hoặc Mã phòng:
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={meetingInput}
                    onChange={(e) => setMeetingInput(e.target.value)}
                    placeholder="https://.../meetings/abc-123 hoặc abc-123"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {joinError && (
                <p className="text-[11px] text-rose-500 font-semibold">{joinError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinMeetingModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Vào Phòng Họp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="w-full border-t border-neutral-200/90 dark:border-neutral-800 py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
        <p>
          © 2026 Axiom Protocol • Nền tảng tuyển dụng thông minh On-Premise kết hợp AI Đánh giá CV &amp; Phỏng vấn
        </p>
      </footer>
    </div>
  );
}
