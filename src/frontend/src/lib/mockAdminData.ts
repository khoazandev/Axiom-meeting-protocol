/**
 * Axiom DX-OS — Enterprise Governance Mock Data
 * Realistic, cohesive corporate data for testing and demonstrations.
 */

export interface AdminPulseMetrics {
  totalMeetingsThisMonth: number;
  meetingsGrowth: string;
  onTimePunctualRate: number;
  taskExecutionRate: number;
  totalActiveMembers: number;
  sttTranscribedHours: number;
  storageUsedGb: number;
  storageMaxGb: number;
  hoursSavedByAi?: number;
}

export interface LiveRadarMeeting {
  id: string;
  title: string;
  department: string;
  hostName: string;
  hostAvatar: string;
  participantCount: number;
  participantsCount?: number;
  maxParticipants: number;
  durationMinutes: number;
  duration?: string;
  hasLiveStt: boolean;
  hasAutoMom: boolean;
  hasAgenda?: boolean;
  status: 'IN_PROGRESS' | 'SCHEDULED';
  roomCode: string;
  participants?: string[];
}

export type OrgRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface OrgMemberItem {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  department: string;
  title: string;
  role: OrgRole;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedDate: string;
  lastActive: string;
  meetingsCount: number;
}

export interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  description: string;
  managerName: string;
  managerEmail: string;
  managerAvatar?: string;
  memberCount: number;
  activeMeetingsCount: number;
  color: string;
}

export interface ProtocolPolicySettings {
  enforceAgendaGate: boolean;
  minAgendaLength: number;
  autoExtractMom: boolean;
  requireTaskAssignee: boolean;
  recordingStorageRetentionDays: number;
  requireCameraAttendance: boolean;
  allowGuestJoining: boolean;
  sttLanguagePriority: 'vi' | 'en' | 'multilingual';
}

export interface SecurityAuditEntry {
  id: string;
  action: string;
  category: 'AUTH' | 'MEETING' | 'RBAC' | 'SYSTEM' | 'DATA';
  userName: string;
  userEmail: string;
  ipAddress: string;
  details: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  timestamp: string;
}

export interface EnterpriseWebhookItem {
  id: string;
  name: string;
  targetUrl: string;
  events: string[];
  secretKey: string;
  isActive: boolean;
  lastTriggered?: string;
  successRate: number;
}

export interface ExecutiveApprovalItem {
  id: string;
  meetingTitle: string;
  meetingId: string;
  department: string;
  hostName: string;
  hostAvatar?: string;
  date: string;
  aiSummary: string;
  keyDecisions: string[];
  actionItems: {
    task: string;
    assignee: string;
    assigneeRole: string;
    deadline: string;
    priority: 'HIGH' | 'MEDIUM' | 'URGENT';
  }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
}

// ────────────────────────────────────────────────────────────
// Initial Mock State
// ────────────────────────────────────────────────────────────

export const initialPulseMetrics: AdminPulseMetrics = {
  totalMeetingsThisMonth: 142,
  meetingsGrowth: '+18.4%',
  onTimePunctualRate: 94.2,
  taskExecutionRate: 88.6,
  totalActiveMembers: 36,
  sttTranscribedHours: 320.5,
  storageUsedGb: 42.8,
  storageMaxGb: 500,
  hoursSavedByAi: 38.5,
};

export const initialLiveRadarMeetings: LiveRadarMeeting[] = [
  {
    id: 'meet-live-01',
    title: 'Review Kiến trúc Hệ thống LiveKit SFU v2',
    department: 'Khối Kỹ Thuật (Engineering)',
    hostName: 'Trần Minh Khoa',
    hostAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    participantCount: 8,
    participantsCount: 8,
    maxParticipants: 15,
    durationMinutes: 42,
    duration: '42:15',
    hasLiveStt: true,
    hasAutoMom: true,
    hasAgenda: true,
    status: 'IN_PROGRESS',
    roomCode: 'ENG-SFU-ARCH',
    participants: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'meet-live-02',
    title: 'Sprint Planning Q4 & Trình diễn Tính năng AI Task',
    department: 'Ban Sản Phẩm (Product & Design)',
    hostName: 'Nguyễn Lê Lan Hương',
    hostAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    participantCount: 6,
    participantsCount: 6,
    maxParticipants: 10,
    durationMinutes: 19,
    duration: '19:40',
    hasLiveStt: true,
    hasAutoMom: true,
    hasAgenda: true,
    status: 'IN_PROGRESS',
    roomCode: 'PROD-SPRINT-Q4',
    participants: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'meet-live-03',
    title: 'Gặp gỡ Khách hàng Doanh nghiệp Viettel Solutions',
    department: 'Khối Kinh Doanh (Commercial)',
    hostName: 'Lâm Hoàng Phát',
    hostAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    participantCount: 4,
    participantsCount: 4,
    maxParticipants: 8,
    durationMinutes: 55,
    duration: '55:02',
    hasLiveStt: true,
    hasAutoMom: false,
    hasAgenda: false,
    status: 'IN_PROGRESS',
    roomCode: 'SALES-VIETTEL-B2B',
    participants: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
    ],
  },
];

export const initialMembersList: OrgMemberItem[] = [
  {
    id: 'usr-01',
    fullName: 'Nguyễn Thế Khang (Chủ tịch HĐQT)',
    email: 'admin@axiom.com',
    avatarUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    department: 'Ban Giám Đốc',
    title: 'Chủ tịch Hội đồng Quản trị & CEO Tập đoàn',
    role: 'OWNER',
    status: 'ACTIVE',
    joinedDate: '01/01/2026',
    lastActive: 'Vừa xong',
    meetingsCount: 84,
  },
  {
    id: 'usr-02',
    fullName: 'Sarah Connor',
    email: 'sarah@axiom.internal',
    avatarUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    department: 'Khối Vận Hành',
    title: 'Trưởng Khối Vận Hành & An Ninh',
    role: 'MANAGER',
    status: 'ACTIVE',
    joinedDate: '15/01/2026',
    lastActive: '5 phút trước',
    meetingsCount: 62,
  },
  {
    id: 'usr-03',
    fullName: 'Trần Minh Khoa',
    email: 'khoa.tran@axiom.internal',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    department: 'Khối Kỹ Thuật',
    title: 'Lead Platform Architect',
    role: 'MANAGER',
    status: 'ACTIVE',
    joinedDate: '02/02/2026',
    lastActive: 'Đang trong phòng họp',
    meetingsCount: 57,
  },
  {
    id: 'usr-04',
    fullName: 'Nguyễn Lê Lan Hương',
    email: 'lanhuong@axiom.internal',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    department: 'Ban Sản Phẩm',
    title: 'Head of Product Strategy',
    role: 'MANAGER',
    status: 'ACTIVE',
    joinedDate: '10/02/2026',
    lastActive: 'Đang trong phòng họp',
    meetingsCount: 49,
  },
  {
    id: 'usr-05',
    fullName: 'Lâm Hoàng Phát',
    email: 'phat.lam@axiom.internal',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    department: 'Khối Kinh Doanh',
    title: 'Enterprise Partnerships Director',
    role: 'MANAGER',
    status: 'ACTIVE',
    joinedDate: '20/02/2026',
    lastActive: 'Đang trong phòng họp',
    meetingsCount: 71,
  },
  {
    id: 'usr-06',
    fullName: 'Alex Rivera',
    email: 'alex@axiom.internal',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    department: 'Khối Kỹ Thuật',
    title: 'Senior AI / Whisper Engineer',
    role: 'MEMBER',
    status: 'ACTIVE',
    joinedDate: '01/03/2026',
    lastActive: '25 phút trước',
    meetingsCount: 38,
  },
  {
    id: 'usr-07',
    fullName: 'Võ Thị Mai Phương',
    email: 'maiphuong@axiom.internal',
    avatarUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    department: 'Phòng Vận Hành & HR',
    title: 'People Operations Manager',
    role: 'MANAGER',
    status: 'ACTIVE',
    joinedDate: '05/03/2026',
    lastActive: '1 giờ trước',
    meetingsCount: 33,
  },
  {
    id: 'usr-08',
    fullName: 'Đặng Quang Huy',
    email: 'huy.dang@axiom.internal',
    avatarUrl:
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80',
    department: 'Ban Sản Phẩm',
    title: 'Product Designer & UX Researcher',
    role: 'MEMBER',
    status: 'ACTIVE',
    joinedDate: '15/03/2026',
    lastActive: '2 giờ trước',
    meetingsCount: 29,
  },
  {
    id: 'usr-09',
    fullName: 'Bùi Tuấn Anh',
    email: 'tuananh.bui@axiom.internal',
    avatarUrl:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
    department: 'Khối Kỹ Thuật',
    title: 'DevOps & SRE Specialist',
    role: 'MEMBER',
    status: 'ACTIVE',
    joinedDate: '20/03/2026',
    lastActive: 'Hôm qua',
    meetingsCount: 22,
  },
  {
    id: 'usr-10',
    fullName: 'Hoàng Gia Bảo (Tạm khóa)',
    email: 'giabao@axiom.internal',
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
    department: 'Khối Kinh Doanh',
    title: 'Sales Representative',
    role: 'MEMBER',
    status: 'SUSPENDED',
    joinedDate: '25/03/2026',
    lastActive: '7 ngày trước',
    meetingsCount: 9,
  },
];

export const initialDepartments: DepartmentNode[] = [
  {
    id: 'dept-exec',
    name: 'Ban Giám Đốc',
    code: 'BOD',
    description:
      'Ban Lãnh đạo cấp cao, chỉ đạo định hướng chiến lược chuyển đổi số và bảo mật dữ liệu.',
    managerName: 'System Admin',
    managerEmail: 'admin@axiom.com',
    managerAvatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    memberCount: 3,
    activeMeetingsCount: 1,
    color: '#4F7BF7',
  },
  {
    id: 'dept-eng',
    name: 'Khối Kỹ Thuật & AI',
    code: 'ENG-AI',
    description:
      'Đội ngũ phát triển hạ tầng WebRTC LiveKit, AI Whisper STT, và kiến trúc microservices.',
    managerName: 'Trần Minh Khoa',
    managerEmail: 'khoa.tran@axiom.internal',
    managerAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    memberCount: 14,
    activeMeetingsCount: 2,
    color: '#10B981',
  },
  {
    id: 'dept-prod',
    name: 'Ban Sản Phẩm & UX',
    code: 'PROD-UX',
    description:
      'Nghiên cứu hành vi người dùng, chuẩn hóa luồng họp trực tuyến và giao diện không gian họp.',
    managerName: 'Nguyễn Lê Lan Hương',
    managerEmail: 'lanhuong@axiom.internal',
    managerAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    memberCount: 8,
    activeMeetingsCount: 1,
    color: '#8B5CF6',
  },
  {
    id: 'dept-sales',
    name: 'Khối Kinh Doanh & Đối Tác',
    code: 'COMM',
    description: 'Kết nối triển khai hệ thống cho các tập đoàn viễn thông và cơ quan chính phủ.',
    managerName: 'Lâm Hoàng Phát',
    managerEmail: 'phat.lam@axiom.internal',
    managerAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    memberCount: 7,
    activeMeetingsCount: 1,
    color: '#F59E0B',
  },
  {
    id: 'dept-hr',
    name: 'Vận Hành & Nhân Sự',
    code: 'OPS-HR',
    description: 'Quản trị trải nghiệm nhân viên, văn hóa tuân thủ và chính sách họp nội bộ.',
    managerName: 'Võ Thị Mai Phương',
    managerEmail: 'maiphuong@axiom.internal',
    managerAvatar:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    memberCount: 4,
    activeMeetingsCount: 0,
    color: '#EC4899',
  },
];

export const initialPolicies: ProtocolPolicySettings = {
  enforceAgendaGate: true,
  minAgendaLength: 20,
  autoExtractMom: true,
  requireTaskAssignee: true,
  recordingStorageRetentionDays: 90,
  requireCameraAttendance: false,
  allowGuestJoining: true,
  sttLanguagePriority: 'vi',
};

export const initialSecurityLogs: SecurityAuditEntry[] = [
  {
    id: 'log-01',
    action: 'USER_LOGIN_SUCCESS',
    category: 'AUTH',
    userName: 'System Admin',
    userEmail: 'admin@axiom.com',
    ipAddress: '192.168.1.100 (Internal VPN)',
    details: 'Đăng nhập thành công với quyền OWNER qua 2FA On-Premise.',
    severity: 'INFO',
    timestamp: 'Vừa xong',
  },
  {
    id: 'log-02',
    action: 'ROLE_PROMOTED',
    category: 'RBAC',
    userName: 'System Admin',
    userEmail: 'admin@axiom.com',
    ipAddress: '192.168.1.100',
    details: "Nâng cấp tài khoản 'sarah@axiom.internal' từ MANAGER lên ADMIN tổ chức.",
    severity: 'WARN',
    timestamp: '12 phút trước',
  },
  {
    id: 'log-03',
    action: 'MEETING_PROTOCOL_BYPASS_ATTEMPT',
    category: 'MEETING',
    userName: 'Alex Rivera',
    userEmail: 'alex@axiom.internal',
    ipAddress: '192.168.1.145',
    details: 'Cố gắng khởi tạo phòng họp nhưng bị chặn do Agenda chỉ có 8 ký tự (Yêu cầu >= 20).',
    severity: 'WARN',
    timestamp: '35 phút trước',
  },
  {
    id: 'log-04',
    action: 'MOM_AI_AUTO_SYNC_JIRA',
    category: 'DATA',
    userName: 'Babel Fish AI Agent',
    userEmail: 'agent@axiom.system',
    ipAddress: '127.0.0.1 (Docker Host)',
    details:
      "Tự động trích xuất 6 Action Items từ phiên họp 'Review Sprint 18' và đồng bộ sang Jira.",
    severity: 'INFO',
    timestamp: '1 giờ trước',
  },
  {
    id: 'log-05',
    action: 'WEBHOOK_TRIGGERED',
    category: 'SYSTEM',
    userName: 'System Event Bus',
    userEmail: 'system@axiom.internal',
    ipAddress: '127.0.0.1',
    details:
      "Gửi webhook 'meeting.finished' tới https://api.enterprise-erp.internal/webhooks thành công (HTTP 200).",
    severity: 'INFO',
    timestamp: '1 giờ trước',
  },
  {
    id: 'log-06',
    action: 'FAILED_LOGIN_ATTEMPT',
    category: 'AUTH',
    userName: 'Unknown',
    userEmail: 'guest_attacker@external.net',
    ipAddress: '203.113.152.12 (Bị chặn Firewall)',
    details: 'Thử đăng nhập sai mật khẩu 5 lần liên tiếp. Địa chỉ IP đã bị đưa vào danh sách đen.',
    severity: 'CRITICAL',
    timestamp: '3 giờ trước',
  },
];

export const initialWebhooks: EnterpriseWebhookItem[] = [
  {
    id: 'wh-01',
    name: 'Hệ thống Quản trị Doanh nghiệp ERP',
    targetUrl: 'https://erp.axiom-corp.internal/api/v1/meetings/webhook',
    events: ['meeting.finished', 'mom.published'],
    secretKey: 'whsec_live_9a8b7c6d5e4f3a2b1c',
    isActive: true,
    lastTriggered: '1 giờ trước',
    successRate: 99.8,
  },
  {
    id: 'wh-02',
    name: 'Kênh Thông báo Slack / Teams Điều Hành',
    targetUrl: 'https://hooks.slack.internal/services/T00/B00/axiom-alerts',
    events: ['meeting.started', 'task.created'],
    secretKey: 'whsec_live_3f2e1d0c9b8a7b6c5d',
    isActive: true,
    lastTriggered: '19 phút trước',
    successRate: 100,
  },
  {
    id: 'wh-03',
    name: 'Jira Cloud On-Premise Sync Service',
    targetUrl: 'https://jira.axiom.internal/rest/api/2/issue/bulk-sync',
    events: ['task.created', 'task.completed'],
    secretKey: 'whsec_live_5c4b3a2f1e0d9c8b7a',
    isActive: true,
    lastTriggered: '2 giờ trước',
    successRate: 98.5,
  },
];

export const initialApprovals: ExecutiveApprovalItem[] = [
  {
    id: 'appr-01',
    meetingTitle: 'Review Kiến trúc Hệ thống LiveKit SFU v2 & Cụm GPU Whisper',
    meetingId: 'meet-live-01',
    department: 'Khối Kỹ Thuật',
    hostName: 'Trần Minh Khoa',
    hostAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    date: 'Hôm nay, 14:30',
    aiSummary:
      'Cuộc họp đã thống nhất chuyển đổi kiến trúc SFU sang mô hình phân tán (Distributed SFU) nhằm đáp ứng tải 500 phòng họp đồng thời. Cần phê duyệt kinh phí trang bị thêm cụm máy chủ GPU nội bộ và chốt thời hạn kiểm thử tải trước 25/10.',
    keyDecisions: [
      'Thông qua thiết kế kiến trúc phân tán đa vùng (Multi-region SFU cluster)',
      'Ưu tiên cấp phát cụm 4 máy chủ NVIDIA A100 cho mô hình Whisper Large v3',
      'Yêu cầu báo cáo nghiệm thu an toàn thông tin trước khi đưa vào sản xuất',
    ],
    actionItems: [
      {
        task: 'Hoàn thiện tài liệu kiến trúc bảo mật SFU gửi Ban Giám Đốc',
        assignee: 'Trần Minh Khoa',
        assigneeRole: 'Trưởng Khối Kỹ Thuật',
        deadline: '12/10/2026',
        priority: 'URGENT',
      },
      {
        task: 'Triển khai thử nghiệm tải 500 luồng đồng thời trên môi trường Staging',
        assignee: 'Alex Rivera',
        assigneeRole: 'Senior AI Engineer',
        deadline: '18/10/2026',
        priority: 'HIGH',
      },
    ],
    status: 'PENDING',
    urgency: 'HIGH',
  },
  {
    id: 'appr-02',
    meetingTitle: 'Sprint Planning Q4 & Trình diễn Tính năng AI Task Pipeline',
    meetingId: 'meet-live-02',
    department: 'Ban Sản Phẩm',
    hostName: 'Nguyễn Lê Lan Hương',
    hostAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    date: 'Hôm nay, 11:15',
    aiSummary:
      'Khối Sản Phẩm đã hoàn thành Prototype tính năng Agenda Gatekeeper tự động khóa phòng họp nếu thiếu chương trình làm việc. Đề xuất Giám đốc ban hành quy chế thử nghiệm nội bộ trong 2 tuần.',
    keyDecisions: [
      'Bắt buộc áp dụng Agenda Gatekeeper đối với các cuộc họp trên 5 người',
      'Tích hợp nút ký số điện tử trên Biên bản họp (MoM) cho cấp Quản lý',
    ],
    actionItems: [
      {
        task: 'Soạn thảo văn bản quy chế hướng dẫn nhân viên áp dụng Agenda mới',
        assignee: 'Nguyễn Lê Lan Hương',
        assigneeRole: 'Trưởng Ban Sản Phẩm',
        deadline: '14/10/2026',
        priority: 'HIGH',
      },
    ],
    status: 'PENDING',
    urgency: 'MEDIUM',
  },
  {
    id: 'appr-03',
    meetingTitle: 'Thương Thảo Hợp Đồng Chuyển Đổi Số Với Tập Đoàn Viettel Solutions',
    meetingId: 'meet-live-03',
    department: 'Khối Kinh Doanh',
    hostName: 'Lâm Hoàng Phát',
    hostAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    date: 'Hôm qua, 16:45',
    aiSummary:
      'Khách hàng yêu cầu cam kết thời gian đáp ứng hỗ trợ kỹ thuật On-Premise 24/7 (SLA 99.99%) và mức chiết khấu gói bảo trì năm 1 là 10%. Khối Kinh Doanh trình Giám đốc phê duyệt điều khoản này.',
    keyDecisions: [
      'Đồng ý mức chiết khấu 10% gói On-Premise kèm điều kiện thanh toán trước 100%',
      'Thành lập đội hỗ trợ kỹ thuật chuyên trách riêng cho dự án Viettel',
    ],
    actionItems: [
      {
        task: 'Chốt dự thảo phụ lục hợp đồng cam kết SLA và gửi khách hàng',
        assignee: 'Lâm Hoàng Phát',
        assigneeRole: 'Trưởng Khối Kinh Doanh',
        deadline: '10/10/2026',
        priority: 'URGENT',
      },
    ],
    status: 'APPROVED',
    urgency: 'HIGH',
  },
];

// MOCK_* compatibility aliases
export const MOCK_PULSE_METRICS = initialPulseMetrics;
export const MOCK_LIVE_MEETINGS = initialLiveRadarMeetings;
export const MOCK_MEMBERS = initialMembersList;
export const MOCK_DEPARTMENTS = initialDepartments;
export const MOCK_POLICIES = initialPolicies;
export const MOCK_AUDIT_LOGS = initialSecurityLogs;
export const MOCK_WEBHOOKS = initialWebhooks;
export const MOCK_APPROVALS = initialApprovals;
