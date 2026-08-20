'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Minus, ChevronsUp } from 'lucide-react';

interface PriorityIconProps {
  priority: string;
  className?: string;
}

export function PriorityIcon({ priority, className = 'w-3.5 h-3.5' }: PriorityIconProps) {
  switch (priority.toUpperCase()) {
    case 'CRITICAL':
    case 'HIGHEST':
      return (
        <span title="Critical / Highest" className="inline-flex items-center text-rose-500 font-bold">
          <ChevronsUp className={className} />
        </span>
      );
    case 'HIGH':
      return (
        <span title="High" className="inline-flex items-center text-amber-500 font-semibold">
          <ArrowUp className={className} />
        </span>
      );
    case 'LOW':
    case 'LOWEST':
      return (
        <span title="Low" className="inline-flex items-center text-emerald-500">
          <ArrowDown className={className} />
        </span>
      );
    case 'MEDIUM':
    default:
      return (
        <span title="Medium" className="inline-flex items-center text-orange-400">
          <Minus className={className} />
        </span>
      );
  }
}
