'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { meetingsApi, type Meeting, type PendingInvitation, ApiRequestError } from '@/lib/api';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { MeetingCard } from '@/components/meetings/meeting-card';
import {
  Video,
  Plus,
  Link as LinkIcon,
  Calendar,
  CheckSquare,
  Loader2,
  AlertCircle,
  Bell,
  CheckCircle2,
  XCircle,
  UserPlus,
} from 'lucide-react';

export default function MeetingsDashboardPage() {
  const router = useRouter();
  const { t } = useLanguageStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'scheduled'>('all');
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

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
          setError(err?.message || 'Không thể kết nối đến server.');
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

  // Poll pending invitations every 5 seconds
  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const data = await meetingsApi.getPendingInvitations();
        setPendingInvitations(data);
      } catch {
        // Silently ignore — user may not be logged in yet
      }
    };
    fetchInvitations();
    const interval = setInterval(fetchInvitations, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptInvitation = async (inv: PendingInvitation) => {
    setProcessingInvite(inv.member_id);
    try {
      await meetingsApi.acceptInvitation(inv.meeting_id, inv.member_id);
      setPendingInvitations((prev) => prev.filter((i) => i.member_id !== inv.member_id));
      // Refresh meetings list to include the newly accepted meeting
      const data = await meetingsApi.list();
      setMeetings(data);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDeclineInvitation = async (inv: PendingInvitation) => {
    setProcessingInvite(inv.member_id);
    try {
      await meetingsApi.declineInvitation(inv.meeting_id, inv.member_id);
      setPendingInvitations((prev) => prev.filter((i) => i.member_id !== inv.member_id));
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      router.push(`/meetings/${joinCode.trim()}`);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (activeTab === 'live') return m.status === 'ACTIVE';
    if (activeTab === 'scheduled') return m.status !== 'ACTIVE';
    return true;
  });

  const activeCount = meetings.filter((m) => m.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h1 className="text-lg font-semibold text-text-primary mb-1">{t.meetings.title}</h1>
        <p className="text-sm text-text-secondary mb-5">{t.meetings.subTitle}</p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link href="/meetings/create">
            <button className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-medium text-sm flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>{t.meetings.createBtn}</span>
            </button>
          </Link>

          <form onSubmit={handleJoinByCode} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder={t.meetings.searchPlaceholder}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-bg-elevated border border-border text-sm text-text-primary placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="px-4 py-2.5 rounded-lg bg-bg-elevated hover:bg-border text-text-primary font-medium text-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {t.meetings.joinBtn}
            </button>
          </form>
        </div>
      </div>

      {/* Pending Invitations Banner */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
            <Bell className="w-4 h-4 animate-pulse" />
            <span>Bạn có {pendingInvitations.length} lời mời tham gia meeting</span>
          </div>
          {pendingInvitations.map((inv) => (
            <div
              key={inv.member_id}
              className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {inv.meeting_title}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    Mời bởi {inv.invited_by} ({inv.invited_by_email})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAcceptInvitation(inv)}
                  disabled={processingInvite === inv.member_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/30 text-xs font-medium transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Chấp nhận
                </button>
                <button
                  onClick={() => handleDeclineInvitation(inv)}
                  disabled={processingInvite === inv.member_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-600/30 text-red-400 hover:bg-red-600/20 text-xs font-medium transition-all disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-bg-card border border-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-semibold text-text-primary">{activeCount}</div>
            <div className="text-sm text-text-secondary">{t.meetings.statusActive}</div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-bg-card border border-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent-muted text-accent flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-semibold text-text-primary">{meetings.length}</div>
            <div className="text-sm text-text-secondary">{t.meetings.colTitle}</div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-bg-card border border-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-semibold text-text-primary">0</div>
            <div className="text-sm text-text-secondary">{t.tasks.title}</div>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="space-y-4">
        <div className="flex items-center gap-1 border-b border-border pb-3">
          {[
            { key: 'all' as const, label: `${t.meetings.allTab} (${meetings.length})` },
            { key: 'live' as const, label: `${t.meetings.statusActive} (${activeCount})` },
            {
              key: 'scheduled' as const,
              label: `${t.meetings.statusScheduled} (${meetings.length - activeCount})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                activeTab === tab.key
                  ? 'bg-accent text-accent-foreground'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-48 rounded-xl bg-bg-card border border-border">
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredMeetings.length === 0 && (
          <div className="p-12 rounded-xl bg-bg-card border border-border text-center space-y-3">
            <Calendar className="w-8 h-8 text-text-muted mx-auto" />
            <div className="text-sm font-semibold text-text-primary">{t.meetings.emptyTitle}</div>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">{t.meetings.emptySub}</p>
            <Link href="/meetings/create" className="inline-block mt-2">
              <button className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-medium transition-colors">
                {t.meetings.createBtn}
              </button>
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && filteredMeetings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
