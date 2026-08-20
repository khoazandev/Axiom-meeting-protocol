'use client';

import React, { useState } from 'react';
import { JiraProject } from '@/lib/api';
import { Mail, UserPlus, Shield, CheckCircle2, Loader2, Users } from 'lucide-react';

interface InviteSpaceMemberModalProps {
  project: JiraProject;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteSpaceMemberModal({ project, isOpen, onClose }: InviteSpaceMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN' | 'VIEWER'>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsInviting(true);
      // Simulate invite API call & success feedback
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccessMsg(`Invited ${email.trim()} to space "${project.name}" as ${role}!`);
      setEmail('');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to invite member:', err);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Add People to Space</h2>
              <p className="text-[11px] text-text-muted">Space: {project.name} ({project.key})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-xs p-1"
          >
            ✕
          </button>
        </div>

        {successMsg ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-text-secondary">Email address *</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-text-secondary">Role in Space</label>
              <div className="grid grid-cols-3 gap-2">
                {(['MEMBER', 'ADMIN', 'VIEWER'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      role === r
                        ? 'bg-blue-600/15 border-blue-500 text-blue-400'
                        : 'bg-bg-elevated border-border text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {r === 'MEMBER' ? 'Member' : r === 'ADMIN' ? 'Admin' : 'Viewer'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-bg-elevated/50 border border-border/80 text-[11px] text-text-secondary space-y-1">
              <span className="font-semibold text-text-primary block">Permissions:</span>
              <p>
                {role === 'MEMBER' && 'Members can create, edit, move cards, and start sprints.'}
                {role === 'ADMIN' && 'Admins have full access including space settings & members.'}
                {role === 'VIEWER' && 'Viewers can view boards, backlog, and timeline in read-only mode.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-bg-elevated text-text-secondary hover:text-text-primary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isInviting || !email}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isInviting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Add to Space</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
