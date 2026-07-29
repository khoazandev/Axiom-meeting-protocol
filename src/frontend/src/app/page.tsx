import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Video, FileText, Lock } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <header className="flex items-center justify-between h-20 px-6 md:px-12 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-foreground rounded-sm flex items-center justify-center">
            <span className="text-background font-bold text-sm">DX</span>
          </div>
          <span className="font-semibold tracking-tight text-lg">Axiom</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
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
            <Button className="rounded-full px-6 font-medium">New Meeting</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - Split Layout */}
        <section className="px-6 md:px-12 pt-16 md:pt-24 pb-20 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[calc(100vh-80px)]">
          <div className="space-y-8 max-w-xl">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tighter leading-[1.05] text-balance">
                The enterprise meeting protocol.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-[45ch]">
                On-premise video conferencing with native AI intelligence. Enforce agendas,
                transcribe securely, and capture structural data—zero external cloud dependency.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/meetings/create">
                <Button size="lg" className="rounded-full h-12 px-8 font-medium group">
                  Deploy Meeting
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/meetings">
                <Button variant="outline" size="lg" className="rounded-full h-12 px-8 font-medium">
                  View Dashboard
                </Button>
              </Link>
            </div>

            <div className="pt-8 border-t border-border/40 flex items-center gap-4 text-sm text-muted-foreground font-medium">
              <span>Built for Olympic PMNM 2026</span>
              <span className="w-1 h-1 bg-border rounded-full" />
              <span>DX-OS Standard</span>
            </div>
          </div>

          <div className="relative aspect-square md:aspect-[4/3] lg:aspect-square bg-muted rounded-2xl overflow-hidden border border-border/50">
            <Image
              src="/hero_dashboard.jpg"
              alt="Smart Meeting AI Dashboard Interface"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-foreground/10 rounded-2xl pointer-events-none" />
          </div>
        </section>

        {/* Features Bento Grid */}
        <section
          id="features"
          className="px-6 md:px-12 py-24 bg-zinc-50 dark:bg-zinc-900/20 border-t border-border/40"
        >
          <div className="max-w-[1400px] mx-auto space-y-16">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                Structured by design.
              </h2>
              <p className="text-lg text-muted-foreground">
                Every meeting follows the H-P-D-I architectural pattern, ensuring alignment before
                anyone joins the call.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-background p-8 rounded-2xl border border-border/50 space-y-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Video className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-medium tracking-tight">Jitsi Native</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Integrated WebRTC video conferencing that runs entirely on your infrastructure.
                </p>
              </div>

              <div className="bg-background p-8 rounded-2xl border border-border/50 space-y-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-medium tracking-tight">AI Transcription</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Local Whisper models capture every word. Llama-3 distills action items and
                  decisions.
                </p>
              </div>

              <div className="bg-background p-8 rounded-2xl border border-border/50 space-y-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-medium tracking-tight">Data Sovereign</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your intellectual property never leaves your servers. True On-Premise security.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-12 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 Axiom. Built for Olympic PMNM.</p>
          <p>H (Human) — P (Process) — D (Data) — I (Intelligence)</p>
        </div>
      </footer>
    </div>
  );
}
