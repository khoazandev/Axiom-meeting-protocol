'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function Navbar() {
  const { user, activeWorkspace, workspaces, setActiveWorkspace, logout } = useAuthStore();

  return (
    <header className="h-16 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center gap-6">
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

        {/* Workspace Switcher */}
        {workspaces.length > 0 && (
          <div className="relative border-l border-border/40 pl-4">
            <select
              value={activeWorkspace?.id || ''}
              onChange={(e) => {
                const ws = workspaces.find((w) => w.id === e.target.value);
                if (ws) setActiveWorkspace(ws);
              }}
              className="bg-card text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/60 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  🏢 {ws.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground font-medium ml-2">
          <Link href="#features" className="hover:text-foreground transition-colors duration-200">
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="hover:text-foreground transition-colors duration-200"
          >
            Process
          </Link>
          <Link href="/meetings" className="hover:text-foreground transition-colors duration-200">
            Dashboard
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
            <button
              onClick={logout}
              className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors"
            >
              Sign Out
            </button>
            <Link href="/meetings/create">
              <Button
                size="sm"
                className="rounded-full px-5 font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer shadow-sm"
              >
                New Meeting
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button size="sm" variant="ghost" className="text-xs font-semibold">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="rounded-full px-4 font-semibold bg-accent hover:bg-accent/90 text-text-primary transition-colors cursor-pointer shadow-sm text-xs"
              >
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
