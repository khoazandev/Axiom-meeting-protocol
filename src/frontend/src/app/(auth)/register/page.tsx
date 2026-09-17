'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Mail,
  User,
  Phone,
  Briefcase,
  Layers,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  KeyRound,
  Check,
  Loader2,
  ChevronDown,
  Crown,
} from 'lucide-react';
import {
  authApi,
  invitationApi,
  organizationApi,
  type OrgInvitationVerifyResponse,
} from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import Logo from '@/components/Logo';
import AuthLivelyStage from '@/components/auth/AuthLivelyStage';

// Password Strength Evaluation Helper
function getPasswordStrength(pass: string): { score: number; label: string; color: string; feedback: string } {
  if (!pass) return { score: 0, label: '', color: '', feedback: '' };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Mật khẩu yếu', color: 'bg-rose-500 text-rose-600', feedback: 'Cần tối thiểu 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt' };
    case 2:
      return { score: 2, label: 'Trung bình', color: 'bg-amber-500 text-amber-600', feedback: 'Thêm chữ hoa và ký tự đặc biệt (!@#$)' };
    case 3:
      return { score: 3, label: 'Khá an toàn', color: 'bg-blue-500 text-blue-600', feedback: 'Đạt tiêu chuẩn bảo mật doanh nghiệp' };
    case 4:
    default:
      return { score: 4, label: 'Rất mạnh', color: 'bg-emerald-500 text-emerald-600', feedback: 'Mật khẩu đạt cấp độ an ninh tối đa' };
  }
}

type RegisterMode = 'new_org' | 'invitation';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  // Read invitation code or token from URL query params
  const codeFromUrl = searchParams.get('code') || '';
  const inviteTokenFromUrl =
    codeFromUrl ||
    searchParams.get('invite_token') ||
    searchParams.get('token') ||
    searchParams.get('invite') ||
    '';

  // Helper to cleanly extract 6-digit code or token even if full URL is pasted
  const extractCodeOrToken = (input: string): string => {
    let raw = input.trim();
    if (raw.includes('code=')) {
      raw = raw.split('code=')[1].split('&')[0];
    } else if (raw.includes('invite_token=')) {
      raw = raw.split('invite_token=')[1].split('&')[0];
    } else if (raw.includes('token=')) {
      raw = raw.split('token=')[1].split('&')[0];
    } else if (raw.includes('/invite/')) {
      raw = raw.split('/invite/')[1].split('?')[0];
    }
    return raw.trim();
  };

  // Mode: if user navigated with an invite token, default to invitation flow. Otherwise, allow creating a new org or joining.
  const [activeMode, setActiveMode] = useState<RegisterMode>(inviteTokenFromUrl ? 'invitation' : 'new_org');

  // Token verification states
  const [activeToken, setActiveToken] = useState(extractCodeOrToken(inviteTokenFromUrl));
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [invitationData, setInvitationData] = useState<OrgInvitationVerifyResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // New Organization fields
  const [organizationName, setOrganizationName] = useState('');

  // Common Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Verify invitation token whenever activeToken changes
  useEffect(() => {
    if (!activeToken) {
      setInvitationData(null);
      return;
    }

    let isMounted = true;
    setIsVerifyingToken(true);
    setTokenError(null);

    invitationApi
      .verify(activeToken)
      .then((data) => {
        if (!isMounted) return;
        setInvitationData(data);
        setEmail(data.email || '');
        if (data.full_name) setFullName(data.full_name);
        if (data.phone) setPhone(data.phone);
        if (data.job_title) setJobTitle(data.job_title);
        // Pre-select department according to invitation
        if (data.department_id) {
          setSelectedDepartmentId(data.department_id);
        } else if (data.available_departments && data.available_departments.length > 0) {
          setSelectedDepartmentId(data.available_departments[0].id);
        }
        setActiveMode('invitation');
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.warn('Invitation verification warning:', err);
        setTokenError(
          err?.message || 'Thư mời không tồn tại, đã hết hạn hiệu lực (quá 7 ngày) hoặc đã được sử dụng.'
        );
        setInvitationData(null);
      })
      .finally(() => {
        if (isMounted) setIsVerifyingToken(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeToken]);

  // Handle manual token submit
  const handleVerifyManualToken = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = extractCodeOrToken(manualTokenInput);
    if (!clean) return;
    setActiveToken(clean);
  };

  // Submit registration handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation checks
    if (activeMode === 'new_org' && !organizationName.trim()) {
      setFormError('Vui lòng nhập tên Công ty / Doanh nghiệp của bạn.');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Vui lòng nhập họ và tên đầy đủ của bạn.');
      return;
    }
    if (!email.trim()) {
      setFormError('Vui lòng nhập địa chỉ email công việc.');
      return;
    }
    if (password.length < 8) {
      setFormError('Mật khẩu bắt buộc phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Xác nhận mật khẩu không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeMode === 'new_org') {
        // ── MODE A: CREATE NEW COMPANY ─────────────────────────
        const registeredUser = await authApi.register(email, password, fullName.trim(), {
          organization_name: organizationName.trim(),
          phone: phone.trim() || undefined,
          job_title: jobTitle.trim() || 'Chủ tịch / Sáng lập & CEO',
        });

        // Auto login
        const tokens = await authApi.login(email, password);
        useAuthStore.setState({ token: tokens.access_token });

        const freshUser = await authApi.me();
        const organizations = await organizationApi.list();
        const targetOrg = organizations[0];

        setAuth(freshUser, tokens.access_token, organizations, targetOrg);
        // Owner goes directly to Executive Admin Dashboard
        router.push('/admin');
      } else {
        // ── MODE B: JOIN VIA INVITATION ────────────────────────
        if (!activeToken) {
          setFormError('Vui lòng nhập mã thư mời hợp lệ để gia nhập công ty.');
          return;
        }

        const registeredUser = await authApi.register(email, password, fullName.trim(), {
          phone: phone.trim() || undefined,
          job_title: jobTitle.trim() || undefined,
          department_id: selectedDepartmentId || undefined,
          invite_token: activeToken,
        });

        // Auto login
        const tokens = await authApi.login(email, password);
        useAuthStore.setState({ token: tokens.access_token });

        const freshUser = await authApi.me();
        const organizations = await organizationApi.list();
        const currentOrg =
          organizations.find((o) => o.id === invitationData?.organization_id) || organizations[0];

        setAuth(freshUser, tokens.access_token, organizations, currentOrg);

        // Redirect according to assigned role
        const userRole = (freshUser.role || invitationData?.role || 'MEMBER').toUpperCase();
        if (userRole === 'OWNER' || userRole === 'ADMIN') {
          router.push('/admin');
        } else if (userRole === 'MANAGER') {
          router.push('/manager');
        } else {
          router.push('/member');
        }
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      setFormError(err?.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col justify-between relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Subtle Dot Matrix & Radial Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] [background-size:24px_24px] pointer-events-none opacity-60" />
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-gradient-to-br from-blue-300/20 via-indigo-200/10 to-transparent blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-gradient-to-tl from-emerald-200/20 via-cyan-100/10 to-transparent blur-3xl rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo size={34} showText={true} subtitle="DX-OS" />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            Đăng nhập
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Giao thức Doanh nghiệp Bảo mật</span>
          </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto px-6 py-4 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        {/* Left: Interactive Lively Stage */}
        <AuthLivelyStage mode="register" />

        {/* Right: Security-Enforced Onboarding Container */}
        <div className="w-full max-w-[500px] shrink-0">
          <div className="relative rounded-3xl p-2 bg-white/85 backdrop-blur-2xl border border-slate-200/90 shadow-xl">
            <div className="rounded-2xl bg-white p-6 sm:p-7 border border-slate-100 shadow-2xs">

              {/* ─────────────────────────────────────────────────────────────
                  TOP SEGMENTED MODE SELECTOR
                  Allows switching between New Company vs Invitation
              ───────────────────────────────────────────────────────────── */}
              <div className="p-1 bg-slate-100/90 rounded-2xl flex items-center mb-5 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('new_org');
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMode === 'new_org'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${activeMode === 'new_org' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Tạo Công ty mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('invitation');
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMode === 'invitation'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className={`w-3.5 h-3.5 ${activeMode === 'invitation' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Gia nhập qua Thư mời</span>
                  {invitationData && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  MODE 1: CREATE NEW COMPANY / WORKSPACE
              ───────────────────────────────────────────────────────────── */}
              {activeMode === 'new_org' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/80">
                        <Crown className="w-3 h-3 text-amber-600" />
                        Dành Cho Nhà Sáng Lập & Chủ Doanh Nghiệp
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Khởi Tạo Không Gian Doanh Nghiệp
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thành lập Workspace quản trị cuộc họp cấp cao. Bạn sẽ tự động nắm giữ vai trò <strong>OWNER</strong> cao nhất.
                    </p>
                  </div>

                  {/* Error Notification */}
                  {formError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1 font-medium">{formError}</div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Organization Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tên Doanh nghiệp / Tổ chức <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          placeholder="Ví dụ: Tập đoàn Axiom Global"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Founder Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Họ và tên Quản trị viên <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Nguyễn Văn Sáng Lập"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Founder Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email liên hệ doanh nghiệp <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="founder@company.com"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Job Title & Phone Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Chức vụ
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="Chủ tịch & CEO"
                            className="w-full pl-8 pr-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Số điện thoại
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0912 345 678"
                            className="w-full pl-8 pr-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Mật khẩu <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[10.5px] text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {showPassword ? 'Ẩn' : 'Hiện'}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Tối thiểu 8 ký tự"
                            className="w-full pl-8 pr-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Xác nhận mật khẩu <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="text-[10.5px] text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {showConfirmPassword ? 'Ẩn' : 'Hiện'}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu"
                            className="w-full pl-8 pr-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Password Strength Meter */}
                    {password.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 h-1">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`flex-1 rounded-full h-full transition-all duration-300 ${
                                step <= passwordStrength.score
                                  ? passwordStrength.color.split(' ')[0]
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold ${passwordStrength.color.split(' ')[1]}`}>
                            {passwordStrength.label}
                          </span>
                          <span className="text-slate-400">{passwordStrength.feedback}</span>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang thiết lập tổ chức & khởi tạo tài khoản...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Khởi Tạo Doanh Nghiệp & Vào Bàn Làm Việc</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  MODE 2: JOIN VIA INVITATION TOKEN
              ───────────────────────────────────────────────────────────── */}
              {activeMode === 'invitation' && (
                <>
                  {/* Case 2A: Verifying Token */}
                  {isVerifyingToken && (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                      <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
                      <h3 className="text-sm font-bold text-slate-900">Đang xác thực Thư mời...</h3>
                      <p className="text-xs text-slate-500 max-w-xs">
                        Hệ thống đang kiểm tra mã token và giải mã thông tin bổ nhiệm của bạn từ máy chủ Axiom.
                      </p>
                    </div>
                  )}

                  {/* Case 2B: Token Not Yet Verified or Missing */}
                  {!isVerifyingToken && !invitationData && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-2">
                        <Mail className="w-6 h-6" />
                      </div>

                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 mb-1.5">
                          Bảo Mật Phân Quyền Doanh Nghiệp
                        </span>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                          Gia Nhập Qua Thư Mời
                        </h2>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Để gia nhập một công ty đã có sẵn trên hệ thống Axiom, bạn cần có Thư mời chính thức được Quản trị viên gửi qua Gmail.
                        </p>
                      </div>

                      {tokenError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1 font-medium">{tokenError}</div>
                        </div>
                      )}

                      {/* Manual Code / Token Entry Box */}
                      <form onSubmit={handleVerifyManualToken} className="pt-2 space-y-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                            Nhập Mã Mời Gia Nhập (Mã 6 số từ Email):
                          </label>
                          <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                            Kiểm tra hộp thư Gmail (bao gồm cả mục <em>Thư rác / Spam</em> hoặc <em>Quảng cáo</em>) để lấy mã mời 6 chữ số hoặc nhấp vào liên kết trong email.
                          </p>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={manualTokenInput}
                            onChange={(e) => setManualTokenInput(e.target.value)}
                            placeholder="Ví dụ: 849201 (hoặc dán mã mời)"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono tracking-wider placeholder:tracking-normal placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <button
                          type="submit"
                          disabled={!manualTokenInput.trim()}
                          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>Xác Thực Mã Mời & Mở Hồ Sơ</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>

                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                        <span>Chưa có tổ chức?</span>
                        <button
                          type="button"
                          onClick={() => setActiveMode('new_org')}
                          className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          Tạo công ty mới ngay →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Case 2C: Token Verified & Loaded */}
                  {!isVerifyingToken && invitationData && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Mã Mời Hợp Lệ
                          </span>
                          {invitationData.invite_code ? (
                            <span className="text-[11.5px] font-bold text-blue-700 font-mono bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                              MÃ: #{invitationData.invite_code}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 font-mono">
                              ID: {invitationData.token.slice(0, 8)}...
                            </span>
                          )}
                        </div>

                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                          Gia Nhập {invitationData.organization_name}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Vui lòng hoàn thiện thông tin tài khoản để kích hoạt quyền truy cập doanh nghiệp.
                        </p>
                      </div>

                      {/* Summary Card of Official Assignment */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Công ty / Tổ chức:</span>
                          <span className="font-bold text-slate-900">{invitationData.organization_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Cấp bậc bổ nhiệm:</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {invitationData.role}
                          </span>
                        </div>
                      </div>

                      {/* Error Notification */}
                      {formError && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1 font-medium">{formError}</div>
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Full Name */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Họ và tên nhân sự <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Nguyễn Văn A"
                              className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {/* Email */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Email tiếp nhận <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Đã xác thực theo thư mời
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="email"
                              required
                              readOnly
                              value={email}
                              className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium cursor-not-allowed select-none"
                              title="Địa chỉ email đã được cố định theo thư mời chính thức từ Quản trị viên"
                            />
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {/* Department selection */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Phòng ban công tác <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10px] text-blue-600 font-semibold">
                              (Chọn sẵn theo thư mời)
                            </span>
                          </div>
                          <div className="relative">
                            <select
                              value={selectedDepartmentId}
                              onChange={(e) => setSelectedDepartmentId(e.target.value)}
                              className="w-full pl-9 pr-8 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                            >
                              <option value="">-- Không phân bổ phòng ban --</option>
                              {invitationData.available_departments &&
                                invitationData.available_departments.map((dept) => (
                                  <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </option>
                                ))}
                            </select>
                            <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {/* Job Title & Phone Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Chức danh / Vị trí
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="Ví dụ: Senior Backend Engineer"
                                className="w-full pl-8 pr-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                              <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Số điện thoại
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="0912 345 678"
                                className="w-full pl-8 pr-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        {/* Password & Confirm Password */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-semibold text-slate-700">
                                Mật khẩu <span className="text-rose-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-[10.5px] text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                {showPassword ? 'Ẩn' : 'Hiện'}
                              </button>
                            </div>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Tối thiểu 8 ký tự"
                                className="w-full pl-8 pr-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-semibold text-slate-700">
                                Xác nhận mật khẩu <span className="text-rose-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-[10.5px] text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                {showConfirmPassword ? 'Ẩn' : 'Hiện'}
                              </button>
                            </div>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu"
                                className="w-full pl-8 pr-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        {/* Password Strength Meter */}
                        {password.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 h-1">
                              {[1, 2, 3, 4].map((step) => (
                                <div
                                  key={step}
                                  className={`flex-1 rounded-full h-full transition-all duration-300 ${
                                    step <= passwordStrength.score
                                      ? passwordStrength.color.split(' ')[0]
                                      : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={`font-bold ${passwordStrength.color.split(' ')[1]}`}>
                                {passwordStrength.label}
                              </span>
                              <span className="text-slate-400">{passwordStrength.feedback}</span>
                            </div>
                          </div>
                        )}

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Đang kích hoạt tài khoản & gia nhập...</span>
                            </>
                          ) : (
                            <>
                              <span>Hoàn Tất Kích Hoạt & Vào Bàn Làm Việc</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}

              {/* Bottom Security Assurance */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Mã hóa bảo vệ danh tính 256-bit AES • Lưu trữ On-Premise</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto px-6 py-3 text-center text-[11px] text-slate-400 border-t border-slate-200/60">
        Axiom DX-OS • Enterprise Digital Meeting Protocol • 100% On-Premise Data Sovereignty
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F6F8FC]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
