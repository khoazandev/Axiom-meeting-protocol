'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';

interface Meeting {
  id: number;
  title: string;
  agenda: string;
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
}

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fixed participant name for MVP
  const participantName = `User-${Math.floor(Math.random() * 1000)}`;

  useEffect(() => {
    // 1. Fetch meeting details
    fetch(`http://localhost:8000/api/meetings/`)
      .then((res) => res.json())
      .then((data: Meeting[]) => {
        const currentMeeting = data.find((m) => m.id.toString() === meetingId);
        if (currentMeeting) {
          setMeeting(currentMeeting);

          // 2. Fetch LiveKit Token
          return fetch(
            `http://localhost:8000/api/meetings/${currentMeeting.id}/token?participant_name=${participantName}`
          );
        } else {
          throw new Error('Meeting not found');
        }
      })
      .then((res) => {
        if (!res) return;
        if (!res.ok) throw new Error('Failed to fetch token');
        return res.json();
      })
      .then((data) => {
        if (data?.token) {
          setToken(data.token);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [meetingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <h1 className="text-2xl font-semibold">Error joining meeting</h1>
        <p className="text-muted-foreground">{error || 'Meeting not found'}</p>
        <Link href="/meetings">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary/20">
      <header className="h-16 px-6 border-b border-border/40 flex items-center justify-between shrink-0 bg-background z-10">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-sm tracking-tight">{meeting.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {new Date(meeting.start_time).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {meeting.duration_minutes} min
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            DX-OS LiveKit Active
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: LiveKit Meet (The Conference) */}
        <div className="flex-1 bg-black relative flex items-center justify-center">
          {token === '' ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p>Connecting to LiveKit server...</p>
            </div>
          ) : (
            <LiveKitRoom
              video={false}
              audio={false}
              token={token}
              serverUrl={livekitUrl}
              data-lk-theme="default"
              style={{ height: '100%', width: '100%' }}
              onDisconnected={() => router.push('/meetings')}
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          )}
        </div>

        {/* Right Side: Agenda & Intelligence (Process & Data layer of DX-OS) */}
        <div className="w-full lg:w-[400px] xl:w-[450px] bg-muted/30 border-l border-border/40 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Meeting Agenda
                </h3>
                <span className="text-xs font-medium px-2 py-0.5 bg-green-500/10 text-green-600 rounded">
                  Validated
                </span>
              </div>
              <Card className="border-border/50 shadow-none bg-background">
                <CardContent className="p-4">
                  <div className="prose prose-sm dark:prose-invert">
                    {meeting.agenda.split('\n').map((line, i) => (
                      <p
                        key={i}
                        className="flex items-start gap-2 text-sm leading-relaxed mb-2 last:mb-0"
                      >
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span>{line}</span>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3 pt-6 border-t border-border/40">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Intelligence (AI)
                </h3>
                <span className="text-xs font-medium px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" /> LiveKit AI
                </span>
              </div>
              <Card className="border-border/50 shadow-none bg-background">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2 h-32">
                  <p className="text-sm font-medium">Whisper Transcription Pending</p>
                  <p className="text-xs text-muted-foreground">
                    LiveKit agents can connect to this room and perform real-time speech-to-text.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
