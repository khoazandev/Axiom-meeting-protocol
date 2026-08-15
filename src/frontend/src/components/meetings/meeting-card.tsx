'use client';

import Link from 'next/link';
import { Calendar, Video, FileText } from 'lucide-react';
import type { Meeting } from '@/lib/api';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

interface MeetingCardProps {
  meeting: Meeting;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const { t, language } = useLanguageStore();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const meetingDate = meeting.scheduled_at || meeting.created_at;

  const formattedDate = new Date(meetingDate).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(meetingDate).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col justify-between bg-bg-card border border-border rounded-xl p-5 hover:border-accent/40 transition-colors duration-150 group">
      <div>
        {/* Header: Title & Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
            {meeting.title}
          </h3>
          {meeting.status === 'ACTIVE' ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              {t.meetings.statusActive}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-bg-elevated text-text-muted shrink-0">
              {t.meetings.statusScheduled}
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate} {formattedTime}
          </span>
        </div>

        {/* Agenda Preview */}
        <div className="p-3 rounded-lg bg-bg-elevated/50 border border-border-subtle mb-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted mb-1">
            <FileText className="w-3 h-3" />
            {t.meetings.agenda}
          </div>
          <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
            {meeting.description}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border-subtle">
        <Link href={`/meetings/${meeting.id}`}>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-medium transition-colors duration-150 cursor-pointer">
            <Video className="w-4 h-4" />
            <span>{t.meetings.join}</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
