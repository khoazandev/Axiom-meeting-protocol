'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MeetingRoomClient } from './meeting-room-client';
import {
  FileText,
  Video,
  Sparkles,
  CheckCircle2,
  Users,
  Zap,
  CheckSquare,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface MoMData {
  summary: string;
  key_decisions: string[];
  speaker_stats: { speaker: string; percentage: number }[];
  action_items: string[];
}

export default function MeetingRoomPage() {
  const params = useParams();
  const meetingId = params.id as string;
  const [activeTab, setActiveTab] = useState<'room' | 'mom'>('room');
  const [mom, setMom] = useState<MoMData | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function loadMoM() {
      try {
        const token = localStorage.getItem('token');
        const activeWorkspaceId = localStorage.getItem('active_workspace_id');
        if (!token || !activeWorkspaceId) return;

        const res = await fetch(`/api/v1/meetings/${meetingId}/mom`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Workspace-ID': activeWorkspaceId,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setMom(data);
        }
      } catch (err) {
        console.error('Failed to fetch MoM:', err);
      }
    }

    if (activeTab === 'mom') {
      loadMoM();
    }
  }, [activeTab, meetingId]);

  const handleSyncToJira = async () => {
    try {
      setIsSyncing(true);
      const token = localStorage.getItem('token');
      const activeWorkspaceId = localStorage.getItem('active_workspace_id');
      if (!token || !activeWorkspaceId) {
        setIsSyncing(false);
        return;
      }

      const res = await fetch(`/api/v1/meetings/${meetingId}/sync-tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Workspace-ID': activeWorkspaceId,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSyncFeedback(data.message || 'Synced to Jira Tasks!');
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (err) {
      console.error('Task sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-screen bg-[#0B0F19] text-white flex flex-col overflow-hidden">
      {/* Top Tab Bar Navigation */}
      <div className="bg-[#0E1526] border-b border-blue-950/60 px-6 py-2 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2 bg-[#131B2E] border border-blue-950 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('room')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'room'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Live Call Room</span>
          </button>
          <button
            onClick={() => setActiveTab('mom')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'mom'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Minutes of Meeting (MoM)</span>
          </button>
        </div>

        {activeTab === 'mom' && (
          <div className="flex items-center gap-3">
            {syncFeedback && (
              <span className="text-xs text-emerald-400 font-semibold px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                {syncFeedback}
              </span>
            )}
            <button
              onClick={handleSyncToJira}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Syncing...' : '1-Click Sync to Jira Board'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'room' ? (
          <MeetingRoomClient />
        ) : (
          <div className="h-full p-8 overflow-y-auto max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Auto Minutes of Meeting (MoM)</h1>
              <p className="text-xs text-slate-400 mt-1">
                Automated executive summary, decision log, and action items compiled from live meeting telemetry.
              </p>
            </div>

            {/* Executive Summary Card */}
            <div className="p-6 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-3 shadow-xl">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Executive Summary</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-normal">
                {mom?.summary || 'Executive Summary: Meeting completed successfully with active participation.'}
              </p>
            </div>

            {/* Grid: Key Decisions & Speaker Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Decisions */}
              <div className="p-6 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Key Decisions Reached</span>
                </div>
                <div className="space-y-3">
                  {(mom?.key_decisions || [
                    'Architecture and Phase 4 implementation plan approved.',
                    'Multi-tenant database schema validated.',
                  ]).map((dec, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#0B0F19] border border-blue-950 flex items-start gap-2.5 text-xs text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{dec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Speaker Talk-Time Breakdown */}
              <div className="p-6 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                  <Users className="w-4 h-4" />
                  <span>Speaker Talk-Time Breakdown</span>
                </div>
                <div className="space-y-4 pt-1">
                  {(mom?.speaker_stats || [
                    { speaker: 'Alice (Principal Architect)', percentage: 50 },
                    { speaker: 'Bob (Frontend Engineer)', percentage: 30 },
                    { speaker: 'Charlie (AI Partner)', percentage: 20 },
                  ]).map((sp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-300 font-medium">
                        <span>{sp.speaker}</span>
                        <span className="font-mono text-blue-400 font-semibold">{sp.percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-[#0B0F19] rounded-full overflow-hidden border border-blue-950">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${sp.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Extracted Action Items Box */}
            <div className="p-6 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                  <span>Extracted Action Items ({mom?.action_items?.length || 1})</span>
                </div>
                <span className="text-[10px] text-slate-400">Ready for Jira Sync</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(mom?.action_items || [
                  'Finalize LiveKit Webhook Receiver for automated status tracking',
                  'Deploy Knowledge Hub document vectorization pipeline',
                ]).map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#0B0F19] border border-blue-950 flex items-start gap-3 text-xs">
                    <CheckSquare className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span className="text-slate-200 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
