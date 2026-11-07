'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const LottieComponent = dynamic(
  () =>
    import('lottie-react').then((mod) => {
      const Component = (mod as any).Lottie || (mod as any).default || mod;
      return { default: Component as React.ComponentType<any> };
    }),
  { ssr: false }
);

export interface LottiePlayerProps {
  animationData?: any;
  src?: any;
  loop?: boolean | number;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function LottiePlayer({
  animationData,
  src,
  loop = true,
  autoplay = true,
  className,
  style,
}: LottiePlayerProps) {
  const animSrc = src || animationData;
  if (!animSrc) return null;
  return (
    <LottieComponent
      src={animSrc}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
    />
  );
}
