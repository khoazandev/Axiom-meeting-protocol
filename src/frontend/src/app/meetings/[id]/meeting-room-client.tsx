'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { meetingsApi, type Meeting, ApiRequestError } from '@/lib/api';

export function MeetingRoomClient() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fixed participant name for MVP (lazy state initializer)
  const [participantName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const currentMeeting = await meetingsApi.get(meetingId, controller.signal);
      if (!controller.signal.aborted) setMeeting(currentMeeting);

      const tokenData = await meetingsApi.getToken(currentMeeting.id, participantName, controller.signal);
      if (!controller.signal.aborted && tokenData?.token) setToken(tokenData.token);
      if (!controller.signal.aborted) setLoading(false);
    };
    void run().catch((err) => {
      if (!controller.signal.aborted) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error(err);
          setError(err instanceof ApiRequestError ? err.message : err.message);
        }
        setLoading(false);
      }
    });
    return () => controller.abort();
  }, [meetingId, participantName]);

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
        <h1 className="text-2xl font-bold">Error joining meeting</h1>
        <p className="text-muted-foreground">{error || 'Meeting not found'}</p>
        <Link href="/meetings">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden selection:bg-accent/20">
      <header className="h-14 px-6 border-b border-border/50 flex items-center justify-between shrink-0 bg-background/90 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-sm tracking-tight">{meeting.title}</h1>
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
          <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-semibold border border-accent/20 flex items-center gap-1.5 h-7">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            DX-OS LiveKit Active
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: LiveKit Meet */}
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

        {/* Right Side: Agenda & Intelligence */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-card border-l border-border/50 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Meeting Agenda
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-accent/10 text-accent rounded-full border border-accent/20">
                  Validated
                </span>
              </div>
              <Card className="border-border/50 shadow-none bg-secondary/30">
                <CardContent className="p-4">
                  <div className="prose prose-sm dark:prose-invert">
                    {meeting.agenda.split('\n').map((line) => (
                      <p
                        key={line}
                        className="flex items-start gap-2 text-sm leading-relaxed mb-2 last:mb-0"
                      >
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                        <span>{line}</span>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3 pt-6 border-t border-border/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Intelligence (AI)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-accent/10 text-accent rounded-full flex items-center gap-1 border border-accent/20">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" /> LiveKit AI
                </span>
              </div>
              <Card className="border-border/50 shadow-none bg-secondary/30">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2 h-32">
                  <p className="text-sm font-semibold">Whisper Transcription Pending</p>
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
