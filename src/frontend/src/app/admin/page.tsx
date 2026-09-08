'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  MOCK_PULSE_METRICS,
  MOCK_LIVE_MEETINGS,
  MOCK_MEMBERS,
  MOCK_DEPARTMENTS,
  MOCK_POLICIES,
  MOCK_AUDIT_LOGS,
  MOCK_WEBHOOKS,
  OrgRole,
  OrgMemberItem,
  LiveRadarMeeting,
  DepartmentNode,
  ProtocolPolicySettings,
  EnterpriseWebhookItem,
} from '@/lib/mockAdminData';

export default function StandaloneAdminCenterPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Navigation State
  const [activeSection, setActiveSection] = useState<AdminSectionKey>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Data States
  const [pulseMetrics] = useState(MOCK_PULSE_METRICS);
  const [liveMeetings] = useState<LiveRadarMeeting[]>(MOCK_LIVE_MEETINGS);
  const [members, setMembers] = useState<OrgMemberItem[]>(MOCK_MEMBERS);
  const [departments, setDepartments] = useState<DepartmentNode[]>(MOCK_DEPARTMENTS);
  const [policies, setPolicies] = useState<ProtocolPolicySettings>(MOCK_POLICIES);
  const [auditLogs, setAuditLogs] = useState(MOCK_AUDIT_LOGS);
  const [webhooks, setWebhooks] = useState<EnterpriseWebhookItem[]>(MOCK_WEBHOOKS);

  // Quick Join Radar Modal State
  const [selectedMeetingForJoin, setSelectedMeetingForJoin] = useState<LiveRadarMeeting | null>(
    null
  );
  const [joinMode, setJoinMode] = useState<'audit' | 'intervene'>('audit');

  // Global Toast Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isScrollingFromClick = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

  // ── Tab Switching Handler (Chế độ Phân trang độc lập - Siêu nhẹ, mượt mà) ──
  const handleSelectSection = (section: AdminSectionKey) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSection = NAV_SECTIONS.find((s) => s.id === activeSection) || NAV_SECTIONS[0];

  // ── Members Handlers ──
  const handleUpdateRole = (memberId: string, newRole: OrgRole) => {
    setMembers((prev: OrgMemberItem[]) =>
      prev.map((m: OrgMemberItem) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    const target = members.find((m: OrgMemberItem) => m.id === memberId);
    const roleNames: Record<OrgRole, string> = {
      OWNER: 'CHỦ TỊCH',
      ADMIN: 'QUẢN TRỊ VIÊN',
      MANAGER: 'TRƯỞNG PHÒNG',
      MEMBER: 'NHÂN VIÊN',
    };
    showToast(
      `Đã đổi vai trò của ${target?.fullName || 'thành viên'} thành ${roleNames[newRole] || newRole}`
    );
  };

  const handleToggleStatus = (memberId: string) => {
    setMembers((prev: OrgMemberItem[]) =>
      prev.map((m: OrgMemberItem) =>
        m.id === memberId ? { ...m, status: m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : m
      )
    );
    const target = members.find((m: OrgMemberItem) => m.id === memberId);
    const newStatus = target?.status === 'ACTIVE' ? 'Đình chỉ' : 'Kích hoạt';
    showToast(`Đã ${newStatus} tài khoản của ${target?.fullName}`);
  };

  const handleInviteMember = (newMember: {
    fullName: string;
    email: string;
    department: string;
    role: OrgRole;
  }) => {
    const created: OrgMemberItem = {
      id: `usr-${Date.now()}`,
      fullName: newMember.fullName,
      email: newMember.email,
      department: newMember.department,
      role: newMember.role,
      status: 'ACTIVE',
      lastActive: 'Chưa đăng nhập',
      meetingsCount: 0,
      avatarUrl: undefined,
      title: 'Chuyên viên mới',
      joinedDate: 'Hôm nay',
    };
    setMembers([created, ...members]);
    showToast(`Đã gửi thư mời và cấp quyền ban đầu cho ${newMember.fullName}`);
  };

  // ── Department Handlers ──
  const handleAddDepartment = (
    newDept: Omit<DepartmentNode, 'id' | 'memberCount' | 'activeMeetingsCount'>
  ) => {
    const created: DepartmentNode = {
      ...newDept,
      id: `dept-${Date.now()}`,
      memberCount: 1,
      activeMeetingsCount: 0,
    };
    setDepartments([...departments, created]);
    showToast(`Đã thành lập khối phòng ban mới: ${newDept.name} (${newDept.code})`);
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

  // ── Quick Join Radar Handler ──
  const handleQuickJoin = (meeting: LiveRadarMeeting, mode: 'audit' | 'intervene' = 'audit') => {
    setSelectedMeetingForJoin(meeting);
    setJoinMode(mode);
  };

  const handleProceedJoin = () => {
    if (!selectedMeetingForJoin) return;
    router.push(`/meetings/${selectedMeetingForJoin.id}?role=OWNER&mode=${joinMode}`);
  };

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
        {/* Left: Brand Identity identical to Homepage */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 group">
            <Logo size={34} showText={true} subtitle="DX-OS" />
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 text-[11px] text-blue-600 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Rê chuột mép trái để mở menu</span>
          </div>
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
              placeholder="Tìm kiếm nhân sự, phòng họp, chính sách, log..."
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
                CHỦ TỊCH / CEO
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* ── 3. Tab Page Content Stage (Chế độ phân trang riêng biệt - Siêu nhẹ, mượt mà) ── */}
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
                title={`${s.label} (${s.shortcut})`}
              >
                <MatIcon name={s.icon} size={15} />
                <span>{s.label.split(' & ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab View Container: Only the Active Tab is rendered! */}
        <div key={activeSection} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          {activeSection === 'overview' && (
            <OverviewPulseTab
              metrics={pulseMetrics}
              liveMeetings={liveMeetings}
              onQuickJoin={handleQuickJoin}
            />
          )}

          {activeSection === 'members' && (
            <MembersDirectoryTab
              members={members}
              departments={departments.map((d) => d.name)}
              onUpdateRole={handleUpdateRole}
              onToggleStatus={handleToggleStatus}
              onInviteMember={handleInviteMember}
            />
          )}

          {activeSection === 'departments' && (
            <DepartmentsTab
              departments={departments}
              onAddDepartment={handleAddDepartment}
              onNotify={showToast}
            />
          )}

          {activeSection === 'policies' && (
            <ProtocolPoliciesTab initialPolicies={policies} onSavePolicies={handleSavePolicies} />
          )}

          {activeSection === 'audit' && <AuditSecurityTab logs={auditLogs} />}

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

      {/* ── SUPERVISORY QUICK JOIN MODAL ── */}
      {selectedMeetingForJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setSelectedMeetingForJoin(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                  joinMode === 'audit'
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                }`}
              >
                <MatIcon
                  name={joinMode === 'audit' ? 'headset_mic' : 'record_voice_over'}
                  size={24}
                />
              </div>
              <div>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    joinMode === 'audit'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  }`}
                >
                  {joinMode === 'audit'
                    ? 'Chế độ Dự thính Ẩn danh (Silent Audit)'
                    : 'Chế độ Điều hành Cấp cao (Executive Chair)'}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {selectedMeetingForJoin.title}
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs text-slate-600 dark:text-slate-300 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Khối phòng ban:</span>
                <strong className="text-slate-800 dark:text-slate-100">
                  {selectedMeetingForJoin.department}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Chủ tọa cuộc họp:</span>
                <strong className="text-slate-800 dark:text-slate-100">
                  {selectedMeetingForJoin.hostName}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Thời lượng hiện tại:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {selectedMeetingForJoin.duration ||
                    `${selectedMeetingForJoin.durationMinutes} phút`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Số lượng người tham gia:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {selectedMeetingForJoin.participantsCount ||
                    selectedMeetingForJoin.participantCount}{' '}
                  người
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11.5px] leading-relaxed">
                {joinMode === 'audit' ? (
                  <p className="text-blue-600 dark:text-blue-400 flex items-start gap-1.5">
                    <MatIcon name="info" size={16} className="shrink-0 mt-0.5" />
                    <span>
                      Khi dự thính ẩn danh, micro và camera của bạn sẽ bị vô hiệu hóa mặc định. Bạn
                      có thể kiểm tra âm thanh và tiến độ họp mà không làm phiền thành viên.
                    </span>
                  </p>
                ) : (
                  <p className="text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <MatIcon name="warning" size={16} className="shrink-0 mt-0.5" />
                    <span>
                      Bạn sẽ tham gia với tư cách Lãnh đạo cao nhất (OWNER). Hệ thống sẽ thông báo
                      cho chủ tọa về sự hiện diện của ban quản trị để điều hành hoặc can thiệp xử
                      lý.
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedMeetingForJoin(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleProceedJoin}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <MatIcon name="play_arrow" size={16} />
                <span>Tiến Hành Kết Nối</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
