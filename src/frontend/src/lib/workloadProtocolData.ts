export type DepartmentCode = "ENG" | "PROD" | "BIZ" | "OPS" | "FIN";

export type StrategicPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type MandateStatus =
  | "PENDING_DECOMPOSITION" // Chưa phân rã vào cuộc họp team
  | "PARTIALLY_ALLOCATED"   // Đang phân rã một phần
  | "FULLY_ALLOCATED"       // Đã phân rã toàn bộ thành task
  | "COMPLETED";            // Đã hoàn thành

export type WorkloadStatus =
  | "ZERO_TASK"   // 0 task - Chưa có việc / Thừa công suất (dưới 30% tải)
  | "OPTIMAL"     // 1-2 tasks - Tải lý tưởng (50% - 80%)
  | "FULL"        // 2-3 tasks - Đầy tải (80% - 100%)
  | "OVERLOADED"; // >= 3 tasks / quá tải (> 100%)

// ── 1. Quyết Sách Cấp Cao (Executive Mandate) ──
// Sinh ra từ cuộc họp Chủ tịch / Giám đốc & các Trưởng phòng
export interface ExecutiveMandate {
  id: string;
  code: string; // VD: "MANDATE-Q3-01"
  title: string;
  sourceMeetingId: string;
  sourceMeetingTitle: string; // "Hội nghị Ban Lãnh Đạo & Trưởng Khối Q3/2026"
  executiveHost: string; // "Chủ tịch Trần Đình Long"
  targetDepartment: DepartmentCode;
  targetDepartmentName: string;
  managerName: string;
  strategicPriority: StrategicPriority;
  allocatedHours: number; // Tổng giờ ước tính phân bổ cho khối
  storyPoints: number;
  deadline: string;
  status: MandateStatus;
  decomposedTasksCount: number; // Số task đã phân rã xuống nhân viên
  totalTasksTarget: number;     // Tổng số task dự kiến
  aiConfidenceScore: number;
  suggestedTasks: Array<{
    title: string;
    estimatedHours: number;
    recommendedRole: string;
    suggestedAssignee?: string;
  }>;
}

// ── 2. Task Con Phân Rã Xuống Nhân Sự (Decomposed Member Task) ──
export interface DecomposedTask {
  id: string;
  title: string;
  mandateOriginCode: string; // Mã quyết sách cấp cao
  mandateOriginTitle: string;
  meetingOrigin: string;      // Cuộc họp phòng ban sinh ra task
  assigneeName: string;
  assigneeEmail: string;
  estimatedHours: number;
  priority: StrategicPriority;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  deadline: string;
}

// ── 3. Tải Làm Việc Chi Tiết Của Từng Nhân Sự ──
export interface MemberCapacityWorkload {
  id: string;
  name: string;
  email: string;
  title: string;
  avatar: string;
  departmentCode: DepartmentCode;
  departmentName: string;
  status: "ONLINE" | "IN_MEETING" | "OFFLINE";
  weeklyMeetingHours: number;
  activeTasksCount: number;
  completedTasksCount: number;
  estimatedTaskHours: number;
  totalCommittedHours: number; // meetingHours + taskHours
  capacityPercent: number;     // totalCommittedHours / 40 * 100
  workloadStatus: WorkloadStatus;
  tasks: DecomposedTask[];
}

// ── 4. Chỉ Số Tải Tổng Hợp Của Từng Phòng Ban (Department Capacity Metric) ──
export interface DepartmentCapacityMetric {
  code: DepartmentCode;
  name: string;
  managerName: string;
  managerEmail: string;
  managerAvatar?: string;
  memberCount: number;
  totalWeeklyHours: number; // memberCount * 40h
  meetingHoursTotal: number;
  taskHoursCommitted: number;
  totalCommittedHours: number;
  utilizationRate: number; // (meetingHoursTotal + taskHoursCommitted) / totalWeeklyHours * 100
  status: "OVERLOADED" | "FULL" | "OPTIMAL" | "AVAILABLE";
  activeMeetingsCount: number;
  mandatesCount: number;
  zeroTaskCount: number;      // Nhân sự 0 task
  optimalTaskCount: number;   // Nhân sự 1-2 task
  overloadedCount: number;    // Nhân sự quá tải
  bottlenecksAlert: string | null;
  mandates: ExecutiveMandate[];
}

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA THỰC TẾ CHO TOÀN HỆ THỐNG
// ═══════════════════════════════════════════════════════════════════

export const MOCK_EXECUTIVE_MANDATES: ExecutiveMandate[] = [
  {
    id: "mnd-eng-01",
    code: "MANDATE-Q3-01",
    title: "Triển khai LiveKit Audio Egress & Chuẩn Hóa Bảo Mật On-premise",
    sourceMeetingId: "EXEC-Q3-STRATEGY",
    sourceMeetingTitle: "Hội nghị Ban Lãnh Đạo & Trưởng Khối Q3/2026",
    executiveHost: "Chủ Tịch Trần Đình Long",
    targetDepartment: "ENG",
    targetDepartmentName: "Khối Kỹ Thuật (Engineering)",
    managerName: "Trần Minh Khoa",
    strategicPriority: "CRITICAL",
    allocatedHours: 110,
    storyPoints: 18,
    deadline: "15/10/2026",
    status: "PARTIALLY_ALLOCATED",
    decomposedTasksCount: 4,
    totalTasksTarget: 6,
    aiConfidenceScore: 98,
    suggestedTasks: [
      {
        title: "Tối ưu hóa Buffer Whisper STT Latency < 400ms",
        estimatedHours: 18,
        recommendedRole: "Senior AI Engineer",
        suggestedAssignee: "Alex Rivera",
      },
      {
        title: "Thiết lập Pipeline Auto-Deploy Egress Worker lên K8s",
        estimatedHours: 16,
        recommendedRole: "DevOps Engineer",
        suggestedAssignee: "Phạm Quốc Bảo",
      },
      {
        title: "Viết Test Suite E2E chịu tải 500 CCU Audio Rooms",
        estimatedHours: 14,
        recommendedRole: "QA Automation",
        suggestedAssignee: "Đặng Thùy Dung", // 0 task member ready!
      },
      {
        title: "Audit bảo mật mã hóa AES-256 cho bản ghi STT",
        estimatedHours: 12,
        recommendedRole: "Security / Backend Core",
        suggestedAssignee: "Vũ Hải Đăng",
      },
    ],
  },
  {
    id: "mnd-eng-02",
    code: "MANDATE-Q3-02",
    title: "Nâng Cấp Engine Biên Dịch Thời Gian Thực Đa Ngữ (JA/KO/ZH)",
    sourceMeetingId: "EXEC-Q3-STRATEGY",
    sourceMeetingTitle: "Hội nghị Ban Lãnh Đạo & Trưởng Khối Q3/2026",
    executiveHost: "Chủ Tịch Trần Đình Long",
    targetDepartment: "ENG",
    targetDepartmentName: "Khối Kỹ Thuật (Engineering)",
    managerName: "Trần Minh Khoa",
    strategicPriority: "HIGH",
    allocatedHours: 85,
    storyPoints: 13,
    deadline: "28/10/2026",
    status: "PARTIALLY_ALLOCATED",
    decomposedTasksCount: 2,
    totalTasksTarget: 4,
    aiConfidenceScore: 95,
    suggestedTasks: [
      {
        title: "Tích hợp mô hình dịch NLLB-200 offline cho máy chủ nội bộ",
        estimatedHours: 24,
        recommendedRole: "AI Engineer",
        suggestedAssignee: "Alex Rivera",
      },
      {
        title: "Xây dựng giao diện phụ đề nổi song ngữ thời gian thực",
        estimatedHours: 16,
        recommendedRole: "Frontend Architect",
        suggestedAssignee: "Lê Thị Hồng",
      },
    ],
  },
  {
    id: "mnd-prod-01",
    code: "MANDATE-Q3-03",
    title: "Tái Cấu Trúc Trải Nghiệm Onboarding & Gói Đăng Ký Doanh Nghiệp",
    sourceMeetingId: "EXEC-Q3-STRATEGY",
    sourceMeetingTitle: "Hội nghị Ban Lãnh Đạo & Trưởng Khối Q3/2026",
    executiveHost: "Chủ Tịch Trần Đình Long",
    targetDepartment: "PROD",
    targetDepartmentName: "Khối Sản Phẩm (Product & UX)",
    managerName: "Phan Hoài Nam",
    strategicPriority: "HIGH",
    allocatedHours: 90,
    storyPoints: 12,
    deadline: "05/11/2026",
    status: "FULLY_ALLOCATED",
    decomposedTasksCount: 4,
    totalTasksTarget: 4,
    aiConfidenceScore: 94,
    suggestedTasks: [],
  },
  {
    id: "mnd-biz-01",
    code: "MANDATE-Q3-04",
    title: "Triển Khai Thử Nghiệm Axiom DX-OS Cho 3 Ngân Hàng Đối Tác",
    sourceMeetingId: "EXEC-Q3-STRATEGY",
    sourceMeetingTitle: "Hội nghị Ban Lãnh Đạo & Trưởng Khối Q3/2026",
    executiveHost: "Chủ Tịch Trần Đình Long",
    targetDepartment: "BIZ",
    targetDepartmentName: "Khối Phát Triển Thị Trường (Enterprise Sales)",
    managerName: "Hoàng Gia Bảo",
    strategicPriority: "CRITICAL",
    allocatedHours: 120,
    storyPoints: 20,
    deadline: "30/10/2026",
    status: "PENDING_DECOMPOSITION",
    decomposedTasksCount: 1,
    totalTasksTarget: 5,
    aiConfidenceScore: 91,
    suggestedTasks: [],
  },
];

// ── Danh Sách Nhân Sự & Tải Khối Kỹ Thuật (ENG) ──
export const INITIAL_ENG_MEMBERS: MemberCapacityWorkload[] = [
  {
    id: "mem-01",
    name: "Alex Rivera",
    email: "alex@axiom.com",
    title: "Senior AI & Audio Engineer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    departmentCode: "ENG",
    departmentName: "Khối Kỹ Thuật",
    status: "IN_MEETING",
    weeklyMeetingHours: 12.0,
    activeTasksCount: 3,
    completedTasksCount: 14,
    estimatedTaskHours: 22.0,
    totalCommittedHours: 34.0,
    capacityPercent: 85, // 34h / 40h = 85%
    workloadStatus: "OPTIMAL",
    tasks: [
      {
        id: "tsk-01",
        title: "Triển khai LiveKit Audio Egress & S3 Auto-Upload",
        mandateOriginCode: "MANDATE-Q3-01",
        mandateOriginTitle: "Hạ Tầng Realtime Audio & On-premise Security",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Alex Rivera",
        assigneeEmail: "alex@axiom.com",
        estimatedHours: 8,
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        deadline: "Hôm nay, 18:00",
      },
      {
        id: "tsk-02",
        title: "Tối ưu hóa Buffer Whisper STT Latency < 400ms",
        mandateOriginCode: "MANDATE-Q3-01",
        mandateOriginTitle: "Hạ Tầng Realtime Audio & On-premise Security",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Alex Rivera",
        assigneeEmail: "alex@axiom.com",
        estimatedHours: 8,
        priority: "HIGH",
        status: "TODO",
        deadline: "Ngày mai, 12:00",
      },
      {
        id: "tsk-03",
        title: "Nghiên cứu mô hình nén ngữ nghĩa STT đa ngôn ngữ",
        mandateOriginCode: "MANDATE-Q3-02",
        mandateOriginTitle: "Engine Biên Dịch Thời Gian Thực Đa Ngữ",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Alex Rivera",
        assigneeEmail: "alex@axiom.com",
        estimatedHours: 6,
        priority: "MEDIUM",
        status: "TODO",
        deadline: "Thứ Sáu, 17:00",
      },
    ],
  },
  {
    id: "mem-02",
    name: "Lê Thị Hồng",
    email: "hong.le@axiom.com",
    title: "Frontend Architect & Design Lead",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    departmentCode: "ENG",
    departmentName: "Khối Kỹ Thuật",
    status: "ONLINE",
    weeklyMeetingHours: 8.0,
    activeTasksCount: 2,
    completedTasksCount: 19,
    estimatedTaskHours: 20.0,
    totalCommittedHours: 28.0,
    capacityPercent: 70, // 28h / 40h = 70%
    workloadStatus: "OPTIMAL",
    tasks: [
      {
        id: "tsk-04",
        title: "Xây dựng Giao diện Phụ đề Nổi Song Ngữ Realtime",
        mandateOriginCode: "MANDATE-Q3-02",
        mandateOriginTitle: "Engine Biên Dịch Thời Gian Thực Đa Ngữ",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Lê Thị Hồng",
        assigneeEmail: "hong.le@axiom.com",
        estimatedHours: 12,
        priority: "HIGH",
        status: "IN_PROGRESS",
        deadline: "Thứ Năm",
      },
      {
        id: "tsk-05",
        title: "Chuẩn hóa Design System và Fixed-Width Triggers",
        mandateOriginCode: "MANDATE-Q3-01",
        mandateOriginTitle: "Hạ Tầng Realtime Audio & On-premise Security",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Lê Thị Hồng",
        assigneeEmail: "hong.le@axiom.com",
        estimatedHours: 8,
        priority: "MEDIUM",
        status: "TODO",
        deadline: "Thứ Sáu",
      },
    ],
  },
  {
    id: "mem-03",
    name: "Phạm Quốc Bảo",
    email: "bao.pham@axiom.com",
    title: "DevOps & Cloud Infrastructure",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    departmentCode: "ENG",
    departmentName: "Khối Kỹ Thuật",
    status: "ONLINE",
    weeklyMeetingHours: 6.0,
    activeTasksCount: 1,
    completedTasksCount: 11,
    estimatedTaskHours: 12.0,
    totalCommittedHours: 18.0,
    capacityPercent: 45, // 18h / 40h = 45% (Còn nhiều dư địa)
    workloadStatus: "OPTIMAL",
    tasks: [
      {
        id: "tsk-06",
        title: "Thiết lập Pipeline Auto-Deploy Egress Worker lên K8s",
        mandateOriginCode: "MANDATE-Q3-01",
        mandateOriginTitle: "Hạ Tầng Realtime Audio & On-premise Security",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Phạm Quốc Bảo",
        assigneeEmail: "bao.pham@axiom.com",
        estimatedHours: 12,
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        deadline: "Ngày mai, 16:00",
      },
    ],
  },
  {
    id: "mem-04",
    name: "Đặng Thùy Dung",
    email: "dung.dang@axiom.com",
    title: "QA Automation Specialist",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    departmentCode: "ENG",
    departmentName: "Khối Kỹ Thuật",
    status: "ONLINE",
    weeklyMeetingHours: 6.5,
    activeTasksCount: 0, // ZERO TASK! Sẵn sàng nhận việc
    completedTasksCount: 22,
    estimatedTaskHours: 0,
    totalCommittedHours: 6.5,
    capacityPercent: 16, // 16% - Đang rảnh rỗi
    workloadStatus: "ZERO_TASK",
    tasks: [],
  },
  {
    id: "mem-05",
    name: "Ngô Minh Tuấn",
    email: "tuan.ngo@axiom.com",
    title: "Mobile App Lead (React Native)",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
    departmentCode: "ENG",
    departmentName: "Khối Kỹ Thuật",
    status: "ONLINE",
    weeklyMeetingHours: 14.5,
    activeTasksCount: 4, // QUÁ TẢI!
    completedTasksCount: 8,
    estimatedTaskHours: 32.0,
    totalCommittedHours: 46.5,
    capacityPercent: 116, // 116% - QUÁ TẢI NGUY HIỂM
    workloadStatus: "OVERLOADED",
    tasks: [
      {
        id: "tsk-07",
        title: "Tích hợp WebRTC CallKit cho iOS 18",
        mandateOriginCode: "MANDATE-Q3-01",
        mandateOriginTitle: "Hạ Tầng Realtime Audio & On-premise Security",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Ngô Minh Tuấn",
        assigneeEmail: "tuan.ngo@axiom.com",
        estimatedHours: 12,
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        deadline: "Hôm nay",
      },
      {
        id: "tsk-08",
        title: "Xử lý Background Audio Keepalive trên Android 15",
        mandateOriginCode: "MANDATE-Q3-01",
        mandateOriginTitle: "Hạ Tầng Realtime Audio & On-premise Security",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Ngô Minh Tuấn",
        assigneeEmail: "tuan.ngo@axiom.com",
        estimatedHours: 8,
        priority: "HIGH",
        status: "IN_PROGRESS",
        deadline: "Thứ Năm",
      },
      {
        id: "tsk-09",
        title: "Sửa crash memory leak khi chuyển phòng họp liên tục",
        mandateOriginCode: "MANDATE-Q3-01",
        mandateOriginTitle: "Hạ Tầng Realtime Audio & On-premise Security",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Ngô Minh Tuấn",
        assigneeEmail: "tuan.ngo@axiom.com",
        estimatedHours: 6,
        priority: "HIGH",
        status: "TODO",
        deadline: "Thứ Sáu",
      },
      {
        id: "tsk-10",
        title: "Viết bridge Native Module cho STT WebSocket Stream",
        mandateOriginCode: "MANDATE-Q3-02",
        mandateOriginTitle: "Engine Biên Dịch Thời Gian Thực Đa Ngữ",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Ngô Minh Tuấn",
        assigneeEmail: "tuan.ngo@axiom.com",
        estimatedHours: 6,
        priority: "MEDIUM",
        status: "TODO",
        deadline: "Tuần sau",
      },
    ],
  },
  {
    id: "mem-06",
    name: "Vũ Hải Đăng",
    email: "dang.vu@axiom.com",
    title: "Backend Core & Database Engineer",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80",
    departmentCode: "ENG",
    departmentName: "Khối Kỹ Thuật",
    status: "ONLINE",
    weeklyMeetingHours: 7.0,
    activeTasksCount: 2,
    completedTasksCount: 15,
    estimatedTaskHours: 19.0,
    totalCommittedHours: 26.0,
    capacityPercent: 65, // 65% - Tối ưu
    workloadStatus: "OPTIMAL",
    tasks: [
      {
        id: "tsk-11",
        title: "Audit bảo mật mã hóa AES-256 cho bản ghi STT",
        mandateOriginCode: "MANDATE-Q3-01",
        mandateOriginTitle: "Hạ Tầng Realtime Audio & On-premise Security",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Vũ Hải Đăng",
        assigneeEmail: "dang.vu@axiom.com",
        estimatedHours: 11,
        priority: "HIGH",
        status: "IN_PROGRESS",
        deadline: "Thứ Sáu",
      },
      {
        id: "tsk-12",
        title: "Tối ưu hóa Index PostgreSQL cho bảng Transcripts",
        mandateOriginCode: "MANDATE-Q3-01",
        mandateOriginTitle: "Hạ Tầng Realtime Audio & On-premise Security",
        meetingOrigin: "Họp Sprint 42 Kỹ Thuật",
        assigneeName: "Vũ Hải Đăng",
        assigneeEmail: "dang.vu@axiom.com",
        estimatedHours: 8,
        priority: "MEDIUM",
        status: "TODO",
        deadline: "Thứ Bảy",
      },
    ],
  },
];

// ── Danh Sách 4 Phòng Ban & Tải Trọng Toàn Doanh Nghiệp ──
export const MOCK_DEPARTMENTS_CAPACITY: DepartmentCapacityMetric[] = [
  {
    code: "ENG",
    name: "Khối Kỹ Thuật (Engineering)",
    managerName: "Trần Minh Khoa",
    managerEmail: "manager.khoa@axiom.com",
    managerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    memberCount: 6,
    totalWeeklyHours: 240, // 6 * 40h
    meetingHoursTotal: 54,
    taskHoursCommitted: 111,
    totalCommittedHours: 165,
    utilizationRate: 69, // 165h / 240h = 69% (Tối ưu nhưng có nhân sự quá tải cục bộ)
    status: "OPTIMAL",
    activeMeetingsCount: 1,
    mandatesCount: 2,
    zeroTaskCount: 1, // Đặng Thùy Dung
    optimalTaskCount: 4,
    overloadedCount: 1, // Ngô Minh Tuấn
    bottlenecksAlert: "Ngô Minh Tuấn quá tải (116%); Đặng Thùy Dung có 0 task cần điều phối",
    mandates: [MOCK_EXECUTIVE_MANDATES[0], MOCK_EXECUTIVE_MANDATES[1]],
  },
  {
    code: "PROD",
    name: "Khối Sản Phẩm & Thiết Kế (Product/UX)",
    managerName: "Phan Hoài Nam",
    managerEmail: "nam.phan@axiom.com",
    managerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    memberCount: 4,
    totalWeeklyHours: 160,
    meetingHoursTotal: 36,
    taskHoursCommitted: 72,
    totalCommittedHours: 108,
    utilizationRate: 68,
    status: "OPTIMAL",
    activeMeetingsCount: 0,
    mandatesCount: 1,
    zeroTaskCount: 0,
    optimalTaskCount: 4,
    overloadedCount: 0,
    bottlenecksAlert: null,
    mandates: [MOCK_EXECUTIVE_MANDATES[2]],
  },
  {
    code: "BIZ",
    name: "Khối Phát Triển Thị Trường (Enterprise Sales)",
    managerName: "Hoàng Gia Bảo",
    managerEmail: "bao.hoang@axiom.com",
    managerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    memberCount: 5,
    totalWeeklyHours: 200,
    meetingHoursTotal: 65,
    taskHoursCommitted: 118,
    totalCommittedHours: 183,
    utilizationRate: 92, // Gần quá tải
    status: "FULL",
    activeMeetingsCount: 1,
    mandatesCount: 1,
    zeroTaskCount: 0,
    optimalTaskCount: 3,
    overloadedCount: 2,
    bottlenecksAlert: "Tải khối đạt 92%, nhiều lịch họp đối tác ngân hàng cần bổ sung nhân sự hỗ trợ",
    mandates: [MOCK_EXECUTIVE_MANDATES[3]],
  },
  {
    code: "OPS",
    name: "Khối Vận Hành & Nhân Sự (Operations & HR)",
    managerName: "Nguyễn Thị Mai",
    managerEmail: "mai.nguyen@axiom.com",
    managerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    memberCount: 3,
    totalWeeklyHours: 120,
    meetingHoursTotal: 18,
    taskHoursCommitted: 24,
    totalCommittedHours: 42,
    utilizationRate: 35, // Dư thừa công suất
    status: "AVAILABLE",
    activeMeetingsCount: 0,
    mandatesCount: 0,
    zeroTaskCount: 1,
    optimalTaskCount: 2,
    overloadedCount: 0,
    bottlenecksAlert: null,
    mandates: [],
  },
];
