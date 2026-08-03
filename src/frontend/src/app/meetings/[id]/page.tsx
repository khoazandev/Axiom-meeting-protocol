'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock, CheckCircle2, ArrowLeft, Upload, Sparkles, FileText, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

import { RealtimeSTTPanel, SubtitleData } from '@/components/RealtimeSTTPanel';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface Meeting {
  id: number;
  title: string;
  agenda: string;
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
}

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJitsiMuted, setIsJitsiMuted] = useState<boolean>(true);

  // Sidebar tab state
  const [activeTab, setActiveTab] = useState<'agenda' | 'files' | 'ai'>('agenda');

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<{id: string; filename: string; content_type: string}[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // AI RAG chat state
  interface AiMsg { role: 'user' | 'ai'; text: string; }
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    { role: 'ai', text: 'Xin chào! Hãy upload tài liệu vào tab Files rồi hỏi tôi bất cứ điều gì về nội dung cuộc họp.' },
  ]);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  // ── Subtitle system: 100% ref-driven zero re-render, typewriter streaming for both VI and EN ──
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const enTextRef = useRef<HTMLSpanElement>(null);
  const viTextRef = useRef<HTMLParagraphElement>(null);
  const processingRef = useRef<HTMLSpanElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  
  const currentViRef = useRef<string>('');
  const viTargetTextRef = useRef<string>('');
  const viRevealedLenRef = useRef<number>(0);
  const viAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typewriter ticker for Vietnamese text (~20ms per char)
  const startViTypewriter = useCallback(() => {
    if (viAnimTimerRef.current) {
      clearTimeout(viAnimTimerRef.current);
      viAnimTimerRef.current = null;
    }

    const tick = () => {
      if (viRevealedLenRef.current < viTargetTextRef.current.length) {
        viRevealedLenRef.current++;
        if (viTextRef.current) {
          viTextRef.current.textContent = viTargetTextRef.current.slice(0, viRevealedLenRef.current);
        }
        viAnimTimerRef.current = setTimeout(tick, 20);
      } else {
        viAnimTimerRef.current = null;
      }
    };

    tick();
  }, []);

  // Callback: writes streaming characters directly to DOM (no React re-render)
  const handleSubtitleUpdate = useCallback((sub: SubtitleData | null) => {
    if (!sub) {
      if (viAnimTimerRef.current) { clearTimeout(viAnimTimerRef.current); viAnimTimerRef.current = null; }
      currentViRef.current = '';
      viTargetTextRef.current = '';
      viRevealedLenRef.current = 0;
      if (viTextRef.current) viTextRef.current.textContent = '';
      if (enTextRef.current) enTextRef.current.textContent = '';
      if (processingRef.current) processingRef.current.style.display = 'none';
      setSubtitleVisible(false);
      return;
    }

    // Show overlay
    setSubtitleVisible(true);

    // VI text: typewriter streaming effect
    if (sub.vi) {
      if (sub.vi !== viTargetTextRef.current) {
        // If a new sentence starts, reset typewriter
        if (currentViRef.current !== sub.vi && !sub.vi.startsWith(currentViRef.current.slice(0, Math.min(10, currentViRef.current.length)))) {
          viRevealedLenRef.current = 0;
          if (viTextRef.current) viTextRef.current.textContent = '';
          if (enTextRef.current) enTextRef.current.textContent = '';
        }
        currentViRef.current = sub.vi;
        viTargetTextRef.current = sub.vi;
        if (!viAnimTimerRef.current) {
          startViTypewriter();
        }
      }
    }

    // EN text: write directly to DOM as backend streams characters
    if (sub.en) {
      if (processingRef.current) processingRef.current.style.display = 'none';
      if (enTextRef.current) enTextRef.current.textContent = sub.en;
    } else {
      if (processingRef.current) processingRef.current.style.display = 'inline-block';
    }
  }, [startViTypewriter]);

  useEffect(() => {
    const token = localStorage.getItem('axiom_token') || '';
    const wsRaw = localStorage.getItem('axiom_workspace');
    const wsId = wsRaw ? (JSON.parse(wsRaw)?.id || '') : '';
    fetch(`/api/v1/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-ID': wsId },
    })
      .then((res) => res.json())
      .then((data: Meeting) => { setMeeting(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [meetingId]);

  // Load uploaded files for this meeting
  useEffect(() => {
    const token = localStorage.getItem('axiom_token') || '';
    const wsRaw = localStorage.getItem('axiom_workspace');
    const wsId = wsRaw ? (JSON.parse(wsRaw)?.id || '') : '';
    if (!token || !wsId) return;
    fetch(`/api/v1/meetings/${meetingId}/files`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-ID': wsId },
    })
      .then((r) => r.json())
      .then((files) => { if (Array.isArray(files)) setUploadedFiles(files); })
      .catch(() => {});
  }, [meetingId]);

  // Auto-scroll AI chat to bottom
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('axiom_token') || '';
    const wsRaw = localStorage.getItem('axiom_workspace');
    const wsId = wsRaw ? (JSON.parse(wsRaw)?.id || '') : '';
    if (!token || !wsId) { setUploadFeedback('⚠️ Chưa đăng nhập hoặc chưa chọn workspace.'); return; }
    setUploadingFile(true);
    setUploadFeedback(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/v1/meetings/${meetingId}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-Workspace-ID': wsId },
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
    } catch { setUploadFeedback('❌ Upload thất bại.'); }
    finally { setUploadingFile(false); e.target.value = ''; }
  };

  const handleAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || aiLoading) return;
    const q = aiQuery.trim();
    setAiQuery('');
    setAiLoading(true);
    setAiMessages((prev) => [...prev, { role: 'user', text: q }]);
    try {
      const token = localStorage.getItem('axiom_token') || '';
      const wsRaw = localStorage.getItem('axiom_workspace');
      const wsId = wsRaw ? (JSON.parse(wsRaw)?.id || '') : '';
      const res = await fetch(`/api/v1/meetings/${meetingId}/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Workspace-ID': wsId },
        body: JSON.stringify({ question: q }),
      });
      if (res.ok) {
        const data = await res.json();
        const sources = data.sources?.length > 0
          ? '\n\n📌 Nguồn: ' + data.sources.slice(0, 2).map((s: {snippet: string}) => s.snippet?.slice(0, 80)).join(' | ')
          : '';
        setAiMessages((prev) => [...prev, { role: 'ai', text: data.answer + sources }]);
      } else {
        setAiMessages((prev) => [...prev, { role: 'ai', text: '⚠️ Không nhận được phản hồi từ AI.' }]);
      }
    } catch { setAiMessages((prev) => [...prev, { role: 'ai', text: '⚠️ Lỗi kết nối.' }]); }
    finally { setAiLoading(false); }
  };

  const initJitsi = async () => {
    // Xin quyền camera & mic ở top-level trước để Jitsi (iframe) không bị lỗi
    // Nếu camera bị chiếm bởi app khác, vẫn cho phép Jitsi chạy với audio-only
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.warn('Camera không khả dụng, thử audio-only:', e);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((track) => track.stop());
      } catch (e2) {
        console.warn('Audio cũng không khả dụng:', e2);
      }
    }

    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current || !meeting) return;

    // Remove any existing iframes just in case
    jitsiContainerRef.current.innerHTML = '';

    const domain = 'meet.jit.si';
    const options = {
      roomName: `DX-OS-SmartMeeting-${meeting.id}-${meeting.title.replace(/[^a-zA-Z0-9]/g, '')}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: true,
      },
      interfaceConfigOverwrite: {
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);

    // Add event listeners for DX-OS tracking & audio mute sync
    api.addEventListeners({
      videoConferenceJoined: () => {
        console.log('Joined meeting in DX-OS space');
      },
      videoConferenceLeft: () => {
        router.push('/meetings');
      },
      audioMuteStatusChanged: (event: { muted: boolean }) => {
        console.log('Jitsi audio mute status changed:', event.muted);
        setIsJitsiMuted(event.muted);
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <h1 className="text-2xl font-semibold">Meeting not found</h1>
        <Link href="/meetings">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary/20">
      <Script src="https://meet.jit.si/external_api.js" strategy="lazyOnload" onLoad={initJitsi} />

      <header className="h-16 px-6 border-b border-border/40 flex items-center justify-between shrink-0 bg-background z-10">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-sm tracking-tight">{meeting.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {new Date(meeting.start_time).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {meeting.duration_minutes} min
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            DX-OS Protocol Active
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Jitsi Meet (The Conference Video) */}
        <div className="flex-1 bg-black relative overflow-hidden">
          <div ref={jitsiContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Cinema-Style Bilingual Subtitles Overlay — Typewriter + Zero Re-render */}
          {subtitleVisible && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-[95%] max-w-[90vw] flex justify-center transition-all duration-300">
              <div
                className={`subtitle-overlay-container inline-block border-2 border-black px-6 py-4 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.5)]`}
                style={{
                  maxWidth: '100%',
                  wordWrap: 'break-word',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* English — Primary subtitle (ref-driven, no React re-render on streaming) */}
                <p 
                  className="subtitle-en-text font-sans font-black italic tracking-wide leading-snug break-words"
                  style={{
                    color: 'black',
                    textShadow: '-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0px 4px 4px rgba(0,0,0,0.3)',
                    fontSize: 'clamp(1.25rem, 3vw, 2rem)',
                    minHeight: '1.5em',
                  }}
                >
                  <span 
                    ref={processingRef}
                    className="inline-block text-emerald-600 font-sans font-black italic text-lg tracking-wide"
                    style={{
                      display: 'none',
                      textShadow: '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0px 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    Processing
                    <span className="processing-wave-dot ml-0.5" style={{ animationDelay: '0s' }}>.</span>
                    <span className="processing-wave-dot" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="processing-wave-dot" style={{ animationDelay: '0.4s' }}>.</span>
                  </span>
                  <span ref={enTextRef} />
                </p>
                {/* Vietnamese — Secondary subtitle (ref-driven typewriter streaming) */}
                <p 
                  ref={viTextRef}
                  className="subtitle-vi-text font-sans font-black italic tracking-wide leading-snug break-words mt-2"
                  style={{
                    color: 'black',
                    textShadow: '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0px 2px 3px rgba(0,0,0,0.3)',
                    fontSize: 'clamp(1rem, 2.25vw, 1.5rem)'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Tabbed Sidebar */}
        <div className="w-full lg:w-[400px] xl:w-[450px] bg-muted/30 border-l border-border/40 flex flex-col shrink-0 overflow-hidden">
          {/* Tab Nav */}
          <div className="flex border-b border-border/40 shrink-0">
            {(['agenda', 'files', 'ai'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                  activeTab === tab
                    ? tab === 'files' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : tab === 'ai' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'agenda' && <><FileText className="w-3.5 h-3.5" />Agenda</>}
                {tab === 'files' && <><Upload className="w-3.5 h-3.5" />Files ({uploadedFiles.length})</>}
                {tab === 'ai' && <><Sparkles className="w-3.5 h-3.5" />AI RAG</>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* AGENDA TAB */}
            {activeTab === 'agenda' && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Meeting Agenda</h3>
                  <span className="text-xs font-medium px-2 py-0.5 bg-green-500/10 text-green-600 rounded">Validated</span>
                </div>
                <Card className="border-border/50 shadow-none bg-background">
                  <CardContent className="p-4">
                    {meeting.agenda.split('\n').filter(Boolean).map((line, i) => (
                      <p key={i} className="flex items-start gap-2 text-sm leading-relaxed mb-2 last:mb-0">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span>{line}</span>
                      </p>
                    ))}
                  </CardContent>
                </Card>
                <p className="text-[11px] text-muted-foreground text-center">
                  Upload tài liệu vào tab <span className="text-emerald-500 font-semibold">Files</span> để AI chatbot đọc được nội dung.
                </p>
              </section>
            )}

            {/* FILES TAB */}
            {activeTab === 'files' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tài liệu cuộc họp</h3>
                  <span className="text-xs text-muted-foreground">{uploadedFiles.length} file</span>
                </div>

                <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 cursor-pointer hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all group">
                  {uploadingFile
                    ? <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
                    : <Upload className="w-7 h-7 text-emerald-500 group-hover:scale-110 transition-transform" />}
                  <span className="text-sm font-semibold text-emerald-500">
                    {uploadingFile ? 'Đang upload...' : 'Click để chọn tài liệu'}
                  </span>
                  <span className="text-xs text-muted-foreground">PDF, Word (.docx), Excel (.xlsx), TXT</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.md"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                </label>

                {uploadFeedback && (
                  <div className={`text-sm px-4 py-2.5 rounded-lg ${
                    uploadFeedback.startsWith('✅') ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}>{uploadFeedback}</div>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Đã upload</p>
                    {uploadedFiles.map((f, i) => {
                      const ext = f.filename.split('.').pop()?.toLowerCase() || '';
                      const icon = ext === 'pdf' ? '📄' : ext === 'docx' || ext === 'doc' ? '📝' : ext === 'xlsx' || ext === 'xls' ? '📊' : '📃';
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
                          <span className="text-lg">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{f.filename}</p>
                            <p className="text-xs text-muted-foreground uppercase">{ext}</p>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground text-center">✨ AI sẽ dùng các file này khi bạn hỏi trong tab AI RAG</p>
                  </div>
                )}

                {uploadedFiles.length === 0 && !uploadFeedback && (
                  <p className="text-xs text-muted-foreground text-center py-4">Chưa có tài liệu nào. Upload để AI chatbot có thể trả lời dựa vào nội dung.</p>
                )}
              </section>
            )}

            {/* AI RAG TAB */}
            {activeTab === 'ai' && (
              <section className="flex flex-col h-full space-y-3" style={{minHeight: '500px'}}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  AI RAG Chatbot
                </h3>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 pb-2" style={{maxHeight: '420px'}}>
                  {aiMessages.map((msg, i) => (
                    <div key={i} className={`flex ${ msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted border border-border/60 text-foreground rounded-tl-sm'
                      }`}>
                        {msg.role === 'ai' && <span className="text-xs font-semibold text-indigo-400 block mb-1">⚡ Axiom AI</span>}
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted border border-border/60 px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        <span className="text-sm text-muted-foreground">Đang suy nghĩ...</span>
                      </div>
                    </div>
                  )}
                  <div ref={aiBottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleAiQuery} className="flex gap-2 pt-2 border-t border-border/40">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    disabled={aiLoading}
                    placeholder={aiLoading ? 'Đang xử lý...' : 'Hỏi về agenda, tài liệu, transcript...'}
                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !aiQuery.trim()}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  </button>
                </form>
              </section>
            )}

            {/* STT Panel — always below tabs */}
            <section className="space-y-3 pt-4 border-t border-border/40">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Real-time Intelligence &amp; STT Translation
              </h3>
              <RealtimeSTTPanel isJitsiMuted={isJitsiMuted} onSubtitleUpdate={handleSubtitleUpdate} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
