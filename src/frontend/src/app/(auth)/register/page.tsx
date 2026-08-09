'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, workspaceApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useLanguageStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Register user account
      await authApi.register(email, password, fullName);

      // 2. Login user to get tokens
      const tokens = await authApi.login(email, password);
      localStorage.setItem('axiom_token', tokens.access_token);

      const user = await authApi.me();

      // 3. Create initial workspace if workspaceName provided
      let initialWs = null;
      if (workspaceName.trim()) {
        const slug = workspaceName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        initialWs = await workspaceApi.create(workspaceName.trim(), slug || 'workspace');
      }

      const workspaces = await workspaceApi.list();
      setAuth(user, tokens.access_token, workspaces, initialWs || workspaces[0]);

      router.push('/meetings');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base text-text-primary p-4">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/20 text-accent font-bold text-xl mb-3">
            🚀
          </div>
          <h1 className="text-lg font-semibold text-text-primary">{t.auth.registerTitle}</h1>
          <p className="text-text-secondary text-sm mt-1">{t.auth.registerSubtitle}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t.auth.fullName}
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sarah Connor"
              className="w-full px-3 py-2.5 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t.auth.email}
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@company.com"
              className="w-full px-3 py-2.5 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t.auth.password}
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.passwordHint}
              className="w-full px-3 py-2.5 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t.auth.orgName}
            </label>
            <input
              type="text"
              autoComplete="organization"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder={t.auth.orgPlaceholder}
              className="w-full px-3 py-2.5 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.auth.registerLoading : t.auth.registerBtn}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-text-secondary">
          {t.auth.hasAccount}{' '}
          <Link href="/login" className="text-accent hover:underline font-medium">
            {t.auth.signIn}
          </Link>
        </div>
      </div>
    </div>
  );
}
