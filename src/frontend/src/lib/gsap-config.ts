'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register plugins once globally
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ─── Animation Presets ───────────────────────────────────────
export const EASE = {
  smooth: 'power2.out',
  smoothInOut: 'power2.inOut',
  sharp: 'power3.out',
  spring: 'elastic.out(1, 0.5)',
  expo: 'expo.out',
} as const;

export const DURATION = {
  fast: 0.3,
  normal: 0.6,
  slow: 0.9,
  hero: 1.2,
} as const;

// ─── Scroll Trigger Defaults ─────────────────────────────────
const scrollTriggerDefaults = {
  start: 'top 85%',
  end: 'bottom 20%',
  toggleActions: 'play none none none',
} as const;

// ─── Reusable Animation Factories ────────────────────────────
function createFadeUp(
  element: gsap.TweenTarget,
  options?: { delay?: number; duration?: number; y?: number }
) {
  return gsap.from(element, {
    y: options?.y ?? 40,
    opacity: 0,
    duration: options?.duration ?? DURATION.normal,
    delay: options?.delay ?? 0,
    ease: EASE.sharp,
  });
}

function createStagger(
  elements: gsap.TweenTarget,
  options?: { stagger?: number; duration?: number; y?: number }
) {
  return gsap.from(elements, {
    y: options?.y ?? 30,
    opacity: 0,
    duration: options?.duration ?? DURATION.normal,
    stagger: options?.stagger ?? 0.12,
    ease: EASE.sharp,
  });
}

export { gsap, ScrollTrigger, scrollTriggerDefaults, createFadeUp, createStagger };
