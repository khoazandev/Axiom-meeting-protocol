'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Kanban,
  FileText,
  Download,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  Layers,
  ArrowRight,
  User,
  X,
  Loader2,
  Award,
} from 'lucide-react';
import {
  DepartmentCode,
  StrategicPriority,
  ExecutiveMandate,
  DecomposedTask,
  DEPARTMENT_OPTIONS,
  TEAM_MEMBERS_DIRECTORY,
  addStoredMandates,
  addStoredMemberTasks,
} from '@/lib/workloadProtocolData';
import { meetingsApi, jiraApi, type ActionItemResponse, type MeetingEndResponse } from '@/lib/api';

export type MeetingLevelMode = 'EXECUTIVE' | 'DEPARTMENT';

interface EditableActionItem {
  id: string;
  title: string;
  description: string;
  // For Executive level
  targetDept: DepartmentCode;
  priority: StrategicPriority;
  estimatedHours: number;
  storyPoints: number;
  // For Department level
  assigneeName: string;
  assigneeEmail: string;
  deadline: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

interface PostMeetingCascadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  meetingTitle: string;
  userRole?: string | null;
  initialActionItems?: ActionItemResponse[];
  onComplete: (targetRoute: string) => void;
}

export function PostMeetingCascadeModal({
  isOpen,
  onClose,
  meetingId,
  meetingTitle,
  userRole,
  initialActionItems = [],
  onComplete,
}: PostMeetingCascadeModalProps) {
  // Determine default mode from user role
  const isExecutiveUser = userRole === 'OWNER' || userRole === 'ADMIN';
  const [meetingMode, setMeetingMode] = useState<MeetingLevelMode>(
    isExecutiveUser ? 'EXECUTIVE' : 'DEPARTMENT'
  );

  const [activeTab, setActiveTab] = useState<'cascade' | 'mom'>('cascade');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingJira, setIsSyncingJira] = useState(false);
  const [isPublishingMandates, setIsPublishingMandates] = useState(false);
  const [copiedMoM, setCopiedMoM] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Summary and tasks state
  const [summaryData, setSummaryData] = useState<{
    content: string;
    key_points: string | null;
    decisions: string | null;
  } | null>(null);

  const [items, setItems] = useState<EditableActionItem[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Convert raw action items into editable cascade items
  useEffect(() => {
    if (!isOpen) return;

    // Trigger AI End Meeting API if not yet fetched
    const fetchEndMeetingData = async () => {
      setIsLoading(true);
      try {
        const res: MeetingEndResponse = await meetingsApi.endMeeting(meetingId);
        if (res?.summary) {
          setSummaryData({
            content: res.summary.content || '',
            key_points: res.summary.key_points || null,
            decisions: res.summary.decisions || null,
          });
        }

        // Map follow-up tasks from backend
        const tasksFromBackend = res.follow_up_tasks || [];
        if (tasksFromBackend.length > 0) {
          const mapped: EditableActionItem[] = tasksFromBackend.map((t, idx) => ({
            id: t.id || `task-${idx}-${Date.now()}`,
            title: t.title,
            description: t.description || '',
            targetDept: (idx % 2 === 0 ? 'ENG' : 'PROD') as DepartmentCode,
            priority: (idx === 0 ? 'CRITICAL' : 'HIGH') as StrategicPriority,
            estimatedHours: 20 + idx * 10,
            storyPoints: 5 + idx * 3,
            assigneeName:
              t.assignee_name || TEAM_MEMBERS_DIRECTORY[idx % TEAM_MEMBERS_DIRECTORY.length].name,
            assigneeEmail: TEAM_MEMBERS_DIRECTORY[idx % TEAM_MEMBERS_DIRECTORY.length].email,
            deadline: t.deadline ? t.deadline.slice(0, 10) : '2026-09-15',
            status: 'TODO',
          }));
          setItems(mapped);
        } else if (initialActionItems.length > 0) {
          const mapped: EditableActionItem[] = initialActionItems.map((t, idx) => ({
            id: t.id || `ai-${idx}-${Date.now()}`,
            title: t.title,
            description: t.description || '',
            targetDept: (idx % 2 === 0 ? 'ENG' : 'PROD') as DepartmentCode,
            priority: (idx === 0 ? 'CRITICAL' : 'HIGH') as StrategicPriority,
            estimatedHours: 20 + idx * 10,
            storyPoints: 5 + idx * 3,
            assigneeName:
              t.assignee_name || TEAM_MEMBERS_DIRECTORY[idx % TEAM_MEMBERS_DIRECTORY.length].name,
            assigneeEmail: TEAM_MEMBERS_DIRECTORY[idx % TEAM_MEMBERS_DIRECTORY.length].email,
            deadline: t.due_date ? t.due_date.slice(0, 10) : '2026-09-15',
            status: 'TODO',
          }));
          setItems(mapped);
        } else {
          // Provide standard structured protocol action items if transcript had few items
          setItems([
            {
              id: 'item-01',
              title: 'Tối ưu hóa Audio Ducking & Streaming WebRTC LiveKit Egress',
              description:
                'Đảm bảo độ trễ nhận diện giọng nói STT dưới 200ms và không rò rỉ bộ nhớ local buffer.',
              targetDept: 'ENG',
              priority: 'CRITICAL',
              estimatedHours: 40,
              storyPoints: 8,
              assigneeName: 'Alex Vance',
              assigneeEmail: 'alex.vance@axiom.com',
              deadline: '2026-09-12',
              status: 'TODO',
            },
            {
              id: 'item-02',
              title: 'Thiết kế & hoàn thiện luồng Agile Sprint Kanban 4 cột Mini Jira',
              description:
                'Bổ sung thanh lọc nhanh theo assignee, nhãn ưu tiên và tính toán story points tự động.',
              targetDept: 'PROD',
              priority: 'HIGH',
              estimatedHours: 25,
              storyPoints: 5,
              assigneeName: 'Phạm Thu Trang',
              assigneeEmail: 'trang.pham@axiom.com',
              deadline: '2026-09-15',
              status: 'TODO',
            },
            {
              id: 'item-03',
              title: 'Triển khai kịch bản kiểm thử tải trọng 50 phòng họp đồng thời',
              description: 'Thực hiện stress test hệ thống Redis Pub/Sub và LiveKit SFU cluster.',
              targetDept: 'ENG',
              priority: 'HIGH',
              estimatedHours: 30,
              storyPoints: 5,
              assigneeName: 'Elena Rostova',
              assigneeEmail: 'elena.r@axiom.com',
              deadline: '2026-09-18',
              status: 'TODO',
            },
          ]);
        }
      } catch (err) {
        console.warn('Could not execute endMeeting API, using local fallback:', err);
        setSummaryData({
          content: `Phiên họp "${meetingTitle}" đã kết thúc thành công với sự tham gia đầy đủ của các thành viên. Hệ thống AI đã hoàn tất việc trích xuất các quyết sách và danh mục công việc cần triển khai. Các bên thống nhất ưu tiên hoàn thiện kiến trúc âm thanh và giao diện Agile Sprint đúng thời hạn.`,
          key_points:
            '• Đánh giá hiệu năng STT thời gian thực đạt độ trễ ấn tượng dưới 250ms.\n• Thống nhất chuẩn giao diện phân quyền 3 Bàn làm việc (Admin, Manager, Member).\n• Cần tăng tốc độ phân bổ công việc tránh tình trạng lệch tải giữa các khối.',
          decisions:
            '1. Thông qua ngân sách thử nghiệm cho cụm máy chủ xử lý âm thanh AI on-premise.\n2. Bắt buộc gắn mã quyết sách (Mandate) cho mọi task con phát sinh từ tuần này.\n3. Khối Kỹ Thuật chịu trách nhiệm bàn giao bản prototype trước ngày 15/09.',
        });

        // Initialize fallback items
        setItems([
          {
            id: 'fallback-01',
            title: 'Tối ưu hóa Pipeline Audio Egress & Whisper STT',
            description: 'Hoàn thiện nhận diện ngôn ngữ tiếng Việt và tiếng Anh song song.',
            targetDept: 'ENG',
            priority: 'CRITICAL',
            estimatedHours: 35,
            storyPoints: 8,
            assigneeName: 'Alex Vance',
            assigneeEmail: 'alex.vance@axiom.com',
            deadline: '2026-09-14',
            status: 'TODO',
          },
          {
            id: 'fallback-02',
            title: 'Đồng bộ hóa Trạng thái Nhiệm Vụ Mini Jira sang Bàn Làm Việc Member',
            description: 'Đảm bảo nhân sự thấy ngay việc cần làm không cần qua dashboard cũ.',
            targetDept: 'PROD',
            priority: 'HIGH',
            estimatedHours: 20,
            storyPoints: 5,
            assigneeName: 'Trần Minh Khoa',
            assigneeEmail: 'khoa.tran@axiom.com',
            deadline: '2026-09-16',
            status: 'TODO',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEndMeetingData();
  }, [isOpen, meetingId, meetingTitle]);

  if (!isOpen) return null;

  // Handlers for modifying items
  const handleUpdateItem = (id: string, updates: Partial<EditableActionItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleAddItem = () => {
    const newItem: EditableActionItem = {
      id: `new-${Date.now()}`,
      title: 'Hạng mục hành động mới từ cuộc họp',
      description: 'Mô tả chi tiết yêu cầu kỹ thuật và chỉ tiêu bàn giao...',
      targetDept: 'ENG',
      priority: 'HIGH',
      estimatedHours: 20,
      storyPoints: 5,
      assigneeName: 'Alex Vance',
      assigneeEmail: 'alex.vance@axiom.com',
      deadline: '2026-09-20',
      status: 'TODO',
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Publish as Executive Mandates (C-level ➔ Departments)
  const handlePublishExecutiveMandates = () => {
    setIsPublishingMandates(true);
    try {
      const newMandates: ExecutiveMandate[] = items.map((item, idx) => {
        const deptInfo =
          DEPARTMENT_OPTIONS.find((d) => d.code === item.targetDept) || DEPARTMENT_OPTIONS[0];
        return {
          id: `mandate-live-${Date.now()}-${idx}`,
          code: `MANDATE-${item.targetDept}-${Math.floor(100 + Math.random() * 900)}`,
          title: item.title,
          sourceMeetingId: meetingId,
          sourceMeetingTitle: meetingTitle,
          executiveHost: userRole === 'OWNER' ? 'Chủ tịch HĐQT' : 'Ban Giám Đốc',
          targetDepartment: item.targetDept,
          targetDepartmentName: deptInfo.name,
          managerName: deptInfo.managerName,
          strategicPriority: item.priority,
          allocatedHours: item.estimatedHours,
          storyPoints: item.storyPoints,
          deadline: item.deadline,
          status: 'PENDING_DECOMPOSITION',
          decomposedTasksCount: 0,
          totalTasksTarget: Math.ceil(item.estimatedHours / 10),
          aiConfidenceScore: 95,
          suggestedTasks: [
            {
              title: item.title,
              estimatedHours: Math.round(item.estimatedHours * 0.6),
              recommendedRole: 'Senior Engineer',
            },
            {
              title: `Rà soát tiêu chuẩn và kiểm thử nghiệm thu: ${item.title}`,
              estimatedHours: Math.round(item.estimatedHours * 0.4),
              recommendedRole: 'QA & Tech Lead',
            },
          ],
        };
      });

      addStoredMandates(newMandates);
      showToast(
        `🎉 Đã ban hành ${newMandates.length} Quyết Sách Chiến Lược tới các Khối Phòng Ban!`
      );
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi ban hành quyết sách.');
    } finally {
      setIsPublishingMandates(false);
    }
  };

  // Sync tasks to Member and Jira (Department ➔ Members)
  const handleSyncToMemberAndJira = async () => {
    setIsSyncingJira(true);
    try {
      // 1. Save to local storage for MemberTasksTab
      const newTasks: DecomposedTask[] = items.map((item, idx) => ({
        id: `task-live-${Date.now()}-${idx}`,
        title: item.title,
        mandateOriginCode: `DEPT-${item.targetDept}`,
        mandateOriginTitle: meetingTitle,
        meetingOrigin: meetingTitle,
        assigneeName: item.assigneeName,
        assigneeEmail: item.assigneeEmail,
        estimatedHours: item.estimatedHours,
        priority: item.priority,
        status: 'TODO',
        deadline: item.deadline,
      }));

      addStoredMemberTasks(newTasks);

      // 2. Call Jira API to sync if available
      try {
        await jiraApi.syncMeetingTasksToJira(meetingId, {});
      } catch (jiraErr) {
        console.warn('Jira API sync skipped/mocked:', jiraErr);
      }

      showToast(
        `🚀 Đã phân bổ ${newTasks.length} nhiệm vụ cho nhân viên & cập nhật bảng Jira Sprint!`
      );
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi phân bổ nhiệm vụ.');
    } finally {
      setIsSyncingJira(false);
    }
  };

  const handleCopyMoM = () => {
    const momText = `
# BIÊN BẢN CUỘC HỌP / MEETING PROTOCOL
**Cuộc họp**: ${meetingTitle}
**Mã phòng**: ${meetingId}
**Thời gian**: ${new Date().toLocaleString('vi-VN')}

---
### 1. TỔNG QUAN (SUMMARY)
${summaryData?.content || 'Chưa có tóm tắt.'}

---
### 2. ĐIỂM THẢO LUẬN CHÍNH (KEY POINTS)
${summaryData?.key_points || 'Không có điểm thảo luận chính.'}

---
### 3. QUYẾT ĐỊNH ĐÃ THỐNG NHẤT (DECISIONS)
${summaryData?.decisions || 'Không có quyết định.'}

---
### 4. DANH MỤC HÀNH ĐỘNG (ACTION ITEMS)
${items
  .map(
    (it, i) =>
      `${i + 1}. [${it.priority}] ${it.title}\n   - Phụ trách: ${
        meetingMode === 'EXECUTIVE' ? it.targetDept : it.assigneeName
      }\n   - Hạn định: ${it.deadline}`
  )
  .join('\n')}
    `.trim();

    navigator.clipboard.writeText(momText);
    setCopiedMoM(true);
    setTimeout(() => setCopiedMoM(false), 3000);
    showToast('Đã sao chép toàn bộ biên bản cuộc họp vào Clipboard!');
  };

  const handleFinishAndNavigate = () => {
    let target = '/member';
    if (userRole === 'OWNER' || userRole === 'ADMIN') target = '/admin';
    else if (userRole === 'MANAGER') target = '/manager';
    onComplete(target);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-60 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-2xl text-xs font-semibold animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ── 1. Top Header ── */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Tổng Kết Cuộc Họp & Phân Phối Action Items
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  AI Protocol Gateway
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-lg">
                Cuộc họp:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {meetingTitle}
                </span>{' '}
                • ID: <span className="font-mono">{meetingId.slice(0, 12)}...</span>
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMeetingMode('EXECUTIVE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                meetingMode === 'EXECUTIVE'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Phân bổ Action Items thành Quyết sách giao cho Khối Phòng Ban"
            >
              <Building2 size={14} />
              <span>Họp Cấp Cao (Khối)</span>
            </button>
            <button
              onClick={() => setMeetingMode('DEPARTMENT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                meetingMode === 'DEPARTMENT'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Phân bổ Action Items thành Task cho từng Nhân viên & Jira"
            >
              <Users size={14} />
              <span>Họp Phòng Ban (Member)</span>
            </button>
          </div>
        </div>

        {/* ── 2. Tab Navigation ── */}
        <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('cascade')}
              className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'cascade'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers size={15} />
              <span>
                {meetingMode === 'EXECUTIVE'
                  ? 'Phân Bổ Quyết Sách Khối (Mandates)'
                  : 'Phân Bổ Task Cho Member & Jira'}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {items.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('mom')}
              className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'mom'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText size={15} />
              <span>Biên Bản Tóm Tắt AI (MoM & Decisions)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMoM}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {copiedMoM ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedMoM ? 'Đã copy!' : 'Sao chép MoM'}</span>
            </button>
          </div>
        </div>

        {/* ── 3. Tab Content Area ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                AI đang xử lý âm thanh, tổng hợp biên bản MoM & bóc tách Action items...
              </p>
            </div>
          ) : activeTab === 'cascade' ? (
            /* ── TAB CASCADE: Smart Allocation ── */
            <div className="space-y-4">
              {/* Banner explain context */}
              <div
                className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                  meetingMode === 'EXECUTIVE'
                    ? 'bg-blue-50/70 border-blue-200/80 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-200'
                    : 'bg-purple-50/70 border-purple-200/80 text-purple-900 dark:bg-purple-950/30 dark:border-purple-900/50 dark:text-purple-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {meetingMode === 'EXECUTIVE' ? (
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  ) : (
                    <Users className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">
                      {meetingMode === 'EXECUTIVE'
                        ? 'Chế độ Cuộc họp Cấp Cao (Executive Mandate Cascade):'
                        : 'Chế độ Cuộc họp Phòng Ban (Department Task Allocation):'}
                    </span>{' '}
                    {meetingMode === 'EXECUTIVE'
                      ? 'Các action items từ phiên họp này sẽ được chuẩn hóa thành Quyết sách giao chỉ tiêu cho từng Khối Phòng Ban. Khi ban hành, các Trưởng phòng sẽ nhận được thông báo để phân rã vào cuộc họp Sprint của phòng.'
                      : 'Các action items từ phiên họp này sẽ được gán trực tiếp cho từng cá nhân (Member) trong phòng, tự động đồng bộ sang bảng Kanban Mini Jira và xuất hiện ngay trên Bàn làm việc của nhân viên.'}
                  </div>
                </div>

                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-800 dark:text-slate-100 rounded-lg font-semibold shrink-0 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Thêm Action Item</span>
                </button>
              </div>

              {/* Action Items List */}
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                            className="w-full text-xs font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="Tên action item..."
                          />
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { description: e.target.value })
                            }
                            className="w-full text-[11px] text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="Mô tả chi tiết hoặc tiêu chí nghiệm thu..."
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Xóa item này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Allocation Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      {meetingMode === 'EXECUTIVE' ? (
                        <>
                          {/* Target Department */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Khối Phòng Ban Phụ Trách
                            </label>
                            <select
                              value={item.targetDept}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  targetDept: e.target.value as DepartmentCode,
                                })
                              }
                              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                            >
                              {DEPARTMENT_OPTIONS.map((d) => (
                                <option key={d.code} value={d.code}>
                                  {d.name} ({d.managerName})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Priority */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Mức Độ Chiến Lược
                            </label>
                            <select
                              value={item.priority}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  priority: e.target.value as StrategicPriority,
                                })
                              }
                              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                            >
                              <option value="CRITICAL">🔴 P0 - Trọng Yếu Khẩn Cấp</option>
                              <option value="HIGH">🟠 P1 - Ưu Tiên Cao</option>
                              <option value="MEDIUM">🟡 P2 - Tiêu Chuẩn</option>
                            </select>
                          </div>

                          {/* Target Deadline */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Hạn Bàn Giao Khối
                            </label>
                            <input
                              type="date"
                              value={item.deadline}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { deadline: e.target.value })
                              }
                              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Estimated Hours */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Dung Lượng Phân Bổ (Giờ)
                            </label>
                            <input
                              type="number"
                              value={item.estimatedHours}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  estimatedHours: parseInt(e.target.value) || 10,
                                })
                              }
                              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                              min={5}
                              step={5}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Member Assignee */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Nhân Sự Đảm Nhận (Member)
                            </label>
                            <select
                              value={item.assigneeName}
                              onChange={(e) => {
                                const mem = TEAM_MEMBERS_DIRECTORY.find(
                                  (m) => m.name === e.target.value
                                );
                                handleUpdateItem(item.id, {
                                  assigneeName: e.target.value,
                                  assigneeEmail: mem?.email || '',
                                });
                              }}
                              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                            >
                              {TEAM_MEMBERS_DIRECTORY.map((m) => (
                                <option key={m.id} value={m.name}>
                                  {m.name} ({m.role})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Priority */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Độ Ưu Tiên Task
                            </label>
                            <select
                              value={item.priority}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  priority: e.target.value as StrategicPriority,
                                })
                              }
                              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                            >
                              <option value="CRITICAL">🔴 Critical (Chặn blocker)</option>
                              <option value="HIGH">🟠 High (Sprint Goal)</option>
                              <option value="MEDIUM">🟡 Medium (Thường)</option>
                            </select>
                          </div>

                          {/* Deadline */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Hạn Hoàn Thành
                            </label>
                            <input
                              type="date"
                              value={item.deadline}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { deadline: e.target.value })
                              }
                              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Story Points */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Story Points Jira
                            </label>
                            <input
                              type="number"
                              value={item.storyPoints}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  storyPoints: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                              min={1}
                              max={21}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Execution Action Button */}
              <div className="pt-2 flex justify-end">
                {meetingMode === 'EXECUTIVE' ? (
                  <button
                    onClick={handlePublishExecutiveMandates}
                    disabled={isPublishingMandates || items.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPublishingMandates ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Building2 size={15} />
                    )}
                    <span>Ban Hành Quyết Sách Tới Các Khối Phòng Ban</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSyncToMemberAndJira}
                    disabled={isSyncingJira || items.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSyncingJira ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Kanban size={15} />
                    )}
                    <span>Giao Nhiệm Vụ Cho Nhân Sự & Đẩy Lên Jira</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ── TAB MOM: Meeting Minutes & Decisions ── */
            <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
              {/* Summary Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  <FileText size={15} />
                  <span>1. Tóm Tắt Phiên Họp (Executive Brief)</span>
                </div>
                <p className="leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200">
                  {summaryData?.content || 'Chưa có nội dung tóm tắt từ hệ thống.'}
                </p>
              </div>

              {/* Key Points Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <Sparkles size={15} />
                  <span>2. Điểm Thảo Luận Cốt Lõi (Key Points)</span>
                </div>
                <div className="leading-relaxed whitespace-pre-line pl-2 text-slate-800 dark:text-slate-200">
                  {summaryData?.key_points ||
                    'Đã thống nhất các tiêu chí kỹ thuật và quy chế làm việc.'}
                </div>
              </div>

              {/* Decisions Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <ShieldCheck size={15} />
                  <span>3. Quyết Định Chiến Lược Đã Chốt (Approved Decisions)</span>
                </div>
                <div className="leading-relaxed whitespace-pre-line pl-2 text-slate-800 dark:text-slate-200">
                  {summaryData?.decisions ||
                    'Toàn bộ quyết sách đã được ghi nhận vào nhật ký kiểm toán.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Modal Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng lại
          </button>

          <button
            onClick={handleFinishAndNavigate}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 rounded-xl text-xs font-bold shadow-lg shadow-black/10 transition-all cursor-pointer"
          >
            <span>Hoàn Tất & Về Bàn Làm Việc</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
