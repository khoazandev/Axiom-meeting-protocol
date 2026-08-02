'use client';

import Link from 'next/link';
import { Calendar, Clock, Video, FileText, Users } from 'lucide-react';
import type { Meeting } from '@/lib/api';

interface MeetingCardProps {
  meeting: Meeting;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const formattedDate = new Date(meeting.start_time).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(meeting.start_time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col justify-between bg-[#131B2E] border border-blue-950/80 rounded-2xl p-6 shadow-md hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 group">
      <div>
        {/* Header: Title & Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1 group-hover:text-blue-400 transition-colors">
            {meeting.title}
          </h3>
          {meeting.is_active ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-950/60 text-blue-300 border border-blue-900/40">
              Scheduled
            </span>
          )}
        </div>

        {/* Metadata Strip */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            {formattedDate} at {formattedTime}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            {meeting.duration_minutes} min
          </span>
        </div>

        {/* Agenda Preview */}
        <div className="p-3 rounded-xl bg-[#0B0F19] border border-blue-950/60 mb-5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            <FileText className="w-3 h-3 text-blue-400" />
            Agenda Gate Enforced
          </div>
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-medium">
            {meeting.agenda}
          </p>
        </div>
      </div>

      {/* Footer & CTA */}
      <div className="pt-2 border-t border-blue-950/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>Multi-Tenant</span>
        </div>

        <Link href={`/meetings/${meeting.id}`}>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer">
            <Video className="w-3.5 h-3.5" />
            <span>Join Room</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
