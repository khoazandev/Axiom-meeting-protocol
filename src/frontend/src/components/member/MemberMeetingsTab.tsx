'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Trash2,
  Loader2,
  Play,
} from 'lucide-react';
import { meetingsApi, Meeting } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { CreateMeetingModal } from '@/components/meetings/CreateMeetingModal';
import { MeetingDetailsModal } from '@/components/knowledge/MeetingDetailsModal';
import { resolveMeetingState, getMeetingStateBadge, MeetingState } from '@/lib/meetingState';

interface MemberMeetingsTabProps {
  onNotify: (msg: string) => void;
}

export function MemberMeetingsTab({ onNotify }: MemberMeetingsTabProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [startingEarlyId, setStartingEarlyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'ENDED'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await meetingsApi.list();
        setMeetings(data);
      } catch (err) {
        console.error('Failed to load meetings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDeleteMeeting = async (id: string, title: string) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa cuộc họp "${title}" không? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await meetingsApi.delete(id);
      setMeetings((prev) => prev.filter((m) => String(m.id) !== id));
      onNotify(`Đã xóa cuộc họp "${title}" thành công.`);
    } catch (err: any) {
      console.error('Failed to delete meeting:', err);
      onNotify(`Lỗi khi xóa: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      router.push(`/meetings/${joinCode.trim()}`);
    }
  };

  const handleStartEarly = async (meetingId: string) => {
    setStartingEarlyId(meetingId);
    try {
      try {
        await meetingsApi.startEarly(meetingId);
      } catch {
        await meetingsApi.update(meetingId, { status: 'IN_PROGRESS' });
      }
      setMeetings((prev) =>
        prev.map((m) =>
          String(m.id) === meetingId
            ? { ...m, status: 'IN_PROGRESS', started_at: new Date().toISOString() }
            : m
        )
      );
      onNotify('Đã bắt đầu cuộc họp sớm và gửi thông báo triệu tập tới các thành viên!');
      router.push(`/meetings/${meetingId}`);
    } catch (err: any) {
      router.push(`/meetings/${meetingId}`);
    } finally {
      setStartingEarlyId(null);
    }
  };

  const liveMeetingsCount = meetings.filter((m) => resolveMeetingState(m) === 'LIVE').length;
  const upcomingMeetingsCount = meetings.filter((m) => resolveMeetingState(m) === 'UPCOMING').length;
  const endedMeetingsCount = meetings.filter((m) => resolveMeetingState(m) === 'ENDED').length;

  const filteredMeetings = meetings
    .filter((m) => m.title.toLowerCase().includes(searchFilter.toLowerCase()))
    .filter((m) => {
      if (statusFilter === 'ALL') return true;
      return resolveMeetingState(m) === statusFilter;
    });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Join Action */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Trung Tâm Cuộc Họp
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Join by Code Form */}
          <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
            <div className="relative">
              <LinkIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
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

      {/* 3-State Lifecycle Switcher & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tất cả ({meetings.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('LIVE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'LIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang họp ({liveMeetingsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'UPCOMING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              Sắp diễn ra ({upcomingMeetingsCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ENDED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ENDED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
              }`}
            >
              Đã kết thúc ({endedMeetingsCount})
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm cuộc họp..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-full sm:w-48 focus:w-56 transition-all"
            />
          </div>
        </div>

        {filteredMeetings.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 bg-white/50 dark:bg-slate-900/30">
            <Video size={28} className="text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {statusFilter === 'LIVE' && 'Không có cuộc họp nào đang diễn ra'}
              {statusFilter === 'UPCOMING' && 'Không có cuộc họp nào sắp tới'}
              {statusFilter === 'ENDED' && 'Chưa có cuộc họp nào kết thúc'}
              {statusFilter === 'ALL' && 'Không có cuộc họp nào phù hợp'}
            </h4>
            <p className="text-[11px] text-slate-400">
              Hãy tạo cuộc họp mới hoặc nhập mã phòng để bắt đầu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMeetings.map((mtg) => {
              const state = resolveMeetingState(mtg);
              const badge = getMeetingStateBadge(state);
              const isLive = state === 'LIVE';
              const isUpcoming = state === 'UPCOMING';
              const isEnded = state === 'ENDED';
              const canControl =
                user &&
                (user.id === mtg.created_by_id ||
                  user.role === 'OWNER' ||
                  user.role === 'ADMIN');
              const canDelete = isEnded
                ? (user?.role === 'OWNER' || user?.role === 'ADMIN')
                : canControl;

              return (
                <div
                  key={mtg.id}
                  onClick={() => {
                    if (isEnded) {
                      setSelectedMeetingForDetails({ id: String(mtg.id), title: mtg.title });
                    }
                  }}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isEnded ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-600' : ''
                  } ${
                    isLive
                      ? 'bg-gradient-to-br from-white via-white to-emerald-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-md shadow-emerald-500/5'
                      : isUpcoming
                        ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 hover:border-blue-300'
                        : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-95'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        ID: {String(mtg.id).slice(0, 8)}
                      </span>

                      {/* Dynamic Badge */}
                      <span className={`flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${badge.color}`}>
                        {badge.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 line-clamp-1">
                      {mtg.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={12} />
                        {isLive && (
                          mtg.started_at
                            ? `Bắt đầu: ${new Date(mtg.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                            : 'Đang diễn ra'
                        )}
                        {isUpcoming && (
                          mtg.scheduled_at
                            ? `Dự kiến: ${new Date(mtg.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                            : 'Chưa bắt đầu'
                        )}
                        {isEnded && (
                          mtg.ended_at
                            ? `Đã kết thúc: ${new Date(mtg.ended_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                            : 'Đã kết thúc'
                        )}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {mtg.department_name || 'Phòng nội bộ'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    {/* Action button by state */}
                    {isLive && (
                      <a
                        href={`/meetings/${mtg.id}`}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <Video size={13} />
                        <span>Tham Gia Ngay</span>
                      </a>
                    )}

                    {isUpcoming && (
                      canControl ? (
                        <button
                          type="button"
                          disabled={startingEarlyId === String(mtg.id)}
                          onClick={() => handleStartEarly(String(mtg.id))}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Bắt đầu cuộc họp sớm và tự động gửi thông báo triệu tập tới thành viên"
                        >
                          <Play size={13} className="fill-current" />
                          <span>{startingEarlyId === String(mtg.id) ? 'Đang mở phòng...' : 'Bắt đầu sớm'}</span>
                        </button>
                      ) : (
                        <a
                          href={`/meetings/${mtg.id}`}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                        >
                          <Clock size={13} />
                          <span>Vào Phòng Chờ</span>
                        </a>
                      )
                    )}

                    {isEnded && (
                      <button
                        type="button"
                        onClick={() => setSelectedMeetingForDetails({ id: String(mtg.id), title: mtg.title })}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
                        title="Xem lại Biên bản AI, nghị quyết và bản ghi âm lưu trữ"
                      >
                        <Sparkles size={13} className="text-amber-500" />
                        <span>Biên Bản AI & Kho Lưu Trữ</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedMeetingForDetails({ id: String(mtg.id), title: mtg.title })}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                        title="Xem chi tiết biên bản / tài liệu"
                      >
                        <FileText size={14} />
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMeeting(String(mtg.id), mtg.title);
                          }}
                          disabled={deletingId === String(mtg.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Xóa cuộc họp này"
                        >
                          {deletingId === String(mtg.id) ? (
                            <Loader2 size={13} className="animate-spin text-rose-500" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedMeetingForDetails && (
        <MeetingDetailsModal
          meetingId={selectedMeetingForDetails.id}
          meetingTitle={selectedMeetingForDetails.title}
          onClose={() => setSelectedMeetingForDetails(null)}
        />
      )}

      {/* Modal Tạo Cuộc Họp Mới có Agenda Import */}
      <CreateMeetingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(meetingId) => {
          onNotify('Đã tạo cuộc họp và nạp Agenda thành công!');
          router.push(`/meetings/${meetingId}`);
        }}
      />
    </div>
  );
}
