'use client';

import React from 'react';

interface CanvaRulersProps {
  showRulers: boolean;
  showGrid: boolean;
  zoomScale: number;
}

export function CanvaRulers({ showRulers, showGrid }: CanvaRulersProps) {
  if (!showRulers && !showGrid) return null;

  return (
    <>
      {/* Millimeter/Pixel Grid Overlay over A4 Canvas */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(99, 102, 241, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(99, 102, 241, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
      )}

      {/* Top Horizontal Ruler */}
      {showRulers && (
        <div className="absolute top-0 left-8 right-0 h-6 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 text-[8px] font-mono text-slate-400 select-none z-10 flex items-end overflow-hidden">
          {Array.from({ length: 22 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-slate-300 dark:border-slate-800 h-2.5 relative"
            >
              <span className="absolute -top-3 left-1">{i * 10}mm</span>
            </div>
          ))}
        </div>
      )}

      {/* Left Vertical Ruler */}
      {showRulers && (
        <div className="absolute top-6 left-0 bottom-0 w-8 bg-slate-100 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 text-[8px] font-mono text-slate-400 select-none z-10 flex flex-col items-end overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-b border-slate-300 dark:border-slate-800 w-2.5 relative"
            >
              <span className="absolute top-0 -left-6 transform -rotate-90">{i * 10}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
