'use client';

import {
  Navbar,
  HeroSection,
  TrustedBySection,
  FeaturesSection,
  HowItWorksSection,
  SecuritySection,
  CtaSection,
  Footer,
} from './landing-sections';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-accent/20 selection:text-foreground">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <TrustedBySection />
        <FeaturesSection />
        <HowItWorksSection />
        <SecuritySection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
