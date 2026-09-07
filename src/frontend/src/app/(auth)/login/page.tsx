"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { authApi, organizationApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useLanguageStore } from "@/lib/store/useLanguageStore";
import Logo from "@/components/Logo";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import AuthLivelyStage from "@/components/auth/AuthLivelyStage";
import AuthQuickAccess from "@/components/auth/AuthQuickAccess";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useLanguageStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tokens = await authApi.login(email, password);
      useAuthStore.setState({ token: tokens.access_token });
      const user = await authApi.me();
      const organizations = await organizationApi.list();
      setAuth(user, tokens.access_token, organizations, organizations[0]);
      if (email === "admin@axiom.com") {
        router.push("/admin");
      } else if (email === "manager.khoa@axiom.com") {
        router.push("/manager");
      } else {
        router.push("/member");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.auth.loginError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col justify-between relative overflow-hidden selection:bg-[#4F7BF7]/20">
      {/* Background Dot Matrix Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] [background-size:24px_24px] pointer-events-none opacity-70" />

      {/* Ambient Glowing Orbs */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-gradient-to-br from-blue-300/20 via-indigo-200/10 to-transparent blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-gradient-to-tl from-emerald-200/20 via-cyan-100/10 to-transparent blur-3xl rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo size={34} showText={true} subtitle="DX-OS" />
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/docs"
            className="text-[12.5px] font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            Tài liệu
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <MaterialIcon name="arrow_back" className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>100% On-Premise</span>
          </div>
        </div>
      </header>

      {/* Main Studio Arena */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto px-6 py-4 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 xl:gap-16">
        {/* Left: Creative Animated Interactive Stage */}
        <AuthLivelyStage mode="login" />

        {/* Right: Double-Bezel Hardware Auth Enclosure */}
        <div className="w-full max-w-[430px] shrink-0">
          <div className="relative rounded-[2rem] p-2 bg-white/80 backdrop-blur-2xl border border-slate-200/90 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.02)] transition-all">
            <div className="rounded-[calc(2rem-0.5rem)] bg-white p-6 sm:p-7 border border-slate-100/90 shadow-xs">
              {/* Sliding Pill Tab Switcher */}
              <div className="flex items-center p-1 bg-slate-100/90 rounded-xl mb-5 border border-slate-200/70">
                <div className="relative flex-1 text-center">
                  <span className="relative z-10 block py-1 text-[13px] font-semibold text-slate-900">
                    Đăng nhập
                  </span>
                  <motion.div
                    layoutId="auth-mode-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                </div>

                <Link
                  href="/register"
                  className="relative flex-1 text-center py-1 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <span className="relative z-10">Đăng ký mới</span>
                </Link>
              </div>

              {/* Header Text */}
              <div className="text-center mb-5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 border border-blue-200/60 mb-1.5">
                  Axiom Meeting Protocol
                </span>
                <h1 className="text-2xl sm:text-[25px] font-black text-slate-900 tracking-tight leading-tight">
                  Đăng nhập Workspace
                </h1>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Truy cập phòng họp WebRTC và trợ lý AI cục bộ On-Premise.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] flex items-start gap-2">
                  <MaterialIcon name="speed" className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Email */}
                <div>
                  <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                    {t.auth.email}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                    <MaterialIcon
                      name="mail"
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[12.5px] font-semibold text-slate-700">
                      {t.auth.password}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <MaterialIcon
                        name={showPassword ? "visibility_off" : "visibility"}
                        className="w-3.5 h-3.5"
                      />
                      <span>{showPassword ? "Ẩn" : "Hiện"}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                    <MaterialIcon
                      name="lock"
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Quick Demo Credentials for Reviewers */}
                <AuthQuickAccess
                  onSelect={(quickEmail, quickPass) => {
                    setEmail(quickEmail);
                    setPassword(quickPass);
                  }}
                />

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-[13.5px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang xác thực...</span>
                    </div>
                  ) : (
                    <>
                      <span>Đăng nhập vào Workspace</span>
                      <MaterialIcon
                        name="arrow_forward"
                        className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Security Note */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <MaterialIcon name="lock" className="w-3.5 h-3.5 text-slate-400" />
                <span>Mã hóa 256-bit AES • PostgreSQL 16 On-Premise</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto px-6 py-3 text-center text-[11.5px] text-slate-400 border-t border-slate-200/60">
        Axiom DX-OS • Enterprise Digital Meeting Protocol • 100% On-Premise Data Sovereignty
      </footer>
    </div>
  );
}
