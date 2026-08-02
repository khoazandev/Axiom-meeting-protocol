'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { meetingsApi, type Meeting, ApiRequestError } from '@/lib/api';
import { MeetingCard } from '@/components/meetings/meeting-card';
import {
  Video,
  Plus,
  Link as LinkIcon,
  Calendar,
  Clock,
  CheckSquare,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function MeetingsDashboardPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'scheduled'>('all');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMeetings() {
      try {
        const data = await meetingsApi.list(0, 100, controller.signal);
        if (!controller.signal.aborted) {
          setMeetings(data);
          setError(null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError(err?.message || 'Could not connect to Axiom Engine backend.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchMeetings();
    return () => controller.abort();
  }, []);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      router.push(`/meetings/${joinCode.trim()}`);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (activeTab === 'live') return m.is_active;
    if (activeTab === 'scheduled') return !m.is_active;
    return true;
  });

  const activeCount = meetings.filter((m) => m.is_active).length;

  return (
    <div className="space-y-8">
      {/* Top Banner: Google Meet Style Quick Start & Join */}
      <div className="bg-gradient-to-r from-[#131B2E] via-[#0E1526] to-[#131B2E] border border-blue-950/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise WebRTC Protocol</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
            Secure Video Meetings & Process Enforcement
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Host distraction-free meetings with mandatory agenda validation, on-premise WebRTC streaming, and real-time AI action item extraction.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link href="/meetings/create">
              <button className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>New Meeting</span>
              </button>
            </Link>

            <form onSubmit={handleJoinByCode} className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter meeting ID or room code"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0F19] border border-blue-900/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-semibold text-xs transition-all cursor-pointer"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#131B2E] border border-blue-950/80 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{activeCount}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Active Live Calls</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#131B2E] border border-blue-950/80 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{meetings.length}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Total Meetings</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#131B2E] border border-blue-950/80 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">4</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Action Items Pending</div>
          </div>
        </div>
      </div>

      {/* Jira-Style Tabbed Meetings Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-blue-950/60 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              All Meetings ({meetings.length})
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'live'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Live Now ({activeCount})
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Scheduled ({meetings.length - activeCount})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-48 rounded-2xl bg-[#131B2E] border border-blue-950/80">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredMeetings.length === 0 && (
          <div className="p-12 rounded-2xl bg-[#131B2E] border border-blue-950/80 text-center space-y-3">
            <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-base font-bold text-white">No meetings found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create a new meeting to enforce structured process gates and extract post-meeting intelligence.
            </p>
            <Link href="/meetings/create" className="inline-block mt-2">
              <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all">
                Schedule First Meeting
              </button>
            </Link>
          </div>
        )}

        {/* Meetings Grid */}
        {!loading && !error && filteredMeetings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
