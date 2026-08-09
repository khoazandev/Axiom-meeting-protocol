'use client';

import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { Settings, Building, User } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useLanguageStore();
  const { user, activeOrganization } = useAuthStore();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 border-b border-border pb-5">
        <Settings className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-semibold text-text-primary">{t.settings.title}</h1>
      </div>

      <div className="space-y-6">
        {/* User Settings */}
        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary border-b border-border pb-3">
            <User className="w-4 h-4 text-accent" />
            <span>{t.settings.profile}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-text-secondary mb-1">{t.settings.name}</label>
              <div className="p-3 rounded-lg bg-bg-elevated border border-border text-text-primary font-medium">
                {user?.full_name || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-text-secondary mb-1">{t.settings.email}</label>
              <div className="p-3 rounded-lg bg-bg-elevated border border-border text-text-primary font-medium">
                {user?.email || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Settings */}
        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary border-b border-border pb-3">
            <Building className="w-4 h-4 text-accent" />
            <span>{t.settings.workspace}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-text-secondary mb-1">{t.settings.workspaceName}</label>
              <div className="p-3 rounded-lg bg-bg-elevated border border-border text-text-primary font-medium">
                {activeOrganization?.name || t.nav.defaultWorkspace}
              </div>
            </div>
            <div>
              <label className="block text-text-secondary mb-1">{t.settings.workspaceSlug}</label>
              <div className="p-3 rounded-lg bg-bg-elevated border border-border text-text-primary font-mono text-accent">
                {activeOrganization?.slug || 'default'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
