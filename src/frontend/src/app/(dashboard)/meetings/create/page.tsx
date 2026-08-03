'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { meetingsApi, ApiRequestError } from '@/lib/api';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { ArrowLeft, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CreateMeetingPage() {
  const router = useRouter();
  const { t } = useLanguageStore();
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
      setError(t.createMeeting.gateError);
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
        className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.createMeeting.backLink}</span>
      </Link>

      <div className="bg-bg-card border border-border rounded-xl p-8 shadow-lg space-y-6">
        <div className="border-b border-border pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-muted border border-accent/30 text-accent text-xs font-semibold  mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.createMeeting.badge}</span>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">{t.createMeeting.title}</h1>
          <p className="text-sm text-text-secondary mt-1">{t.createMeeting.subTitle}</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold  text-text-secondary mb-2">
              {t.createMeeting.meetingTitleLabel}
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t.createMeeting.meetingTitlePlaceholder}
              className="w-full px-4 py-3 rounded-xl bg-bg-base border border-border text-text-primary text-sm placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold  text-text-secondary">
                {t.createMeeting.agendaLabel}
              </label>
              <div
                className={`text-xs font-mono font-semibold flex items-center gap-1.5 ${
                  isGateValid ? 'text-success' : 'text-warning'
                }`}
              >
                {isGateValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span>
                      {t.createMeeting.gateValidated} ({charCount}/20)
                    </span>
                  </>
                ) : (
                  <span>
                    {charCount} / 20 {t.createMeeting.gateRequired}
                  </span>
                )}
              </div>
            </div>
            <textarea
              required
              rows={4}
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              placeholder={t.createMeeting.agendaPlaceholder}
              className="w-full px-4 py-3 rounded-xl bg-bg-base border border-border text-text-primary text-sm placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors leading-relaxed"
            />
            <p className="text-[11px] text-text-secondary mt-1.5">
              {t.createMeeting.backendHelpText}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold  text-text-secondary mb-2">
              {t.createMeeting.durationLabel}
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
              className="w-full px-4 py-3 rounded-xl bg-bg-base border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isGateValid}
            className="w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent/90 text-text-primary font-medium text-sm shadow-lg  transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.createMeeting.deployingBtn}</span>
              </>
            ) : (
              t.createMeeting.deployBtn
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
