'use client';

import { useState, useEffect } from 'react';
import { getAuthHeaders } from '@/lib/api';
import { X, FileText, UploadCloud, Trash2, Loader2, List, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MeetingDetailsModalProps {
  meetingId: string;
  meetingTitle: string;
  onClose: () => void;
}

export function MeetingDetailsModal({
  meetingId,
  meetingTitle,
  onClose,
}: MeetingDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'docs'>('summary');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [meetingId, activeTab]);

  async function loadData() {
    setLoading(true);
    const headers = getAuthHeaders();
    if (!headers['Authorization']) return;

    try {
      if (activeTab === 'summary') {
        const res = await fetch(`/api/v1/meetings/${meetingId}/summary`, { headers });
        if (res.ok) setSummary(await res.json());
      } else if (activeTab === 'transcript') {
        const res = await fetch(`/api/v1/meetings/${meetingId}/transcripts`, { headers });
        if (res.ok) setTranscripts(await res.json());
      } else if (activeTab === 'docs') {
        const res = await fetch(`/api/v1/knowledge/documents?meeting_id=${meetingId}`, { headers });
        if (res.ok) setDocuments(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const headers = getAuthHeaders();
      const uploadHeaders = { ...headers } as Record<string, string>;
      delete uploadHeaders['Content-Type'];

      const formData = new FormData();
      formData.append('file', file);
      formData.append('meeting_id', meetingId);

      const res = await fetch('/api/v1/knowledge/documents', {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });

      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/v1/knowledge/documents/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-bg-card w-full max-w-5xl h-[85vh] rounded-2xl border border-border flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-base">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{meetingTitle}</h2>
            <p className="text-xs text-text-secondary mt-1">Hồ sơ kiến thức cuộc họp</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 px-6 border-b border-border">
          {[
            { id: 'summary', label: 'Biên bản', icon: List },
            { id: 'transcript', label: 'Bản ghi', icon: MessageSquare },
            { id: 'docs', label: 'Tài liệu', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-bg-base">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : (
            <>
              {/* SUMMARY TAB */}
              {activeTab === 'summary' && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {!summary ? (
                    <div className="text-center text-text-secondary py-12">
                      Chưa có biên bản cho cuộc họp này.
                    </div>
                  ) : (
                    <>
                      <div className="p-6 rounded-xl bg-bg-elevated border border-border space-y-4">
                        <h3 className="text-base font-bold text-accent">Tóm tắt</h3>
                        <div className="text-sm text-text-primary [&_table]:w-full [&_table]:border-collapse [&_table]:mb-6 [&_th]:border [&_th]:border-border [&_th]:bg-bg-card [&_th]:p-3 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-3 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {summary.summary}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {summary.decisions && summary.decisions.length > 0 && (
                        <div className="p-6 rounded-xl bg-bg-elevated border border-border space-y-4">
                          <h3 className="text-base font-bold text-amber-500">Quyết định</h3>
                          <ul className="list-disc pl-5 space-y-2">
                            {summary.decisions.map((d: string, i: number) => (
                              <li key={i} className="text-sm text-text-primary">
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TRANSCRIPT TAB */}
              {activeTab === 'transcript' && (
                <div className="max-w-3xl mx-auto space-y-4">
                  {transcripts.length === 0 ? (
                    <div className="text-center text-text-secondary py-12">
                      Chưa có bản ghi nào.
                    </div>
                  ) : (
                    transcripts.map((t, i) => (
                      <div
                        key={i}
                        className="flex gap-4 p-4 rounded-xl bg-bg-elevated border border-border/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                          {t.speaker?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-text-primary">
                              {t.speaker?.full_name || 'Khách'}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              {typeof t.start_time === 'number'
                                ? format(new Date(t.start_time * 1000), 'HH:mm:ss')
                                : t.start_time}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary">{t.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* DOCS TAB */}
              {activeTab === 'docs' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Upload Card */}
                  <label className="border-2 border-dashed border-border hover:border-accent/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-bg-elevated group">
                    <UploadCloud className="w-8 h-8 text-text-muted group-hover:text-accent transition-colors mb-3" />
                    <span className="text-sm font-bold text-text-primary">
                      Tải lên tài liệu cho cuộc họp này
                    </span>
                    <span className="text-xs text-text-secondary mt-1">
                      PDF / DOCX (Tự động chuyển đổi AI)
                    </span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  {/* List */}
                  <div className="space-y-3">
                    {documents.length === 0 ? (
                      <div className="text-center text-text-secondary py-8 text-sm">
                        Chưa có tài liệu nào được đính kèm.
                      </div>
                    ) : (
                      documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 rounded-xl bg-bg-elevated border border-border flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-lg bg-accent/10">
                              <FileText className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-text-primary">
                                {doc.filename}
                              </div>
                              <div className="text-xs text-text-secondary font-mono mt-0.5">
                                {(doc.file_size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-full bg-success/10 text-success border border-emerald-500/30 text-[10px] font-bold uppercase">
                              {doc.vector_status}
                            </span>
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
