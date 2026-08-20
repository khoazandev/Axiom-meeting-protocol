'use client';

import React, { useState } from 'react';
import { jiraApi, Sprint } from '@/lib/api';
import { Play, X } from 'lucide-react';

interface StartSprintModalProps {
  sprint: Sprint;
  onClose: () => void;
  onSprintStarted: (started: Sprint) => void;
}

export function StartSprintModal({ sprint, onClose, onSprintStarted }: StartSprintModalProps) {
  const [goal, setGoal] = useState(sprint.goal || '');
  const [duration, setDuration] = useState(sprint.duration || 'TWO_WEEKS');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const started = await jiraApi.startSprint(sprint.id, {
        goal: goal.trim() || undefined,
        duration,
      });
      onSprintStarted(started);
      onClose();
    } catch (err) {
      console.error('Failed to start sprint:', err);
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
            <Play className="w-5 h-5 text-accent fill-accent" />
            <h2 className="text-base font-bold text-text-primary">Start Sprint: {sprint.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full text-xs font-medium rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="ONE_WEEK">1 Week</option>
              <option value="TWO_WEEKS">2 Weeks</option>
              <option value="THREE_WEEKS">3 Weeks</option>
              <option value="FOUR_WEEKS">4 Weeks</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Sprint Goal</label>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What does the team want to achieve during this sprint?"
              className="w-full text-xs font-medium rounded-xl bg-bg-elevated border border-border p-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Starting...' : 'Start Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
