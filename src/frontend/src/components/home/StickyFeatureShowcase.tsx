"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import clsx from "clsx";
import Image from "next/image";
import LottiePlayer from "@/components/LottiePlayer";
import Anamorphic3DMeeting from "./Anamorphic3DMeeting";
import animDataAdv1 from "@/public/images/Person writing credentials.json";
import animDataAdv2 from "@/public/images/Person2.json";
import animDataAdv3 from "@/public/images/Champion.json";

const ADV_ANIMATIONS = [null, animDataAdv1, animDataAdv2, animDataAdv3];

const SIDEBAR_ICONS = [
  { id: 0, label: "Tổng quan", color: "from-[#4F7BF7] to-[#2563eb]", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
  { id: 1, label: "Nhận diện", color: "from-[#ec4899] to-[#be185d]", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> },
  { id: 2, label: "Tự động", color: "from-[#06b6d4] to-[#0369a1]", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
  { id: 3, label: "Ngữ cảnh", color: "from-[#f59e0b] to-[#b45309]", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
];

const ADVANTAGES = [
  {
    prefix: "Lớp năng lực 1",
    title: "Chủ quyền dữ liệu On-Premise tuyệt đối",
    description: "Không phụ thuộc vào bên thứ ba. Toàn bộ hình ảnh, âm thanh và biên bản cuộc họp được truyền tải qua hạ tầng WebRTC LiveKit và lưu trữ trực tiếp trong cơ sở dữ liệu nội bộ của doanh nghiệp, đảm bảo Zero Data Leakage.",
    tag: "Data Sovereignty",
    tagColor: "bg-blue-100 text-blue-600 border-blue-200"
  },
  {
    prefix: "Lớp năng lực 2",
    title: "Tự động hóa chuỗi giá trị cuộc họp",
    description: "Khép kín từ đầu đến cuối: Faster-Whisper ghi nhận lời thoại và dịch song ngữ thời gian thực, thuật toán khôi phục dấu câu tự động, AI tổng hợp Minutes of Meeting và đẩy 1-click sang Mini Jira.",
    tag: "Zero-touch Pipeline",
    tagColor: "bg-cyan-100 text-cyan-600 border-cyan-200"
  },
  {
    prefix: "Lớp năng lực 3",
    title: "Kỷ luật quy trình & Trí tuệ ngữ cảnh",
    description: "Cơ chế Process Gate yêu cầu nghị trình rõ ràng trước khi khởi tạo cuộc họp. Mô hình AI cục bộ trích xuất công việc chính xác: người thực hiện, thời hạn và độ ưu tiên — như một thư ký mẫn cán.",
    tag: "Process Gate & Local AI",
    tagColor: "bg-amber-100 text-amber-600 border-amber-200"
  },
];

// Scatter & Assemble animation variants
const scatterVariants = {
  hidden: (custom: { x: number; y: number; r: number; delay?: number }) => ({
    opacity: 0,
    x: custom.x,
    y: custom.y,
    rotate: custom.r,
    scale: 0.8,
    filter: "blur(6px)"
  }),
  visible: (custom: { x: number; y: number; r: number; delay?: number }) => ({
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { 
      type: "spring" as any, 
      stiffness: 75, 
      damping: 14, 
      mass: 0.9,
      delay: custom?.delay || 0 
    }
  }),
  exit: (custom: { x: number; y: number; r: number }) => ({
    opacity: 0,
    x: custom.x * -0.5,
    y: custom.y * -0.5,
    rotate: custom.r * -0.5,
    scale: 0.8,
    filter: "blur(6px)",
    transition: { duration: 0.35, ease: "anticipate" as any }
  })
};

export function StickyFeatureShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.25) setActiveIndex(0);
    else if (latest < 0.50) setActiveIndex(1);
    else if (latest < 0.75) setActiveIndex(2);
    else setActiveIndex(3);
  });

  return (
    <section ref={containerRef} className="relative h-[380vh] bg-[#f0f2f5] overflow-clip">
      
      <div className="sticky top-0 h-screen w-full flex items-center justify-center p-6 z-10 overflow-hidden">
        {/* Static Ambient Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-300/30 to-purple-300/30 blur-[80px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-gradient-to-br from-blue-300/30 to-cyan-300/30 blur-[80px] rounded-full" />
          <div className="absolute top-[20%] left-[40%] w-[400px] h-[400px] bg-gradient-to-br from-pink-200/20 to-orange-200/20 blur-[80px] rounded-full" />
        </div>

        <div className="container mx-auto w-full max-w-[1060px] h-full max-h-[620px] flex relative z-10">

          <div className="flex-1 relative h-full">
            <AnimatePresence mode="wait">
              
              {activeIndex === 0 && (
                <motion.div key="slide-0" className="absolute inset-0 flex items-center justify-center p-2">
                  {/* Full Open 3D Anamorphic Meeting Stage (No Box Container) */}
                  <motion.div 
                    custom={{ x: 0, y: -20, r: 0, delay: 0 }} 
                    variants={scatterVariants} 
                    initial="hidden" 
                    animate="visible" 
                    exit="exit"
                    className="w-full h-full relative overflow-visible flex items-center justify-center will-change-transform"
                  >
                    <Anamorphic3DMeeting />
                  </motion.div>
                </motion.div>
              )}

              {/* === SLIDES 1, 2, 3: ADVANTAGES === */}
              {[1, 2, 3].includes(activeIndex) && (
                <motion.div key={`slide-adv-${activeIndex}`} className="absolute inset-0 flex flex-col p-4 items-center justify-center">
                  
                  {/* Decorative big background text */}
                  <motion.div 
                     custom={{ x: 0, y: -200, r: 0 }} variants={scatterVariants} initial="hidden" animate="visible" exit="exit"
                     className="absolute top-10 left-1/2 -translate-x-1/2 text-center w-full px-10"
                  >
                     <h2 className="text-[38px] md:text-[46px] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#18181a] to-[#4F7BF7] tracking-tight leading-tight mb-2">
                        Nghi thức cuộc họp doanh nghiệp số
                     </h2>
                     <p className="text-[16px] text-[#757f9c] max-w-2xl mx-auto font-medium">Axiom DX-OS nâng tầm kỷ luật, bảo mật và hiệu suất vận hành của tổ chức.</p>
                  </motion.div>

                  <div className="w-full max-w-[1000px] flex flex-col md:flex-row items-center gap-10 mt-20 relative z-10">
                     
                     {/* Left: Lottie Animation */}
                     <motion.div 
                        custom={{ x: -400, y: Math.random() * 200 - 100, r: -25 }} variants={scatterVariants} initial="hidden" animate="visible" exit="exit"
                        className="w-full md:w-1/2 relative flex items-center justify-center"
                     >
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-[40px] border border-white/60 shadow-2xl rotate-3 scale-105"></div>
                        <div className="relative z-10 w-full bg-white/80 backdrop-blur-3xl rounded-[40px] border border-white p-10 flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                           <div className="w-[300px] h-[300px] flex items-center justify-center">
                              <LottiePlayer animationData={ADV_ANIMATIONS[activeIndex]} loop={true} className="w-full h-full drop-shadow-2xl" />
                           </div>
                        </div>
                     </motion.div>

                     {/* Right: Info Text */}
                     <motion.div 
                        custom={{ x: 400, y: Math.random() * 200 - 100, r: 25 }} variants={scatterVariants} initial="hidden" animate="visible" exit="exit"
                        className="w-full md:w-1/2 flex flex-col justify-center"
                     >
                        <motion.div 
                           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
                           className={`inline-block px-4 py-1.5 rounded-full text-[12px] font-bold tracking-wider mb-6 border w-fit ${ADVANTAGES[activeIndex - 1].tagColor}`}
                        >
                           {ADVANTAGES[activeIndex - 1].tag}
                        </motion.div>
                        
                        <h3 className="text-[36px] font-bold text-[#18181a] mb-6 leading-[1.1]">{ADVANTAGES[activeIndex - 1].title}</h3>
                        
                        <p className="text-[16px] text-[#757f9c] leading-relaxed mb-8">
                           {ADVANTAGES[activeIndex - 1].description}
                        </p>

                        <div className="flex gap-4 items-center">
                           <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md border border-[#e3e7f1] text-[#4F7BF7]">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                           </div>
                           <span className="font-semibold text-[#18181a]">Hoạt động ổn định 24/7</span>
                        </div>
                     </motion.div>
                  </div>

                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
