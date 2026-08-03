'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

import { RealtimeSTTPanel, SubtitleData } from '@/components/RealtimeSTTPanel';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

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
  const [isJitsiMuted, setIsJitsiMuted] = useState<boolean>(true);

  // ── Subtitle system: 100% ref-driven zero re-render, typewriter streaming for both VI and EN ──
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const enTextRef = useRef<HTMLSpanElement>(null);
  const viTextRef = useRef<HTMLParagraphElement>(null);
  const processingRef = useRef<HTMLSpanElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  
  const currentViRef = useRef<string>('');
  const viTargetTextRef = useRef<string>('');
  const viRevealedLenRef = useRef<number>(0);
  const viAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typewriter ticker for Vietnamese text (~20ms per char)
  const startViTypewriter = useCallback(() => {
    if (viAnimTimerRef.current) {
      clearTimeout(viAnimTimerRef.current);
      viAnimTimerRef.current = null;
    }

    const tick = () => {
      if (viRevealedLenRef.current < viTargetTextRef.current.length) {
        viRevealedLenRef.current++;
        if (viTextRef.current) {
          viTextRef.current.textContent = viTargetTextRef.current.slice(0, viRevealedLenRef.current);
        }
        viAnimTimerRef.current = setTimeout(tick, 20);
      } else {
        viAnimTimerRef.current = null;
      }
    };

    tick();
  }, []);

  // Callback: writes streaming characters directly to DOM (no React re-render)
  const handleSubtitleUpdate = useCallback((sub: SubtitleData | null) => {
    if (!sub) {
      if (viAnimTimerRef.current) { clearTimeout(viAnimTimerRef.current); viAnimTimerRef.current = null; }
      currentViRef.current = '';
      viTargetTextRef.current = '';
      viRevealedLenRef.current = 0;
      if (viTextRef.current) viTextRef.current.textContent = '';
      if (enTextRef.current) enTextRef.current.textContent = '';
      if (processingRef.current) processingRef.current.style.display = 'none';
      setSubtitleVisible(false);
      return;
    }

    // Show overlay
    setSubtitleVisible(true);

    // VI text: typewriter streaming effect
    if (sub.vi) {
      if (sub.vi !== viTargetTextRef.current) {
        // If a new sentence starts, reset typewriter
        if (currentViRef.current !== sub.vi && !sub.vi.startsWith(currentViRef.current.slice(0, Math.min(10, currentViRef.current.length)))) {
          viRevealedLenRef.current = 0;
          if (viTextRef.current) viTextRef.current.textContent = '';
          if (enTextRef.current) enTextRef.current.textContent = '';
        }
        currentViRef.current = sub.vi;
        viTargetTextRef.current = sub.vi;
        if (!viAnimTimerRef.current) {
          startViTypewriter();
        }
      }
    }

    // EN text: write directly to DOM as backend streams characters
    if (sub.en) {
      if (processingRef.current) processingRef.current.style.display = 'none';
      if (enTextRef.current) enTextRef.current.textContent = sub.en;
    } else {
      if (processingRef.current) processingRef.current.style.display = 'inline-block';
    }
  }, [startViTypewriter]);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/meetings/`)
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

  const initJitsi = async () => {
    // Xin quyền camera & mic ở top-level trước để Jitsi (iframe) không bị lỗi
    // Nếu camera bị chiếm bởi app khác, vẫn cho phép Jitsi chạy với audio-only
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.warn('Camera không khả dụng, thử audio-only:', e);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((track) => track.stop());
      } catch (e2) {
        console.warn('Audio cũng không khả dụng:', e2);
      }
    }

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

    // Add event listeners for DX-OS tracking & audio mute sync
    api.addEventListeners({
      videoConferenceJoined: () => {
        console.log('Joined meeting in DX-OS space');
      },
      videoConferenceLeft: () => {
        router.push('/meetings');
      },
      audioMuteStatusChanged: (event: { muted: boolean }) => {
        console.log('Jitsi audio mute status changed:', event.muted);
        setIsJitsiMuted(event.muted);
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
        {/* Left Side: Jitsi Meet (The Conference Video) */}
        <div className="flex-1 bg-black relative overflow-hidden">
          <div ref={jitsiContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Cinema-Style Bilingual Subtitles Overlay — Typewriter + Zero Re-render */}
          {subtitleVisible && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-[95%] max-w-[90vw] flex justify-center transition-all duration-300">
              <div
                className={`subtitle-overlay-container inline-block border-2 border-black px-6 py-4 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.5)]`}
                style={{
                  maxWidth: '100%',
                  wordWrap: 'break-word',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* English — Primary subtitle (ref-driven, no React re-render on streaming) */}
                <p 
                  className="subtitle-en-text font-sans font-black italic tracking-wide leading-snug break-words"
                  style={{
                    color: 'black',
                    textShadow: '-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0px 4px 4px rgba(0,0,0,0.3)',
                    fontSize: 'clamp(1.25rem, 3vw, 2rem)',
                    minHeight: '1.5em',
                  }}
                >
                  <span 
                    ref={processingRef}
                    className="inline-block text-emerald-600 font-sans font-black italic text-lg tracking-wide"
                    style={{
                      display: 'none',
                      textShadow: '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0px 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    Processing
                    <span className="processing-wave-dot ml-0.5" style={{ animationDelay: '0s' }}>.</span>
                    <span className="processing-wave-dot" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="processing-wave-dot" style={{ animationDelay: '0.4s' }}>.</span>
                  </span>
                  <span ref={enTextRef} />
                </p>
                {/* Vietnamese — Secondary subtitle (ref-driven typewriter streaming) */}
                <p 
                  ref={viTextRef}
                  className="subtitle-vi-text font-sans font-black italic tracking-wide leading-snug break-words mt-2"
                  style={{
                    color: 'black',
                    textShadow: '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0px 2px 3px rgba(0,0,0,0.3)',
                    fontSize: 'clamp(1rem, 2.25vw, 1.5rem)'
                  }}
                />
              </div>
            </div>
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

            <section className="space-y-3 pt-4 border-t border-border/40 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Real-time Intelligence & STT Translation
                </h3>
              </div>
              <div className="flex-1 min-h-[400px]">
                <RealtimeSTTPanel isJitsiMuted={isJitsiMuted} onSubtitleUpdate={handleSubtitleUpdate} />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
