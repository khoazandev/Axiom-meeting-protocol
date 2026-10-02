'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { UserResume } from '@/lib/recruitment-api';
import { CVData } from '@/types/cv';
import { CVTemplateRenderer } from '@/components/cv/CVTemplateRenderer';

export interface CandidateResumeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: UserResume | null;
  candidateName?: string | null;
  jobTitle?: string | null;
}

export function CandidateResumeViewerModal({
  isOpen,
  onClose,
  resume,
  candidateName,
  jobTitle,
}: CandidateResumeViewerModalProps) {
  const [zoomScale, setZoomScale] = useState(0.85);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w < 640) setZoomScale(0.42);
      else if (w < 1024) setZoomScale(0.68);
      else setZoomScale(0.85);
    }
  }, [isOpen]);

  // Handle ESC key to dismiss modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const pdfInfo = useMemo<{ fileName: string; dataUrl: string; formattedSize?: string } | null>(() => {
    if (resume?.file_url && (resume.file_url.startsWith('http') || resume.file_url.startsWith('data:') || resume.file_url.startsWith('/'))) {
      return {
        fileName: resume.title || 'CV.pdf',
        dataUrl: resume.file_url,
      };
    }
    if (!resume?.cv_data_json) return null;
    try {
      const parsed = JSON.parse(resume.cv_data_json);
      if (parsed.pdf_data_url || parsed.dataUrl || resume.template_id === 'pdf-upload' || resume.template_id === 'pdf') {
        return {
          fileName: parsed.fileName || resume.title,
          dataUrl: parsed.pdf_data_url || parsed.dataUrl || resume.file_url,
          formattedSize: parsed.formattedSize,
        };
      }
    } catch {
      // not a json or pdf
    }
    return null;
  }, [resume]);

  const parsedCvData = useMemo<CVData | null>(() => {
    if (pdfInfo) return null;
    if (!resume?.cv_data_json) return null;
    try {
      const parsed = JSON.parse(resume.cv_data_json);
      if (!parsed || typeof parsed !== 'object') return null;

      // Safe normalization ensuring no sub-template crashes on undefined fields
      const normalized: CVData = {
        id: parsed.id || resume.id,
        title: parsed.title || resume.title,
        templateId: parsed.templateId || (resume.template_id && resume.template_id !== 'standard' ? (resume.template_id as any) : 'harvard'),
        personalInfo: {
          fullName: parsed.personalInfo?.fullName || parsed.personal_info?.full_name || candidateName || 'Ứng viên',
          title: parsed.personalInfo?.title || parsed.personal_info?.title || jobTitle || '',
          email: parsed.personalInfo?.email || parsed.personal_info?.email || '',
          phone: parsed.personalInfo?.phone || parsed.personal_info?.phone || '',
          location: parsed.personalInfo?.location || parsed.personal_info?.location || '',
          avatarUrl: parsed.personalInfo?.avatarUrl || parsed.personal_info?.avatar_url,
          socials: Array.isArray(parsed.personalInfo?.socials) ? parsed.personalInfo.socials : [],
        },
        summary: parsed.summary || parsed.personal_info?.summary || parsed.personalInfo?.summary || '',
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        languages: Array.isArray(parsed.languages) ? parsed.languages : [],
        awards: Array.isArray(parsed.awards) ? parsed.awards : [],
        customBlocks: Array.isArray(parsed.customBlocks) ? parsed.customBlocks : [],
        sectionOrder: Array.isArray(parsed.sectionOrder)
          ? parsed.sectionOrder
          : ['personal', 'summary', 'experience', 'education', 'skills', 'projects'],
      };
      return normalized;
    } catch (err) {
      console.error('Failed to parse cv_data_json', err);
      return null;
    }
  }, [resume?.cv_data_json, resume?.template_id, pdfInfo, candidateName, jobTitle]);

  if (!isOpen || !resume) return null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-5xl h-[94vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Clean, Focused Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs border border-blue-200/50 dark:border-blue-800/50">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate max-w-md" title={resume.title}>
                  {resume.title}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase shrink-0">
                  {pdfInfo ? 'File PDF' : `Mẫu ${resume.template_id}`}
                </span>
                {resume.ats_score ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    ★ ATS {resume.ats_score}%
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Ứng viên: <strong className="text-slate-700 dark:text-slate-200">{candidateName || 'Ứng viên'}</strong>
                {jobTitle ? ` • Ứng tuyển: ${jobTitle}` : ''}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom controls for interactive Canva CV */}
            {!pdfInfo && parsedCvData && (
              <div className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 w-11 text-center select-none">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(2))))}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(0.85)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 cursor-pointer transition-colors"
                  title="Khôi phục kích thước chuẩn vừa màn hình"
                >
                  <RotateCcw className="w-3 h-3 inline mr-0.5" />
                  Chuẩn
                </button>
              </div>
            )}

            {/* PDF Direct Download */}
            {pdfInfo?.dataUrl && (
              <a
                href={pdfInfo.dataUrl}
                download={pdfInfo.fileName || 'CV.pdf'}
                className="shrink-0 w-28 h-9 py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate shadow-xs"
                title="Tải file PDF gốc về máy"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Tải PDF</span>
              </a>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="shrink-0 w-24 h-9 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
              title="In bản CV này"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">In CV</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ xem CV"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pure CV Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950 flex flex-col items-center justify-start">
          {pdfInfo?.dataUrl ? (
            /* Native PDF embed filling viewport */
            <div className="w-full h-full flex flex-col items-center">
              <iframe
                src={pdfInfo.dataUrl}
                className="w-full h-full min-h-[76vh] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl bg-white"
                title={pdfInfo.fileName || 'Bản CV'}
              />
            </div>
          ) : parsedCvData ? (
            /* Pure Visual A4 Document */
            <div className="w-full flex flex-col items-center justify-start pb-10">
              <div
                style={{
                  width: `${794 * zoomScale}px`,
                  height: `${1123 * zoomScale}px`,
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}
                className="relative shrink-0 shadow-2xl rounded-sm ring-1 ring-slate-200/80 bg-white"
              >
                <div
                  style={{
                    width: '794px',
                    height: '1123px',
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top left',
                    transition: 'transform 0.15s ease-out',
                  }}
                >
                  <CVTemplateRenderer data={parsedCvData} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-1" />
              <p className="text-xs font-semibold">Không tìm thấy nội dung bản vẽ CV hoặc dữ liệu không hợp lệ.</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90"
              >
                Đóng cửa sổ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
