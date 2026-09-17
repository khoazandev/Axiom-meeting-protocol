'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  FolderArchive,
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Bot,
  Sparkles,
  Send,
  ArrowLeft,
  ChevronRight,
  ListTodo,
  CheckSquare,
  Building2,
  ShieldCheck,
  AlertCircle,
  User,
  Quote,
  Layers,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  FileCheck,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  meetingApi,
  departmentApi,
  Meeting,
  TranscriptResponse,
  FollowUpTask,
  MeetingSummaryResponse,
  MeetingDecisionItem,
  RagQueryResponse,
} from '@/lib/api';
import { generateInitialsAvatar } from '@/components/profile/UserProfileModal';

export interface MeetingArchiveRepositoryProps {
  userRole: 'OWNER' | 'MANAGER' | 'MEMBER';
  departmentId?: string | null;
  departmentName?: string | null;
  onNotify?: (message: string) => void;
}

interface ChatMessageItem {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export function MeetingArchiveRepository({
  userRole,
  departmentId,
  departmentName,
  onNotify,
}: MeetingArchiveRepositoryProps) {
  // Navigation / View State
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'details' | 'chatbot'>('details');

  // Meeting Data State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Selected Meeting Details State
  const [transcripts, setTranscripts] = useState<TranscriptResponse[]>([]);
  const [summaryData, setSummaryData] = useState<MeetingSummaryResponse | null>(null);
  const [decisions, setDecisions] = useState<MeetingDecisionItem[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [transcriptSearchQuery, setTranscriptSearchQuery] = useState('');

  // AI Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isAskingAi, setIsAskingAi] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Owner Delete State
  const isOwner = userRole === 'OWNER';
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load meetings and department list
  useEffect(() => {
    loadMeetings();
    if (userRole === 'OWNER') {
      loadDepartments();
    }
  }, [userRole]);

  const loadDepartments = async () => {
    try {
      const depts = await departmentApi.list();
      if (depts && Array.isArray(depts)) {
        setDepartments(depts.map((d: any) => ({ id: d.id, name: d.name })));
      }
    } catch {
      // ignore
    }
  };

  const loadMeetings = async () => {
    setIsLoadingMeetings(true);
    try {
      // Owner sees all org meetings; Manager and Member are scoped by backend RBAC
      const data = await meetingApi.listWithFilters({
        all_org_meetings: userRole === 'OWNER',
      });
      // In Kho Tài Liệu: only concluded meetings
      const concluded = (data || []).filter((m) => {
        const s = (m.status || '').toUpperCase();
        return s === 'ENDED' || s === 'COMPLETED';
      });
      setMeetings(concluded);
    } catch (err: any) {
      console.error('Failed to load meetings for archive:', err);
      onNotify?.('Không thể tải danh sách cuộc họp trong kho');
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!meetingToDelete) return;
    setIsDeleting(true);
    try {
      await meetingApi.delete(meetingToDelete.id);
      setMeetings((prev) => prev.filter((m) => m.id !== meetingToDelete.id));
      if (selectedMeeting?.id === meetingToDelete.id) {
        setSelectedMeeting(null);
      }
      onNotify?.('Đã xóa cuộc họp khỏi kho lưu trữ thành công.');
      setMeetingToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete archived meeting:', err);
      alert(err?.message || 'Không thể xóa cuộc họp khỏi kho lưu trữ. Vui lòng kiểm tra quyền hạn của bạn.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Load details when a meeting is clicked
  useEffect(() => {
    if (!selectedMeeting) {
      setTranscripts([]);
      setSummaryData(null);
      setDecisions([]);
      setTasks([]);
      setChatMessages([]);
      return;
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const [transcriptsRes, summaryRes, decisionsRes, tasksRes] = await Promise.allSettled([
          meetingApi.getTranscripts(selectedMeeting.id),
          meetingApi.getSummary(selectedMeeting.id),
          meetingApi.getDecisions(selectedMeeting.id),
          meetingApi.getFollowUpTasks(selectedMeeting.id),
        ]);

        if (transcriptsRes.status === 'fulfilled') {
          setTranscripts(transcriptsRes.value || []);
        } else {
          setTranscripts([]);
        }

        if (summaryRes.status === 'fulfilled') {
          setSummaryData(summaryRes.value);
        } else {
          setSummaryData(null);
        }

        if (decisionsRes.status === 'fulfilled') {
          setDecisions(decisionsRes.value || []);
        } else {
          setDecisions([]);
        }

        if (tasksRes.status === 'fulfilled') {
          setTasks(tasksRes.value || []);
        } else {
          setTasks([]);
        }

        // Initialize welcome message for chatbot
        setChatMessages([
          {
            id: 'welcome-1',
            sender: 'ai',
            text: `Xin chào! Tôi là Trợ lý AI của cuộc họp **"${selectedMeeting.title}"**.\n\nTôi đã đồng bộ toàn bộ dữ liệu biên bản ghi âm, danh mục quyết định và nhiệm vụ đã giao. Bạn có thể hỏi tôi bất kỳ câu hỏi nào về nội dung cuộc thảo luận này.`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err) {
        console.error('Error fetching meeting details:', err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedMeeting]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeInspectorTab === 'chatbot') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeInspectorTab]);

  // Handle Ask AI
  const handleSendQuestion = async (queryText?: string) => {
    const q = (queryText || inputQuestion).trim();
    if (!q || !selectedMeeting || isAskingAi) return;

    setInputQuestion('');
    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsAskingAi(true);

    const startTime = Date.now();

    try {
      // Build brief chat history for RAG
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        sender: m.sender === 'user' ? 'User' : 'Assistant',
        text: m.text,
        isAi: m.sender === 'ai',
      }));

      const res: RagQueryResponse = await meetingApi.ragQuery(
        selectedMeeting.id,
        q,
        undefined,
        historyPayload
      );

      // Natural thinking delay: Ensure at least 850ms thinking time so user sees smooth typing animation
      const elapsed = Date.now() - startTime;
      const minThinkingTime = 850;
      if (elapsed < minThinkingTime) {
        await new Promise((resolve) => setTimeout(resolve, minThinkingTime - elapsed));
      }

      const aiMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answer || 'Tôi đã tra cứu nhưng không tìm thấy thông tin phù hợp trong dữ liệu cuộc họp này.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Failed to query RAG chatbot:', err);
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
      }
      const errMsg: ChatMessageItem = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Xin lỗi, không thể kết nối tới dịch vụ AI phân tích cuộc họp lúc này. Vui lòng thử lại sau ít phút.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsAskingAi(false);
    }
  };

  // Filtered Meetings
  const filteredMeetings = useMemo(() => {
    const list = meetings.filter((m) => {
      // Must be ended / completed
      const s = (m.status || '').toUpperCase();
      if (s !== 'ENDED' && s !== 'COMPLETED') return false;

      // Department Filter (for OWNER)
      if (userRole === 'OWNER' && selectedDeptFilter !== 'ALL') {
        if (m.department_id !== selectedDeptFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inTitle = (m.title || '').toLowerCase().includes(query);
        const inHost = (m.host_name || '').toLowerCase().includes(query);
        const inDept = (m.department_name || '').toLowerCase().includes(query);
        const inAgenda = (m.agenda || m.description || '').toLowerCase().includes(query);
        const inSummary = (m.summary || '').toLowerCase().includes(query);
        return inTitle || inHost || inDept || inAgenda || inSummary;
      }

      return true;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.ended_at || a.started_at || a.scheduled_at || a.created_at || 0).getTime();
      const timeB = new Date(b.ended_at || b.started_at || b.scheduled_at || b.created_at || 0).getTime();
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });
  }, [meetings, selectedDeptFilter, searchQuery, userRole, sortOrder]);

  // Filtered Transcripts
  const filteredTranscripts = useMemo(() => {
    if (!transcriptSearchQuery.trim()) return transcripts;
    const q = transcriptSearchQuery.toLowerCase();
    return transcripts.filter(
      (t) =>
        (t.content || '').toLowerCase().includes(q) ||
        (t.speaker_name || t.speaker || '').toLowerCase().includes(q)
    );
  }, [transcripts, transcriptSearchQuery]);

  // Helper date format
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa ấn định';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate meeting duration string
  const getMeetingDuration = (m: Meeting) => {
    if (m.started_at && m.ended_at) {
      try {
        const start = new Date(m.started_at).getTime();
        const end = new Date(m.ended_at).getTime();
        const mins = Math.max(1, Math.round((end - start) / 60000));
        return `${mins} phút`;
      } catch {
        // fallback
      }
    }
    if (m.duration_minutes) return `${m.duration_minutes} phút`;
    return '45 phút';
  };

  // Status Badge Rendering
  const renderStatusBadge = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'LIVE' || s === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          Đang diễn ra
        </span>
      );
    }
    if (s === 'ENDED' || s === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <CheckCircle2 size={12} className="text-emerald-500" />
          Đã lưu trữ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
        <Calendar size={12} className="text-blue-500" />
        Sắp diễn ra
      </span>
    );
  };

  // =========================================================================
  // VIEW 2: DETAILED MEETING INSPECTOR & AI COPILOT
  // =========================================================================
  if (selectedMeeting) {
    return (
      <div className="w-full space-y-3 animate-in fade-in duration-200">
        {/* Top Compact Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-xs transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left Info */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                title="Quay lại danh sách kho"
                className="shrink-0 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="px-2 py-0.2 rounded-md text-[10.5px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                    {selectedMeeting.department_name || 'Khối Doanh Nghiệp'}
                  </span>
                  {renderStatusBadge(selectedMeeting.status)}
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock size={11} /> {getMeetingDuration(selectedMeeting)}
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate" title={selectedMeeting.title}>
                  {selectedMeeting.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    {formatDateTime(selectedMeeting.scheduled_at || selectedMeeting.started_at || selectedMeeting.created_at)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <img
                      src={selectedMeeting.host_avatar || generateInitialsAvatar(selectedMeeting.host_name || 'Chủ trì')}
                      alt="Host"
                      className="w-3.5 h-3.5 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{selectedMeeting.host_name || 'Ban Điều Hành'}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-slate-400" />
                    {selectedMeeting.participant_count || 1} đại biểu
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Studio Mode Switcher & Owner Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setMeetingToDelete(selectedMeeting)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200/80 dark:border-rose-800/70 transition-all cursor-pointer shadow-2xs"
                  title="Xóa cuộc họp khỏi kho lưu trữ (Chỉ Owner)"
                >
                  <Trash2 size={13} />
                  <span>Xóa khỏi kho</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveInspectorTab('details')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeInspectorTab === 'details'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText size={14} />
                  <span>Biên Bản & Nhiệm Vụ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveInspectorTab('chatbot')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeInspectorTab === 'chatbot'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles size={14} className="text-indigo-500" />
                  <span>Trợ Lý AI Cuộc Họp</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoadingDetails && (
          <div className="w-full py-16 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Đang tải biên bản hội thoại và dữ liệu AI...</p>
          </div>
        )}

        {/* ── UNIFIED 2-COLUMN VIEWPORT-FITTING INSPECTOR ── */}
        {!isLoadingDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch h-[calc(100vh-190px)] min-h-[480px]">
            {/* LEFT COLUMN: VERBATIM TRANSCRIPT SCRIPT (6 cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col h-full overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <FileText size={15} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                      Biên Bản Hội Thoại Verbatim
                    </h2>
                    <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                      {filteredTranscripts.length} lượt phát biểu • Khớp từng phát ngôn
                    </p>
                  </div>
                </div>

                {/* Filter / Search within transcript */}
                <div className="relative w-full sm:w-48 shrink-0">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={transcriptSearchQuery}
                    onChange={(e) => setTranscriptSearchQuery(e.target.value)}
                    placeholder="Lọc lời thoại..."
                    className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Script dialogue flow - internal scroll */}
              <div className="mt-3 flex-1 overflow-y-auto min-h-0 pr-1.5 space-y-2.5 custom-scrollbar">
                {filteredTranscripts.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <FileText size={30} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold">Chưa có lượt phát biểu nào được ghi nhận</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Biên bản hội thoại sẽ được hiển thị tại đây khi hệ thống hoàn tất xử lý âm thanh.
                    </p>
                  </div>
                ) : (
                  filteredTranscripts.map((t, index) => {
                    const speakerName = t.speaker_name || t.speaker || 'Thành viên';
                    const isHost =
                      selectedMeeting.host_name &&
                      speakerName.toLowerCase().includes(selectedMeeting.host_name.toLowerCase());
                    const avatar = generateInitialsAvatar(speakerName);

                    return (
                      <div
                        key={t.id || index}
                        className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <img
                          src={avatar}
                          alt={speakerName}
                          className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 shrink-0 object-cover mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {speakerName}
                              </span>
                              {isHost && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                                  Chủ trì
                                </span>
                              )}
                            </div>
                            <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500 px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0">
                              {t.start_time || `0${Math.floor(index * 1.5)}:00`}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal select-text whitespace-pre-wrap">
                            {t.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: TABS (DETAILS OR CHATBOT) (6 cols) */}
            <div className="lg:col-span-6 flex flex-col h-full overflow-hidden">
              {activeInspectorTab === 'details' ? (
                <div className="h-full overflow-y-auto min-h-0 pr-1 space-y-3 custom-scrollbar">
                  {/* Box 1: Tóm Tắt & Nghị Quyết Cuộc Họp */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <CheckSquare size={15} />
                      </div>
                      <div>
                        <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                          Tóm Tắt & Nghị Quyết Cuộc Họp
                        </h2>
                        <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                          Bản tin điều hành MoM tổng hợp từ Agenda và Biên bản hội thoại
                        </p>
                      </div>
                    </div>

                    {/* Summary content */}
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
                        <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Quote size={11} className="text-blue-500" />
                          Tóm Tắt Tổng Quan
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                          {summaryData?.summary ||
                            selectedMeeting.summary ||
                            selectedMeeting.description ||
                            selectedMeeting.agenda ||
                            'Biên bản cuộc họp đã được ghi nhận và lưu trữ toàn vẹn trên hệ thống Axiom DX-OS.'}
                        </p>
                      </div>

                      {/* Decisions */}
                      {(summaryData?.decisions || selectedMeeting.decisions || decisions.length > 0) && (
                        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/50">
                          <h3 className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <CheckSquare size={11} className="text-emerald-600" />
                            Quyết Định & Thống Nhất Đã Chốt
                          </h3>
                          {decisions.length > 0 ? (
                            <ul className="space-y-1.5">
                              {decisions.map((d, i) => (
                                <li key={d.id || i} className="text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                  <span>{d.description}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                              {summaryData?.decisions || selectedMeeting.decisions}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Box 2: Action Items */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                          <ListTodo size={15} />
                        </div>
                        <div>
                          <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                            Nhiệm Vụ Được Giao (Action Items)
                          </h2>
                          <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                            {tasks.length} đầu việc đã được trích xuất từ cuộc họp
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {tasks.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                          <ListTodo size={26} className="mx-auto mb-2 opacity-40" />
                          <p className="text-xs font-semibold">Chưa có nhiệm vụ cụ thể nào được giao</p>
                        </div>
                      ) : (
                        tasks.map((task, idx) => {
                          const isDone = (task.status || '').toUpperCase() === 'DONE' || task.status === 'CONFIRMED';
                          return (
                            <div
                              key={task.id || idx}
                              className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 space-y-1.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {task.title}
                                </h4>
                                <span
                                  className={`text-[9.5px] font-extrabold px-1.5 py-0.2 rounded shrink-0 ${
                                    isDone
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {isDone ? 'Đã duyệt' : 'Chờ xác nhận'}
                                </span>
                              </div>

                              {task.description && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex items-center justify-between gap-2 pt-1 text-[10.5px] text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-700/50">
                                <div className="flex items-center gap-1.5 truncate">
                                  <User size={11} className="text-slate-400" />
                                  <span className="truncate text-slate-600 dark:text-slate-300 font-semibold">
                                    {task.assignee_name || 'Chưa phân công'}
                                  </span>
                                </div>
                                {task.deadline && (
                                  <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                                    <Clock size={10} />
                                    <span>{new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* CHATBOT MODE */
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col h-full overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Bot size={15} />
                      </div>
                      <div>
                        <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          Trợ Lý AI Kho Tri Thức
                          <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            LOCAL RAG
                          </span>
                        </h2>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Hỏi đáp trực tiếp dựa trên biên bản cuộc họp
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setChatMessages([
                          {
                            id: 'welcome-reset',
                            sender: 'ai',
                            text: `Tôi đã sẵn sàng. Bạn có thể hỏi bất kỳ thông tin nào về cuộc họp **"${selectedMeeting.title}"**.`,
                            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                          },
                        ])
                      }
                      title="Làm mới hội thoại"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>

                  {/* Quick Prompt Chips */}
                  <div className="flex items-center gap-1.5 pb-2 overflow-x-auto custom-scrollbar shrink-0">
                    {[
                      'Tóm tắt các quyết định quan trọng?',
                      'Ai được phân công việc gì?',
                      'Kế hoạch tiếp theo là gì?',
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuestion(suggestion)}
                        disabled={isAskingAi}
                        className="shrink-0 text-[10.5px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-all font-medium cursor-pointer"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  {/* Chat Messages Stream - internal scroll */}
                  <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2.5 custom-scrollbar p-1">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 max-w-[88%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold ${
                            msg.sender === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {msg.sender === 'user' ? 'U' : <Bot size={13} />}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <div
                            className={`p-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                              msg.sender === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-700/80'
                            }`}
                          >
                            <div className="prose prose-xs dark:prose-invert max-w-none break-words text-xs">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  ol: ({ node, ...props }) => (
                                    <ol className="list-decimal list-outside ml-4 space-y-2 my-2" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul className="list-disc list-outside ml-4 space-y-1.5 my-1.5" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="leading-relaxed pl-1" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong className="font-bold text-slate-900 dark:text-white" {...props} />
                                  ),
                                  em: ({ node, ...props }) => (
                                    <em className="italic text-indigo-600 dark:text-indigo-400 font-medium" {...props} />
                                  ),
                                  blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-2 border-indigo-500 pl-3 italic my-2 text-slate-600 dark:text-slate-300" {...props} />
                                  ),
                                  code: ({ node, ...props }) => (
                                    <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10.5px]" {...props} />
                                  ),
                                }}
                              >
                                {msg.text}
                              </ReactMarkdown>
                            </div>
                          </div>

                          <div
                            className={`text-[9px] text-slate-400 px-1 ${
                              msg.sender === 'user' ? 'text-right' : 'text-left'
                            }`}
                          >
                            {msg.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Messenger-style bouncing dots thinking indicator */}
                    {isAskingAi && (
                      <div className="flex gap-2 max-w-[88%] mr-auto items-end animate-in fade-in duration-150">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mb-1">
                          <Bot size={13} />
                        </div>
                        <div className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs flex items-center gap-1.5 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce [animation-delay:-0.32s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce [animation-delay:-0.16s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" />
                          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium ml-1.5 italic select-none">
                            AI đang suy nghĩ...
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input Bar (Pinned at bottom, shrink-0) */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendQuestion();
                    }}
                    className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0"
                  >
                    <input
                      type="text"
                      value={inputQuestion}
                      onChange={(e) => setInputQuestion(e.target.value)}
                      placeholder="Đặt câu hỏi về cuộc họp này..."
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!inputQuestion.trim() || isAskingAi}
                      className="w-18 shrink-0 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <span>Gửi</span>
                      <Send size={12} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: REPOSITORY BROWSER (GRID LIST OF MEETINGS)
  // =========================================================================
  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Metric Strip */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <FolderArchive size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Kho Tài Liệu Cuộc Họp
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  {userRole === 'OWNER' ? 'Toàn Công Ty' : departmentName || 'Phòng Ban Của Bạn'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lưu trữ biên bản hội thoại verbatim, tóm tắt điều hành MoM, danh mục nhiệm vụ và Trợ lý AI tra cứu chuyên sâu.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-center min-w-[90px]">
              <span className="block text-base font-black text-slate-900 dark:text-white">
                {meetings.length}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Biên bản lưu trữ</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-center min-w-[90px]">
              <span className="block text-base font-black text-emerald-600 dark:text-emerald-400">
                {meetings.reduce((sum, m) => sum + (m.task_count || 0), 0)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Nhiệm vụ đã giao</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên cuộc họp, chủ trì, nội dung thảo luận..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Department Filter (For OWNER only, or locked pill for Manager/Member) */}
          {userRole === 'OWNER' ? (
            <div className="shrink-0 w-44">
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Tất cả phòng ban</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="shrink-0 w-44 px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 truncate" title={departmentName || 'Phòng ban của bạn'}>
              {departmentName || 'Phòng ban của bạn'}
            </div>
          )}

          {/* Sort Order */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setSortOrder('NEWEST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortOrder === 'NEWEST'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Mới nhất
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('OLDEST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortOrder === 'OLDEST'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Cũ nhất
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Meeting Cards */}
      {isLoadingMeetings ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Đang đồng bộ dữ liệu kho cuộc họp...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8">
          <FolderArchive size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Không tìm thấy cuộc họp phù hợp</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Không có biên bản nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại trong kho.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMeetings.map((meeting) => {
            const duration = getMeetingDuration(meeting);
            const summarySnippet =
              meeting.summary ||
              meeting.description ||
              meeting.agenda ||
              'Nội dung cuộc thảo luận đã được lưu trữ an toàn. Nhấn để mở biên bản chi tiết.';

            return (
              <div
                key={meeting.id}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 truncate max-w-[170px]" title={meeting.department_name || 'Khối Doanh Nghiệp'}>
                      {meeting.department_name || 'Khối Doanh Nghiệp'}
                    </span>
                    {renderStatusBadge(meeting.status)}
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setSelectedMeeting(meeting)}
                    className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2"
                    title={meeting.title}
                  >
                    {meeting.title}
                  </h3>

                  {/* Meta Information Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {formatDateTime(meeting.scheduled_at || meeting.started_at || meeting.created_at)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {duration}
                    </span>
                  </div>

                  {/* Host & Attendees Info */}
                  <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 mb-3.5">
                    <div className="flex items-center gap-2 truncate">
                      <img
                        src={meeting.host_avatar || generateInitialsAvatar(meeting.host_name || 'Host')}
                        alt="Host"
                        className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={meeting.host_name || 'Chủ trì'}>
                        {meeting.host_name || 'Ban Tổ Chức'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1 font-medium">
                      <Users size={12} /> {meeting.participant_count || 1} đại biểu
                    </span>
                  </div>

                  {/* Summary Snippet Box */}
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/60 relative mb-4">
                    <p
                      className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed"
                      title={summarySnippet}
                    >
                      {summarySnippet}
                    </p>
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <ListTodo size={13} className="text-blue-500" />
                    {meeting.task_count || 0} việc
                  </span>

                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMeetingToDelete(meeting);
                        }}
                        title="Xóa cuộc họp khỏi kho lưu trữ (Chỉ Owner)"
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60 transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedMeeting(meeting)}
                      className="w-38 shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/70 dark:border-blue-800/60 transition-all cursor-pointer shadow-2xs group-hover:bg-blue-600 group-hover:text-white"
                    >
                      <span>Mở biên bản & AI</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal (Owner Only) */}
      {meetingToDelete && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xóa cuộc họp khỏi kho lưu trữ?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hành động này chỉ dành riêng cho Quản trị viên (Owner).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                {meetingToDelete.title}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Cuộc họp cùng toàn bộ biên bản hội thoại, tóm tắt và hành động liên quan sẽ bị xóa vĩnh viễn khỏi kho lưu trữ và cơ sở dữ liệu.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMeetingToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
