"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function Anamorphic3DMeeting() {
  const [activeTab, setActiveTab] = useState<"webrtc" | "agenda" | "mom" | "security">("webrtc");
  const [elapsedSeconds, setElapsedSeconds] = useState(872); // 14:32

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center pt-10 sm:pt-14 pb-2 px-2 sm:px-4 select-none">
      {/* ── AMBIENT BACKLIGHT GLOWS (Breathes on entrance) ── */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute top-[8%] left-[18%] w-[450px] h-[350px] bg-gradient-to-br from-blue-300/25 via-indigo-300/15 to-transparent blur-[90px] rounded-full pointer-events-none" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
        className="absolute bottom-[4%] right-[18%] w-[420px] h-[320px] bg-gradient-to-tl from-cyan-300/25 via-sky-200/15 to-transparent blur-[80px] rounded-full pointer-events-none" 
      />

      {/* ── HEADER BANNER: WELCOME TO AXIOM DX-OS ── */}
      <div className="text-center max-w-3xl mb-3 sm:mb-4 relative z-10 shrink-0">
        <motion.div 
          initial={{ opacity: 0, y: -16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/95 border border-[#4F7BF7]/25 shadow-[0_2px_12px_rgba(79,123,247,0.12)] text-[#4F7BF7] text-[11px] sm:text-[12px] font-bold tracking-wide mb-2 backdrop-blur-md"
        >
          <MaterialIcon name="auto_awesome" className="w-3.5 h-3.5 text-[#4F7BF7] animate-pulse" />
          <span>Chào mừng đến với Axiom DX-OS • Protocol v2.5</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-[25px] sm:text-[32px] md:text-[36px] font-black text-slate-900 tracking-tight leading-tight"
        >
          Hệ Điều Hành Nghi Thức Cuộc Họp Số
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-[12px] sm:text-[13.5px] text-slate-500 max-w-2xl mx-auto mt-1 leading-relaxed font-medium"
        >
          Chuẩn hóa kỷ luật hội nghị WebRTC on-premise, nhận diện giọng nói VAD thời gian thực và tự động trích xuất biên bản MoM & vé Kanban bằng AI cục bộ.
        </motion.p>
      </div>

      {/* ── THE LIVE MEETING PROTOCOL COCKPIT (INTERACTIVE CONSOLE WITH ENTRANCE ANIMATION) ── */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[940px] bg-white/95 backdrop-blur-2xl rounded-[28px] border border-white shadow-[0_20px_50px_rgba(15,23,42,0.09),0_1px_3px_rgba(0,0,0,0.05)] p-3 sm:p-5 flex flex-col z-20 shrink-0"
      >
        {/* Specular border light sweep animation on mount */}
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: "200%", opacity: [0, 0.8, 0] }}
          transition={{ duration: 1.8, delay: 0.5, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-1/3 h-[1.5px] bg-gradient-to-r from-transparent via-[#4F7BF7] to-transparent pointer-events-none rounded-t-full"
        />

        {/* ── TOP COCKPIT BAR: Live Room Status & Security Badge ── */}
        <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-slate-100/90 gap-2 shrink-0">
          {/* Left: Window Dots & Room Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[12px] sm:text-[13px] font-bold text-slate-800 tracking-tight">
                Phòng Họp Ban Điều Hành #04
              </span>
              <span className="hidden md:inline-flex text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Kiến Trúc On-Premise
              </span>
            </div>
          </div>

          {/* Right: Security Badge & Live Timer */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              <MaterialIcon name="security" className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% On-Premise AES-256</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-full">
              <MaterialIcon name="timer" className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-full">
              <MaterialIcon name="groups" className="w-3.5 h-3.5 text-slate-500" />
              <span>4</span>
            </div>
          </div>
        </div>

        {/* ── INTERACTIVE FEATURE SWITCHER TABS ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 my-2.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
          <button
            onClick={() => setActiveTab("webrtc")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold transition-all shrink-0 ${
              activeTab === "webrtc"
                ? "bg-[#4F7BF7] text-white shadow-[0_4px_14px_rgba(79,123,247,0.35)]"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <MaterialIcon name="graphic_eq" className="w-3.5 h-3.5" />
            <span>WebRTC & VAD Realtime</span>
          </button>

          <button
            onClick={() => setActiveTab("agenda")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold transition-all shrink-0 ${
              activeTab === "agenda"
                ? "bg-[#4F7BF7] text-white shadow-[0_4px_14px_rgba(79,123,247,0.35)]"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <MaterialIcon name="fact_check" className="w-3.5 h-3.5" />
            <span>Agenda Gate Kỷ Luật</span>
          </button>

          <button
            onClick={() => setActiveTab("mom")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold transition-all shrink-0 ${
              activeTab === "mom"
                ? "bg-[#4F7BF7] text-white shadow-[0_4px_14px_rgba(79,123,247,0.35)]"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <MaterialIcon name="smart_toy" className="w-3.5 h-3.5" />
            <span>Auto MoM & Mini Jira</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold transition-all shrink-0 ${
              activeTab === "security"
                ? "bg-[#4F7BF7] text-white shadow-[0_4px_14px_rgba(79,123,247,0.35)]"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <MaterialIcon name="lan" className="w-3.5 h-3.5" />
            <span>Chủ Quyền Dữ Liệu</span>
          </button>
        </div>

        {/* ── TAB CONTENT STAGE: STRICT FIXED HEIGHT (Lấy WebRTC làm chuẩn, ZERO layout shifting) ── */}
        <div className="relative h-[260px] sm:h-[268px] bg-gradient-to-b from-[#f9fbfe] to-[#f4f7fc] rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] shrink-0">
          <AnimatePresence mode="wait">
            {/* TAB 1: WEBRTC & VAD REALTIME (CHUẨN GỐC) */}
            {activeTab === "webrtc" && (
              <motion.div
                key="tab-webrtc"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col md:flex-row gap-3 h-full"
              >
                {/* Left Side: Active Speaker & Audio Waveform */}
                <div className="flex-1 flex flex-col justify-between bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm h-full">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
                        TH
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[12px] font-bold text-slate-900 leading-none">Trần Minh Hoàng</h4>
                          <span className="text-[8.5px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Tech Lead</span>
                        </div>
                        <p className="text-[9.5px] text-slate-500 mt-1 flex items-center gap-1">
                          <MaterialIcon name="mic" className="w-2.5 h-2.5 text-emerald-500" />
                          <span>Silero VAD: Đang phát biểu • 99.6% tin cậy</span>
                        </p>
                      </div>
                    </div>

                    {/* Audio Waveform Animation */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50/80 border border-emerald-200/80">
                      {[14, 22, 16, 26, 12, 20, 15, 24, 10].map((h, i) => (
                        <motion.span
                          key={i}
                          animate={{ height: [h * 0.4, h, h * 0.5] }}
                          transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, ease: "easeInOut" }}
                          className="w-1 bg-emerald-500 rounded-full"
                          style={{ height: `${h}px` }}
                        />
                      ))}
                      <span className="text-[9.5px] font-mono font-bold text-emerald-700 ml-1.5">&lt;180ms</span>
                    </div>
                  </div>

                  {/* Realtime Live Transcript */}
                  <div className="my-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                    <div className="flex items-center justify-between text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      <span>Bản Ghi Lời Thoại Thời Gian Thực (Faster-Whisper)</span>
                      <span className="text-emerald-600 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Stream
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
                      &ldquo;Hạ tầng LiveKit SFU cục bộ đã triển khai xong. Toàn bộ luồng thoại WebRTC và video nội bộ được mã hóa E2EE, không chuyển tiếp bất kỳ gói tin nào ra internet bên ngoài.&rdquo;
                    </p>
                  </div>

                  {/* Bilingual Live Translation */}
                  <div className="flex items-center gap-2 text-[9.5px] text-slate-500 bg-blue-50/60 px-2.5 py-1 rounded-md border border-blue-100">
                    <MaterialIcon name="translate" className="w-3.5 h-3.5 text-[#4F7BF7] shrink-0" />
                    <span className="italic text-slate-600 truncate">
                      EN: &ldquo;The local LiveKit SFU infrastructure has been deployed. All audio and video streams are E2EE encrypted...&rdquo;
                    </span>
                  </div>
                </div>

                {/* Right Side: WebRTC Node Stats */}
                <div className="w-full md:w-[260px] flex flex-col justify-between bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm h-full">
                  <div>
                    <h5 className="text-[10.5px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <MaterialIcon name="speed" className="w-3.5 h-3.5 text-[#4F7BF7]" />
                      Thông Số Truyền Dẫn
                    </h5>

                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between py-0.5 border-b border-slate-100">
                        <span className="text-slate-500">Giao thức WebRTC:</span>
                        <span className="font-bold font-mono text-slate-800">LiveKit SFU LAN</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-100">
                        <span className="text-slate-500">Độ trễ khứ hồi:</span>
                        <span className="font-bold font-mono text-emerald-600">14 ms (Nội mạng)</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-100">
                        <span className="text-slate-500">Nhận diện VAD:</span>
                        <span className="font-bold font-mono text-blue-600">Silero AI Engine</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500">Rò rỉ dữ liệu:</span>
                        <span className="font-bold font-mono text-emerald-700 bg-emerald-100 px-1.5 rounded">0.00% Zero</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center gap-2">
                    <MaterialIcon name="verified" className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[9px] font-semibold text-emerald-800 leading-snug">
                      Đạt chứng chỉ tuân thủ an toàn thông tin doanh nghiệp.
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: AGENDA GATE (CALIBRATED EXACT HEIGHT) */}
            {activeTab === "agenda" && (
              <motion.div
                key="tab-agenda"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col md:flex-row gap-3 h-full"
              >
                <div className="flex-1 bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <MaterialIcon name="gavel" className="w-3.5 h-3.5 text-amber-500" />
                        <h4 className="text-[12px] font-bold text-slate-900">Tiến Trình Nghị Trình Cuộc Họp</h4>
                      </div>
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Agenda Gate Kỷ Luật
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Item 1: Done */}
                      <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 border border-slate-200/70">
                        <div className="flex items-center gap-1.5">
                          <MaterialIcon name="check_circle" className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-[10.5px] font-bold text-slate-800 line-through">1. Đánh giá kiến trúc WebRTC On-Premise</p>
                            <span className="text-[8.5px] text-slate-400">Thời lượng: 10 phút • Hoàn thành đúng hạn</span>
                          </div>
                        </div>
                        <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Đã duyệt</span>
                      </div>

                      {/* Item 2: In Progress */}
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-blue-50/80 border border-blue-200 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          <div>
                            <p className="text-[11px] font-bold text-blue-950">2. Triển khai phân tách người nói & Silero VAD</p>
                            <span className="text-[9px] text-blue-700 font-medium">Đang thảo luận • Còn 04:15</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-blue-800 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                          ⏱️ 04:15
                        </span>
                      </div>

                      {/* Item 3: Locked */}
                      <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50/60 border border-slate-200/50 opacity-60">
                        <div className="flex items-center gap-1.5">
                          <MaterialIcon name="lock" className="w-3 h-3 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-[10.5px] font-medium text-slate-600">3. Xuất biên bản MoM & giao việc Kanban</p>
                            <span className="text-[8.5px] text-slate-400">Khóa tự động cho đến khi Mục 2 hoàn tất</span>
                          </div>
                        </div>
                        <span className="text-[8.5px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Chờ</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9.5px]">
                    <span className="text-slate-500">Biểu quyết chuyển mục:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      4/4 Thành viên đã đồng thuận
                    </span>
                  </div>
                </div>

                {/* Right Info Box */}
                <div className="w-full md:w-[260px] bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <h5 className="text-[10.5px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Quy Chuẩn Kỷ Luật
                    </h5>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Ngăn chặn tình trạng họp lan man hoặc kéo dài vô tận. Người chủ trì buộc phải có nghị trình được phê duyệt trước khi phòng họp mở cửa.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[9.5px] text-amber-900 font-medium">
                    ⚡ Tăng 42% hiệu suất ra quyết định ngay trong cuộc họp.
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: AUTO MOM & MINI JIRA (CALIBRATED EXACT HEIGHT) */}
            {activeTab === "mom" && (
              <motion.div
                key="tab-mom"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col md:flex-row gap-3 h-full"
              >
                <div className="flex-1 bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <MaterialIcon name="smart_toy" className="w-3.5 h-3.5 text-purple-600" />
                        <h4 className="text-[12px] font-bold text-slate-900">Biên Bản Cuộc Họp Tự Động (Auto MoM)</h4>
                      </div>
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        AI LLM Cục Bộ
                      </span>
                    </div>

                    {/* Extracted Key Decision */}
                    <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-200/80 mb-1.5">
                      <span className="text-[8.5px] font-bold text-purple-900 uppercase tracking-wider block mb-0.5">
                        📌 Quyết Định Trọng Tâm
                      </span>
                      <p className="text-[10.5px] font-semibold text-slate-800">
                        Thống nhất cấu hình máy chủ LiveKit SFU nội bộ, bảo toàn 100% dữ liệu mật không gửi ra dịch vụ ngoài.
                      </p>
                    </div>

                    {/* Auto-extracted Kanban Tasks */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8.5px] font-mono font-bold text-blue-700 bg-blue-100 px-1 py-0.2 rounded">AX-104</span>
                          <span className="text-[10.5px] font-semibold text-slate-800">Triển khai cụm LiveKit SFU server</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9.5px]">
                          <span className="text-slate-500">Hoàng TM</span>
                          <span className="text-[8px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">High</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8.5px] font-mono font-bold text-blue-700 bg-blue-100 px-1 py-0.2 rounded">AX-105</span>
                          <span className="text-[10.5px] font-semibold text-slate-800">Kiểm thử Silero VAD với 50 mic đồng thời</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9.5px]">
                          <span className="text-slate-500">Phương LK</span>
                          <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">Medium</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9.5px]">
                    <span className="text-slate-500">Tự động kết xuất:</span>
                    <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      Đồng bộ 1-Click sang Kanban Board
                    </span>
                  </div>
                </div>

                <div className="w-full md:w-[260px] bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <h5 className="text-[10.5px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Bóc Tách Tác Vụ
                    </h5>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      AI tự động nhận dạng cam kết trong lời thoại (&ldquo;tôi sẽ phụ trách phần này trước thứ Sáu&rdquo;) để tự động tạo vé việc rõ ràng kèm người chịu trách nhiệm và thời hạn.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-[9.5px] text-purple-900 font-medium">
                    🎯 Không còn tình trạng kết thúc cuộc họp mà không ai nhớ việc cần làm.
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: DATA SOVEREIGNTY (CALIBRATED EXACT HEIGHT) */}
            {activeTab === "security" && (
              <motion.div
                key="tab-security"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col md:flex-row gap-3 h-full"
              >
                <div className="flex-1 bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <MaterialIcon name="security" className="w-3.5 h-3.5 text-emerald-600" />
                        <h4 className="text-[12px] font-bold text-slate-900">Bảo Mật & Chủ Quyền Dữ Liệu On-Premise</h4>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Zero Telemetry
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="font-bold text-slate-800 block mb-0.5">🛡️ Air-Gapped Ready</span>
                        <p className="text-slate-500 text-[9.5px] leading-relaxed">
                          Vận hành hoàn toàn không cần kết nối internet công cộng. Thích hợp cho khối cơ quan, ngân hàng và quốc phòng.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="font-bold text-slate-800 block mb-0.5">🔐 Mã Hóa Toàn Vẹn</span>
                        <p className="text-slate-500 text-[9.5px] leading-relaxed">
                          Mã hóa E2EE chuẩn quân sự từ luồng WebRTC đến cơ sở dữ liệu lưu trữ biên bản cuộc họp.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9.5px]">
                    <span className="text-slate-500">Lưu trữ hạ tầng:</span>
                    <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      100% Cục Bộ Doanh Nghiệp
                    </span>
                  </div>
                </div>

                <div className="w-full md:w-[260px] bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <h5 className="text-[10.5px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Cam Kết Zero-Leak
                    </h5>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Khác biệt với Zoom, Teams hay Google Meet, toàn bộ model AI Whisper và LLM đều chạy trên GPU tại chỗ, dữ liệu không bao giờ rời khỏi tường lửa nội bộ.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[9.5px] text-emerald-900 font-medium">
                    🔒 Tuyệt đối bảo mật bí mật kinh doanh và chiến lược tổ chức.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── BOTTOM ACTION STRIP: CTAS & QUICK STATS ── */}
        <div className="flex flex-wrap items-center justify-between pt-2.5 mt-1 border-t border-slate-100 gap-3 shrink-0">
          {/* Quick Metrics */}
          <div className="flex items-center gap-3 sm:gap-5 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <MaterialIcon name="check" className="w-3.5 h-3.5 text-emerald-500" />
              <span>WebRTC &lt;200ms</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MaterialIcon name="check" className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% On-Premise</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MaterialIcon name="check" className="w-3.5 h-3.5 text-emerald-500" />
              <span>Auto MoM AI</span>
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <Link
              href="/docs"
              className="px-3 py-1.5 rounded-xl text-[11.5px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <MaterialIcon name="description" className="w-3.5 h-3.5 text-slate-500" />
              <span>Xem Tài Liệu</span>
            </Link>

            <Link
              href="/member"
              className="px-4 py-1.5 rounded-xl text-[11.5px] font-bold text-white bg-gradient-to-r from-[#4F7BF7] to-indigo-600 shadow-[0_4px_16px_rgba(79,123,247,0.35)] hover:brightness-105 active:scale-98 transition-all flex items-center gap-1.5"
            >
              <span>Vào Bàn Làm Việc Ngay</span>
              <MaterialIcon name="arrow_forward" className="w-3.5 h-3.5 text-white" />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
