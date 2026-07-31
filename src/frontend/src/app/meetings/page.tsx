import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FadeContent } from '@/components/ui/reactbits/fade-content';
import { MeetingsDashboardClient } from './meetings-dashboard-client';

export default function MeetingsDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-accent/20">
      <header className="h-16 px-6 md:px-12 border-b border-border/50 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <Image
                src="/logo.jpg"
                alt="Axiom Logo"
                width={32}
                height={32}
                className="rounded-lg transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
              />
              <span className="font-bold tracking-tight text-sm">Axiom Dashboard</span>
            </div>
          </Link>
        </div>
        <Link href="/meetings/create">
          <Button
            size="sm"
            className="rounded-full px-5 font-semibold gap-2 bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Meeting
          </Button>
        </Link>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-[1400px] w-full mx-auto relative">
        <div className="space-y-12">
          <FadeContent duration={0.8}>
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
                Active Meetings
              </h1>
              <p className="text-lg text-muted-foreground mt-3 font-medium">
                Manage your structured communications.
              </p>
            </div>
          </FadeContent>

          <MeetingsDashboardClient />
        </div>
      </main>
    </div>
  );
}
