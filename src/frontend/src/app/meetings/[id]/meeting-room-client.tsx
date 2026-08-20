'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Calendar,
  Clock,
  ArrowLeft,
  Sparkles,
  FileText,
  ChevronRight,
  Zap,
  Mic,
  MicOff,
  UserPlus,
  Kanban,
  ExternalLink,
} from 'lucide-react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import {
  meetingsApi,
  jiraApi,
  type Meeting,
  type RagSource,
  type ActionItemResponse,
  type TranscriptResponse,
  ApiRequestError,
} from '@/lib/api';
import { LiveSubtitle } from '@/components/meetings/LiveSubtitle';
import { useVADController } from '@/hooks/useVADController';
import type { TranslationStream, TranscriptHistoryEntry } from '@/hooks/useTranslationSocket';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { InviteMembersModal } from '@/components/meetings/InviteMembersModal';

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
  onTranscriptFinalized,
}: {
  onVADUpdate: (data: {
    streamData: TranslationStream | null;
    interimText: string;
    isListening: boolean;
    isConnected: boolean;
    transcriptHistory: TranscriptHistoryEntry[];
  }) => void;
  participantName: string;
  onTranscriptFinalized?: (entry: TranscriptHistoryEntry) => void;
}) {
  const { streamData, interimText, isListening, isConnected, transcriptHistory } = useVADController(
    participantName,
    onTranscriptFinalized
  );

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
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // VAD data lifted from LiveKitContent
  const [, setVadStreamData] = useState<TranslationStream | null>(null);
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

  const transcriptSequenceRef = useRef(1);

  const handleTranscriptFinalized = useCallback(
    async (entry: TranscriptHistoryEntry) => {
      if (!meetingId) return;
      try {
        const currentSequence = transcriptSequenceRef.current++;
        const contentStr = entry.en_text
          ? `[VI] ${entry.vi_text}\n[EN] ${entry.en_text}`
          : entry.vi_text;
        await meetingsApi.saveTranscript(meetingId, {
          content: contentStr,
          start_time: entry.timestamp,
          end_time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          sequence: currentSequence,
        });
        console.log('[STT] Saved transcript segment to DB', currentSequence);
      } catch (err) {
        console.error('[STT] Failed to save transcript segment:', err);
      }
    },
    [meetingId]
  );

  // Auto-scroll transcript when new entries arrive
  useEffect(() => {
    if (vadTranscriptHistory.length > 0) {
      const timer = setTimeout(
        () => transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
        100
      );
      return () => clearTimeout(timer);
    }
  }, [vadTranscriptHistory.length]);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      sender: 'Axiom Assistant',
      text: 'Xin chào! Tôi có thể giúp gì cho bạn trong cuộc họp này?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAi: true,
    },
  ]);

  // Action Items and Transcripts state
  const [actionItems, setActionItems] = useState<ActionItemResponse[]>([]);
  const [dbTranscripts, setDbTranscripts] = useState<TranscriptResponse[]>([]);

  // Poll for action items
  useEffect(() => {
    if (!meetingId) return;
    const fetchActionItems = async () => {
      try {
        const [items, transcripts] = await Promise.all([
          meetingsApi.getActionItems(meetingId),
          meetingsApi.getTranscripts(meetingId),
        ]);
        setActionItems(items);
        setDbTranscripts(transcripts);
      } catch (err) {
        console.error('Failed to fetch meeting content:', err);
      }
    };

    fetchActionItems();
    const interval = setInterval(fetchActionItems, 5000);
    return () => clearInterval(interval);
  }, [meetingId]);

  const [isOpeningJira, setIsOpeningJira] = useState(false);
  const handleOpenJiraWorkspace = async () => {
    if (!meetingId) return;
    try {
      setIsOpeningJira(true);
      const project = await jiraApi.getMeetingWorkspace(meetingId);
      // Also sync current action items
      if (actionItems.length > 0) {
        await jiraApi.syncMeetingTasksToJira(meetingId, { target_project_id: project.id });
      }
      router.push(`/jira/${project.key}/board`);
    } catch (err) {
      console.error('Failed to open Jira workspace:', err);
    } finally {
      setIsOpeningJira(false);
    }
  };

  const [aiQueryMsg, setAiQueryMsg] = useState('');

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
                return `• ${title}: ${s.snippet.slice(0, 100)}${
                  s.snippet.length > 100 ? '...' : ''
                }`;
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

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

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
                {new Date(meeting.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" />
                {new Date(meeting.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-600/40 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 text-xs font-medium transition-all"
            title="Mời thành viên"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Mời
          </button>
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
                connect={true}
                audio={false}
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
                <LiveKitContent
                  onVADUpdate={handleVADUpdate}
                  participantName={participantName}
                  onTranscriptFinalized={handleTranscriptFinalized}
                />
              </LiveKitRoom>
            )}
          </div>

          {/* LiveKit Offline Warning */}
          {liveKitError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              LiveKit server chưa được cấu hình. Các tính năng AI RAG vẫn hoạt động bình thường. Mời
              bạn chat ở khung bên phải nhé! 🚀
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
                <span>Meeting Summary AI</span>
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
                <PanelGroup direction="vertical" className="flex-1 overflow-hidden">
                  <Panel defaultSize={60} minSize={30} className="flex flex-col bg-[#0E1526]">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* STT status bar */}
                      <div className="px-3 py-2 border-b border-blue-950/60 flex items-center justify-between bg-[#131B2E]/20">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              vadIsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                            }`}
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

                      {/* Transcript History Feed (Meeting Notes) */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/5">
                        {dbTranscripts.length === 0 && vadTranscriptHistory.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-300">
                                Chưa có nội dung
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                                Bật mic trong thanh công cụ LiveKit và nói.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {dbTranscripts.map((entry) => (
                              <div key={entry.id} className="text-sm">
                                <span className="font-bold text-blue-400 mr-2">
                                  [{entry.speaker || 'User'}]
                                </span>
                                <span className="text-slate-300">{entry.content}</span>
                              </div>
                            ))}
                            {vadTranscriptHistory
                              .filter(
                                (v) =>
                                  !dbTranscripts.some((d) => (d.content || '').includes(v.vi_text))
                              )
                              .map((entry) => (
                                <div key={entry.id} className="text-sm">
                                  <span className="font-bold text-blue-400 mr-2">
                                    [{entry.speaker || participantName}]
                                  </span>
                                  <span className="text-slate-300">{entry.vi_text}</span>
                                </div>
                              ))}
                          </>
                        )}
                        <div ref={transcriptEndRef} />
                      </div>
                    </div>
                  </Panel>

                  <PanelResizeHandle className="h-1.5 bg-blue-950/60 hover:bg-blue-500/50 transition-colors cursor-row-resize" />

                  <Panel defaultSize={40} minSize={20} className="flex flex-col bg-[#0B101E]">
                    <div className="p-3 border-b border-blue-950/60 bg-[#131B2E]/40 sticky top-0 z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          Follow-up Tasks
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {actionItems.length}
                        </span>
                      </div>

                      <button
                        onClick={handleOpenJiraWorkspace}
                        disabled={isOpeningJira}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                        title="Open Jira Board for this Meeting"
                      >
                        {isOpeningJira ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Kanban className="w-3 h-3" />
                        )}
                        <span>Jira Board</span>
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {actionItems.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-xs">
                          Chưa có Follow-up Tasks nào được AI trích xuất.
                        </div>
                      ) : (
                        actionItems.map((item: ActionItemResponse) => (
                          <div
                            key={item.id}
                            className="text-xs p-2.5 rounded-lg bg-[#131B2E] border border-blue-950/80"
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 shrink-0">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    item.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-amber-400'
                                  }`}
                                />
                              </div>
                              <div>
                                <span className="font-bold text-emerald-300 bg-emerald-400/10 px-1.5 py-0.5 rounded mr-1.5">
                                  {item.title}
                                </span>
                                <span className="text-slate-300 leading-relaxed">
                                  {item.description || ''}
                                </span>
                                {item.assignee_id && (
                                  <span className="text-blue-400 ml-1.5">(@Assignee)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Panel>
                </PanelGroup>
              )}

              {activeRightTab === 'ai' && (
                <div className="flex-1 flex flex-col overflow-hidden p-4">
                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {aiMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${
                          msg.isAi
                            ? 'bg-indigo-950/30 border-indigo-500/40'
                            : 'bg-[#131B2E] border-blue-950'
                        } space-y-1`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span
                            className={`font-bold ${
                              msg.isAi ? 'text-indigo-400' : 'text-blue-400'
                            }`}
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

      {/* Invite Members Modal */}
      <InviteMembersModal
        meetingId={meetingId}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </div>
  );
}
