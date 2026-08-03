'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.jpg"
                alt="Axiom Logo"
                width={28}
                height={28}
                className="rounded-md"
              />
              <span className="font-bold tracking-tight text-sm">Axiom</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nền tảng họp thông minh.
              <br />
              Built for resilience, security, and discipline.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground st">
              Architecture
            </h4>
            <div className="space-y-2.5">
              {['H (Human)', 'P (Process)', 'D (Data)', 'I (Intelligence)'].map((item) => (
                <p
                  key={item}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-default"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground st">
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

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground st">
              Open Source
            </h4>
            <div className="space-y-2.5">
              {[
                { label: 'GitHub', href: 'https://github.com/khoazandev/Axiom-meeting-protocol' },
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
          <p className="text-xs text-muted-foreground/60 font-medium">Axiom</p>
        </div>
      </div>
    </footer>
  );
}
