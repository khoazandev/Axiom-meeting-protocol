"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import animCredentials from "@/public/images/Person writing credentials.json";
import animHi from "@/public/images/Hi Hola.json";
import { MaterialIcon, MaterialIconName } from "@/components/ui/MaterialIcon";

interface AuthLivelyStageProps {
  mode: "login" | "register";
}

/* 3D-like candy floating icon with bouncy spring physics & interactive hover */
function InteractiveCandyBadge({
  icon,
  label,
  sublabel,
  gradient,
  shadowColor,
  className,
  delay = 0,
  yRange = [-7, 7],
  rotate = 0,
}: {
  icon: MaterialIconName;
  label: string;
  sublabel: string;
  gradient: string;
  shadowColor: string;
  className: string;
  delay?: number;
  yRange?: number[];
  rotate?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      animate={{
        y: [yRange[0], yRange[1], yRange[0]],
        rotate: [rotate - 2, rotate + 2, rotate - 2],
      }}
      transition={{
        duration: 3.6 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      whileHover={{ scale: 1.12, rotate: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute select-none z-20 cursor-pointer ${className}`}
    >
      <div
        className={`w-12 h-12 rounded-[18px] border-[2.5px] border-white flex items-center justify-center text-white shadow-lg transition-transform ${gradient} ${shadowColor}`}
      >
        <MaterialIcon name={icon} className="w-6 h-6" />
      </div>

      {/* Floating Hover Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 -bottom-11 whitespace-nowrap px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white rounded-lg shadow-xl border border-white/10 pointer-events-none z-30 flex flex-col items-center"
          >
            <span className="text-[11px] font-bold leading-tight">{label}</span>
            <span className="text-[9.5px] text-slate-300 leading-tight">{sublabel}</span>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/90 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const LOGIN_TIPS = [
  {
    title: "Trợ lý Axiom AI",
    text: "Đã sẵn sàng cho cuộc họp hôm nay chưa? AI đã chuẩn bị sẵn sàng MoM rồi đấy! ✨",
    tag: "AI MoM • Tự động",
  },
  {
    title: "LiveKit SFU Audio",
    text: "Họp WebRTC nội bộ với độ trễ siêu thấp <15ms, chất lượng âm thanh HD. 🎧",
    tag: "Độ trễ 12ms",
  },
  {
    title: "Kiểm duyệt Nghị trình",
    text: "Agenda Gate bắt buộc mục tiêu rõ ràng, triệt tiêu 100% cuộc họp vô bổ. 🎯",
    tag: "Agenda Gate",
  },
  {
    title: "Chủ quyền Dữ liệu",
    text: "Toàn bộ âm thanh và văn bản lưu trữ On-Premise, không rò rỉ ra ngoài. 🛡️",
    tag: "Bảo mật AES-256",
  },
];

const REGISTER_TIPS = [
  {
    title: "Khởi tạo Không gian số",
    text: "Tạo Workspace bảo mật tuyệt đối cho tổ chức của bạn chỉ trong 30 giây! 🚀",
    tag: "Setup nhanh",
  },
  {
    title: "Tên miền Tổ chức riêng",
    text: "Sở hữu địa chỉ phòng họp nội bộ chuyên nghiệp axiom.internal/{workspace}. 🌐",
    tag: "Custom Slug",
  },
  {
    title: "AI Cục bộ Qwen 2.5",
    text: "Bóc tách giọng nói Faster-Whisper và tự động xuất việc sang Mini Jira. ⚡",
    tag: "Qwen 2.5 Local",
  },
  {
    title: "Họp không giật lag",
    text: "Kiến trúc SFU Mesh tối ưu băng thông cho phòng họp đông người. 📈",
    tag: "SFU Architecture",
  },
];

export default function AuthLivelyStage({ mode }: AuthLivelyStageProps) {
  const isLogin = mode === "login";
  const tips = isLogin ? LOGIN_TIPS : REGISTER_TIPS;
  const [tipIndex, setTipIndex] = useState(0);

  // Auto-cycle tips every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [tips.length]);

  const currentTip = tips[tipIndex];

  return (
    <div className="hidden lg:flex flex-col items-center justify-center relative w-full max-w-[460px] xl:max-w-[500px] px-4 select-none">
      {/* Soft Ambient Radial Halo behind character */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-blue-300/20 via-indigo-200/15 to-transparent blur-3xl rounded-full pointer-events-none -z-10" />

      {/* Interactive Floating Speech Bubble with Click-to-Cycle */}
      <motion.div
        animate={{ y: [-4, 4, -4] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        onClick={() => setTipIndex((prev) => (prev + 1) % tips.length)}
        className="relative mb-2 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl px-5 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.06)] max-w-[390px] z-20 cursor-pointer hover:border-blue-300 transition-colors group"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              {currentTip.title}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
            {currentTip.tag}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[13px] font-medium text-slate-800 leading-snug min-h-[38px] flex items-center"
          >
            {currentTip.text}
          </motion.p>
        </AnimatePresence>

        {/* Bottom micro-indicator dots */}
        <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1">
            {tips.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === tipIndex ? "w-4 bg-blue-600" : "w-1 bg-slate-200"
                }`}
              />
            ))}
          </div>
          <span className="text-[9.5px] text-slate-400 font-medium group-hover:text-blue-500 transition-colors flex items-center gap-0.5">
            <span>Bấm để đổi mẹo</span>
            <MaterialIcon name="touch_app" className="w-3 h-3" />
          </span>
        </div>

        {/* Speech Bubble Arrow pointing down */}
        <div className="absolute -bottom-2 left-12 w-4 h-4 bg-white border-r border-b border-slate-200/80 rotate-45" />
      </motion.div>

      {/* Main Character Stage with Pedestal & Orbiting 3D Elements */}
      <div className="relative w-full h-[300px] flex items-center justify-center">
        {/* Soft Glass Pedestal under the character */}
        <div className="absolute bottom-2 w-[280px] h-[34px] bg-gradient-to-r from-blue-200/30 via-indigo-200/40 to-cyan-200/30 rounded-[100%] blur-sm -z-5" />
        <div className="absolute bottom-4 w-[240px] h-[18px] bg-white/70 backdrop-blur-md rounded-[100%] border border-slate-200/60 shadow-xs -z-5" />

        {/* Lottie Animated Character */}
        <div className="relative z-10 w-[270px] h-[270px] flex items-center justify-center">
          <LottiePlayer
            animationData={isLogin ? animCredentials : animHi}
            loop={true}
            className="w-full h-full object-contain drop-shadow-xs"
          />
        </div>

        {/* 3D Floating Candy Badge 1: LiveKit SFU (Top Left) */}
        <InteractiveCandyBadge
          icon="graphic_eq"
          label="LiveKit SFU"
          sublabel="12ms latency"
          gradient="bg-gradient-to-tr from-[#3b82f6] to-[#06b6d4]"
          shadowColor="shadow-blue-500/25"
          className="-left-3 top-4"
          rotate={8}
          delay={0}
        />

        {/* 3D Floating Candy Badge 2: Local AI (Top Right) */}
        <InteractiveCandyBadge
          icon="psychology"
          label="Qwen 2.5 AI"
          sublabel="Local MoM Generator"
          gradient="bg-gradient-to-tr from-[#8b5cf6] to-[#ec4899]"
          shadowColor="shadow-purple-500/25"
          className="-right-3 top-6"
          rotate={-10}
          delay={0.5}
        />

        {/* 3D Floating Candy Badge 3: Agenda Gate (Bottom Left) */}
        <InteractiveCandyBadge
          icon="gavel"
          label="Agenda Gate"
          sublabel="Kỷ luật mục tiêu"
          gradient="bg-gradient-to-tr from-[#f59e0b] to-[#f97316]"
          shadowColor="shadow-amber-500/25"
          className="-left-1 bottom-3"
          rotate={-6}
          delay={1.0}
        />

        {/* 3D Floating Candy Badge 4: Data Sovereignty (Bottom Right) */}
        <InteractiveCandyBadge
          icon="security"
          label="On-Premise"
          sublabel="Bảo mật tuyệt đối"
          gradient="bg-gradient-to-tr from-[#10b981] to-[#059669]"
          shadowColor="shadow-emerald-500/25"
          className="-right-1 bottom-4"
          rotate={12}
          delay={1.5}
        />
      </div>

      {/* Bottom Live Telemetry Soundwave Pill */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-1 flex items-center gap-3 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs text-[12px] text-slate-700 hover:shadow-md transition-shadow"
      >
        <span className="flex items-center gap-1.5 font-semibold text-slate-900">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          LiveKit SFU Audio
        </span>
        <span className="text-slate-300">|</span>
        {/* Animated Equalizer Waveform */}
        <div className="flex items-center gap-1 h-3">
          {[40, 75, 50, 95, 60, 85, 45, 90, 65, 80, 50].map((h, i) => (
            <motion.span
              key={i}
              animate={{ height: ["4px", `${(h / 100) * 14}px`, "4px"] }}
              transition={{
                duration: 0.75 + (i % 3) * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.07,
              }}
              className="w-1 bg-[#2563EB] rounded-full inline-block"
            />
          ))}
        </div>
        <span className="text-slate-300">|</span>
        <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
          12ms SFU
        </span>
      </motion.div>
    </div>
  );
}
