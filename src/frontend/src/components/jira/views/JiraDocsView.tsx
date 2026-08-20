'use client';

import React, { useEffect, useState } from 'react';
import { JiraProject, meetingsApi, Meeting, TranscriptResponse } from '@/lib/api';
import {
  FileText,
  Video,
  Mic,
  Calendar,
  ExternalLink,
  Sparkles,
  Layers,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

interface JiraDocsViewProps {
  project: JiraProject;
}

export function JiraDocsView({ project }: JiraDocsViewProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeetingDocs() {
      if (!project.meeting_id) return;
      try {
        setLoading(true);
        const [m, trans] = await Promise.all([
          meetingsApi.get(project.meeting_id),
          meetingsApi.getTranscripts(project.meeting_id),
        ]);
        setMeeting(m);
        setTranscripts(trans);
      } catch (err) {
        console.error('Failed to load meeting docs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMeetingDocs();
  }, [project.meeting_id]);

  return (
    <div className="space-y-6 pt-2 max-w-5xl">
      {/* Overview Card */}
      <div className="p-5 rounded-2xl bg-bg-card border border-border space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-text-primary">
              Workspace Documentation & Meeting Notes
            </h2>
          </div>
          {project.meeting_id && (
            <Link
              href={`/meetings/${project.meeting_id}`}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Go to Meeting Room</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </Link>
          )}
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          All documentation, AI-generated executive summaries, action item transcripts, and
          decisions linked to this Jira Workspace.
        </p>
      </div>

      {/* Meeting Context Box */}
      {meeting && (
        <div className="p-5 rounded-2xl bg-bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary">{meeting.title}</h3>
              <p className="text-xs text-text-muted mt-0.5">
                {meeting.description || 'No description provided.'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {meeting.status}
            </span>
          </div>

          {/* Transcript Feed */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-blue-400" />
              <span>Meeting Audio Transcripts & AI Evidence</span>
            </h4>

            {transcripts.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted italic bg-bg-elevated/30 rounded-xl border border-border/50">
                No transcript records captured yet for this meeting.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {transcripts.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-bg-elevated/40 border border-border/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span className="font-bold text-blue-400">{t.speaker_name}</span>
                      <span>
                        {t.start_time} - {t.end_time}
                      </span>
                    </div>
                    <p className="text-text-primary leading-relaxed">{t.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
