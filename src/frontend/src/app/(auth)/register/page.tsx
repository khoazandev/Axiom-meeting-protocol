'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wand2 } from 'lucide-react';
import { authApi, organizationApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useLanguageStore } from '@/lib/store/useLanguageStore';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useLanguageStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRandomFill = () => {
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    setFullName(`Test User ${randomNum}`);
    setEmail(`testuser${randomNum}`);
    setPassword('Test@1234');
    setOrganizationName(`Test Org ${randomNum}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Register user account
      await authApi.register(email, password, fullName);

      // 2. Login user to get tokens
      const tokens = await authApi.login(email, password);
      useAuthStore.setState({ token: tokens.access_token });

      const user = await authApi.me();

      // 3. Create initial organization if organizationName provided
      let initialOrg = null;
      if (organizationName.trim()) {
        initialOrg = await organizationApi.create(organizationName.trim());
      }

      const organizations = await organizationApi.list();
      setAuth(user, tokens.access_token, organizations, initialOrg || organizations[0]);

      router.push('/meetings');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-text-primary">{t.auth.registerTitle}</h1>
            <button
              type="button"
              onClick={handleRandomFill}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
              title="Điền dữ liệu ngẫu nhiên"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Điền nhanh</span>
            </button>
          </div>
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
            <div className="flex rounded-lg overflow-hidden border border-border focus-within:ring-2 focus-within:ring-focus-ring transition-colors">
              <input
                type="text"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah"
                className="flex-1 w-full px-3 py-2.5 bg-bg-elevated text-text-primary text-sm placeholder-text-placeholder focus:outline-none"
              />
              <span className="px-3 py-2.5 bg-muted text-text-secondary text-sm border-l border-border flex items-center font-medium">
                @gmail.com
              </span>
            </div>
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
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
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
