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
  Quote,
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
  AlertTriangle,
  UploadCloud,
  Trash2,
  Paperclip,
  List,
  Eye,
  EyeOff,
  Bold,
  Italic,
  Underline,
  Type,
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
  knowledgeApi,
  type Meeting,
  type RagSource,
  type ActionItemResponse,
  type TranscriptResponse,
  type MeetingMember,
  type KnowledgeDocument,
  type Topic,
  topicsApi,
  ApiRequestError,
} from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useVADController } from '@/hooks/useVADController';
import type { TranslationStream, TranscriptHistoryEntry } from '@/hooks/useVADController';
import { useTranslationAudioMuting, useTranslationStore } from '@/hooks/useTranslationAudioMuting';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { InviteMembersModal } from '@/components/meetings/InviteMembersModal';
import { EndMeetingModal } from '@/components/meetings/EndMeetingModal';
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
  translated_text?: string;
  language: string;
  to_language?: string;
  is_final: boolean;
}

function RecordsListener({
  onNewRecord,
  onTranscriptFinalized,
}: {
  onNewRecord: (r: RecordEntry) => void;
  onTranscriptFinalized?: (text: string, timestamp: string) => void;
}) {
  useDataChannel('records', (msg) => {
    try {
      const payload = msg.payload || msg; // Handle both v1 and v2 formats
      const text = new TextDecoder().decode(payload as Uint8Array);
      console.log('[DataChannel records] Received:', text);
      const data = JSON.parse(text);
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (data.type === 'original_transcript') {
        onNewRecord({
          timestamp: timeStr,
          participant_identity: data.participant_identity,
          original_text: data.original_text,
          language: data.language || 'vi',
          is_final: data.is_final,
        });

        if (data.is_final && !data.is_mock && onTranscriptFinalized) {
          onTranscriptFinalized(data.original_text, timeStr);
        }
      } else if (data.type === 'translation_record') {
        onNewRecord({
          timestamp: timeStr,
          participant_identity: data.participant_identity,
          original_text: data.original_text,
          translated_text: data.translated_text,
          language: data.from_language || 'vi',
          to_language: data.to_language || 'en',
          is_final: true,
        });
      }
    } catch (e) {
      console.warn('Failed to parse record data', e);
    }
  });

  useDataChannel('translations', (msg) => {
    try {
      const payload = msg.payload || msg;
      const text = new TextDecoder().decode(payload as Uint8Array);
      console.log('[DataChannel translations] Received:', text);
      const data = JSON.parse(text);
      if (data.type === 'translation' && data.original_text) {
        const timeStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        onNewRecord({
          timestamp: timeStr,
          participant_identity: data.participant_identity,
          original_text: data.original_text,
          translated_text: data.translated_text,
          language: data.from_language || 'vi',
          to_language: data.to_language || 'en',
          is_final: true,
        });
      }
    } catch (e) {
      console.warn('Failed to parse translation data', e);
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
  latestRecord,
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
  latestRecord?: RecordEntry | null;
}) {
  const { streamData, interimText, isListening, isConnected, transcriptHistory } =
    useVADController(participantName);

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
      <div className="relative flex-1 min-h-0 w-full rounded-2xl overflow-hidden bg-[#1f1f1f]">
        <LiveKitTileErrorBoundary>
          <GridLayout tracks={tracks} style={{ height: '100%', width: '100%', gap: '1rem' }}>
            <ParticipantTile />
          </GridLayout>
          <RoomAudioRenderer />
        </LiveKitTileErrorBoundary>

        {/* Floating Live Subtitle Overlay */}
        {latestRecord && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40 pointer-events-none transition-all duration-300">
            <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-3.5 shadow-2xl text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-white/70">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{latestRecord.participant_identity.replace('user_', 'User ')}</span>
                <span className="text-white/40">•</span>
                <span className="uppercase text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">
                  {latestRecord.language || 'VI'}
                </span>
                {latestRecord.translated_text && (
                  <>
                    <span className="text-white/40">➔</span>
                    <span className="uppercase text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      {latestRecord.to_language?.toUpperCase() || 'EN'}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm md:text-base font-semibold text-white tracking-wide leading-snug">
                {latestRecord.original_text}
              </p>
              {latestRecord.translated_text && (
                <div className="pt-1.5 mt-1 border-t border-white/10 flex items-center justify-center gap-1.5 text-xs md:text-sm text-cyan-300 font-medium">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span>{latestRecord.translated_text}</span>
                </div>
              )}
            </div>
          </div>
        )}
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
          <DisconnectButton className="lk-button lk-disconnect-button" title="Rời phòng">
            <PhoneOff className="w-5 h-5" />
          </DisconnectButton>
        </div>
      </div>
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
  const [apiError, setApiError] = useState<{ message: string; status?: number } | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'transcript' | 'records' | 'ai' | 'agenda'>(
    'agenda'
  );

  // Agendas / Knowledge Documents
  const [topics, setTopics] = useState<Topic[]>([]);
  const [agendas, setAgendas] = useState<KnowledgeDocument[]>([]);
  const [agendaContents, setAgendaContents] = useState<Record<string, string>>({});
  const [isUploadingAgenda, setIsUploadingAgenda] = useState(false);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  
  // Evidence Link state
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  const [returnToAgendaState, setReturnToAgendaState] = useState<{ active: boolean; expandedTopicId: string | null }>({ active: false, expandedTopicId: null });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [recordsHistory, setRecordsHistory] = useState<RecordEntry[]>([]);

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

  // Action Items and Transcripts state
  const [actionItems, setActionItems] = useState<ActionItemResponse[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [dbTranscripts, setDbTranscripts] = useState<TranscriptResponse[]>([]);
  const [meetingMembers, setMeetingMembers] = useState<MeetingMember[]>([]);

  // Edit Task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    assignee_id: string;
    deadline: string;
  }>({
    title: '',
    assignee_id: '',
    deadline: '',
  });

  // Edit Decision state
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [editDecisionForm, setEditDecisionForm] = useState<{
    description: string;
    proposer_id: string;
    status: string;
  }>({
    description: '',
    proposer_id: '',
    status: 'PROPOSED',
  });

  // Poll for action items
  useEffect(() => {
    if (!meetingId) return;
    const fetchActionItems = async () => {
      try {
        const [items, decs, transcripts, members, m, meetingTopics] = await Promise.all([
          meetingsApi.getActionItems(meetingId),
          meetingsApi.getDecisions(meetingId),
          meetingsApi.getTranscripts(meetingId),
          meetingsApi.getMembers(meetingId),
          meetingsApi.get(meetingId),
          topicsApi.list(meetingId),
        ]);
        setActionItems(items);
        setDecisions(decs);
        setDbTranscripts(transcripts);
        setMeetingMembers(members);
        setTopics(meetingTopics);

      } catch (err) {
        console.error('Failed to fetch meeting content:', err);
      }
    };

    fetchActionItems();
    const interval = setInterval(fetchActionItems, 5000);
    return () => clearInterval(interval);
  }, [meetingId]);

  // Handle viewing evidence
  const handleViewEvidence = (quote: string | null | undefined) => {
    if (!quote) return;
    const targetQuote = quote.toLowerCase().trim();
    // Find the record that contains this quote
    const foundRecord = dbTranscripts.find(r => r.content?.toLowerCase().includes(targetQuote));
    if (foundRecord) {
      setHighlightedRecordId(foundRecord.id);
      setReturnToAgendaState({ active: true, expandedTopicId });
      setActiveRightTab('records');
    } else {
      console.warn('Quote not found in records:', quote);
    }
  };

  useEffect(() => {
    if (highlightedRecordId && activeRightTab === 'records') {
      setTimeout(() => {
        const el = document.getElementById(`record-${highlightedRecordId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300); // small delay to allow DOM to render records tab

      const timeout = setTimeout(() => {
        setHighlightedRecordId(null);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [highlightedRecordId, activeRightTab]);

  const handleSaveEdit = async (taskId: string) => {
    if (!meetingId) return;
    try {
      const payload: any = { title: editForm.title };
      if (editForm.assignee_id) payload.assignee_id = editForm.assignee_id;
      if (editForm.deadline) payload.deadline = new Date(editForm.deadline).toISOString();

      await meetingsApi.updateFollowUpTask(meetingId, taskId, payload);
      setEditingTaskId(null);
      // Cập nhật local state ngay lập tức cho mượt
      setActionItems((prev) =>
        prev.map((item) => {
          if (item.id === taskId) {
            const assigneeName =
              meetingMembers.find((m) => m.user_id === editForm.assignee_id)?.user_name ||
              item.assignee_name;
            return {
              ...item,
              title: editForm.title,
              assignee_id: editForm.assignee_id,
              assignee_name: assigneeName,
              deadline: payload.deadline,
            } as any;
          }
          return item;
        })
      );
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

  const handleSaveDecisionEdit = async (decisionId: string) => {
    if (!meetingId) return;
    try {
      const payload: any = { 
        description: editDecisionForm.description,
        status: editDecisionForm.status 
      };
      if (editDecisionForm.proposer_id) payload.proposer_id = editDecisionForm.proposer_id;

      await meetingsApi.updateDecision(meetingId, decisionId, payload);
      setEditingDecisionId(null);
      // Cập nhật local state ngay lập tức cho mượt
      setDecisions((prev) =>
        prev.map((item) => {
          if (item.id === decisionId) {
            const proposerName =
              meetingMembers.find((m) => m.user_id === editDecisionForm.proposer_id)?.user_name ||
              item.proposer_name;
            return {
              ...item,
              description: editDecisionForm.description,
              proposer_id: editDecisionForm.proposer_id,
              proposer_name: proposerName,
              status: editDecisionForm.status,
            };
          }
          return item;
        })
      );
    } catch (err) {
      console.error('Failed to update decision:', err);
    }
  };

  const handleNextTopic = async () => {
    if (!meetingId) return;
    try {
      await topicsApi.next(meetingId);
      const res = await topicsApi.list(meetingId);
      const newTopics = res || [];
      setTopics(newTopics);
      
      // Auto-expand IN_PROGRESS topic if none is expanded
      const inProgressTopic = newTopics.find((t: any) => t.status === 'IN_PROGRESS');
      if (inProgressTopic && !expandedTopicId) {
        setExpandedTopicId(inProgressTopic.id);
      }
    } catch (err) {
      console.error('Failed to move to next topic:', err);
    }
  };

  const handleStartDecisionEdit = (item: any) => {
    setEditingDecisionId(item.id);
    setEditDecisionForm({
      description: item.description || '',
      proposer_id: item.proposer_id || '',
      status: item.status || 'PROPOSED',
    });
  };

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
      const role = user?.role;
      if (role === 'OWNER' || role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'MANAGER') {
        router.push('/manager');
      } else {
        router.push('/member?tab=jira');
      }
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
  const [isEndMeetingModalOpen, setIsEndMeetingModalOpen] = useState(false);

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

  const handleLeaveRoomDirectly = useCallback(() => {
    const role = user?.role;
    if (role === 'OWNER' || role === 'ADMIN') {
      router.push('/admin');
    } else if (role === 'MANAGER') {
      router.push('/manager');
    } else {
      router.push('/member?tab=meetings');
    }
  }, [user, router]);

  const handleExitMeeting = useCallback(() => {
    const isHost = meetingMembers.some(m => m.user_id === user?.id && m.role === 'HOST');
    if (isHost) {
      setIsEndMeetingModalOpen(true);
    } else {
      handleLeaveRoomDirectly();
    }
  }, [meetingMembers, user, handleLeaveRoomDirectly]);

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
          if (err instanceof ApiRequestError) {
            setApiError({ message: err.message, status: err.status });
          }
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [meetingId]);

  // Load Agendas
  useEffect(() => {
    if (meetingId) {
      knowledgeApi.listDocuments(meetingId).then((docs) => {
        setAgendas(docs);
        docs.forEach(doc => {
          knowledgeApi.getDocumentContent(doc.id).then(res => {
            setAgendaContents(prev => ({...prev, [doc.id]: res.text}));
          }).catch(console.error);
        });
      }).catch(console.error);
    }
  }, [meetingId]);

  // Upload Agenda Logic
  const handleUploadAgenda = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !meetingId) return;
    setIsUploadingAgenda(true);
    try {
      const doc = await knowledgeApi.uploadDocument(meetingId, file);
      setAgendas((prev) => [...prev, doc]);
      // Auto fetch content for new document
      const res = await knowledgeApi.getDocumentContent(doc.id);
      setAgendaContents(prev => ({...prev, [doc.id]: res.text}));
    } catch (err) {
      console.error('Failed to upload agenda:', err);
    } finally {
      setIsUploadingAgenda(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteAgenda = async (docId: string) => {
    try {
      await knowledgeApi.deleteDocument(docId);
      setAgendas((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('Failed to delete agenda:', err);
    }
  };

  // Join Meeting Logic
  const handleJoinMeeting = async () => {
    if (!meeting || !participantName) return;
    setIsJoining(true);
    setLiveKitError(false);
    setApiError(null);
    try {
      const data = await meetingsApi.getToken(meeting.id, participantName, selectedLanguage);
      if (data?.token) {
        setToken(data.token);
        setHasJoined(true);
      }
    } catch (err) {
      console.error('Failed to get token:', err);
      if (err instanceof ApiRequestError) {
        setApiError({ message: err.message, status: err.status });
      } else {
        setLiveKitError(true);
      }
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

  if (apiError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4 p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-2">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-destructive">
          {apiError.status === 403 ? 'Từ chối truy cập' : 'Đã xảy ra lỗi'}
        </h1>
        <p className="text-muted-foreground text-sm max-w-md">
          {apiError.message}
        </p>
        <button
          onClick={handleExitMeeting}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-lg shadow-primary/25 transition-all cursor-pointer"
        >
          Quay lại danh sách
        </button>
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
        <button
          onClick={handleExitMeeting}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-lg shadow-primary/25 transition-all cursor-pointer"
        >
          Quay lại bàn làm việc
        </button>
      </div>
    );
  }

  if (meeting.status === 'COMPLETED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4 p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-2">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-destructive">
          Cuộc họp đã kết thúc
        </h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Bạn không thể tham gia lại cuộc họp này.
        </p>
        <button
          onClick={handleExitMeeting}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-lg shadow-primary/25 transition-all cursor-pointer"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  if (!hasJoined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 mx-auto">
            <Video className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-center">{meeting.title}</h1>
          <p className="text-muted-foreground text-sm text-center">
            Vui lòng chọn ngôn ngữ bạn sẽ sử dụng để nói trong cuộc họp này. Hệ thống sẽ dùng ngôn ngữ
            này để nhận diện và hiển thị phụ đề.
          </p>

          <div className="flex flex-col gap-2 w-full mt-2">
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
            className="mt-4 px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all w-full flex items-center justify-center gap-2"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tham gia...
              </>
            ) : (
              'Vào phòng họp'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background text-foreground flex flex-col overflow-hidden select-none">
      {/* Top Header */}
      <header className="h-16 px-6 bg-primary flex items-center justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={handleExitMeeting}
            className="p-2 rounded-xl bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-all cursor-pointer"
            title="Rời phòng họp & Về bàn làm việc"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

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
              handleExitMeeting();
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
                    // If this is a translation, merge into existing record
                    if (r.translated_text) {
                      for (let i = newArr.length - 1; i >= 0; i--) {
                        if (
                          newArr[i].participant_identity === r.participant_identity &&
                          (newArr[i].original_text === r.original_text ||
                            !newArr[i].translated_text)
                        ) {
                          newArr[i] = {
                            ...newArr[i],
                            translated_text: r.translated_text,
                            to_language: r.to_language,
                          };
                          return newArr;
                        }
                      }
                    }

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
                          translated_text: r.translated_text || newArr[i].translated_text,
                          is_final: r.is_final,
                        };
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      newArr.push(r);
                    }
                    return newArr;
                  });
                }}
              />
              <div className="flex-1 relative w-full h-full min-h-0 min-w-0">
                <LiveKitContent
                  onVADUpdate={handleVADUpdate}
                  participantName={participantName}
                  onInviteClick={() => setInviteModalOpen(true)}
                  latestRecord={recordsHistory[recordsHistory.length - 1] || null}
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
                    onClick={() => setActiveRightTab('ai')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeRightTab === 'ai'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI</span>
                  </button>
                  <button
                    onClick={() => setActiveRightTab('agenda')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeRightTab === 'agenda'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Agenda</span>
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
                          id={`record-${t.id}`}
                          className={`p-3 rounded-lg text-sm transition-all duration-1000 border ${
                            highlightedRecordId === t.id
                              ? 'bg-primary/20 ring-1 ring-primary border-primary'
                              : 'bg-muted border-primary/20 opacity-100'
                          }`}
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
                            <div className="text-foreground font-medium">{t.original_text}</div>
                            {t.translated_text && (
                              <div className="mt-2 pt-2 border-t border-border/50 flex items-start gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-md">
                                <Globe className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
                                <div className="flex-1">
                                  <span className="text-[10px] uppercase font-bold text-blue-500 mr-1.5 tracking-wider">
                                    [{t.to_language?.toUpperCase() || 'EN'}]
                                  </span>
                                  <span>{t.translated_text}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      <div ref={transcriptEndRef} />
                    </div>
                    {/* Floating Back Button */}
                    {returnToAgendaState.active && (
                      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <button 
                          onClick={() => {
                            setActiveRightTab('agenda');
                            if (returnToAgendaState.expandedTopicId) {
                              setExpandedTopicId(returnToAgendaState.expandedTopicId);
                            }
                            setReturnToAgendaState({ active: false, expandedTopicId: null });
                          }}
                          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all hover:-translate-y-0.5 border border-primary/20"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Trở về Task/Decision
                        </button>
                      </div>
                    )}
                  </div>



                  <div
                    className={`flex-1 flex-col bg-background ${activeRightTab === 'ai' ? 'flex' : 'hidden'}`}
                  >
                    <div className="flex flex-col w-full h-full">
                      <ul className="lk-chat-messages flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        <div className="flex-1" />
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

                  <div
                    className={`flex-1 flex-col overflow-hidden bg-background ${activeRightTab === 'agenda' ? 'flex' : 'hidden'}`}
                  >
                    {/* Topics Section */}
                    <div className="p-3 border-b border-border bg-card/80 flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <List className="w-3.5 h-3.5" />
                        Nội dung cuộc họp
                      </span>
                      {user?.role !== 'MEMBER' && topics.some(t => t.status !== 'COMPLETED') && (
                        <button
                          onClick={handleNextTopic}
                          className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 transition-colors"
                        >
                          {topics.some(t => t.status === 'IN_PROGRESS') ? 'Next Topic' : 'Bắt đầu họp'}
                        </button>
                      )}
                    </div>
                    <div className="p-3 border-b border-border space-y-2 overflow-y-auto max-h-[60%] flex-1">
                      {topics.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-xs italic">
                          Chưa có chủ đề nào.
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {topics.map((t) => {
                            const topicDecisions = decisions.filter(d => d.topic_id === t.id);
                            const topicTasks = actionItems.filter(task => task.topic_id === t.id);
                            const isExpanded = expandedTopicId === t.id;

                            return (
                              <li key={t.id} className="border border-border/50 rounded-md overflow-hidden bg-card transition-all">
                                {/* Accordion Header */}
                                <button 
                                  onClick={() => setExpandedTopicId(isExpanded ? null : t.id)} 
                                  className="w-full text-left p-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                                    <span className={`shrink-0 text-[10px] uppercase font-bold tracking-wider ${t.status === 'COMPLETED' ? 'text-muted-foreground line-through' : t.status === 'IN_PROGRESS' ? 'text-primary' : 'text-muted-foreground'}`}>
                                      [{t.status === 'COMPLETED' ? 'Đã xong' : t.status === 'IN_PROGRESS' ? 'Đang tiến hành' : 'Chưa tiến hành'}]
                                    </span>
                                    <span className={`truncate font-medium text-xs ${t.status === 'IN_PROGRESS' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                                      {t.title}
                                    </span>
                                  </div>
                                  <div className="shrink-0 text-[10px] text-muted-foreground font-medium">
                                    ({topicDecisions.length} Quyết định, {topicTasks.length} Task)
                                  </div>
                                </button>
                                
                                {/* Accordion Body */}
                                {isExpanded && (
                                  <div className="p-3 border-t border-border/30 bg-background space-y-4">
                                    {/* Decisions */}
                                    <div>
                                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Decisions</div>
                                      {topicDecisions.length === 0 ? (
                                        <div className="text-[11px] italic text-muted-foreground/70">Không có quyết định nào.</div>
                                      ) : (
                                        <ul className="space-y-2">
                                          {topicDecisions.map((d: any) => (
                                            <li key={d.id} className="text-[11px] text-foreground group">
                                              {editingDecisionId === d.id ? (
                                                <div className="flex flex-col gap-2 mt-1">
                                                  <input
                                                    type="text"
                                                    className="w-full p-1.5 bg-muted/50 border border-border rounded focus:outline-none focus:border-primary"
                                                    value={editDecisionForm.description}
                                                    onChange={(e) => setEditDecisionForm((prev) => ({ ...prev, description: e.target.value }))}
                                                    autoFocus
                                                  />
                                                  <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingDecisionId(null)} className="text-[10px] text-muted-foreground hover:text-foreground">Hủy</button>
                                                    <button onClick={() => handleSaveDecisionEdit(d.id)} className="text-[10px] font-bold text-primary">Lưu</button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex items-start gap-1.5 leading-relaxed">
                                                    <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
                                                    <span>{d.description}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    {d.evidence_sentence && (
                                                      <button onClick={() => handleViewEvidence(d.evidence_sentence)} title="Xem trích dẫn" className="text-muted-foreground hover:text-primary">
                                                        <Quote className="w-3 h-3" />
                                                      </button>
                                                    )}
                                                    <button onClick={() => handleStartDecisionEdit(d)} className="text-[10px] text-primary">Sửa</button>
                                                  </div>
                                                </div>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                    
                                    {/* Action Items */}
                                    <div>
                                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Action Items</div>
                                      {topicTasks.length === 0 ? (
                                        <div className="text-[11px] italic text-muted-foreground/70">Không có công việc nào.</div>
                                      ) : (
                                        <ul className="space-y-2">
                                          {topicTasks.map((task: any) => (
                                            <li key={task.id} className="text-[11px] text-foreground group">
                                              {editingTaskId === task.id ? (
                                                <div className="flex flex-col gap-3 mt-2 mb-3 bg-muted/20 p-2.5 rounded-lg border border-border/50">
                                                  <input
                                                    type="text"
                                                    className="w-full text-xs p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm"
                                                    value={editForm.title}
                                                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                                                    placeholder="Tên task..."
                                                    autoFocus
                                                  />
                                                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                                    <div className="shrink-0 w-[170px]">
                                                      <select
                                                        className="w-full text-[11px] p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm truncate"
                                                        value={editForm.assignee_id}
                                                        title={editForm.assignee_id || "Chọn người phụ trách"}
                                                        onChange={(e) =>
                                                          setEditForm((prev) => ({
                                                            ...prev,
                                                            assignee_id: e.target.value,
                                                          }))
                                                        }
                                                      >
                                                        <option value="">-- Chọn Assignee --</option>
                                                        {meetingMembers.map((m) => (
                                                          <option key={m.user_id} value={m.user_id}>
                                                            {m.user_name || m.user_email || 'Ẩn danh'}
                                                          </option>
                                                        ))}
                                                      </select>
                                                    </div>
                                                    <CustomDateTimePicker
                                                      value={editForm.deadline}
                                                      onChange={(val) =>
                                                        setEditForm((prev) => ({ ...prev, deadline: val }))
                                                      }
                                                    />
                                                  </div>
                                                  <div className="flex justify-end gap-2 mt-1">
                                                    <button onClick={() => setEditingTaskId(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-md text-[10px] font-medium transition-colors">
                                                      <X className="w-3 h-3" /> Hủy
                                                    </button>
                                                    <button onClick={() => handleSaveEdit(task.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-[10px] font-medium transition-colors shadow-sm">
                                                      <Check className="w-3 h-3" /> Lưu
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex items-start gap-1.5 leading-relaxed">
                                                    <span className="text-primary shrink-0 mt-0.5"><Check className="w-3 h-3" /></span>
                                                    <div className="flex flex-col">
                                                      <span>{task.title}</span>
                                                      <div className="flex items-center gap-2 mt-0.5 text-muted-foreground/80 text-[10px]">
                                                        {task.assignee_name && (
                                                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assignee_name}</span>
                                                        )}
                                                        {task.deadline && (
                                                          <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(task.deadline).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                                                          </>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    {task.evidence_quote && (
                                                      <button onClick={() => handleViewEvidence(task.evidence_quote)} title="Xem trích dẫn" className="text-muted-foreground hover:text-primary">
                                                        <Quote className="w-3.5 h-3.5" />
                                                      </button>
                                                    )}
                                                    <button onClick={() => handleStartEdit(task)} className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors flex items-center gap-1">
                                                      <Pencil className="w-3 h-3" /> Sửa
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                    
                                    {/* Loading State for IN_PROGRESS */}
                                    {t.status === 'IN_PROGRESS' && (
                                      <div className="text-[10px] italic text-muted-foreground/50 mt-4 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse"></span>
                                        AI đang theo dõi và tự động trích xuất...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    {/* Documents Section */}
                    <div className="p-3 border-b border-border bg-card/80 flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" />
                        Tài liệu cuộc họp
                      </span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                        disabled={isUploadingAgenda}
                      >
                        {isUploadingAgenda ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                        <span>Tải lên</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleUploadAgenda}
                        accept=".pdf,.doc,.docx,.txt"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {agendas.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-xs italic">
                          Chưa có tài liệu nào.
                        </div>
                      ) : (
                        agendas.map((doc) => (
                          <div
                            key={doc.id}
                            className="text-xs p-2.5 rounded-lg bg-card border border-border flex flex-col gap-2 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-foreground flex items-center gap-1.5 truncate pr-2">
                                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="truncate">{doc.filename}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setViewingDocId(viewingDocId === doc.id ? null : doc.id)}
                                  className={`p-1.5 rounded transition-colors shrink-0 ${viewingDocId === doc.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                  title={viewingDocId === doc.id ? "Thu gọn" : "Xem nội dung"}
                                >
                                  {viewingDocId === doc.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteAgenda(doc.id)}
                                  className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors shrink-0"
                                  title="Xóa tài liệu"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium mt-1">
                              <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                              <span className="text-border">|</span>
                              <span>Trạng thái: {doc.vector_status}</span>
                            </div>
                            
                            {/* Document Content Viewer - Toggled by Eye icon */}
                            {viewingDocId === doc.id && (
                              <div className="mt-2 flex flex-col border border-border rounded-md overflow-hidden shadow-sm">
                                {/* Formatting Toolbar */}
                                <div className="flex items-center gap-1 bg-muted/50 p-1.5 border-b border-border">
                                  <button onClick={() => document.execCommand('bold')} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground" title="Bôi đậm (Bold)">
                                    <Bold className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => document.execCommand('italic')} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground" title="In nghiêng (Italic)">
                                    <Italic className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => document.execCommand('underline')} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground" title="Gạch chân (Underline)">
                                    <Underline className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="w-px h-3.5 bg-border mx-1"></div>
                                  <button onClick={() => document.execCommand('hiliteColor', false, 'yellow')} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground" title="Highlight">
                                    <div className="w-3.5 h-3.5 bg-yellow-300 border border-yellow-400 rounded-sm"></div>
                                  </button>
                                  <button onClick={() => document.execCommand('fontSize', false, '5')} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground flex items-center gap-0.5" title="Chữ to">
                                    <Type className="w-3.5 h-3.5" />+
                                  </button>
                                  <button onClick={() => document.execCommand('fontSize', false, '2')} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground flex items-center gap-0.5" title="Chữ nhỏ">
                                    <Type className="w-3 h-3" />-
                                  </button>
                                </div>
                                
                                {/* Editable Content Area */}
                                <div 
                                  className="p-3 bg-background text-foreground text-xs leading-relaxed max-h-64 overflow-y-auto focus:outline-none"
                                  contentEditable={true}
                                  suppressContentEditableWarning={true}
                                  dangerouslySetInnerHTML={{
                                    __html: agendaContents[doc.id] === undefined 
                                      ? '<div class="flex justify-center"><span class="animate-spin text-primary">...</span></div>'
                                      : (agendaContents[doc.id] || '<span class="italic text-muted-foreground">Tài liệu trống.</span>')
                                  }}
                                  onBlur={(e) => {
                                    // Optionally save it back to state so it persists if they close and reopen
                                    setAgendaContents(prev => ({...prev, [doc.id]: e.currentTarget.innerHTML}));
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </LiveKitRoom>
        )}
      </main>

      {/* Invite Members Modal */}
      <InviteMembersModal
        meetingId={meetingId}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      {/* End Meeting Modal */}
      <EndMeetingModal
        isOpen={isEndMeetingModalOpen}
        onClose={() => setIsEndMeetingModalOpen(false)}
        onLeave={handleLeaveRoomDirectly}
        members={meetingMembers}
        onEndMeeting={async () => {
          const res = await meetingsApi.endMeeting(meetingId);
          return {
            summary: res.summary?.content || null,
            tasks: res.follow_up_tasks || [],
            meetingId: meetingId
          };
        }}
      />
    </div>
  );
}
