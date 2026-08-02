'use client';

import { use } from 'react';
import Link from 'next/link';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white p-4">
      <div className="w-full max-w-md bg-[#131B2E] border border-blue-950/60 rounded-2xl p-8 text-center shadow-2xl">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold text-2xl mb-4">
          📩
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Workspace Invitation</h1>
        <p className="text-slate-300 text-sm mb-6">
          You've been invited to join a Workspace on Axiom.
        </p>

        <div className="p-3 bg-[#0B0F19] border border-blue-900/40 rounded-xl font-mono text-xs text-blue-400 break-all mb-6">
          Token: {token}
        </div>

        <Link
          href={`/register?invite=${token}`}
          className="block w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/25 transition-all mb-3"
        >
          Accept Invitation & Join
        </Link>

        <Link href="/login" className="block text-xs text-slate-400 hover:text-slate-300">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}
