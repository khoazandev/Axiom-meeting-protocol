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
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="lg:sticky lg:top-32 h-fit">
          <FadeContent>
            <div className="max-w-md space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
                Three steps to disciplined meetings.
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                The H-P-D-I protocol ensures every meeting creates measurable organizational value.
              </p>
            </div>
          </FadeContent>
        </div>

        <StaggerContainer className="grid grid-cols-1 gap-12">
          {STEPS.map((step, idx) => (
            <StaggerItem key={step.title} className="relative group">
              <div className="pl-12 border-l-2 border-border/30 group-hover:border-accent transition-colors duration-500 relative">
                <div className="absolute -left-[21px] top-0 w-10 h-10 rounded-xl bg-card border-2 border-border/30 group-hover:border-accent group-hover:bg-accent/10 flex items-center justify-center text-muted-foreground group-hover:text-accent transition-all duration-500 z-10">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="space-y-3 pt-1">
                  <h3 className="text-2xl font-bold tracking-tight text-foreground/80 group-hover:text-foreground transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-base">
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
