'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, organizationApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useLanguageStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tokens = await authApi.login(email, password);
      useAuthStore.setState({ token: tokens.access_token });
      const user = await authApi.me();
      const organizations = await organizationApi.list();
      setAuth(user, tokens.access_token, organizations, organizations[0]);
      router.push('/meetings');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.auth.loginError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base text-text-primary p-4">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-accent-foreground font-bold text-sm mb-3">
            A
          </div>
          <h1 className="text-lg font-semibold text-text-primary">{t.auth.loginTitle}</h1>
          <p className="text-sm text-text-muted mt-1">{t.auth.loginSubtitle}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {t.auth.email}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-border focus-within:ring-2 focus-within:ring-focus-ring transition-colors">
              <input
                type="text"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name"
                className="flex-1 w-full px-3 py-2.5 bg-bg-elevated text-text-primary placeholder-text-placeholder text-sm focus:outline-none"
              />
              <span className="px-3 py-2.5 bg-muted text-text-secondary text-sm border-l border-border flex items-center font-medium">
                @gmail.com
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {t.auth.password}
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg bg-bg-elevated border border-border text-text-primary placeholder-text-placeholder text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.auth.loginLoading : t.auth.loginBtn}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-text-muted">
          {t.auth.noAccount}{' '}
          <Link href="/register" className="text-accent hover:underline font-medium">
            {t.auth.createAccount}
          </Link>
        </div>
      </div>
    </div>
  );
}
