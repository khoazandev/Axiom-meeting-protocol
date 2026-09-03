'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Video,
  MessageSquare,
  PhoneOff,
  Globe,
  User,
  Pencil,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
  TrackToggle,
  DisconnectButton,
  Chat,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import {
  meetingsApi,
  jiraApi,
  authApi,
  type Meeting,
  type RagSource,
  type ActionItemResponse,
  type TranscriptResponse,
  type MeetingMember,
  ApiRequestError,
} from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useVADController } from '@/hooks/useVADController';
import type { TranslationStream, TranscriptHistoryEntry } from '@/hooks/useVADController';
import { useTranslationAudioMuting, useTranslationStore } from '@/hooks/useTranslationAudioMuting';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { InviteMembersModal } from '@/components/meetings/InviteMembersModal';
import { CustomDateTimePicker } from '@/components/ui/date-time-picker';
import { useRoomContext, useConnectionState } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

function SpeechTranslationControl() {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const [isOpen, setIsOpen] = useState(false);
  const { enabled, sourceLang, setEnabled, setSourceLang } = useTranslationStore();

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      // Sync to LiveKit participant attributes
      room.localParticipant
        .setAttributes({
          translation_enabled: enabled ? 'true' : 'false',
          translation_source: sourceLang,
        })
        .catch((e) => console.warn('Failed to set attributes', e));
    }
  }, [enabled, sourceLang, room, connectionState]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`lk-button ${enabled ? 'bg-primary/20 text-primary border border-primary/50' : ''}`}
        title="Speech Translation"
      >
        <Globe className="w-5 h-5" style={enabled ? {} : { color: '#000000', stroke: '#000000' }} />
      </button>

      {isOpen && (
        <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-64 bg-card border border-border shadow-2xl rounded-xl p-4 z-50 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Speech Translation</span>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">Translate from</label>
            <select
              disabled={!enabled}
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

import { useDataChannel } from '@livekit/components-react';

export interface RecordEntry {
  timestamp: string;
  participant_identity: string;
  original_text: string;
  language: string;
  is_final: boolean;
}

function RecordsListener({ 
  onNewRecord,
  onTranscriptFinalized 
}: { 
  onNewRecord: (r: RecordEntry) => void;
  onTranscriptFinalized?: (text: string, timestamp: string) => void;
}) {
  useDataChannel('records', (msg) => {
    try {
      const payload = msg.payload || msg; // Handle both v1 and v2 formats
      const text = new TextDecoder().decode(payload as Uint8Array);
      console.log("[DataChannel] Received record payload:", text);
      const data = JSON.parse(text);
      if (data.type === 'original_transcript') {
        const timeStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        onNewRecord({
          timestamp: timeStr,
          participant_identity: data.participant_identity,
          original_text: data.original_text,
          language: data.language,
          is_final: data.is_final,
        });
        
        if (data.is_final && onTranscriptFinalized) {
          onTranscriptFinalized(data.original_text, timeStr);
        }
      }
    } catch (e) {
      console.warn('Failed to parse record data', e);
    }
  });
  return null;
}

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

function LiveKitContent({
  onVADUpdate,
  participantName,
  onInviteClick,
  onSidebarToggle,
  isHost,
  onEndMeeting,
}: {
  onVADUpdate: (data: {
    streamData: TranslationStream | null;
    interimText: string;
    isListening: boolean;
    isConnected: boolean;
    transcriptHistory: TranscriptHistoryEntry[];
  }) => void;
  participantName: string;
  onInviteClick: () => void;
  onSidebarToggle: () => void;
  isHost: boolean;
  onEndMeeting: () => void;
}) {
  const { streamData, interimText, isListening, isConnected, transcriptHistory } = useVADController(
    participantName
  );

  // Activate translation audio muting hook
  useTranslationAudioMuting();

  useEffect(() => {
    onVADUpdate({ streamData, interimText, isListening, isConnected, transcriptHistory });
  }, [streamData, interimText, isListening, isConnected, transcriptHistory, onVADUpdate]);

  const allTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const tracks = allTracks.filter((t) => !t.participant.identity.startsWith('agent-'));

  return (
    <div className="w-full h-full flex flex-col p-4 bg-background gap-4">
      {/* Camera Frame */}
      <div className="flex-1 min-h-0 bg-card border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden relative">
        <GridLayout tracks={tracks} className="w-full h-full">
          <ParticipantTile />
        </GridLayout>
        
        {/* VAD Status overlay */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {isConnected && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isListening 
                ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-primary'}`} />
              {isListening ? 'AI đang nghe...' : 'AI sẵn sàng'}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="w-full shrink-0 flex items-center justify-center z-50">
        <div className="bg-card shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border rounded-2xl px-6 py-3 flex items-center justify-center gap-6">
          <TrackToggle source={Track.Source.Microphone} />
          <TrackToggle source={Track.Source.Camera} />
          <TrackToggle source={Track.Source.ScreenShare} />
          <SpeechTranslationControl />
          <button onClick={onInviteClick} className="lk-button" title="Mời thành viên">
            <UserPlus className="w-5 h-5" />
          </button>
          <button onClick={onSidebarToggle} className="lk-button" title="Đóng/Mở Sidebar">
            <MessageSquare className="w-5 h-5" />
          </button>
          {isHost ? (
            <button 
              onClick={onEndMeeting}
              className="lk-button bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
              title="Kết thúc cuộc họp"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          ) : (
            <DisconnectButton className="lk-button lk-disconnect-button" title="Rời phòng">
              <PhoneOff className="w-5 h-5" />
            </DisconnectButton>
          )}
        </div>
      </div>

      <RoomAudioRenderer />
    </div>
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
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('vi');
  const [isJoining, setIsJoining] = useState(false);
  const [liveKitError, setLiveKitError] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'transcript' | 'records' | 'ai'>(
    'records'
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [recordsHistory, setRecordsHistory] = useState<RecordEntry[]>([]);
  
  // Post-Meeting Dashboard states
  const [showPostMeeting, setShowPostMeeting] = useState(false);
  const showPostMeetingRef = useRef(false);
  useEffect(() => { showPostMeetingRef.current = showPostMeeting; }, [showPostMeeting]);
  const [meetingSummary, setMeetingSummary] = useState<any>(null);

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
    async (text: string, timestamp: string) => {
      if (!meetingId) return;
      try {
        const currentSequence = transcriptSequenceRef.current++;
        await meetingsApi.saveTranscript(meetingId, {
          content: text,
          start_time: timestamp,
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

  // Action Items, Decisions and Transcripts state
  const [actionItems, setActionItems] = useState<ActionItemResponse[]>([]);
  const [meetingDecisions, setMeetingDecisions] = useState<any[]>([]);
  const [dbTranscripts, setDbTranscripts] = useState<TranscriptResponse[]>([]);
  const [meetingMembers, setMeetingMembers] = useState<MeetingMember[]>([]);

  // Edit Task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; assignee_id: string; deadline: string }>({ 
    title: '', assignee_id: '', deadline: '' 
  });

  // Edit Decision state
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [editDecisionForm, setEditDecisionForm] = useState<{ description: string; status: string; proposer_id: string }>({ 
    description: '', status: 'PROPOSED', proposer_id: '' 
  });

  // Poll for action items
  useEffect(() => {
    if (!meetingId) return;
    const fetchActionItems = async () => {
      try {
        const [items, decisions, transcripts, members] = await Promise.all([
          meetingsApi.getActionItems(meetingId),
          meetingsApi.getDecisions(meetingId),
          meetingsApi.getTranscripts(meetingId),
          meetingsApi.getMembers(meetingId),
        ]);
        setActionItems(items);
        setMeetingDecisions(decisions);
        setDbTranscripts(transcripts);
        setMeetingMembers(members);
      } catch (err) {
        console.error('Failed to fetch meeting content:', err);
      }
    };

    fetchActionItems();
    const interval = setInterval(fetchActionItems, 5000);
    return () => clearInterval(interval);
  }, [meetingId]);

  const handleSaveEdit = async (taskId: string) => {
    if (!meetingId) return;
    try {
      const payload: any = { title: editForm.title };
      if (editForm.assignee_id) payload.assignee_id = editForm.assignee_id;
      if (editForm.deadline) payload.deadline = new Date(editForm.deadline).toISOString();
      
      await meetingsApi.updateFollowUpTask(meetingId, taskId, payload);
      setEditingTaskId(null);
      // Cập nhật local state ngay lập tức cho mượt
      setActionItems(prev => prev.map(item => {
        if (item.id === taskId) {
          const assigneeName = meetingMembers.find(m => m.user_id === editForm.assignee_id)?.user_name || item.assignee_name;
          return { ...item, title: editForm.title, assignee_id: editForm.assignee_id, assignee_name: assigneeName, deadline: payload.deadline } as any;
        }
        return item;
      }));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleStartEdit = (item: any) => {
    setEditingTaskId(item.id);
    let defaultDeadline = '';
    const dl = item.deadline || item.due_date;
    if (dl) {
      // Format to YYYY-MM-DDThh:mm for datetime-local
      try {
        const d = new Date(dl);
        // Adjust for local timezone offset
        const tzOffset = d.getTimezoneOffset() * 60000;
        defaultDeadline = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      } catch (e) {}
    }
    setEditForm({
      title: item.title,
      assignee_id: item.assignee_id || '',
      deadline: defaultDeadline,
    });
  };

  const handleStartEditDecision = (decision: any) => {
    setEditingDecisionId(decision.id);
    setEditDecisionForm({
      description: decision.description,
      status: decision.status || 'PROPOSED',
      proposer_id: decision.proposer_id || '',
    });
  };

  const handleSaveEditDecision = async (decisionId: string) => {
    if (!meetingId) return;
    try {
      const payload: any = { 
        description: editDecisionForm.description, 
        status: editDecisionForm.status 
      };
      if (editDecisionForm.proposer_id) payload.proposer_id = editDecisionForm.proposer_id;
      else payload.proposer_id = null; // allow clearing proposer
      
      await meetingsApi.updateDecision(meetingId as string, decisionId, payload);
      setEditingDecisionId(null);
      setMeetingDecisions(prev => prev.map(d => {
        if (d.id === decisionId) {
          const proposerName = meetingMembers.find(m => m.user_id === editDecisionForm.proposer_id)?.user_name || null;
          return { ...d, description: editDecisionForm.description, status: editDecisionForm.status, proposer_id: editDecisionForm.proposer_id, proposer_name: proposerName };
        }
        return d;
      }));
    } catch (err) {
      console.error('Failed to update decision:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!meetingId || !window.confirm('Bạn có chắc chắn muốn xóa task này?')) return;
    try {
      await meetingsApi.deleteFollowUpTask(meetingId as string, taskId);
      setActionItems(prev => prev.filter(item => item.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleDeleteDecision = async (decisionId: string) => {
    if (!meetingId || !window.confirm('Bạn có chắc chắn muốn xóa quyết định này?')) return;
    try {
      await meetingsApi.deleteDecision(meetingId as string, decisionId);
      setMeetingDecisions(prev => prev.filter(d => d.id !== decisionId));
    } catch (err) {
      console.error('Failed to delete decision:', err);
    }
  };

  const [isOpeningJira, setIsOpeningJira] = useState(false);
  
  const handleEndMeeting = async () => {
    if (!meetingId) return;
    try {
      setShowPostMeeting(true);
      await meetingsApi.endMeeting(meetingId as string);
      // Wait a bit to ensure UI updates, then disconnect by unmounting LiveKitRoom
      setTimeout(() => {
        setHasJoined(false);
      }, 500);
    } catch (err) {
      console.error("Failed to end meeting", err);
    }
  };
  useEffect(() => {
    let interval: any;
    if (showPostMeeting && !meetingSummary) {
      interval = setInterval(async () => {
        try {
          const m = await meetingsApi.getMeetingSummary(meetingId as string);
          if (m && m.summary) {
            setMeetingSummary(m.summary);
            clearInterval(interval);
          }
        } catch(e) {}
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showPostMeeting, meetingSummary, meetingId]);
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

  const user = useAuthStore((state) => state.user);
  const [participantName, setParticipantName] = useState(() => user?.full_name || '');

  useEffect(() => {
    if (user?.full_name) {
      setParticipantName(user.full_name);
    } else {
      authApi
        .me()
        .then((u) => {
          if (u?.full_name) {
            setParticipantName(u.full_name);
            useAuthStore.setState({ user: u });
          } else {
            setParticipantName(`User-${Math.floor(Math.random() * 1000)}`);
          }
        })
        .catch(() => {
          setParticipantName(`User-${Math.floor(Math.random() * 1000)}`);
        });
    }
  }, [user]);

  // Load meeting data
  useEffect(() => {
    const controller = new AbortController();
    meetingsApi
      .get(meetingId, controller.signal)
      .then((m) => {
        if (!controller.signal.aborted) {
          setMeeting(m);
          setLoading(false);
          if (m.status === 'COMPLETED') {
            setShowPostMeeting(true);
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted && err?.name !== 'AbortError') {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [meetingId]);

  // Join Meeting Logic
  const handleJoinMeeting = async () => {
    if (!meeting || !participantName) return;
    setIsJoining(true);
    setLiveKitError(false);
    try {
      const data = await meetingsApi.getToken(meeting.id, participantName, selectedLanguage);
      if (data?.token) {
        setToken(data.token);
        setHasJoined(true);
      }
    } catch (err) {
      console.error('Failed to get token:', err);
      setLiveKitError(true);
    } finally {
      setIsJoining(false);
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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Không tìm thấy cuộc họp</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Meeting không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Link href="/meetings">
          <button className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-lg shadow-primary/25 transition-all">
            Quay lại danh sách
          </button>
        </Link>
      </div>
    );
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  if (!hasJoined && !showPostMeeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-6 p-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
          <Video className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{meeting.title}</h1>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          Vui lòng chọn ngôn ngữ bạn sẽ sử dụng để nói trong cuộc họp này. Hệ thống sẽ dùng ngôn ngữ
          này để nhận diện và hiển thị phụ đề.
        </p>

        <div className="flex flex-col gap-2 w-full max-w-xs mt-4">
          <label className="text-sm font-semibold">Language you use in this call</label>
          <select
            className="flex h-11 w-full rounded-xl border border-input bg-card text-foreground px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="vi">Tiếng Việt (Vietnamese)</option>
            <option value="en">Tiếng Anh (English)</option>
            <option value="ja">Tiếng Nhật (Japanese)</option>
            <option value="ko">Tiếng Hàn (Korean)</option>
            <option value="zh">Tiếng Trung (Chinese)</option>
          </select>
        </div>

        <button
          onClick={handleJoinMeeting}
          disabled={isJoining}
          className="mt-6 px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all w-full max-w-xs flex items-center justify-center gap-2"
        >
          {isJoining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tham gia...
            </>
          ) : (
            'Join Meeting'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background text-foreground flex flex-col overflow-hidden select-none">
      {/* Top Header */}
      <header className="h-16 px-6 bg-primary flex items-center justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <button className="p-2 rounded-xl bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-foreground text-primary flex items-center justify-center">
              <Video className="w-5 h-5 fill-current" />
            </div>
            <h1 className="font-extrabold text-lg text-primary-foreground tracking-tight">
              Video Buddy
            </h1>
            <span className="text-primary-foreground/60 text-xs font-medium border-l border-primary-foreground/20 pl-3">
              {meeting.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Nút Invite và Chat đã được di chuyển xuống thanh Control Bar */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {token === '' ? (
          <div className="flex-1 bg-background text-muted-foreground flex flex-col items-center justify-center w-full h-full gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-medium">Connecting to LiveKit WebRTC Server...</p>
          </div>
        ) : (
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl}
            connect={true}
            audio={false}
            data-lk-theme="default"
            className="w-full h-full flex overflow-hidden"
            onDisconnected={() => {
              console.log('User left the meeting room.');
              if (!showPostMeetingRef.current) {
                router.push('/meetings');
              }
            }}
            onError={(err) => {
              console.error('LiveKit connection error:', err);
              setLiveKitError(true);
            }}
          >
            {/* Left Side: LiveKit Video Canvas + Subtitle Overlay */}
            <div className="flex-1 bg-background relative flex flex-col overflow-hidden min-h-0 min-w-0 border-r border-border">
              <RecordsListener
                onTranscriptFinalized={handleTranscriptFinalized}
                onNewRecord={(r) => {
                  setRecordsHistory((prev) => {
                    const newArr = [...prev];
                    let found = false;
                    // Try to find an existing interim record from this participant
                    for (let i = newArr.length - 1; i >= 0; i--) {
                      if (
                        newArr[i].participant_identity === r.participant_identity &&
                        !newArr[i].is_final
                      ) {
                        newArr[i] = {
                          ...newArr[i],
                          original_text: r.original_text,
                          is_final: r.is_final,
                        };
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      newArr.push(r);
                    }
                    console.log("[RecordsListener] Updated records history array length:", newArr.length);
                    return newArr;
                  });
                }}
              />
              <div className="flex-1 relative w-full h-full min-h-0 min-w-0">
                <LiveKitContent
                  isHost={user?.id === meeting?.created_by_id}
                  onEndMeeting={handleEndMeeting}
                  onVADUpdate={handleVADUpdate}
                  participantName={participantName}
                  onInviteClick={() => setInviteModalOpen(true)}
                  onSidebarToggle={() => {
                    if (!sidebarOpen) {
                      setSidebarOpen(true);
                      setActiveRightTab('chat');
                    } else if (activeRightTab !== 'chat') {
                      setActiveRightTab('chat');
                    } else {
                      setSidebarOpen(false);
                    }
                  }}
                />
              </div>

              {/* LiveKit Offline Warning */}
              {liveKitError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  LiveKit server chưa được cấu hình. Các tính năng AI RAG vẫn hoạt động bình thường.
                  Mời bạn chat ở khung bên phải nhé! 🚀
                </div>
              )}
            </div>

            {/* Right Side: Transcript + AI Assistant */}
            {sidebarOpen && (
              <aside className="w-80 md:w-96 bg-card flex flex-col shrink-0 overflow-hidden shadow-2xl z-10">
                {/* 3 Tabs */}
                <div className="flex items-center p-3 gap-2 bg-card border-b border-border">
                  <button
                    onClick={() => setActiveRightTab('chat')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeRightTab === 'chat'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                  <button
                    onClick={() => setActiveRightTab('records')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeRightTab === 'records'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Records</span>
                  </button>
                  <button
                    onClick={() => setActiveRightTab('transcript')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeRightTab === 'transcript'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Notes</span>
                  </button>

                  <button
                    onClick={() => setActiveRightTab('ai')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeRightTab === 'ai'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Agent</span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  <div
                    className={`flex-1 flex-col bg-background ${activeRightTab === 'chat' ? 'flex' : 'hidden'}`}
                  >
                    <Chat style={{ width: '100%', height: '100%' }} />
                  </div>

                  <div
                    className={`flex-1 flex-col overflow-y-auto ${activeRightTab === 'records' ? 'flex' : 'hidden'}`}
                  >
                    {/* Records view will go here */}
                    <div className="p-4 flex flex-col gap-3">
                      {dbTranscripts.map((t, idx) => (
                        <div
                          key={`db-${t.id || idx}`}
                          className="bg-muted p-3 rounded-lg text-sm transition-opacity duration-200 opacity-100 border border-primary/20"
                        >
                          <div className="font-semibold text-primary text-xs mb-1 flex items-center justify-between">
                            <span>
                              [{t.start_time || ''}] {t.speaker_name || 'User'}
                            </span>
                            <span className="opacity-50 font-normal">VI</span>
                          </div>
                          <div className="text-foreground">{t.content}</div>
                        </div>
                      ))}
                      {recordsHistory.length === 0 && dbTranscripts.length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm mt-10">
                          Chưa có bản ghi nào. Hãy bắt đầu nói!
                        </div>
                      ) : (
                        recordsHistory.map((t, idx) => (
                          <div
                            key={idx}
                            className={`bg-muted p-3 rounded-lg text-sm transition-opacity duration-200 ${!t.is_final ? 'opacity-70' : 'opacity-100'}`}
                          >
                            <div className="font-semibold text-primary text-xs mb-1 flex items-center justify-between">
                              <span>
                                [{t.timestamp}] {t.participant_identity.replace('user_', 'User ')}{' '}
                                {t.is_final ? '' : '(đang nói...)'}
                              </span>
                              <span className="opacity-50 font-normal">
                                {t.language.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-foreground">{t.original_text}</div>
                          </div>
                        ))
                      )}
                      <div ref={transcriptEndRef} />
                    </div>
                  </div>

                  <div
                    className={`flex-1 flex-col overflow-hidden bg-muted/30 ${activeRightTab === 'transcript' ? 'flex' : 'hidden'}`}
                  >
                    <div className="p-3 border-b border-border bg-card/80 sticky top-0 z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          Meeting Notes
                        </span>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">Notes</h3>
                          <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {actionItems.length + meetingDecisions.length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-6">
                      {/* Decisions Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            Decisions
                          </h4>
                          <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {meetingDecisions.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {meetingDecisions.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-xs italic bg-card/50 rounded-lg border border-dashed border-border/50">
                              Chưa có quyết định nào được đưa ra.
                            </div>
                          ) : (
                            meetingDecisions.map((decision) => (
                              <div
                                key={decision.id}
                                className="text-sm p-3.5 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all flex flex-col gap-2 group"
                              >
                                {editingDecisionId === decision.id ? (
                                  <div className="flex flex-col gap-3">
                                    <textarea
                                      className="w-full text-sm p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm min-h-[60px]"
                                      value={editDecisionForm.description}
                                      onChange={(e) => setEditDecisionForm(prev => ({ ...prev, description: e.target.value }))}
                                      placeholder="Nội dung quyết định..."
                                    />
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                      <select
                                        className="flex-1 text-xs p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm"
                                        value={editDecisionForm.status}
                                        onChange={(e) => setEditDecisionForm(prev => ({ ...prev, status: e.target.value }))}
                                      >
                                        <option value="PROPOSED">Đề xuất (PROPOSED)</option>
                                        <option value="AGREED">Đã chốt (AGREED)</option>
                                        <option value="REJECTED">Bác bỏ (REJECTED)</option>
                                      </select>
                                      <select
                                        className="flex-1 text-xs p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm"
                                        value={editDecisionForm.proposer_id}
                                        onChange={(e) => setEditDecisionForm(prev => ({ ...prev, proposer_id: e.target.value }))}
                                      >
                                        <option value="">-- Chọn người đề xuất --</option>
                                        {meetingMembers.map(m => (
                                          <option key={m.user_id} value={m.user_id}>{m.user_name || m.user_email || 'Người dùng ẩn danh'}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                      <button
                                        onClick={() => setEditingDecisionId(null)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-md text-xs font-medium transition-colors"
                                      >
                                        <X className="w-3.5 h-3.5" /> Hủy
                                      </button>
                                      <button
                                        onClick={() => handleSaveEditDecision(decision.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-medium transition-colors shadow-sm"
                                      >
                                        <Check className="w-3.5 h-3.5" /> Lưu
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-start gap-3">
                                      <div className="mt-1.5 shrink-0">
                                        <div
                                          className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                                            decision.status === 'AGREED' ? 'bg-success' : 
                                            decision.status === 'REJECTED' ? 'bg-destructive' : 'bg-warning'
                                          }`}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`font-semibold px-2.5 py-1 rounded-md leading-relaxed ${
                                          decision.status === 'AGREED' ? 'text-success bg-success/10' : 
                                          decision.status === 'REJECTED' ? 'text-destructive bg-destructive/10' : 
                                          'text-warning bg-warning/10'
                                        }`}>
                                          {decision.description}
                                        </span>
                                      </div>
                                    </div>
                                    {decision.rationale && (
                                      <div className="text-muted-foreground text-xs leading-relaxed pl-5 border-l-2 border-border/50 ml-1 mt-1">
                                        {decision.rationale}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-1">
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                        <span className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {decision.proposer_name || 'Chưa rõ người đề xuất'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div 
                                          onClick={() => handleStartEditDecision(decision)}
                                          className="w-5 h-5 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-muted-foreground hover:text-primary" 
                                          title="Chỉnh sửa quyết định"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </div>
                                        <div 
                                          onClick={() => handleDeleteDecision(decision.id)}
                                          className="w-5 h-5 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-muted-foreground hover:text-destructive" 
                                          title="Xóa quyết định"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Action Items Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            Action Items
                          </h4>
                          <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {actionItems.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {actionItems.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-xs italic bg-card/50 rounded-lg border border-dashed border-border/50">
                              Chưa có Action Items nào được trích xuất.
                            </div>
                          ) : (
                        actionItems.map((item: ActionItemResponse) => (
                          <div
                            key={item.id}
                            className="text-sm p-3.5 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all group"
                          >
                            {editingTaskId === item.id ? (
                              <div className="flex flex-col gap-3">
                                <input
                                  type="text"
                                  className="w-full text-sm p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm"
                                  value={editForm.title}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="Tiêu đề task..."
                                />
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                  <select
                                    className="flex-1 text-xs p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm"
                                    value={editForm.assignee_id}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, assignee_id: e.target.value }))}
                                  >
                                    <option value="">-- Chọn người phụ trách --</option>
                                    {meetingMembers.map(m => (
                                      <option key={m.user_id} value={m.user_id}>{m.user_name || m.user_email || 'Người dùng ẩn danh'}</option>
                                    ))}
                                  </select>
                                  <CustomDateTimePicker
                                    value={editForm.deadline}
                                    onChange={(val) => setEditForm(prev => ({ ...prev, deadline: val }))}
                                  />
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    onClick={() => setEditingTaskId(null)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-md text-xs font-medium transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" /> Hủy
                                  </button>
                                  <button
                                    onClick={() => handleSaveEdit(item.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-medium transition-colors shadow-sm"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Lưu
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1.5 shrink-0">
                                    <div
                                      className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                                        item.status === 'CONFIRMED' ? 'bg-success' : 'bg-warning'
                                      }`}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className={`font-semibold px-2.5 py-1 rounded-md leading-relaxed mr-1.5 inline-block ${
                                      item.status === 'CONFIRMED' ? 'text-success bg-success/10' : 'text-warning bg-warning/10'
                                    }`}>
                                      {item.title}
                                    </span>
                                    {item.description && (
                                      <span className="text-foreground leading-relaxed block mt-2 text-xs text-muted-foreground pl-1">
                                        {item.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-1">
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {item.assignee_name || 'Chưa gán'}
                                    </span>
                                    <span className="text-border">|</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {/* ActionItemResponse has due_date, FollowUpTask has deadline. Handle both. */}
                                      {(item as any).deadline || item.due_date ? new Date((item as any).deadline || item.due_date).toLocaleString('vi-VN', {
                                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                                      }) : 'Không có hạn'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div 
                                      onClick={() => handleStartEdit(item)}
                                      className="w-5 h-5 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-muted-foreground hover:text-primary" 
                                      title="Chỉnh sửa task"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </div>
                                    <div 
                                      onClick={() => handleDeleteTask(item.id)}
                                      className="w-5 h-5 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-muted-foreground hover:text-destructive" 
                                      title="Xóa task"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex-1 flex-col bg-background ${activeRightTab === 'ai' ? 'flex' : 'hidden'}`}
                  >
                    <div className="flex flex-col w-full h-full">
                      <ul className="lk-chat-messages flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {aiMessages.map((msg, i) => (
                          <li key={i} className="lk-chat-message flex flex-col gap-1">
                            <div className="lk-meta flex items-center justify-between">
                              <div
                                className="lk-participant-name font-bold"
                                style={{ color: msg.isAi ? 'var(--primary)' : 'var(--foreground)' }}
                              >
                                {msg.sender}
                              </div>
                              <div className="lk-timestamp text-muted-foreground">{msg.time}</div>
                            </div>
                            <div
                              className={`lk-message-body p-3 rounded-2xl leading-relaxed ${msg.isAi ? 'bg-primary/10 text-foreground rounded-tl-sm' : 'bg-muted text-foreground rounded-tr-sm'}`}
                            >
                              {msg.text}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <form
                        onSubmit={handleSendAiQuery}
                        className="lk-chat-form shrink-0 border-t border-border p-3 mt-auto"
                      >
                        <input
                          type="text"
                          value={aiQueryMsg}
                          onChange={(e) => setAiQueryMsg(e.target.value)}
                          disabled={isAiLoading}
                          placeholder={
                            isAiLoading ? 'Đang suy nghĩ...' : 'Hỏi về agenda, transcript...'
                          }
                          className="lk-form-control lk-chat-form-input w-full"
                        />
                        <button
                          type="submit"
                          disabled={isAiLoading}
                          className="lk-button lk-chat-form-button"
                        >
                          {isAiLoading ? '...' : 'Gửi'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </LiveKitRoom>
        )}
      </main>

      {/* Post-Meeting Dashboard Overlay */}
      {showPostMeeting && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-6xl mx-auto flex flex-col h-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden relative">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Tổng kết cuộc họp</h2>
                  <p className="text-sm text-muted-foreground">Đã kết thúc. Bạn có thể xem lại và đẩy task lên Jira.</p>
                </div>
              </div>
              <button 
                onClick={() => router.push('/meetings')}
                className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
                title="Đóng"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Body: 2 Columns */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Column: Summary */}
              <div className="w-1/2 flex flex-col border-r border-border p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
                  <FileText className="w-5 h-5 text-primary" /> Bản Tóm Tắt (AI)
                </h3>
                
                {meetingSummary ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse border border-border text-sm" {...props} /></div>,
                        th: ({node, ...props}) => <th className="border border-border bg-muted/50 p-2 text-left font-semibold text-foreground" {...props} />,
                        td: ({node, ...props}) => <td className="border border-border p-2" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      }}
                    >
                      {meetingSummary}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-primary text-sm font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" /> AI đang tổng hợp nội dung...
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Action Items */}
              <div className="w-1/2 flex flex-col p-0 overflow-hidden bg-muted/10">
                <div className="p-4 border-b border-border bg-card flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Kanban className="w-5 h-5 text-primary" /> Các Task Đã Nhận Diện
                  </h3>
                  <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {actionItems.length} Tasks
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {actionItems.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      Không tìm thấy Task nào trong cuộc họp này.
                    </div>
                  ) : (
                    actionItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col gap-3"
                      >
                        {editingTaskId === item.id ? (
                          <div className="flex flex-col gap-3">
                            <input
                              type="text"
                              className="w-full text-sm p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm"
                              value={editForm.title}
                              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Tiêu đề task..."
                            />
                            <div className="flex flex-col sm:flex-row gap-3">
                              <select
                                className="flex-1 text-sm p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm"
                                value={editForm.assignee_id}
                                onChange={(e) => setEditForm(prev => ({ ...prev, assignee_id: e.target.value }))}
                              >
                                <option value="">-- Chọn người phụ trách --</option>
                                {meetingMembers.map(m => (
                                  <option key={m.user_id} value={m.user_id}>{m.user_name || m.user_email || 'Người dùng ẩn danh'}</option>
                                ))}
                              </select>
                              <div className="flex-1 relative z-50">
                                <CustomDateTimePicker
                                  value={editForm.deadline}
                                  onChange={(val) => setEditForm(prev => ({ ...prev, deadline: val }))}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => setEditingTaskId(null)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg text-sm font-medium transition-colors"
                              >
                                <X className="w-4 h-4" /> Hủy
                              </button>
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors shadow-sm"
                              >
                                <Check className="w-4 h-4" /> Lưu
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-4">
                              <div className="font-medium text-foreground text-sm">{item.title}</div>
                              <button 
                                onClick={() => handleStartEdit(item)}
                                className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
                                title="Chỉnh sửa Task"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-2">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                <span>{item.assignee_name || 'Chưa phân công'}</span>
                              </div>
                              {item.deadline && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{new Date(item.deadline).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer / Jira Sync Button */}
                <div className="p-4 border-t border-border bg-card flex justify-end">
                  <button
                    onClick={handleOpenJiraWorkspace}
                    disabled={isOpeningJira || actionItems.length === 0}
                    className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white text-sm font-bold flex items-center gap-2 transition-all shadow-md"
                  >
                    {isOpeningJira ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Kanban className="w-4 h-4" />
                    )}
                    Push sang Jira Board
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Invite Members Modal */}
      <InviteMembersModal
        meetingId={meetingId}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </div>
  );
}
