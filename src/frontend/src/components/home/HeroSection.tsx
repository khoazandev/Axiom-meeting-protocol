'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import LottiePlayer from '@/components/LottiePlayer';
import animationData from '@/public/images/Monday Ahed.json';
import { AxiomIcon } from '@/components/AxiomLogo';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

/* ── Inline SVG Floating Icons (3D-like rounded squares with shadow, matching StaffDeck) ── */
function FloatingIcon({
  children,
  className,
  delay = 0,
  yRange = [-12, 12],
}: {
  children: React.ReactNode;
  className: string;
  delay?: number;
  yRange?: number[];
}) {
  return (
    <motion.div
      animate={{ y: [yRange[0], yRange[1], yRange[0]] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className={`absolute rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-[3px] border-white flex items-center justify-center ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <section
      className="relative pt-24 pb-0 overflow-visible"
      style={{ background: 'linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%)' }}
    >
      <div className="container mx-auto px-6 relative z-10 flex flex-col items-center max-w-5xl">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center text-[42px] md:text-[54px] font-semibold text-[#18181a] leading-[1.15] tracking-tight mb-5"
        >
          Axiom DX-OS
          <br />
          Enterprise Meeting Protocol
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center text-[15px] text-[#757f9c] max-w-[800px] mb-8 leading-relaxed"
        >
          Hệ điều hành nghi thức cuộc họp số bảo mật cao: WebRTC on-premise không rò rỉ dữ liệu,
          kiểm duyệt kỷ luật chương trình họp (Agenda Gate), phiên dịch đa ngữ thời gian thực và tự
          động hóa biên bản hành động với AI cục bộ.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-12 z-20"
        >
          <a
            href="https://github.com/khoazandev/Axiom-meeting-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 h-11 px-5 rounded-[12px] border border-[#e3e7f1] text-[14px] font-medium text-[#18181a] bg-white hover:border-[#cbd3e6] transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub Repo
          </a>
          <Link
            href="/docs"
            className="flex items-center gap-2 h-11 px-5 rounded-[12px] border border-[#e3e7f1] text-[14px] font-medium text-[#18181a] bg-white hover:border-[#cbd3e6] transition-all"
          >
            <MaterialIcon name="description" className="w-4 h-4 text-[#757f9c]" />
            Tài liệu & Hướng dẫn
          </Link>
          <Link
            href="/member"
            className="flex items-center gap-2 h-11 px-6 rounded-[12px] bg-[#18181a] text-white text-[14px] font-medium shadow-lg shadow-black/5 hover:bg-black transition-all"
          >
            <MaterialIcon name="graphic_eq" className="w-4 h-4 text-emerald-400" />
            Vào phòng họp ngay
            <MaterialIcon name="arrow_forward" className="w-3.5 h-3.5 ml-1 opacity-80" />
          </Link>
        </motion.div>

        {/* ── Floating Icons & Character ── */}
        <div className="relative w-full h-[360px] flex justify-center mt-6">
          {/* Subtle Glow Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-300/15 via-blue-300/10 to-transparent blur-3xl rounded-full z-0 pointer-events-none" />

          {/* Central Character from Lottie */}
          <div className="relative z-10 w-[300px] flex items-end justify-center pb-4">
            <LottiePlayer
              animationData={animationData}
              loop={true}
              className="w-[280px] h-auto max-h-[280px]"
            />
          </div>

          {/* Floating 3D Icon: Blue Folder (top-left) */}
          <FloatingIcon
            className="w-[60px] h-[60px] bg-[#6caaf8] left-[5%] top-[10%] rotate-12"
            delay={0}
          >
            <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </FloatingIcon>

          {/* Green Chat Bubble (mid-left) */}
          <FloatingIcon
            className="w-[48px] h-[48px] bg-[#5ce0b5] left-[25%] top-[40%] -rotate-12"
            delay={1.2}
          >
            <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </FloatingIcon>

          {/* Blue Media (bottom-left) */}
          <FloatingIcon
            className="w-[44px] h-[44px] bg-[#5a9cf8] left-[10%] bottom-[30%] rotate-6"
            delay={0.8}
            yRange={[-8, 8]}
          >
            <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
              <path d="M2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2zm20-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H10V4h12v12zM12 5.5v9l6-4.5z" />
            </svg>
          </FloatingIcon>

          {/* Blue Cloud (top-right) */}
          <FloatingIcon
            className="w-[72px] h-[72px] bg-[#75c6fb] right-[10%] top-[5%] -rotate-12"
            delay={0.5}
          >
            <svg className="w-9 h-9" fill="white" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
            </svg>
          </FloatingIcon>

          {/* Pink "A" (mid-right) */}
          <FloatingIcon
            className="w-[44px] h-[44px] bg-[#fca1c9] right-[25%] top-[35%] rotate-12"
            delay={1.5}
          >
            <span className="text-white font-bold text-[20px]">A</span>
          </FloatingIcon>

          {/* Orange Chart (bottom-right) */}
          <FloatingIcon
            className="w-[52px] h-[52px] bg-[#fac86e] right-[5%] bottom-[40%] -rotate-6"
            delay={0.3}
          >
            <svg className="w-7 h-7" fill="white" viewBox="0 0 24 24">
              <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
            </svg>
          </FloatingIcon>
        </div>
      </div>

      {/* ── Dashboard Mockup (overlapping bottom) ── */}
      <div className="relative z-20 mx-auto max-w-[1100px] -mt-12 px-6">
        <div className="bg-white rounded-t-[24px] shadow-[0_-15px_50px_rgba(0,0,0,0.04)] border border-[#e3e7f1] overflow-hidden min-h-[400px]">
          {/* Mockup header */}
          <div className="flex items-center border-b border-gray-50 h-16">
            <div className="w-[240px] px-6 h-full flex items-center border-r border-gray-50">
              <div className="flex items-center gap-2">
                <AxiomIcon size={20} />
                <span className="font-bold text-[15px] text-[#18181a]">Axiom DX-OS</span>
              </div>
            </div>
            <div className="flex-1 px-6 flex items-center justify-between">
              <div className="h-10 bg-[#f8f9fc] rounded-full border border-[#f0f2f6] flex items-center px-4 w-[600px] gap-2">
                <svg
                  className="w-4 h-4 text-[#b0b8cc]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="text-[13px] text-[#b0b8cc]">Tìm kiếm nội dung cuộc họp...</span>
              </div>
              <div className="flex items-center gap-4 text-[#757f9c]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
            </div>
          </div>
          {/* Mockup body */}
          <div className="flex h-[336px]">
            {/* Sidebar */}
            <div className="w-[240px] border-r border-gray-50 flex flex-col p-4 gap-2">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#f6f8fc] rounded-xl text-[13px] font-semibold text-[#18181a]">
                <svg
                  className="w-4 h-4 text-[#757f9c]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                Quản lý cuộc họp
              </div>
              <div className="flex items-center justify-between px-4 py-2 mt-4 text-[12px] text-[#b0b8cc] font-medium">
                Tất cả cuộc họp
                <span className="bg-[#f0f2f6] text-[#757f9c] px-2 py-0.5 rounded-full text-[10px]">
                  12
                </span>
              </div>
            </div>
            {/* Content area */}
            <div className="flex-1 p-8 bg-[#fafbfc]">
              <div className="flex gap-10 text-[14px] pb-5 border-b border-gray-100">
                <span className="text-[#757f9c] font-medium cursor-pointer">Tất cả cuộc họp</span>
                <span className="text-[#18181a] font-bold border-b-[3px] border-[#18181a] pb-5 -mb-[21px] cursor-pointer">
                  Cuộc họp của tôi
                </span>
                <span className="text-[#757f9c] font-medium cursor-pointer">
                  Không gian làm việc
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-8">
                {/* Skeleton Cards */}
                <div className="h-[200px] bg-white border border-[#e3e7f1] rounded-2xl p-5 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-[#f0f2f6] rounded-full"></div>
                    <div className="w-8 h-8 flex gap-1 items-center justify-center">
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-[#f0f2f6] rounded w-24"></div>
                    <div className="h-3 bg-[#f0f2f6] rounded w-16"></div>
                  </div>
                </div>
                <div className="h-[200px] bg-white border border-[#e3e7f1] rounded-2xl p-5 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-[#f0f2f6] rounded-full"></div>
                    <div className="w-8 h-8 flex gap-1 items-center justify-center">
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-[#f0f2f6] rounded w-24"></div>
                    <div className="h-3 bg-[#f0f2f6] rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
