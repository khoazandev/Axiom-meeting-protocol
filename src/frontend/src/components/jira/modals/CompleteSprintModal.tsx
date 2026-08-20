'use client';

import React, { useState } from 'react';
import { jiraApi, Sprint, Issue } from '@/lib/api';
import { CheckCircle2, X } from 'lucide-react';

interface CompleteSprintModalProps {
  sprint: Sprint;
  issues: Issue[];
  otherSprints: Sprint[];
  onClose: () => void;
  onSprintCompleted: (completed: Sprint) => void;
}

export function CompleteSprintModal({
  sprint,
  issues,
  otherSprints,
  onClose,
  onSprintCompleted,
}: CompleteSprintModalProps) {
  const [moveToSprintId, setMoveToSprintId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const completedIssues = issues.filter((i) => i.status === 'DONE');
  const incompleteIssues = issues.filter((i) => i.status !== 'DONE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const completed = await jiraApi.completeSprint(sprint.id, {
        move_incomplete_to_sprint_id: moveToSprintId || null,
      });
      onSprintCompleted(completed);
      onClose();
    } catch (err) {
      console.error('Failed to complete sprint:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-full max-w-md bg-bg-card border border-border rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <h2 className="text-base font-bold text-text-primary">Complete {sprint.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-bg-elevated/50 border border-border space-y-2 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>Completed issues:</span>
              <span className="font-bold text-success">{completedIssues.length}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Incomplete issues:</span>
              <span className="font-bold text-rose-400">{incompleteIssues.length}</span>
            </div>
          </div>

          {incompleteIssues.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">
                Move incomplete issues to:
              </label>
              <select
                value={moveToSprintId}
                onChange={(e) => setMoveToSprintId(e.target.value)}
                className="w-full text-xs font-medium rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Backlog</option>
                {otherSprints
                  .filter((s) => s.id !== sprint.id && s.status !== 'CLOSED')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
              </select>
            </div>
          )}

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
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-success text-white hover:bg-success/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Completing...' : 'Complete Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
