'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Calendar,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  FileText,
  ChevronRight,
  Bookmark,
  Zap,
  Mic,
  MicOff,
  Globe,
  User,
} from 'lucide-react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { meetingsApi, type Meeting, type RagSource, ApiRequestError } from '@/lib/api';
import { LiveSubtitle } from '@/components/meetings/LiveSubtitle';
import { useVADController } from '@/hooks/useVADController';
import type { TranslationStream, TranscriptHistoryEntry } from '@/hooks/useTranslationSocket';

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isAi?: boolean;
}

class LiveKitTileErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[LiveKitTileErrorBoundary] Suppressed transient tile error:', error?.message);
    setTimeout(() => this.setState({ hasError: false }), 50);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black/60 text-slate-400 text-xs">
          Syncing video streams...
        </div>
      );
    }
    return this.props.children;
  }
}

// Inner component that lives INSIDE <LiveKitRoom> so it can use useLocalParticipant()
function LiveKitContent({
  onVADUpdate,
  participantName,
}: {
  onVADUpdate: (data: {
    streamData: TranslationStream | null;
    interimText: string;
    isListening: boolean;
    isConnected: boolean;
    transcriptHistory: TranscriptHistoryEntry[];
  }) => void;
  participantName: string;
}) {
  const { streamData, interimText, isListening, isConnected, transcriptHistory } =
    useVADController(participantName);

  useEffect(() => {
    onVADUpdate({ streamData, interimText, isListening, isConnected, transcriptHistory });
  }, [streamData, interimText, isListening, isConnected, transcriptHistory, onVADUpdate]);

  return (
    <>
      <LiveKitTileErrorBoundary>
        <VideoConference />
      </LiveKitTileErrorBoundary>
      <RoomAudioRenderer />
      <LiveSubtitle streamData={streamData} interimText={interimText} />
    </>
  );
}

export function MeetingRoomClient() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  // Suppress harmless LiveKit internal tile-sorting console errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const msg = args[0] ? String(args[0]) : '';
      if (msg.includes('Element not part of the array')) return;
      originalError.apply(console, args);
    };

    const handleUnhandledError = (event: ErrorEvent) => {
      const msg = event.message || (event.error && String(event.error)) || '';
      if (typeof msg === 'string' && msg.includes('Element not part of the array')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = (event.reason && String(event.reason)) || '';
      if (typeof msg === 'string' && msg.includes('Element not part of the array')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [liveKitError, setLiveKitError] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'transcript' | 'ai'>('transcript');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // VAD data lifted from LiveKitContent
  const [vadStreamData, setVadStreamData] = useState<TranslationStream | null>(null);
  const [vadInterimText, setVadInterimText] = useState('');
  const [vadIsListening, setVadIsListening] = useState(false);
  const [vadIsConnected, setVadIsConnected] = useState(false);
  const [vadTranscriptHistory, setVadTranscriptHistory] = useState<TranscriptHistoryEntry[]>([]);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const handleVADUpdate = useCallback(
    (data: {
      streamData: TranslationStream | null;
      interimText: string;
      isListening: boolean;
      isConnected: boolean;
      transcriptHistory: TranscriptHistoryEntry[];
    }) => {
      setVadStreamData(data.streamData);
      setVadInterimText(data.interimText);
      setVadIsListening(data.isListening);
      setVadIsConnected(data.isConnected);
      setVadTranscriptHistory(data.transcriptHistory);
    },
    []
  );

  // Auto-scroll transcript when new entries arrive
  useEffect(() => {
    if (vadTranscriptHistory.length > 0) {
      setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [vadTranscriptHistory.length]);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      sender: 'Axiom AI Agent',
      text: 'Xin chào! Tôi đã sẵn sàng. Hãy hỏi tôi về agenda, transcript, hoặc bất cứ điều gì liên quan đến cuộc họp này.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAi: true,
    },
  ]);
  const [aiQueryMsg, setAiQueryMsg] = useState('');

  // Bookmark Feedback
  const [bookmarkFeedback, setBookmarkFeedback] = useState<string | null>(null);

  // AI loading state
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [participantName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);

  // Load meeting data
  useEffect(() => {
    const controller = new AbortController();
    meetingsApi
      .get(meetingId, controller.signal)
      .then((m) => {
        if (!controller.signal.aborted) {
          setMeeting(m);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted && err?.name !== 'AbortError') {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [meetingId]);

  // Load LiveKit token
  useEffect(() => {
    if (!meeting) return;
    const controller = new AbortController();
    meetingsApi
      .getToken(meeting.id, participantName, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted && data?.token) setToken(data.token);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLiveKitError(true);
      });
    return () => controller.abort();
  }, [meeting, participantName]);

  const handleAddBookmark = async () => {
    try {
      const authToken = localStorage.getItem('axiom_token');
      const wsRaw = localStorage.getItem('axiom_workspace');
      const wsId = wsRaw ? JSON.parse(wsRaw)?.id : null;
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

  const handleSendAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQueryMsg.trim() || isAiLoading) return;

    const q = aiQueryMsg.trim();
    setAiQueryMsg('');
    setIsAiLoading(true);

    setAiMessages((prev) => [
      ...prev,
      {
        sender: participantName,
        text: q,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    try {
      const result = await meetingsApi.ragQuery(meetingId, q);

      const sourceBlock =
        result.sources.length > 0
          ? '\n\n**Nguồn:**\n' +
            result.sources
              .slice(0, 3)
              .map((s: RagSource) => {
                const label =
                  { agenda: '📋', transcript: '🗣️', file: '📄', bookmark: '📌' }[s.type] ?? '📎';
                const title = s.filename ? `${label} ${s.filename}` : `${label} ${s.type}`;
                return `• ${title}: ${s.snippet.slice(0, 100)}${s.snippet.length > 100 ? '...' : ''}`;
              })
              .join('\n')
          : '';

      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'Axiom AI Agent',
          text: result.answer + sourceBlock,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAi: true,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof ApiRequestError ? err.message : 'AI Agent không phản hồi. Vui lòng thử lại.';
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'Axiom AI Agent',
          text: `⚠️ ${msg}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAi: true,
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] text-white space-y-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-red-400">Không tìm thấy cuộc họp</h1>
        <p className="text-slate-400 text-sm max-w-md">
          Meeting không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Link href="/meetings">
          <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg shadow-blue-600/25 transition-all">
            Quay lại danh sách
          </button>
        </Link>
      </div>
    );
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  return (
    <div className="h-full w-full bg-bg-base text-text-primary flex flex-col overflow-hidden select-none">
      {/* Top Header */}
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

          {/* STT Status indicator */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
              vadIsListening
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}
          >
            {vadIsListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            {vadIsListening ? 'STT Active' : 'STT Off'}
          </div>

          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            LiveKit Active
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-xl bg-[#131B2E] border border-blue-950 text-slate-400 hover:text-white hover:border-blue-800 transition-all"
            title="Toggle Right Panel"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* Left Side: LiveKit Video Canvas + Subtitle Overlay */}
        <div className="flex-1 bg-black relative flex flex-col overflow-hidden min-h-0 min-w-0">
          <div className="flex-1 relative w-full h-full min-h-0 min-w-0">
            {token === '' ? (
              <div className="text-text-secondary flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-xs font-medium">Connecting to LiveKit WebRTC Server...</p>
              </div>
            ) : (
              <LiveKitRoom
                token={token}
                serverUrl={livekitUrl}
                data-lk-theme="default"
                className="w-full h-full absolute inset-0 flex flex-col"
                onDisconnected={() => {
                  console.log('User left the meeting room.');
                  router.push('/meetings');
                }}
                onError={(err) => {
                  console.error('LiveKit connection error:', err);
                  setLiveKitError(true);
                }}
              >
                <LiveKitContent onVADUpdate={handleVADUpdate} participantName={participantName} />
              </LiveKitRoom>
            )}
          </div>

          {/* LiveKit Offline Warning */}
          {liveKitError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              LiveKit server chưa khởi động (ws://localhost:7880). Các tính năng AI RAG vẫn hoạt
              động.
            </div>
          )}
        </div>

        {/* Right Side: Transcript + AI Assistant */}
        {sidebarOpen && (
          <aside className="w-80 md:w-96 bg-[#0E1526] border-l border-blue-950/60 flex flex-col shrink-0 overflow-hidden">
            {/* 2 Tabs */}
            <div className="flex items-center border-b border-blue-950/60 p-2 gap-1.5 bg-[#131B2E]/60">
              <button
                onClick={() => setActiveRightTab('transcript')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeRightTab === 'transcript'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Nội dung cuộc họp</span>
              </button>

              <button
                onClick={() => setActiveRightTab('ai')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeRightTab === 'ai'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Assistant</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeRightTab === 'transcript' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Compact agenda header */}
                  <div className="p-3 border-b border-blue-950/60 bg-[#131B2E]/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Agenda cuộc họp
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {meeting.agenda}
                    </p>
                  </div>

                  {/* STT status bar */}
                  <div className="px-3 py-2 border-b border-blue-950/60 flex items-center justify-between bg-[#131B2E]/20">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${vadIsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
                      />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {vadIsConnected ? 'WS Connected' : 'WS Offline'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {vadIsListening ? (
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                          <Mic className="w-3 h-3" /> Đang thu
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                          <MicOff className="w-3 h-3" /> Bật mic để ghi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live interim text preview */}
                  {vadInterimText && (
                    <div className="px-3 py-2 border-b border-blue-950/60 bg-blue-500/5">
                      <p className="text-[11px] text-blue-300 italic flex items-center gap-1.5">
                        <Mic className="w-3 h-3 text-blue-400 animate-pulse" />
                        {vadInterimText}
                        <span className="inline-block w-1 h-3 bg-blue-400 animate-pulse ml-0.5" />
                      </p>
                    </div>
                  )}

                  {/* Transcript History Feed */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {vadTranscriptHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-8">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-300">Chưa có nội dung</p>
                          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                            Bật mic trong thanh công cụ LiveKit và nói. Mỗi câu nói sẽ được nhận
                            diện, dịch song ngữ và hiển thị tại đây.
                          </p>
                        </div>
                      </div>
                    ) : (
                      vadTranscriptHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 rounded-xl bg-[#131B2E] border border-blue-950/80 space-y-1.5"
                        >
                          {/* Speaker + Time */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                <User className="w-2.5 h-2.5 text-blue-400" />
                              </div>
                              <span className="text-[10px] font-bold text-blue-400">
                                {entry.speaker || participantName}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {entry.timestamp}
                            </span>
                          </div>

                          {/* Vietnamese text */}
                          <p className="text-xs text-slate-200 leading-relaxed">{entry.vi_text}</p>

                          {/* English translation */}
                          {entry.en_text && (
                            <div className="flex items-start gap-1 border-t border-blue-950/60 pt-1.5 mt-1">
                              <Globe className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-sky-300/80 italic leading-relaxed">
                                {entry.en_text}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={transcriptEndRef} />
                  </div>

                  {/* Transcript count footer */}
                  {vadTranscriptHistory.length > 0 && (
                    <div className="p-2 border-t border-blue-950/60 text-center">
                      <span className="text-[9px] text-slate-500">
                        {vadTranscriptHistory.length} phát biểu đã ghi nhận
                      </span>
                    </div>
                  )}
                </div>
              )}

              {activeRightTab === 'ai' && (
                <div className="flex-1 flex flex-col overflow-hidden p-4">
                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {aiMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${msg.isAi ? 'bg-indigo-950/30 border-indigo-500/40' : 'bg-[#131B2E] border-blue-950'} space-y-1`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span
                            className={`font-bold ${msg.isAi ? 'text-indigo-400' : 'text-blue-400'}`}
                          >
                            {msg.sender}
                          </span>
                          <span className="text-slate-500">{msg.time}</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSendAiQuery}
                    className="flex items-center gap-2 pt-3 mt-3 border-t border-blue-950"
                  >
                    <input
                      type="text"
                      value={aiQueryMsg}
                      onChange={(e) => setAiQueryMsg(e.target.value)}
                      disabled={isAiLoading}
                      placeholder={
                        isAiLoading ? 'Đang suy nghĩ...' : 'Hỏi về agenda, transcript...'
                      }
                      className="flex-1 px-3 py-2 rounded-xl bg-[#131B2E] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={isAiLoading}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isAiLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
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
