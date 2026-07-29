'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Calendar, Clock, Video, AlertCircle } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-container';

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
    fetch('http://localhost:8000/api/meetings/')
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
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-foreground selection:text-background">
      <header className="h-16 px-6 md:px-12 border-b border-border/40 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <Image
                src="/logo.jpg"
                alt="Axiom Logo"
                width={32}
                height={32}
                className="rounded-md transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
              />
              <span className="font-semibold tracking-tight text-sm">Axiom Dashboard</span>
            </div>
          </Link>
        </div>
        <Link href="/meetings/create">
          <Button
            size="sm"
            className="rounded-full px-4 font-medium gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Meeting
          </Button>
        </Link>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-[1400px] w-full mx-auto relative">
        <div className="space-y-12">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">Active Meetings</h1>
            <p className="text-lg text-muted-foreground mt-3 font-medium">
              Manage your structured communications.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 border border-border/40 rounded-3xl bg-muted/20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 border border-destructive/20 rounded-3xl text-center space-y-4 bg-destructive/5 animate-in fade-in duration-700">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-destructive">Connection Error</h3>
                <p className="text-destructive/80 text-sm max-w-md mt-1 font-medium">{error}</p>
              </div>
              <Button
                variant="outline"
                className="mt-2 rounded-full border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => window.location.reload()}
              >
                Retry Connection
              </Button>
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border border-border/40 border-dashed rounded-3xl text-center space-y-4 bg-muted/10 animate-in fade-in duration-700">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No meetings scheduled</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1 font-medium">
                  Deploy a new meeting to enforce structured process gates and capture
                  organizational intelligence.
                </p>
              </div>
              <Link href="/meetings/create">
                <Button className="mt-2 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all">
                  Schedule First Meeting
                </Button>
              </Link>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.map((meeting) => (
                <StaggerItem key={meeting.id}>
                  <Card className="h-full flex flex-col border-border/40 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow duration-500 bg-background">
                    <CardHeader className="p-6 pb-4">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl font-semibold tracking-tight line-clamp-1">
                          {meeting.title}
                        </CardTitle>
                        {meeting.is_active && (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-500/10 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
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
                          className="w-full rounded-xl font-medium group-hover:bg-foreground group-hover:text-background transition-colors duration-300 h-11"
                          variant="secondary"
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
