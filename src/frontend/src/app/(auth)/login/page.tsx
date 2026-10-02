'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { authApi, organizationApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import Logo from '@/components/Logo';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import AuthLivelyStage from '@/components/auth/AuthLivelyStage';
import { useThemeStore } from '@/lib/store/useThemeStore';
import { Sun, Moon, Sparkles, CheckCircle2, ShieldCheck, Mail, ArrowRight } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useLanguageStore();
  const { theme, setTheme } = useThemeStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLoginProcessing, setMagicLoginProcessing] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Check 1-click magic login token from Gmail
  useEffect(() => {
    const magicToken = searchParams.get('magic_token');
    const emailParam = searchParams.get('email');

    if (emailParam) {
      setEmail(emailParam);
    }

    if (magicToken) {
      async function executeMagicLogin() {
        try {
          setMagicLoginProcessing(true);
          setError(null);
          const tokens = await authApi.magicLogin(magicToken!, emailParam || undefined);
          useAuthStore.setState({ token: tokens.access_token });
          const user = await authApi.me();
          const organizations = await organizationApi.list();
          setAuth(user, tokens.access_token, organizations, organizations[0] || null);

          const role = (user.role ?? '').toUpperCase();
          if (role === 'OWNER' || role === 'ADMIN') {
            router.push('/admin');
          } else if (role === 'MANAGER') {
            router.push('/manager');
          } else {
            router.push('/member');
          }
        } catch (err: unknown) {
          setError(
            err instanceof Error
              ? err.message
              : 'Liên kết đăng nhập nhanh không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập bằng mật khẩu.'
          );
        } finally {
          setMagicLoginProcessing(false);
        }
      }
      executeMagicLogin();
    }
  }, [searchParams, router, setAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tokens = await authApi.login(email, password);
      useAuthStore.setState({ token: tokens.access_token });
      const user = await authApi.me();
      const organizations = await organizationApi.list();
      setAuth(user, tokens.access_token, organizations, organizations[0] || null);
      const role = (user.role ?? '').toUpperCase();
      if (role === 'OWNER' || role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'MANAGER') {
        router.push('/manager');
      } else if (role === 'MEMBER') {
        router.push('/member');
      } else {
        router.push('/member');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.auth.loginError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-black text-slate-900 dark:text-neutral-100 flex flex-col justify-between relative overflow-hidden selection:bg-[#4F7BF7]/20 transition-colors">
      {/* Background Dot Matrix Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#262626_1.2px,transparent_1.2px)] [background-size:24px_24px] pointer-events-none opacity-70" />

      {/* Ambient Glowing Orbs */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-gradient-to-br from-blue-300/20 via-indigo-200/10 to-transparent blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-gradient-to-tl from-emerald-200/20 via-cyan-100/10 to-transparent blur-3xl rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo size={34} showText={true} subtitle="DX-OS" />
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:border-slate-300 dark:hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-600" />
            )}
          </button>

          <Link
            href="/#careers-portal"
            className="text-[12.5px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <span>Cơ Hội Việc Làm</span>
          </Link>
          <Link
            href="/docs"
            className="text-[12.5px] font-medium text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-neutral-800 transition-colors"
          >
            {t.nav.docs}
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-neutral-800 transition-colors"
          >
            <MaterialIcon name="arrow_back" className="w-3.5 h-3.5" />
            <span>{(t.auth as any).backToHome || 'Về trang chủ'}</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Stage */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#4F7BF7] text-xs font-semibold tracking-wide">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AXIOM DIGITAL ENTERPRISE OS</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 dark:text-white leading-[1.2] tracking-tight">
              Cổng Điều Hành Nội Bộ
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#4F7BF7] via-indigo-500 to-emerald-500 mt-1">
                Bảo Mật & Tự Chủ Dữ Liệu
              </span>
            </h1>

            <p className="mt-3 text-slate-600 dark:text-neutral-400 text-sm max-w-lg leading-relaxed">
              Hệ thống dành riêng cho nhân viên và ban lãnh đạo Axiom. Mọi tài khoản nhân viên mới được tự động cấp phát qua Gmail sau khi trúng tuyển tại Cổng Tuyển Dụng.
            </p>

            <div className="hidden sm:block mt-6">
              <AuthLivelyStage mode="login" />
            </div>
          </div>

          {/* Right Login Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-xl">
              {/* Magic Login Loading Banner */}
              {magicLoginProcessing && (
                <div className="mb-4 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                  <span className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin shrink-0" />
                  <span>Đang xác thực liên kết đăng nhập một chạm từ Gmail của bạn...</span>
                </div>
              )}

              {/* Title Header */}
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Đăng Nhập Doanh Nghiệp
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Nhập thông tin tài khoản được cấp để vào không gian làm việc
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2"
                >
                  <MaterialIcon name="error" className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    {(t.auth as any).emailLabel || 'Email'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@axiom.com"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:bg-white dark:focus:bg-neutral-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                    <MaterialIcon
                      name="mail"
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      {(t.auth as any).passwordLabel || 'Mật khẩu'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <MaterialIcon
                        name={showPassword ? 'visibility_off' : 'visibility'}
                        className="w-3.5 h-3.5"
                      />
                      <span>{showPassword ? t.auth.hide : t.auth.show}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:bg-white dark:focus:bg-neutral-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                    <MaterialIcon
                      name="lock"
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || magicLoginProcessing}
                  className="w-full mt-1.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-semibold text-[13.5px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white dark:border-neutral-900/30 dark:border-t-neutral-900 rounded-full animate-spin" />
                      <span>{t.auth.loginLoading}</span>
                    </div>
                  ) : (
                    <>
                      <span>Đăng Nhập Vào Không Gian Làm Việc</span>
                      <MaterialIcon
                        name="arrow_forward"
                        className="w-4 h-4 text-slate-300 dark:text-neutral-600 group-hover:text-white dark:group-hover:text-neutral-950 group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Access Bar: Corporate Roles */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-neutral-800 space-y-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block text-center">
                  Tài Khoản Mẫu Doanh Nghiệp
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(['admin', 'axiom.com'].join('@'));
                      setPassword('password123');
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-neutral-700 hover:border-blue-500 bg-slate-50/80 dark:bg-neutral-800/80 hover:bg-blue-50/50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer group shadow-2xs"
                    title="Owner / Quản trị tối cao: admin [at] axiom.com"
                  >
                    <span className="text-xl mb-0.5 group-hover:scale-110 transition-transform">👑</span>
                    <span className="text-[10px] font-bold tracking-tight truncate max-w-full">Owner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(['manager', 'axiom.com'].join('@'));
                      setPassword('password123');
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-neutral-700 hover:border-purple-500 bg-slate-50/80 dark:bg-neutral-800/80 hover:bg-purple-50/50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 hover:text-purple-700 dark:hover:text-purple-400 transition-all cursor-pointer group shadow-2xs"
                    title="Manager (Bộ Phận Nhân Sự): manager [at] axiom.com"
                  >
                    <span className="text-xl mb-0.5 group-hover:scale-110 transition-transform">💼</span>
                    <span className="text-[10px] font-bold tracking-tight truncate max-w-full">Manager</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(['member', 'axiom.com'].join('@'));
                      setPassword('password123');
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-neutral-700 hover:border-emerald-500 bg-slate-50/80 dark:bg-neutral-800/80 hover:bg-emerald-50/50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all cursor-pointer group shadow-2xs"
                    title="Member (Bộ Phận Nhân Sự): member [at] axiom.com"
                  >
                    <span className="text-xl mb-0.5 group-hover:scale-110 transition-transform">👤</span>
                    <span className="text-[10px] font-bold tracking-tight truncate max-w-full">Member</span>
                  </button>
                </div>
              </div>

              {/* Bottom Security Note */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-500 text-center">
                <MaterialIcon name="lock" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Hệ thống nội bộ khép kín. Ứng viên ứng tuyển vui lòng nộp hồ sơ tại trang chủ.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto px-6 py-3 text-center text-[11.5px] text-slate-400 border-t border-slate-200/60 dark:border-neutral-800">
        Axiom DX-OS • Enterprise Digital Meeting Protocol • 100% On-Premise Data Sovereignty
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F6F8FC] dark:bg-black">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
