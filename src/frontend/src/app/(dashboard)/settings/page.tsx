'use client';

import { useAuthStore } from '@/lib/store/useAuthStore';
import { Settings, ShieldCheck, Building, User } from 'lucide-react';

export default function SettingsPage() {
  const { user, activeWorkspace } = useAuthStore();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 border-b border-blue-950/60 pb-5">
        <Settings className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Workspace & Account Settings</h1>
      </div>

      <div className="space-y-6">
        {/* User Settings */}
        <div className="bg-[#131B2E] border border-blue-950/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider border-b border-blue-950/60 pb-3">
            <User className="w-4 h-4 text-blue-400" />
            <span>User Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Full Name</label>
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-blue-950 text-white font-medium">
                {user?.full_name || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Email Address</label>
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-blue-950 text-white font-medium">
                {user?.email || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Settings */}
        <div className="bg-[#131B2E] border border-blue-950/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider border-b border-blue-950/60 pb-3">
            <Building className="w-4 h-4 text-blue-400" />
            <span>Active Tenant Workspace</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Workspace Name</label>
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-blue-950 text-white font-medium">
                {activeWorkspace?.name || 'Default Workspace'}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Workspace Slug ID</label>
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-blue-950 text-white font-mono text-blue-400">
                {activeWorkspace?.slug || 'default'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
