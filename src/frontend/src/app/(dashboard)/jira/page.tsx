'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { jiraApi, JiraProject, departmentApi, Department } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { JiraSidebar } from '@/components/jira/layout/JiraSidebar';
import {
  Kanban,
  Plus,
  Video,
  ArrowRight,
  Loader2,
  FolderPlus,
  Sparkles,
  Layers,
  Star,
  Users,
  Search,
  Building2,
} from 'lucide-react';

export default function JiraOverviewPage() {
  const { activeOrganization } = useAuthStore();
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // Create Project Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projs, depts] = await Promise.all([
        jiraApi.getProjects(),
        activeOrganization
          ? departmentApi.list(activeOrganization.id).catch(() => [])
          : Promise.resolve([]),
      ]);
      setProjects(projs);
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load Jira data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrganization?.id]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!key || key.length <= 4) {
      const generated = val
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 4);
      if (generated) setKey(generated);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    try {
      setIsSubmitting(true);
      const newProj = await jiraApi.createProject({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim() || undefined,
        department_id: departmentId || undefined,
        organization_id: activeOrganization?.id || undefined,
      });
      setProjects((prev) => [...prev, newProj]);
      setShowCreateModal(false);
      setName('');
      setKey('');
      setDescription('');
      setDepartmentId('');
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !p.key.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (selectedDeptFilter !== 'ALL' && p.department_id !== selectedDeptFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-bg-base">
      <JiraSidebar onOpenCreateProject={() => setShowCreateModal(true)} />

      <main className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-text-primary tracking-tight">
              Spaces & Workspaces
            </h1>
            <p className="text-xs text-text-secondary">
              Department spaces, agile sprint boards, and AI meeting workspaces.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search spaces..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-bg-card border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-60 shadow-2xs"
              />
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Space</span>
            </button>
          </div>
        </div>

        {/* Department Filter Pills */}
        {departments.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1.5">
              Department:
            </span>
            <button
              onClick={() => setSelectedDeptFilter('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                selectedDeptFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              All Departments
            </button>
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDeptFilter(d.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  selectedDeptFilter === d.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProjects.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4 max-w-lg mx-auto my-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
              <Kanban className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-text-primary">No spaces found</h2>
              <p className="text-xs text-text-secondary">
                Create a standalone Scrum/Kanban space or start a department meeting to generate one
                with AI!
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Space</span>
            </button>
          </div>
        )}

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/jira/${project.key}/board`}
              className="group p-5 rounded-2xl bg-bg-card border border-border hover:border-blue-500/50 transition-all duration-200 hover:shadow-lg flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                        project.meeting_id
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      }`}
                    >
                      {project.meeting_id ? '🎙️' : project.key.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary group-hover:text-blue-500 transition-colors">
                        {project.name}
                      </h3>
                      <span className="font-mono text-[11px] font-semibold text-text-muted">
                        Key: {project.key}
                      </span>
                    </div>
                  </div>

                  {project.meeting_id ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Meeting
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-elevated text-text-muted border border-border">
                      Project
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                  {project.description || 'No space description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted group-hover:text-blue-500 transition-colors font-medium">
                <span>Open Active Board</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-text-primary">Create New Space</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-text-secondary">Space Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Smart Meeting Assistant"
                  className="w-full rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text-secondary">
                  Project Key * (2-5 letters)
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder="e.g. SMA"
                  className="w-full font-mono uppercase rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {departments.length > 0 && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-text-secondary">Department (Optional)</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-xl bg-bg-elevated border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="">General Organization Space (No specific department)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-text-secondary">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the project goals..."
                  className="w-full rounded-xl bg-bg-elevated border border-border p-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-bg-elevated text-text-secondary hover:text-text-primary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name || !key}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
