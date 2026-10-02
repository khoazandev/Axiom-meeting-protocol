'use client';

import React from 'react';
import { Video, Award, ExternalLink, Calendar } from 'lucide-react';
import { InterviewSession } from '@/lib/recruitment-api';

export interface InterviewSessionsPanelProps {
  sessions: InterviewSession[];
  onOpenScorecard: (sessionId: string) => void;
}

export function InterviewSessionsPanel({ sessions, onOpenScorecard }: InterviewSessionsPanelProps) {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Video className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Phiên Phỏng Vấn Trực Tuyến & Bảng Điểm Dialogue</span>
        </span>
        <span className="text-[11px] font-semibold text-slate-500">{sessions.length} phiên</span>
      </div>

      <div className="space-y-2">
        {sessions.map((sess) => {
          const isCompleted = sess.status === 'COMPLETED';
          const isInProgress = sess.status === 'IN_PROGRESS';

          return (
            <div
              key={sess.id}
              className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    Phỏng vấn năng lực & chuyên môn
                  </span>
                  <span
                    className={`shrink-0 w-24 text-[10px] font-bold py-0.5 px-2 rounded-full text-center truncate ${
                      isCompleted
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : isInProgress
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                    title={
                      isCompleted
                        ? 'Trạng thái: Hoàn tất'
                        : isInProgress
                          ? 'Trạng thái: Đang diễn ra'
                          : 'Trạng thái: Đã lên lịch'
                    }
                  >
                    {isCompleted ? 'Hoàn tất' : isInProgress ? 'Đang diễn ra' : 'Đã lên lịch'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Lịch: {new Date(sess.scheduled_at).toLocaleString('vi-VN')}</span>
                  <span>•</span>
                  <span>
                    Meeting:{' '}
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                      {sess.meeting_id.slice(0, 8)}...
                    </span>
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isCompleted && (
                  <a
                    href={`/meetings/${sess.meeting_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 w-28 py-1.5 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs truncate"
                    title="Vào phòng phỏng vấn"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Vào phòng</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onOpenScorecard(sess.id)}
                  className="shrink-0 w-36 py-1.5 px-3 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-center gap-1.5 cursor-pointer transition-colors truncate"
                  title="Xem bảng điểm và phân tích kịch bản đối thoại AI"
                >
                  <Award className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="truncate">Bảng điểm</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
