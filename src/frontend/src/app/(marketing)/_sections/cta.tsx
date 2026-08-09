'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { FadeContent } from '@/components/ui/reactbits/fade-content';
import { ClickSpark } from '@/components/ui/reactbits/click-spark';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="px-6 md:px-12 py-24 md:py-32 bg-primary text-primary-foreground">
      <FadeContent>
        <div className="max-w-[800px] mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
            Ready to enforce meeting discipline?
          </h2>
          <p className="text-lg text-primary-foreground/70 font-medium leading-relaxed max-w-[50ch] mx-auto">
            Deploy Axiom on your infrastructure and transform how your organization conducts
            meetings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <ClickSpark sparkColor="#ffffff">
              <Link 
                href="/meetings/create"
                className={cn(buttonVariants({ size: "lg", className: "rounded-full h-12 px-8 font-semibold text-sm bg-white text-primary hover:bg-white/90 transition-colors cursor-pointer shadow-lg group" }))}
              >
                Deploy Meeting
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </ClickSpark>
            <Link 
              href="https://github.com/khoazandev/Axiom-meeting-protocol" 
              target="_blank"
              className={cn(buttonVariants({ variant: "outline", size: "lg", className: "rounded-full h-12 px-8 font-semibold text-sm border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 transition-colors cursor-pointer" }))}
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </FadeContent>
    </section>
  );
}
