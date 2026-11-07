'use client';

import React, { useState, useEffect } from 'react';
import { Issue, jiraApi, IssueComment } from '@/lib/api';
import { IssueTypeIcon } from '../IssueTypeIcon';
import { PriorityIcon } from '../PriorityIcon';
import {
  X,
  Trash2,
  Send,
  CheckCircle,
  Circle,
  Plus,
  Mic,
  Calendar,
  User,
  Clock,
  ExternalLink,
  MessageSquare,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface IssueDetailDrawerProps {
  issueId: string | null;
  onClose: () => void;
  onIssueUpdated: (updated: Issue) => void;
  onIssueDeleted: (deletedId: string) => void;
}

export function IssueDetailDrawer({
  issueId,
  onClose,
  onIssueUpdated,
  onIssueDeleted,
}: IssueDetailDrawerProps) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [type, setType] = useState('TASK');
  const [storyPoints, setStoryPoints] = useState<number | ''>('');
  const [newSubtaskSummary, setNewSubtaskSummary] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [subtasks, setSubtasks] = useState<Issue[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!issueId) {
      setIssue(null);
      return;
    }

    async function loadIssue() {
      try {
        setLoading(true);
        const data = await jiraApi.getIssue(issueId!);
        setIssue(data);
        setSummary(data.summary);
        setDescription(data.description || '');
        setStatus(data.status);
        setPriority(data.priority);
        setType(data.type);
        setStoryPoints(data.story_points ?? '');
        setComments(data.comments || []);
        setSubtasks(data.subtasks || []);
      } catch (err) {
        console.error('Failed to load issue detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadIssue();
  }, [issueId]);

  if (!issueId) return null;

  const handleSaveField = async (fields: Partial<Issue>) => {
    if (!issue) return;
    try {
      setIsSaving(true);
      const updated = await jiraApi.updateIssue(issue.id, fields);
      setIssue((prev) => (prev ? { ...prev, ...updated } : updated));
      onIssueUpdated(updated);
    } catch (err) {
      console.error('Failed to update issue:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !issue) return;
    try {
      const comment = await jiraApi.addComment(issue.id, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskSummary.trim() || !issue) return;
    try {
      const subtask = await jiraApi.createIssue({
        project_id: issue.project_id,
        summary: newSubtaskSummary.trim(),
        type: 'SUBTASK',
        status: 'TODO',
        parent_id: issue.id,
        sprint_id: issue.sprint_id || undefined,
      });
      setSubtasks((prev) => [...prev, subtask]);
      setNewSubtaskSummary('');
    } catch (err) {
      console.error('Failed to add subtask:', err);
    }
  };

  const handleToggleSubtask = async (sub: Issue) => {
    const nextStatus = sub.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      const updated = await jiraApi.updateIssue(sub.id, { status: nextStatus });
      setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  const handleDelete = async () => {
    if (!issue || !confirm(`Delete issue ${issue.key}?`)) return;
    try {
      await jiraApi.deleteIssue(issue.id);
      onIssueDeleted(issue.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete issue:', err);
    }
  };

  const completedSubtasks = subtasks.filter((s) => s.status === 'DONE').length;
  const subtaskProgress =
    subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-bg-card border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Top Action Bar */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-bg-elevated/40">
          <div className="flex items-center gap-3">
            <IssueTypeIcon type={type} className="w-5 h-5" />
            <span className="font-mono font-bold text-sm text-text-primary tracking-wide">
              {issue?.key || '...'}
            </span>
            {isSaving && <span className="text-xs text-text-muted animate-pulse">Saving...</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Delete Issue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : issue ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Title / Summary */}
            <div>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                onBlur={() => summary !== issue.summary && handleSaveField({ summary })}
                placeholder="Issue summary..."
                className="w-full text-lg font-bold text-text-primary bg-transparent border-b border-transparent hover:border-border focus:border-accent focus:outline-none py-1 transition-colors"
              />
            </div>

            {/* Meeting AI Provenance Box */}
            {issue.transcript_segment_id && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                    <Mic className="w-4 h-4 text-accent" />
                    <span>Meeting Context & Audio Transcript</span>
                  </div>
                  {issue.meeting_id && (
                    <Link
                      href={`/meetings/${issue.meeting_id}`}
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>View Meeting Room</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <blockquote className="text-xs italic text-text-secondary border-l-2 border-accent pl-3 py-0.5">
                  &ldquo;{issue.description || issue.summary}&rdquo;
                </blockquote>
              </div>
            )}

            {/* Grid of Main Properties */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-bg-elevated/50 p-4 rounded-xl border border-border">
              {/* Status */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    handleSaveField({ status: e.target.value });
                  }}
                  className="w-full text-xs font-semibold rounded-lg bg-bg-card border border-border px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    handleSaveField({ priority: e.target.value });
                  }}
                  className="w-full text-xs font-semibold rounded-lg bg-bg-card border border-border px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    handleSaveField({ type: e.target.value });
                  }}
                  className="w-full text-xs font-semibold rounded-lg bg-bg-card border border-border px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="TASK">Task</option>
                  <option value="STORY">Story</option>
                  <option value="BUG">Bug</option>
                  <option value="EPIC">Epic</option>
                  <option value="SUBTASK">Subtask</option>
                </select>
              </div>

              {/* Story Points */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                  Story Points
                </label>
                <input
                  type="number"
                  value={storyPoints}
                  onChange={(e) =>
                    setStoryPoints(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  onBlur={() =>
                    handleSaveField({
                      story_points: storyPoints === '' ? undefined : Number(storyPoints),
                    })
                  }
                  placeholder="Points"
                  className="w-full text-xs font-semibold rounded-lg bg-bg-card border border-border px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Description Area */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => description !== issue.description && handleSaveField({ description })}
                placeholder="Add a more detailed description..."
                rows={4}
                className="w-full rounded-xl bg-bg-card border border-border p-3 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-all resize-y"
              />
            </div>

            {/* Subtasks Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Subtasks ({completedSubtasks}/{subtasks.length})
                </label>
                {subtasks.length > 0 && (
                  <span className="text-xs font-semibold text-accent">{subtaskProgress}%</span>
                )}
              </div>

              {/* Progress bar */}
              {subtasks.length > 0 && (
                <div className="w-full h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                  <div
                    className="h-full bg-success transition-all duration-300"
                    style={{ width: `${subtaskProgress}%` }}
                  />
                </div>
              )}

              {/* Subtasks list */}
              <div className="space-y-1.5">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-bg-elevated/40 border border-border hover:bg-bg-elevated transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleSubtask(sub)}
                        className="text-text-muted hover:text-success transition-colors"
                      >
                        {sub.status === 'DONE' ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <span
                        className={`text-xs font-medium truncate ${
                          sub.status === 'DONE'
                            ? 'line-through text-text-muted'
                            : 'text-text-primary'
                        }`}
                      >
                        {sub.summary}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-text-muted ml-2">{sub.key}</span>
                  </div>
                ))}
              </div>

              {/* Quick Add Subtask */}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskSummary}
                  onChange={(e) => setNewSubtaskSummary(e.target.value)}
                  placeholder="What needs to be done?"
                  className="flex-1 rounded-xl bg-bg-card border border-border px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskSummary.trim()}
                  className="px-3 py-1.5 rounded-xl bg-accent text-foreground text-xs font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Comments Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-text-muted" />
                <label className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Activity & Comments ({comments.length})
                </label>
              </div>

              {/* Comments Feed */}
              <div className="space-y-3">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-bg-elevated/40 border border-border space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text-primary">
                        {c.author_name || 'Team Member'}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(c.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 rounded-xl bg-bg-card border border-border px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-4 py-2 rounded-xl bg-accent text-foreground text-xs font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
