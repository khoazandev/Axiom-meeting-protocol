'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { SplitText } from '@/components/ui/reactbits/split-text';
import { CountUp } from '@/components/ui/reactbits/count-up';
import { FadeContent } from '@/components/ui/reactbits/fade-content';
import { ClickSpark } from '@/components/ui/reactbits/click-spark';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="px-6 md:px-12 pt-20 pb-24 md:pt-28 md:pb-32 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center min-h-[calc(100vh-64px)]">
      <div className="space-y-8 max-w-xl relative z-10">
        <div className="space-y-6">
          <SplitText
            text="Nền tảng họp thông minh."
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-extrabold tracking-[-0.035em] leading-[1.08] text-foreground"
            stagger={0.04}
            duration={0.7}
            y={40}
          />

          <FadeContent delay={0.6} duration={0.8}>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-[48ch] font-medium">
              On-premise video conferencing with native AI intelligence. Enforce agendas, transcribe
              securely, and capture structural data — zero external cloud dependency.
            </p>
          </FadeContent>
        </div>

        <FadeContent delay={0.9} duration={0.7}>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <ClickSpark sparkColor="var(--accent)">
              <Link 
                href="/meetings/create"
                className={cn(buttonVariants({ size: "lg", className: "rounded-full h-12 px-8 font-semibold text-sm bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer shadow-md shadow-accent/20 group" }))}
              >
                Deploy Meeting
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </ClickSpark>
            <Link 
              href="/meetings"
              className={cn(buttonVariants({ variant: "outline", size: "lg", className: "rounded-full h-12 px-8 font-semibold text-sm hover:bg-secondary transition-colors cursor-pointer" }))}
            >
              View Dashboard
            </Link>
          </div>
        </FadeContent>

        <FadeContent delay={1.2} duration={0.7}>
          <div className="pt-8 border-t border-border/50 grid grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-extrabold text-foreground tabular-nums">
                <CountUp end={100} suffix="%" />
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">On-Premise</p>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground tabular-nums">
                {'<'}
                <CountUp end={1} suffix="s" />
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">Latency</p>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground tabular-nums">
                <CountUp end={0} />
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">Data Leaks</p>
            </div>
          </div>
        </FadeContent>
      </div>

      <FadeContent direction="right" distance={60} delay={0.4} duration={1}>
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border/50 bg-secondary shadow-lg shadow-black/8 group">
          <Image
            src="/hero_enterprise.png"
            alt="Phòng họp trực tuyến"
            fill
            className="object-cover transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-foreground/5 rounded-xl pointer-events-none" />
        </div>
      </FadeContent>
    </section>
  );
}
