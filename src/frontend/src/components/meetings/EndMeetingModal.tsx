'use client';

import React, { useState } from 'react';
import {
  X,
  LogOut,
  Power,
  Loader2,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  Send
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { meetingsApi } from '@/lib/api';

interface EndMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeave: () => void;
  members: any[];
  onEndMeeting: () => Promise<{summary: string | null, tasks: any[], meetingId: string} | null>;
}

export const EndMeetingModal: React.FC<EndMeetingModalProps> = ({
  isOpen,
  onClose,
  onLeave,
  members,
  onEndMeeting,
}) => {
  const [step, setStep] = useState<'prompt' | 'loading' | 'summary'>('prompt');
  const [summaryData, setSummaryData] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetingId, setMeetingId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPushing, setIsPushing] = useState(false);

  if (!isOpen) return null;

  const handleEndMeeting = async () => {
    setStep('loading');
    setError('');
    try {
      const result = await onEndMeeting();
      if (result) {
        let cleanSummary = result.summary || '';
        // Strip out table if it was generated
        cleanSummary = cleanSummary.replace(/## 7\. Danh sách Công việc[\s\S]*/g, '');
        
        setSummaryData(cleanSummary.trim());
        setTasks(result.tasks || []);
        setMeetingId(result.meetingId);
        setStep('summary');
      } else {
        setError('Không thể tạo bản tóm tắt cuộc họp.');
        setStep('prompt');
      }
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi khi kết thúc cuộc họp.');
      setStep('prompt');
    }
  };

  const handleDone = () => {
    onClose();
    onLeave();
  };

  const handlePushToJira = async () => {
    try {
      setIsPushing(true);
      const payload = tasks.map(t => ({
        id: t.id,
        title: t.title,
        assignee_id: t.assignee_id,
        deadline: t.deadline
      }));
      await meetingsApi.pushToJira(meetingId, payload);
      alert("Đã đẩy thành công lên MiniJira!");
      handleDone();
    } catch(err) {
      console.error(err);
      alert("Lỗi khi đẩy lên Jira.");
    } finally {
      setIsPushing(false);
    }
  };

  const updateTask = (index: number, field: string, value: any) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  const removeTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const addTask = () => {
    setTasks([...tasks, { id: Date.now().toString(), title: '', assignee_id: null, deadline: null }]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-4xl rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            {step === 'prompt' && <LogOut className="w-5 h-5 text-primary" />}
            {step === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            {step === 'summary' && <FileText className="w-5 h-5 text-emerald-500" />}
            {step === 'prompt' ? 'Rời phòng họp' : step === 'loading' ? 'Đang kết thúc cuộc họp...' : 'Biên bản & Giao việc'}
          </h2>
          {step !== 'loading' && (
            <button
              onClick={step === 'summary' ? handleDone : onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {step === 'prompt' && (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Bạn là Chủ tọa (Host) của cuộc họp này. Bạn muốn chỉ tạm thời rời phòng, hay muốn kết thúc hoàn toàn cuộc họp cho tất cả mọi người?
              </div>
              
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={onLeave}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LogOut className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground mb-1">Chỉ rời phòng</div>
                    <div className="text-xs text-muted-foreground">Cuộc họp vẫn tiếp tục cho những người khác.</div>
                  </div>
                </button>

                <button
                  onClick={handleEndMeeting}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-destructive/20 hover:border-destructive hover:bg-destructive/5 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Power className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <div className="font-bold text-destructive mb-1">Kết thúc cho tất cả</div>
                    <div className="text-xs text-muted-foreground">Đóng phòng họp & kích hoạt AI tạo Biên bản.</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-sm font-medium text-muted-foreground text-center max-w-md">
                Hệ thống đang tổng hợp Quyết định và Công việc để sinh Biên bản cuộc họp. Quá trình này có thể mất vài giây...
              </div>
            </div>
          )}

          {step === 'summary' && (
            <div className="flex flex-col gap-8">
              <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/20 p-6 rounded-xl border border-border">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summaryData}
                </ReactMarkdown>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    Duyệt & Phân công Công việc
                  </h3>
                  <button onClick={addTask} className="text-xs font-medium px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Thêm việc
                  </button>
                </div>
                
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">Tên công việc</th>
                        <th className="px-4 py-3 w-48">Người phụ trách</th>
                        <th className="px-4 py-3 w-40">Hạn chót</th>
                        <th className="px-4 py-3 w-16 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground italic">
                            Không có công việc nào được trích xuất
                          </td>
                        </tr>
                      ) : tasks.map((task, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-1.5 outline-none transition-colors"
                              value={task.title}
                              onChange={e => updateTask(idx, 'title', e.target.value)}
                              placeholder="Nhập tên công việc..."
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select 
                              className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-1.5 outline-none transition-colors appearance-none"
                              value={task.assignee_id || ''}
                              onChange={e => updateTask(idx, 'assignee_id', e.target.value || null)}
                            >
                              <option value="">-- Chọn người --</option>
                              {members.map(m => (
                                <option key={m.user_id} value={m.user_id}>{m.user_name || m.user_id}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="date" 
                              className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-1.5 outline-none transition-colors"
                              value={task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''}
                              onChange={e => updateTask(idx, 'deadline', e.target.value ? new Date(e.target.value).toISOString() : null)}
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button onClick={() => removeTask(idx)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 'summary' && (
          <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-3">
            <button
              onClick={handleDone}
              className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted font-medium transition-colors"
            >
              Đóng (Không đẩy Jira)
            </button>
            <button
              onClick={handlePushToJira}
              disabled={isPushing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Lưu & Đẩy lên MiniJira
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
