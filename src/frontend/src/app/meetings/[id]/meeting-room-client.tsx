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
import { meetingsApi, type Meeting, ApiRequestError } from '@/lib/api';

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
  const [activeRightTab, setActiveRightTab] = useState<'agenda' | 'chat' | 'ai' | 'tasks'>('agenda');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    { sender: 'Axiom AI Agent', text: 'I am indexing live speech. Ask me anything about the meeting or uploaded documents.', time: '10:00 AM', isAi: true },
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

  const handleAddBookmark = async () => {
    try {
      const authToken = localStorage.getItem('token');
      const wsId = localStorage.getItem('active_workspace_id');
      if (!authToken || !wsId) return;

      const res = await fetch(`/api/v1/meetings/${meetingId}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'X-Workspace-ID': wsId,
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
      { sender: participantName, text: inputMsg.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setInputMsg('');
  };

  const handleSendAiQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQueryMsg.trim()) return;

    const q = aiQueryMsg.trim();
    setAiMessages((prev) => [
      ...prev,
      { sender: participantName, text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      { sender: 'Axiom AI Agent', text: `Based on workspace documents and live transcript: "${q}" is covered in Section 3 of the Phase 4 specification.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isAi: true },
    ]);
    setAiQueryMsg('');
  };

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

          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            LiveKit Active
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
        {/* Left Side: LiveKit Video Canvas + Subtitle Overlay (Google Meet Style) */}
        <div className="flex-1 bg-black relative flex flex-col justify-between overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center">
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

          {/* Live Subtitle Overlay Bar (Google Meet Style) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4 z-30">
            <div className="p-3.5 rounded-2xl bg-[#0B0F19]/90 border border-blue-950/90 backdrop-blur-md shadow-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{currentSubtitle.speaker}</div>
                <p className="text-xs text-white truncate font-medium mt-0.5">{currentSubtitle.text}</p>
              </div>
              <div className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-mono border border-indigo-500/30">
                Live STT
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Collapsible Drawers (Agenda, Public Chat, AI Assistant, Tasks) */}
        {sidebarOpen && (
          <aside className="w-80 md:w-96 bg-[#0E1526] border-l border-blue-950/60 flex flex-col shrink-0 overflow-hidden">
            {/* Drawer Tabs */}
            <div className="flex items-center border-b border-blue-950/60 p-2 gap-1 bg-[#131B2E]/60">
              <button
                onClick={() => setActiveRightTab('agenda')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  activeRightTab === 'agenda'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>

              <button
                onClick={() => setActiveRightTab('chat')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  activeRightTab === 'chat'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => setActiveRightTab('ai')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  activeRightTab === 'ai'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI RAG</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
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

              {activeRightTab === 'chat' && (
                <div className="h-full flex flex-col justify-between space-y-3">
                  <div className="space-y-3 overflow-y-auto max-h-[480px]">
                    {publicMessages.map((msg, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#131B2E] border border-blue-950/80 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-blue-400">{msg.sender}</span>
                          <span className="text-slate-500">{msg.time}</span>
                        </div>
                        <p className="text-xs text-slate-200">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendPublicChat} className="flex items-center gap-2 pt-2 border-t border-blue-950">
                    <input
                      type="text"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      placeholder="Send chat message..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#131B2E] border border-blue-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button type="submit" className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {activeRightTab === 'ai' && (
                <div className="h-full flex flex-col justify-between space-y-3">
                  <div className="space-y-3 overflow-y-auto max-h-[480px]">
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${msg.isAi ? 'bg-indigo-950/30 border-indigo-500/40' : 'bg-[#131B2E] border-blue-950'} space-y-1`}>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold ${msg.isAi ? 'text-indigo-400' : 'text-blue-400'}`}>{msg.sender}</span>
                          <span className="text-slate-500">{msg.time}</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendAiQuery} className="flex items-center gap-2 pt-2 border-t border-blue-950">
                    <input
                      type="text"
                      value={aiQueryMsg}
                      onChange={(e) => setAiQueryMsg(e.target.value)}
                      placeholder="Ask AI Assistant about docs..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#131B2E] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button type="submit" className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white">
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
