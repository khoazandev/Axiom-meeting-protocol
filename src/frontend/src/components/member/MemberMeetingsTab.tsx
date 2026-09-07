"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  Plus,
  Link as LinkIcon,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  Sparkles,
  FileText,
  Search,
  ExternalLink,
} from "lucide-react";
import { meetingsApi, Meeting } from "@/lib/api";

interface MemberMeetingsTabProps {
  onNotify: (msg: string) => void;
}

export function MemberMeetingsTab({ onNotify }: MemberMeetingsTabProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await meetingsApi.list();
        setMeetings(data);
      } catch (err) {
        console.error("Failed to load meetings:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      router.push(`/meetings/${joinCode.trim()}`);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await meetingsApi.create({ title: newTitle.trim() });
      setMeetings([created, ...meetings]);
      setIsCreateModalOpen(false);
      setNewTitle("");
      onNotify(`Đã tạo phòng họp mới: ${created.title}`);
      router.push(`/meetings/${created.id}`);
    } catch (err) {
      console.error("Failed to create meeting:", err);
      onNotify("Không thể tạo cuộc họp. Vui lòng thử lại!");
    }
  };

  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Join Action */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Trung Tâm Cuộc Họp & Phụ Đề AI (Live SFU)
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVEKIT SFU READY
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tham gia phòng họp WebRTC có AI bóc tách biên bản, phụ đề trực tiếp và gán việc tự động.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Join by Code Form */}
          <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
            <div className="relative">
              <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Nhập mã phòng..."
                className="pl-8 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white w-40 focus:w-48 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Vào Phòng
            </button>
          </form>

          {/* Quick Create Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>Tạo Cuộc Họp Mới</span>
          </button>
        </div>
      </div>

      {/* Live & Upcoming Meeting Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            DANH SÁCH CUỘC HỌP HIỆN TẠI
          </h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm cuộc họp..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 w-44"
            />
          </div>
        </div>

        {filteredMeetings.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <Video size={28} className="text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Không có cuộc họp nào phù hợp
            </h4>
            <p className="text-[11px] text-slate-400">
              Hãy tạo cuộc họp mới hoặc nhập mã phòng để bắt đầu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMeetings.map((mtg) => (
              <div
                key={mtg.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                      ID: {String(mtg.id).slice(0, 8)}
                    </span>
                    <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      <Sparkles size={11} />
                      AI Live STT
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 line-clamp-1">
                    {mtg.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(mtg.created_at || Date.now()).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      Phòng nội bộ
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <a
                    href={`/meetings/${mtg.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <Video size={13} />
                    <span>Tham Gia Ngay</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onNotify("Biên bản AI sẽ sẵn sàng ngay sau khi kết thúc họp.")}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText size={12} />
                    <span>Biên Bản AI</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tạo Cuộc Họp Mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Tạo Cuộc Họp Mới
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
                  placeholder="VD: Thảo luận kiến trúc LiveKit SFU"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Vào Phòng Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
