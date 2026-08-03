'use client';

import { FadeContent } from '@/components/ui/reactbits/fade-content';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-container';
import { Video, FileText, Lock, ChevronRight } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="features" className="px-6 md:px-12 py-24 md:py-32 max-w-[1400px] mx-auto">
      <FadeContent>
        <div className="max-w-2xl space-y-4 mb-16">
          <p className="text-accent font-semibold text-sm tracking-wide uppercase">Architecture</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
            Structured by design.
          </h2>
          <p className="text-lg text-muted-foreground font-medium leading-relaxed">
            Every meeting follows the H-P-D-I architectural pattern — ensuring alignment before
            anyone joins the call.
          </p>
        </div>
      </FadeContent>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StaggerItem className="group bg-card p-8 rounded-xl border border-border/50 space-y-6 shadow-sm hover:shadow-lg hover:border-accent/20 transition-colors duration-500 cursor-default">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Video className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-bold tracking-tight">Axiom Media Engine</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Integrated WebRTC video conferencing powered by LiveKit that runs entirely on your
              infrastructure with ultra-low latency.
            </p>
          </div>
          <div className="flex items-center text-accent text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Learn more <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </StaggerItem>

        <StaggerItem className="group bg-card p-8 rounded-xl border border-border/50 space-y-6 shadow-sm hover:shadow-lg hover:border-accent/20 transition-colors duration-500 cursor-default">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-bold tracking-tight">AI Transcription</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Local Whisper models capture every word. Llama-3 distills action items and decisions
              automatically.
            </p>
          </div>
          <div className="flex items-center text-accent text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Learn more <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </StaggerItem>

        <StaggerItem className="group bg-card p-8 rounded-xl border border-border/50 space-y-6 shadow-sm hover:shadow-lg hover:border-accent/20 transition-colors duration-500 cursor-default">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-bold tracking-tight">Data Sovereign</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Your intellectual property never leaves your servers. True On-Premise security for dữ
              liệu của bạn.
            </p>
          </div>
          <div className="flex items-center text-accent text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Learn more <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}
