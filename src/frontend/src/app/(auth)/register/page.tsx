'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowRight, Building2, Briefcase, Lock, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-black text-slate-900 dark:text-neutral-100 flex flex-col justify-between relative overflow-hidden selection:bg-[#4F7BF7]/20 transition-colors">
      {/* Background Dot Matrix Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#262626_1.2px,transparent_1.2px)] [background-size:24px_24px] pointer-events-none opacity-70" />

      {/* Top Navbar */}
      <header className="relative z-20 w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo size={34} showText={true} subtitle="DX-OS" />
        </Link>

        <Link
          href="/login"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 transition-all shadow-2xs"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Đăng Nhập Nội Bộ</span>
        </Link>
      </header>

      {/* Main Center Message Card */}
      <main className="relative z-10 w-full max-w-xl mx-auto px-6 py-8 flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-slate-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-neutral-500">
              AXIOM DIGITAL ENTERPRISE OS
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Không Mở Đăng Ký Tài Khoản Tự Do
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed max-w-md mx-auto">
              Axiom là nền tảng quản trị và hội nghị bảo mật nội bộ khép kín. 
              Doanh nghiệp không sử dụng cơ chế tự đăng ký tài khoản tự do trên trang web.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700/80 text-left text-xs space-y-2">
            <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Quy trình cấp tài khoản làm việc:</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-neutral-300 list-disc list-inside text-[12px] leading-relaxed">
              <li>Ứng viên nộp hồ sơ trực tiếp tại Cổng Tuyển Dụng Việc Làm (Mặt sau trang chủ).</li>
              <li>Hoàn thành bài kiểm tra năng lực và tham gia phỏng vấn trực tuyến.</li>
              <li>Khi được Ban Giám Đốc phê duyệt, hệ thống sẽ <strong>tự động khởi tạo tài khoản nhân viên</strong> và gửi thông tin đăng nhập cùng liên kết một chạm vào Gmail của bạn.</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#careers-portal"
              className="w-full sm:w-60 h-11 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Briefcase className="w-4 h-4" />
              <span>Cổng Tuyển Dụng Việc Làm</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-48 h-11 px-5 rounded-2xl border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Đăng Nhập Nội Bộ</span>
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto px-6 py-4 text-center text-xs text-slate-400">
        Axiom Digital Enterprise • Hệ Thống Điều Hành Doanh Nghiệp Tự Chủ
      </footer>
    </div>
  );
}
