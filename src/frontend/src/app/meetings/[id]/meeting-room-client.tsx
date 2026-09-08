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
  Pin,
  PinOff,
  PanelRight,
  Languages,
  CheckSquare,
  Copy,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Eye,
  Upload,
  Save,
  Trash2,
} from 'lucide-react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
  useLocalParticipant,
  useConnectionState,
  useTrackVolume,
  TrackToggle,
  DisconnectButton,
  Chat,
  useChat,
  useRoomContext,
  useDataChannel,
} from '@livekit/components-react';
import { Track, ConnectionState, RoomEvent } from 'livekit-client';
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
import { useWebSpeech } from '@/hooks/useWebSpeech';
import { MeetingPreJoinLobby, BackgroundOption } from '@/components/meetings/MeetingPreJoinLobby';
import Logo from '@/components/Logo';

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
          client_stt: 'true',
        })
        .catch((e) => console.warn('Failed to set attributes', e));
    }
  }, [enabled, room, connectionState]);

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      className={`w-10 h-10 shrink-0 relative transition-all duration-200 flex items-center justify-center rounded-xl cursor-pointer ${
        enabled
          ? 'bg-blue-50 text-blue-600 border border-blue-300 shadow-xs ring-2 ring-blue-100'
          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200'
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

function LanguageToggleControl({
  selectedLanguage,
  onToggle,
}: {
  selectedLanguage: string;
  onToggle: (newLang: string) => void;
}) {
  const isVi = selectedLanguage === 'vi';
  const nextLang = isVi ? 'en' : 'vi';

  return (
    <button
      type="button"
      onClick={() => onToggle(nextLang)}
      className="h-10 px-3 shrink-0 relative transition-all duration-150 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold shadow-2xs select-none cursor-pointer"
      title={
        isVi
          ? 'Đang nhận diện Tiếng Việt (Dịch ➔ Anh) — Bấm để đổi sang nói Tiếng Anh (Dịch ➔ Việt)'
          : 'Listening in English (Translate ➔ Vietnamese) — Click to switch to Vietnamese'
      }
    >
      <span className="text-sm shrink-0">{isVi ? '🇻🇳' : '🇬🇧'}</span>
      <span className="font-bold tracking-tight text-slate-900">{isVi ? 'VI' : 'EN'}</span>
      <span className="text-[10px] text-slate-500 font-medium">➔ {isVi ? 'EN' : 'VI'}</span>
    </button>
  );
}

const SPEAKER_COLOR_PALETTES = [
  { avatar: 'from-blue-600 to-indigo-600 border-blue-400/40', text: 'text-sky-300' },
  { avatar: 'from-emerald-600 to-teal-600 border-emerald-400/40', text: 'text-emerald-300' },
  { avatar: 'from-violet-600 to-purple-600 border-violet-400/40', text: 'text-violet-300' },
  { avatar: 'from-amber-600 to-orange-600 border-amber-400/40', text: 'text-amber-300' },
  { avatar: 'from-rose-600 to-pink-600 border-rose-400/40', text: 'text-rose-300' },
  { avatar: 'from-cyan-600 to-blue-600 border-cyan-400/40', text: 'text-cyan-300' },
];

function getSpeakerColorTheme(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SPEAKER_COLOR_PALETTES.length;
  return SPEAKER_COLOR_PALETTES[index];
}

function CustomLiveKitChat() {
  const { chatMessages, send, isSending } = useChat();
  const [draft, setDraft] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    const msg = draft.trim();
    setDraft('');
    try {
      await send(msg);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleQuickSend = async (text: string) => {
    if (isSending) return;
    try {
      await send(text);
    } catch (err) {
      console.error('Failed to send quick message:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full bg-white">
      {/* Subheader */}
      <div className="px-3.5 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 font-medium text-slate-800">
          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
          Kênh Chat Trực Tiếp Trong Phòng
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono border border-blue-200">
          {chatMessages.length} tin nhắn
        </span>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-0 scrollbar-thin scrollbar-thumb-slate-300">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center p-4 text-slate-400 text-xs my-auto">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-2.5">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <p className="font-bold text-slate-800 text-sm">Chưa có tin nhắn nào</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
              Trò chuyện thời gian thực với tất cả người tham gia trong cuộc họp.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-3 max-w-xs">
              {['Chào mọi người! 👋', 'Tôi nghe rất rõ 👍', 'Nhất trí ý kiến này 🎯'].map(
                (chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickSend(chip)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-[11px] text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.from?.isLocal;
            const senderName = isMe ? 'Bạn' : msg.from?.name || msg.from?.identity || 'Thành viên';
            const initial = senderName.charAt(0).toUpperCase();
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const theme = getSpeakerColorTheme(senderName);

            return (
              <div
                key={msg.id || msg.timestamp}
                className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Speaker Header with Avatar & Name */}
                <div className="flex items-center gap-1.5 text-[11px] px-1">
                  {!isMe && (
                    <div
                      className={`w-4 h-4 rounded-full bg-gradient-to-tr ${theme.avatar} border flex items-center justify-center text-[9px] text-white font-bold shrink-0 shadow-xs`}
                    >
                      {initial}
                    </div>
                  )}
                  <span className={`font-semibold ${isMe ? 'text-blue-600' : 'text-slate-800'}`}>
                    {senderName}
                  </span>
                  {isMe && (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                      B
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">[{timeStr}]</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                    isMe
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-sm'
                      : 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="p-2.5 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nhập tin nhắn trao đổi..."
          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-colors"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}

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

export interface LiveSubtitleRecord {
  speaker?: string;
  participant_identity?: string;
  participant_name?: string;
  original_text: string;
  text?: string;
  translated_text?: string;
  language: string;
  to_language?: string;
  is_final: boolean;
  timestamp: string;
}

function RecordsListener({
  onNewRecord,
  onTranscriptFinalized,
  onLiveSubtitleUpdate,
}: {
  onNewRecord: (r: RecordEntry) => void;
  onTranscriptFinalized?: (text: string, timestamp: string) => void;
  onLiveSubtitleUpdate?: (sub: LiveSubtitleRecord) => void;
}) {
  const room = useRoomContext();
  const callbacksRef = useRef({ onNewRecord, onTranscriptFinalized, onLiveSubtitleUpdate });
  useEffect(() => {
    callbacksRef.current = { onNewRecord, onTranscriptFinalized, onLiveSubtitleUpdate };
  });

  const lastProcessedRef = useRef<string>('');
  const lastProcessedTimeRef = useRef<number>(0);

  const processIncomingMessage = useCallback((topic: string, text: string) => {
    const now = Date.now();
    if (text === lastProcessedRef.current && now - lastProcessedTimeRef.current < 80) {
      return; // Deduplicate rapid twin events
    }
    lastProcessedRef.current = text;
    lastProcessedTimeRef.current = now;

    try {
      console.log(`[DataChannel ${topic}] Received:`, text);
      const data = JSON.parse(text);
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (data.type === 'original_transcript') {
        const entry: RecordEntry = {
          timestamp: timeStr,
          participant_identity: data.participant_identity,
          participant_name: data.participant_name,
          original_text: data.original_text,
          language: data.language || 'vi',
          is_final: !!data.is_final,
        };

        callbacksRef.current.onLiveSubtitleUpdate?.({
          ...entry,
          text: data.original_text,
          to_language: (data.language === 'en' ? 'vi' : 'en').toUpperCase(),
        });

        callbacksRef.current.onNewRecord(entry);

        if (
          data.is_final &&
          data.source !== 'client' &&
          callbacksRef.current.onTranscriptFinalized
        ) {
          callbacksRef.current.onTranscriptFinalized(data.original_text, timeStr);
        }
      } else if (data.type === 'translation_record' || data.type === 'translation') {
        const fromLang = data.from_language || 'vi';
        const toLang = data.to_language || (fromLang === 'en' ? 'vi' : 'en');
        const entry: RecordEntry = {
          timestamp: timeStr,
          participant_identity: data.participant_identity,
          participant_name: data.participant_name,
          original_text: data.original_text,
          translated_text: data.translated_text,
          language: fromLang,
          to_language: toLang,
          is_final: true,
        };

        callbacksRef.current.onLiveSubtitleUpdate?.({
          ...entry,
          text: data.original_text,
          to_language: toLang.toUpperCase(),
        });

        callbacksRef.current.onNewRecord(entry);
      }
    } catch (e) {
      console.warn(`Failed to parse data message for topic ${topic}`, e);
    }
  }, []);

  // Primary listener: direct RoomEvent.DataReceived
  useEffect(() => {
    if (!room) return;

    const onDataReceived = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
      try {
        const text = new TextDecoder().decode(payload);
        processIncomingMessage(topic || 'records', text);
      } catch (err) {
        console.warn('Failed to decode DataReceived payload', err);
      }
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room, processIncomingMessage]);

  // Fallback redundancy: useDataChannel hooks
  useDataChannel('records', (msg) => {
    try {
      const payload = msg.payload || msg;
      const text = new TextDecoder().decode(payload as Uint8Array);
      processIncomingMessage('records', text);
    } catch (e) {}
  });

  useDataChannel('translations', (msg) => {
    try {
      const payload = msg.payload || msg;
      const text = new TextDecoder().decode(payload as Uint8Array);
      processIncomingMessage('translations', text);
    } catch (e) {}
  });

  return null;
}

function WebSpeechPublisher({
  participantName,
  selectedLanguage = 'vi',
  onLocalSubtitleUpdate,
  onLocalRecord,
  onTranscriptFinalized,
}: {
  participantName: string;
  selectedLanguage?: string;
  onLocalSubtitleUpdate?: (sub: LiveSubtitleRecord) => void;
  onLocalRecord?: (entry: RecordEntry) => void;
  onTranscriptFinalized?: (text: string, timestamp: string) => void;
}) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const connectionState = useConnectionState();

  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant) {
      localParticipant
        .setAttributes({ client_stt: 'true', spoken_language: selectedLanguage })
        .catch(() => {});
    }
  }, [connectionState, localParticipant, selectedLanguage]);

  const langMap: Record<string, string> = {
    vi: 'vi-VN',
    en: 'en-US',
  };
  const currentLang = langMap[selectedLanguage] || 'vi-VN';

  const sendDataPacket = useCallback(
    (text: string, isFinal: boolean) => {
      if (!room || !localParticipant) return;
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const targetLang = selectedLanguage === 'vi' ? 'en' : 'vi';

      const payload = {
        type: 'original_transcript',
        participant_identity: localParticipant.identity,
        participant_name: localParticipant.name || participantName,
        original_text: text,
        language: selectedLanguage,
        to_language: targetLang,
        is_final: isFinal,
        source: 'client',
      };

      const entry: RecordEntry = {
        timestamp: timeStr,
        participant_identity: localParticipant.identity,
        participant_name: localParticipant.name || participantName,
        original_text: text,
        language: selectedLanguage,
        to_language: targetLang,
        is_final: isFinal,
      };

      // 1. Instant local subtitle update (0.05s response!)
      onLocalSubtitleUpdate?.({
        ...entry,
        text,
        speaker: participantName,
      });

      // 2. Only add to records history on finalization to prevent high-frequency re-render lag
      if (isFinal) {
        onLocalRecord?.(entry);
      }

      // 3. Finalized DB save & fast CTranslate2 bilingual translation (~150ms)
      if (isFinal) {
        if (onTranscriptFinalized) {
          onTranscriptFinalized(text, timeStr);
        }

        const targetLang = selectedLanguage === 'vi' ? 'en' : 'vi';
        meetingsApi
          .translate(text, selectedLanguage, targetLang)
          .then((res) => {
            if (res && res.translated_text && res.translated_text !== text) {
              const transEntry: RecordEntry = {
                ...entry,
                translated_text: res.translated_text,
                to_language: targetLang,
              };

              // Update local subtitle with translation
              onLocalSubtitleUpdate?.({
                ...transEntry,
                text,
                speaker: participantName,
              });

              // Update records history with translation
              onLocalRecord?.(transEntry);

              // Broadcast translation to other participants
              const transPayload = {
                type: 'translation_record',
                participant_identity: localParticipant.identity,
                participant_name: localParticipant.name || participantName,
                original_text: text,
                translated_text: res.translated_text,
                from_language: selectedLanguage,
                to_language: targetLang,
                is_final: true,
              };

              try {
                const encodedTrans = new TextEncoder().encode(JSON.stringify(transPayload));
                room.localParticipant
                  .publishData(encodedTrans, {
                    topic: 'records',
                    reliable: true,
                  })
                  .catch(() => {});
              } catch (e) {}
            }
          })
          .catch((err) => {
            console.warn('[WebSpeech] Translation request notice:', err);
          });
      }

      // 4. Broadcast to other participants via LiveKit DataChannel
      // (interim uses reliable: false for 0 network buffer lag; final uses reliable: true)
      try {
        const encoded = new TextEncoder().encode(JSON.stringify(payload));
        room.localParticipant
          .publishData(encoded, {
            topic: 'records',
            reliable: isFinal,
          })
          .catch((err) => console.warn('[WebSpeech] publishData error', err));
      } catch (err) {
        console.warn('[WebSpeech] payload encode error', err);
      }
    },
    [
      room,
      localParticipant,
      participantName,
      selectedLanguage,
      onLocalSubtitleUpdate,
      onLocalRecord,
      onTranscriptFinalized,
    ]
  );

  useWebSpeech({
    enabled: !!isMicrophoneEnabled,
    lang: currentLang,
    onInterimTranscript: (interim) => {
      sendDataPacket(interim, false);
    },
    onFinalTranscript: (finalText) => {
      sendDataPacket(finalText, true);
    },
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
  participantName,
  onInviteClick,
  onSidebarToggle,
  latestRecord,
  selectedLanguage = 'vi',
  onLanguageChange,
  selectedBackground,
}: {
  participantName: string;
  onInviteClick: () => void;
  onSidebarToggle: () => void;
  latestRecord?: LiveSubtitleRecord | null;
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  selectedBackground?: BackgroundOption | null;
}) {
  const { enabled: subtitlesEnabled } = useTranslationStore();
  const { localParticipant, isMicrophoneEnabled, microphoneTrack } = useLocalParticipant();
  const roomState = useConnectionState();
  const micVolume = useTrackVolume((microphoneTrack?.track as any) || undefined);
  const [isControlBarVisible, setIsControlBarVisible] = useState(true);

  // Activate translation audio muting hook
  useTranslationAudioMuting();

  const allTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const tracks = allTracks.filter((t) => !t.participant.identity.startsWith('agent-'));

  return (
    <div className="w-full h-full flex flex-col p-3 bg-slate-50 gap-3">
      {/* Camera Frame */}
      <div className="relative flex-1 min-h-0 w-full rounded-2xl overflow-hidden bg-[#181d28] border border-slate-200 shadow-sm">
        {/* Virtual Background overlay if active */}
        {selectedBackground?.url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none transition-all duration-300"
            style={{ backgroundImage: `url(${selectedBackground.url})` }}
          />
        )}
        {/* Live Audio Volume Visualizer when Mic is ON */}
        {isMicrophoneEnabled && (
          <div className="absolute top-4 left-4 z-40 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="shrink-0">Micro đang bật</span>
            <div className="flex items-center gap-0.5 h-3 w-8">
              <div
                className="bg-emerald-400 w-1.5 rounded-full transition-all duration-75"
                style={{ height: `${Math.min(100, Math.max(20, (micVolume || 0) * 250))}%` }}
              />
              <div
                className="bg-emerald-400 w-1.5 rounded-full transition-all duration-75"
                style={{ height: `${Math.min(100, Math.max(20, (micVolume || 0) * 350))}%` }}
              />
              <div
                className="bg-emerald-400 w-1.5 rounded-full transition-all duration-75"
                style={{ height: `${Math.min(100, Math.max(20, (micVolume || 0) * 180))}%` }}
              />
            </div>
          </div>
        )}

        <LiveKitTileErrorBoundary>
          <GridLayout tracks={tracks} style={{ height: '100%', width: '100%', gap: '1rem' }}>
            <ParticipantTile />
          </GridLayout>
          <RoomAudioRenderer />
        </LiveKitTileErrorBoundary>

        {/* Floating Live Subtitle Overlay */}
        {subtitlesEnabled && latestRecord && (latestRecord.text || latestRecord.original_text) && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl p-3.5 shadow-2xl text-center space-y-1">
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

      {/* Bottom Control Bar with Show/Hide Toggle */}
      {isControlBarVisible ? (
        <div className="w-full shrink-0 flex flex-col items-center justify-center z-50 gap-2 pb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-300/40 rounded-2xl px-4 sm:px-5 py-2 flex items-center justify-center gap-2.5">
            <TrackToggle source={Track.Source.Microphone} />
            <TrackToggle source={Track.Source.Camera} />
            <TrackToggle source={Track.Source.ScreenShare} />
            <SpeechTranslationControl />
            <LanguageToggleControl
              selectedLanguage={selectedLanguage}
              onToggle={(newLang) => onLanguageChange?.(newLang)}
            />
            <button
              type="button"
              onClick={onInviteClick}
              className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 flex items-center justify-center transition-all cursor-pointer"
              title="Mời thành viên"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onSidebarToggle}
              className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 flex items-center justify-center transition-all cursor-pointer"
              title="Đóng/Mở Sidebar (⌘B)"
            >
              <PanelRight className="w-5 h-5" />
            </button>
            <DisconnectButton className="lk-button lk-disconnect-button" title="Rời phòng">
              <PhoneOff className="w-5 h-5" />
            </DisconnectButton>

            {/* Nút Ẩn / Thu Gọn thanh điều khiển (Theo yêu cầu ảnh chụp) */}
            <button
              type="button"
              onClick={() => setIsControlBarVisible(false)}
              className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 flex items-center justify-center transition-all cursor-pointer ml-1"
              title="Ẩn thanh điều khiển này"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Nút Mở Lại thanh điều khiển khi đang ẩn */
        <div className="w-full shrink-0 flex items-center justify-center z-50 pb-1 animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => setIsControlBarVisible(true)}
            className="px-4 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 border border-slate-200 shadow-md text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Nhấp để hiển thị lại thanh điều khiển cuộc họp"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Hiện thanh điều khiển</span>
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      )}
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
  const [initialMicEnabled, setInitialMicEnabled] = useState(true);
  const [initialCamEnabled, setInitialCamEnabled] = useState(true);
  const [selectedBackground, setSelectedBackground] = useState<BackgroundOption | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [liveKitError, setLiveKitError] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'transcript' | 'records' | 'ai'>(
    'records'
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const sidebarLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSidebarMouseEnter = useCallback(() => {
    if (sidebarLeaveTimerRef.current) {
      clearTimeout(sidebarLeaveTimerRef.current);
      sidebarLeaveTimerRef.current = null;
    }
    setIsSidebarHovered(true);
  }, []);

  const handleSidebarMouseLeave = useCallback(() => {
    if (isSidebarPinned) return;
    if (sidebarLeaveTimerRef.current) clearTimeout(sidebarLeaveTimerRef.current);
    sidebarLeaveTimerRef.current = setTimeout(() => {
      setIsSidebarHovered(false);
    }, 350);
  }, [isSidebarPinned]);

  const isSidebarVisible = isSidebarPinned ? sidebarOpen : isSidebarHovered || sidebarOpen;

  const [copiedLink, setCopiedLink] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Meeting duration ticker
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const meetingDurationStr = useMemo(() => {
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [elapsedSeconds]);

  const handleCopyMeetingLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, []);

  // Keyboard shortcut (⌘B / Ctrl+B) to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [recordsHistory, setRecordsHistory] = useState<RecordEntry[]>([]);

  // In-Meeting Agenda state and handlers
  const [isEditingAgenda, setIsEditingAgenda] = useState(false);
  const [agendaInput, setAgendaInput] = useState('');
  const [isSavingAgenda, setIsSavingAgenda] = useState(false);
  const [agendaSavedToast, setAgendaSavedToast] = useState(false);
  const inMeetingFileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial agenda when meeting loads
  useEffect(() => {
    if (meeting?.description || meeting?.agenda) {
      setAgendaInput(meeting.description || meeting.agenda || '');
    }
  }, [meeting?.description, meeting?.agenda]);

  const handleSaveAgenda = async () => {
    if (!meetingId) return;
    setIsSavingAgenda(true);
    try {
      const updated = await meetingsApi.update(meetingId, { agenda: agendaInput.trim() });
      setMeeting((prev) =>
        prev
          ? {
              ...prev,
              description: updated.description || agendaInput.trim(),
              agenda: updated.agenda || agendaInput.trim(),
            }
          : prev
      );
      setIsEditingAgenda(false);
      setAgendaSavedToast(true);
      setTimeout(() => setAgendaSavedToast(false), 2500);
    } catch (err) {
      console.error('Failed to update agenda in meeting:', err);
    } finally {
      setIsSavingAgenda(false);
    }
  };

  const handleInMeetingAgendaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const name = file.name.toLowerCase();
      let text = '';
      if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) {
        text = (await file.text()).trim();
      } else {
        const res = await meetingsApi.parseAgenda(file);
        if (res.error) throw new Error(res.error);
        text = (res.content || '').trim();
      }
      if (text) {
        setAgendaInput(text);
        setIsEditingAgenda(true);
      }
    } catch (err) {
      console.warn('Failed to parse file in meeting:', err);
    } finally {
      if (inMeetingFileInputRef.current) inMeetingFileInputRef.current.value = '';
    }
  };

  const handleDeleteMeeting = async () => {
    if (!meeting) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn cuộc họp "${meeting.title}" không?\nPhòng họp sẽ kết thúc và toàn bộ dữ liệu sẽ được xóa bỏ.`
      )
    ) {
      return;
    }
    try {
      await meetingsApi.delete(meetingId);
      router.push('/member');
    } catch (err: any) {
      alert(`Không thể xóa cuộc họp: ${err?.message || 'Có lỗi xảy ra'}`);
    }
  };

  const transcriptEndRef = useRef<HTMLDivElement>(null);
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
    if (recordsHistory.length > 0) {
      const timer = setTimeout(
        () => transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
        100
      );
      return () => clearTimeout(timer);
    }
  }, [recordsHistory.length]);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      sender: 'Asightant',
      text: 'Xin chào! Mình là Asightant — trợ lý AI của bạn trong cuộc họp. Mình đã nạp toàn bộ Agenda và đang theo dõi các phát biểu theo thời gian thực. Bạn cần tra cứu hoặc hỗ trợ điều gì cứ hỏi mình nhé! ✨',
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
        if (transcripts && transcripts.length > 0) {
          const maxSeq = Math.max(...transcripts.map((t: any) => t.sequence || 0));
          transcriptSequenceRef.current = Math.max(transcriptSequenceRef.current, maxSeq + 1);
        }
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

  const [isExtractingTasks, setIsExtractingTasks] = useState(false);
  const handleTriggerAiExtract = async () => {
    if (!meetingId) return;
    try {
      setIsExtractingTasks(true);
      const tasks = await meetingsApi.extractTasks(meetingId);
      if (tasks && tasks.length > 0) {
        setActionItems(tasks as any);
      }
    } catch (err) {
      console.error('Failed to extract tasks:', err);
    } finally {
      setIsExtractingTasks(false);
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
      if (
        name &&
        !name.startsWith('user_') &&
        !name.startsWith('User-') &&
        !name.startsWith('User ')
      ) {
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

  // Dedicated Real-Time Live Floating Subtitle State (Decoupled from historical DB transcripts)
  const [liveSubtitle, setLiveSubtitle] = useState<LiveSubtitleRecord | null>(null);
  const liveSubtitleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLiveSubtitleUpdate = useCallback(
    (record: LiveSubtitleRecord) => {
      if (liveSubtitleTimerRef.current) {
        clearTimeout(liveSubtitleTimerRef.current);
        liveSubtitleTimerRef.current = null;
      }

      const speakerName = getSpeakerDisplayName(
        record.participant_identity,
        record.participant_name
      );

      setLiveSubtitle((prev) => {
        if (
          prev &&
          record.participant_identity &&
          prev.participant_identity === record.participant_identity
        ) {
          return {
            ...prev,
            ...record,
            speaker: speakerName,
            translated_text: record.translated_text || prev.translated_text,
            to_language: record.to_language || prev.to_language,
          };
        }
        return {
          ...record,
          speaker: speakerName,
        };
      });

      // Automatically dismiss floating subtitle 6 seconds after speech finalized
      if (record.is_final) {
        liveSubtitleTimerRef.current = setTimeout(() => {
          setLiveSubtitle(null);
          liveSubtitleTimerRef.current = null;
        }, 6000);
      }
    },
    [getSpeakerDisplayName]
  );

  useEffect(() => {
    return () => {
      if (liveSubtitleTimerRef.current) {
        clearTimeout(liveSubtitleTimerRef.current);
      }
    };
  }, []);

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
        speaker: dt.speaker_name || getSpeakerDisplayName((dt as any).user_id),
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
          (mText.length > 6 &&
            rhText.length > 6 &&
            (mText.includes(rhText) || rhText.includes(mText)))
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
  const handleJoinMeeting = async (settings?: {
    micEnabled: boolean;
    camEnabled: boolean;
    language: string;
    background: BackgroundOption;
  }) => {
    if (!meeting || !participantName) return;
    setIsJoining(true);
    setLiveKitError(false);

    if (settings) {
      setInitialMicEnabled(settings.micEnabled);
      setInitialCamEnabled(settings.camEnabled);
      setSelectedLanguage(settings.language);
      setSelectedBackground(settings.background);
    }

    try {
      const lang = settings?.language || selectedLanguage;
      const data = await meetingsApi.getToken(meeting.id, participantName, lang);
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
        sender: participantName || 'Bạn',
        text: q,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    try {
      // 1. Collect recent live speech turns from meeting
      const liveTranscriptText = displayedRecords
        .slice(-15)
        .map((r) => `${r.speaker || 'Người nói'}: ${r.text}`)
        .join('\n');

      // 2. Collect recent conversation history
      const historyForRag = aiMessages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
        isAi: m.isAi,
      }));

      const result = await meetingsApi.ragQuery(meetingId, q, liveTranscriptText, historyForRag);

      const sourceBlock =
        result.sources.length > 0
          ? '\n\n**Nguồn trích dẫn:**\n' +
            result.sources
              .slice(0, 3)
              .map((s: RagSource) => {
                const label =
                  {
                    agenda: '📋 Agenda',
                    transcript: '🗣️ Lời nói',
                    file: '📄 Tài liệu',
                    bookmark: '📌 Ghi chú',
                  }[s.type] ?? '📎 Nguồn';
                const title = s.filename ? `${label} (${s.filename})` : label;
                return `• ${title}: ${s.snippet.slice(0, 120)}${
                  s.snippet.length > 120 ? '...' : ''
                }`;
              })
              .join('\n')
          : '';

      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'Asightant',
          text: result.answer + sourceBlock,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAi: true,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : 'Asightant không phản hồi. Vui lòng thử lại.';
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'Asightant',
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
      <MeetingPreJoinLobby
        meetingTitle={meeting.title}
        meetingId={meeting.id}
        meetingAgenda={meeting.agenda || meeting.description || null}
        user={user}
        participantName={participantName}
        selectedLanguage={selectedLanguage}
        onLanguageChange={(lang) => setSelectedLanguage(lang)}
        isJoining={isJoining}
        onJoin={handleJoinMeeting}
        onExit={handleExitMeeting}
        onDeleteMeeting={
          user &&
          (user.id === meeting.created_by_id || user.role === 'OWNER' || user.role === 'ADMIN')
            ? handleDeleteMeeting
            : undefined
        }
      />
    );
  }

  return (
    <div className="h-full w-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden select-none">
      {/* Top Header: Unified DX-OS Executive Light Header */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between shrink-0 z-30 shadow-xs">
        {/* Left: Exit + Logo + Meeting Title & Live SFU Indicator */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExitMeeting}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer"
            title="Rời phòng họp & Về bàn làm việc"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <Logo size={28} showText={true} subtitle="MEETING" variant="gradient" />

          <span className="hidden sm:inline-block text-slate-300">|</span>

          <div className="flex flex-col min-w-0">
            <h1
              className="text-sm font-bold text-slate-900 tracking-tight truncate max-w-[140px] sm:max-w-xs"
              title={meeting.title}
            >
              {meeting.title}
            </h1>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline truncate">
              Mã: {meetingId.slice(0, 8)}...
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10.5px] font-semibold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live SFU
          </div>
        </div>

        {/* Center: Live Meeting Duration Ticker */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Thời lượng: {meetingDurationStr}</span>
        </div>

        {/* Right Actions: Copy Link + MoM Summary + Invite */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Copy Meeting Link */}
          <button
            type="button"
            onClick={handleCopyMeetingLink}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 text-xs font-medium transition-all cursor-pointer shadow-2xs"
            title="Sao chép link mời tham gia"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Sao chép mã</span>
              </>
            )}
          </button>

          {/* MoM Cascade Trigger */}
          <button
            type="button"
            onClick={() => setIsPostMeetingModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Kích hoạt AI tổng kết phiên họp và phân bổ action items cho Khối / Member"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tổng Kết MoM</span>
          </button>

          {/* Invite Members Modal Trigger */}
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0"
            title="Mời thêm thành viên vào phòng"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>Mời người</span>
          </button>

          {/* Delete Meeting for Creator / Host */}
          {user &&
            (user.id === meeting.created_by_id ||
              user.role === 'OWNER' ||
              user.role === 'ADMIN') && (
              <button
                type="button"
                onClick={handleDeleteMeeting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0"
                title="Xóa vĩnh viễn cuộc họp này (Chỉ người tạo/chủ phòng có quyền)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Xóa phòng</span>
              </button>
            )}
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
            audio={initialMicEnabled}
            video={initialCamEnabled}
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
                onLiveSubtitleUpdate={handleLiveSubtitleUpdate}
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
              <WebSpeechPublisher
                participantName={participantName}
                selectedLanguage={selectedLanguage}
                onLocalSubtitleUpdate={handleLiveSubtitleUpdate}
                onLocalRecord={(r) => {
                  setRecordsHistory((prev) => {
                    const newArr = [...prev];
                    let found = false;
                    for (let i = newArr.length - 1; i >= 0; i--) {
                      if (
                        newArr[i].participant_identity === r.participant_identity &&
                        (newArr[i].original_text === r.original_text || !newArr[i].is_final)
                      ) {
                        newArr[i] = {
                          ...newArr[i],
                          original_text: r.original_text,
                          translated_text: r.translated_text || newArr[i].translated_text,
                          to_language: r.to_language || newArr[i].to_language,
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
                onTranscriptFinalized={handleTranscriptFinalized}
              />
              <div className="flex-1 relative w-full h-full min-h-0 min-w-0">
                <LiveKitContent
                  participantName={participantName}
                  onInviteClick={() => setInviteModalOpen(true)}
                  latestRecord={liveSubtitle}
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={(newLang) => setSelectedLanguage(newLang)}
                  selectedBackground={selectedBackground}
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
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-medium flex items-center gap-2 shadow-md">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  LiveKit server chưa được cấu hình. Các tính năng AI RAG vẫn hoạt động bình thường.
                  Mời bạn chat ở khung bên phải nhé! 🚀
                </div>
              )}
            </div>

            {/* ── 1. Invisible Right Edge Trigger Zone (Full height along far-right edge) ── */}
            <div
              className="fixed right-0 top-0 bottom-0 w-8 z-40"
              onMouseEnter={handleSidebarMouseEnter}
              onMouseMove={handleSidebarMouseEnter}
            />

            {/* ── 2. Sleek Capsule Peek Indicator (When sidebar is collapsed/unpinned) ── */}
            {!isSidebarVisible && (
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(true);
                  setIsSidebarHovered(true);
                }}
                onMouseEnter={handleSidebarMouseEnter}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-40 group flex items-center justify-end p-0 cursor-pointer transition-all duration-300"
                title="Rê chuột vào mép phải hoặc nhấp để mở Sidebar (Chat, Asightant, Ghi chép)"
              >
                <div className="w-2.5 h-24 rounded-l-2xl bg-gradient-to-b from-blue-500 via-indigo-600 to-violet-600 group-hover:w-6 group-hover:h-28 shadow-lg transition-all duration-300 flex items-center justify-center pl-1 border-y border-l border-blue-400/40">
                  <ChevronLeft className="w-4 h-4 text-white opacity-80 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all duration-200" />
                </div>
              </button>
            )}

            {/* ── 3. Right Side: 4-Tab Multifunctional Sidebar with Auto-Hover & Pin Dock Toggle ── */}
            <aside
              onMouseEnter={handleSidebarMouseEnter}
              onMouseLeave={handleSidebarMouseLeave}
              className={`${
                isSidebarPinned
                  ? isSidebarVisible
                    ? 'relative w-80 md:w-96 xl:w-[420px] shrink-0'
                    : 'hidden'
                  : `fixed right-0 top-0 bottom-0 w-80 md:w-96 xl:w-[420px] z-50 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isSidebarVisible
                        ? 'translate-x-0 opacity-100 pointer-events-auto'
                        : 'translate-x-full opacity-0 pointer-events-none'
                    }`
              } bg-white text-slate-900 flex flex-col h-full border-l border-slate-200 min-h-0 overflow-hidden select-none shadow-sm`}
            >
              {/* 1. Sidebar Header with Active Tab Title, Pin Toggle & Close Button */}
              <div className="h-12 px-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <PanelRight className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate">
                    {activeRightTab === 'records' && 'Bản Ghi & Dịch Song Ngữ'}
                    {activeRightTab === 'transcript' && 'Agenda & Ghi Chú'}
                    {activeRightTab === 'chat' && 'Trò Chuyện Cuộc Họp'}
                    {activeRightTab === 'ai' && 'ASIGHTANT (TRỢ LÝ AI)'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Pin / Dock Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isSidebarPinned) {
                        setIsSidebarPinned(false);
                      } else {
                        setIsSidebarPinned(true);
                        setSidebarOpen(true);
                      }
                    }}
                    className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      isSidebarPinned
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={
                      isSidebarPinned
                        ? 'Bỏ ghim (Chuyển sang chế độ tự ẩn khi rời chuột)'
                        : 'Ghim cố định (Chia đôi khung nhìn song song với video)'
                    }
                  >
                    {isSidebarPinned ? (
                      <Pin className="w-3.5 h-3.5 fill-current text-blue-600" />
                    ) : (
                      <PinOff className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      setIsSidebarHovered(false);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Thu gọn sidebar (⌘B)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. 4-Tab Segmented Switcher */}
              <div className="p-2 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  {/* Tab 1: Records */}
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('records')}
                    className={`relative py-1.5 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeRightTab === 'records'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="Bản ghi âm và dịch song ngữ thời gian thực"
                  >
                    <Languages className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] truncate">Bản Ghi</span>
                    {displayedRecords.length > 0 && (
                      <span
                        className={`text-[9px] px-1 rounded-full font-mono font-bold ${
                          activeRightTab === 'records'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {displayedRecords.length}
                      </span>
                    )}
                  </button>

                  {/* Tab 2: Task & Agenda */}
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('transcript')}
                    className={`relative py-1.5 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeRightTab === 'transcript'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="Danh sách Task và Agenda cuộc họp"
                  >
                    <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] truncate font-bold">Task</span>
                    {actionItems.length > 0 && (
                      <span
                        className={`text-[9px] px-1 rounded-full font-mono font-bold ${
                          activeRightTab === 'transcript'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {actionItems.length}
                      </span>
                    )}
                  </button>

                  {/* Tab 3: Chat */}
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('chat')}
                    className={`relative py-1.5 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeRightTab === 'chat'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="Hộp trò chuyện tin nhắn phòng họp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] truncate">Chat</span>
                  </button>

                  {/* Tab 4: Asightant */}
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('ai')}
                    className={`relative py-1.5 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeRightTab === 'ai'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="Trợ lý Asightant AI giải đáp mọi thông tin và diễn biến cuộc họp"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="text-[11px] truncate">Asightant</span>
                  </button>
                </div>
              </div>

              {/* 3. Tab Content Panels with Smooth Vertical Scrolling */}
              <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
                {/* ─────────────────────────────────────────────────────────────
                      TAB 1: RECORDS & REALTIME BILINGUAL TRANSLATION
                  ───────────────────────────────────────────────────────────── */}
                <div
                  className={`flex-1 flex-col overflow-hidden min-h-0 ${
                    activeRightTab === 'records' ? 'flex' : 'hidden'
                  }`}
                >
                  {/* Subheader bar */}
                  <div className="px-3.5 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Nhận diện giọng nói STT & Dịch song ngữ
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {displayedRecords.length} đoạn
                    </span>
                  </div>

                  {/* Scrollable Records Feed */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 scrollbar-thin scrollbar-thumb-slate-300">
                    {displayedRecords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-400 text-xs my-auto">
                        <Languages className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="font-semibold text-slate-700">Chưa có bản ghi âm nào</p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                          Bật micro và phát biểu, hệ thống sẽ tự động bóc tách giọng nói và dịch
                          song song tại đây.
                        </p>
                      </div>
                    ) : (
                      displayedRecords.map((t) => (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl transition-all duration-200 border ${
                            !t.is_final
                              ? 'bg-amber-50/50 border-amber-300 shadow-2xs'
                              : 'bg-white border-slate-200 shadow-2xs'
                          }`}
                        >
                          <div className="text-xs mb-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 truncate">
                              <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[10px] text-blue-600 font-bold shrink-0">
                                {t.speaker ? t.speaker.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <span className="truncate">{t.speaker}</span>
                              {!t.is_final && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono font-medium animate-pulse">
                                  đang nói...
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-400 font-mono">
                                [{t.timestamp}]
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase border border-slate-200">
                                {t.language}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-slate-900 font-medium leading-relaxed">
                            {t.text}
                          </p>

                          {t.translated_text && (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-start gap-2 text-xs bg-blue-50/70 border border-blue-200 p-2.5 rounded-lg text-blue-950">
                              <Globe className="w-3.5 h-3.5 shrink-0 text-blue-600 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] uppercase font-bold text-blue-700 mr-1.5 tracking-wider font-mono">
                                  [{t.to_language || 'EN'}]
                                </span>
                                <span className="font-medium leading-relaxed">
                                  {t.translated_text}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                      TAB 2: AGENDA & MEETING NOTES & AI ACTION ITEMS (JIRA)
                  ───────────────────────────────────────────────────────────── */}
                <div
                  className={`flex-1 flex-col overflow-hidden min-h-0 ${
                    activeRightTab === 'transcript' ? 'flex' : 'hidden'
                  }`}
                >
                  {/* 1. Interactive Meeting Agenda Section (Trong cuộc họp) */}
                  <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Agenda Cuộc Họp
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="file"
                          ref={inMeetingFileInputRef}
                          onChange={handleInMeetingAgendaUpload}
                          accept=".txt,.md,.markdown,.json,.docx,.pdf,.csv"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => inMeetingFileInputRef.current?.click()}
                          className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white text-[11px] font-medium transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          title="Nạp tệp Agenda mới (.txt, .md, .docx, .pdf)"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                        {isEditingAgenda ? (
                          <button
                            type="button"
                            onClick={handleSaveAgenda}
                            disabled={isSavingAgenda}
                            className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSavingAgenda ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            <span>Lưu</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsEditingAgenda(true)}
                            className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Pencil className="w-3 h-3 text-slate-500" />
                            <span>Sửa</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {agendaSavedToast && (
                      <div className="mb-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5 animate-in fade-in">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Đã lưu và cập nhật Agenda cho Asightant AI!</span>
                      </div>
                    )}

                    {isEditingAgenda ? (
                      <div className="space-y-2">
                        <textarea
                          rows={5}
                          value={agendaInput}
                          onChange={(e) => setAgendaInput(e.target.value)}
                          placeholder="Nhập nội dung chương trình họp (Agenda)..."
                          className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 resize-y leading-relaxed"
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Bấm 'Lưu' để cập nhật vào hệ thống.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAgendaInput(meeting?.description || meeting?.agenda || '');
                              setIsEditingAgenda(false);
                            }}
                            className="text-slate-500 hover:text-slate-800 underline"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-32 overflow-y-auto pr-1 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 scrollbar-thin">
                        {(meeting?.description || meeting?.agenda || '').trim() ? (
                          <p className="whitespace-pre-line leading-relaxed text-[11.5px]">
                            {meeting?.description || meeting?.agenda}
                          </p>
                        ) : (
                          <p className="text-[11px] italic text-slate-400">
                            Chưa có nội dung Agenda. Bấm 'Sửa' hoặc biểu tượng tải tệp ở trên để nạp
                            kế hoạch cuộc họp cho Asightant.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Tasks Subheader */}
                  <div className="px-3.5 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        Task
                      </span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-bold">
                        {actionItems.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerAiExtract}
                        disabled={isExtractingTasks}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="Quét lại bản ghi để trích xuất Task bằng AI"
                      >
                        {isExtractingTasks ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-blue-600" />
                        )}
                        <span>Quét Task AI</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenJiraWorkspace}
                        disabled={isOpeningJira}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="Mở Mini Jira Kanban Board của phiên họp"
                      >
                        {isOpeningJira ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Kanban className="w-3 h-3 text-blue-600" />
                        )}
                        <span>Bảng Jira</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 scrollbar-thin scrollbar-thumb-slate-200">
                    {actionItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-400 text-xs my-auto">
                        <CheckSquare className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="font-semibold text-slate-700">Chưa có Task nào</p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                          Bấm "Quét Task AI" hoặc "Tổng Kết MoM" trên thanh tiêu đề để AI tự động
                          trích xuất nhiệm vụ và phân bổ cho các thành viên.
                        </p>
                      </div>
                    ) : (
                      actionItems.map((item: ActionItemResponse) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-all text-xs"
                        >
                          {editingTaskId === item.id ? (
                            <div className="flex flex-col gap-2.5">
                              <input
                                type="text"
                                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 shadow-2xs"
                                value={editForm.title}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                                }
                                placeholder="Tiêu đề task..."
                              />
                              <div className="flex flex-col gap-2">
                                <select
                                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 shadow-2xs"
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
                              <div className="flex justify-end gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" /> Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" /> Lưu
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start gap-2">
                                <div className="mt-1 shrink-0">
                                  <span
                                    className={`inline-block w-2 h-2 rounded-full ${
                                      item.status === 'CONFIRMED'
                                        ? 'bg-emerald-500'
                                        : 'bg-amber-500'
                                    }`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                                      {item.title}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 text-xs leading-relaxed">
                                    {item.description || ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                                <div className="flex items-center gap-2 text-[10.5px] text-slate-500 font-medium">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span className="text-slate-800 font-semibold">
                                      {item.assignee_name || 'Chưa gán'}
                                    </span>
                                  </span>
                                  <span className="text-slate-300">|</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>
                                      {(item as any).deadline || item.due_date
                                        ? new Date(
                                            (item as any).deadline || item.due_date
                                          ).toLocaleString('vi-VN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                          })
                                        : 'Không có hạn'}
                                    </span>
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Chỉnh sửa task"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                      TAB 3: LIVEKIT CHAT (SCROLLABLE MESSAGES & SPEAKER SEPARATION)
                  ───────────────────────────────────────────────────────────── */}
                <div
                  className={`flex-1 flex-col bg-white min-h-0 overflow-hidden ${
                    activeRightTab === 'chat' ? 'flex' : 'hidden'
                  }`}
                >
                  <CustomLiveKitChat />
                </div>

                {/* ─────────────────────────────────────────────────────────────
                      TAB 4: ASIGHTANT AI AGENT (RAG & CONTEXT Q&A)
                  ───────────────────────────────────────────────────────────── */}
                <div
                  className={`flex-1 flex-col min-h-0 overflow-hidden bg-white ${
                    activeRightTab === 'ai' ? 'flex' : 'hidden'
                  }`}
                >
                  <div className="flex flex-col w-full h-full min-h-0 bg-white">
                    {/* Subheader info */}
                    <div className="px-3.5 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1.5 font-bold text-amber-700">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Asightant • Phân tích Agenda & Hội thoại
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono font-semibold">
                        Qwen RAG Live
                      </span>
                    </div>

                    {/* AI Chat message list */}
                    <ul className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 min-h-0 scrollbar-thin scrollbar-thumb-slate-200">
                      {aiMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center my-auto p-4 text-center text-xs text-slate-500">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-100 via-blue-50 to-indigo-100 border border-amber-200 flex items-center justify-center mb-2.5 shadow-sm">
                            <Sparkles className="w-6 h-6 text-amber-600" />
                          </div>
                          <p className="font-bold text-slate-900 text-sm">Trợ Lý Asightant AI</p>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                            Đã nạp toàn bộ Agenda cuộc họp và theo dõi từng câu phát biểu theo thời
                            gian thực để giải đáp mọi thắc mắc.
                          </p>
                          <div className="flex flex-wrap gap-1.5 justify-center mt-3.5 max-w-xs">
                            {[
                              'Agenda cuộc họp gồm những gì?',
                              'Tóm tắt các phát biểu vừa qua',
                              'Ai đang được phân công việc?',
                              'Các điểm thống nhất chính',
                            ].map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                onClick={() => {
                                  setAiQueryMsg(prompt);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-[11px] text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiMessages.map((msg, i) => (
                        <li
                          key={i}
                          className={`flex flex-col gap-1.5 ${
                            msg.isAi ? 'items-start' : 'items-end'
                          }`}
                        >
                          {/* Speaker Header */}
                          <div className="flex items-center gap-1.5 text-[11px] px-1">
                            {msg.isAi ? (
                              <>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-[9px] text-white font-bold shrink-0 shadow-2xs">
                                  <Sparkles className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className="font-bold text-amber-700">Asightant</span>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-blue-600">
                                  {msg.sender || 'Bạn'}
                                </span>
                                <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                  {(msg.sender || 'U').charAt(0).toUpperCase()}
                                </div>
                              </>
                            )}
                            <span className="text-slate-400 font-mono text-[10px]">
                              [{msg.time}]
                            </span>
                          </div>

                          {/* Message Card */}
                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs break-words whitespace-pre-wrap ${
                              msg.isAi
                                ? 'bg-gradient-to-br from-amber-50/60 via-slate-50 to-white border border-amber-200/80 text-slate-800 rounded-tl-xs shadow-sm'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs self-end max-w-[85%]'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </li>
                      ))}

                      {/* Animated Thinking State */}
                      {isAiLoading && (
                        <li className="flex flex-col gap-1.5 items-start">
                          <div className="flex items-center gap-1.5 text-[11px] px-1 text-amber-700 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            <span>Asightant đang xử lý...</span>
                          </div>
                          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 rounded-tl-xs animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                            <span>Đang đối chiếu Agenda và phân tích ngữ cảnh cuộc họp...</span>
                          </div>
                        </li>
                      )}
                    </ul>

                    {/* Sticky Input Bar */}
                    <form
                      onSubmit={handleSendAiQuery}
                      className="border-t border-slate-200 p-2.5 bg-slate-50 shrink-0 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={aiQueryMsg}
                        onChange={(e) => setAiQueryMsg(e.target.value)}
                        disabled={isAiLoading}
                        placeholder={
                          isAiLoading
                            ? 'Asightant đang đọc context...'
                            : 'Hỏi Asightant về agenda, transcript, task...'
                        }
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={isAiLoading || !aiQueryMsg.trim()}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
                      >
                        {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hỏi AI'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </aside>
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
