'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { PostMeetingCascadeModal } from '@/components/meetings/PostMeetingCascadeModal';
import { CustomDateTimePicker } from '@/components/ui/date-time-picker';
import { useRoomContext, useConnectionState } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

function SpeechTranslationControl() {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { enabled, setEnabled } = useTranslationStore();

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      // Sync to LiveKit participant attributes
      room.localParticipant
        .setAttributes({
          translation_enabled: enabled ? 'true' : 'false',
          translation_source: 'auto',
        })
        .catch((e) => console.warn('Failed to set attributes', e));
    }
  }, [enabled, room, connectionState]);

  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`lk-button w-10 h-10 shrink-0 relative transition-all duration-200 flex items-center justify-center rounded-xl ${
        enabled
          ? 'bg-primary/20 text-primary border border-primary/50 shadow-sm ring-2 ring-primary/20'
          : 'opacity-70 hover:opacity-100 text-muted-foreground'
      }`}
      title={
        enabled
          ? 'Phụ đề song ngữ (VI ⮂ EN): Đang BẬT - Nhấn để Tắt'
          : 'Phụ đề song ngữ (VI ⮂ EN): Đang TẮT - Nhấn để Bật'
      }
    >
      <Globe className="w-5 h-5" />
      {enabled && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
      )}
    </button>
  );
}

import { useDataChannel } from '@livekit/components-react';

export interface RecordEntry {
  timestamp: string;
  participant_identity: string;
  participant_name?: string;
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
          participant_name: data.participant_name,
          original_text: data.original_text,
          language: data.language || 'vi',
          is_final: data.is_final,
        });

        if (data.is_final && onTranscriptFinalized) {
          onTranscriptFinalized(data.original_text, timeStr);
        }
      } else if (data.type === 'translation_record') {
        onNewRecord({
          timestamp: timeStr,
          participant_identity: data.participant_identity,
          participant_name: data.participant_name,
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
          participant_name: data.participant_name,
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
  latestRecord?: {
    id?: string;
    timestamp: string;
    speaker?: string;
    participant_identity?: string;
    participant_name?: string;
    text?: string;
    original_text?: string;
    translated_text?: string;
    language: string;
    to_language?: string;
    is_final: boolean;
  } | null;
}) {
  const { enabled: subtitlesEnabled } = useTranslationStore();
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
        {subtitlesEnabled && latestRecord && (latestRecord.text || latestRecord.original_text) && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-black/85 backdrop-blur-xl border border-white/20 rounded-2xl p-3.5 shadow-2xl text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-white/70">
                <span
                  className={`w-2 h-2 rounded-full ${
                    latestRecord.is_final ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span className="truncate max-w-[200px]">
                  {latestRecord.speaker ||
                    latestRecord.participant_name ||
                    (latestRecord.participant_identity
                      ? latestRecord.participant_identity.replace('user_', 'User ')
                      : 'Người tham gia')}
                </span>
                {!latestRecord.is_final && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-medium">
                    đang nói...
                  </span>
                )}
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
              <p
                className={`text-sm md:text-base font-semibold text-white tracking-wide leading-snug ${
                  !latestRecord.is_final ? 'opacity-90 italic' : ''
                }`}
              >
                {latestRecord.text || latestRecord.original_text}
                {!latestRecord.is_final && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-primary animate-pulse" />
                )}
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
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'transcript' | 'records' | 'ai'>(
    'records'
  );
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

  // Poll for action items
  useEffect(() => {
    if (!meetingId) return;
    const fetchActionItems = async () => {
      try {
        const [items, transcripts, members] = await Promise.all([
          meetingsApi.getActionItems(meetingId),
          meetingsApi.getTranscripts(meetingId),
          meetingsApi.getMembers(meetingId),
        ]);
        setActionItems(items);
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
  const [isPostMeetingModalOpen, setIsPostMeetingModalOpen] = useState(false);

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

  const handleExitMeeting = useCallback(() => {
    const role = user?.role;
    if (role === 'OWNER' || role === 'ADMIN') {
      router.push('/admin');
    } else if (role === 'MANAGER') {
      router.push('/manager');
    } else {
      router.push('/member?tab=meetings');
    }
  }, [user, router]);

  const getSpeakerDisplayName = useCallback(
    (identity?: string, name?: string) => {
      if (name && !name.startsWith('user_') && !name.startsWith('User-') && !name.startsWith('User ')) {
        return name;
      }
      const cleanId = identity ? identity.replace(/^user_/, '') : '';
      // Match with meeting members
      const member = meetingMembers.find((m) => m.user_id === cleanId || m.id === cleanId);
      if (member?.user_name) return member.user_name;
      // Match with current logged in user
      if (user && (user.id === cleanId || !cleanId)) {
        return user.full_name || participantName;
      }
      if (participantName && !participantName.startsWith('User-')) {
        return participantName;
      }
      return name || (cleanId ? `User ${cleanId.slice(0, 6)}` : 'Người tham gia');
    },
    [meetingMembers, user, participantName]
  );

  const displayedRecords = useMemo(() => {
    const merged: Array<{
      id: string;
      timestamp: string;
      speaker: string;
      text: string;
      translated_text?: string;
      language: string;
      to_language?: string;
      is_final: boolean;
    }> = [];

    // 1. Add DB transcripts first (past session history)
    dbTranscripts.forEach((dt, idx) => {
      merged.push({
        id: `db-${dt.id || idx}`,
        timestamp: dt.start_time || '',
        speaker: dt.speaker_name || getSpeakerDisplayName(dt.user_id),
        text: dt.content,
        language: 'VI',
        is_final: true,
      });
    });

    // 2. Merge recordsHistory from realtime LiveKit DataChannel
    recordsHistory.forEach((rh, idx) => {
      const rhText = rh.original_text.trim();
      if (!rhText) return;

      const speakerName = getSpeakerDisplayName(rh.participant_identity, rh.participant_name);

      // Check if this record already exists in merged (from DB transcripts)
      const existingIdx = merged.findIndex((m) => {
        const mText = m.text.trim();
        return (
          mText === rhText ||
          (mText.length > 6 && rhText.length > 6 && (mText.includes(rhText) || rhText.includes(mText)))
        );
      });

      if (existingIdx !== -1) {
        // Update the existing record with translation, correct speaker name, and language
        merged[existingIdx] = {
          ...merged[existingIdx],
          speaker: speakerName,
          translated_text: rh.translated_text || merged[existingIdx].translated_text,
          language: (rh.language || 'vi').toUpperCase(),
          to_language: (rh.to_language || 'en').toUpperCase(),
          is_final: rh.is_final,
        };
      } else {
        merged.push({
          id: `rt-${idx}-${rh.timestamp}`,
          timestamp: rh.timestamp,
          speaker: speakerName,
          text: rh.original_text,
          translated_text: rh.translated_text,
          language: (rh.language || 'vi').toUpperCase(),
          to_language: (rh.to_language || 'en').toUpperCase(),
          is_final: rh.is_final,
        });
      }
    });

    return merged;
  }, [dbTranscripts, recordsHistory, getSpeakerDisplayName]);

  // Auto-scroll Records view when new records arrive
  useEffect(() => {
    if (displayedRecords.length > 0) {
      const timer = setTimeout(
        () => transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
        100
      );
      return () => clearTimeout(timer);
    }
  }, [displayedRecords.length]);

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
        <button
          onClick={handleExitMeeting}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-lg shadow-primary/25 transition-all cursor-pointer"
        >
          Quay lại bàn làm việc
        </button>
      </div>
    );
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  if (!hasJoined) {
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPostMeetingModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            title="Kích hoạt AI tổng kết phiên họp và phân bổ action items cho Khối / Member"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tổng Kết & Phân Bổ Task (MoM)</span>
          </button>
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
            audio={true}
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
                            participant_name: r.participant_name || newArr[i].participant_name,
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
                          participant_name: r.participant_name || newArr[i].participant_name,
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
                  latestRecord={displayedRecords[displayedRecords.length - 1] || null}
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
                      {displayedRecords.length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm mt-10">
                          Chưa có bản ghi nào. Hãy bắt đầu nói!
                        </div>
                      ) : (
                        displayedRecords.map((t) => (
                          <div
                            key={t.id}
                            className={`bg-muted p-3 rounded-lg text-sm transition-opacity duration-200 border border-primary/20 ${!t.is_final ? 'opacity-70' : 'opacity-100'}`}
                          >
                            <div className="font-semibold text-primary text-xs mb-1 flex items-center justify-between">
                              <span>
                                [{t.timestamp}] {t.speaker}{' '}
                                {t.is_final ? '' : '(đang nói...)'}
                              </span>
                              <span className="opacity-70 font-semibold text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                                {t.language}
                              </span>
                            </div>
                            <div className="text-foreground font-medium">{t.text}</div>
                            {t.translated_text && (
                              <div className="mt-2 pt-2 border-t border-border/50 flex items-start gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-md">
                                <Globe className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
                                <div className="flex-1">
                                  <span className="text-[10px] uppercase font-bold text-blue-500 mr-1.5 tracking-wider">
                                    [{t.to_language || 'EN'}]
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
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                          {actionItems.length}
                        </span>
                      </div>

                      <button
                        onClick={handleOpenJiraWorkspace}
                        disabled={isOpeningJira}
                        className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm"
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
                        <div className="text-center py-6 text-muted-foreground text-xs">
                          Chưa có Meeting Notes nào được AI trích xuất.
                        </div>
                      ) : (
                        actionItems.map((item: ActionItemResponse) => (
                          <div
                            key={item.id}
                            className="text-xs p-2.5 rounded-lg bg-card border border-border"
                          >
                            {editingTaskId === item.id ? (
                              <div className="flex flex-col gap-3">
                                <input
                                  type="text"
                                  className="w-full text-sm p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm"
                                  value={editForm.title}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, title: e.target.value }))
                                  }
                                  placeholder="Tiêu đề task..."
                                />
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                  <select
                                    className="flex-1 text-xs p-2 bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground shadow-sm"
                                    value={editForm.assignee_id}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        assignee_id: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">-- Chọn người phụ trách --</option>
                                    {meetingMembers.map((m) => (
                                      <option key={m.user_id} value={m.user_id}>
                                        {m.user_name || m.user_email || 'Người dùng ẩn danh'}
                                      </option>
                                    ))}
                                  </select>
                                  <CustomDateTimePicker
                                    value={editForm.deadline}
                                    onChange={(val) =>
                                      setEditForm((prev) => ({ ...prev, deadline: val }))
                                    }
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
                              <div className="flex flex-col gap-2">
                                <div className="flex items-start gap-2">
                                  <div className="mt-1.5 shrink-0">
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        item.status === 'CONFIRMED' ? 'bg-success' : 'bg-warning'
                                      }`}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-bold text-success bg-success/10 px-1.5 py-0.5 rounded mr-1.5">
                                      {item.title}
                                    </span>
                                    <span className="text-foreground leading-relaxed">
                                      {item.description || ''}
                                    </span>
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
                                      {(item as any).deadline || item.due_date
                                        ? new Date(
                                            (item as any).deadline || item.due_date
                                          ).toLocaleString('vi-VN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                          })
                                        : 'Không có hạn'}
                                    </span>
                                  </div>
                                  <div
                                    onClick={() => handleStartEdit(item)}
                                    className="w-4 h-4 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-muted-foreground hover:text-primary"
                                    title="Chỉnh sửa task"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
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

      {/* Post-Meeting Summary & Action Item Cascade Modal */}
      <PostMeetingCascadeModal
        isOpen={isPostMeetingModalOpen}
        onClose={() => setIsPostMeetingModalOpen(false)}
        meetingId={meetingId}
        meetingTitle={meeting?.title || 'Cuộc họp'}
        userRole={user?.role}
        initialActionItems={actionItems}
        onComplete={(target) => router.push(target)}
      />
    </div>
  );
}
