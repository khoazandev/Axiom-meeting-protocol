import { Meeting } from '@/lib/api';

export type MeetingState = 'LIVE' | 'UPCOMING' | 'ENDED';

/**
 * Resolves the 3-tier lifecycle state of a meeting:
 * 1. 'UPCOMING': Not yet started, scheduled for future or waiting for host to start early.
 * 2. 'LIVE': Currently active in WebRTC / LiveKit SFU.
 * 3. 'ENDED': Concluded, MoM/transcripts archived in Knowledge Base.
 */
export function resolveMeetingState(m: Meeting): MeetingState {
  const status = (m.status || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'ENDED' || m.ended_at) {
    return 'ENDED';
  }
  if (status === 'IN_PROGRESS' || status === 'STARTED') {
    return 'LIVE';
  }
  if (status === 'SCHEDULED') {
    if (!m.started_at) {
      return 'UPCOMING';
    }
    return 'LIVE';
  }
  if (m.started_at && !m.ended_at) {
    return 'LIVE';
  }
  return 'UPCOMING';
}

export function getMeetingStateBadge(state: MeetingState) {
  switch (state) {
    case 'LIVE':
      return {
        label: 'ĐANG DIỄN RA',
        color: 'bg-emerald-500 text-white shadow-xs',
        pulse: true,
      };
    case 'UPCOMING':
      return {
        label: 'SẮP DIỄN RA',
        color:
          'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        pulse: false,
      };
    case 'ENDED':
      return {
        label: 'ĐÃ KẾT THÚC',
        color:
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
        pulse: false,
      };
  }
}
