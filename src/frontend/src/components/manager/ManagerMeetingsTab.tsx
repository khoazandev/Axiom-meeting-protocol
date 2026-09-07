"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { meetingsApi } from "@/lib/api";
import {
  Video,
  MicOff,
  Lock,
  Sparkles,
  Users,
  Clock,
  Calendar,
  Plus,
  FileCheck2,
  AlertTriangle,
  Play,
  ExternalLink,
  Search,
  CheckCircle2,
} from "lucide-react";
import { MatIcon } from "@/components/ui/MatIcon";
import { MOCK_EXECUTIVE_MANDATES, ExecutiveMandate } from "@/lib/workloadProtocolData";

export interface DepartmentMeeting {
  id: string;
  title: string;
  roomCode: string;
  status: "LIVE" | "UPCOMING" | "ENDED";
  host: {
    name: string;
    avatar: string;
  };
  startTime: string;
  duration: string;
  attendeesCount: number;
  maxAttendees: number;
  agendaApproved: boolean;
  aiTranscriptionActive: boolean;
  attendees: Array<{
    id: string;
    name: string;
    avatar: string;
    role: string;
  }>;
}

const INITIAL_MEETINGS: DepartmentMeeting[] = [
  {
    id: "mtg-eng-01",
    title: "Sprint 42 Architecture & Protocol Review",
    roomCode: "ENG-SPRINT-42",
    status: "LIVE",
    host: {
      name: "Trần Minh Khoa",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    },
    startTime: "14:00 - 15:30",
    duration: "45 phút đã trôi qua",
    attendeesCount: 8,
    maxAttendees: 12,
    agendaApproved: true,
    aiTranscriptionActive: true,
    attendees: [
      {
        id: "att-1",
        name: "Alex Rivera",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        role: "Senior AI Engineer",
      },
      {
        id: "att-2",
        name: "Lê Thị Hồng",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
        role: "Frontend Lead",
      },
      {
        id: "att-3",
        name: "Phạm Quốc Bảo",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
        role: "DevOps Engineer",
      },
      {
        id: "att-4",
        name: "Đặng Thùy Dung",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
        role: "QA Automation",
      },
    ],
  },
  {
    id: "mtg-eng-02",
    title: "Daily Engineering Sync & Blocker Clearing",
    roomCode: "ENG-DAILY-SYNC",
    status: "UPCOMING",
    host: {
      name: "Trần Minh Khoa",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    },
    startTime: "16:30 - 17:00",
    duration: "30 phút",
    attendeesCount: 6,
    maxAttendees: 10,
    agendaApproved: true,
    aiTranscriptionActive: false,
    attendees: [
      {
        id: "att-1",
        name: "Alex Rivera",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        role: "Senior AI Engineer",
      },
      {
        id: "att-5",
        name: "Vũ Hải Đăng",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80",
        role: "Backend Specialist",
      },
    ],
  },
  {
    id: "mtg-eng-03",
    title: "1-on-1 Mentorship & Career Path: Alex Rivera",
    roomCode: "ENG-1ON1-ALEX",
    status: "UPCOMING",
    host: {
      name: "Trần Minh Khoa",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    },
    startTime: "Ngày mai, 09:30",
    duration: "45 phút",
    attendeesCount: 2,
    maxAttendees: 2,
    agendaApproved: false,
    aiTranscriptionActive: false,
    attendees: [
      {
        id: "att-1",
        name: "Alex Rivera",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        role: "Senior AI Engineer",
      },
    ],
  },
];

interface ManagerMeetingsTabProps {
  onNotify: (msg: string) => void;
}

export function ManagerMeetingsTab({ onNotify }: ManagerMeetingsTabProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<DepartmentMeeting[]>(INITIAL_MEETINGS);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<DepartmentMeeting | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRoomCode, setNewRoomCode] = useState("");
  const [isJoiningRoom, setIsJoiningRoom] = useState<string | null>(null);
  const [engMandates, setEngMandates] = useState<ExecutiveMandate[]>(
    MOCK_EXECUTIVE_MANDATES.filter((m) => m.targetDepartment === "ENG")
  );

  const handleInheritMandate = (mandate: ExecutiveMandate) => {
    onNotify(
      `Đã liên kết quyết sách "${mandate.title}" vào Chương trình Nghị sự của Sprint 42! AI sẽ tự động phân rã Action Items khi bắt đầu họp.`
    );
  };

  const filteredMeetings = meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.roomCode.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Host Controls Handlers
  const handleToggleTranscription = (id: string) => {
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, aiTranscriptionActive: !m.aiTranscriptionActive } : m
      )
    );
    const target = meetings.find((m) => m.id === id);
    onNotify(
      target?.aiTranscriptionActive
        ? `Đã tạm dừng AI Ghi Âm & Trích xuất cho ${target.roomCode}`
        : `Đã kích hoạt AI Ghi Âm & Trích xuất biên bản cho ${target?.roomCode}`
    );
  };

  const handleMuteAll = (meetingTitle: string) => {
    onNotify(`Đã gửi lệnh Tắt Tiếng Toàn Bộ Thành Viên trong phòng: ${meetingTitle}`);
  };

  const handleLockRoom = (meetingTitle: string) => {
    onNotify(`Đã KHÓA PHÒNG HỌP: ${meetingTitle}. Không cho phép người ngoài vào.`);
  };

  const handleApproveAgenda = (id: string) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, agendaApproved: true } : m))
    );
    onNotify("Đã phê duyệt Agenda cuộc họp! Phòng họp đủ điều kiện bắt đầu.");
  };

  const handleJoinRoom = async (mtg: DepartmentMeeting) => {
    setIsJoiningRoom(mtg.id);
    try {
      // Create or join real meeting in backend database
      const created = await meetingsApi.create({
        title: mtg.title,
        agenda: "Kế hoạch chi tiết và phân công nhiệm vụ khối Kỹ thuật (Sprint Review & AI Protocol).",
      });
      onNotify(`Đang kết nối vào phòng họp: ${created.title}`);
      router.push(`/meetings/${created.id}`);
    } catch (err) {
      console.warn("Could not create backend meeting, routing to room code:", err);
      router.push(`/meetings/${mtg.id}`);
    } finally {
      setIsJoiningRoom(null);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await meetingsApi.create({
        title: newTitle.trim(),
        agenda: "Nghị quyết và kế hoạch triển khai sprint của khối kỹ thuật.",
      });

      const newMtg: DepartmentMeeting = {
        id: created.id,
        title: created.title,
        roomCode: `ENG-${created.id.slice(0, 6).toUpperCase()}`,
        status: "UPCOMING",
        host: {
          name: "Trần Minh Khoa",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
        },
        startTime: "Hôm nay, 17:30",
        duration: "45 phút",
        attendeesCount: 1,
        maxAttendees: 8,
        agendaApproved: true,
        aiTranscriptionActive: true,
        attendees: [
          {
            id: "att-host",
            name: "Trần Minh Khoa",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
            role: "Trưởng Khối Kỹ Thuật",
          },
        ],
      };

      setMeetings([newMtg, ...meetings]);
      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewRoomCode("");
      onNotify(`Đã khởi tạo phòng họp: ${created.title}`);
      router.push(`/meetings/${created.id}`);
    } catch (err) {
      console.error("Failed to create meeting on server:", err);
      // Fallback local
      const newMtg: DepartmentMeeting = {
        id: `mtg-eng-${Date.now()}`,
        title: newTitle,
        roomCode: newRoomCode || `ENG-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "UPCOMING",
        host: {
          name: "Trần Minh Khoa",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
        },
        startTime: "Hôm nay, 17:30",
        duration: "45 phút",
        attendeesCount: 4,
        maxAttendees: 8,
        agendaApproved: true,
        aiTranscriptionActive: true,
        attendees: [
          {
            id: "att-1",
            name: "Alex Rivera",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
            role: "Senior AI Engineer",
          },
        ],
      };

      setMeetings([newMtg, ...meetings]);
      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewRoomCode("");
      onNotify(`Đã lên lịch cuộc họp phòng ban: ${newMtg.title}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Điều Hành Cuộc Họp Khối Kỹ Thuật
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              GOOGLE MEET PROTOCOL
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chủ trì phòng ban có quyền kiểm duyệt Agenda, quản lý mic/cam và kích hoạt AI trích xuất nghị quyết.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm theo tên hoặc mã phòng..."
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 w-52 focus:w-64 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>Tạo Cuộc Họp Khối</span>
          </button>
        </div>
      </div>

      {/* ── BANNER KẾ THỪA NGHỊ QUYẾT TỪ CUỘC HỌP BAN LÃNH ĐẠO ── */}
      <div className="bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-purple-900/10 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <MatIcon name="account_tree" className="text-[18px]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Nghị Quyết Ban Lãnh Đạo Cần Kế Thừa Vào Cuộc Họp Khối (Cascade Directives)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                AI phát hiện <strong>{engMandates.length} Quyết Sách Chiến Lược</strong> từ Cuộc họp Cấp cao của Chủ Tịch giao cho Khối Kỹ Thuật.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {engMandates.map((m) => (
            <div
              key={m.id}
              className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3"
            >
              <div className="truncate">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono text-[9px] font-bold">
                    {m.code}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                    {m.allocatedHours}h ({m.storyPoints} SP)
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={m.title}>
                  {m.title}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Tiến độ: Đã phân rã {m.decomposedTasksCount}/{m.totalTasksTarget} tasks
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleInheritMandate(m)}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
              >
                Kế Thừa Vào Agenda
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Meeting Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredMeetings.map((mtg) => {
          const isLive = mtg.status === "LIVE";

          return (
            <div
              key={mtg.id}
              className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                isLive
                  ? "bg-gradient-to-br from-white via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 border-blue-300/80 dark:border-blue-800/80 shadow-md shadow-blue-500/5"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {/* Meeting Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500 text-white shadow-xs animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        ĐANG LIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <Clock size={12} />
                        SẮP TỚI
                      </span>
                    )}

                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {mtg.roomCode}
                    </span>
                  </div>

                  {/* Agenda Gatekeeper Badge */}
                  {mtg.agendaApproved ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      <FileCheck2 size={13} />
                      <span>Agenda Hợp Lệ</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApproveAgenda(mtg.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 hover:bg-amber-100 cursor-pointer transition-colors"
                      title="Bấm để phê duyệt Agenda"
                    >
                      <AlertTriangle size={13} />
                      <span>Chưa Duyệt Agenda</span>
                    </button>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1 mb-1.5">
                  {mtg.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    {mtg.startTime}
                  </span>
                  <span>•</span>
                  <span>{mtg.duration}</span>
                </div>

                {/* Attendees Avatar Stack */}
                <div className="flex items-center justify-between py-3 border-y border-slate-100 dark:border-slate-800/80 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 overflow-hidden">
                      {mtg.attendees.map((att) => (
                        <img
                          key={att.id}
                          src={att.avatar}
                          alt={att.name}
                          title={`${att.name} (${att.role})`}
                          className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">
                      {mtg.attendeesCount}/{mtg.maxAttendees} thành viên
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        mtg.aiTranscriptionActive
                          ? "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <Sparkles size={11} className={mtg.aiTranscriptionActive ? "animate-spin text-purple-600" : ""} />
                      {mtg.aiTranscriptionActive ? "AI Live Rec" : "AI Sẵn Sàng"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Host Control Actions Bar */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Quyền Host Của Trưởng Phòng:
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleJoinRoom(mtg)}
                    disabled={isJoiningRoom === mtg.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-xs cursor-pointer ${
                      isLive
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isJoiningRoom === mtg.id ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isLive ? (
                      <Video size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                    <span>{isLive ? "Vào Phòng Chủ Trì" : "Bắt Đầu Phòng"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMuteAll(mtg.title)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Tắt micro tất cả thành viên"
                  >
                    <MicOff size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLockRoom(mtg.title)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Khóa phòng họp (không cho người ngoài vào)"
                  >
                    <Lock size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleTranscription(mtg.id)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      mtg.aiTranscriptionActive
                        ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-300"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                    title={
                      mtg.aiTranscriptionActive
                        ? "Tắt AI Ghi Âm & Nghị Quyết"
                        : "Bật AI Ghi Âm & Nghị Quyết"
                    }
                  >
                    <Sparkles size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tạo Cuộc Họp Khối */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Lên Lịch Cuộc Họp Khối Kỹ Thuật
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chủ đề cuộc họp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Sprint Retrospective & Code Review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã phòng tùy chọn (Room Code)
                </label>
                <input
                  type="text"
                  placeholder="VD: ENG-RETRO-42 (để trống sẽ tạo tự động)"
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-blue-600" />
                  Kỷ luật phòng ban tự động
                </div>
                <p className="text-[11px] text-blue-600/80 dark:text-blue-400">
                  Cuộc họp sẽ tự động kích hoạt Agenda Gatekeeper và AI Assistant tổng hợp Action Items gửi về Bảng Kanban.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Xác Nhận Tạo Phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
