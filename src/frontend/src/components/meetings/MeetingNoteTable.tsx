import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Trash2, Plus } from 'lucide-react';

interface FollowUpTask {
  title: string;
  assignee_name?: string;
  deadline?: string;
}

interface MeetingNoteTableProps {
  meeting: any;
  members: any[];
  summary: any;
  tasks: any[];
  isEditable?: boolean;
  onUpdateTask?: (index: number, field: string, value: any) => void;
  onRemoveTask?: (index: number) => void;
  onAddTask?: () => void;
}

function HighlightedSummary({ text }: { text: string }) {
  return (
    <div className="prose dark:prose-invert max-w-none text-sm text-text-primary [&_p]:mb-2 [&_ul]:mb-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          strong: ({ node, ...props }) => {
            const content = props.children?.toString().toLowerCase() || '';
            const isProblem = content.includes('vấn đề') || content.includes('problem') || content.includes('lỗi');
            const isFact = content.includes('sự thật') || content.includes('fact');
            
            if (isProblem) {
              return <strong className="text-red-600 bg-red-500/10 px-1 rounded mx-0.5 border border-red-500/20" {...props} />;
            }
            if (isFact) {
              return <strong className="text-blue-600 bg-blue-500/10 px-1 rounded mx-0.5 border border-blue-500/20" {...props} />;
            }
            
            return <strong className="font-bold text-accent" {...props} />;
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function MeetingNoteTable({ meeting, members, summary, tasks, isEditable, onUpdateTask, onRemoveTask, onAddTask }: MeetingNoteTableProps) {
  const renderDecisions = () => {
    if (!summary.decisions) return <div className="text-sm text-text-muted italic">Không có quyết định nào.</div>;
    if (typeof summary.decisions === 'string') {
      return (
        <div className="prose dark:prose-invert max-w-none text-sm text-text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_p]:mb-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.decisions}</ReactMarkdown>
        </div>
      );
    }
    if (Array.isArray(summary.decisions)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {summary.decisions.map((d: any, i: number) => (
            <li key={i} className="text-sm text-text-primary">{typeof d === 'string' ? d : d.description}</li>
          ))}
        </ul>
      );
    }
    return null;
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-bg-elevated shadow-sm w-full max-w-4xl mx-auto mb-8">
      {/* HEADER */}
      <div className="bg-bg-muted p-4 flex gap-4 border-b border-border">
        <div className="w-1/3 font-bold text-sm text-text-secondary uppercase tracking-wider flex items-center">MEETING NAME</div>
        <div className="w-2/3 font-bold text-base text-text-primary">{meeting.title}</div>
      </div>

      {/* SECTION A */}
      <div className="bg-bg-subtle p-3 font-bold text-sm text-text-primary uppercase tracking-wider border-b border-border flex items-center gap-2">
        <span className="w-1.5 h-4 bg-accent rounded-full inline-block"></span>
        A - INFORMATION
      </div>
      
      <div className="flex border-b border-border">
        <div className="w-1/3 p-4 bg-bg-base/50 font-semibold text-sm text-text-secondary border-r border-border/50">1 - Date</div>
        <div className="w-2/3 p-4 bg-bg-base text-sm text-text-primary font-medium">
          {meeting.created_at ? new Date(meeting.created_at).toISOString() : '-'}
        </div>
      </div>

      <div className="flex border-b border-border">
        <div className="w-1/3 p-4 bg-bg-base/50 font-semibold text-sm text-text-secondary border-r border-border/50">2 - Attendance</div>
        <div className="w-2/3 p-4 bg-bg-base text-sm text-text-primary">
          {members.length > 0 
            ? members.map(m => m.user_name || m.user?.full_name || m.user_id).join(', ')
            : 'Không có thông tin thành viên.'}
        </div>
      </div>

      <div className="flex border-b border-border">
        <div className="w-1/3 p-4 bg-bg-base/50 font-semibold text-sm text-text-secondary border-r border-border/50">3 - Agenda Outline</div>
        <div className="w-2/3 p-4 bg-bg-base text-sm text-text-primary whitespace-pre-wrap">
          {meeting.agenda || 'Không có chương trình dự kiến.'}
        </div>
      </div>

      {/* SECTION B */}
      <div className="bg-bg-subtle p-3 font-bold text-sm text-text-primary uppercase tracking-wider border-b border-border flex items-center gap-2">
        <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block"></span>
        B - ACTION
      </div>

      <div className="flex border-b border-border">
        <div className="w-1/3 p-4 bg-bg-base/50 font-semibold text-sm text-text-secondary border-r border-border/50">4 - Goal</div>
        <div className="w-2/3 p-4 bg-bg-base text-sm text-text-primary">
          Đạt được sự thống nhất và đề ra kế hoạch hành động cụ thể cho các chủ đề được thảo luận.
        </div>
      </div>

      <div className="flex border-b border-border">
        <div className="w-1/3 p-4 bg-bg-base/50 font-semibold text-sm text-text-secondary border-r border-border/50">5 - Summary</div>
        <div className="w-2/3 p-4 bg-bg-base">
          <HighlightedSummary text={summary.summary} />
        </div>
      </div>

      {/* 6 - Decisions (Full width) */}
      <div className="flex flex-col border-b border-border bg-bg-base">
        <div className="p-4 pb-2 font-semibold text-sm text-text-secondary">6 - List of Decision Made</div>
        <div className="px-4 pb-4">
          {renderDecisions()}
        </div>
      </div>

      {/* 7 - Action Items (Full width nested table) */}
      <div className="flex flex-col bg-bg-base">
        <div className="p-4 pb-2 font-semibold text-sm text-text-secondary">7 - List of Action Items</div>
        <div className="px-4 pb-4 overflow-x-auto">
          <div className="w-full text-left border border-border rounded-xl overflow-hidden bg-bg-base">
            <div className="bg-bg-subtle border-b border-border grid grid-cols-12 p-3 text-xs font-bold text-text-secondary uppercase">
              <div className="col-span-3">Người phụ trách</div>
              <div className="col-span-6">Công việc</div>
              <div className="col-span-3 flex justify-between items-center">
                <span>Hạn chót</span>
                {isEditable && onAddTask && (
                  <button
                    onClick={onAddTask}
                    className="p-1 hover:bg-bg-hover rounded-lg text-primary transition-colors cursor-pointer -my-2 flex items-center justify-center shrink-0 w-8 h-8"
                    title="Thêm công việc mới"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-col">
              {tasks.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-text-muted gap-2">
                  <div className="text-sm italic">Không có hành động (Task) nào được ghi nhận.</div>
                </div>
              ) : (
                tasks.map((task, i) => (
                  <div key={i} className="grid grid-cols-12 border-b last:border-b-0 border-border/50 hover:bg-bg-subtle/30 transition-colors items-center min-h-[3rem]">
                    <div className="col-span-3 p-3">
                      {isEditable ? (
                        <div className="shrink-0 w-36">
                          <select
                            className="w-full bg-transparent border-none text-sm font-medium text-text-primary focus:ring-1 focus:ring-primary/30 rounded px-1.5 py-1.5 cursor-pointer hover:bg-bg-hover/50 appearance-none truncate"
                            value={task.assignee_id || task.assignee_name || ''}
                            onChange={(e) => {
                              if (onUpdateTask) {
                                const selectedName = e.target.options[e.target.selectedIndex].text;
                                onUpdateTask(i, 'assignee_id', e.target.value);
                                onUpdateTask(i, 'assignee_name', selectedName);
                              }
                            }}
                          >
                            <option value="">Chưa phân công</option>
                            {members.map(m => (
                              <option key={m.user_id} value={m.user_id}>{m.user_name || m.user?.full_name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-text-primary truncate px-2" title={task.assignee_name || 'Chưa giao'}>
                          {task.assignee_name || <span className="text-text-muted italic">Chưa giao</span>}
                        </div>
                      )}
                    </div>
                    
                    <div className="col-span-6 p-3">
                      {isEditable ? (
                        <textarea
                          className="w-full bg-transparent border-none text-sm text-text-primary focus:ring-1 focus:ring-primary/30 rounded px-2 py-1.5 resize-none leading-relaxed min-h-[32px] overflow-hidden hover:bg-bg-hover/30"
                          value={task.title}
                          onChange={(e) => {
                            if (onUpdateTask) onUpdateTask(i, 'title', e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          placeholder="Nhập tiêu đề công việc..."
                          rows={1}
                        />
                      ) : (
                        <div className="text-sm text-text-primary px-2 leading-relaxed">
                          {task.title}
                        </div>
                      )}
                    </div>
                    
                    <div className="col-span-3 p-3 flex justify-between items-center gap-2">
                      {isEditable ? (
                        <div className="flex-1 shrink-0 min-w-0 flex items-center justify-between gap-1 group">
                          <input
                            type="date"
                            className="w-full bg-transparent border border-border/50 rounded-lg px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 hover:border-border/80 transition-colors"
                            value={task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''}
                            onChange={(e) => onUpdateTask && onUpdateTask(i, 'deadline', e.target.value ? new Date(e.target.value).toISOString() : null)}
                          />
                          {onRemoveTask && (
                            <button
                              onClick={() => onRemoveTask(i)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-600 rounded-md text-text-muted transition-all cursor-pointer shrink-0"
                              title="Xóa công việc"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-text-secondary px-2">
                          {task.deadline 
                            ? new Date(task.deadline).toLocaleDateString('vi-VN') 
                            : '-'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
