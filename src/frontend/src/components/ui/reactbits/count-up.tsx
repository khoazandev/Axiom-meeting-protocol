'use client';

import { useRef, useEffect, useCallback } from 'react';

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}

export function CountUp({
  end,
  start = 0,
  duration = 2,
  prefix = '',
  suffix = '',
  className = '',
  decimals = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    if (!ref.current || hasAnimated.current) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      if (ref.current) {
        ref.current.textContent = `${prefix}${end.toFixed(decimals)}${suffix}`;
      }
      return;
    }

    hasAnimated.current = true;
    const startTime = performance.now();
    const range = end - start;
    const el = ref.current;

    function step(currentTime: number) {
      const elapsed = (currentTime - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = start + range * easedProgress;

      if (el) {
        el.textContent = `${prefix}${Number(currentValue.toFixed(decimals))}${suffix}`;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }, [end, start, duration, decimals, prefix, suffix]);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animate]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {start.toFixed(decimals)}
      {suffix}
    </span>
  );
}
