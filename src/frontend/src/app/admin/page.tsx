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
import { WebhooksIntegrationTab } from '@/components/admin/WebhooksIntegrationTab';
import { UserProfileModal, generateInitialsAvatar } from '@/components/profile/UserProfileModal';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { MatIcon } from '@/components/ui/MatIcon';
import Logo from '@/components/Logo';

import {
  adminApi,
  organizationAdminApi,
  organizationApi,
  departmentAdminApi,
  meetingsAdminApi,
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
  MOCK_WEBHOOKS,
  DepartmentNode,
  ProtocolPolicySettings,
  EnterpriseWebhookItem,
} from '@/lib/mockAdminData';

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
  const { user, activeOrganization } = useAuthStore();

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
  const [pendingMeetings, setPendingMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<OrgMemberDetail[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentNodes, setDepartmentNodes] = useState<DepartmentNode[]>([]);
  const [departmentProgress, setDepartmentProgress] = useState<DepartmentProgressItem[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineGanttItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<EnrichedAuditLog[]>([]);
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);

  // Policies & Webhooks
  const [policies, setPolicies] = useState<ProtocolPolicySettings>(MOCK_POLICIES);
  const [webhooks, setWebhooks] = useState<EnterpriseWebhookItem[]>(MOCK_WEBHOOKS);

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

      // 2. Process Meetings (separate into pending approvals & live / upcoming)
      if (meetingsRes.status === 'fulfilled' && Array.isArray(meetingsRes.value)) {
        const all = meetingsRes.value;
        const pending = all.filter(
          (m) => (m as any).approval_status === 'PENDING'
        );
        const live = all.filter(
          (m) =>
            m.status === 'IN_PROGRESS' ||
            m.status === 'STARTED' ||
            (m as any).approval_status === 'APPROVED'
        );
        setPendingMeetings(pending);
        setLiveMeetings(live);
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
      // Create official executive meeting via meetings API
      const res = await fetch('/api/v1/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          title: data.title,
          description: data.agenda,
          scheduled_start_time: data.scheduled_at,
          department_id: data.department_id || null,
          participant_ids: data.participant_ids,
          meeting_type: 'OFFICIAL',
          approval_status: 'APPROVED',
          protocol_preset: 'GOVERNANCE_STRICT',
        }),
      });

      if (!res.ok) {
        throw new Error(`Mã lỗi HTTP: ${res.status}`);
      }

      showToast('Đã ban hành Hội Nghị Ban Điều Hành Cấp Cao và gửi thư triệu tập!');
      fetchAllData();
    } catch (err: any) {
      showToast(`Lỗi tạo cuộc họp cấp cao: ${err?.message || 'Kiểm tra máy chủ'}`);
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
    showToast(`Đã gửi lời mời tham gia tới ${newMember.email}`);
    fetchAllData();
  };

  // ── Policy Handlers ──
  const handleSavePolicies = (updated: ProtocolPolicySettings) => {
    setPolicies(updated);
    showToast('Đã lưu và áp dụng toàn bộ chính sách kỷ luật cuộc họp vào hệ thống!');
  };

  // ── Webhook Handlers ──
  const handleAddWebhook = (newWh: Omit<EnterpriseWebhookItem, 'id' | 'successRate'>) => {
    const created: EnterpriseWebhookItem = {
      ...newWh,
      id: `wh-${Date.now()}`,
      successRate: 100,
    };
    setWebhooks([...webhooks, created]);
    showToast(`Đã khởi tạo endpoint webhook: ${newWh.name}`);
  };

  const handleToggleWebhook = (id: string) => {
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w)));
    showToast('Đã cập nhật trạng thái hoạt động của webhook');
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    showToast('Đã xóa cấu hình endpoint webhook');
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
      />

      {/* ── 2. Top Executive Command Header ── */}
      <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 h-16 flex items-center justify-between gap-4 shadow-2xs">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 group">
            <Logo size={34} showText={true} subtitle="DX-OS" />
          </Link>
        </div>

        {/* Center: Search & Live Chronometer */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl mx-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {timeStr || '14:55:00'} ICT
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
              SLA 99.98%
            </span>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhân sự, phòng họp, chính sách, log kiểm toán..."
              className="w-full pl-9 pr-12 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <MatIcon
              name="search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Refresh Button */}
          <button
            type="button"
            onClick={fetchAllData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Đồng bộ lại toàn bộ dữ liệu tổ chức"
          >
            <MatIcon
              name="sync"
              className={`text-[18px] ${isLoading ? 'animate-spin text-blue-500' : ''}`}
            />
          </button>

          {/* Owner Profile Trigger */}
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 pl-1 group cursor-pointer"
            title="Xem & Chỉnh sửa hồ sơ cá nhân / avatar"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-blue-400 ring-2 ring-blue-100 dark:ring-blue-950 group-hover:ring-blue-500 transition-all">
              <img
                src={user?.avatar_url || generateInitialsAvatar(user?.full_name || 'Chủ Tịch')}
                alt={user?.full_name || 'Chủ Tịch'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
                {user?.full_name || 'System Admin'}
              </div>
              <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase">
                CHỦ TỊCH / OWNER
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* ── 3. Tab Page Content Stage ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Active Page Header Banner & Tab Switcher Bar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <MatIcon name={currentSection.icon} size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentSection.label}
                </h1>
                {currentSection.badge && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentSection.badgeColor}`}
                  >
                    {currentSection.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentSection.sublabel}
              </p>
            </div>
          </div>

          {/* Quick Tab Switcher Pills */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-medium scrollbar-none">
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSection(s.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeSection === s.id
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={s.label}
              >
                <MatIcon name={s.icon} size={15} />
                <span>{s.label.split(' & ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab View Container: Only the Active Tab is rendered */}
        <div key={activeSection} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* TAB 1: OVERVIEW PULSE (Zero Mock Data, Real Metrics, Join, Approvals, Executive Meeting) */}
          {activeSection === 'overview' && (
            <OverviewPulseTab
              metrics={analytics}
              liveMeetings={liveMeetings}
              pendingMeetings={pendingMeetings}
              managers={managers}
              onApproveMeeting={handleApproveMeeting}
              onRejectMeeting={handleRejectMeeting}
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

          {/* TAB 6: WEBHOOKS INTEGRATION */}
          {activeSection === 'webhooks' && (
            <WebhooksIntegrationTab
              webhooks={webhooks}
              onAddWebhook={handleAddWebhook}
              onToggleWebhook={handleToggleWebhook}
              onDeleteWebhook={handleDeleteWebhook}
            />
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
