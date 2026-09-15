import re
with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

agenda_str = '''                      <div className="max-h-32 overflow-y-auto pr-1 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 scrollbar-thin">
                        {(meeting?.description || meeting?.agenda || '').trim() ? (
                          <p className="whitespace-pre-line leading-relaxed text-[11.5px]">
                            {meeting?.description || meeting?.agenda}
                          </p>
                        ) : (
                          <p className="text-[11px] italic text-slate-400">
                            Chưa có nội dung Agenda. Bấm 'Sửa' hoặc biểu tượng tải tệp ở trên để nạp
                            kế hoạch cuộc họp cho Asightant.
                          </p>
                        )}
                      </div>'''

topics_ui = '''<div className="flex-1 overflow-y-auto pr-1 text-xs bg-white rounded-lg scrollbar-thin mt-2">
                        <div className="flex items-center justify-between mb-3">
                           <span className="font-bold text-blue-800 uppercase tracking-wider text-[10px]">Danh sách Topics</span>
                           {user?.role !== 'MEMBER' && topics.some(t => t.status !== 'COMPLETED') && (
                             <button onClick={handleNextTopic} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold hover:bg-blue-200 transition-colors shadow-sm cursor-pointer">
                               {topics.some(t => t.status === 'IN_PROGRESS') ? 'Topic tiếp theo' : 'Bắt đầu họp'}
                             </button>
                           )}
                        </div>
                        {topics.length === 0 ? (
                           <div className="text-slate-400 italic text-[11px] text-center py-2">Chưa có chủ đề nào.</div>
                        ) : (
                           <div className="flex flex-col gap-2">
                             {topics.map(t => (
                               <div key={t.id} className={`p-2.5 rounded-lg border transition-all ${t.status === 'IN_PROGRESS' ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'}`}>
                                 <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedTopicId(expandedTopicId === t.id ? null : t.id)}>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] uppercase font-bold tracking-wider ${t.status === 'COMPLETED' ? 'text-slate-400' : t.status === 'IN_PROGRESS' ? 'text-blue-600' : 'text-slate-400'}`}>
                                        [{t.status === 'COMPLETED' ? 'Đã xong' : t.status === 'IN_PROGRESS' ? 'Đang tiến hành' : 'Chưa bắt đầu'}]
                                      </span>
                                      <span className={`font-semibold text-[11px] ${t.status === 'COMPLETED' ? 'line-through text-slate-400' : t.status === 'IN_PROGRESS' ? 'text-slate-900' : 'text-slate-600'}`}>{t.title}</span>
                                    </div>
                                    <span className="text-slate-400">{expandedTopicId === t.id ? '▼' : '▶'}</span>
                                 </div>
                                 {expandedTopicId === t.id && (
                                    <div className="mt-2 pt-2 border-t border-slate-200/60">
                                       <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Quyết định (Decisions)</div>
                                       {decisions.filter(d => d.topic_id === t.id).length === 0 ? (
                                          <div className="text-[10px] italic text-slate-400 ml-2 mb-2">Chưa có quyết định.</div>
                                       ) : (
                                          <div className="mb-2 flex flex-col gap-1.5">
                                            {decisions.filter(d => d.topic_id === t.id).map(d => (
                                              <div key={d.id} className="text-[11px] text-slate-700 ml-2 flex items-start gap-1">
                                                <span className="text-blue-500 mt-0.5">•</span>
                                                <span>{d.description}</span>
                                              </div>
                                            ))}
                                          </div>
                                       )}
                                       <div className="text-[10px] font-bold text-slate-500 uppercase mt-2 mb-1 tracking-wider">Công việc (Tasks)</div>
                                       {actionItems.filter(task => task.topic_id === t.id).length === 0 ? (
                                          <div className="text-[10px] italic text-slate-400 ml-2">Chưa có task.</div>
                                       ) : (
                                          <div className="flex flex-col gap-1.5">
                                            {actionItems.filter(task => task.topic_id === t.id).map(task => (
                                              <div key={task.id} className="text-[11px] text-slate-700 ml-2 flex items-start gap-1">
                                                <span className="text-green-500 mt-0.5">✓</span>
                                                <div className="flex flex-col">
                                                  <span className="font-medium">{task.title}</span>
                                                  <span className="text-[10px] text-slate-500">Phụ trách: {task.assignee_name || 'Chưa phân công'}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                       )}
                                    </div>
                                 )}
                               </div>
                             ))}
                           </div>
                        )}
                      </div>'''

state_additions = '''
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [editDecisionForm, setEditDecisionForm] = useState<{
    description: string;
    status: string;
    proposer_id: string;
  }>({ description: '', status: 'APPROVED', proposer_id: '' });
'''

fetch_old = '''      const [items, transcripts, members, m] = await Promise.all([
        meetingsApi.getActionItems(meetingId),
        meetingsApi.getTranscripts(meetingId),
        meetingsApi.getMembers(meetingId),
        meetingsApi.get(meetingId),
      ]);'''

fetch_new = '''      const [items, decs, transcripts, members, m, meetingTopics] = await Promise.all([
        meetingsApi.getActionItems(meetingId),
        meetingsApi.getDecisions(meetingId),
        meetingsApi.getTranscripts(meetingId),
        meetingsApi.getMembers(meetingId),
        meetingsApi.get(meetingId),
        topicsApi.list(meetingId),
      ]);
      setDecisions(decs);
      setTopics(meetingTopics);'''

handlers = '''
  const handleSaveDecisionEdit = async (decisionId: string) => {
    try {
      const payload: any = {
        description: editDecisionForm.description,
        status: editDecisionForm.status
      };
      if (editDecisionForm.proposer_id) payload.proposer_id = editDecisionForm.proposer_id;
      
      await meetingsApi.updateDecision(meetingId, decisionId, payload);
      setEditingDecisionId(null);
      
      setDecisions((prev) =>
        prev.map((item) => {
          if (item.id === decisionId) {
            const proposerName =
              meetingMembers.find((m) => m.user_id === editDecisionForm.proposer_id)?.user_name ||
              '';
            return {
              ...item,
              description: editDecisionForm.description,
              proposer_id: editDecisionForm.proposer_id,
              proposer_name: proposerName,
              status: editDecisionForm.status,
            };
          }
          return item;
        })
      );
      toast.success('Cập nhật quyết định thành công');
    } catch (err) {
      console.error('Failed to update decision:', err);
      toast.error('Lỗi khi cập nhật quyết định');
    }
  };

  const handleStartDecisionEdit = (item: any) => {
    setEditingDecisionId(item.id);
    setEditDecisionForm({
      description: item.description,
      status: item.status,
      proposer_id: item.proposer_id || '',
    });
  };

  const handleNextTopic = async () => {
    try {
      toast.info('Đang chuyển sang topic tiếp theo...');
      await topicsApi.next(meetingId);
      const res = await topicsApi.list(meetingId);
      const newTopics = res || [];
      setTopics(newTopics);
      
      const inProgressTopic = newTopics.find((t: any) => t.status === 'IN_PROGRESS');
      if (inProgressTopic && !expandedTopicId) {
        setExpandedTopicId(inProgressTopic.id);
      }
      toast.success('Đã chuyển topic thành công');
    } catch (err) {
      console.error('Failed to move to next topic:', err);
      toast.error('Lỗi khi chuyển topic');
    }
  };
'''

text = text.replace('import { meetingsApi, ActionItemResponse', 'import { meetingsApi, ActionItemResponse, topicsApi, Topic')
text = text.replace('  const [actionItems, setActionItems] = useState<ActionItemResponse[]>([]);', '  const [actionItems, setActionItems] = useState<ActionItemResponse[]>([]);\n' + state_additions)
text = text.replace(fetch_old, fetch_new)
text = text.replace('  const handleSaveTaskEdit = async (taskId: string) => {', handlers + '\n  const handleSaveTaskEdit = async (taskId: string) => {')
text = text.replace(agenda_str, topics_ui)

with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
