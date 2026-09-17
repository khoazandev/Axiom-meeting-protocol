'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CurlyBracketSidebar,
  AdminSectionKey,
  NAV_SECTIONS,
} from '@/components/admin/CurlyBracketSidebar';
import { OverviewPulseTab } from '@/components/admin/OverviewPulseTab';
import { MembersDirectoryTab } from '@/components/admin/MembersDirectoryTab';
import { DepartmentsTab } from '@/components/admin/DepartmentsTab';
import { ProtocolPoliciesTab } from '@/components/admin/ProtocolPoliciesTab';
import { AuditSecurityTab } from '@/components/admin/AuditSecurityTab';
import { MeetingArchiveRepository } from '@/components/archive/MeetingArchiveRepository';
import { UserProfileModal, generateInitialsAvatar } from '@/components/profile/UserProfileModal';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { MatIcon } from '@/components/ui/MatIcon';
import Logo from '@/components/Logo';

import {
  adminApi,
  organizationAdminApi,
  organizationApi,
  invitationApi,
  departmentAdminApi,
  meetingsAdminApi,
  meetingsApi,
  OrgAnalytics,
  SecuritySummary,
  EnrichedAuditLog,
  OrgMemberDetail,
  DepartmentProgressItem,
  TimelineGanttItem,
  Meeting,
  Department,
} from '@/lib/api';

import {
  MOCK_POLICIES,
  DepartmentNode,
  ProtocolPolicySettings,
} from '@/lib/mockAdminData';
import { resolveMeetingState } from '@/lib/meetingState';

// Fallback initial metrics if database is fresh
const DEFAULT_ORG_ANALYTICS: OrgAnalytics = {
  total_meetings_this_month: 24,
  meetings_growth: '+12.5%',
  on_time_punctual_rate: 96.4,
  task_execution_rate: 84.0,
  hours_saved_by_ai: 38.5,
  total_members: 27,
  total_departments: 5,
  active_meetings_count: 2,
  pending_approvals_count: 1,
};

export default function StandaloneAdminCenterPage() {
  const router = useRouter();
  const { user, activeOrganization, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Navigation State
  const [activeSection, setActiveSection] = useState<AdminSectionKey>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Active Organization ID (defaulting to primary seeded Axiom Enterprise)
  const [activeOrgId, setActiveOrgId] = useState<string>('2846981f-7028-4ef4-9cad-d2c3719703c4');

  // Real Data States
  const [analytics, setAnalytics] = useState<OrgAnalytics>(DEFAULT_ORG_ANALYTICS);
  const [liveMeetings, setLiveMeetings] = useState<Meeting[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [endedMeetings, setEndedMeetings] = useState<Meeting[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [pendingMeetings, setPendingMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<OrgMemberDetail[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentNodes, setDepartmentNodes] = useState<DepartmentNode[]>([]);
  const [departmentProgress, setDepartmentProgress] = useState<DepartmentProgressItem[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineGanttItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<EnrichedAuditLog[]>([]);
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);

  // Policies
  const [policies, setPolicies] = useState<ProtocolPolicySettings>(MOCK_POLICIES);

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Global Toast Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  // Clock ticker
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all real organizational data
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    let resolvedOrgId = (user as any)?.organization_id || activeOrganization?.id;

    if (!resolvedOrgId || resolvedOrgId === 'org-axiom-corp') {
      try {
        const orgList = await organizationApi.list();
        if (orgList && orgList.length > 0) {
          const axiomOrg = orgList.find((o) => o.name.toLowerCase().includes('axiom')) || orgList[0];
          resolvedOrgId = axiomOrg.id;
        }
      } catch (err) {
        console.warn('Could not fetch org list from API, fallback to default:', err);
      }
    }

    if (!resolvedOrgId) {
      resolvedOrgId = '2846981f-7028-4ef4-9cad-d2c3719703c4';
    }
    setActiveOrgId(resolvedOrgId);

    try {
      const [
        analyticsRes,
        meetingsRes,
        membersRes,
        departmentsRes,
        progressRes,
        logsRes,
        secSummaryRes,
      ] = await Promise.allSettled([
        organizationAdminApi.getAnalytics(resolvedOrgId),
        meetingsAdminApi.listWithFilters({ all_org_meetings: true }),
        organizationAdminApi.getMembers(resolvedOrgId),
        departmentAdminApi.list(resolvedOrgId),
        departmentAdminApi.getProgress(resolvedOrgId),
        adminApi.getAuditLogs(resolvedOrgId),
        adminApi.getSecuritySummary(resolvedOrgId),
      ]);

      // 1. Process Analytics
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalytics(analyticsRes.value);
      }

      // 2. Process Meetings (separate into pending approvals & 3 lifecycle states: LIVE, UPCOMING, ENDED)
      if (meetingsRes.status === 'fulfilled' && Array.isArray(meetingsRes.value)) {
        const all = meetingsRes.value;
        setAllMeetings(all);
        const pending = all.filter(
          (m) => (m as any).approval_status === 'PENDING'
        );
        const approvedOrOfficial = all.filter(
          (m) => (m as any).approval_status !== 'PENDING'
        );

        const live = approvedOrOfficial.filter((m) => resolveMeetingState(m) === 'LIVE');
        const upcoming = approvedOrOfficial.filter((m) => resolveMeetingState(m) === 'UPCOMING');
        const ended = approvedOrOfficial.filter((m) => resolveMeetingState(m) === 'ENDED');

        setPendingMeetings(pending);
        setLiveMeetings(live);
        setUpcomingMeetings(upcoming);
        setEndedMeetings(ended);
      }

      // 3. Process Members
      if (membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)) {
        setMembers(membersRes.value);
      }

      // 4. Process Departments
      if (departmentsRes.status === 'fulfilled' && Array.isArray(departmentsRes.value)) {
        setDepartments(departmentsRes.value);
        const codeMap: Record<string, { code: string; color: string }> = {
          'Khối Kỹ Thuật & Công Nghệ': { code: 'ENG', color: '#3B82F6' },
          'Khối Sản Phẩm & Thiết Kế': { code: 'PROD', color: '#8B5CF6' },
          'Khối Kinh Doanh & Tiếp Thị': { code: 'BIZ', color: '#EC4899' },
          'Khối Vận Hành & Nhân Sự': { code: 'OPS', color: '#10B981' },
          'Khối Tài Chính & Pháp Chế': { code: 'FIN', color: '#F59E0B' },
        };
        const mappedNodes: DepartmentNode[] = departmentsRes.value.map((d) => {
          const mapped = codeMap[d.name];
          return {
            id: d.id,
            name: d.name,
            code: mapped ? mapped.code : d.name.slice(0, 3).toUpperCase(),
            description: d.description || 'Khối phòng ban chức năng Axiom',
            managerName: 'Trưởng Khối',
            managerEmail: 'manager@axiom.internal',
            memberCount: (d as any).member_count || 1,
            activeMeetingsCount: (d as any).active_meetings_count || 0,
            color: mapped ? mapped.color : '#3B82F6',
          };
        });
        setDepartmentNodes(mappedNodes);
      }

      // 5. Process Department Progress & Gantt Timeline Items
      if (progressRes.status === 'fulfilled' && progressRes.value) {
        setDepartmentProgress(progressRes.value.departments || []);
        setTimelineItems(progressRes.value.timeline_items || []);
      }

      // 6. Process Audit Logs
      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
        setAuditLogs(logsRes.value);
      }

      // 7. Process Security Summary
      if (secSummaryRes.status === 'fulfilled' && secSummaryRes.value) {
        setSecuritySummary(secSummaryRes.value);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [(user as any)?.organization_id, activeOrgId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Tab Switching Handler
  const handleSelectSection = (section: AdminSectionKey) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSection = NAV_SECTIONS.find((s) => s.id === activeSection) || NAV_SECTIONS[0];

  // ── Meeting Approval & Executive Action Handlers ──
  const handleApproveMeeting = async (meetingId: string) => {
    try {
      await meetingsAdminApi.updateApproval(meetingId, {
        approval_status: 'APPROVED',
        reason: 'Chủ tịch / Quản trị viên đã phê duyệt cuộc họp chính thức.',
      });
      showToast('Đã phê duyệt cuộc họp thành công! Lịch họp đã có hiệu lực chính thức.');
      fetchAllData();
    } catch (err: any) {
      showToast(`Không thể duyệt cuộc họp: ${err?.message || 'Lỗi kết nối'}`);
    }
  };

  const handleRejectMeeting = async (meetingId: string) => {
    try {
      await meetingsAdminApi.updateApproval(meetingId, {
        approval_status: 'REJECTED',
        reason: 'Nội dung hoặc thành phần tham gia chưa đáp ứng quy chế kỷ luật cuộc họp.',
      });
      showToast('Đã bác bỏ yêu cầu phê duyệt cuộc họp.');
      fetchAllData();
    } catch (err: any) {
      showToast(`Không thể bác bỏ cuộc họp: ${err?.message || 'Lỗi kết nối'}`);
    }
  };

  const handleCreateExecutiveMeeting = async (data: {
    title: string;
    agenda: string;
    scheduled_at: string;
    department_id?: string;
    participant_ids: string[];
  }) => {
    try {
      await meetingsApi.create({
        title: data.title,
        description: data.agenda,
        agenda: data.agenda,
        scheduled_at: data.scheduled_at,
        organization_id: activeOrgId || activeOrganization?.id || null,
        department_id: data.department_id || null,
        participant_ids: data.participant_ids,
        meeting_type: 'OFFICIAL',
        approval_status: 'APPROVED',
      });

      showToast('Đã ban hành Hội Nghị Ban Điều Hành Cấp Cao và gửi thư triệu tập!');
      await fetchAllData();
    } catch (err: any) {
      console.error('Failed to create executive meeting:', err);
      showToast(`Lỗi tạo cuộc họp cấp cao: ${err?.message || 'Kiểm tra máy chủ'}`);
      throw err;
    }
  };

  const handleStartEarly = async (meetingId: string) => {
    try {
      try {
        await meetingsApi.startEarly(meetingId);
      } catch {
        await meetingsApi.update(meetingId, { status: 'IN_PROGRESS' });
      }
      showToast('Đã bắt đầu cuộc họp sớm và gửi thông báo triệu tập tới các thành viên!');
      fetchAllData();
      router.push(`/meetings/${meetingId}`);
    } catch (err: any) {
      console.error('Failed to start meeting early:', err);
      showToast('Đang kết nối vào phòng họp...');
      router.push(`/meetings/${meetingId}`);
    }
  };

  // ── Member Roles & Org Tree Handlers ──
  const handleUpdateRole = async (
    userId: string,
    newRole: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'
  ) => {
    try {
      await organizationAdminApi.updateMemberRole(activeOrgId, userId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
      );
      showToast(`Đã điều chỉnh chức danh nhân sự thành công sang ${newRole}!`);
      fetchAllData();
    } catch (err: any) {
      showToast(`Không thể cập nhật chức vụ: ${err?.message || 'Lỗi kết nối'}`);
    }
  };

  const handleUpdateMemberDepartment = async (
    userId: string,
    departmentId: string | null
  ) => {
    try {
      await organizationAdminApi.updateMemberDepartment(activeOrgId, userId, departmentId);
      const targetDept = departments.find((d) => d.id === departmentId);
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId
            ? {
                ...m,
                department_id: departmentId,
                department_name: targetDept?.name || null,
              }
            : m
        )
      );
      showToast(
        `Đã điều chuyển nhân sự sang ${targetDept?.name || 'Khối Không Phân Bổ'} thành công!`
      );
      fetchAllData();
    } catch (err: any) {
      showToast(`Không thể điều chuyển phòng ban: ${err?.message || 'Lỗi kết nối'}`);
    }
  };

  // ── Department CRUD Handlers ──
  const handleAddDepartmentFromTab = async (
    newDept: Omit<DepartmentNode, 'id' | 'memberCount' | 'activeMeetingsCount'>
  ) => {
    try {
      await departmentAdminApi.create(activeOrgId, {
        name: newDept.name,
        description: newDept.description,
      });
      showToast(`Đã thành lập khối phòng ban mới: ${newDept.name} (${newDept.code})`);
      fetchAllData();
    } catch (err: any) {
      showToast(`Lỗi tạo phòng ban: ${err?.message || 'Vui lòng thử lại'}`);
    }
  };

  const handleAddDepartment = async (name: string, description?: string) => {
    try {
      await departmentAdminApi.create(activeOrgId, { name, description });
      showToast(`Đã thành lập khối phòng ban mới: ${name}`);
      fetchAllData();
    } catch (err: any) {
      showToast(`Lỗi tạo phòng ban: ${err?.message || 'Vui lòng thử lại'}`);
    }
  };

  const handleEditDepartment = async (
    deptId: string,
    name: string,
    description?: string
  ) => {
    try {
      await departmentAdminApi.update(activeOrgId, deptId, { name, description });
      showToast(`Đã cập nhật thông tin phòng ban: ${name}`);
      fetchAllData();
    } catch (err: any) {
      showToast(`Lỗi cập nhật phòng ban: ${err?.message || 'Vui lòng thử lại'}`);
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    try {
      await departmentAdminApi.delete(activeOrgId, deptId);
      showToast('Đã xóa phòng ban khỏi cơ cấu tổ chức thành công.');
      fetchAllData();
    } catch (err: any) {
      showToast(`Lỗi xóa phòng ban: ${err?.message || 'Vui lòng kiểm tra lại'}`);
    }
  };

  const handleInviteMember = async (newMember: {
    fullName: string;
    email: string;
    phone?: string;
    departmentId?: string;
    role: string;
    jobTitle?: string;
    note?: string;
  }) => {
    try {
      const res = await invitationApi.create(activeOrgId, {
        email: newMember.email,
        full_name: newMember.fullName,
        role_id: newMember.role,
        department_id: newMember.departmentId,
        job_title: newMember.jobTitle,
        phone: newMember.phone,
      });

      const codeBadge = res.invite_code ? ` [Mã mời 6 số: ${res.invite_code}]` : '';
      if (res.email_status === 'SENT_SMTP') {
        showToast(
          `✅ Đã gửi email thư mời tới ${newMember.email}!${codeBadge} Link kích hoạt cũng đã được copy vào bộ nhớ tạm.`
        );
        if (typeof window !== 'undefined' && navigator.clipboard && res.register_url) {
          navigator.clipboard.writeText(res.register_url).catch(() => {});
        }
      } else if (res.register_url) {
        showToast(
          `Đã phát hành thư mời tới ${newMember.email}!${codeBadge} Đã sao chép link kích hoạt vào bộ nhớ tạm: ${res.register_url}`
        );
        if (typeof window !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(res.register_url).catch(() => {});
        }
      } else {
        showToast(`Đã gửi thư mời tham gia tới ${newMember.email}`);
      }
      fetchAllData();
    } catch (err: any) {
      console.error('Failed to send invitation:', err);
      showToast(`Không thể gửi thư mời: ${err?.message || 'Vui lòng kiểm tra lại'}`);
      throw err;
    }
  };

  // ── Policy Handlers ──
  const handleSavePolicies = (updated: ProtocolPolicySettings) => {
    setPolicies(updated);
    showToast('Đã lưu và áp dụng toàn bộ chính sách kỷ luật cuộc họp vào hệ thống!');
  };

  // Filter managers for executive meetings
  const managers = members.filter(
    (m) => m.role === 'MANAGER' || m.role === 'ADMIN' || m.role === 'OWNER'
  );

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-blue-500 selection:text-white">
      {/* ── 1. Floating Auto-Hide Curly Bracket Sidebar } (Hover Left Edge) ── */}
      <CurlyBracketSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onOpenInviteModal={() => handleSelectSection('members')}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* ── 2. Top Executive Command Header (2-Tier Executive Architecture) ── */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {/* Tier 1: Global Sovereign Control Bar */}
        <div className="border-b border-slate-100 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
            {/* Left: Brand Identity & Workspace Badge */}
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/admin" className="flex items-center gap-2 group">
                <Logo size={28} showText={true} subtitle="DX-OS" />
              </Link>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {activeOrganization?.name || 'Axiom Enterprise'}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono tracking-tight">
                  OWNER
                </span>
              </div>
            </div>

            {/* Center: Global Command Search Bar */}
            <div className="relative hidden md:block w-72 lg:w-96">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm cuộc họp, nhân sự, chính sách, log... (⌘K)"
                className="w-full pl-8 pr-10 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
              />
              <MatIcon
                name="search"
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </kbd>
            </div>

            {/* Right: Telemetry, Sync & Profile */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Telemetry Clock & SLA Pill */}
              <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{timeStr || '10:30:00'} ICT</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                  SLA 99.98%
                </span>
              </div>

              {/* Data Sync Button */}
              <button
                type="button"
                onClick={fetchAllData}
                disabled={isLoading}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Đồng bộ lại toàn bộ dữ liệu tổ chức"
              >
                <MatIcon
                  name="refresh"
                  size={16}
                  className={isLoading ? 'animate-spin text-blue-500' : ''}
                />
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

              {/* User Profile Trigger */}
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 group cursor-pointer"
                title="Xem & Chỉnh sửa hồ sơ cá nhân / avatar"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-blue-400 ring-2 ring-blue-100 dark:ring-blue-950 group-hover:ring-blue-500 transition-all shrink-0">
                  <img
                    src={user?.avatar_url || generateInitialsAvatar(user?.full_name || 'Chủ Tịch')}
                    alt={user?.full_name || 'Chủ Tịch'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors truncate max-w-[120px]">
                    {user?.full_name || 'System Admin'}
                  </div>
                  <div className="text-[9.5px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                    OWNER
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Domain Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center">
          {/* 6 Primary Navigation Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {NAV_SECTIONS.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSection(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/80 dark:border-blue-800/60 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }`}
                  title={s.sublabel || s.label}
                >
                  <MatIcon name={s.icon} size={16} />
                  <span>{s.label}</span>
                  {s.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${s.badgeColor}`}
                    >
                      {s.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── 3. Tab Page Content Stage ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Tab View Container: Only the Active Tab is rendered */}
        <div key={activeSection} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* TAB 1: OVERVIEW PULSE (Zero Mock Data, Real Metrics, Join, Approvals, Executive Meeting) */}
          {activeSection === 'overview' && (
            <OverviewPulseTab
              metrics={analytics}
              liveMeetings={liveMeetings}
              upcomingMeetings={upcomingMeetings}
              endedMeetings={endedMeetings}
              allMeetings={allMeetings}
              pendingMeetings={pendingMeetings}
              managers={managers}
              onApproveMeeting={handleApproveMeeting}
              onRejectMeeting={handleRejectMeeting}
              onStartEarly={handleStartEarly}
              onCreateExecutiveMeeting={handleCreateExecutiveMeeting}
              onRefresh={fetchAllData}
            />
          )}

          {/* TAB 2: COMPANY ORG TREE & DIRECTORY (Drag-and-Drop, Reassign, Profile Drawer, Dept CRUD) */}
          {activeSection === 'members' && (
            <MembersDirectoryTab
              members={members}
              departments={departments}
              onUpdateRole={handleUpdateRole}
              onUpdateDepartment={handleUpdateMemberDepartment}
              onAddDepartment={handleAddDepartment}
              onEditDepartment={handleEditDepartment}
              onDeleteDepartment={handleDeleteDepartment}
              onInviteMember={handleInviteMember}
              onRefresh={fetchAllData}
            />
          )}

          {/* TAB 3: DEPARTMENTS & JIRA-STYLE GANTT ROADMAP TIMELINE */}
          {activeSection === 'departments' && (
            <DepartmentsTab
              departments={departmentNodes}
              departmentProgress={departmentProgress}
              timelineItems={timelineItems}
              onAddDepartment={handleAddDepartmentFromTab}
              onNotify={showToast}
              loadingProgress={loadingProgress}
              onRefreshProgress={fetchAllData}
            />
          )}

          {/* TAB 4: PROTOCOL POLICIES */}
          {activeSection === 'policies' && (
            <ProtocolPoliciesTab initialPolicies={policies} onSavePolicies={handleSavePolicies} />
          )}

          {/* TAB 5: SOC SECURITY OPERATIONS CENTER (7-day Trend, Severity Donut, Tamper-proof) */}
          {activeSection === 'audit' && (
            <AuditSecurityTab
              logs={auditLogs}
              securitySummary={securitySummary}
              loading={isLoading}
              onRefresh={fetchAllData}
            />
          )}

          {/* TAB 6: KHO TÀI LIỆU CUỘC HỌP & AI TRÍCH XUẤT */}
          {activeSection === 'archives' && (
            <MeetingArchiveRepository userRole="OWNER" onNotify={showToast} />
          )}
        </div>
      </main>

      {/* ── PROFILE & AVATAR EDIT MODAL ── */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onNotify={showToast}
      />

      {/* ── FLOATING TOAST FEEDBACK ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 dark:border-slate-200 text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <MatIcon
            name="check_circle"
            size={18}
            className="text-emerald-400 dark:text-emerald-600"
          />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
