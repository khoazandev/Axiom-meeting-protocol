'use client';

import React, { useState } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import { OrgMemberItem, OrgRole } from '@/lib/mockAdminData';

interface MembersDirectoryTabProps {
  members: OrgMemberItem[];
  departments: string[];
  onUpdateRole: (memberId: string, newRole: OrgRole) => void;
  onToggleStatus: (memberId: string) => void;
  onInviteMember: (newMember: {
    fullName: string;
    email: string;
    department: string;
    role: OrgRole;
  }) => void;
}

export function MembersDirectoryTab({
  members,
  departments,
  onUpdateRole,
  onToggleStatus,
  onInviteMember,
}: MembersDirectoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Invite Modal Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDept, setInviteDept] = useState(departments[0] || 'Khối Kỹ Thuật');
  const [inviteRole, setInviteRole] = useState<OrgRole>('MEMBER');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Reusable options for AxiomSelect
  const departmentFilterOptions = [
    { value: 'ALL', label: 'Tất cả Phòng ban', icon: 'domain' },
    ...departments.map((dept) => ({
      value: dept,
      label: dept,
      icon: 'group',
    })),
  ];

  const roleFilterOptions = [
    { value: 'ALL', label: 'Tất cả Vai trò', icon: 'shield' },
    {
      value: 'OWNER',
      label: 'CHỦ TỊCH',
      description: 'Chủ tịch HĐQT & Quản trị tối cao',
      badge: 'Tối cao',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      value: 'MANAGER',
      label: 'TRƯỞNG PHÒNG',
      description: 'Quản lý & điều hành khối phòng ban',
      badge: 'Quản lý',
      badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    },
    {
      value: 'MEMBER',
      label: 'NHÂN VIÊN',
      description: 'Thành viên tiêu chuẩn',
      badge: 'Nhân viên',
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
  ];

  // Filter members
  const filteredMembers = members.filter((m) => {
    const matchQuery =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = selectedDept === 'ALL' || m.department === selectedDept;
    const matchRole = selectedRole === 'ALL' || m.role === selectedRole;
    return matchQuery && matchDept && matchRole;
  });

  const handleOpenInvite = () => {
    setInviteName('');
    setInviteEmail('');
    setGeneratedLink('');
    setCopiedLink(false);
    setIsInviteModalOpen(true);
  };

  const handleGenerateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    onInviteMember({
      fullName: inviteName.trim(),
      email: inviteEmail.trim(),
      department: inviteDept,
      role: inviteRole,
    });

    const token = Math.random().toString(36).substring(2, 10);
    setGeneratedLink(`https://axiom.internal/invite?token=${token}&org=Axiom-Enterprise`);
  };

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const getRoleBadgeStyle = (role: OrgRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300/80 dark:border-amber-700 font-extrabold';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300/80 dark:border-purple-700 font-bold';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300/80 dark:border-blue-700 font-semibold';
      case 'MEMBER':
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── Search & Filter Controls ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên, email, chức danh..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <MatIcon
            name="search"
            className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none"
          />
        </div>

        {/* Filters & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter (Seamless AxiomSelect with locked fixed width) */}
          <AxiomSelect
            value={selectedDept}
            onChange={setSelectedDept}
            options={departmentFilterOptions}
            width="195px"
            variant="connected"
            size="md"
          />

          {/* Role Filter (Seamless AxiomSelect with locked fixed width) */}
          <AxiomSelect
            value={selectedRole}
            onChange={setSelectedRole}
            options={roleFilterOptions}
            width="170px"
            variant="connected"
            size="md"
          />

          {/* Invite Button */}
          <button
            type="button"
            onClick={handleOpenInvite}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <MatIcon name="person_add" className="text-[16px]" />
            <span>Mời Nhân Sự</span>
          </button>
        </div>
      </div>

      {/* ── High Density Data Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Thành Viên</th>
                <th className="py-3 px-4">Phòng Ban & Vị Trí</th>
                <th className="py-3 px-4">Vai Trò RBAC</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Số Cuộc Họp</th>
                <th className="py-3 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Member Column */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                            {member.fullName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="truncate max-w-[220px]">
                        <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{member.fullName}</span>
                          {member.role === 'OWNER' && (
                            <MatIcon
                              name="verified"
                              filled
                              className="text-amber-500 text-[14px]"
                            />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Dept & Title */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {member.department}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                      {member.title}
                    </div>
                  </td>

                  {/* Role Selector with locked width */}
                  <td className="py-3.5 px-4">
                    {member.role === 'OWNER' ? (
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${getRoleBadgeStyle('OWNER')}`}
                      >
                        <MatIcon name="shield_person" size={13} />
                        <span>CHỦ TỊCH</span>
                      </span>
                    ) : (
                      <AxiomSelect
                        value={member.role}
                        onChange={(val) => onUpdateRole(member.id, val as OrgRole)}
                        size="sm"
                        variant="connected"
                        width="145px"
                        options={[
                          {
                            value: 'MANAGER',
                            label: 'TRƯỞNG PHÒNG',
                            description: 'Quản lý phòng ban',
                            badge: 'Quản lý',
                          },
                          {
                            value: 'MEMBER',
                            label: 'NHÂN VIÊN',
                            description: 'Thành viên tiêu chuẩn',
                            badge: 'Nhân viên',
                          },
                        ]}
                      />
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {member.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Hoạt động</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold border border-rose-200 dark:border-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>Tạm khóa</span>
                      </span>
                    )}
                    <div className="text-[10.5px] text-slate-400 mt-1">{member.lastActive}</div>
                  </td>

                  {/* Meetings Count */}
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {member.meetingsCount}
                    </span>{' '}
                    <span className="text-[11px] text-slate-400">cuộc họp</span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    {member.role !== 'OWNER' && (
                      <button
                        type="button"
                        onClick={() => onToggleStatus(member.id)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          member.status === 'ACTIVE'
                            ? 'text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                            : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        }`}
                      >
                        {member.status === 'ACTIVE' ? 'Tạm khóa' : 'Kích hoạt'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            Không tìm thấy nhân sự nào phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      {/* ── INVITE MEMBER MODAL ── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[20px]" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MatIcon name="person_add" filled className="text-[20px]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Mời Thành Viên Mới
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cấp tài khoản On-Premise và gán quyền RBAC.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateInvite} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên nhân sự
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Minh Châu"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email doanh nghiệp
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@axiom.internal"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phòng ban
                  </label>
                  <AxiomSelect
                    value={inviteDept}
                    onChange={setInviteDept}
                    options={departments.map((d) => ({ value: d, label: d, icon: 'group' }))}
                    className="w-full"
                    minWidth="100%"
                    variant="connected"
                    size="md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cấp bậc & Vai trò khởi tạo
                  </label>
                  <AxiomSelect
                    value={inviteRole}
                    onChange={(val) => setInviteRole(val as OrgRole)}
                    options={[
                      {
                        value: 'MEMBER',
                        label: 'NHÂN VIÊN',
                        description: 'Thành viên tiêu chuẩn phòng ban',
                        badge: 'Nhân viên',
                      },
                      {
                        value: 'MANAGER',
                        label: 'TRƯỞNG PHÒNG',
                        description: 'Quản lý & điều hành phòng ban',
                        badge: 'Quản lý',
                      },
                    ]}
                    className="w-full"
                    minWidth="100%"
                    variant="connected"
                    size="md"
                  />
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                    * Quyền hạn sẽ được áp dụng trực tiếp cho phòng ban được chỉ định.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer mt-2 active:scale-95"
              >
                Tạo Thư Mời & Sinh Link
              </button>
            </form>

            {/* Generated Link Box */}
            {generatedLink && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MatIcon name="check_circle" className="text-[14px]" />
                    <span>Đã tạo lời mời thành công!</span>
                  </span>
                  <span className="text-[10.5px] text-emerald-600">Hạn 48h</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[11px] font-mono text-slate-700 dark:text-slate-200 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    {copiedLink ? 'Đã copy!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
