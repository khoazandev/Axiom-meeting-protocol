'use client';

import { useRef, type ReactNode } from 'react';
import { gsap } from '@/lib/gsap-config';
import { useGSAP } from '@gsap/react';

export function StaggerContainer({
  children,
  className = '',
  stagger = 0.12,
  y = 30,
  duration = 0.7,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  duration?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) return;

      const items = containerRef.current.querySelectorAll('[data-stagger-item]');
      if (items.length === 0) return;

      gsap.fromTo(
        items,
        { y, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration,
          stagger,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-stagger-item className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
