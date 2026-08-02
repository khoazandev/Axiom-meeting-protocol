'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  UploadCloud,
  Search,
  FileText,
  Trash2,
  CheckCircle2,
  Loader2,
  Database,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  filename: string;
  file_size: number;
  vector_status: string;
  created_at: string;
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  snippet: string;
  source: string;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const token = localStorage.getItem('token');
      const activeWorkspaceId = localStorage.getItem('active_workspace_id');
      if (!token || !activeWorkspaceId) return;

      const res = await fetch('/api/v1/knowledge/documents', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Workspace-ID': activeWorkspaceId,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to load knowledge documents:', err);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const token = localStorage.getItem('token');
      const activeWorkspaceId = localStorage.getItem('active_workspace_id');
      if (!token || !activeWorkspaceId) {
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/knowledge/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Workspace-ID': activeWorkspaceId,
        },
        body: formData,
      });

      if (res.ok) {
        setUploadFeedback(`Uploaded and indexed ${file.name}`);
        setTimeout(() => setUploadFeedback(null), 3000);
        loadDocuments();
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const token = localStorage.getItem('token');
      const activeWorkspaceId = localStorage.getItem('active_workspace_id');
      if (!token || !activeWorkspaceId) {
        setIsSearching(false);
        return;
      }

      const res = await fetch('/api/v1/knowledge/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Workspace-ID': activeWorkspaceId,
        },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.matches || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const activeWorkspaceId = localStorage.getItem('active_workspace_id');
      if (!token || !activeWorkspaceId) return;

      const res = await fetch(`/api/v1/knowledge/documents/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Workspace-ID': activeWorkspaceId,
        },
      });

      if (res.ok) {
        loadDocuments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-blue-950/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Knowledge Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Upload enterprise documents & query indexed meeting transcripts using semantic AI RAG search.
          </p>
        </div>

        {uploadFeedback && (
          <span className="text-xs text-emerald-400 font-semibold px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-bounce">
            {uploadFeedback}
          </span>
        )}
      </div>

      {/* AI Semantic Search Box */}
      <div className="p-6 rounded-2xl bg-[#131B2E] border border-indigo-950/80 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>AI Semantic RAG Search Engine</span>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask anything about meetings, MoM summaries, or uploaded specs..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0B0F19] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Search RAG</span>
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Results ({searchResults.length})</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((res, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-[#0B0F19] border border-indigo-950/60 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-400">{res.title}</span>
                    <span className="text-[9px] font-mono text-slate-500 px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-900/40">{res.type}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{res.snippet}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Upload Zone & Uploaded Document List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Upload Card */}
        <div className="p-6 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-4">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </div>

          <label className="border-2 border-dashed border-blue-950 hover:border-blue-500/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors space-y-2">
            <UploadCloud className="w-8 h-8 text-blue-400" />
            <span className="text-xs font-bold text-white">Click to Upload PDF / DOCX</span>
            <span className="text-[10px] text-slate-400">Files will be auto-vectorized for RAG search</span>
            <input type="file" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
          </label>
        </div>

        {/* Uploaded Documents List */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-[#131B2E] border border-blue-950 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
              <Database className="w-4 h-4 text-blue-400" />
              <span>Vectorized Documents ({documents.length})</span>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-[#0B0F19] rounded-xl border border-blue-950">
              No knowledge documents uploaded yet. Upload a PDF or DOCX file to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="p-3.5 rounded-xl bg-[#0B0F19] border border-blue-950 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">{doc.filename}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{(doc.file_size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase">
                      {doc.vector_status}
                    </span>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
