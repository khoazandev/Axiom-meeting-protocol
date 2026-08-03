'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MeetingRoomClient } from './meeting-room-client';
import { Sparkles, CheckCircle2, Users, Zap, CheckSquare, Video } from 'lucide-react';
import { getAuthHeaders } from '@/lib/api';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

export default function MeetingRoomPage() {
  const params = useParams();
  const meetingId = params.id as string;
  const { t } = useLanguageStore();

  const [activeTab, setActiveTab] = useState<'room' | 'mom'>('room');
  const [mom, setMom] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadMoM() {
      try {
        const headers = getAuthHeaders();
        if (!headers['Authorization']) return;

        const res = await fetch(`/api/v1/meetings/${meetingId}/mom`, {
          headers,
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
      const headers = getAuthHeaders();
      if (!headers['Authorization']) {
        setIsSyncing(false);
        return;
      }

      const res = await fetch(`/api/v1/meetings/${meetingId}/sync-tasks`, {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        setSyncFeedback('✅ Đã đồng bộ công việc');
        setTimeout(() => setSyncFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-screen bg-bg-base text-text-primary flex flex-col overflow-hidden">
      {/* Top Tab Bar Navigation */}
      <div className="bg-bg-card border-b border-border px-6 py-2 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2 bg-bg-card border border-border p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('room')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'room'
                ? 'bg-accent text-accent-foreground shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Phòng họp trực tuyến (LiveKit)</span>
          </button>
          <button
            onClick={() => setActiveTab('mom')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'mom'
                ? 'bg-accent text-accent-foreground shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Biên bản họp tự động (MoM)</span>
          </button>
        </div>

        {activeTab === 'mom' && (
          <div className="flex items-center gap-3">
            {syncFeedback && (
              <span className="text-xs text-success font-semibold px-3 py-1 bg-success/10 border border-success/20 rounded-full">
                {syncFeedback}
              </span>
            )}
            <button
              onClick={handleSyncToJira}
              disabled={isSyncing}
              className="px-4 py-2 rounded-lg bg-success hover:bg-success/90 text-accent-foreground text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ công việc'}</span>
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
              <h1 className="text-lg font-semibold text-text-primary">
                Biên bản cuộc họp tự động (MoM)
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Tóm tắt điều hành, nhật ký quyết định và công việc được tổng hợp tự động.
              </p>
            </div>

            {/* Executive Summary Card */}
            <div className="p-6 rounded-xl bg-bg-card border border-border space-y-3 shadow-xl">
              <div className="flex items-center gap-2 text-accent text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Tóm tắt điều hành</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {mom?.summary ||
                  'Biên bản cuộc họp đã được tạo thành công với sự tham gia của các thành viên.'}
              </p>
            </div>

            {/* Grid: Key Decisions & Speaker Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Decisions */}
              <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Quyết định chính</span>
                </div>
                <div className="space-y-3">
                  {(
                    mom?.key_decisions || [
                      'Thông qua kế hoạch kiến trúc ứng dụng.',
                      'Xác nhận schema cơ sở dữ liệu multi-tenant.',
                    ]
                  ).map((dec: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-bg-elevated border border-border flex items-start gap-2.5 text-sm text-text-secondary"
                    >
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{dec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Speaker Talk-Time Breakdown */}
              <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-accent text-sm font-medium">
                  <Users className="w-4 h-4" />
                  <span>Thời lượng phát biểu</span>
                </div>
                <div className="space-y-4 pt-1">
                  {(
                    mom?.speaker_stats || [
                      { speaker: 'Alice (Principal Architect)', percentage: 50 },
                      { speaker: 'Bob (Frontend Engineer)', percentage: 30 },
                      { speaker: 'Charlie (AI Partner)', percentage: 20 },
                    ]
                  ).map((sp: { speaker: string; percentage: number }, idx: number) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs text-text-secondary font-medium">
                        <span>{sp.speaker}</span>
                        <span className="font-mono text-accent font-semibold">
                          {sp.percentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden border border-border">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${sp.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Extracted Action Items Box */}
            <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-accent text-sm font-medium">
                  <CheckSquare className="w-4 h-4 text-accent" />
                  <span>Danh sách công việc trích xuất ({mom?.action_items?.length || 2})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(
                  mom?.action_items || [
                    'Hoàn thiện LiveKit Webhook Receiver',
                    'Triển khai pipeline trích xuất tài liệu',
                  ]
                ).map((item: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-bg-elevated border border-border flex items-start gap-3 text-sm"
                  >
                    <CheckSquare className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-text-secondary font-medium">{item}</span>
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
