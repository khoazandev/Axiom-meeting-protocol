import React from 'react';
import { X } from 'lucide-react';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editForm: {
    title: string;
    assignee_id: string;
    deadline: string;
  };
  setEditForm: (val: any) => void;
  meetingMembers: any[];
}

export default function EditTaskModal({
  isOpen,
  onClose,
  onSave,
  editForm,
  setEditForm,
  meetingMembers,
}: EditTaskModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold text-foreground">Chỉnh sửa công việc</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nội dung công việc</label>
            <textarea
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
              placeholder="Nhập nội dung công việc..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Người phụ trách</label>
            <select
              value={editForm.assignee_id}
              onChange={(e) => setEditForm({ ...editForm, assignee_id: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Chưa phân công</option>
              {meetingMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Hạn chót</label>
            <input
              type="datetime-local"
              value={editForm.deadline}
              onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-all cursor-pointer shadow-sm shadow-primary/25"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
