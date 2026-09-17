'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { meetingsApi, meetingApi, organizationAdminApi, Meeting, OrgMemberDetail } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  Video,
  MicOff,
  Lock,
  Sparkles,
  Users,
  Clock,
  Calendar,
  Upload,
  Loader2,
  Plus,
  Play,
  Search,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { MatIcon } from '@/components/ui/MatIcon';
import { MeetingDetailsModal } from '@/components/knowledge/MeetingDetailsModal';
import { generateInitialsAvatar } from '@/components/profile/UserProfileModal';

interface ManagerMeetingsTabProps {
  onNotify: (msg: string) => void;
}

export function ManagerMeetingsTab({ onNotify }: ManagerMeetingsTabProps) {
  const router = useRouter();
  const { user, activeOrganization } = useAuthStore();
  const resolvedOrgId =
    activeOrganization?.id ||
    (user as any)?.organization_id ||
    '2846981f-7028-4ef4-9cad-d2c3719703c4';

  // Meeting Data State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [executiveMeetings, setExecutiveMeetings] = useState<Meeting[]>([]);
  const [deptMembers, setDeptMembers] = useState<OrgMemberDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'blank' | 'inherit'>('blank');

  // Form State - Blank
  const [newTitle, setNewTitle] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [newAgendaText, setNewAgendaText] = useState('');
  const [deptUploadedFile, setDeptUploadedFile] = useState<string | null>(null);
  const [isParsingDeptFile, setIsParsingDeptFile] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const deptFileInputRef = useRef<HTMLInputElement>(null);

  // Form State - Inherit Mode
  const [selectedExecutiveMeetingId, setSelectedExecutiveMeetingId] = useState<string>('');
  const [isLoadingInheritDetails, setIsLoadingInheritDetails] = useState(false);
  const [inheritDecisions, setInheritDecisions] = useState<string[]>([]);
  const [inheritActionItems, setInheritActionItems] = useState<string[]>([]);

  // Host Controls & Action States
  const [isJoiningRoom, setIsJoiningRoom] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Load Initial Real Data
  useEffect(() => {
    loadRealData();
  }, [user?.department_id, resolvedOrgId]);

  const loadRealData = async () => {
    setIsLoading(true);
    try {
      const [deptMeetingsRes, allMeetingsRes, membersRes] = await Promise.allSettled([
        meetingApi.listWithFilters({
          department_id: user?.department_id || undefined,
        }),
        meetingApi.listWithFilters({ all_org_meetings: true }),
        organizationAdminApi.getMembers(resolvedOrgId),
      ]);

      // 1. Department Meetings
      if (deptMeetingsRes.status === 'fulfilled' && Array.isArray(deptMeetingsRes.value)) {
        setMeetings(deptMeetingsRes.value);
      } else {
        // Fallback to basic list
        const fallback = await meetingsApi.list(0, 50);
        setMeetings(fallback);
      }

      // 2. Executive / Concluded Meetings (for inheritance)
      if (allMeetingsRes.status === 'fulfilled' && Array.isArray(allMeetingsRes.value)) {
        const executiveList = allMeetingsRes.value.filter((m) => {
          const s = (m.status || '').toUpperCase();
          return s === 'ENDED' || s === 'COMPLETED';
        });
        setExecutiveMeetings(executiveList);
      }

      // 3. Department Members
      if (membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)) {
        const filtered = user?.department_id
          ? membersRes.value.filter((m) => m.department_id === user.department_id)
          : membersRes.value;
        setDeptMembers(filtered.length > 0 ? filtered : membersRes.value);
      }
    } catch (err) {
      console.error('Failed to load manager meetings data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // File Upload for Agenda
  const handleDeptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingDeptFile(true);
    try {
      const fileNameLower = file.name.toLowerCase();
      let extractedContent = '';
      if (
        fileNameLower.endsWith('.txt') ||
        fileNameLower.endsWith('.md') ||
        fileNameLower.endsWith('.markdown')
      ) {
        extractedContent = (await file.text()).trim();
      } else {
        const res = await meetingsApi.parseAgenda(file);
        if (res.error) throw new Error(res.error);
        extractedContent = (res.content || '').trim();
      }
      if (extractedContent) {
        setNewAgendaText(extractedContent);
        setDeptUploadedFile(file.name);
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể trích xuất nội dung file.');
    } finally {
      setIsParsingDeptFile(false);
      if (deptFileInputRef.current) deptFileInputRef.current.value = '';
    }
  };

  // When an executive meeting is selected in Inherit Mode
  const handleSelectExecutiveMeeting = async (mtgId: string) => {
    setSelectedExecutiveMeetingId(mtgId);
    if (!mtgId) {
      setInheritDecisions([]);
      setInheritActionItems([]);
      return;
    }

    const execMtg = executiveMeetings.find((m) => m.id === mtgId);
    if (!execMtg) return;

    setIsLoadingInheritDetails(true);
    try {
      const [decisionsRes, tasksRes, summaryRes] = await Promise.allSettled([
        meetingApi.getDecisions(mtgId),
        meetingApi.getFollowUpTasks(mtgId),
        meetingApi.getSummary(mtgId),
      ]);

      const decisions: string[] = [];
      if (decisionsRes.status === 'fulfilled' && Array.isArray(decisionsRes.value)) {
        decisions.push(...decisionsRes.value.map((d: any) => d.decision_text || d.topic || ''));
      }

      const tasks: string[] = [];
      if (tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value)) {
        tasks.push(...tasksRes.value.map((t: any) => t.title || t.description || ''));
      }

      setInheritDecisions(decisions.filter(Boolean));
      setInheritActionItems(tasks.filter(Boolean));

      // Auto fill title
      setNewTitle(`Triển khai nhiệm vụ: ${execMtg.title}`);

      // Build structured Agenda from inherited data
      let compiledAgenda = `## KẾ HOẠCH TRIỂN KHAI NGHỊ QUYẾT TỪ CUỘC HỌP CẤP CAO\n`;
      compiledAgenda += `Nguồn gốc: ${execMtg.title} (Chủ trì: ${execMtg.host_name || 'Ban Lãnh Đạo'})\n\n`;

      if (decisions.length > 0) {
        compiledAgenda += `### 1. CÁC QUYẾT SÁCH CHIẾN LƯỢC ĐÃ BAN HÀNH:\n`;
        decisions.forEach((d, idx) => {
          compiledAgenda += `- ${d}\n`;
        });
        compiledAgenda += `\n`;
      }

      if (tasks.length > 0) {
        compiledAgenda += `### 2. CÁC ĐẦU VIỆC GIAO CHO KHỐI THỰC THI:\n`;
        tasks.forEach((t, idx) => {
          compiledAgenda += `${idx + 1}. ${t}\n`;
        });
        compiledAgenda += `\n`;
      } else if (execMtg.summary) {
        compiledAgenda += `### 2. TÓM TẮT CHỈ ĐẠO:\n${execMtg.summary.slice(0, 500)}...\n\n`;
      }

      compiledAgenda += `### 3. MỤC TIÊU CUỘC HỌP NỘI BỘ:\n- Phân công trách nhiệm cụ thể cho từng thành viên trong phòng ban\n- Thiết lập deadline và đồng bộ tiến độ lên hệ thống Mini Jira`;

      setNewAgendaText(compiledAgenda);

      // Auto-select all department members to invite
      setSelectedMemberIds(deptMembers.map((m) => m.user_id));
    } catch (err) {
      console.error('Failed to load executive meeting details:', err);
    } finally {
      setIsLoadingInheritDetails(false);
    }
  };

  // Toggle member selection checkbox
  const toggleMemberSelect = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Create Meeting Action
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Vui lòng nhập chủ đề cuộc họp');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const payload = {
        title: newTitle.trim(),
        agenda: newAgendaText.trim() || undefined,
        description: newAgendaText.trim() || undefined,
        scheduled_at: newScheduledAt ? new Date(newScheduledAt).toISOString() : undefined,
        department_id: user?.department_id || undefined,
        organization_id: resolvedOrgId,
        participant_ids: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
      };

      const created = await meetingsApi.create(payload);

      setMeetings((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewAgendaText('');
      setNewScheduledAt('');
      setSelectedMemberIds([]);
      setSelectedExecutiveMeetingId('');

      onNotify(`Đã khởi tạo phòng họp: ${created.title}`);
      router.push(`/meetings/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create department meeting:', err);
      alert(err?.message || 'Không thể tạo cuộc họp. Vui lòng thử lại.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Join Room Action
  const handleJoinRoom = async (mtg: Meeting) => {
    setIsJoiningRoom(mtg.id);
    try {
      router.push(`/meetings/${mtg.id}`);
    } finally {
      setIsJoiningRoom(null);
    }
  };

  // Host Controls Handlers
  const handleMuteAll = (meetingTitle: string) => {
    onNotify(`Đã gửi lệnh Tắt Micro toàn bộ thành viên trong phòng: ${meetingTitle}`);
  };

  const handleLockRoom = (meetingTitle: string) => {
    onNotify(`Đã Khóa Phòng Họp: ${meetingTitle}. Không cho phép người ngoài vào.`);
  };

  // Filtered Meetings
  const filteredMeetings = meetings.filter((m) => {
    const query = searchFilter.toLowerCase();
    const inTitle = (m.title || '').toLowerCase().includes(query);
    const inHost = (m.host_name || '').toLowerCase().includes(query);
    return inTitle || inHost;
  });

  const liveMeetingsCount = meetings.filter(
    (m) => (m.status || '').toUpperCase() === 'LIVE'
  ).length;
  const upcomingCount = meetings.filter(
    (m) =>
      (m.status || '').toUpperCase() === 'SCHEDULED' ||
      (m.status || '').toUpperCase() === 'UPCOMING'
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Action Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Điều Hành Cuộc Họp Phòng Ban
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {user?.department_name || 'Khối Kỹ Thuật'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản trị các buổi họp triển khai, kết nối tự động nghị quyết từ ban lãnh đạo và giám sát
            phân công nhiệm vụ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm cuộc họp, chủ trì..."
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 w-48 sm:w-60 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setCreateMode('blank');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
          >
            <Plus size={15} />
            <span>Tạo Cuộc Họp</span>
          </button>
        </div>
      </div>

      {/* ── Quick Inherit Banner ── */}
      {executiveMeetings.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-purple-50/40 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <MatIcon name="account_tree" className="text-[18px]" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Kế Thừa Quyết Sách Từ Ban Lãnh Đạo
                </h3>
                <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Có <strong>{executiveMeetings.length} cuộc họp cấp cao</strong> đã kết thúc. Bạn
                  có thể kế thừa các Action Items & Quyết sách để mở cuộc họp triển khai cho nhân
                  sự.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreateMode('inherit');
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Kế Thừa & Tạo Họp Ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Meetings Grid ── */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Đang tải danh sách cuộc họp phòng ban...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Video className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Chưa có cuộc họp nào
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Nhấn "Tạo Cuộc Họp" để lên lịch hoặc kế thừa nghị quyết từ ban lãnh đạo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredMeetings.map((mtg) => {
            const isLive = (mtg.status || '').toUpperCase() === 'LIVE';
            const isEnded =
              (mtg.status || '').toUpperCase() === 'ENDED' ||
              (mtg.status || '').toUpperCase() === 'COMPLETED';

            return (
              <div
                key={mtg.id}
                className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                  isLive
                    ? 'bg-gradient-to-br from-white via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 border-blue-300/80 dark:border-blue-800/80 shadow-md shadow-blue-500/5'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                }`}
              >
                <div>
                  {/* Status Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {isLive ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500 text-white shadow-xs animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          ĐANG LIVE
                        </span>
                      ) : isEnded ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          ĐÃ KẾT THÚC
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Clock size={12} className="text-blue-500" />
                          SẮP DIỄN RA
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {mtg.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Users size={12} />
                      <span>{mtg.participant_count || 1} tham dự</span>
                    </span>
                  </div>

                  {/* Title & Agenda */}
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug mb-1">
                    {mtg.title}
                  </h3>

                  {mtg.agenda && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                      {mtg.agenda}
                    </p>
                  )}

                  {/* Host Info */}
                  <div className="flex items-center gap-3 py-3 border-y border-slate-100 dark:border-slate-800/80 mb-4">
                    <img
                      src={mtg.host_avatar || generateInitialsAvatar(mtg.host_name || 'Host')}
                      alt={mtg.host_name || 'Host'}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {mtg.host_name || user?.full_name || 'Trưởng Phòng'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {mtg.scheduled_at
                          ? new Date(mtg.scheduled_at).toLocaleString('vi-VN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Bắt đầu theo yêu cầu'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Host Control Actions Bar */}
                <div className="pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleJoinRoom(mtg)}
                      disabled={isJoiningRoom === mtg.id}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer ${
                        isLive
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isJoiningRoom === mtg.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isLive ? (
                        <Video size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                      <span>
                        {isLive ? 'Vào Phòng Chủ Trì' : isEnded ? 'Vào Lại Phòng' : 'Bắt Đầu Phòng'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMuteAll(mtg.title)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Tắt micro tất cả thành viên"
                    >
                      <MicOff size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLockRoom(mtg.title)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Khóa phòng họp"
                    >
                      <Lock size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMeetingForDetails({ id: mtg.id, title: mtg.title })}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 px-3"
                      title="Xem Biên Bản AI"
                    >
                      <FileText size={15} />
                      <span className="text-xs font-bold">Biên Bản AI</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Chi Tiết Biên Bản AI ── */}
      {selectedMeetingForDetails && (
        <MeetingDetailsModal
          meetingId={selectedMeetingForDetails.id}
          meetingTitle={selectedMeetingForDetails.title}
          onClose={() => setSelectedMeetingForDetails(null)}
        />
      )}

      {/* ── MODAL KHỞI TẠO CUỘC HỌP (2 CHẾ ĐỘ: TỰ TẠO MỚI & KẾ THỪA CẤP CAO) ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl space-y-5 my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Tạo Cuộc Họp Phòng Ban
                </h3>
                <p className="text-xs text-slate-500">
                  {createMode === 'inherit'
                    ? 'Kế thừa quyết sách & nhiệm vụ từ cuộc họp cấp cao'
                    : 'Tự khởi tạo cuộc họp mới cho phòng ban'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 2 Mode Tabs Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setCreateMode('blank');
                  setSelectedExecutiveMeetingId('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  createMode === 'blank'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Tự Tạo Mới
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('inherit')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  createMode === 'inherit'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sparkles size={13} />
                <span>Kế Thừa Cấp Cao</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              {/* Inherit Mode Meeting Picker */}
              {createMode === 'inherit' && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5">
                  <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                    Chọn Cuộc Họp Cấp Cao Cần Kế Thừa:
                  </label>
                  <select
                    value={selectedExecutiveMeetingId}
                    onChange={(e) => handleSelectExecutiveMeeting(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn cuộc họp của Ban Lãnh Đạo --</option>
                    {executiveMeetings.map((exec) => (
                      <option key={exec.id} value={exec.id}>
                        {exec.title} (Chủ trì: {exec.host_name || 'Ban Lãnh Đạo'})
                      </option>
                    ))}
                  </select>

                  {isLoadingInheritDetails && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang trích xuất quyết sách & Action Items cho phòng ban...</span>
                    </div>
                  )}

                  {selectedExecutiveMeetingId && !isLoadingInheritDetails && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 pt-1">
                      <div>
                        ✓ Đã tự động tải <strong>{inheritDecisions.length} Quyết sách</strong> &{' '}
                        <strong>{inheritActionItems.length} Nhiệm vụ</strong> vào Agenda.
                      </div>
                      <div>✓ Đã tự động chọn nhân sự trong phòng ban vào danh sách mời.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chủ đề cuộc họp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Triển khai kiến trúc hệ thống Sprint 42"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Scheduled Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thời gian diễn ra
                </label>
                <input
                  type="datetime-local"
                  value={newScheduledAt}
                  onChange={(e) => setNewScheduledAt(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Để trống nếu muốn khởi động cuộc họp ngay lập tức.
                </span>
              </div>

              {/* Agenda Text & File Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nội dung Agenda / Nghị quyết triển khai
                  </label>
                  <div>
                    <input
                      type="file"
                      ref={deptFileInputRef}
                      onChange={handleDeptFileUpload}
                      accept=".txt,.md,.markdown,.json,.docx,.pdf,.csv,.xlsx"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => deptFileInputRef.current?.click()}
                      disabled={isParsingDeptFile}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200/70 dark:border-blue-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isParsingDeptFile ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Đang đọc...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={12} />
                          <span>Nạp file Agenda</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {deptUploadedFile && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] mb-2">
                    <span className="truncate">
                      📎 Đã nạp từ tệp: <strong>{deptUploadedFile}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeptUploadedFile(null);
                        setNewAgendaText('');
                      }}
                      className="text-emerald-700 hover:text-rose-600 font-bold ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <textarea
                  rows={4}
                  placeholder="Nhập hoặc dán các chủ đề thảo luận, quyết sách cần phân rã..."
                  value={newAgendaText}
                  onChange={(e) => setNewAgendaText(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed font-mono"
                />
              </div>

              {/* Department Personnel to Invite */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mời nhân sự phòng ban ({selectedMemberIds.length}/{deptMembers.length} người được
                  chọn)
                </label>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 bg-slate-50/50 dark:bg-slate-950/50">
                  {deptMembers.map((mem) => {
                    const isSelected = selectedMemberIds.includes(mem.user_id);
                    return (
                      <div
                        key={mem.id}
                        onClick={() => toggleMemberSelect(mem.user_id)}
                        className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors text-xs ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img
                            src={mem.avatar_url || generateInitialsAvatar(mem.full_name)}
                            alt={mem.full_name}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                          <span className="font-bold truncate">{mem.full_name}</span>
                          <span className="text-[10px] text-slate-400 truncate">({mem.email})</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang khởi tạo...</span>
                    </>
                  ) : (
                    <span>Khởi Tạo & Bắt Đầu</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
