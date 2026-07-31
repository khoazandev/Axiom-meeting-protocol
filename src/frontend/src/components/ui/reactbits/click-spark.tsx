'use client';

import { useRef, useCallback, type ReactNode } from 'react';

interface ClickSparkProps {
  children: ReactNode;
  className?: string;
  sparkColor?: string;
  sparkCount?: number;
  sparkSize?: number;
}

export function ClickSpark({
  children,
  className = '',
  sparkColor = '#0369A1',
  sparkCount = 8,
  sparkSize = 6,
}: ClickSparkProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const createSpark = useCallback(
    (e: React.MouseEvent) => {
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (prefersReducedMotion || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        const angle = (360 / sparkCount) * i;
        const velocity = 30 + Math.random() * 40;

        spark.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${sparkSize}px;
          height: ${sparkSize}px;
          border-radius: 50%;
          background: ${sparkColor};
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
        `;

        containerRef.current.appendChild(spark);

        const radians = (angle * Math.PI) / 180;
        const dx = Math.cos(radians) * velocity;
        const dy = Math.sin(radians) * velocity;

        spark.animate(
          [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            {
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`,
              opacity: 0,
            },
          ],
          {
            duration: 500 + Math.random() * 200,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards',
          }
        ).onfinish = () => spark.remove();
      }
    },
    [sparkColor, sparkCount, sparkSize]
  );

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={createSpark}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
}
