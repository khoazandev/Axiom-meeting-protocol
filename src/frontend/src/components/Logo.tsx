'use client';

import React from 'react';
import AxiomLogo, { AxiomIcon, AxiomLogoProps } from './AxiomLogo';

export interface LogoProps extends AxiomLogoProps {
  showBackground?: boolean;
}

/**
 * Standard Axiom Logo (The Resonant Pulse Vector Edition)
 * Automatically adapts across dark/light modes and scales cleanly to any size.
 */
export default function Logo({
  className,
  size = 'md',
  showBackground = false,
  showText = false,
  subtitle,
  variant,
  showBadge,
  ...props
}: LogoProps) {
  return (
    <AxiomLogo
      className={className}
      size={size}
      showBadge={showBadge ?? showBackground}
      showText={showText}
      subtitle={subtitle}
      variant={variant}
      {...props}
    />
  );
}

export { AxiomIcon, AxiomLogo };
