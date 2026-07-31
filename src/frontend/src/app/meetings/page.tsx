'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Calendar, Clock, Video, AlertCircle } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-container';
import { FadeContent } from '@/components/ui/reactbits/fade-content';

interface Meeting {
  id: number;
  title: string;
  agenda: string;
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
}

export default function MeetingsDashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/meetings/')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch meetings');
        return res.json();
      })
      .then((data) => {
        setMeetings(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('Could not connect to Axiom Engine. Please ensure backend services are running.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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

          {loading ? (
            <div className="flex items-center justify-center h-64 border border-border/50 rounded-2xl bg-secondary/30">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <FadeContent duration={0.5}>
              <div className="flex flex-col items-center justify-center h-64 border border-destructive/20 rounded-2xl text-center space-y-4 bg-destructive/5">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-destructive">Connection Error</h3>
                  <p className="text-destructive/80 text-sm max-w-md mt-1 font-medium">{error}</p>
                </div>
                <Button
                  variant="outline"
                  className="mt-2 rounded-full border-destructive/20 text-destructive hover:bg-destructive hover:text-white cursor-pointer"
                  onClick={() => window.location.reload()}
                >
                  Retry Connection
                </Button>
              </div>
            </FadeContent>
          ) : meetings.length === 0 ? (
            <FadeContent duration={0.5}>
              <div className="flex flex-col items-center justify-center h-64 border border-border/50 border-dashed rounded-2xl text-center space-y-4 bg-secondary/20">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">No meetings scheduled</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mt-1 font-medium">
                    Deploy a new meeting to enforce structured process gates and capture
                    organizational intelligence.
                  </p>
                </div>
                <Link href="/meetings/create">
                  <Button className="mt-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer">
                    Schedule First Meeting
                  </Button>
                </Link>
              </div>
            </FadeContent>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.map((meeting) => (
                <StaggerItem key={meeting.id}>
                  <Card className="h-full flex flex-col border-border/50 shadow-sm rounded-2xl overflow-hidden hover:shadow-lg hover:border-accent/20 transition-colors duration-500 bg-card">
                    <CardHeader className="p-6 pb-4">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl font-bold tracking-tight line-clamp-1">
                          {meeting.title}
                        </CardTitle>
                        {meeting.is_active && (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            Active
                          </span>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-4 mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />{' '}
                          {new Date(meeting.start_time).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {meeting.duration_minutes} min
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                          Agenda Preview
                        </p>
                        <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed font-medium">
                          {meeting.agenda}
                        </p>
                      </div>
                      <Link href={`/meetings/${meeting.id}`} className="block mt-4">
                        <Button
                          className="w-full rounded-xl font-semibold transition-colors duration-300 h-11 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Conference
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </main>
    </div>
  );
}
