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
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { getAuthHeaders } from '@/lib/api';

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
  const { t } = useLanguageStore();
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
      const headers = getAuthHeaders();
      if (!headers['Authorization']) return;

      const res = await fetch('/api/v1/knowledge/documents', { headers });

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
      const headers = getAuthHeaders();
      if (!headers['Authorization']) {
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      // Remove Content-Type for FormData — browser sets it with boundary
      const { 'Content-Type': _, ...uploadHeaders } = headers as Record<string, string> & {
        'Content-Type'?: string;
      };

      const res = await fetch('/api/v1/knowledge/documents', {
        method: 'POST',
        headers: uploadHeaders,
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
      const headers = getAuthHeaders();
      if (!headers['Authorization']) {
        setIsSearching(false);
        return;
      }

      const res = await fetch('/api/v1/knowledge/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
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
      const headers = getAuthHeaders();
      if (!headers['Authorization']) return;

      const res = await fetch(`/api/v1/knowledge/documents/${id}`, {
        method: 'DELETE',
        headers,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent" />
            <h1 className="text-lg font-semibold text-text-primary">{t.knowledge.title}</h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">{t.knowledge.subTitle}</p>
        </div>

        {uploadFeedback && (
          <span className="text-xs text-success font-semibold px-3 py-1 bg-success/10 border border-emerald-500/20 rounded-full animate-bounce">
            {uploadFeedback}
          </span>
        )}
      </div>

      {/* AI Semantic Search Box */}
      <div className="p-6 rounded-xl bg-bg-card border border-border/80 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-accent text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span>{t.knowledge.searchBtn}</span>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.knowledge.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-elevated border border-border text-sm text-text-primary placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            />
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-3 rounded-xl bg-accent hover:bg-accent/90 text-text-primary text-xs font-bold shadow-lg  flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{t.knowledge.searchBtn}</span>
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-text-secondary ">
              Search Results ({searchResults.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-bg-base border border-border/60 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-accent">{res.title}</span>
                    <span className="text-[9px] font-mono text-text-muted px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-900/40">
                      {res.type}
                    </span>
                  </div>
                  <p className="text-text-secondary leading-relaxed text-[11px]">{res.snippet}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Upload Zone & Uploaded Document List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Upload Card */}
        <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4">
          <div className="flex items-center gap-2 text-accent text-xs font-bold ">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </div>

          <label className="border-2 border-dashed border-border hover:border-accent/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors space-y-2">
            <UploadCloud className="w-8 h-8 text-accent" />
            <span className="text-xs font-bold text-text-primary">Click to Upload PDF / DOCX</span>
            <span className="text-[10px] text-text-secondary">
              Files will be auto-vectorized for RAG search
            </span>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Uploaded Documents List */}
        <div className="md:col-span-2 p-6 rounded-xl bg-bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-secondary text-xs font-bold ">
              <Database className="w-4 h-4 text-accent" />
              <span>Vectorized Documents ({documents.length})</span>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary bg-bg-base rounded-xl border border-border">
              No knowledge documents uploaded yet. Upload a PDF or DOCX file to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-bg-base border border-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <div className="font-semibold text-text-primary">{doc.filename}</div>
                      <div className="text-[10px] text-text-secondary font-mono">
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full bg-success/10 text-success border border-emerald-500/30 text-[9px] font-bold uppercase">
                      {doc.vector_status}
                    </span>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1 rounded-lg text-text-muted hover:text-danger transition-colors"
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
