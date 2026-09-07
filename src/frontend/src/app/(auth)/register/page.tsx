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

// Password strength calculation helper
function getPasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: "Mật khẩu yếu", color: "bg-rose-500 text-rose-600" };
    case 2:
      return { score: 2, label: "Trung bình", color: "bg-amber-500 text-amber-600" };
    case 3:
      return { score: 3, label: "Khá an toàn", color: "bg-blue-500 text-blue-600" };
    case 4:
    default:
      return { score: 4, label: "Rất mạnh", color: "bg-emerald-500 text-emerald-600" };
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useLanguageStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleRandomFill = () => {
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    setFullName(`Kỹ sư Demo ${randomNum}`);
    setEmail(`testuser${randomNum}@axiom.internal`);
    setPassword("Axiom@2026");
    setOrganizationName(`Tập đoàn Công nghệ ${randomNum}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Register user account
      await authApi.register(email, password, fullName);

      // 2. Login user to get tokens
      const tokens = await authApi.login(email, password);
      useAuthStore.setState({ token: tokens.access_token });

      const user = await authApi.me();

      // 3. Create initial organization if organizationName provided
      let initialOrg = null;
      if (organizationName.trim()) {
        initialOrg = await organizationApi.create(organizationName.trim());
      }

      const organizations = await organizationApi.list();
      setAuth(user, tokens.access_token, organizations, initialOrg || organizations[0]);

      if (user.role === "OWNER" || user.role === "ADMIN") {
        router.push("/admin");
      } else if (user.role === "MANAGER") {
        router.push("/manager");
      } else {
        router.push("/member");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  // Generate workspace preview slug with clean Vietnamese diacritics stripping
  const workspaceSlug = organizationName.trim()
    ? organizationName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    : "axiom-internal";

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
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto px-6 py-3 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 xl:gap-16">
        {/* Left: Creative Animated Interactive Stage */}
        <AuthLivelyStage mode="register" />

        {/* Right: Double-Bezel Hardware Auth Enclosure */}
        <div className="w-full max-w-[430px] shrink-0">
          <div className="relative rounded-[2rem] p-2 bg-white/80 backdrop-blur-2xl border border-slate-200/90 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.02)] transition-all">
            <div className="rounded-[calc(2rem-0.5rem)] bg-white p-5 sm:p-6.5 border border-slate-100/90 shadow-xs">
              {/* Sliding Pill Tab Switcher */}
              <div className="flex items-center p-1 bg-slate-100/90 rounded-xl mb-4 border border-slate-200/70">
                <Link
                  href="/login"
                  className="relative flex-1 text-center py-1 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <span className="relative z-10">Đăng nhập</span>
                </Link>

                <div className="relative flex-1 text-center">
                  <span className="relative z-10 block py-1 text-[13px] font-semibold text-slate-900">
                    Đăng ký mới
                  </span>
                  <motion.div
                    layoutId="auth-mode-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                </div>
              </div>

              {/* Header Text with Quick Fill Button */}
              <div className="flex items-start justify-between mb-3.5">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 border border-blue-200/60 mb-1">
                    Khởi tạo Tổ chức
                  </span>
                  <h1 className="text-xl sm:text-[23px] font-black text-slate-900 tracking-tight leading-tight">
                    Tạo Workspace Mới
                  </h1>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">
                    Họp WebRTC riêng tư và trợ lý AI MoM cục bộ.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRandomFill}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Tự động điền dữ liệu ngẫu nhiên để test nhanh"
                >
                  <MaterialIcon name="bolt" className="w-3.5 h-3.5 text-amber-600" />
                  <span>Điền test</span>
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-start gap-2">
                  <MaterialIcon name="speed" className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-0.5">
                    {t.auth.fullName}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                    <MaterialIcon
                      name="person"
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-0.5">
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
                      className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                    <MaterialIcon
                      name="mail"
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Password with Strength Meter */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[12px] font-semibold text-slate-700">
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
                      autoComplete="new-password"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                    <MaterialIcon
                      name="lock"
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>

                  {/* Dynamic Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 flex gap-1 h-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              step <= passwordStrength.score
                                ? passwordStrength.color.split(" ")[0]
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-[10px] font-semibold ${
                          passwordStrength.color.split(" ")[1] || "text-slate-400"
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Organization Name & Workspace Preview */}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-0.5">
                    {t.auth.orgName}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoComplete="organization"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="Ví dụ: Techcorp Vietnam"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                    <MaterialIcon
                      name="corporate_fare"
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>

                  {/* Interactive Workspace URL Pill */}
                  <div className="mt-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-400 font-mono">axiom.internal/</span>
                      <span className="text-blue-600 font-semibold font-mono truncate">
                        {workspaceSlug}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded shrink-0">
                      Sẵn sàng
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-[13px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang khởi tạo Workspace...</span>
                    </div>
                  ) : (
                    <>
                      <span>Khởi tạo Workspace & Bắt đầu</span>
                      <MaterialIcon
                        name="arrow_forward"
                        className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Security Note */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400">
                <MaterialIcon name="lock" className="w-3 h-3 text-slate-400" />
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
