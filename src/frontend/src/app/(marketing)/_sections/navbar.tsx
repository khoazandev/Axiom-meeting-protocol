'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <header className="h-16 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.jpg"
            alt="Axiom Logo"
            width={32}
            height={32}
            className="rounded-lg transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
          />
          <span className="font-bold tracking-tight text-sm">Axiom</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground font-medium">
          <Link href="#features" className="hover:text-foreground transition-colors duration-200">
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="hover:text-foreground transition-colors duration-200"
          >
            Process
          </Link>
          <Link href="#security" className="hover:text-foreground transition-colors duration-200">
            Security
          </Link>
          <Link href="/meetings" className="hover:text-foreground transition-colors duration-200">
            Dashboard
          </Link>
        </nav>
      </div>
      <div>
        <Link href="/meetings/create">
          <Button
            size="sm"
            className="rounded-full px-5 font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer shadow-sm"
          >
            New Meeting
          </Button>
        </Link>
      </div>
    </header>
  );
}
