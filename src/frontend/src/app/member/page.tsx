'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MemberCurlyBracketSidebar,
  MemberSectionKey,
  MEMBER_NAV_SECTIONS,
} from '@/components/member/MemberCurlyBracketSidebar';
import { MemberMeetingsTab } from '@/components/member/MemberMeetingsTab';
import { MemberJiraWorkspaceTab } from '@/components/member/MemberJiraWorkspaceTab';
import { MemberCalendarTab } from '@/components/member/MemberCalendarTab';
import { MemberKnowledgeTab } from '@/components/member/MemberKnowledgeTab';
import { MeetingArchiveRepository } from '@/components/archive/MeetingArchiveRepository';
import { MemberSettingsTab } from '@/components/member/MemberSettingsTab';
import { UserProfileModal, generateInitialsAvatar } from '@/components/profile/UserProfileModal';
import { useAuthStore } from '@/lib/store/useAuthStore';
import Logo from '@/components/Logo';
import {
  Search,
  CheckCircle2,
  Video,
  Clock,
  Bell,
  LogOut,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  Building2,
} from 'lucide-react';

import { authApi, invitationApi, organizationApi } from '@/lib/api';

function MemberWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, user, activeOrganization, updateUser } = useAuthStore();

  const tabParam = searchParams.get('tab') as MemberSectionKey | null;
  const initialTab: MemberSectionKey =
    tabParam && MEMBER_NAV_SECTIONS.some((s) => s.id === tabParam) ? tabParam : 'meetings';

  // Navigation State
  const [activeSection, setActiveSection] = useState<MemberSectionKey>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync tab with URL if param changes
  useEffect(() => {
    if (tabParam && MEMBER_NAV_SECTIONS.some((s) => s.id === tabParam)) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isUnjoined = !activeOrganization || user?.role === 'GUEST' || user?.role === 'CANDIDATE';

  const handleAcceptInvite = async (codeToUse?: string) => {
    const code = (codeToUse || inviteCodeInput).trim();
    if (!code) return;
    setAcceptingInvite(true);
    setInviteError(null);
    try {
      await invitationApi.accept(code);
      showToast('Chúc mừng! Bạn đã gia nhập tổ chức thành công.');
      const freshUser = await authApi.me();
      const orgs = await organizationApi.list();
      if (orgs.length > 0) {
        useAuthStore.getState().setAuth(freshUser, useAuthStore.getState().token || '', orgs, orgs[0]);
      } else {
        updateUser(freshUser);
      }
      setInviteCodeInput('');
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Mã lời mời không hợp lệ hoặc đã hết hạn.');
    } finally {
      setAcceptingInvite(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Clock ticker matching Owner page
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

  // Ensure member session has up-to-date department_id and department_name
  useEffect(() => {
    authApi
      .me()
      .then((freshUser) => {
        if (freshUser) {
          updateUser(freshUser);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectSection = (section: MemberSectionKey) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSection =
    MEMBER_NAV_SECTIONS.find((s) => s.id === activeSection) || MEMBER_NAV_SECTIONS[0];
  const CurrentIcon = currentSection.icon;

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-blue-500 selection:text-white antialiased">
      {/* ── 1. Floating Auto-Hide Curly Bracket Sidebar (Mirrors Owner /admin) ── */}
      <MemberCurlyBracketSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* ── 2. Top Executive Command Header (Mirrors Owner Sovereign Header) ── */}
      <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Identity & Company */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/member" className="flex items-center gap-2 group">
              <Logo size={32} showText={true} subtitle="DX-OS" />
            </Link>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            {activeOrganization ? (
              <>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[200px]"
                  title={`Doanh nghiệp: ${activeOrganization.name}`}
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{activeOrganization.name}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-extrabold tracking-tight shrink-0">
                  MEMBER
                </div>
              </>
            ) : (
              <>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-700 dark:text-amber-300 max-w-[200px]"
                  title="Tài khoản chưa gia nhập doanh nghiệp nào"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">Chưa vào công ty</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-mono font-extrabold tracking-tight shrink-0">
                  GUEST
                </div>
              </>
            )}
          </div>

          {/* Center: Search & Live Chronometer matching Owner Page */}
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm task, cuộc họp, sprint, tài liệu... (⌘K)"
                className="w-full pl-9 pr-12 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
              />
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right: Actions matching Owner Page */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Clock */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {timeStr || '14:55:00'} ICT
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                Sẵn sàng
              </span>
            </div>

            {/* Quick Meeting Action */}
            <button
              type="button"
              onClick={() => handleSelectSection('meetings')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Video size={14} />
              <span>+ Vào Họp Nhanh</span>
            </button>

            {/* Notification Button */}
            <button
              type="button"
              onClick={() => showToast('Tất cả hệ thống bình thường • 0 cảnh báo khẩn cấp')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
              title="Thông báo cá nhân"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Member Profile Trigger (Click to open UserProfileModal) */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 group cursor-pointer p-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
              title={`Hồ sơ: ${user?.full_name || 'Người dùng'} • ${activeOrganization ? `Thuộc ${activeOrganization.name}` : 'Chưa gia nhập tổ chức'}`}
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-950 group-hover:ring-emerald-500 transition-all shrink-0">
                <img
                  src={user?.avatar_url || generateInitialsAvatar(user?.full_name || 'Người dùng')}
                  alt={user?.full_name || 'Người dùng'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="hidden sm:block text-left max-w-[170px]">
                <div
                  className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors truncate"
                  title={user?.full_name || 'Người dùng'}
                >
                  {user?.full_name || 'Người dùng'}
                </div>
                <div
                  className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate"
                  title={activeOrganization ? `${activeOrganization.name} • ${user?.department_name || 'Thành viên trực thuộc'}` : 'Chưa gia nhập tổ chức'}
                >
                  {activeOrganization ? (
                    <>
                      <span className="truncate">{activeOrganization.name}</span>
                      <span>•</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                        MEMBER
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold truncate">Tài khoản tự do</span>
                      <span>•</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 shrink-0">
                        GUEST
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ── 3. Tab Page Content Stage (Mirrors Owner /admin Tab Page Content Stage) ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Active Page Header Banner & Tab Switcher Bar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <CurrentIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentSection.label}
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentSection.sublabel} • Phím tắt chuyển nhanh:{' '}
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  {currentSection.shortcut}
                </kbd>
              </p>
            </div>
          </div>

          {/* Quick Horizontal Pill Switcher Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto max-w-full">
            {MEMBER_NAV_SECTIONS.map((sec) => {
              const isSelected = activeSection === sec.id;
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectSection(sec.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{sec.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab View Container - 100% Full Width, EXACTLY 1 SIDEBAR */}
        {isUnjoined ? (
          <div className="max-w-3xl mx-auto py-8">
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/50 p-6 sm:p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 text-2xl shrink-0">
                  🌐
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-bold mb-1.5">
                    Trạng thái: Chưa gia nhập tổ chức
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Chào mừng {user?.full_name || 'bạn'}!
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Tài khoản của bạn đã được đăng ký thành công trên hệ thống Axiom nhưng <strong>chưa thuộc về bất kỳ doanh nghiệp hoặc phòng ban nào</strong>. Toàn bộ các cuộc họp, dự án Jira và tài liệu nội bộ sẽ được mở khóa sau khi bạn gia nhập tổ chức.
                  </p>
                </div>
              </div>

              {/* Pending Invitation Alert Card */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-base shrink-0">
                    📩
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                      Bạn có 1 lời mời tham gia từ Axiom Enterprise!
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Bộ Phận Nhân Sự & Tuyển Dụng • Mã lời mời: <span className="font-mono font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-300">AXM888</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAcceptInvite('AXM888')}
                  disabled={acceptingInvite}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {acceptingInvite ? 'Đang kích hoạt...' : 'Chấp nhận gia nhập ngay'}
                </button>
              </div>

              {inviteError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {inviteError}
                </div>
              )}

              {/* Cổng Ứng Viên, Nộp CV & Tham Gia Họp CTA */}
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shrink-0">
                    💼
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-950 dark:text-blue-100">
                      Cổng Tuyển Dụng, Nộp CV & Phòng Họp Trực Tuyến
                    </div>
                    <div className="text-[11px] text-blue-700 dark:text-blue-300">
                      Xem các vị trí đang tuyển của Axiom Enterprise, nộp CV, tạo phòng họp hoặc vào họp qua link.
                    </div>
                  </div>
                </div>
                <Link
                  href="/candidate/discovery"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all shrink-0 text-center"
                >
                  Mở Cổng Ứng Viên & Nộp CV
                </Link>
              </div>

              {/* 2 Options Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Nhập Invite Code thủ công */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                      <span>🎟️</span>
                      <span>Nhập Mã Lời Mời Khác</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                      Nếu Quản trị viên gửi cho bạn một mã thư mời hoặc token riêng, hãy nhập vào đây để gia nhập.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value)}
                      placeholder="Nhập mã lời mời (ví dụ: AXM888)..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAcceptInvite()}
                      disabled={!inviteCodeInput.trim() || acceptingInvite}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      {acceptingInvite ? 'Đang xử lý...' : 'Xác nhận mã'}
                    </button>
                  </div>
                </div>

                {/* Option 2: Khởi tạo Doanh Nghiệp Mới */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                      <span>🏢</span>
                      <span>Tự Thành Lập Doanh Nghiệp Mới</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                      Bạn muốn làm Chủ sở hữu (Owner)? Đăng ký một tổ chức mới của riêng bạn để quản lý nhân sự, phòng họp và Jira riêng biệt.
                    </p>
                  </div>
                  <Link
                    href="/register"
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold text-xs text-center block transition-colors shadow-xs"
                  >
                    Khởi tạo tổ chức mới
                  </Link>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Chính sách phân quyền RBAC: Dữ liệu phòng họp và sprint nội bộ được mã hóa và chỉ cấp quyền truy cập sau khi gia nhập thành công.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full transition-opacity duration-200">
            {activeSection === 'meetings' && <MemberMeetingsTab onNotify={showToast} />}
            {activeSection === 'jira' && <MemberJiraWorkspaceTab onNotify={showToast} />}
            {activeSection === 'calendar' && <MemberCalendarTab onNotify={showToast} />}
            {activeSection === 'knowledge' && (
              <MeetingArchiveRepository
                userRole="MEMBER"
                departmentId={user?.department_id}
                departmentName={user?.department_name || undefined}
                onNotify={showToast}
              />
            )}
            {activeSection === 'settings' && <MemberSettingsTab onNotify={showToast} />}
          </div>
        )}
      </main>

      {/* User Profile & Avatar Customization Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onNotify={showToast}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700/50 text-xs font-semibold">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F8FC] dark:bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MemberWorkspaceInner />
    </Suspense>
  );
}
