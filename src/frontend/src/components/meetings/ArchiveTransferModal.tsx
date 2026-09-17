'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Archive,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  Building2,
  User,
  Calendar,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import type { Meeting } from '@/lib/api';

export interface ActionItemDraft {
  id: string;
  title: string;
  target_department?: string;
  assignee_id?: string;
  assignee_name?: string;
  deadline?: string;
}

interface ArchiveTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  initialTasks?: any[];
  meetingMembers?: any[];
  onConfirmArchive: (data: {
    meetingId: string;
    tasks: ActionItemDraft[];
    meetingType: 'EXECUTIVE' | 'DEPARTMENT' | 'MEMBER';
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const DEPARTMENTS = [
  { id: 'dept-eng', name: 'Khối Kỹ Thuật (ENG)', code: 'ENG' },
  { id: 'dept-prod', name: 'Khối Sản Phẩm (PROD)', code: 'PROD' },
  { id: 'dept-biz', name: 'Khối Kinh Doanh (BIZ)', code: 'BIZ' },
  { id: 'dept-ops', name: 'Khối Vận Hành (OPS)', code: 'OPS' },
  { id: 'dept-fin', name: 'Khối Tài Chính (FIN)', code: 'FIN' },
];

export function ArchiveTransferModal({
  isOpen,
  onClose,
  meeting,
  initialTasks = [],
  meetingMembers = [],
  onConfirmArchive,
  isSubmitting = false,
}: ArchiveTransferModalProps) {
  // Determine meeting category
  const meetingType: 'EXECUTIVE' | 'DEPARTMENT' | 'MEMBER' = useMemo(() => {
    const title = (meeting.title || '').toLowerCase();
    const mType = (meeting.meeting_type || '').toUpperCase();
    if (mType === 'EXECUTIVE' || title.includes('cấp cao') || title.includes('ban điều hành') || title.includes('lãnh đạo')) {
      return 'EXECUTIVE';
    }
    if (meeting.department_id || mType === 'DEPARTMENT' || title.includes('phòng ban') || title.includes('sprint')) {
      return 'DEPARTMENT';
    }
    return 'MEMBER';
  }, [meeting]);

  // Tasks state
  const [tasks, setTasks] = useState<ActionItemDraft[]>(() => {
    if (initialTasks && initialTasks.length > 0) {
      return initialTasks.map((t, idx) => ({
        id: t.id || `task-${idx + 1}`,
        title: t.title || '',
        target_department: t.target_department || DEPARTMENTS[0].name,
        assignee_id: t.assignee_id || '',
        assignee_name: t.assignee_name || (meetingMembers[0]?.user_name || ''),
        deadline: t.deadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      }));
    }
    if (meetingType === 'EXECUTIVE') {
      return [
        {
          id: 'task-1',
          title: 'Triển khai hạ tầng máy chủ On-Premise và kiểm chuẩn an ninh',
          target_department: 'Khối Kỹ Thuật (ENG)',
          deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        },
        {
          id: 'task-2',
          title: 'Chuẩn bị kế hoạch truyền thông và giới thiệu giải pháp Qwen AI',
          target_department: 'Khối Kinh Doanh (BIZ)',
          deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        },
      ];
    }
    if (meetingType === 'DEPARTMENT') {
      return [
        {
          id: 'task-1',
          title: 'Tối ưu hóa độ trễ xử lý Voice STT song ngữ dưới 300ms',
          assignee_id: meetingMembers[0]?.user_id || 'mem-1',
          assignee_name: meetingMembers[0]?.user_name || 'Kỹ sư AI',
          deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        },
        {
          id: 'task-2',
          title: 'Cập nhật tài liệu kỹ thuật tích hợp WebRTC và LiveKit Room',
          assignee_id: meetingMembers[1]?.user_id || 'mem-2',
          assignee_name: meetingMembers[1]?.user_name || 'Frontend Dev',
          deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        },
      ];
    }
    return [];
  });

  if (!isOpen) return null;

  const handleAddTask = () => {
    if (meetingType === 'EXECUTIVE') {
      setTasks((prev) => [
        ...prev,
        {
          id: `task-manual-${Date.now()}`,
          title: '',
          target_department: DEPARTMENTS[0].name,
          deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        },
      ]);
    } else if (meetingType === 'DEPARTMENT') {
      setTasks((prev) => [
        ...prev,
        {
          id: `task-manual-${Date.now()}`,
          title: '',
          assignee_id: meetingMembers[0]?.user_id || '',
          assignee_name: meetingMembers[0]?.user_name || '',
          deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        },
      ]);
    }
  };

  const handleUpdateTask = (idx: number, field: keyof ActionItemDraft, value: any) => {
    setTasks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'assignee_id') {
        const found = meetingMembers.find((m) => m.user_id === value);
        if (found) next[idx].assignee_name = found.user_name;
      }
      return next;
    });
  };

  const handleRemoveTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    await onConfirmArchive({
      meetingId: meeting.id,
      tasks: meetingType === 'MEMBER' ? [] : tasks,
      meetingType,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Chuyển Thông Tin Cuộc Họp Về Kho Lưu Trữ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Xác nhận kết thúc, thiết lập phân quyền kho và phân bổ nhiệm vụ
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
          {/* Meeting Identity & RBAC Warehouse Tag */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-md">
                {meeting.title}
              </span>
              {meetingType === 'EXECUTIVE' && (
                <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Cuộc họp cấp cao
                </span>
              )}
              {meetingType === 'DEPARTMENT' && (
                <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wide flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {meeting.department_name || 'Phòng ban trực thuộc'}
                </span>
              )}
              {meetingType === 'MEMBER' && (
                <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Họp nội bộ thành viên
                </span>
              )}
            </div>

            {/* RBAC Visibility Guarantee */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2 text-xs">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Phân quyền truy cập kho lưu trữ:
                </span>{' '}
                {meetingType === 'EXECUTIVE' ? (
                  <span className="text-slate-600 dark:text-slate-400">
                    Owner xem toàn bộ biên bản. Trưởng phòng xem được các nghị quyết được phân công cho phòng ban mình.
                  </span>
                ) : (
                  <span className="text-slate-600 dark:text-slate-400">
                    Owner xem được toàn bộ. Manager và Member chỉ xem được kho lưu trữ trong phạm vi phòng ban của mình.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Items Section */}
          {meetingType === 'EXECUTIVE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Nghị Quyết Cấp Cao & Phân Công Khối Phòng Ban
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Chuyển giao đầu việc cho các phòng ban thực thi theo cơ cấu tổ chức
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm quyết sách (Gán tay)</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-2xl">
                    Chưa có quyết sách nào. Bấm 'Thêm quyết sách' để gán việc cho phòng ban.
                  </div>
                ) : (
                  tasks.map((task, idx) => (
                    <div
                      key={task.id || idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                    >
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => handleUpdateTask(idx, 'title', e.target.value)}
                        placeholder="Nội dung quyết sách / chỉ đạo..."
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                      <select
                        value={task.target_department || DEPARTMENTS[0].name}
                        onChange={(e) => handleUpdateTask(idx, 'target_department', e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-blue-500 shrink-0"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={task.deadline || ''}
                        onChange={(e) => handleUpdateTask(idx, 'deadline', e.target.value)}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {meetingType === 'DEPARTMENT' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    Phân Bổ Nhiệm Vụ Cho Thành Viên (Jira Action Items)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Trích xuất tự động từ phiên họp kết hợp gán tay thêm việc cho member
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Gán tay thêm việc</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-2xl">
                    Chưa có nhiệm vụ nào. Bấm 'Gán tay thêm việc' để tạo task cho member.
                  </div>
                ) : (
                  tasks.map((task, idx) => (
                    <div
                      key={task.id || idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                    >
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => handleUpdateTask(idx, 'title', e.target.value)}
                        placeholder="Tên công việc cần thực hiện..."
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                      <select
                        value={task.assignee_id || ''}
                        onChange={(e) => handleUpdateTask(idx, 'assignee_id', e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-blue-500 shrink-0"
                      >
                        <option value="">-- Chọn Member --</option>
                        {meetingMembers.map((m) => (
                          <option key={m.user_id || m.id} value={m.user_id || m.id}>
                            {m.user_name || m.name || m.user_id}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={task.deadline || ''}
                        onChange={(e) => handleUpdateTask(idx, 'deadline', e.target.value)}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                        title="Xóa công việc"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {meetingType === 'MEMBER' && (
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-0.5">
                  Cuộc họp trao đổi nội bộ giữa các thành viên
                </p>
                <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Cuộc họp này không áp dụng quy trình phân chia nhiệm vụ. Toàn bộ bản ghi âm, phụ đề song ngữ và biên bản tóm tắt AI sẽ được chuyển thẳng về Kho lưu trữ của phòng ban.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end gap-2.5">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang lưu vào kho...</span>
              </>
            ) : (
              <>
                <span>Xác nhận & Lưu vào kho lưu trữ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
