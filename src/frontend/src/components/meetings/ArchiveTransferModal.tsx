'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Archive,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  Clock,
  UserCheck,
  User as UserIcon,
  Tag,
} from 'lucide-react';
import { Meeting, organizationAdminApi, meetingsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';

export interface ActionItemDraft {
  id: string;
  title: string;
  target_department?: string;
  speaker_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  deadline?: string;
  isAiGenerated?: boolean;
}

export interface ArchiveTaskInput {
  id?: string;
  title?: string;
  task?: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  speaker_name?: string | null;
  deadline?: string | null;
}

export interface ArchiveMeetingMember {
  id?: string;
  user_id?: string;
  user_name?: string;
  full_name?: string;
  email?: string;
  role?: string;
}

interface ArchiveTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  initialTasks?: ArchiveTaskInput[];
  meetingMembers?: ArchiveMeetingMember[];
  onConfirmArchive: (data: {
    meetingId: string;
    tasks: ActionItemDraft[];
    meetingType: 'EXECUTIVE' | 'DEPARTMENT' | 'MEMBER';
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function ArchiveTransferModal({
  isOpen,
  onClose,
  meeting,
  initialTasks = [],
  meetingMembers = [],
  onConfirmArchive,
  isSubmitting = false,
}: ArchiveTransferModalProps) {
  const { user, activeOrganization } = useAuthStore();

  const [colleagues, setColleagues] = useState<
    Array<{ id: string; name: string; email?: string; role?: string }>
  >([]);

  // AI Extraction state
  const [isExtracting, setIsExtracting] = useState(false);

  // Load organization / department members so colleagues can be assigned
  useEffect(() => {
    const orgId = activeOrganization?.id;
    if (!orgId) {
      return;
    }
    let ignore = false;
    organizationAdminApi
      .getMembers(orgId)
      .then((res) => {
        if (ignore) return;
        const mems = Array.isArray(res) ? res : [];
        setColleagues(
          mems
            .filter((m) => Boolean(m.user_id))
            .map((m) => ({
              id: m.user_id,
              name: m.full_name,
              email: m.email,
              role: m.role || 'Thành viên',
            }))
        );
      })
      .catch(() => {
        if (!ignore) {
          setColleagues([]);
        }
      });
    return () => {
      ignore = true;
    };
  }, [activeOrganization?.id]);

  // Derived organization error if activeOrganization is absent
  const orgError = !activeOrganization?.id
    ? 'Không tìm thấy thông tin tổ chức. Chỉ hiển thị thành viên đã tham gia cuộc họp.'
    : null;

  // Split assignees into attendees present in room vs other colleagues
  const meetingAttendees = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      email?: string;
      role?: string;
      isAttendee: true;
    }> = [];
    const seen = new Set<string>();

    meetingMembers.forEach((m) => {
      const uid = m.user_id || m.id;
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        list.push({
          id: uid,
          name: m.user_name || m.full_name || 'Người tham gia',
          email: m.email,
          role: m.role || 'Người họp',
          isAttendee: true,
        });
      }
    });
    return list;
  }, [meetingMembers]);

  const otherColleagues = useMemo(() => {
    const attendeeUserIds = new Set(meetingAttendees.map((a) => a.id));
    return colleagues
      .filter((c) => !attendeeUserIds.has(c.id))
      .map((c) => ({
        ...c,
        isAttendee: false as const,
      }));
  }, [colleagues, meetingAttendees]);

  const allAssignees = useMemo(() => {
    return [...meetingAttendees, ...otherColleagues];
  }, [meetingAttendees, otherColleagues]);

  // Resolve Host/Manager display name
  const hostMemberName = useMemo(() => {
    return (
      meeting.host_name ||
      meetingAttendees.find(
        (a) =>
          a.role?.toLowerCase().includes('host') ||
          a.role?.toLowerCase().includes('chủ tọa') ||
          a.role?.toUpperCase() === 'OWNER' ||
          a.role?.toUpperCase() === 'ADMIN'
      )?.name ||
      user?.full_name ||
      'Chủ tọa cuộc họp'
    );
  }, [meeting.host_name, meetingAttendees, user?.full_name]);

  // Determine meeting category
  const meetingType: 'EXECUTIVE' | 'DEPARTMENT' | 'MEMBER' = useMemo(() => {
    const title = (meeting.title || '').toLowerCase();
    const mType = (meeting.meeting_type || '').toUpperCase();
    if (
      mType === 'EXECUTIVE' ||
      title.includes('cấp cao') ||
      title.includes('ban điều hành') ||
      title.includes('lãnh đạo')
    ) {
      return 'EXECUTIVE';
    }
    return 'DEPARTMENT';
  }, [meeting]);

  // Tasks state
  const [tasks, setTasks] = useState<ActionItemDraft[]>([]);
  const [prevSyncKey, setPrevSyncKey] = useState<string>('');

  const syncKey = isOpen ? `${meeting.id}-${initialTasks.length}` : '';
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (isOpen && initialTasks.length > 0) {
      setTasks(
        initialTasks.map((t, idx) => {
          let assignedId = t.assignee_id || '';
          let assignedName = t.assignee_name || '';

          if (!assignedId && assignedName) {
            const found = allAssignees.find(
              (a) =>
                a.name.toLowerCase().includes(assignedName.toLowerCase()) ||
                assignedName.toLowerCase().includes(a.name.toLowerCase())
            );
            if (found) {
              assignedId = found.id;
              assignedName = found.name;
            }
          }

          return {
            id: t.id || `task-${idx + 1}`,
            title: t.title || t.task || '',
            speaker_name: t.speaker_name || hostMemberName,
            assignee_id: assignedId,
            assignee_name: assignedName,
            deadline: t.deadline ? String(t.deadline).split('T')[0] : '',
            isAiGenerated: true,
          };
        })
      );
    } else if (!isOpen && tasks.length > 0) {
      setTasks([]);
    }
  }

  // AI Re-Scan tasks directly in modal
  const handleAiExtractTasks = async () => {
    setIsExtracting(true);
    try {
      const res = await meetingsApi.extractTasks(meeting.id);
      const list: ArchiveTaskInput[] = Array.isArray(res)
        ? (res as ArchiveTaskInput[])
        : (res as { items?: ArchiveTaskInput[] })?.items || [];
      if (list && list.length > 0) {
        const mapped = list.map((item: ArchiveTaskInput, idx: number) => {
          const assignedUser = allAssignees.find(
            (a) =>
              a.id === item.assignee_id ||
              (item.assignee_name &&
                (a.name.toLowerCase().includes(item.assignee_name.toLowerCase()) ||
                  item.assignee_name.toLowerCase().includes(a.name.toLowerCase())))
          );
          const spk = item.speaker_name || hostMemberName;
          return {
            id: item.id || `extracted-${Date.now()}-${idx}`,
            title: item.title || item.task || '',
            speaker_name: spk,
            assignee_id: assignedUser ? assignedUser.id : item.assignee_id || '',
            assignee_name: assignedUser ? assignedUser.name : item.assignee_name || '',
            deadline: item.deadline ? String(item.deadline).split('T')[0] : '',
            isAiGenerated: true,
          };
        });
        setTasks(mapped);
      }
    } catch (err) {
      console.error('Failed to trigger AI extract in modal:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddTask = () => {
    setTasks((prev) => [
      ...prev,
      {
        id: `task-manual-${Date.now()}`,
        title: '',
        speaker_name: hostMemberName,
        assignee_id: '',
        assignee_name: '',
        deadline: '',
        isAiGenerated: false,
      },
    ]);
  };

  const handleUpdateTask = (
    idx: number,
    field: keyof ActionItemDraft,
    value: ActionItemDraft[keyof ActionItemDraft]
  ) => {
    setTasks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'assignee_id' && typeof value === 'string') {
        const found = allAssignees.find((m) => m.id === value);
        if (found) next[idx].assignee_name = found.name;
      }
      return next;
    });
  };

  const setQuickDeadline = (idx: number, daysToAdd: number) => {
    const target = new Date(Date.now() + daysToAdd * 86400000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    handleUpdateTask(idx, 'deadline', `${yyyy}-${mm}-${dd}`);
  };

  const handleRemoveTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const validTasks = tasks.filter((t) => t.title.trim().length > 0);
    await onConfirmArchive({
      meetingId: meeting.id,
      tasks: validTasks,
      meetingType,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Kết Thúc Cuộc Họp & Phân Bổ Action Items Vào Mini Jira</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Giao task trực tiếp cho nhân viên có mặt trong phòng họp, điều chỉnh hạn chót và lưu
                trữ biên bản
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Meeting Identity Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-lg">
                  {meeting.title}
                </span>
              </div>
              <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wide flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>{meeting.department_name || 'Bộ Phận Kỹ Thuật & Công Nghệ'}</span>
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  Thời gian:{' '}
                  {meeting.scheduled_at
                    ? new Date(meeting.scheduled_at).toLocaleDateString('vi-VN')
                    : 'Hôm nay'}
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span>
                  Thành viên có mặt:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {meetingAttendees.length} nhân sự
                  </strong>
                </span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Tự động đồng bộ sang bảng Mini Jira của Quản lý & Thành viên</span>
              </span>
            </div>
          </div>

          {orgError && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
              {orgError}
            </div>
          )}

          {/* Action Items Allocation Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Danh Sách Nhiệm Vụ Cần Giao ({tasks.length} tasks)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Chọn người chịu trách nhiệm và điều chỉnh hạn chót hoàn thành trước khi chuyển vào
                  Kanban Board
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiExtractTasks}
                  disabled={isExtracting || isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  title="Quét lại nội dung cuộc họp bằng AI để bắt trích xuất Action Items"
                >
                  {isExtracting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{isExtracting ? 'Đang quét AI...' : 'AI Quét Lại Task'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm Task</span>
                </button>
              </div>
            </div>

            {/* Tasks Form List */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <UserCheck className="w-6 h-6 mx-auto text-slate-300" />
                  <p>
                    Chưa có nhiệm vụ nào. Bấm &apos;AI Quét Lại Task&apos; hoặc &apos;+ Thêm
                    Task&apos; để phân công cho nhân viên trong phòng họp.
                  </p>
                </div>
              ) : (
                tasks.map((task, idx) => (
                  <div
                    key={task.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-3"
                  >
                    {/* Dòng 1: Người nói / Người giao việc (Chủ tọa / Quản lý) */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>Người nói / Giao việc:</span>
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {task.speaker_name || hostMemberName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                            Host / Quản lý
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTask(idx)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                        title="Xóa nhiệm vụ này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dòng 2: Tên task đầy đủ */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-blue-500" />
                        <span>Tên task đầy đủ:</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={task.title}
                        onChange={(e) => handleUpdateTask(idx, 'title', e.target.value)}
                        placeholder="Nhập tên nhiệm vụ đầy đủ..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    {/* Dòng 3: Người đảm nhận & Hạn hoàn thành */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 items-center">
                      {/* Assignee Selection */}
                      <div className="md:col-span-6 flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                          <span>Người đảm nhận:</span>
                        </label>
                        <select
                          value={task.assignee_id || ''}
                          onChange={(e) => handleUpdateTask(idx, 'assignee_id', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 truncate"
                        >
                          <option value="">-- Chưa gán người phụ trách --</option>
                          {meetingAttendees.length > 0 && (
                            <optgroup
                              label={`✨ Nhân viên có mặt trong phòng họp (${meetingAttendees.length})`}
                            >
                              {meetingAttendees.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.email ? `(${m.email.split('@')[0]})` : ''} — Có mặt
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {otherColleagues.length > 0 && (
                            <optgroup
                              label={`🏢 Nhân sự khác trong phòng ban (${otherColleagues.length})`}
                            >
                              {otherColleagues.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.email ? `(${m.email.split('@')[0]})` : ''} —{' '}
                                  {m.role || 'Thành viên'}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      {/* Deadline Date Picker & Quick Presets */}
                      <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-1.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <input
                            type="date"
                            value={task.deadline || ''}
                            onChange={(e) => handleUpdateTask(idx, 'deadline', e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 w-36"
                          />
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setQuickDeadline(idx, 3)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Hạn chót 3 ngày sau"
                          >
                            +3 ngày
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickDeadline(idx, 7)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Hạn chót 1 tuần sau"
                          >
                            +1 tuần
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickDeadline(idx, 14)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Hạn chót 2 tuần sau"
                          >
                            +2 tuần
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 dark:text-slate-400 transition-colors cursor-pointer"
          >
            Quay lại phòng họp
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang lưu trữ & hoàn tất kết thúc...</span>
              </>
            ) : (
              <>
                <span>
                  {tasks.filter((t) => t.title.trim()).length > 0
                    ? `Xác nhận kết thúc & Phân bổ nhiệm vụ (${tasks.filter((t) => t.title.trim()).length})`
                    : 'Xác nhận kết thúc cuộc họp'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
