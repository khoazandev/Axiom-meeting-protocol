'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { knowledgeApi, KnowledgeMatch } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

interface MemberKnowledgeTabProps {
  onNotify?: (msg: string) => void;
}

export function MemberKnowledgeTab({ onNotify }: MemberKnowledgeTabProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const loadRecent = useCallback(async () => {
    if (requestRef.current) {
      requestRef.current.abort();
    }
    const controller = new AbortController();
    requestRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await knowledgeApi.recentTranscripts(20, controller.signal);
      setResults(data);
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      setErrorMessage(getErrorMessage(err, 'Không thể tải biên bản gần đây. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    requestRef.current = controller;

    knowledgeApi
      .recentTranscripts(20, controller.signal)
      .then((data) => {
        if (!ignore) {
          setResults(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          if ((err as Error)?.name === 'AbortError') return;
          setErrorMessage(
            getErrorMessage(err, 'Không thể tải biên bản gần đây. Vui lòng thử lại.')
          );
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      loadRecent();
      return;
    }

    if (requestRef.current) {
      requestRef.current.abort();
    }
    const controller = new AbortController();
    requestRef.current = controller;

    setIsSearching(true);
    setErrorMessage(null);

    try {
      const data = await knowledgeApi.search(trimmed, controller.signal);
      setResults(data.matches || []);
      if (onNotify) {
        onNotify(`Tìm thấy ${data.total_matches} kết quả cho "${trimmed}"`);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      setErrorMessage(getErrorMessage(err, 'Không thể tìm kiếm trong biên bản. Vui lòng thử lại.'));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Kho Tri Thức & Tra Cứu Biên Bản Họp
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tìm kiếm nội dung đã nói trong cuộc họp, tra cứu nghị quyết mà không cần phải xem lại cả
            giờ video.
          </p>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm trong biên bản họp..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || isLoading}
            title="Tìm trong biên bản"
            className="shrink-0 w-36 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            {isSearching ? (
              <Loader2 size={14} className="animate-spin shrink-0" />
            ) : (
              <Search size={14} className="shrink-0" />
            )}
            <span className="truncate">{isSearching ? 'Đang tìm...' : 'Tìm trong biên bản'}</span>
          </button>
        </form>

        {/* Inline Error Panel */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => (query.trim() ? handleSearch() : loadRecent())}
              className="shrink-0 px-3 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw size={12} />
              <span>Thử lại</span>
            </button>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          {query.trim()
            ? `KẾT QUẢ TÌM KIẾM (${results.length})`
            : `BIÊN BẢN HỌP & LỜI THOẠI GẦN ĐÂY (${results.length})`}
        </h3>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs h-32 animate-pulse space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-4/5" />
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-28" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && results.length === 0 && (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                Chưa có transcript phù hợp
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {query.trim()
                  ? 'Không tìm thấy kết quả nào khớp với từ khóa tìm kiếm của bạn.'
                  : 'Chưa có dữ liệu biên bản họp hoặc transcript nào được chỉ mục.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                loadRecent();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw size={12} />
              <span>Làm mới danh sách</span>
            </button>
          </div>
        )}

        {/* Success List */}
        {!isLoading && results.length > 0 && (
          <div className="space-y-3">
            {results.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 truncate">
                    {item.title}
                  </span>
                  <span className="text-[10.5px] text-slate-400 shrink-0 font-mono">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {item.speaker_name && (
                    <strong className="text-slate-900 dark:text-white">{item.speaker_name}: </strong>
                  )}
                  &ldquo;{item.snippet}&rdquo;
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="truncate max-w-[60%]">
                    Nguồn: <strong className="text-slate-600 dark:text-slate-400">{item.source}</strong>
                  </span>
                  {item.meeting_id && (
                    <Link
                      href={`/meetings/${item.meeting_id}`}
                      className="text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Xem chi tiết cuộc họp</span>
                      <ChevronRight size={12} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
