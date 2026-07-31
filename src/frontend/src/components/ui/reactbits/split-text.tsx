'use client';

import { useRef, useEffect } from 'react';
import { gsap } from '@/lib/gsap-config';

interface SplitTextProps {
  text: string;
  className?: string;
  splitBy?: 'words' | 'chars';
  delay?: number;
  stagger?: number;
  duration?: number;
  y?: number;
  once?: boolean;
}

export function SplitText({
  text,
  className = '',
  splitBy = 'words',
  delay = 0,
  stagger = 0.05,
  duration = 0.6,
  y = 30,
  once = true,
}: SplitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!containerRef.current || hasAnimated.current) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      // Show text immediately without animation
      const spans = containerRef.current.querySelectorAll('span > span');
      spans.forEach((span) => {
        (span as HTMLElement).style.opacity = '1';
        (span as HTMLElement).style.transform = 'none';
      });
      return;
    }

    const spans = containerRef.current.querySelectorAll('span > span');

    gsap.fromTo(
      spans,
      { y, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration,
        stagger,
        delay,
        ease: 'power3.out',
        onComplete: () => {
          if (once) hasAnimated.current = true;
        },
      }
    );
  }, [text, delay, stagger, duration, y, once]);

  const items = splitBy === 'words' ? text.split(' ') : text.split('');

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ display: 'flex', flexWrap: 'wrap' }}
      aria-label={text}
    >
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            overflow: 'hidden',
            marginRight: splitBy === 'words' ? '0.3em' : undefined,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              opacity: 0,
              transform: `translateY(${y}px)`,
              willChange: 'transform, opacity',
            }}
          >
            {item}
            {splitBy === 'chars' && item === ' ' ? '\u00A0' : ''}
          </span>
        </span>
      ))}
    </div>
  );
}
