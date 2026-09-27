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
  X,
  RefreshCw,
} from 'lucide-react';
import { MatIcon } from '@/components/ui/MatIcon';
import { MeetingDetailsModal } from '@/components/knowledge/MeetingDetailsModal';
import { generateInitialsAvatar } from '@/components/profile/UserProfileModal';
import { resolveMeetingState, getMeetingStateBadge, MeetingState } from '@/lib/meetingState';

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | MeetingState>('ALL');

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
  const [inheritSummary, setInheritSummary] = useState<string>('');

  // Host Controls & Action States
  const [isJoiningRoom, setIsJoiningRoom] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Load Initial Real Data and keep refreshed
  useEffect(() => {
    loadRealData(true);
    const interval = setInterval(() => {
      loadRealData(false);
    }, 4000);

    const onFocus = () => {
      loadRealData(false);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.department_id, resolvedOrgId]);

  const loadRealData = async (showLoadingSpinner: boolean = false) => {
    if (showLoadingSpinner) {
      setIsLoading(true);
    }
    try {
      const [meetingsRes, membersRes] = await Promise.allSettled([
        meetingApi.listWithFilters(),
        organizationAdminApi.getMembers(resolvedOrgId),
      ]);

      // 1. All Meetings Accessible to this Manager (department meetings + invited executive meetings)
      if (meetingsRes.status === 'fulfilled' && Array.isArray(meetingsRes.value)) {
        const accessible = meetingsRes.value;
        setMeetings(accessible);

        // 2. Executive / Concluded Meetings (for inheritance)
        const executiveList = accessible
          .filter((m) => {
            const s = (m.status || '').toUpperCase();
            return s === 'ENDED' || s === 'COMPLETED' || !m.department_id;
          })
          .sort((a, b) => {
            const isAEnded =
              (a.status || '').toUpperCase() === 'ENDED' ||
              (a.status || '').toUpperCase() === 'COMPLETED';
            const isBEnded =
              (b.status || '').toUpperCase() === 'ENDED' ||
              (b.status || '').toUpperCase() === 'COMPLETED';
            if (isAEnded && !isBEnded) return -1;
            if (!isAEnded && isBEnded) return 1;
            return (
              new Date(b.created_at || b.scheduled_at || 0).getTime() -
              new Date(a.created_at || a.scheduled_at || 0).getTime()
            );
          });
        setExecutiveMeetings(executiveList);
      } else {
        // Fallback to basic list
        const fallback = await meetingsApi.list(0, 50);
        setMeetings(fallback);
      }

      // 3. Department Members - Strictly isolate to this manager's department only
      if (membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)) {
        const rawMembers = membersRes.value;
        const myDeptId =
          user?.department_id ||
          rawMembers.find(
            (m) =>
              (m.user_id === user?.id || m.email === user?.email) &&
              (m.role || '').toUpperCase() === 'MANAGER'
          )?.department_id ||
          rawMembers.find((m) => m.user_id === user?.id || m.email === user?.email)
            ?.department_id ||
          null;

        const filtered = myDeptId ? rawMembers.filter((m) => m.department_id === myDeptId) : [];
        setDeptMembers(filtered);
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

  // Helper to compile agenda markdown from inherited data
  const reapplyInheritedAgenda = (
    customExecMtg?: Meeting,
    decisions = inheritDecisions,
    tasks = inheritActionItems,
    summary = inheritSummary
  ) => {
    const target =
      customExecMtg || executiveMeetings.find((m) => m.id === selectedExecutiveMeetingId);
    if (!target) return;

    let compiled = `## KẾ HOẠCH TRIỂN KHAI NGHỊ QUYẾT TỪ BAN LÃNH ĐẠO\n`;
    compiled += `Nguồn gốc: ${target.title}\n`;
    compiled += `Chủ trì cấp cao: ${target.host_name || 'Ban Lãnh Đạo'}\n\n`;

    if (decisions.length > 0) {
      compiled += `### 1. CÁC QUYẾT SÁCH CHIẾN LƯỢC BAN HÀNH:\n`;
      decisions.forEach((d) => {
        compiled += `- ${d}\n`;
      });
      compiled += `\n`;
    }

    if (tasks.length > 0) {
      compiled += `### 2. ĐẦU VIỆC GIAO CHO KHỐI THỰC THI:\n`;
      tasks.forEach((t, idx) => {
        compiled += `${idx + 1}. ${t}\n`;
      });
      compiled += `\n`;
    } else if (summary) {
      compiled += `### 2. TÓM TẮT CHỈ ĐẠO CHÍNH:\n${summary.slice(0, 400)}...\n\n`;
    }

    compiled += `### 3. MỤC TIÊU PHIÊN HỌP NỘI BỘ PHÒNG BAN:\n`;
    compiled += `- Phân công trách nhiệm cụ thể cho từng thành viên trong phòng ban\n`;
    compiled += `- Thiết lập deadline và đồng bộ tiến độ lên hệ thống Mini Jira`;

    setNewAgendaText(compiled);
  };

  // When an executive meeting is selected in Inherit Mode
  const handleSelectExecutiveMeeting = async (mtgId: string) => {
    setSelectedExecutiveMeetingId(mtgId);
    if (!mtgId) {
      setInheritDecisions([]);
      setInheritActionItems([]);
      setInheritSummary('');
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

      let summaryText = '';
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        const sData = summaryRes.value;
        summaryText = sData.summary || '';
        setInheritSummary(summaryText);

        // If decisions is empty, extract from sData.decisions (string or list)
        if (decisions.length === 0 && sData.decisions) {
          const rawDec = (sData as any).decisions;
          if (typeof rawDec === 'string') {
            const lines = rawDec
              .split('\n')
              .map((l: string) =>
                l
                  .replace(/^[0-9]+[.)\s]+/, '')
                  .replace(/^[-*•]\s+/, '')
                  .trim()
              )
              .filter(Boolean);
            decisions.push(...lines);
          } else if (Array.isArray(rawDec)) {
            decisions.push(
              ...rawDec.map((d: any) =>
                typeof d === 'string' ? d : d.decision_text || d.topic || d.description || ''
              )
            );
          }
        }
      }

      const tasks: string[] = [];
      if (tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value)) {
        tasks.push(...tasksRes.value.map((t: any) => t.title || t.description || ''));
      }

      // If tasks is empty, check key_points from summary
      if (tasks.length === 0 && summaryRes.status === 'fulfilled' && summaryRes.value?.key_points) {
        const kp = summaryRes.value.key_points;
        if (typeof kp === 'string') {
          const lines = kp
            .split('\n')
            .map((l) =>
              l
                .replace(/^[0-9]+[.)\s]+/, '')
                .replace(/^[-*•]\s+/, '')
                .trim()
            )
            .filter(Boolean);
          tasks.push(...lines.slice(0, 5));
        }
      }

      const cleanDecisions = decisions.filter(Boolean);
      const cleanTasks = tasks.filter(Boolean);

      setInheritDecisions(cleanDecisions);
      setInheritActionItems(cleanTasks);

      // Auto fill title
      setNewTitle(`Triển khai nhiệm vụ: ${execMtg.title}`);

      // Reapply compiled agenda
      reapplyInheritedAgenda(execMtg, cleanDecisions, cleanTasks, summaryText);

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

      // Auto start meeting if created for immediate discussion
      try {
        await meetingsApi.startEarly(created.id);
      } catch (e) {
        console.warn('Auto startEarly failed:', e);
      }

      setMeetings((prev) => [
        {
          ...created,
          status: 'IN_PROGRESS',
          started_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewAgendaText('');
      setNewScheduledAt('');
      setSelectedMemberIds([]);
      setSelectedExecutiveMeetingId('');

      onNotify(`Đã khởi tạo và bắt đầu phòng họp: ${created.title}`);
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
      const state = resolveMeetingState(mtg);
      if (state === 'UPCOMING') {
        try {
          await meetingsApi.startEarly(mtg.id);
          setMeetings((prev) =>
            prev.map((m) =>
              m.id === mtg.id
                ? { ...m, status: 'IN_PROGRESS', started_at: new Date().toISOString() }
                : m
            )
          );
        } catch (e) {
          console.warn('startEarly failed:', e);
        }
      }
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

  // Meeting State Counts
  const allCount = meetings.length;
  const liveCount = meetings.filter((m) => resolveMeetingState(m) === 'LIVE').length;
  const upcomingCount = meetings.filter((m) => resolveMeetingState(m) === 'UPCOMING').length;
  const endedCount = meetings.filter((m) => resolveMeetingState(m) === 'ENDED').length;

  // Strict sorting priority: LIVE (1) -> UPCOMING (2) -> ENDED (3)
  const STATE_ORDER: Record<MeetingState, number> = {
    LIVE: 1,
    UPCOMING: 2,
    ENDED: 3,
  };

  // Filtered & Sorted Meetings by search & 3 states
  const filteredMeetings = meetings
    .filter((m) => {
      const query = searchFilter.toLowerCase();
      const inTitle = (m.title || '').toLowerCase().includes(query);
      const inHost = (m.host_name || '').toLowerCase().includes(query);
      const matchesSearch = inTitle || inHost;
      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      return resolveMeetingState(m) === statusFilter;
    })
    .sort((a, b) => {
      const orderA = STATE_ORDER[resolveMeetingState(a)] || 99;
      const orderB = STATE_ORDER[resolveMeetingState(b)] || 99;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = new Date(a.scheduled_at || a.started_at || a.created_at || 0).getTime();
      const timeB = new Date(b.scheduled_at || b.started_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

  const liveFilteredMeetings = filteredMeetings.filter((m) => resolveMeetingState(m) === 'LIVE');
  const upcomingFilteredMeetings = filteredMeetings.filter(
    (m) => resolveMeetingState(m) === 'UPCOMING'
  );
  const endedFilteredMeetings = filteredMeetings.filter((m) => resolveMeetingState(m) === 'ENDED');

  const renderMeetingCard = (meeting: Meeting) => {
    const state = resolveMeetingState(meeting);
    const badge = getMeetingStateBadge(state);
    const isLive = state === 'LIVE';
    const isUpcoming = state === 'UPCOMING';
    const isEnded = state === 'ENDED';

    return (
      <div
        key={meeting.id}
        onClick={() => {
          if (isEnded) {
            setSelectedMeetingForDetails({
              id: String(meeting.id),
              title: meeting.title,
            });
          }
        }}
        className={`p-4 rounded-xl border transition-all flex flex-col gap-3 shadow-2xs group ${
          isEnded ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-600' : ''
        } ${
          isLive
            ? 'border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 hover:border-emerald-400'
            : isUpcoming
              ? 'border-blue-200 dark:border-blue-800/70 bg-white dark:bg-slate-800/30 hover:border-blue-300'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800/50 opacity-95'
        }`}
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
              {meeting.department_name || user?.department_name || 'Khối Kỹ Thuật'}
            </span>

            {/* Dynamic State Badge (SẮP, ĐANG, KẾT THÚC) */}
            <div
              className={`flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${badge.color}`}
            >
              {badge.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              <span>{badge.label}</span>
            </div>
          </div>

          <h4
            className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1"
            title={meeting.title}
          >
            {meeting.title}
          </h4>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap gap-2">
            <span
              className={`flex items-center gap-1 font-mono font-semibold ${
                isLive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isUpcoming
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500'
              }`}
            >
              <Clock size={13} />
              <span>
                {isLive &&
                  (meeting.started_at
                    ? `Bắt đầu lúc: ${new Date(meeting.started_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'Đang diễn ra trực tiếp')}
                {isUpcoming &&
                  (meeting.scheduled_at
                    ? `Dự kiến: ${new Date(meeting.scheduled_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} (${new Date(meeting.scheduled_at).toLocaleDateString('vi-VN')})`
                    : 'Chưa tới giờ bắt đầu')}
                {isEnded &&
                  (meeting.ended_at
                    ? `Kết thúc: ${new Date(meeting.ended_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}`
                    : 'Cuộc họp đã kết thúc')}
              </span>
            </span>

            <span>
              Chủ trì:{' '}
              <strong className="text-slate-700 dark:text-slate-200">
                {meeting.host_name || user?.full_name || 'Trưởng Phòng'}
              </strong>
            </span>

            <span className="flex items-center gap-1 font-mono">
              <Users size={13} />
              <span>{meeting.participant_count || 1} người</span>
            </span>
          </div>

          {/* State-Specific Status Banner */}
          {isLive && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-0.5 h-4 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-0.5 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span className="w-0.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-75" />
                <span className="w-0.5 h-2.5 bg-emerald-500 rounded-full animate-pulse delay-150" />
                <span className="w-0.5 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9.5px] text-emerald-700 dark:text-emerald-400 font-mono ml-1 font-bold">
                  STT & AI MOM ENGINE ACTIVE
                </span>
              </div>
            </div>
          )}

          {isUpcoming && (
            <div className="flex items-center gap-2 pt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              <Clock size={13} />
              <span>
                Phòng họp đã lên lịch. Trưởng phòng có thể bấm "Bắt đầu sớm" để triệu tập họp ngay.
              </span>
            </div>
          )}

          {isEnded && (
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
              <FileText size={13} className="text-slate-400" />
              <span>
                Cuộc họp đã kết thúc. Nhấp vào đây để xem Biên bản AI tóm tắt & Kho tri thức lưu
                trữ.
              </span>
            </div>
          )}
        </div>

        {/* State-Specific Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {isLive && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMuteAll(meeting.title);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title="Tắt tiếng phòng họp"
                >
                  <MicOff size={13} />
                  <span>Tắt mic</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLockRoom(meeting.title);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title="Khóa phòng họp"
                >
                  <Lock size={13} />
                  <span>Khóa phòng</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEnded ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMeetingForDetails({
                    id: String(meeting.id),
                    title: meeting.title,
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <FileText size={13} />
                <span>Xem Biên Bản AI</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinRoom(meeting);
                }}
                disabled={isJoiningRoom === meeting.id}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs cursor-pointer active:scale-95 ${
                  isLive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isJoiningRoom === meeting.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : isLive ? (
                  <Video size={13} />
                ) : (
                  <Play size={13} />
                )}
                <span>{isLive ? 'Tham gia họp ngay' : 'Bắt đầu sớm'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

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

      {/* ── 3 Lifecycle State Filter Tabs (Đồng bộ với Owner) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'ALL'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-700 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>TẤT CẢ</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10.5px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {allCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('LIVE')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'LIVE'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>ĐANG DIỄN RA</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10.5px] font-mono bg-emerald-500 text-white font-bold">
            {liveCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('UPCOMING')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'UPCOMING'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-700 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Clock size={13} className="text-blue-500" />
          <span>SẮP DIỄN RA</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10.5px] font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
            {upcomingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ENDED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'ENDED'
              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 size={13} className="text-slate-500" />
          <span>ĐÃ KẾT THÚC</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10.5px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {endedCount}
          </span>
        </button>
      </div>

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
      ) : statusFilter === 'ALL' ? (
        <div className="space-y-6">
          {/* Section 1: LIVE Meetings */}
          {liveFilteredMeetings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Cuộc Họp Đang Diễn Ra ({liveFilteredMeetings.length})</span>
              </div>
              <div className="space-y-3.5">
                {liveFilteredMeetings.map((m) => renderMeetingCard(m))}
              </div>
            </div>
          )}

          {/* Section 2: UPCOMING Meetings */}
          {upcomingFilteredMeetings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <Clock size={14} className="text-blue-500" />
                <span>Cuộc Họp Sắp Diễn Ra ({upcomingFilteredMeetings.length})</span>
              </div>
              <div className="space-y-3.5">
                {upcomingFilteredMeetings.map((m) => renderMeetingCard(m))}
              </div>
            </div>
          )}

          {/* Section 3: ENDED Meetings */}
          {endedFilteredMeetings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <CheckCircle2 size={14} className="text-slate-400" />
                <span>Cuộc Họp Đã Kết Thúc ({endedFilteredMeetings.length})</span>
              </div>
              <div className="space-y-3.5">
                {endedFilteredMeetings.map((m) => renderMeetingCard(m))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">{filteredMeetings.map((m) => renderMeetingCard(m))}</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Sticky Header */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/90">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-xs">
                  {createMode === 'inherit' ? <Sparkles size={20} /> : <Plus size={20} />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                    Tạo Cuộc Họp Phòng Ban
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {createMode === 'inherit'
                      ? 'Kế thừa quyết sách, nhiệm vụ cấp cao và phân rã cho nhân sự'
                      : 'Tự khởi tạo cuộc họp mới và gửi lời mời đến nhân sự phòng ban'}
                  </p>
                </div>
              </div>

              {/* 2 Mode Tabs Switcher & Close */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl border border-slate-300/60 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode('blank');
                      setSelectedExecutiveMeetingId('');
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      createMode === 'blank'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Tự Tạo Mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('inherit')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      createMode === 'inherit'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>Kế Thừa Cấp Cao</span>
                    {executiveMeetings.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-extrabold ml-0.5">
                        {executiveMeetings.length}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form
              onSubmit={handleCreateMeeting}
              className="flex-1 overflow-y-auto p-5 md:p-6 flex flex-col justify-between"
            >
              {createMode === 'inherit' ? (
                /* INHERIT MODE: 2-COLUMN RESPONSIVE GRID */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT COLUMN: SOURCE SELECTION & EXTRACTED DATA */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                          <Sparkles size={13} />
                          <span>Bước 1: Nguồn Kế Thừa Cấp Cao</span>
                        </span>
                        {isLoadingInheritDetails && (
                          <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            <Loader2 size={12} className="animate-spin" />
                            <span>Đang trích xuất...</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Chọn Cuộc Họp Ban Lãnh Đạo *
                        </label>
                        <select
                          value={selectedExecutiveMeetingId}
                          onChange={(e) => handleSelectExecutiveMeeting(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Chọn cuộc họp cấp cao đã kết thúc --</option>
                          {executiveMeetings.map((exec) => (
                            <option key={exec.id} value={exec.id}>
                              {exec.title} (Chủ trì: {exec.host_name || 'Ban Lãnh Đạo'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Executive Meeting Info Card */}
                      {selectedExecutiveMeetingId && !isLoadingInheritDetails && (
                        <div className="space-y-3 pt-1">
                          {/* Badges summary */}
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                              ✓ {inheritDecisions.length} Quyết sách chiến lược
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-bold">
                              ✓ {inheritActionItems.length} Nhiệm vụ bàn giao
                            </span>
                          </div>

                          {/* Extracted Decisions & Tasks Scrollable Preview */}
                          <div className="max-h-56 overflow-y-auto space-y-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40 text-xs shadow-inner custom-scrollbar">
                            {inheritDecisions.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                                  <ShieldCheck size={13} className="text-blue-600" />
                                  <span>Quyết Sách Từ Ban Lãnh Đạo:</span>
                                </span>
                                <ul className="space-y-1 pl-4 text-slate-600 dark:text-slate-300 list-disc text-[11.5px] leading-relaxed">
                                  {inheritDecisions.map((d, idx) => (
                                    <li key={idx}>{d}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {inheritActionItems.length > 0 && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                                  <CheckCircle2 size={13} className="text-indigo-600" />
                                  <span>Nhiệm Vụ Cần Triển Khai:</span>
                                </span>
                                <ul className="space-y-1 pl-4 text-slate-600 dark:text-slate-300 list-decimal text-[11.5px] leading-relaxed">
                                  {inheritActionItems.map((t, idx) => (
                                    <li key={idx}>{t}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {inheritDecisions.length === 0 && inheritActionItems.length === 0 && (
                              <p className="text-[11px] text-slate-400 italic">
                                Cuộc họp chưa lưu quyết sách chi tiết; thông tin tóm tắt đã được AI
                                đưa vào Agenda.
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>💡 Đã tự động điền Agenda và chọn nhân sự phòng ban</span>
                            <button
                              type="button"
                              onClick={() => reapplyInheritedAgenda()}
                              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                            >
                              ↺ Tải lại mẫu Agenda
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: NEW MEETING SETUP & DEPT MEMBERS SELECTION */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    {/* Meeting Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Chủ đề cuộc họp phòng ban *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Triển khai quyết sách Sprint 42"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    {/* Scheduled Time */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Thời gian tổ chức
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Để trống nếu muốn bắt đầu ngay
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        value={newScheduledAt}
                        onChange={(e) => setNewScheduledAt(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Agenda & Upload */}
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

                    {/* Department Members Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Mời nhân sự phòng ban ({selectedMemberIds.length}/{deptMembers.length}{' '}
                          người)
                        </label>
                        <div className="flex items-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedMemberIds(deptMembers.map((m) => m.user_id))}
                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                          >
                            Chọn tất cả
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedMemberIds([])}
                            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                          >
                            Bỏ chọn
                          </button>
                        </div>
                      </div>

                      <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
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
                                <span className="text-[10px] text-slate-400 truncate">
                                  ({mem.email})
                                </span>
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
                  </div>
                </div>
              ) : (
                /* BLANK MODE: STRUCTURED RESPONSIVE VIEW */
                <div className="space-y-4 max-w-2xl mx-auto w-full">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Chủ đề cuộc họp phòng ban *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Triển khai kiến trúc hệ thống Sprint 42"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                    <div className="md:col-span-4">
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
                        Để trống nếu muốn họp ngay.
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Nội dung Agenda / Nghị quyết cuộc họp
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
                      rows={5}
                      placeholder="Nhập hoặc dán các chủ đề thảo luận, phân công công việc..."
                      value={newAgendaText}
                      onChange={(e) => setNewAgendaText(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Mời nhân sự phòng ban ({selectedMemberIds.length}/{deptMembers.length}{' '}
                        người)
                      </label>
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedMemberIds(deptMembers.map((m) => m.user_id))}
                          className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedMemberIds([])}
                          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
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
                              <span className="text-[10px] text-slate-400 truncate">
                                ({mem.email})
                              </span>
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
                </div>
              )}

              {/* Sticky Footer Action Bar */}
              <div className="shrink-0 mt-6 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                  <Users size={13} className="text-blue-500 shrink-0" />
                  <span className="truncate font-medium">
                    {selectedMemberIds.length > 0
                      ? `Đã chọn ${selectedMemberIds.length} nhân sự tham gia`
                      : 'Chưa chọn nhân sự nào'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="w-24 shrink-0 h-9 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate || !newTitle.trim()}
                    className="w-48 shrink-0 min-w-[180px] h-9 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingCreate ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Đang khởi tạo...</span>
                      </>
                    ) : (
                      <>
                        <span>Khởi Tạo & Bắt Đầu</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
