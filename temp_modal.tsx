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
  Send,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { meetingsApi } from '@/lib/api';

interface EndMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeave: () => void;
  members: any[];
  onEndMeeting: () => Promise<{ summary: string | null; tasks: any[]; meetingId: string } | null>;
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
        cleanSummary = cleanSummary.replace(/## 7\. Danh s�ch C�ng vi?c[\s\S]*/g, '');

        setSummaryData(cleanSummary.trim());
        setTasks(result.tasks || []);
        setMeetingId(result.meetingId);
        setStep('summary');
      } else {
        setError('Kh�ng th? t?o b?n t�m t?t cu?c h?p.');
        setStep('prompt');
      }
    } catch (err) {
      console.error(err);
      setError('�� x?y ra l?i khi k?t th�c cu?c h?p.');
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
      const payload = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        assignee_id: t.assignee_id,
        deadline: t.deadline,
      }));
      await meetingsApi.pushToJira(meetingId, payload);
      alert('�� d?y th�nh c�ng l�n MiniJira!');
      handleDone();
    } catch (err) {
      console.error(err);
      alert('L?i khi d?y l�n Jira.');
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
    setTasks([
      ...tasks,
      { id: Date.now().toString(), title: '', assignee_id: null, deadline: null },
    ]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-4xl rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            {step === 'prompt' && <LogOut className="w-5 h-5 text-primary" />}
            {step === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            {step === 'summary' && <FileText className="w-5 h-5 text-emerald-500" />}
            {step === 'prompt'
              ? 'R?i ph�ng h?p'
              : step === 'loading'
                ? '�ang k?t th�c cu?c h?p...'
                : 'Bi�n b?n & Giao vi?c'}
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
                B?n l� Ch? t?a (Host) c?a cu?c h?p n�y. B?n mu?n ch? t?m th?i r?i ph�ng, hay mu?n
                k?t th�c ho�n to�n cu?c h?p cho t?t c? m?i ngu?i?
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
                    <div className="font-bold text-foreground mb-1">Ch? r?i ph�ng</div>
                    <div className="text-xs text-muted-foreground">
                      Cu?c h?p v?n ti?p t?c cho nh?ng ngu?i kh�c.
                    </div>
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
                    <div className="font-bold text-destructive mb-1">K?t th�c cho t?t c?</div>
                    <div className="text-xs text-muted-foreground">
                      ��ng ph�ng h?p & k�ch ho?t AI t?o Bi�n b?n.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-sm font-medium text-muted-foreground text-center max-w-md">
                H? th?ng dang t?ng h?p Quy?t d?nh v� C�ng vi?c d? sinh Bi�n b?n cu?c h?p. Qu� tr�nh
                n�y c� th? m?t v�i gi�y...
              </div>
            </div>
          )}

          {step === 'summary' && (
            <div className="flex flex-col gap-8">
              <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/20 p-6 rounded-xl border border-border">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryData}</ReactMarkdown>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    Duy?t & Ph�n c�ng C�ng vi?c
                  </h3>
                  <button
                    onClick={addTask}
                    className="text-xs font-medium px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Th�m vi?c
                  </button>
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">T�n c�ng vi?c</th>
                        <th className="px-4 py-3 w-48">Ngu?i ph? tr�ch</th>
                        <th className="px-4 py-3 w-40">H?n ch�t</th>
                        <th className="px-4 py-3 w-16 text-center">X�a</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tasks.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-muted-foreground italic"
                          >
                            Kh�ng c� c�ng vi?c n�o du?c tr�ch xu?t
                          </td>
                        </tr>
                      ) : (
                        tasks.map((task, idx) => (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-1.5 outline-none transition-colors"
                                value={task.title}
                                onChange={(e) => updateTask(idx, 'title', e.target.value)}
                                placeholder="Nh?p t�n c�ng vi?c..."
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select
                                className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-1.5 outline-none transition-colors appearance-none"
                                value={task.assignee_id || ''}
                                onChange={(e) =>
                                  updateTask(idx, 'assignee_id', e.target.value || null)
                                }
                              >
                                <option value="">-- Ch?n ngu?i --</option>
                                {members.map((m) => (
                                  <option key={m.user_id} value={m.user_id}>
                                    {m.user_name || m.user_id}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-1.5 outline-none transition-colors"
                                value={
                                  task.deadline
                                    ? new Date(task.deadline).toISOString().split('T')[0]
                                    : ''
                                }
                                onChange={(e) =>
                                  updateTask(
                                    idx,
                                    'deadline',
                                    e.target.value ? new Date(e.target.value).toISOString() : null
                                  )
                                }
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => removeTask(idx)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>

        {step === 'summary' && (
          <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-3">
            <button
              onClick={handleDone}
              className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted font-medium transition-colors"
            >
              ��ng (Kh�ng d?y Jira)
            </button>
            <button
              onClick={handlePushToJira}
              disabled={isPushing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPushing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Luu & �?y l�n MiniJira
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
