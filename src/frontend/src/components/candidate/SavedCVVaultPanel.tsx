'use client';

import React, { useState, useMemo } from 'react';
import {
  FolderCheck,
  Plus,
  UploadCloud,
  Eye,
  Edit3,
  Star,
  Briefcase,
  Printer,
  Trash2,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
} from 'lucide-react';
import { UserResume, candidatePortalApi } from '@/lib/recruitment-api';
import { CVTemplateRenderer } from '@/components/cv/CVTemplateRenderer';
import { CVData, CVTemplateId } from '@/types/cv';
import { PDFResumeUploader } from '@/components/cv/PDFResumeUploader';

interface SavedCVVaultPanelProps {
  savedResumes: UserResume[];
  isLoading?: boolean;
  onRefresh: () => void;
  onEditInStudio: (resume: UserResume) => void;
  onApplyWithResume: (resume: UserResume) => void;
  onCreateNewInStudio: () => void;
}

export function SavedCVVaultPanel({
  savedResumes,
  isLoading,
  onRefresh,
  onEditInStudio,
  onApplyWithResume,
  onCreateNewInStudio,
}: SavedCVVaultPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [templateFilter, setTemplateFilter] = useState('ALL');
  const [viewingResume, setViewingResume] = useState<UserResume | null>(null);
  const [previewZoom, setPreviewZoom] = useState(0.85);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to parse CV JSON data safely
  const parseCVData = (jsonStr: string): CVData | null => {
    try {
      return JSON.parse(jsonStr) as CVData;
    } catch {
      return null;
    }
  };

  // Set primary CV
  const handleSetPrimary = async (resume: UserResume) => {
    setSettingPrimaryId(resume.id);
    try {
      await candidatePortalApi.updateResume(resume.id, {
        is_primary: true,
      });
      showToast(`Đã đặt "${resume.title}" làm bản CV chính.`);
      onRefresh();
    } catch {
      showToast('Không thể cập nhật bản CV chính.');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  // Delete CV
  const handleDeleteResume = async (resume: UserResume) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản CV "${resume.title}" khỏi kho lưu trữ?`)) {
      return;
    }
    setDeletingId(resume.id);
    try {
      await candidatePortalApi.deleteResume(resume.id);
      showToast(`Đã xóa bản CV "${resume.title}".`);
      onRefresh();
    } catch {
      showToast('Không thể xóa bản CV.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered resumes
  const filteredResumes = useMemo(() => {
    return savedResumes.filter((r) => {
      const isPdfResume =
        r.template_id === 'pdf' ||
        r.template_id === 'pdf-upload' ||
        r.template_id?.startsWith('pdf');
      const matchesSearch =
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.template_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (isPdfResume && searchTerm.toLowerCase().includes('pdf'));
      const matchesTemplate =
        templateFilter === 'ALL' ||
        (templateFilter === 'pdf' ? isPdfResume : r.template_id === templateFilter);
      return matchesSearch && matchesTemplate;
    });
  }, [savedResumes, searchTerm, templateFilter]);

  // Stats calculation
  const highestAtsScore = useMemo(() => {
    const scores = savedResumes.map((r) => r.ats_score).filter((s): s is number => typeof s === 'number');
    return scores.length > 0 ? Math.max(...scores) : 0;
  }, [savedResumes]);

  const primaryCV = useMemo(() => {
    return savedResumes.find((r) => r.is_primary) || (savedResumes.length > 0 ? savedResumes[0] : null);
  }, [savedResumes]);

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 dark:border-slate-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Metrics Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="px-4 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <div className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Tổng CV Đã Lưu
            </div>
            <div className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">
              {savedResumes.length} <span className="text-xs font-medium text-neutral-400">bản</span>
            </div>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Điểm ATS Cao Nhất
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
              {highestAtsScore > 0 ? `${highestAtsScore}/100` : '—'}
            </div>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              CV Chính Hoạt Động
            </div>
            <div className="text-xs font-bold text-indigo-800 dark:text-indigo-200 mt-1 truncate max-w-[130px]" title={primaryCV?.title || 'Chưa thiết lập'}>
              {primaryCV?.title || 'Chưa thiết lập'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="shrink-0 w-44 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
            title="Tải lên file CV định dạng PDF đã có sẵn từ máy tính"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">Tải Lên File PDF</span>
          </button>

          <button
            type="button"
            onClick={onCreateNewInStudio}
            className="shrink-0 w-44 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
            title="Mở Canva CV Studio để thiết kế bản CV mới"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tạo CV Mới (Studio)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề CV hoặc mẫu..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Template Selector with fixed width */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'harvard', 'modern', 'executive', 'pdf'].map((tpl) => (
            <button
              key={tpl}
              type="button"
              onClick={() => setTemplateFilter(tpl)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                templateFilter === tpl
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {tpl === 'ALL'
                ? 'Tất cả mẫu'
                : tpl === 'pdf'
                ? 'File PDF'
                : tpl.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Resumes Showcase Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="text-xs font-semibold text-neutral-500">Đang tải kho CV cá nhân...</div>
        </div>
      ) : filteredResumes.length === 0 ? (
        <div className="py-16 px-4 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-4 bg-white/40 dark:bg-neutral-900/40">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <FolderCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {searchTerm ? 'Không tìm thấy bản CV phù hợp' : 'Kho CV của bạn chưa có bản lưu nào'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
              {searchTerm
                ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.'
                : 'Bạn có thể thiết kế CV mới trên Canva Studio hoặc tải lên file PDF đã có sẵn từ máy tính.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCreateNewInStudio}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold transition-all cursor-pointer"
            >
              Thiết Kế CV Ngay
            </button>
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all cursor-pointer"
            >
              Tải Lên File PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResumes.map((resume) => {
            const parsedData = parseCVData(resume.cv_data_json);
            const pdfUrl =
              (parsedData as any)?.pdf_data_url ||
              (parsedData as any)?.dataUrl ||
              (resume as any).file_url;
            const isPdf =
              resume.template_id === 'pdf' ||
              resume.template_id === 'pdf-upload' ||
              resume.template_id?.startsWith('pdf') ||
              (resume as any).file_type === 'application/pdf' ||
              Boolean(pdfUrl || (parsedData as any)?.source === 'PDF_UPLOAD');

            const candFullName =
              parsedData?.personalInfo?.fullName ||
              (parsedData as any)?.fullName ||
              (parsedData as any)?.name ||
              (parsedData as any)?.fileName?.replace(/\.[^/.]+$/, '') ||
              resume.title;
            const candTitle =
              parsedData?.personalInfo?.title ||
              (parsedData as any)?.title ||
              'Chuyên viên chuyên môn';
            const candEmail =
              parsedData?.personalInfo?.email ||
              (parsedData as any)?.email ||
              '';
            const candPhone =
              parsedData?.personalInfo?.phone ||
              (parsedData as any)?.phone ||
              '';
            const candSummary =
              parsedData?.summary ||
              (parsedData?.personalInfo as any)?.summary ||
              (parsedData as any)?.extractedText ||
              '';
            const candSkills: string[] = Array.isArray(parsedData?.skills)
              ? parsedData.skills.map((s: any) => typeof s === 'string' ? s : s?.name || '').filter(Boolean)
              : [];

            return (
              <div
                key={resume.id}
                className="group relative bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* 1. Real Header Section of the CV ("Hiển thị phần đầu của CV") */}
                <div
                  onClick={() => {
                    setViewingResume(resume);
                    setPreviewZoom(0.85);
                  }}
                  className="relative h-64 bg-neutral-100/90 dark:bg-neutral-950/80 border-b border-neutral-200/70 dark:border-neutral-800/80 p-3 overflow-hidden cursor-pointer select-none group"
                  title="Nhấp để xem toàn bộ bản CV ở kích thước chuẩn"
                >
                  {isPdf && pdfUrl ? (
                    <div className="w-full h-full relative rounded-2xl overflow-hidden bg-white shadow-xs border border-neutral-200 dark:border-neutral-800">
                      <iframe
                        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        className="w-[200%] h-[200%] pointer-events-none transform scale-50 origin-top-left border-0 bg-white"
                        tabIndex={-1}
                        title={resume.title}
                      />
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600/95 text-white font-mono text-[9px] font-bold shadow-xs">
                        <FileText className="w-3 h-3" />
                        <span>PDF DOCUMENT</span>
                      </div>
                    </div>
                  ) : (
                    /* Real CV Document Top Section Preview */
                    <div className="w-full h-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col overflow-hidden text-left transform group-hover:scale-[1.02] transition-transform duration-200">
                      {/* Top Accent Stripe based on template */}
                      <div className={`h-2.5 w-full shrink-0 ${
                        resume.template_id === 'harvard' ? 'bg-amber-800' :
                        resume.template_id === 'aesthetic' ? 'bg-purple-600' :
                        resume.template_id === 'banking' ? 'bg-emerald-700' :
                        resume.template_id === 'minimalist' ? 'bg-neutral-800 dark:bg-neutral-200' :
                        'bg-blue-600'
                      }`} />

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5 overflow-hidden">
                        <div>
                          {/* Candidate Identity Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/50">
                                {(candFullName.charAt(0) || 'U').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-xs text-neutral-900 dark:text-white truncate" title={candFullName}>
                                  {candFullName}
                                </h5>
                                <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                                  {candTitle}
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0 uppercase">
                              {resume.template_id}
                            </span>
                          </div>

                          {/* Contact Strip */}
                          {(candEmail || candPhone) && (
                            <div className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400 truncate pt-1.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                              {candEmail && <span className="truncate">{candEmail}</span>}
                              {candPhone && <span>• {candPhone}</span>}
                            </div>
                          )}

                          {/* Summary Excerpt */}
                          {candSummary && (
                            <p className="mt-2 text-[10.5px] text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed italic bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800">
                              &ldquo;{candSummary}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Top Skills Preview Chips */}
                        {candSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                            {candSkills.slice(0, 3).map((skill: string, sIdx: number) => (
                              <span
                                key={sIdx}
                                className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50"
                              >
                                {skill}
                              </span>
                            ))}
                            {candSkills.length > 3 && (
                              <span className="text-[9px] text-neutral-400 self-center">
                                +{candSkills.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hover Overlay Button */}
                  <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px] rounded-b-3xl">
                    <span className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem Toàn Bộ CV</span>
                    </span>
                  </div>
                </div>

                {/* 2. Metadata & Badges */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Top Pill Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {resume.is_primary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>CV Chính</span>
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold border border-neutral-200 dark:border-neutral-700">
                          {resume.template_id.toUpperCase()}
                        </span>
                      </div>

                      {/* ATS Score Indicator */}
                      {typeof resume.ats_score === 'number' && (
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            resume.ats_score >= 80
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                              : resume.ats_score >= 65
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                          }`}
                          title={`Điểm ATS thẩm định: ${resume.ats_score}/100`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>ATS {resume.ats_score}%</span>
                        </div>
                      )}
                    </div>

                    {/* Title & Date */}
                    <h4
                      className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer"
                      onClick={() => setViewingResume(resume)}
                      title={resume.title}
                    >
                      {resume.title}
                    </h4>
                    <p className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>Cập nhật: {new Date(resume.updated_at).toLocaleDateString('vi-VN')}</span>
                    </p>
                  </div>

                  {/* 3. Action Buttons with fixed dimensions */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Edit in Studio or View PDF Button */}
                      {isPdf ? (
                        <button
                          type="button"
                          onClick={() => setViewingResume(resume)}
                          className="w-full py-2 px-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
                          title="Xem bản CV dạng file PDF"
                        >
                          <Eye className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="truncate">Xem File PDF</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEditInStudio(resume)}
                          className="w-full py-2 px-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
                          title="Mở bản CV này trong Studio để chỉnh sửa"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="truncate">Sửa Trong Studio</span>
                        </button>
                      )}

                      {/* Apply Directly Button */}
                      <button
                        type="button"
                        onClick={() => onApplyWithResume(resume)}
                        className="w-full py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer truncate"
                        title="Dùng bản CV này để ứng tuyển ngay vào doanh nghiệp"
                      >
                        <Briefcase className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Nộp Ứng Tuyển</span>
                      </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      {/* Set Primary Button */}
                      {!resume.is_primary ? (
                        <button
                          type="button"
                          disabled={settingPrimaryId === resume.id}
                          onClick={() => handleSetPrimary(resume)}
                          className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          title="Đặt bản CV này làm hồ sơ chính khi nộp đơn nhanh"
                        >
                          <Star className="w-3 h-3 text-neutral-400" />
                          <span>Đặt làm CV chính</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>CV chính mặc định</span>
                        </span>
                      )}

                      {/* Delete CV Button */}
                      <button
                        type="button"
                        disabled={deletingId === resume.id}
                        onClick={() => handleDeleteResume(resume)}
                        className="text-[10px] font-bold text-neutral-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors p-1"
                        title="Xóa bản CV này khỏi kho"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: VISUAL CV PREVIEWER ("Xem trực quan từ bên ngoài") ── */}
      {/* ── MODAL: VISUAL CV PREVIEWER ("Xem trực quan từ bên ngoài") ── */}
      {viewingResume && (() => {
        const viewingParsed = parseCVData(viewingResume.cv_data_json);
        const isViewingPdf = Boolean(
          viewingResume.template_id === 'pdf' ||
          viewingResume.template_id === 'pdf-upload' ||
          viewingResume.template_id?.startsWith('pdf') ||
          (viewingResume as any).file_type === 'application/pdf' ||
          Boolean((viewingParsed as any)?.pdf_data_url || (viewingParsed as any)?.source === 'PDF_UPLOAD')
        );
        const viewingPdfUrl =
          (viewingParsed as any)?.pdf_data_url ||
          (viewingParsed as any)?.dataUrl ||
          (viewingResume as any).file_url;
        const hasValidViewingPersonalInfo = Boolean(
          !isViewingPdf &&
          viewingParsed &&
          viewingParsed.personalInfo &&
          typeof viewingParsed.personalInfo === 'object'
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl h-[92vh] max-h-[92vh] bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/50 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs border border-blue-200/50 dark:border-blue-800/50 font-bold">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-md" title={viewingResume.title}>
                        {viewingResume.title}
                      </h3>
                      {viewingResume.is_primary && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300">
                          CV Chính
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase shrink-0">
                        {isViewingPdf ? 'File PDF' : `Mẫu ${viewingResume.template_id}`}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                      Cập nhật: {new Date(viewingResume.updated_at).toLocaleDateString('vi-VN')}
                      {viewingResume.ats_score ? ` • Điểm ATS: ${viewingResume.ats_score}%` : ''}
                    </p>
                  </div>
                </div>

                {/* Actions on Preview Modal */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* Zoom controls for template */}
                  {!isViewingPdf && hasValidViewingPersonalInfo && viewingParsed && (
                    <div className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-2 py-1 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPreviewZoom((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                        className="w-6 h-6 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 flex items-center justify-center text-neutral-700 dark:text-neutral-200 cursor-pointer"
                        title="Thu nhỏ"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-[11px] font-bold text-neutral-700 dark:text-neutral-200 w-11 text-center select-none">
                        {Math.round(previewZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewZoom((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(2))))}
                        className="w-6 h-6 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 flex items-center justify-center text-neutral-700 dark:text-neutral-200 cursor-pointer"
                        title="Phóng to"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewZoom(0.85)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 cursor-pointer"
                        title="Khôi phục kích thước chuẩn"
                      >
                        <RotateCcw className="w-3 h-3 inline mr-0.5" />
                        Chuẩn
                      </button>
                    </div>
                  )}

                  {!isViewingPdf && (
                    <button
                      type="button"
                      onClick={() => {
                        const r = viewingResume;
                        setViewingResume(null);
                        onEditInStudio(r);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Chỉnh Sửa trong Studio</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const r = viewingResume;
                      setViewingResume(null);
                      onApplyWithResume(r);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Ứng Tuyển</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingResume(null)}
                    aria-label="Đóng"
                    className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Anti-overflow Scaled CV Artboard */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex flex-col items-center justify-start bg-neutral-100/70 dark:bg-neutral-950/80">
                {isViewingPdf ? (
                  <div className="w-full h-full flex flex-col items-center gap-3">
                    {viewingPdfUrl && (
                      <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs shadow-2xs shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-white truncate max-w-sm">
                            {viewingResume.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={viewingPdfUrl}
                            download={`${viewingResume.title}.pdf`}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải PDF</span>
                          </a>
                          <a
                            href={viewingPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Mở Tab Mới</span>
                          </a>
                        </div>
                      </div>
                    )}
                    {viewingPdfUrl ? (
                      <iframe
                        src={viewingPdfUrl}
                        className="w-full h-full min-h-[72vh] rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white shadow-xl"
                        title={viewingResume.title}
                      />
                    ) : (
                      <div className="py-16 text-center text-xs text-neutral-400">
                        Không tìm thấy tệp PDF để hiển thị.
                      </div>
                    )}
                  </div>
                ) : hasValidViewingPersonalInfo && viewingParsed ? (
                  <div className="w-full flex flex-col items-center justify-start pb-10">
                    <div
                      style={{
                        width: `${794 * previewZoom}px`,
                        height: `${1123 * previewZoom}px`,
                        maxWidth: '100%',
                      }}
                      className="relative overflow-hidden shadow-2xl rounded-sm ring-1 ring-neutral-300 bg-white"
                    >
                      <div
                        style={{
                          width: '794px',
                          height: '1123px',
                          transform: `scale(${previewZoom})`,
                          transformOrigin: 'top left',
                        }}
                      >
                        <CVTemplateRenderer
                          data={viewingParsed}
                          onUpdate={() => {}}
                          selectedElementId={null}
                          onSelectElement={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-xs text-neutral-400 flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-neutral-300 dark:text-neutral-700" />
                    <span>Không thể phân tích dữ liệu CV hoặc định dạng không được hỗ trợ.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: UPLOAD FILE PDF TRỰC TIẾP ── */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Tải Lên Bản CV Định Dạng PDF
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    File PDF sẽ được lưu an toàn vào Kho CV Cá Nhân để xem trước và nộp đơn trực tiếp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PDFResumeUploader
              onUploadSuccess={(savedRes) => {
                onRefresh();
                showToast(`Đã lưu bản CV PDF "${savedRes.title}" vào Kho thành công!`);
                setIsPdfModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
