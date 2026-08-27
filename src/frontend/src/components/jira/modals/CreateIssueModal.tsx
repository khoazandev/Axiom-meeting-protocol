'use client';

import React, { useState } from 'react';
import { jiraApi, Issue, Sprint } from '@/lib/api';
import { X, Plus, Sparkles } from 'lucide-react';

interface CreateIssueModalProps {
  projectId: string;
  sprints: Sprint[];
  defaultSprintId?: string | null;
  defaultStatus?: string;
  onClose: () => void;
  onIssueCreated: (newIssue: Issue) => void;
}

export function CreateIssueModal({
  projectId,
  sprints,
  defaultSprintId,
  defaultStatus = 'TODO',
  onClose,
  onIssueCreated,
}: CreateIssueModalProps) {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('TASK');
  const [priority, setPriority] = useState('MEDIUM');
  const [sprintId, setSprintId] = useState(defaultSprintId || '');
  const [storyPoints, setStoryPoints] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    try {
      setLoading(true);
      const issue = await jiraApi.createIssue({
        project_id: projectId,
        summary: summary.trim(),
        description: description.trim() || undefined,
        type,
        status: defaultStatus,
        priority,
        sprint_id: sprintId || undefined,
        story_points: storyPoints === '' ? undefined : Number(storyPoints),
      });
      onIssueCreated(issue);
      onClose();
    } catch (err) {
      console.error('Failed to create issue:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-bg-card border border-border rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-accent" />
            <h2 className="text-base font-bold text-text-primary">Create Issue</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Issue Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Issue Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-xs font-medium rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="TASK">Task</option>
                <option value="STORY">Story</option>
                <option value="BUG">Bug</option>
                <option value="EPIC">Epic</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs font-medium rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Summary *</label>
            <input
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Implement real-time STT WebSocket client"
              className="w-full text-xs font-medium rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description or requirements..."
              className="w-full text-xs font-medium rounded-xl bg-bg-elevated border border-border p-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {/* Sprint & Story Points */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Sprint</label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full text-xs font-medium rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Backlog (No Sprint)</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">
                Story Points
              </label>
              <input
                type="number"
                value={storyPoints}
                onChange={(e) =>
                  setStoryPoints(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="e.g. 3, 5, 8"
                className="w-full text-xs font-medium rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !summary.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-foreground hover:bg-accent/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
