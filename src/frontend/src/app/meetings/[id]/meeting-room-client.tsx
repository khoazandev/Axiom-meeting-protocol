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
  Upload,
  Paperclip,
} from 'lucide-react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { meetingsApi, type Meeting, type RagSource, ApiRequestError } from '@/lib/api';
import { LiveSubtitle } from '@/components/meetings/LiveSubtitle';
import { RealtimeSTTPanel } from '@/components/RealtimeSTTPanel';

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
  const [liveKitError, setLiveKitError] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'agenda' | 'chat' | 'ai' | 'files'>(
    'agenda'
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [currentSubtitle, setCurrentSubtitle] = useState<{ speaker: string; text: string }>({
    speaker: 'Axiom AI',
    text: 'Phòng họp sẵn sàng. Upload tài liệu vào tab Agenda để chatbot AI có thể trả lời câu hỏi về nội dung.',
  });
  // Chat States
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      sender: 'Axiom AI Agent',
      text: 'Xin chào! Tôi đã sẵn sàng. Hãy hỏi tôi về agenda, tài liệu, hoặc bất cứ điều gì liên quan đến cuộc họp này.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAi: true,
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [aiQueryMsg, setAiQueryMsg] = useState('');

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    { id: string; filename: string; content_type: string }[]
  >([]);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Bookmark Feedback
  const [bookmarkFeedback, setBookmarkFeedback] = useState<string | null>(null);

  // AI loading state
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [participantName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);

  // Load meeting data (critical path)
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

  // Load LiveKit token (non-critical — video works but room still shows on failure)
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

  // Load uploaded files for this meeting
  useEffect(() => {
    if (!meeting) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('axiom_token') || '' : '';
    const wsId =
      typeof window !== 'undefined'
        ? localStorage.getItem('axiom_workspace')
          ? JSON.parse(localStorage.getItem('axiom_workspace') || '{}')?.id || ''
          : ''
        : '';
    if (!token || !wsId) return;

    fetch(`/api/v1/meetings/${meetingId}/files`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-ID': wsId },
    })
      .then((r) => r.json())
      .then((files) => {
        if (Array.isArray(files)) setUploadedFiles(files);
      })
      .catch(() => {});
  }, [meeting, meetingId]);

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

  const handleSendAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQueryMsg.trim() || isAiLoading) return;

    const q = aiQueryMsg.trim();
    setAiQueryMsg('');
    setIsAiLoading(true);

    // Optimistically show user message
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

      // Format sources as a readable block
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const authToken = localStorage.getItem('axiom_token');
    const wsRaw = localStorage.getItem('axiom_workspace');
    const wsId = wsRaw ? JSON.parse(wsRaw)?.id : null;
    if (!authToken || !wsId) {
      setUploadFeedback('⚠️ Chưa đăng nhập hoặc chưa chọn workspace.');
      return;
    }

    setUploadingFile(true);
    setUploadFeedback(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/v1/meetings/${meetingId}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'X-Workspace-ID': wsId },
        body: formData,
      });
      if (res.ok) {
        const uploaded = await res.json();
        setUploadedFiles((prev) => [...prev, uploaded]);
        setUploadFeedback(`✅ Đã upload: ${file.name}`);
      } else {
        const err = await res.json().catch(() => ({}));
        setUploadFeedback(`❌ Lỗi: ${err?.error?.message || res.statusText}`);
      }
    } catch {
      setUploadFeedback('❌ Upload thất bại. Kiểm tra kết nối.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  return (
    <div className="h-full w-full bg-bg-base text-text-primary flex flex-col overflow-hidden select-none">
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
            <ChevronRight
              className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* Left Side: LiveKit Video Canvas + Subtitle Overlay (Google Meet Style) */}
        <div className="flex-1 bg-black relative flex flex-col overflow-hidden min-h-0 min-w-0">
          <div className="flex-1 relative w-full h-full min-h-0 min-w-0">
            {token === '' ? (
              <div className="text-text-secondary flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-xs font-medium">Connecting to LiveKit WebRTC Server...</p>
              </div>
            ) : (
              <LiveKitRoom
                video={false}
                audio={false}
                token={token}
                serverUrl={livekitUrl}
                data-lk-theme="default"
                className="w-full h-full absolute inset-0 flex flex-col"
                onDisconnected={() => {
                  console.log('LiveKit connection closed or server offline.');
                  setLiveKitError(true);
                }}
                onError={() => {
                  setLiveKitError(true);
                }}
              >
                <VideoConference />
                <RoomAudioRenderer />

                {/* Live Subtitle Overlay Bar */}
                <LiveSubtitle />
              </LiveKitRoom>
            )}
          </div>

          {/* LiveKit Offline Warning */}
          {liveKitError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              LiveKit server chưa khởi động (ws://localhost:7880). Các tính năng Chat, Agenda, AI
              RAG vẫn hoạt động.
            </div>
          )}
        </div>

        {/* Right Side: Collapsible Drawers (Agenda, Public Chat, AI Assistant, Tasks) */}
        {sidebarOpen && (
          <aside className="w-80 md:w-96 bg-[#0E1526] border-l border-blue-950/60 flex flex-col shrink-0 overflow-hidden">
            {/* Drawer Tabs */}
            <div className="flex items-center border-b border-blue-950/60 p-2 gap-1 bg-[#131B2E]/60">
              <button
                onClick={() => setActiveRightTab('agenda')}
                className={`flex-1 py-1.5 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  activeRightTab === 'agenda'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>

              <button
                onClick={() => setActiveRightTab('files')}
                className={`flex-1 py-1.5 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  activeRightTab === 'files'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Files</span>
              </button>

              <button
                onClick={() => setActiveRightTab('chat')}
                className={`flex-1 py-1.5 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
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
                className={`flex-1 py-1.5 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  activeRightTab === 'ai'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {activeRightTab === 'agenda' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Agenda cuộc họp
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#131B2E] border border-blue-950/80 space-y-3">
                    {meeting.agenda
                      .split('\n')
                      .filter(Boolean)
                      .map((line, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{line}</span>
                        </div>
                      ))}
                  </div>

                  <p className="text-[10px] text-slate-500 text-center">
                    Upload tài liệu vào tab{' '}
                    <span className="text-emerald-400 font-bold">Files</span> để AI có thể trả lời
                    dựa vào nội dung file.
                  </p>
                </div>
              )}

              {activeRightTab === 'files' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Tài liệu cuộc họp
                    </span>
                    <span className="text-[10px] text-slate-500">{uploadedFiles.length} file</span>
                  </div>

                  {/* Upload Button */}
                  <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-950/10 cursor-pointer hover:border-emerald-400/60 hover:bg-emerald-950/20 transition-all group">
                    {uploadingFile ? (
                      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-xs text-emerald-400 font-semibold">
                      {uploadingFile ? 'Đang upload...' : 'Click để upload tài liệu'}
                    </span>
                    <span className="text-[10px] text-slate-500">PDF, Word, Excel, TXT</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.md"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                  </label>

                  {/* Upload Feedback */}
                  {uploadFeedback && (
                    <div
                      className={`text-xs px-3 py-2 rounded-xl ${uploadFeedback.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                    >
                      {uploadFeedback}
                    </div>
                  )}

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Đã upload
                      </span>
                      {uploadedFiles.map((f, i) => {
                        const ext = f.filename.split('.').pop()?.toLowerCase() || '';
                        const icon =
                          ext === 'pdf'
                            ? '📄'
                            : ext === 'docx' || ext === 'doc'
                              ? '📝'
                              : ext === 'xlsx' || ext === 'xls'
                                ? '📊'
                                : '📃';
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#131B2E] border border-blue-950/60"
                          >
                            <span className="text-base">{icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-200 truncate font-medium">
                                {f.filename}
                              </p>
                              <p className="text-[10px] text-slate-500 uppercase">{ext}</p>
                            </div>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </div>
                        );
                      })}
                      <p className="text-[10px] text-slate-500 text-center">
                        AI sẽ dùng các file này để trả lời câu hỏi trong tab AI ✨
                      </p>
                    </div>
                  )}

                  {uploadedFiles.length === 0 && !uploadFeedback && (
                    <p className="text-[10px] text-slate-500 text-center">
                      Chưa có tài liệu nào. Upload để AI chatbot có thể đọc nội dung.
                    </p>
                  )}
                </div>
              )}

              {activeRightTab === 'chat' && (
                <div className="h-full flex flex-col justify-between space-y-3">
                  <div className="space-y-3 overflow-y-auto max-h-[480px]">
                    {publicMessages.map((msg, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[#131B2E] border border-blue-950/80 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-blue-400">{msg.sender}</span>
                          <span className="text-slate-500">{msg.time}</span>
                        </div>
                        <p className="text-xs text-slate-200">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSendPublicChat}
                    className="flex items-center gap-2 pt-2 border-t border-blue-950"
                  >
                    <input
                      type="text"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      placeholder="Send chat message..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#131B2E] border border-blue-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white"
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
                    className="flex items-center gap-2 pt-2 border-t border-blue-950"
                  >
                    <input
                      type="text"
                      value={aiQueryMsg}
                      onChange={(e) => setAiQueryMsg(e.target.value)}
                      disabled={isAiLoading}
                      placeholder={
                        isAiLoading ? 'Đang suy nghĩ...' : 'Hỏi về agenda, tài liệu, transcript...'
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

              {/* Real-time STT + Translation Panel — always visible below tabs */}
              <section className="pt-4 mt-4 border-t border-blue-950/60">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Real-time STT & Translation
                </h3>
                <RealtimeSTTPanel />
              </section>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
