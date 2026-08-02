'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Video,
  Database,
  FileText,
  Plus,
  Trash2,
  Lock,
  Radio,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface AdminStats {
  total_members: number;
  total_meetings: number;
  total_tasks: number;
  total_documents: number;
  total_audit_events: number;
}

interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  user_id: string | null;
  ip_address: string | null;
  details: string | null;
  created_at: string;
}

interface OutboundWebhookItem {
  id: string;
  name: string;
  target_url: string;
  events: string;
  secret_key: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [webhooks, setWebhooks] = useState<OutboundWebhookItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Webhook Form State
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState('task.created,meeting.finished');
  const [isAddingWh, setIsAddingWh] = useState(false);

  useEffect(() => {
    async function initAdminData() {
      try {
        const token = localStorage.getItem('token');
        const activeWorkspaceId = localStorage.getItem('active_workspace_id');
        if (!token || !activeWorkspaceId) {
          setLoading(false);
          return;
        }

        // Fetch User Me / Workspace role
        const meRes = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (meRes.ok) {
          const user = await meRes.json();
          // Find role in current workspace
          const headers = {
            Authorization: `Bearer ${token}`,
            'X-Workspace-ID': activeWorkspaceId,
          };

          // Fetch Stats
          const statsRes = await fetch('/api/v1/admin/stats', { headers });
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStats(statsData);
            setRole('ADMIN'); // Admin authorized
          } else if (statsRes.status === 403) {
            setRole('MEMBER'); // Restricted
          }

          // Fetch Audit Logs
          const auditRes = await fetch('/api/v1/admin/audit-logs', { headers });
          if (auditRes.ok) {
            const auditData = await auditRes.json();
            setAuditLogs(auditData);
          }

          // Fetch Webhooks
          const whRes = await fetch('/api/v1/admin/webhooks', { headers });
          if (whRes.ok) {
            const whData = await whRes.json();
            setWebhooks(whData);
          }
        }
      } catch (err) {
        console.error('Failed to initialize admin page:', err);
      } finally {
        setLoading(false);
      }
    }

    initAdminData();
  }, []);

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whUrl.trim()) return;

    try {
      setIsAddingWh(true);
      const token = localStorage.getItem('token');
      const activeWorkspaceId = localStorage.getItem('active_workspace_id');
      if (!token || !activeWorkspaceId) return;

      const res = await fetch('/api/v1/admin/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Workspace-ID': activeWorkspaceId,
        },
        body: JSON.stringify({
          name: whName.trim(),
          target_url: whUrl.trim(),
          events: whEvents,
        }),
      });

      if (res.ok) {
        const newWh = await res.json();
        setWebhooks((prev) => [newWh, ...prev]);
        setWhName('');
        setWhUrl('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingWh(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const activeWorkspaceId = localStorage.getItem('active_workspace_id');
      if (!token || !activeWorkspaceId) return;

      const res = await fetch(`/api/v1/admin/webhooks/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Workspace-ID': activeWorkspaceId,
        },
      });

      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
        Loading Admin Governance Portal...
      </div>
    );
  }

  // RBAC Restricted Screen
  if (role === 'MEMBER') {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 inline-block">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-white">403 Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Admin Console is strictly reserved for Workspace Owners and Administrators. Please contact your workspace administrator for elevated governance permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-950/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Enterprise Governance</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            System audit telemetry, compliance monitoring, and outbound webhook sync integrations.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>ADMIN RBAC ACTIVE</span>
        </span>
      </div>

      {/* Top Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Workspace Members</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats?.total_members || 1}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Total Meetings</span>
            <Video className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats?.total_meetings || 0}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Knowledge Docs</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats?.total_documents || 0}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Audit Events</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats?.total_audit_events || 0}</div>
        </div>
      </div>

      {/* Grid: Audit Log & Webhooks Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audit Log Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Immutable Audit Logs</span>
            </div>
            <span className="text-[10px] text-slate-400">Security & Compliance</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-blue-950 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Actor / IP</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-950/60">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No security audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-blue-950/20">
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-medium">{log.resource}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{log.ip_address || '127.0.0.1'}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outbound Webhook Config Box */}
        <div className="p-6 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Radio className="w-4 h-4" />
            <span>Outbound Webhook Engine</span>
          </div>

          <form onSubmit={handleAddWebhook} className="space-y-3">
            <input
              type="text"
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              placeholder="Webhook Name (e.g. Jira Board Sync)"
              className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-blue-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="url"
              value={whUrl}
              onChange={(e) => setWhUrl(e.target.value)}
              placeholder="Target URL (https://...)"
              className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-blue-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isAddingWh}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Webhook Endpoint</span>
            </button>
          </form>

          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Webhooks ({webhooks.length})</div>
            {webhooks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-[#0B0F19] rounded-xl border border-blue-950">
                No outbound webhooks registered.
              </div>
            ) : (
              webhooks.map((wh) => (
                <div key={wh.id} className="p-3 rounded-xl bg-[#0B0F19] border border-blue-950 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 truncate">
                    <div className="font-bold text-white truncate">{wh.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{wh.target_url}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteWebhook(wh.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-red-400 transition-colors ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
