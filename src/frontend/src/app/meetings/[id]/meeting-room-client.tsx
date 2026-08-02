'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  FileText,
  MessageSquare,
  CheckSquare,
  ChevronRight,
  Users,
} from 'lucide-react';
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
  const [activeRightTab, setActiveRightTab] = useState<'agenda' | 'ai' | 'tasks'>('agenda');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

    run().catch((err) => {
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
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] text-white space-y-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-red-400">Error Joining Room</h1>
        <p className="text-slate-400 text-sm max-w-md">{error || 'Meeting not found'}</p>
        <Link href="/meetings">
          <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg shadow-blue-600/25 transition-all">
            Return to Meetings
          </button>
        </Link>
      </div>
    );
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  return (
    <div className="h-screen bg-[#0B0F19] text-white flex flex-col overflow-hidden select-none">
      {/* Top Header: Google Meet Style */}
      <header className="h-14 px-6 bg-[#0E1526] border-b border-blue-950/60 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <button className="p-1.5 rounded-xl bg-[#131B2E] border border-blue-950 text-slate-400 hover:text-white hover:border-blue-800 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>

          <div>
            <h1 className="font-bold text-sm text-white tracking-tight leading-none">
              {meeting.title}
            </h1>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" />
                {new Date(meeting.start_time).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" />
                {meeting.duration_minutes} min
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            LiveKit WebRTC Active
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-xl bg-[#131B2E] border border-blue-950 text-slate-400 hover:text-white hover:border-blue-800 transition-all"
            title="Toggle Right Panel"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: LiveKit Video Canvas (Google Meet Style) */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {token === '' ? (
            <div className="text-slate-400 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Connecting to LiveKit WebRTC Server...</p>
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

        {/* Right Side: Collapsible Drawers (Agenda, AI Subtitles, Action Items) */}
        {sidebarOpen && (
          <aside className="w-80 md:w-96 bg-[#0E1526] border-l border-blue-950/60 flex flex-col shrink-0 overflow-hidden">
            {/* Drawer Tabs */}
            <div className="flex items-center border-b border-blue-950/60 p-2 gap-1 bg-[#131B2E]/60">
              <button
                onClick={() => setActiveRightTab('agenda')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeRightTab === 'agenda'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>

              <button
                onClick={() => setActiveRightTab('ai')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeRightTab === 'ai'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Agent</span>
              </button>

              <button
                onClick={() => setActiveRightTab('tasks')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeRightTab === 'tasks'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tasks</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {activeRightTab === 'agenda' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Process Gate Checklist
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Enforced
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#131B2E] border border-blue-950/80 space-y-3">
                    {meeting.agenda.split('\n').map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeRightTab === 'ai' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Whisper STT & RAG Assistant
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      Local AI
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#131B2E] border border-blue-950/80 text-center space-y-2">
                    <Sparkles className="w-6 h-6 text-indigo-400 mx-auto animate-pulse" />
                    <div className="text-xs font-bold text-white">Live Transcription Ready</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      On-premise Whisper STT and Llama RAG agents will automatically summarize key decisions as speech is detected.
                    </p>
                  </div>
                </div>
              )}

              {activeRightTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Extracted Action Items
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Sync Jira
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#131B2E] border border-blue-950/80 space-y-3">
                    <div className="p-3 rounded-xl bg-[#0B0F19] border border-blue-950 flex items-start gap-2 text-xs">
                      <CheckSquare className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-white">Finalize Alembic SQLite migrations</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Assigned to: Backend Team</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
