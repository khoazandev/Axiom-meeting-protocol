'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { meetingsApi, ApiRequestError } from '@/lib/api';
import { ArrowLeft, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CreateMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    agenda: '',
    duration_minutes: 60,
  });

  const charCount = formData.agenda.trim().length;
  const isGateValid = charCount >= 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isGateValid) {
      setError('Process Gate Violation: Agenda must be at least 20 characters.');
      setLoading(false);
      return;
    }

    try {
      await meetingsApi.create(formData);
      router.push('/meetings');
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create meeting.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Back Button */}
      <Link
        href="/meetings"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Meetings</span>
      </Link>

      <div className="bg-[#131B2E] border border-blue-950/80 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="border-b border-blue-950/60 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Process Gate Enforcement</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Deploy New Meeting</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure a structured meeting with mandatory agenda validation for automated AI post-meeting analytics.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Meeting Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Q3 Architecture Review & Security Gate"
              className="w-full px-4 py-3 rounded-xl bg-[#0B0F19] border border-blue-900/40 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Agenda (Process Gate)
              </label>
              <div
                className={`text-xs font-mono font-semibold flex items-center gap-1.5 ${
                  isGateValid ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isGateValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gate Validated ({charCount}/20 min)</span>
                  </>
                ) : (
                  <span>{charCount} / 20 characters required</span>
                )}
              </div>
            </div>
            <textarea
              required
              rows={4}
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              placeholder="1. Review Q2 metrics&#10;2. Discuss Q3 roadmap&#10;3. Allocate engineering resources"
              className="w-full px-4 py-3 rounded-xl bg-[#0B0F19] border border-blue-900/40 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Backend enforces a minimum 20-character agenda to guarantee structured meeting records.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Estimated Duration (Minutes)
            </label>
            <input
              type="number"
              min="15"
              step="15"
              required
              value={formData.duration_minutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration_minutes: parseInt(e.target.value) || 60,
                })
              }
              className="w-full px-4 py-3 rounded-xl bg-[#0B0F19] border border-blue-900/40 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isGateValid}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deploying Meeting...</span>
              </>
            ) : (
              'Deploy & Open Conference'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
