'use client';

import { FadeContent } from '@/components/ui/reactbits/fade-content';
import { TRUSTED_BY } from './constants';

export function TrustedBySection() {
  return (
    <section className="border-y border-border/50 bg-secondary/50 py-10">
      <FadeContent>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-8">
            Được tin dùng
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {TRUSTED_BY.map((name) => (
              <span
                key={name}
                className="text-sm font-bold text-muted-foreground/50 tracking-wide uppercase hover:text-muted-foreground transition-colors duration-300 cursor-default"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </FadeContent>
    </section>
  );
}
