'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface PageFlipContextType {
  isFlipping: boolean;
  flipDirection: 'toCareers' | 'toHome' | null;
  triggerFlip: (target: 'careers' | 'home') => void;
}

const PageFlipContext = createContext<PageFlipContextType>({
  isFlipping: false,
  flipDirection: null,
  triggerFlip: () => {},
});

export const usePageFlip = () => useContext(PageFlipContext);

interface PageFlipWrapperProps {
  children: React.ReactNode;
  pageType: 'home' | 'careers';
}

export function PageFlipWrapper({ children, pageType }: PageFlipWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'toCareers' | 'toHome' | null>(null);
  const [incomingTransition, setIncomingTransition] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('axiom_flip_direction');
      if (stored) {
        sessionStorage.removeItem('axiom_flip_direction');
        setIncomingTransition(true);
        const timer = setTimeout(() => {
          setIncomingTransition(false);
        }, 400);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [pathname]);

  const triggerFlip = (target: 'careers' | 'home') => {
    if (isFlipping) return;

    const direction = target === 'careers' ? 'toCareers' : 'toHome';
    setFlipDirection(direction);
    setIsFlipping(true);

    try {
      sessionStorage.setItem('axiom_flip_direction', direction);
    } catch {
      // ignore
    }

    // Halfway through the 3D page turn (~260ms), navigate to the new page
    setTimeout(() => {
      const destination = target === 'careers' ? '/careers' : '/';
      router.push(destination);
    }, 260);

    // End flipping state after complete turn
    setTimeout(() => {
      setIsFlipping(false);
    }, 550);
  };

  return (
    <PageFlipContext.Provider value={{ isFlipping, flipDirection, triggerFlip }}>
      <div className="w-full min-h-screen relative overflow-x-hidden">
        {/* Main Content: Keeps DOM clean and 60-120fps responsive without heavy 3D distortion */}
        <motion.div
          key={pathname}
          initial={
            incomingTransition
              ? {
                  opacity: 0.7,
                  x: pageType === 'careers' ? 20 : -20,
                }
              : false
          }
          animate={{
            opacity: isFlipping ? 0.4 : 1,
            x: 0,
          }}
          transition={{
            duration: 0.35,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="w-full min-h-screen"
        >
          {children}
        </motion.div>

        {/* ── HIGH-PERFORMANCE 3D PAGE FLIP OVERLAY (Zero Lag, 120 FPS) ── */}
        <AnimatePresence>
          {isFlipping && (
            <div
              className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden select-none"
              style={{
                perspective: '2200px',
                perspectiveOrigin: '50% 50%',
              }}
            >
              {/* Left/Base Page Darkening Ambient Spine Shadow */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="absolute inset-0 bg-black/40 pointer-events-none"
              />

              {/* Physical 3D Turning Page Leaf */}
              <motion.div
                initial={{
                  rotateY: 0,
                  scale: 1,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }}
                animate={{
                  rotateY: flipDirection === 'toCareers' ? -180 : 180,
                  scale: 0.98,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.52,
                  ease: [0.25, 1, 0.5, 1], // Realistic physical paper mass spring curve
                }}
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: flipDirection === 'toCareers' ? 'left center' : 'right center',
                  backfaceVisibility: 'hidden',
                  willChange: 'transform',
                }}
                className={`absolute top-0 bottom-0 ${
                  flipDirection === 'toCareers' ? 'right-0 w-1/2' : 'left-0 w-1/2'
                } bg-gradient-to-r from-slate-100 via-white to-slate-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 border border-slate-300/80 dark:border-white/20 shadow-[-20px_0_50px_rgba(0,0,0,0.35)] flex items-center justify-center`}
              >
                {/* Specular gloss lighting sweep on the paper surface */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10 pointer-events-none" />

                {/* Spine shadow on the page fold */}
                <div
                  className={`absolute top-0 bottom-0 w-16 bg-gradient-to-r from-black/25 to-transparent pointer-events-none ${
                    flipDirection === 'toCareers' ? 'left-0' : 'right-0'
                  }`}
                />

                {/* Outer curl page edge shadow */}
                <div
                  className={`absolute top-0 bottom-0 w-12 bg-gradient-to-l from-black/20 to-transparent pointer-events-none ${
                    flipDirection === 'toCareers' ? 'right-0' : 'left-0'
                  }`}
                />

                {/* Embossed Luxury Watermark */}
                <div className="opacity-15 font-mono text-xs uppercase tracking-[0.35em] font-bold text-slate-800 dark:text-neutral-100 pointer-events-none select-none">
                  Axiom Digital Enterprise
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageFlipContext.Provider>
  );
}
