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
  Bookmark,
  Send,
  User,
  Zap,
} from 'lucide-react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { meetingsApi, getAuthHeaders, type Meeting, ApiRequestError } from '@/lib/api';

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isAi?: boolean;
}

export function MeetingRoomClient() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeRightTab, setActiveRightTab] = useState<'agenda' | 'chat' | 'ai' | 'tasks'>(
    'agenda'
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [livekitError, setLivekitError] = useState(false);

  // Subtitle State
  const [currentSubtitle, setCurrentSubtitle] = useState<{ speaker: string; text: string }>({
    speaker: 'Alice (Principal Architect)',
    text: 'Welcome everyone! We are reviewing Phase 4 AI Intelligence UI Pipeline and Knowledge Hub endpoints.',
  });

  // Chat States
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>([
    { sender: 'Alice', text: 'Hi team, let’s start with the MoM Tab review.', time: '10:00 AM' },
    { sender: 'Bob', text: 'Sounds good! I have the test suite running.', time: '10:01 AM' },
  ]);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      sender: 'Axiom AI Agent',
      text: 'I am indexing live speech. Ask me anything about the meeting or uploaded documents.',
      time: '10:00 AM',
      isAi: true,
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [aiQueryMsg, setAiQueryMsg] = useState('');

  // Bookmark Feedback
  const [bookmarkFeedback, setBookmarkFeedback] = useState<string | null>(null);

  const [participantName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const currentMeeting = await meetingsApi.get(meetingId, controller.signal);
      if (!controller.signal.aborted) setMeeting(currentMeeting);

      const tokenData = await meetingsApi.getToken(
        currentMeeting.id,
        participantName,
        controller.signal
      );
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

  const handleAddBookmark = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers['Authorization']) return;

      const res = await fetch(`/api/v1/meetings/${meetingId}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          timestamp_seconds: 120,
          note: `Bookmark moment created during live call`,
          is_action_item: false,
        }),
      });

      if (res.ok) {
        setBookmarkFeedback('📌 Key moment bookmarked!');
        setTimeout(() => setBookmarkFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendPublicChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    setPublicMessages((prev) => [
      ...prev,
      {
        sender: participantName,
        text: inputMsg.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInputMsg('');
  };

  const handleSendAiQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQueryMsg.trim()) return;

    const q = aiQueryMsg.trim();
    setAiMessages((prev) => [
      ...prev,
      {
        sender: participantName,
        text: q,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      {
        sender: 'Axiom AI Agent',
        text: `Based on workspace documents and live transcript: "${q}" is covered in Section 3 of the Phase 4 specification.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAi: true,
      },
    ]);
    setAiQueryMsg('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base text-text-primary">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-base text-text-primary space-y-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-danger">Error Joining Room</h1>
        <p className="text-text-secondary text-sm max-w-md">{error || 'Meeting not found'}</p>
        <Link href="/meetings">
          <button className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-text-primary font-medium text-xs shadow-lg shadow-blue-600/25 transition-all">
            Return to Meetings
          </button>
        </Link>
      </div>
    );
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  return (
    <div className="h-screen bg-bg-base text-text-primary flex flex-col overflow-hidden select-none">
      {/* Top Header: Google Meet Style */}
      <header className="h-14 px-6 bg-bg-card border-b border-border flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <button className="p-1.5 rounded-xl bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-blue-800 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>

          <div>
            <h1 className="font-bold text-sm text-text-primary tracking-tight leading-none">
              {meeting.title}
            </h1>
            <div className="flex items-center gap-3 text-[11px] text-text-secondary mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-accent" />
                {new Date(meeting.start_time).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-accent" />
                {meeting.duration_minutes} min
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {bookmarkFeedback && (
            <span className="text-xs text-amber-400 font-semibold px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full animate-bounce">
              {bookmarkFeedback}
            </span>
          )}

          <button
            onClick={handleAddBookmark}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Bookmark Key Moment"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmark Moment</span>
          </button>

          <div className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-semibold border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            LiveKit Active
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-xl bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-blue-800 transition-all"
            title="Toggle Right Panel"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: LiveKit Video Canvas + Subtitle Overlay (Google Meet Style) */}
        <div className="flex-1 bg-black relative overflow-hidden">
          {/* LiveKit fills the entire video area */}
          <div className="absolute inset-0">
            {token === '' ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-xs font-medium">Connecting to LiveKit WebRTC Server...</p>
              </div>
            ) : (
              <LiveKitRoom
                token={token}
                serverUrl={livekitUrl}
                data-lk-theme="default"
                style={{ height: '100%', width: '100%' }}
                onDisconnected={() => {
                  console.log('LiveKit connection closed or server offline.');
                  setLivekitError(true);
                }}
                onError={() => {
                  setLivekitError(true);
                }}
              >
                <VideoConference />
                <RoomAudioRenderer />
              </LiveKitRoom>
            )}
          </div>

          {/* LiveKit Offline Warning */}
          {livekitError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              LiveKit server chưa khởi động (ws://localhost:7880). Các tính năng Chat, Agenda, AI
              RAG vẫn hoạt động.
            </div>
          )}

          {/* Live Subtitle Overlay — positioned above the LiveKit control bar */}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-xl w-full px-4 z-30 pointer-events-none">
            <div className="p-3.5 rounded-2xl bg-bg-base/90 border border-border backdrop-blur-md shadow-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/30 border border-accent/40 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-accent ">{currentSubtitle.speaker}</div>
                <p className="text-xs text-text-primary truncate font-medium mt-0.5">
                  {currentSubtitle.text}
                </p>
              </div>
              <div className="px-2 py-0.5 rounded bg-accent-muted text-indigo-300 text-[9px] font-mono border border-accent/30">
                Live STT
              </div>
            </div>
          </div>
        </div>


        {/* Right Side: Collapsible Drawers (Agenda, Public Chat, AI Assistant, Tasks) */}
        {sidebarOpen && (
          <aside className="w-80 md:w-96 bg-bg-card border-l border-border flex flex-col shrink-0 overflow-hidden">
            {/* Drawer Tabs */}
            <div className="flex items-center border-b border-border p-2 gap-1 bg-bg-card/60">
              <button
                onClick={() => setActiveRightTab('agenda')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  activeRightTab === 'agenda'
                    ? 'bg-accent text-text-primary shadow-md shadow-blue-600/20'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>

              <button
                onClick={() => setActiveRightTab('chat')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  activeRightTab === 'chat'
                    ? 'bg-accent text-text-primary shadow-md shadow-blue-600/20'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-accent" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => setActiveRightTab('ai')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  activeRightTab === 'ai'
                    ? 'bg-accent text-text-primary shadow-md shadow-blue-600/20'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>AI RAG</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {activeRightTab === 'agenda' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold  text-text-secondary">Checklist</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success border border-emerald-500/30">
                      Enforced
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-bg-card border border-border space-y-3">
                    {meeting.agenda.split('\n').map((line, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeRightTab === 'chat' && (
                <div className="h-full flex flex-col justify-between space-y-3">
                  <div className="space-y-3 overflow-y-auto max-h-[480px]">
                    {publicMessages.map((msg, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-bg-card border border-border space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-accent">{msg.sender}</span>
                          <span className="text-text-muted">{msg.time}</span>
                        </div>
                        <p className="text-xs text-slate-200">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSendPublicChat}
                    className="flex items-center gap-2 pt-2 border-t border-border"
                  >
                    <input
                      type="text"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      placeholder="Send chat message..."
                      className="flex-1 px-3 py-2 rounded-xl bg-bg-card border border-border text-xs text-text-primary placeholder-text-placeholder focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl bg-accent hover:bg-accent/90 text-text-primary"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {activeRightTab === 'ai' && (
                <div className="h-full flex flex-col justify-between space-y-3">
                  <div className="space-y-3 overflow-y-auto max-h-[480px]">
                    {aiMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${msg.isAi ? 'bg-indigo-950/30 border-indigo-500/40' : 'bg-bg-card border-border'} space-y-1`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold ${msg.isAi ? 'text-accent' : 'text-accent'}`}>
                            {msg.sender}
                          </span>
                          <span className="text-text-muted">{msg.time}</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSendAiQuery}
                    className="flex items-center gap-2 pt-2 border-t border-border"
                  >
                    <input
                      type="text"
                      value={aiQueryMsg}
                      onChange={(e) => setAiQueryMsg(e.target.value)}
                      placeholder="Ask AI Assistant about docs..."
                      className="flex-1 px-3 py-2 rounded-xl bg-bg-card border border-indigo-950 text-xs text-text-primary placeholder-text-placeholder focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl bg-accent hover:bg-accent/90 text-text-primary"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
