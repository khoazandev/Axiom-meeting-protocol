"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  day: string;
  dateStr: string;
  time: string;
  title: string;
  roomCode: string;
  attendeesCount: number;
  type: "STANDUP" | "SPRINT" | "1ON1" | "TECH_TALK";
}

const WEEKLY_EVENTS: CalendarEvent[] = [
  {
    id: "cal-01",
    day: "Thứ Hai",
    dateStr: "07/09",
    time: "09:00 - 09:30",
    title: "Weekly Engineering Kickoff & Sprint Goal",
    roomCode: "ENG-KICKOFF",
    attendeesCount: 12,
    type: "SPRINT",
  },
  {
    id: "cal-02",
    day: "Thứ Hai",
    dateStr: "07/09",
    time: "14:00 - 15:30",
    title: "Sprint 42 Architecture & Protocol Review",
    roomCode: "ENG-SPRINT-42",
    attendeesCount: 8,
    type: "SPRINT",
  },
  {
    id: "cal-03",
    day: "Thứ Ba",
    dateStr: "08/09",
    time: "09:30 - 09:45",
    title: "Daily Engineering Sync (15 phút)",
    roomCode: "ENG-DAILY-SYNC",
    attendeesCount: 12,
    type: "STANDUP",
  },
  {
    id: "cal-04",
    day: "Thứ Ba",
    dateStr: "08/09",
    time: "14:30 - 15:15",
    title: "1-on-1 Mentorship: Alex Rivera",
    roomCode: "ENG-1ON1-ALEX",
    attendeesCount: 2,
    type: "1ON1",
  },
  {
    id: "cal-05",
    day: "Thứ Tư",
    dateStr: "09/09",
    time: "16:00 - 17:00",
    title: "Tech Sharing: Audio Codecs & WebRTC Optimization",
    roomCode: "ENG-TECH-TALK",
    attendeesCount: 15,
    type: "TECH_TALK",
  },
  {
    id: "cal-06",
    day: "Thứ Năm",
    dateStr: "10/09",
    time: "09:30 - 09:45",
    title: "Daily Engineering Sync (15 phút)",
    roomCode: "ENG-DAILY-SYNC",
    attendeesCount: 12,
    type: "STANDUP",
  },
  {
    id: "cal-07",
    day: "Thứ Sáu",
    dateStr: "11/09",
    time: "15:00 - 16:30",
    title: "Sprint 42 Retrospective & Demo Day",
    roomCode: "ENG-DEMO-42",
    attendeesCount: 14,
    type: "SPRINT",
  },
];

interface ManagerCalendarTabProps {
  onNotify: (msg: string) => void;
}

export function ManagerCalendarTab({ onNotify }: ManagerCalendarTabProps) {
  const [events] = useState<CalendarEvent[]>(WEEKLY_EVENTS);

  const getTypeStyle = (t: CalendarEvent["type"]) => {
    switch (t) {
      case "STANDUP":
        return "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "SPRINT":
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "1ON1":
        return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      default:
        return "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Lịch Trình Họp Khối Kỹ Thuật
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              TUẦN 37 (07/09 - 11/09/2026)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tổng quan các buổi họp Sprint, Standup và 1-on-1 định kỳ của cả khối kỹ thuật.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNotify("Đã mở giao diện lên lịch sự kiện nội bộ")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>Đặt Lịch Họp Nhóm</span>
        </button>
      </div>

      {/* Events Timeline List */}
      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-4">
              {/* Day Badge */}
              <div className="w-16 text-center py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                <div className="text-[10px] font-extrabold uppercase text-slate-400">
                  {ev.day}
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {ev.dateStr}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${getTypeStyle(
                      ev.type
                    )}`}
                  >
                    {ev.type}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {ev.roomCode}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {ev.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {ev.time}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {ev.attendeesCount} thành viên
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:self-center">
              <a
                href={`/meetings?room=${ev.roomCode}`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
              >
                <Video size={13} />
                <span>Vào Phòng Họp</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
