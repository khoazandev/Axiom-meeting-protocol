'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SplitText } from '@/components/ui/reactbits/split-text';
import { CountUp } from '@/components/ui/reactbits/count-up';
import { FadeContent } from '@/components/ui/reactbits/fade-content';
import { ClickSpark } from '@/components/ui/reactbits/click-spark';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-container';
import {
  ArrowRight,
  Video,
  FileText,
  Lock,
  Shield,
  Server,
  Cpu,
  CheckCircle2,
  Zap,
  Globe,
  ChevronRight,
} from 'lucide-react';

/* ─── Trusted By: placeholder enterprise names ──────────────── */
const TRUSTED_BY = [
  'Viettel Solutions',
  'FPT Software',
  'VNG Corporation',
  'CMC Global',
  'TMA Solutions',
  'KMS Technology',
];

/* ─── How It Works steps ────────────────────────────────────── */
const STEPS = [
  {
    number: '01',
    title: 'Define Agenda',
    description:
      'Enforce structured meeting discipline. Every meeting requires a detailed agenda validated by the Process Gate before creation.',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Join Conference',
    description:
      'Browser-based WebRTC video conferencing powered by LiveKit. No downloads, no external dependencies. 100% on-premise.',
    icon: Video,
  },
  {
    number: '03',
    title: 'Capture Intelligence',
    description:
      'Local Whisper transcription and Llama-3 summarization extract decisions, action items, and insights automatically.',
    icon: Cpu,
  },
];

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-accent/20 selection:text-foreground">
      {/* ─── Navigation ──────────────────────────────────────── */}
      <header className="flex items-center justify-between h-16 px-6 md:px-12 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="Axiom Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="font-bold tracking-tight text-sm text-foreground">
            Axiom
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link
            href="#features"
            className="hover:text-foreground transition-colors duration-200"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="hover:text-foreground transition-colors duration-200"
          >
            How It Works
          </Link>
          <Link
            href="#security"
            className="hover:text-foreground transition-colors duration-200"
          >
            Security
          </Link>
          <Link
            href="/meetings"
            className="hover:text-foreground transition-colors duration-200"
          >
            Dashboard
          </Link>
        </nav>
        <div>
          <Link href="/meetings/create">
            <Button
              size="sm"
              className="rounded-full px-5 font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-all cursor-pointer shadow-sm"
            >
              New Meeting
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── Hero Section ──────────────────────────────────── */}
        <section
          ref={heroRef}
          className="px-6 md:px-12 pt-20 pb-24 md:pt-28 md:pb-32 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center min-h-[calc(100vh-64px)]"
        >
          <div className="space-y-8 max-w-xl relative z-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold tracking-wide border border-accent/20">
                <Zap className="w-3.5 h-3.5" />
                Olympic PMNM 2026 · DX-OS Standard
              </div>

              <SplitText
                text="The enterprise meeting protocol."
                className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-extrabold tracking-[-0.035em] leading-[1.08] text-foreground"
                stagger={0.04}
                duration={0.7}
                y={40}
              />

              <FadeContent delay={0.6} duration={0.8}>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-[48ch] font-medium">
                  On-premise video conferencing with native AI intelligence.
                  Enforce agendas, transcribe securely, and capture structural
                  data — zero external cloud dependency.
                </p>
              </FadeContent>
            </div>

            <FadeContent delay={0.9} duration={0.7}>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/meetings/create">
                  <ClickSpark sparkColor="var(--accent)">
                    <Button
                      size="lg"
                      className="rounded-full h-12 px-8 font-semibold text-sm bg-accent text-accent-foreground hover:bg-accent/90 transition-all cursor-pointer shadow-md shadow-accent/20 group"
                    >
                      Deploy Meeting
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </ClickSpark>
                </Link>
                <Link href="/meetings">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full h-12 px-8 font-semibold text-sm hover:bg-secondary transition-all cursor-pointer"
                  >
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </FadeContent>

            {/* Stats strip */}
            <FadeContent delay={1.2} duration={0.7}>
              <div className="pt-8 border-t border-border/50 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-extrabold text-foreground tabular-nums">
                    <CountUp end={100} suffix="%" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    On-Premise
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground tabular-nums">
                    {'<'}
                    <CountUp end={1} suffix="s" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Latency
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground tabular-nums">
                    <CountUp end={0} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Data Leaks
                  </p>
                </div>
              </div>
            </FadeContent>
          </div>

          {/* Hero Image */}
          <FadeContent direction="right" distance={60} delay={0.4} duration={1}>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/50 bg-secondary shadow-2xl shadow-black/8 group">
              <Image
                src="/hero_enterprise.png"
                alt="Enterprise Meeting Room with AI-powered video conferencing"
                fill
                className="object-cover transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-foreground/5 rounded-2xl pointer-events-none" />
            </div>
          </FadeContent>
        </section>

        {/* ─── Trusted By ────────────────────────────────────── */}
        <section className="border-y border-border/50 bg-secondary/50 py-10">
          <FadeContent>
            <div className="max-w-[1400px] mx-auto px-6 md:px-12">
              <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-8">
                Trusted by leading enterprises
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

        {/* ─── Features Bento Grid ───────────────────────────── */}
        <section
          id="features"
          className="px-6 md:px-12 py-24 md:py-32 max-w-[1400px] mx-auto"
        >
          <FadeContent>
            <div className="max-w-2xl space-y-4 mb-16">
              <p className="text-accent font-semibold text-sm tracking-wide uppercase">
                Architecture
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
                Structured by design.
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                Every meeting follows the H-P-D-I architectural pattern —
                ensuring alignment before anyone joins the call.
              </p>
            </div>
          </FadeContent>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature Card 1 */}
            <StaggerItem className="group bg-card p-8 rounded-2xl border border-border/50 space-y-6 shadow-sm hover:shadow-lg hover:border-accent/20 transition-all duration-500 cursor-default">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Video className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold tracking-tight">
                  Axiom Media Engine
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Integrated WebRTC video conferencing powered by LiveKit that
                  runs entirely on your infrastructure with ultra-low latency.
                </p>
              </div>
              <div className="flex items-center text-accent text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </StaggerItem>

            {/* Feature Card 2 */}
            <StaggerItem className="group bg-card p-8 rounded-2xl border border-border/50 space-y-6 shadow-sm hover:shadow-lg hover:border-accent/20 transition-all duration-500 cursor-default">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <FileText className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold tracking-tight">
                  AI Transcription
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Local Whisper models capture every word. Llama-3 distills
                  action items and decisions automatically.
                </p>
              </div>
              <div className="flex items-center text-accent text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </StaggerItem>

            {/* Feature Card 3 */}
            <StaggerItem className="group bg-card p-8 rounded-2xl border border-border/50 space-y-6 shadow-sm hover:shadow-lg hover:border-accent/20 transition-all duration-500 cursor-default">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold tracking-tight">
                  Data Sovereign
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Your intellectual property never leaves your servers. True
                  On-Premise security for enterprise data.
                </p>
              </div>
              <div className="flex items-center text-accent text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </StaggerItem>
          </StaggerContainer>
        </section>

        {/* ─── How It Works ──────────────────────────────────── */}
        <section
          id="how-it-works"
          className="px-6 md:px-12 py-24 md:py-32 bg-secondary/40 border-y border-border/50"
        >
          <div className="max-w-[1400px] mx-auto">
            <FadeContent>
              <div className="max-w-2xl space-y-4 mb-16">
                <p className="text-accent font-semibold text-sm tracking-wide uppercase">
                  Process
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
                  Three steps to disciplined meetings.
                </h2>
                <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                  The H-P-D-I protocol ensures every meeting creates
                  measurable organizational value.
                </p>
              </div>
            </FadeContent>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step) => (
                <StaggerItem key={step.number} className="relative">
                  <div className="bg-card p-8 rounded-2xl border border-border/50 space-y-6 h-full shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-5xl font-extrabold text-accent/15 tracking-tighter">
                        {step.number}
                      </span>
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                        <step.icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold tracking-tight">
                        {step.title}
                      </h3>
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

        {/* ─── Security Section ──────────────────────────────── */}
        <section
          id="security"
          className="px-6 md:px-12 py-24 md:py-32 max-w-[1400px] mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeContent direction="left">
              <div className="space-y-6">
                <p className="text-accent font-semibold text-sm tracking-wide uppercase">
                  Security
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
                  Absolute data sovereignty.
                </h2>
                <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                  Axiom runs entirely within your infrastructure. Meeting data,
                  transcriptions, and AI models — everything stays inside your
                  network perimeter.
                </p>
                <div className="space-y-4 pt-4">
                  {[
                    'Self-hosted WebRTC via LiveKit — no external relay',
                    'Local Whisper & Llama models — zero cloud API calls',
                    'SQLite/PostgreSQL on your own servers',
                    'Fully air-gapped deployment supported',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground/80 font-medium">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeContent>

            <FadeContent direction="right" delay={0.2}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: Shield,
                    title: 'On-Premise',
                    desc: 'Deploy in your VPC',
                  },
                  {
                    icon: Lock,
                    title: 'Encrypted',
                    desc: 'End-to-end security',
                  },
                  {
                    icon: Server,
                    title: 'Self-Hosted',
                    desc: 'No vendor lock-in',
                  },
                  {
                    icon: Globe,
                    title: 'Air-Gapped',
                    desc: 'Offline capable',
                  },
                ].map((badge) => (
                  <div
                    key={badge.title}
                    className="bg-card p-6 rounded-2xl border border-border/50 text-center space-y-3 shadow-sm hover:shadow-md hover:border-accent/20 transition-all duration-500"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mx-auto">
                      <badge.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{badge.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {badge.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeContent>
          </div>
        </section>

        {/* ─── Final CTA ─────────────────────────────────────── */}
        <section className="px-6 md:px-12 py-24 md:py-32 bg-primary text-primary-foreground">
          <FadeContent>
            <div className="max-w-[800px] mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
                Ready to enforce meeting discipline?
              </h2>
              <p className="text-lg text-primary-foreground/70 font-medium leading-relaxed max-w-[50ch] mx-auto">
                Deploy Axiom on your infrastructure and transform how your
                organization conducts meetings.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/meetings/create">
                  <ClickSpark sparkColor="#ffffff">
                    <Button
                      size="lg"
                      className="rounded-full h-12 px-8 font-semibold text-sm bg-white text-primary hover:bg-white/90 transition-all cursor-pointer shadow-lg group"
                    >
                      Deploy Meeting
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </ClickSpark>
                </Link>
                <Link
                  href="https://github.com/khoazandev/Axiom-meeting-protocol"
                  target="_blank"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full h-12 px-8 font-semibold text-sm border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 transition-all cursor-pointer"
                  >
                    View on GitHub
                  </Button>
                </Link>
              </div>
            </div>
          </FadeContent>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border/50 bg-card">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-1 space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.jpg"
                  alt="Axiom Logo"
                  width={28}
                  height={28}
                  className="rounded-md"
                />
                <span className="font-bold tracking-tight text-sm">
                  Axiom
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enterprise Meeting Protocol.
                <br />
                Built for resilience, security, and discipline.
              </p>
            </div>

            {/* Architecture */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Architecture
              </h4>
              <div className="space-y-2.5">
                {['H (Human)', 'P (Process)', 'D (Data)', 'I (Intelligence)'].map(
                  (item) => (
                    <p
                      key={item}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-default"
                    >
                      {item}
                    </p>
                  )
                )}
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Resources
              </h4>
              <div className="space-y-2.5">
                {[
                  { label: 'Documentation', href: '#' },
                  { label: 'Architecture', href: '#' },
                  { label: 'Contributing', href: '#' },
                  { label: 'Deployment', href: '#' },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Open Source
              </h4>
              <div className="space-y-2.5">
                {[
                  {
                    label: 'GitHub',
                    href: 'https://github.com/khoazandev/Axiom-meeting-protocol',
                  },
                  { label: 'MIT License', href: '#' },
                  { label: 'Code of Conduct', href: '#' },
                  { label: 'Security Policy', href: '#' },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              © 2026 Axiom. Built for Olympic PMNM. MIT License.
            </p>
            <p className="text-xs text-muted-foreground/60 font-medium">
              DX-OS Enterprise Standard
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
