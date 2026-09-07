'use client';

import { useState, useEffect } from 'react';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { meetingsApi, type Meeting } from '@/lib/api';
import { MeetingDetailsModal } from '@/components/knowledge/MeetingDetailsModal';
import { Database, Search, Folder, Calendar, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function KnowledgeDashboardPage() {
  const { t } = useLanguageStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<{id: string, title: string} | null>(null);

  useEffect(() => {
    loadMeetings();
  }, []);

  async function loadMeetings() {
    setLoading(true);
    try {
      const data = await meetingsApi.list(0, 100);
      setMeetings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Database className="w-5 h-5 text-accent" />
              Cơ sở tri thức (Knowledge Base)
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Duyệt tài liệu, biên bản và bản ghi theo từng cuộc họp.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cuộc họp..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-bg-elevated border border-border text-sm text-text-primary placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            />
          </div>
        </div>

        {/* Meetings Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <Folder className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-primary font-bold">Không tìm thấy cuộc họp nào</p>
            <p className="text-sm text-text-secondary">Tạo cuộc họp mới để lưu trữ kiến thức.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeetings.map((meeting) => (
              <div 
                key={meeting.id} 
                className="group p-5 rounded-xl border border-border bg-bg-elevated hover:border-accent/50 cursor-pointer transition-all duration-200"
                onClick={() => setSelectedMeeting({id: meeting.id, title: meeting.title})}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-accent/10 text-accent group-hover:scale-110 transition-transform">
                    <Folder className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    meeting.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                    meeting.status === 'IN_PROGRESS' ? 'bg-warning/10 text-warning' :
                    'bg-text-muted/10 text-text-secondary'
                  }`}>
                    {meeting.status}
                  </span>
                </div>
                
                <h3 className="font-bold text-text-primary mb-1 line-clamp-1">{meeting.title}</h3>
                
                <div className="flex items-center gap-4 text-xs text-text-secondary mt-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(meeting.created_at), 'dd/MM/yyyy')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMeeting && (
        <MeetingDetailsModal
          meetingId={selectedMeeting.id}
          meetingTitle={selectedMeeting.title}
          onClose={() => setSelectedMeeting(null)}
        />
      )}
    </div>
  );
}
