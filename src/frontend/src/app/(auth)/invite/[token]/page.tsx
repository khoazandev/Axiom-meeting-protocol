'use client';

import { use } from 'react';
import Link from 'next/link';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base text-text-primary p-4">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-xl p-8 text-center shadow-lg">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-2xl mb-4">
          📩
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Workspace Invitation</h1>
        <p className="text-text-secondary text-sm mb-6">
          You&apos;ve been invited to join a Workspace on Axiom.
        </p>

        <div className="p-3 bg-bg-base border border-border rounded-xl font-mono text-xs text-accent break-all mb-6">
          Token: {token}
        </div>

        <Link
          href={`/register?invite=${token}`}
          className="block w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent/90 text-text-primary font-medium shadow-lg shadow-blue-600/25 transition-all mb-3"
        >
          Accept Invitation & Join
        </Link>

        <Link href="/login" className="block text-xs text-text-secondary hover:text-text-secondary">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}
