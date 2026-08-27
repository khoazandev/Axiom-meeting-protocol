'use client';

import * as React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { UserNav } from '@/components/layout/user-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md transition-[width,height] ease-linear">
      {/* Left: Sidebar trigger + Breadcrumbs */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs />
      </div>

      {/* Right: Quick action, Search, Theme toggle & User nav */}
      <div className="flex items-center gap-3">
        {/* Quick New Meeting button */}
        <Link
          href="/meetings/create"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Meeting</span>
        </Link>

        {/* Quick search input */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search meetings, tasks..."
            className="h-9 w-full rounded-md border border-input bg-background/50 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
