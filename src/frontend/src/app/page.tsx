import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Video, FileText, Lock } from 'lucide-react';
import { AnimatedText } from '@/components/ui/animated-text';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-container';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* Navigation */}
      <header className="flex items-center justify-between h-16 px-6 md:px-12 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="Axiom Logo" width={32} height={32} className="rounded-md" />
          <span className="font-semibold tracking-tight text-sm">Axiom</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#security" className="hover:text-foreground transition-colors">
            Security
          </Link>
          <Link href="/meetings" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
        </nav>
        <div>
          <Link href="/meetings/create">
            <MagneticButton>
              <Button
                size="sm"
                className="rounded-full px-4 font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
              >
                New Meeting
              </Button>
            </MagneticButton>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - Split Layout */}
        <section className="px-6 md:px-12 pt-24 pb-32 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center min-h-[calc(100vh-64px)]">
          <div className="space-y-10 max-w-xl relative z-10">
            <div className="space-y-6">
              <AnimatedText
                text="The enterprise meeting protocol."
                className="text-5xl md:text-6xl lg:text-[72px] font-bold tracking-tighter leading-[1.05] text-balance text-foreground"
              />
              <AnimatedText
                text="On-premise video conferencing with native AI intelligence. Enforce agendas, transcribe securely, and capture structural data—zero external cloud dependency."
                className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-[45ch] block font-medium"
                delay={2}
              />
            </div>

            <StaggerContainer className="flex flex-col sm:flex-row gap-4 pt-2">
              <StaggerItem>
                <Link href="/meetings/create">
                  <MagneticButton>
                    <Button
                      size="lg"
                      className="rounded-full h-12 px-8 font-medium group text-sm bg-foreground text-background hover:bg-foreground/90 transition-all"
                    >
                      Deploy Meeting
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </MagneticButton>
                </Link>
              </StaggerItem>
              <StaggerItem>
                <Link href="/meetings">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full h-12 px-8 font-medium text-sm hover:bg-muted/50 transition-all"
                  >
                    View Dashboard
                  </Button>
                </Link>
              </StaggerItem>
            </StaggerContainer>

            <div className="pt-10 border-t border-border/40 flex items-center gap-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider animate-in fade-in duration-1000 delay-500 fill-mode-both">
              <span className="flex items-center gap-2 text-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-30"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground"></span>
                </span>
                Olympic PMNM 2026
              </span>
              <span className="w-1 h-1 bg-border rounded-full" />
              <span>DX-OS Standard</span>
            </div>
          </div>

          <div className="relative aspect-square md:aspect-[4/3] lg:aspect-[1/1.1] rounded-[2rem] overflow-hidden border border-border/40 bg-muted/20 shadow-2xl shadow-black/5 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 fill-mode-both group">
            <Image
              src="/hero_dashboard.jpg"
              alt="Smart Meeting AI Dashboard Interface"
              fill
              className="object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02] opacity-90 mix-blend-luminosity hover:mix-blend-normal hover:opacity-100"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-foreground/5 rounded-[2rem] pointer-events-none z-20" />
          </div>
        </section>

        {/* Features Bento Grid */}
        <section
          id="features"
          className="px-6 md:px-12 py-32 bg-zinc-50 dark:bg-zinc-900/10 border-t border-border/40 relative"
        >
          <div className="max-w-[1400px] mx-auto space-y-16 relative z-10">
            <div className="max-w-2xl space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
                Structured by design.
              </h2>
              <p className="text-lg text-muted-foreground font-medium">
                Every meeting follows the H-P-D-I architectural pattern, ensuring alignment before
                anyone joins the call.
              </p>
            </div>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StaggerItem className="bg-background p-8 rounded-3xl border border-border/40 space-y-8 shadow-sm hover:shadow-md transition-shadow duration-500">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-foreground">
                  <Video className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight">Axiom Media Engine</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    Integrated WebRTC video conferencing powered by LiveKit that runs entirely on
                    your infrastructure with ultra-low latency.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem className="bg-background p-8 rounded-3xl border border-border/40 space-y-8 shadow-sm hover:shadow-md transition-shadow duration-500">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight">AI Transcription</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    Local Whisper models capture every word. Llama-3 distills action items and
                    decisions automatically.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem className="bg-background p-8 rounded-3xl border border-border/40 space-y-8 shadow-sm hover:shadow-md transition-shadow duration-500">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-foreground">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight">Data Sovereign</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    Your intellectual property never leaves your servers. True On-Premise security
                    for enterprise data.
                  </p>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-12 px-6 md:px-12 bg-background">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">
          <p>© 2026 Axiom. Built for Olympic PMNM.</p>
          <p className="flex gap-6">
            <span className="hover:text-foreground transition-colors cursor-pointer">
              H (Human)
            </span>
            <span className="hover:text-foreground transition-colors cursor-pointer">
              P (Process)
            </span>
            <span className="hover:text-foreground transition-colors cursor-pointer">D (Data)</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">
              I (Intelligence)
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
