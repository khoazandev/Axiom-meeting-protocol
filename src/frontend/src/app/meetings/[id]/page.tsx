'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const MeetingRoomClient = dynamic(
  () => import('./meeting-room-client').then((mod) => mod.MeetingRoomClient),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs text-slate-400 font-mono tracking-wider uppercase">
          Khởi tạo không gian phòng họp Axiom...
        </span>
      </div>
    ),
  }
);

export default function MeetingRoomPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <MeetingRoomClient />
    </div>
  );
}
