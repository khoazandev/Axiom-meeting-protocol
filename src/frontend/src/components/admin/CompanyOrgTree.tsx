'use client';

import React, { useState, useMemo } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import { OrgMemberDetail, Department } from '@/lib/api';
import { UserHoverCard } from './UserHoverCard';
import {
  DEPARTMENT_ICONS,
  getDepartmentIcon,
  getCleanDeptDescription,
  formatDeptDescriptionWithIcon,
  getUsedDepartmentIcons,
  getFirstAvailableIcon,
} from '@/lib/departmentIcons';

interface CompanyOrgTreeProps {
  members: OrgMemberDetail[];
  departments: Department[];
  onUpdateRole: (
    userId: string,
    newRole: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'
  ) => Promise<void>;
  onUpdateDepartment: (userId: string, departmentId: string | null) => Promise<void>;
  onAddDepartment: (name: string, description?: string) => Promise<void>;
  onEditDepartment: (deptId: string, name: string, description?: string) => Promise<void>;
  onDeleteDepartment: (deptId: string) => Promise<void>;
  onRefresh?: () => void;
  onOpenInviteModal?: () => void;
}

export function CompanyOrgTree({
  members,
  departments,
  onUpdateRole,
  onUpdateDepartment,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment,
  onRefresh,
  onOpenInviteModal,
}: CompanyOrgTreeProps) {
  // Search input for quick filtering the tree
  const [treeSearch, setTreeSearch] = useState('');

  // Selected member for detail profile drawer
  const [selectedMember, setSelectedMember] = useState<OrgMemberDetail | null>(null);
  const [newRoleVal, setNewRoleVal] = useState<'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');
  const [newDeptVal, setNewDeptVal] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Drag & Drop State
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [dragOverDeptId, setDragOverDeptId] = useState<string | null>(null);

  // Add Department Modal
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [deptNameInput, setDeptNameInput] = useState('');
  const [deptDescInput, setDeptDescInput] = useState('');
  const [deptIconInput, setDeptIconInput] = useState('code');

  // Edit Department Modal
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Collapsed departments tracker
  const [collapsedDeptIds, setCollapsedDeptIds] = useState<string[]>([]);

  const toggleCollapse = (deptId: string) => {
    setCollapsedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  // Exactly ONE Chairman at the root level (User's System Admin account)
  const chairman = useMemo(() => {
    return (
      members.find((m) => m.email === 'admin@axiom.com') ||
      members.find((m) => m.full_name.toLowerCase().includes('admin')) ||
      members.find((m) => m.role === 'OWNER') ||
      members[0]
    );
  }, [members]);

  const getDeptMembers = (deptId: string) => {
    return members.filter((m) => m.department_id === deptId);
  };

  const unassignedMembers = useMemo(() => {
    return members.filter((m) => !m.department_id && m.id !== chairman?.id && m.role !== 'OWNER');
  }, [members, chairman]);

  // Handlers for Drawer
  const openMemberDetail = (member: OrgMemberDetail) => {
    setSelectedMember(member);
    setNewRoleVal(member.role);
    setNewDeptVal(member.department_id || '');
  };

  const handleSaveMemberChanges = async () => {
    if (!selectedMember) return;
    setIsUpdating(true);
    try {
      if (newRoleVal !== selectedMember.role) {
        await onUpdateRole(selectedMember.user_id, newRoleVal);
      }
      if (newDeptVal !== (selectedMember.department_id || '')) {
        await onUpdateDepartment(selectedMember.user_id, newDeptVal || null);
      }
      setSelectedMember(null);
    } catch (err: any) {
      alert(err.message || 'Không thể lưu thay đổi');
    } finally {
      setIsUpdating(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData('text/plain', userId);
    setDraggedUserId(userId);
  };

  const handleDragOver = (e: React.DragEvent, deptId: string) => {
    e.preventDefault();
    if (dragOverDeptId !== deptId) {
      setDragOverDeptId(deptId);
    }
  };

  const handleDragLeave = (deptId: string) => {
    if (dragOverDeptId === deptId) {
      setDragOverDeptId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, deptId: string | null) => {
    e.preventDefault();
    setDragOverDeptId(null);
    const userId = e.dataTransfer.getData('text/plain') || draggedUserId;
    if (userId) {
      try {
        await onUpdateDepartment(userId, deptId);
      } catch (err: any) {
        alert(err.message || 'Không thể chuyển phòng ban');
      }
    }
  };

  // Department CRUD
  const handleCreateDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptNameInput.trim()) return;
    try {
      const fullDesc = formatDeptDescriptionWithIcon(deptIconInput, deptDescInput.trim());
      await onAddDepartment(deptNameInput.trim(), fullDesc);
      setIsAddDeptModalOpen(false);
      setDeptNameInput('');
      setDeptDescInput('');
      setDeptIconInput('code');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo phòng ban');
    }
  };

  const handleEditDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !deptNameInput.trim()) return;
    try {
      const fullDesc = formatDeptDescriptionWithIcon(deptIconInput, deptDescInput.trim());
      await onEditDepartment(editingDept.id, deptNameInput.trim(), fullDesc);
      setEditingDept(null);
      setDeptNameInput('');
      setDeptDescInput('');
      setDeptIconInput('code');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi sửa phòng ban');
    }
  };

  const handleDeleteDeptClick = async (dept: Department) => {
    if (confirm(`Bạn có chắc muốn xóa phòng ban "${dept.name}"?`)) {
      try {
        await onDeleteDepartment(dept.id);
      } catch (err: any) {
        alert(err.message || 'Lỗi khi xóa phòng ban');
      }
    }
  };

  const isMatched = (text?: string | null) => {
    if (!text || !treeSearch.trim()) return false;
    return text.toLowerCase().includes(treeSearch.toLowerCase().trim());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── TOP TOOLBAR: SEARCH & SIMPLE ACTION BUTTONS ── */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              placeholder="Tìm kiếm nhân sự, phòng ban..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
            />
            <MatIcon
              name="search"
              className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Làm mới"
            >
              <MatIcon name="refresh" className="text-[18px]" />
            </button>
          )}

          {onOpenInviteModal && (
            <button
              onClick={onOpenInviteModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <MatIcon name="person_add" className="text-[16px]" />
              <span>Mời nhân sự</span>
            </button>
          )}

          <button
            onClick={() => {
              setDeptNameInput('');
              setDeptDescInput('');
              setDeptIconInput(getFirstAvailableIcon(departments));
              setIsAddDeptModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <MatIcon name="domain_add" className="text-[16px]" />
            <span>Thêm phòng ban</span>
          </button>
        </div>
      </div>

      {/* ── ORG TREE CANVAS CONTAINER (TREE HIERARCHY) ── */}
      <div className="p-8 rounded-3xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto min-h-[520px]">
        <div className="min-w-[900px] flex flex-col items-center">
          {/* ── LEVEL 1: ROOT - ONLY 1 CHAIRMAN / OWNER ── */}
          {chairman && (
            <div className="flex flex-col items-center relative z-20">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300/80 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold uppercase tracking-wider mb-3 shadow-2xs">
                <MatIcon name="workspace_premium" className="text-[16px] text-amber-500" />
                <span>OWNER</span>
              </div>

              {/* Chairman Card wrapped with UserHoverCard */}
              <UserHoverCard member={chairman} align="bottom">
                <div
                  onClick={() => openMemberDetail(chairman)}
                  className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-amber-400 dark:border-amber-500 shadow-md hover:shadow-xl transition-all cursor-pointer flex items-center gap-3.5 w-80 group ${
                    isMatched(chairman.full_name) || isMatched(chairman.email)
                      ? 'ring-2 ring-blue-500'
                      : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-amber-300 dark:ring-amber-500">
                      {chairman.avatar_url ? (
                        <img
                          src={chairman.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        chairman.full_name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
                      title="Trực tuyến"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {chairman.full_name}
                      </h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/80 shrink-0">
                        OWNER
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {chairman.email}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <MatIcon name="verified_user" className="text-[13px]" />
                        <span>Toàn quyền</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Rê chuột xem thông tin
                      </span>
                    </div>
                  </div>
                </div>
              </UserHoverCard>

              {/* Tree Root Stem Line dropping directly to departments */}
              <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-700 my-1" />
            </div>
          )}

          {/* ── LEVEL 2: FUNCTIONAL DEPARTMENTS (DIRECT CHILDREN OF CHAIRMAN) ── */}
          <div className="w-full relative">
            {/* Horizontal Distribution Beam */}
            <div className="relative flex justify-center">
              <div className="absolute top-0 left-16 right-16 h-0.5 bg-slate-300 dark:bg-slate-700" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
              {departments.map((dept) => {
                const deptMembers = getDeptMembers(dept.id);
                const manager = deptMembers.find((m) => m.role === 'MANAGER' || m.role === 'ADMIN');
                const regularMembers = deptMembers.filter((m) => m !== manager);
                const isCollapsed = collapsedDeptIds.includes(dept.id);
                const isDropTarget = dragOverDeptId === dept.id;
                const deptIcon = getDepartmentIcon(dept);

                const hasSearchMatch =
                  isMatched(dept.name) ||
                  (manager && (isMatched(manager.full_name) || isMatched(manager.email))) ||
                  regularMembers.some((mem) => isMatched(mem.full_name) || isMatched(mem.email));

                return (
                  <div
                    key={dept.id}
                    onDragOver={(e) => handleDragOver(e, dept.id)}
                    onDragLeave={() => handleDragLeave(dept.id)}
                    onDrop={(e) => handleDrop(e, dept.id)}
                    className={`rounded-2xl border transition-all flex flex-col bg-white dark:bg-slate-900 shadow-2xs relative ${
                      isDropTarget
                        ? 'border-blue-500 ring-4 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/40 scale-102'
                        : hasSearchMatch
                          ? 'border-blue-400/80 dark:border-blue-700 shadow-md'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    {/* Top branch vertical connector pin linking to Chairman beam */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-slate-300 dark:bg-slate-700" />

                    {/* Department Header with Single Distinct Icon */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Distinct Department Icon (Only 1 representative icon per department) */}
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs border border-blue-100 dark:border-blue-900/50">
                          <MatIcon name={deptIcon} className="text-[20px]" />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {dept.name}
                          </h4>
                          <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                            {deptMembers.length} thành viên
                          </span>
                        </div>
                      </div>

                      {/* Action buttons: Thu gọn/Mở rộng, Sửa, Xóa */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleCollapse(dept.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                        >
                          <MatIcon
                            name="chevron_right"
                            className={`text-[16px] transition-transform duration-200 ${
                              !isCollapsed ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDept(dept);
                            setDeptNameInput(dept.name);
                            setDeptDescInput(getCleanDeptDescription(dept.description));
                            setDeptIconInput(getDepartmentIcon(dept));
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title="Sửa phòng ban"
                        >
                          <MatIcon name="edit" className="text-[16px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeptClick(dept)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title="Xóa phòng ban"
                        >
                          <MatIcon name="delete" className="text-[16px]" />
                        </button>
                      </div>
                    </div>

                    {/* Department Branch Content */}
                    {!isCollapsed && (
                      <div className="p-4 space-y-3 flex-1 flex flex-col">
                        {/* Manager Lead Card wrapped with UserHoverCard */}
                        <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50">
                          <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>MANAGER</span>
                            <span className="text-[9.5px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-bold">
                              LEAD
                            </span>
                          </div>

                          {manager ? (
                            <UserHoverCard member={manager} align="top" className="w-full">
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, manager.user_id)}
                                onClick={() => openMemberDetail(manager)}
                                className="flex items-center gap-2.5 cursor-pointer hover:bg-white dark:hover:bg-slate-800 p-1.5 rounded-lg transition-all"
                              >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-blue-300">
                                  {manager.avatar_url ? (
                                    <img
                                      src={manager.avatar_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    manager.full_name.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {manager.full_name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {manager.email}
                                  </p>
                                </div>
                              </div>
                            </UserHoverCard>
                          ) : (
                            <div className="text-xs text-slate-400 italic py-1 flex items-center gap-1">
                              <MatIcon name="person_add" className="text-[14px]" />
                              <span>Chưa bổ nhiệm</span>
                            </div>
                          )}
                        </div>

                        {/* Members inside Department wrapped with UserHoverCard */}
                        <div className="space-y-2 flex-1">
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                            <span>MEMBERS • {regularMembers.length}</span>
                            <span className="text-[10px] text-slate-400">Kéo để chuyển</span>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {regularMembers.length === 0 ? (
                              <p className="text-xs text-slate-400 italic text-center py-3">
                                Chưa có thành viên
                              </p>
                            ) : (
                              regularMembers.map((member) => (
                                <UserHoverCard
                                  key={member.id}
                                  member={member}
                                  align="top"
                                  className="w-full"
                                >
                                  <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, member.user_id)}
                                    onClick={() => openMemberDetail(member)}
                                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing hover:shadow-2xs transition-all"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {member.avatar_url ? (
                                          <img
                                            src={member.avatar_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          member.full_name.slice(0, 2).toUpperCase()
                                        )}
                                      </div>
                                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                        {member.full_name}
                                      </span>
                                    </div>

                                    <span className="text-[9.5px] px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium shrink-0">
                                      {member.role}
                                    </span>
                                  </div>
                                </UserHoverCard>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── UNASSIGNED MEMBERS DOCK ── */}
          {unassignedMembers.length > 0 && (
            <div
              onDragOver={(e) => handleDragOver(e, 'unassigned')}
              onDragLeave={() => handleDragLeave('unassigned')}
              onDrop={(e) => handleDrop(e, null)}
              className="w-full mt-10 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MatIcon name="group_add" className="text-amber-500 text-[18px]" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nhân sự chưa phân bổ • {unassignedMembers.length}
                  </h4>
                </div>
                <span className="text-xs text-slate-500">
                  Kéo nhân viên thả vào phòng ban ở trên
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {unassignedMembers.map((m) => (
                  <UserHoverCard key={m.id} member={m} align="top">
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, m.user_id)}
                      onClick={() => openMemberDetail(m)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-white dark:hover:bg-slate-700 transition-all shadow-2xs"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100 flex items-center justify-center text-xs font-bold">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          m.full_name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {m.full_name}
                        </p>
                        <p className="text-[10.5px] text-slate-500 truncate">{m.email}</p>
                      </div>
                    </div>
                  </UserHoverCard>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PERSONNEL PROFILE DRAWER (MODAL DETAIL) ── */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[20px]" />
            </button>

            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md ring-2 ring-blue-300 dark:ring-blue-800">
                {selectedMember.avatar_url ? (
                  <img
                    src={selectedMember.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  selectedMember.full_name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {selectedMember.full_name}
                </h3>
                <p className="text-xs text-slate-500 truncate">{selectedMember.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                    {selectedMember.role}
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    Gia nhập: {new Date(selectedMember.joined_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phân quyền vai trò
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phân bổ phòng ban
                </label>
                <AxiomSelect
                  value={newDeptVal}
                  onChange={setNewDeptVal}
                  options={[
                    { value: '', label: 'Chưa phân bổ' },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                  width="100%"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 gap-3 text-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Cuộc họp tham gia</span>
                  <strong className="text-sm font-mono text-slate-900 dark:text-white">
                    {selectedMember.meetings_count || 0}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Nhiệm vụ đảm nhận</span>
                  <strong className="text-sm font-mono text-slate-900 dark:text-white">
                    {selectedMember.tasks_count || 0}
                  </strong>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={isUpdating}
                onClick={handleSaveMemberChanges}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD DEPARTMENT MODAL WITH ICON PICKER ── */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsAddDeptModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[20px]" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Thêm phòng ban
            </h3>

            <form onSubmit={handleCreateDeptSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên phòng ban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptNameInput}
                  onChange={(e) => setDeptNameInput(e.target.value)}
                  placeholder="Ví dụ: Khối Truyền Thông & Tiếp Thị"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Department Icon Library Selection with Exclusivity Rule */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Biểu tượng nhận diện
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Mỗi phòng ban sử dụng một biểu tượng duy nhất
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  {DEPARTMENT_ICONS.map((item) => {
                    const usedBy = getUsedDepartmentIcons(departments)[item.icon];
                    const isUsed = Boolean(usedBy);
                    const isSelected = deptIconInput === item.icon;

                    return (
                      <button
                        key={item.icon}
                        type="button"
                        disabled={isUsed}
                        onClick={() => setDeptIconInput(item.icon)}
                        title={
                          isUsed
                            ? `${item.label} (Đã dùng: ${usedBy})`
                            : `${item.label} - ${item.domain}`
                        }
                        className={`relative p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                          isUsed
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 pointer-events-none'
                            : isSelected
                              ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 scale-105 cursor-pointer font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer'
                        }`}
                      >
                        <MatIcon name={item.icon} className="text-[20px]" />
                        <span className="text-[9.5px] truncate max-w-full font-medium">
                          {item.label}
                        </span>
                        {isUsed && (
                          <span
                            className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[8px] font-bold border border-slate-300 dark:border-slate-600"
                            title={`Đã gán cho ${usedBy}`}
                          >
                            Đã dùng
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chức năng
                </label>
                <textarea
                  rows={2}
                  value={deptDescInput}
                  onChange={(e) => setDeptDescInput(e.target.value)}
                  placeholder="Mô tả nhiệm vụ trọng tâm..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Tạo phòng ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT DEPARTMENT MODAL WITH ICON PICKER ── */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setEditingDept(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[20px]" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Chỉnh sửa phòng ban
            </h3>

            <form onSubmit={handleEditDeptSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên phòng ban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptNameInput}
                  onChange={(e) => setDeptNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Department Icon Library Selection with Exclusivity Rule */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Biểu tượng nhận diện
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Mỗi phòng ban sử dụng một biểu tượng duy nhất
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  {DEPARTMENT_ICONS.map((item) => {
                    const usedBy = getUsedDepartmentIcons(departments, editingDept.id)[item.icon];
                    const isUsed = Boolean(usedBy);
                    const isSelected = deptIconInput === item.icon;

                    return (
                      <button
                        key={item.icon}
                        type="button"
                        disabled={isUsed}
                        onClick={() => setDeptIconInput(item.icon)}
                        title={
                          isUsed
                            ? `${item.label} (Đã dùng: ${usedBy})`
                            : `${item.label} - ${item.domain}`
                        }
                        className={`relative p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                          isUsed
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 pointer-events-none'
                            : isSelected
                              ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 scale-105 cursor-pointer font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer'
                        }`}
                      >
                        <MatIcon name={item.icon} className="text-[20px]" />
                        <span className="text-[9.5px] truncate max-w-full font-medium">
                          {item.label}
                        </span>
                        {isUsed && (
                          <span
                            className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[8px] font-bold border border-slate-300 dark:border-slate-600"
                            title={`Đã gán cho ${usedBy}`}
                          >
                            Đã dùng
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chức năng
                </label>
                <textarea
                  rows={2}
                  value={deptDescInput}
                  onChange={(e) => setDeptDescInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
