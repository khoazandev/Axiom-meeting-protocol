'use client';

import { FadeContent } from '@/components/ui/reactbits/fade-content';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-container';
import { STEPS } from './constants';

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="px-6 md:px-12 py-24 md:py-32 bg-secondary/40 border-y border-border/50"
    >
      <div className="max-w-[1400px] mx-auto">
        <FadeContent>
          <div className="max-w-2xl space-y-4 mb-16">
            <p className="text-accent font-semibold text-sm tracking-wide uppercase">Process</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
              Three steps to disciplined meetings.
            </h2>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed">
              The H-P-D-I protocol ensures every meeting creates measurable organizational value.
            </p>
          </div>
        </FadeContent>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <StaggerItem key={step.number} className="relative">
              <div className="bg-card p-8 rounded-xl border border-border/50 space-y-6 h-full shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-5xl font-extrabold text-accent/15 tracking-tighter">
                    {step.number}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold tracking-tight">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
