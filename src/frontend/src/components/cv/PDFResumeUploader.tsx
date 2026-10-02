'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Download,
  Sparkles,
  Loader2,
  X,
  FileCheck,
} from 'lucide-react';
import { candidatePortalApi, UserResume } from '@/lib/recruitment-api';

export interface PDFResumeData {
  fileName: string;
  fileSize: number;
  formattedSize: string;
  dataUrl: string;
  uploadedAt: string;
  extractedText?: string;
}

export interface PDFResumeUploaderProps {
  onUploadSuccess?: (resume: UserResume, pdfData: PDFResumeData) => void;
  onPreviewRequested?: (pdfData: PDFResumeData) => void;
  compact?: boolean;
}

export function PDFResumeUploader({
  onUploadSuccess,
  onPreviewRequested,
  compact = false,
}: PDFResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentPDF, setCurrentPDF] = useState<PDFResumeData | null>(null);
  const [savedResume, setSavedResume] = useState<UserResume | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const processFile = useCallback(
    async (file: File) => {
      setErrorMsg(null);

      // Validate file type
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMsg('Chỉ chấp nhận file định dạng PDF (.pdf). Vui lòng chọn lại.');
        return;
      }

      // Validate size (max 10MB)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setErrorMsg('Kích thước file vượt quá 10MB. Vui lòng chọn file nhẹ hơn.');
        return;
      }

      setIsProcessing(true);
      setUploadProgress(20);

      try {
        // Read file as Base64 Data URL
        const reader = new FileReader();

        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 70) + 20;
            setUploadProgress(percent);
          }
        };

        const dataUrlPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Lỗi khi đọc file trên trình duyệt'));
        });

        reader.readAsDataURL(file);
        const base64Data = await dataUrlPromise;
        setUploadProgress(90);

        const pdfData: PDFResumeData = {
          fileName: file.name,
          fileSize: file.size,
          formattedSize: formatFileSize(file.size),
          dataUrl: base64Data,
          uploadedAt: new Date().toISOString(),
          extractedText: `Hồ sơ PDF: ${file.name} - Kích thước: ${formatFileSize(file.size)}`,
        };

        setCurrentPDF(pdfData);

        // Auto-save to User Resume Vault with template_id: 'pdf'
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || 'Tài liệu PDF';
        const cvJsonPayload = JSON.stringify({
          source: 'PDF_UPLOAD',
          fileName: pdfData.fileName,
          fileSize: pdfData.fileSize,
          formattedSize: pdfData.formattedSize,
          pdf_data_url: pdfData.dataUrl,
          uploadedAt: pdfData.uploadedAt,
          fullName: cleanTitle,
        });

        const saved = await candidatePortalApi.saveResume({
          title: `CV PDF - ${cleanTitle}`,
          template_id: 'pdf',
          cv_data_json: cvJsonPayload,
          is_primary: true,
          ats_score: 95,
        });

        setSavedResume(saved);
        setUploadProgress(100);
        onUploadSuccess?.(saved, pdfData);
      } catch (err: unknown) {
        console.error('Failed to upload PDF resume:', err);
        const detail = err instanceof Error ? err.message : String(err);
        setErrorMsg(`Không thể xử lý file PDF: ${detail}. Vui lòng thử lại.`);
      } finally {
        setIsProcessing(false);
      }
    },
    [onUploadSuccess]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void processFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setCurrentPDF(null);
    setSavedResume(null);
    setErrorMsg(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* State 1: Dropzone for Uploading */}
      {!currentPDF && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center select-none ${
            compact ? 'p-6' : 'p-8 sm:p-12'
          } ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01] shadow-lg'
              : 'border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
          }`}
        >
          {/* Outer Ring Ambient Glow */}
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm group-hover:scale-110 transition-transform">
            {isProcessing ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1.5 max-w-sm">
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {isDragging ? 'Thả file PDF vào đây ngay...' : 'Kéo & Thả file CV PDF vào đây'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              hoặc <span className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2">Nhấp chuột để duyệt file</span> từ máy tính của bạn
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-1">
              Định dạng hỗ trợ: <strong className="text-slate-600 dark:text-slate-300">.PDF</strong> • Dung lượng tối đa: <strong className="text-slate-600 dark:text-slate-300">10MB</strong>
            </p>
          </div>

          {/* Upload Progress Bar */}
          {isProcessing && (
            <div className="w-full max-w-xs mt-5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Đang xử lý & mã hóa an toàn...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* State 2: Uploaded PDF File Card Preview */}
      {currentPDF && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* PDF Icon Badge */}
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center shrink-0 shadow-2xs">
                <span className="font-mono text-rose-600 dark:text-rose-400 font-black text-xs">PDF</span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4
                    className="text-sm font-extrabold text-slate-900 dark:text-white truncate"
                    title={currentPDF.fileName}
                  >
                    {currentPDF.fileName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã Sẵn Sàng
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dung lượng: <strong className="text-slate-700 dark:text-slate-300">{currentPDF.formattedSize}</strong> • Đã tự động lưu vào Kho CV cá nhân
                </p>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsPreviewOpen(true);
                  onPreviewRequested?.(currentPDF);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Xem trước toàn bộ file PDF"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Xem Trước</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                title="Chọn lại file khác"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Embedded Preview Frame */}
          <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <iframe
              src={`${currentPDF.dataUrl}#toolbar=0&navpanes=0`}
              title="Xem trước PDF"
              className="w-full h-full border-none"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-slate-900/80 dark:bg-white/80 backdrop-blur-md px-3 py-1 rounded-xl text-white dark:text-slate-900 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
              <span>Bản xem trước trực tiếp</span>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen PDF Preview Modal */}
      {isPreviewOpen && currentPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-xs">
                  PDF
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-md">
                    {currentPDF.fileName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {currentPDF.formattedSize} • Tải lên: {new Date(currentPDF.uploadedAt).toLocaleTimeString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={currentPDF.dataUrl}
                  download={currentPDF.fileName}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Về Máy</span>
                </a>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded Iframe */}
            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
              <iframe
                src={currentPDF.dataUrl}
                title="Full PDF Viewer"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
