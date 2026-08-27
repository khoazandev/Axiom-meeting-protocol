'use client';

import { FadeContent } from '@/components/ui/reactbits/fade-content';
import { CheckCircle2 } from 'lucide-react';
import { SECURITY_ITEMS, SECURITY_BADGES } from './constants';

export function SecuritySection() {
  return (
    <section id="security" className="px-6 md:px-12 py-24 md:py-32 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <FadeContent direction="left">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
              Absolute data sovereignty.
            </h2>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed">
              Axiom runs entirely within your infrastructure. Meeting data, transcriptions, and AI
              models stay inside your network perimeter.
            </p>
            <div className="space-y-4 pt-4">
              {SECURITY_ITEMS.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground/80 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeContent>

        <FadeContent direction="right" delay={0.2}>
          <div className="grid grid-cols-2 gap-4">
            {SECURITY_BADGES.map((badge) => (
              <div
                key={badge.title}
                className="bg-card p-6 rounded-xl border border-border/50 text-center space-y-3 shadow-sm hover:shadow-md hover:border-accent/20 transition-colors duration-500"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mx-auto">
                  <badge.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{badge.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeContent>
      </div>
    </section>
  );
}
