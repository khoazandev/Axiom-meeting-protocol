'use client';

import React, { useState } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import { OrgMemberDetail, Department } from '@/lib/api';
import { CompanyOrgTree } from './CompanyOrgTree';
import { UserHoverCard } from './UserHoverCard';

interface MembersDirectoryTabProps {
  members: OrgMemberDetail[];
  departments: Department[];
  onUpdateRole: (userId: string, newRole: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER') => Promise<void>;
  onUpdateDepartment: (userId: string, departmentId: string | null) => Promise<void>;
  onAddDepartment: (name: string, description?: string) => Promise<void>;
  onEditDepartment: (deptId: string, name: string, description?: string) => Promise<void>;
  onDeleteDepartment: (deptId: string) => Promise<void>;
  onInviteMember: (data: {
    fullName: string;
    email: string;
    phone?: string;
    departmentId?: string;
    role: string;
    jobTitle?: string;
    note?: string;
  }) => Promise<void>;
  onRefresh?: () => void;
}

export function MembersDirectoryTab({
  members,
  departments,
  onUpdateRole,
  onUpdateDepartment,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment,
  onInviteMember,
  onRefresh,
}: MembersDirectoryTabProps) {
  // View mode: 'tree' (Cây tổ chức) vs 'list' (Danh sách)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Edit role modal state for list view
  const [editingMember, setEditingMember] = useState<OrgMemberDetail | null>(null);
  const [newRoleVal, setNewRoleVal] = useState<'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteDeptId, setInviteDeptId] = useState(departments[0]?.id || '');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteJobTitle, setInviteJobTitle] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const filteredMembers = members.filter((m) => {
    const matchSearch =
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = selectedDeptFilter === 'ALL' || m.department_id === selectedDeptFilter;
    const matchRole = selectedRoleFilter === 'ALL' || m.role === selectedRoleFilter;
    return matchSearch && matchDept && matchRole;
  });

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await onInviteMember({
        fullName: inviteName.trim(),
        email: inviteEmail.trim(),
        phone: invitePhone.trim() || undefined,
        departmentId: inviteDeptId || undefined,
        role: inviteRole,
        jobTitle: inviteJobTitle.trim() || undefined,
        note: inviteNote.trim() || undefined,
      });
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteJobTitle('');
      setInviteNote('');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi lời mời');
    } finally {
      setIsInviting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border-purple-300';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── View Switcher & Action Header ── */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MatIcon name="corporate_fare" className="text-blue-600 text-[20px]" />
            <span>Cơ cấu nhân sự</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {members.length} nhân sự thuộc {departments.length} phòng ban chức năng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MatIcon name="account_tree" className="text-[16px]" />
              <span>Cây tổ chức</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MatIcon name="view_list" className="text-[16px]" />
              <span>Danh sách</span>
            </button>
          </div>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <MatIcon name="person_add" className="text-[16px]" />
            <span>Mời nhân sự</span>
          </button>
        </div>
      </div>

      {/* ── RENDERING EITHER TREE VIEW OR LIST VIEW ── */}
      {viewMode === 'tree' ? (
        <CompanyOrgTree
          members={members}
          departments={departments}
          onUpdateRole={onUpdateRole}
          onUpdateDepartment={onUpdateDepartment}
          onAddDepartment={onAddDepartment}
          onEditDepartment={onEditDepartment}
          onDeleteDepartment={onDeleteDepartment}
          onRefresh={onRefresh}
          onOpenInviteModal={() => setIsInviteModalOpen(true)}
        />
      ) : (
        /* ── DIRECTORY LIST VIEW ── */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhân sự theo tên, email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <MatIcon name="search" className="absolute left-2.5 top-2.5 text-[16px] text-slate-400" />
            </div>

            <div className="flex items-center gap-2">
              <AxiomSelect
                value={selectedDeptFilter}
                onChange={setSelectedDeptFilter}
                options={[
                  { value: 'ALL', label: 'Tất cả phòng ban' },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                width="170px"
              />

              <AxiomSelect
                value={selectedRoleFilter}
                onChange={setSelectedRoleFilter}
                options={[
                  { value: 'ALL', label: 'All Roles' },
                  { value: 'OWNER', label: 'OWNER' },
                  { value: 'ADMIN', label: 'ADMIN' },
                  { value: 'MANAGER', label: 'MANAGER' },
                  { value: 'MEMBER', label: 'MEMBER' },
                ]}
                width="150px"
              />
            </div>
          </div>

          {/* Members Table with UserHoverCard on rows */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Nhân sự</th>
                    <th className="p-3.5">Phòng ban</th>
                    <th className="p-3.5">Chức vụ</th>
                    <th className="p-3.5">Cuộc họp</th>
                    <th className="p-3.5">Nhiệm vụ</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        Không tìm thấy nhân sự phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <UserHoverCard member={m} align="top">
                            <div className="flex items-center gap-3 cursor-pointer">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-slate-200 dark:ring-slate-700">
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  m.full_name.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                  {m.full_name}
                                </p>
                                <p className="text-[11px] text-slate-500">{m.email}</p>
                              </div>
                            </div>
                          </UserHoverCard>
                        </td>
                        <td className="p-3.5">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {m.department_name || 'Chưa phân bổ'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadge(m.role)}`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {m.meetings_count}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {m.tasks_count}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setEditingMember(m);
                              setNewRoleVal(m.role);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 hover:text-blue-600 dark:text-slate-300 transition-all cursor-pointer"
                          >
                            Đổi vai trò
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ROLE MODAL (FOR LIST VIEW) ── */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Thay đổi vai trò: {editingMember.full_name}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vai trò mới
              </label>
              <AxiomSelect
                value={newRoleVal}
                onChange={(val) => setNewRoleVal(val as any)}
                options={[
                  { value: 'MEMBER', label: 'MEMBER' },
                  { value: 'MANAGER', label: 'MANAGER' },
                  { value: 'ADMIN', label: 'ADMIN' },
                  { value: 'OWNER', label: 'OWNER' },
                ]}
                width="100%"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onUpdateRole(editingMember.user_id, newRoleVal);
                    setEditingMember(null);
                  } catch (err: any) {
                    alert(err.message || 'Lỗi khi cập nhật vai trò');
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFESSIONAL INVITE MEMBER MODAL ── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MatIcon name="person_add" className="text-blue-600 text-[20px]" />
                  <span>Mời nhân sự mới</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Điền thông tin thành viên để cấp quyền truy cập hệ thống
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                <MatIcon name="close" className="text-[18px]" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Lê Minh Trí"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email công vụ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="tri.le@axiom.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="+84 912 345 678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vị trí công việc
                  </label>
                  <input
                    type="text"
                    value={inviteJobTitle}
                    onChange={(e) => setInviteJobTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Senior Frontend Engineer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Khối phòng ban trực thuộc
                </label>
                <AxiomSelect
                  value={inviteDeptId}
                  onChange={setInviteDeptId}
                  options={[
                    { value: '', label: 'Chưa phân bổ' },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                  width="100%"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vai trò hệ thống
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'MEMBER', label: 'MEMBER' },
                    { val: 'MANAGER', label: 'MANAGER' },
                    { val: 'ADMIN', label: 'ADMIN' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setInviteRole(item.val)}
                      className={`py-2 px-1 rounded-xl border text-xs font-bold cursor-pointer transition-all text-center ${
                        inviteRole === item.val
                          ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú nhân sự
                </label>
                <textarea
                  rows={2}
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Ghi chú về chuyên môn, dự án hoặc thông tin bổ sung..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {isInviting ? 'Đang gửi...' : 'Mời nhân sự'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
