'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import clsx from 'clsx';
import Image from 'next/image';
import LottiePlayer from '@/components/LottiePlayer';
import Anamorphic3DMeeting from './Anamorphic3DMeeting';
import animDataAdv1 from '@/public/images/Person writing credentials.json';
import animDataAdv2 from '@/public/images/Person2.json';
import animDataAdv3 from '@/public/images/Champion.json';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

const ADV_ANIMATIONS = [null, animDataAdv1, animDataAdv2, animDataAdv3];

// Scatter & Assemble animation variants
const scatterVariants = {
  hidden: (custom: { x: number; y: number; r: number; delay?: number }) => ({
    opacity: 0,
    x: custom.x,
    y: custom.y,
    rotate: custom.r,
    scale: 0.8,
    filter: 'blur(6px)',
  }),
  visible: (custom: { x: number; y: number; r: number; delay?: number }) => ({
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as any,
      stiffness: 75,
      damping: 14,
      mass: 0.9,
      delay: custom?.delay || 0,
    },
  }),
  exit: (custom: { x: number; y: number; r: number }) => ({
    opacity: 0,
    x: custom.x * -0.5,
    y: custom.y * -0.5,
    rotate: custom.r * -0.5,
    scale: 0.8,
    filter: 'blur(6px)',
    transition: { duration: 0.35, ease: 'anticipate' as any },
  }),
};

export function StickyFeatureShowcase() {
  const { t } = useLanguageStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const ADVANTAGES = [
    {
      prefix: t.landing.layer1Title,
      title: t.landing.layer1Title,
      description: t.landing.layer1Desc,
      tag: 'Data Sovereignty',
      tagColor: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    },
    {
      prefix: t.landing.layer2Title,
      title: t.landing.layer2Title,
      description: t.landing.layer2Desc,
      tag: 'Zero-touch Pipeline',
      tagColor: 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900',
    },
    {
      prefix: t.landing.layer3Title,
      title: t.landing.layer3Title,
      description: t.landing.layer3Desc,
      tag: 'Process Gate & Local AI',
      tagColor: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    },
  ];

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest < 0.25) setActiveIndex(0);
    else if (latest < 0.5) setActiveIndex(1);
    else if (latest < 0.75) setActiveIndex(2);
    else setActiveIndex(3);
  });

  return (
    <section ref={containerRef} className="relative h-[380vh] bg-[#f0f2f5] dark:bg-black overflow-clip transition-colors">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center p-6 z-10 overflow-hidden">
        {/* Static Ambient Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-300/30 to-purple-300/30 dark:from-indigo-900/20 dark:to-purple-900/20 blur-[80px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-gradient-to-br from-blue-300/30 to-cyan-300/30 dark:from-blue-900/20 dark:to-cyan-900/20 blur-[80px] rounded-full" />
          <div className="absolute top-[20%] left-[40%] w-[400px] h-[400px] bg-gradient-to-br from-pink-200/20 to-orange-200/20 dark:from-pink-900/10 dark:to-orange-900/10 blur-[80px] rounded-full" />
        </div>

        <div className="container mx-auto w-full max-w-[1060px] h-full max-h-[620px] flex relative z-10">
          <div className="flex-1 relative h-full">
            <AnimatePresence mode="wait">
              {activeIndex === 0 && (
                <motion.div
                  key="slide-0"
                  className="absolute inset-0 flex items-center justify-center p-2"
                >
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
                <motion.div
                  key={`slide-adv-${activeIndex}`}
                  className="absolute inset-0 flex flex-col p-4 items-center justify-center"
                >
                  {/* Decorative big background text */}
                  <motion.div
                    custom={{ x: 0, y: -200, r: 0 }}
                    variants={scatterVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute top-10 left-1/2 -translate-x-1/2 text-center w-full px-10"
                  >
                    <h2 className="text-[38px] md:text-[46px] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#18181a] to-[#4F7BF7] dark:from-white dark:to-blue-400 tracking-tight leading-tight mb-2">
                      {t.landing.protocolSectionTitle}
                    </h2>
                    <p className="text-[16px] text-[#757f9c] dark:text-neutral-400 max-w-2xl mx-auto font-medium">
                      {t.landing.protocolSectionSubtitle}
                    </p>
                  </motion.div>

                  <div className="w-full max-w-[1000px] flex flex-col md:flex-row items-center gap-10 mt-20 relative z-10">
                    {/* Left: Lottie Animation */}
                    <motion.div
                      custom={{ x: -400, y: Math.random() * 200 - 100, r: -25 }}
                      variants={scatterVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="w-full md:w-1/2 relative flex items-center justify-center"
                    >
                      <div className="absolute inset-0 bg-white/40 dark:bg-neutral-800/40 backdrop-blur-2xl rounded-[40px] border border-white/60 dark:border-neutral-700/60 shadow-2xl rotate-3 scale-105"></div>
                      <div className="relative z-10 w-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-3xl rounded-[40px] border border-white dark:border-neutral-700 p-10 flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                        <div className="w-[300px] h-[300px] flex items-center justify-center">
                          <LottiePlayer
                            animationData={ADV_ANIMATIONS[activeIndex]}
                            loop={true}
                            className="w-full h-full drop-shadow-2xl"
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Right: Info Text */}
                    <motion.div
                      custom={{ x: 400, y: Math.random() * 200 - 100, r: 25 }}
                      variants={scatterVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="w-full md:w-1/2 flex flex-col justify-center"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className={`inline-block px-4 py-1.5 rounded-full text-[12px] font-bold tracking-wider mb-6 border w-fit ${ADVANTAGES[activeIndex - 1].tagColor}`}
                      >
                        {ADVANTAGES[activeIndex - 1].tag}
                      </motion.div>

                      <h3 className="text-[36px] font-bold text-[#18181a] dark:text-white mb-6 leading-[1.1]">
                        {ADVANTAGES[activeIndex - 1].title}
                      </h3>

                      <p className="text-[16px] text-[#757f9c] dark:text-neutral-400 leading-relaxed mb-8">
                        {ADVANTAGES[activeIndex - 1].description}
                      </p>

                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shadow-md border border-[#e3e7f1] dark:border-neutral-700 text-[#4F7BF7] dark:text-blue-400">
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <span className="font-semibold text-[#18181a] dark:text-white">{t.landing.uptimeBadge}</span>
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
