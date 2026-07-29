'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
  const [loading, setLoading] = useState(true);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/meetings/`)
      .then((res) => res.json())
      .then((data: Meeting[]) => {
        const currentMeeting = data.find((m) => m.id.toString() === meetingId);
        if (currentMeeting) {
          setMeeting(currentMeeting);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [meetingId]);

  const initJitsi = () => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current || !meeting) return;

    // Remove any existing iframes just in case
    jitsiContainerRef.current.innerHTML = '';

    const domain = 'meet.jit.si';
    const options = {
      roomName: `DX-OS-SmartMeeting-${meeting.id}-${meeting.title.replace(/[^a-zA-Z0-9]/g, '')}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: true,
      },
      interfaceConfigOverwrite: {
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);

    // Add event listeners for DX-OS tracking if needed
    api.addEventListeners({
      videoConferenceJoined: () => {
        console.log('Joined meeting in DX-OS space');
      },
      videoConferenceLeft: () => {
        router.push('/meetings');
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <h1 className="text-2xl font-semibold">Meeting not found</h1>
        <Link href="/meetings">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary/20">
      <Script src="https://meet.jit.si/external_api.js" strategy="lazyOnload" onLoad={initJitsi} />

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
            DX-OS Protocol Active
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Jitsi Meet (The Conference) */}
        <div className="flex-1 bg-black relative">
          <div ref={jitsiContainerRef} className="absolute inset-0 w-full h-full" />
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
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" /> Listening
                </span>
              </div>
              <Card className="border-border/50 shadow-none bg-background">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2 h-32">
                  <p className="text-sm font-medium">Whisper Transcription Active</p>
                  <p className="text-xs text-muted-foreground">
                    Real-time transcripts and action items will be generated when the meeting ends.
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
