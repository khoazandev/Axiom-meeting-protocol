'use client';

import React, { useId } from 'react';
import clsx from 'clsx';

export interface AxiomLogoProps {
  className?: string;
  /** Size in pixels (number) or predefined preset */
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  /** Show the "AXIOM" brand wordmark next to the icon */
  showText?: boolean;
  /** Custom subtitle under AXIOM (e.g. "DX-OS", "MEETING PROTOCOL") */
  subtitle?: string;
  /** Style variant */
  variant?: 'gradient' | 'monochrome' | 'white';
  /** Wrap the vector icon in a rounded glass container badge */
  showBadge?: boolean;
}

export function AxiomIcon({
  size = 36,
  variant = 'gradient',
  className,
}: {
  size?: number | string;
  variant?: 'gradient' | 'monochrome' | 'white';
  className?: string;
}) {
  const id = useId();
  const gradPrimary = `axiom-pulse-p-${id}`;
  const gradCyan = `axiom-pulse-c-${id}`;
  const gradFacet = `axiom-pulse-f-${id}`;

  const numSize = typeof size === 'number' ? size : 36;

  return (
    <svg
      width={numSize}
      height={numSize}
      viewBox="0 0 46 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        'shrink-0 transition-transform duration-300 group-hover:scale-105',
        className
      )}
    >
      <defs>
        {/* Main Electric Blue -> Cyan Gradient */}
        <linearGradient id={gradPrimary} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F7BF7" />
          <stop offset="60%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Luminous Cyan Accent */}
        <linearGradient id={gradCyan} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Top Isometric Facet Gradient */}
        <linearGradient id={gradFacet} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F7BF7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* ── PART 1: Resonant Soundwave (Voice / Real-time Audio) ── */}
      {/* Bar 1: Ambient Low Pulse */}
      <rect
        x="3"
        y="16.5"
        width="3"
        height="11"
        rx="1.5"
        fill={variant === 'monochrome' ? 'currentColor' : `url(#${gradPrimary})`}
        opacity={0.85}
      />

      {/* Bar 2: Harmonic Mid Pulse */}
      <rect
        x="8"
        y="11"
        width="3"
        height="22"
        rx="1.5"
        fill={variant === 'monochrome' ? 'currentColor' : `url(#${gradPrimary})`}
      />

      {/* Bar 3: Peak Resonant Wave */}
      <rect
        x="13"
        y="6"
        width="3.2"
        height="32"
        rx="1.6"
        fill={variant === 'monochrome' ? 'currentColor' : `url(#${gradPrimary})`}
      />

      {/* Bar 4: Transition Voice Bar */}
      <rect
        x="18.2"
        y="12.5"
        width="3"
        height="19"
        rx="1.5"
        fill={variant === 'monochrome' ? 'currentColor' : `url(#${gradCyan})`}
      />

      {/* ── PART 2: Transition Bridge Vectors (Sound to Data transformation) ── */}
      <path
        d="M21.2 16.5H24M21.2 22H24M21.2 27.5H24"
        stroke={variant === 'monochrome' ? 'currentColor' : `url(#${gradCyan})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* ── PART 3: Structured Isometric Crystal Lattice (MoM & Action Items) ── */}
      {/* Top Isometric Facet (Shaded) */}
      <polygon points="33.5,10.5 43,16 33.5,21.5 24,16" fill={`url(#${gradFacet})`} />

      {/* Outer Hexagon Contour */}
      <polygon
        points="33.5,10.5 43,16 43,27 33.5,32.5 24,27 24,16"
        stroke={variant === 'monochrome' ? 'currentColor' : `url(#${gradPrimary})`}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Inner Isometric Cube Ribs */}
      <path
        d="M33.5 21.5V32.5M33.5 21.5L43 16M33.5 21.5L24 16"
        stroke={variant === 'monochrome' ? 'currentColor' : `url(#${gradCyan})`}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Central Quantum Node (Synthesized Decision / Action item) */}
      <circle cx="33.5" cy="21.5" r="2" fill="#38BDF8" className="animate-pulse" />
    </svg>
  );
}

export default function AxiomLogo({
  className,
  size = 'md',
  showText = true,
  subtitle = 'DX-OS',
  variant = 'gradient',
  showBadge = false,
}: AxiomLogoProps) {
  // Translate size presets to pixel numbers
  const pixelMap: Record<string, number> = {
    sm: 28,
    md: 36,
    lg: 44,
    xl: 56,
  };

  const pixelSize = typeof size === 'number' ? size : pixelMap[size] || 36;

  const badgeSizeClasses: Record<string, string> = {
    sm: 'w-8 h-8 rounded-lg p-1',
    md: 'w-10 h-10 rounded-xl p-1.5',
    lg: 'w-12 h-12 rounded-2xl p-2',
    xl: 'w-16 h-16 rounded-[1.25rem] p-2.5',
  };

  const badgeClass = typeof size === 'string' ? badgeSizeClasses[size] : 'p-1.5 rounded-xl';

  return (
    <div className={clsx('inline-flex items-center gap-3 select-none group shrink-0', className)}>
      {/* Icon with optional badge wrapper */}
      {showBadge ? (
        <div
          className={clsx(
            'flex items-center justify-center shrink-0 bg-gradient-to-br from-[#18181a] via-[#1e2230] to-[#0f172a] border border-white/10 shadow-md shadow-[#4F7BF7]/10',
            badgeClass
          )}
        >
          <AxiomIcon size={pixelSize * 0.75} variant={variant === 'white' ? 'gradient' : variant} />
        </div>
      ) : (
        <AxiomIcon size={pixelSize} variant={variant === 'white' ? 'gradient' : variant} />
      )}

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'font-extrabold tracking-tight text-[17px] font-sans',
                variant === 'white'
                  ? 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.2)]'
                  : 'text-[#18181a] dark:text-white'
              )}
            >
              AXIOM
            </span>
            {subtitle && (
              <span
                className={clsx(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wider uppercase',
                  variant === 'white'
                    ? 'bg-blue-500/25 text-blue-300 border border-blue-400/40 shadow-sm'
                    : 'bg-[#4F7BF7]/10 text-[#4F7BF7] border border-[#4F7BF7]/20'
                )}
              >
                {subtitle}
              </span>
            )}
          </div>
          <span
            className={clsx(
              'text-[9px] font-medium tracking-[0.16em] uppercase mt-0.5',
              variant === 'white' ? 'text-slate-300' : 'text-[#757f9c] dark:text-slate-400'
            )}
          >
            Meeting Protocol
          </span>
        </div>
      )}
    </div>
  );
}
