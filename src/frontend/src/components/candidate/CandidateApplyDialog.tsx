'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Check,
  Send,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  Building2,
  Phone,
  Sparkles,
  PenLine,
  ShieldCheck,
  Globe,
  Award,
  Calendar,
  UploadCloud,
} from 'lucide-react';
import { PublicJobOpening, UserResume, CandidateApplication } from '@/lib/recruitment-api';
import { PDFResumeUploader } from '@/components/cv/PDFResumeUploader';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { CompanyLogo } from '@/lib/companyLogos';

export interface ApplyFormData {
  sourceType: 'vault' | 'pdf' | 'custom';
  resumeId?: string;
  cvUrl?: string;
  cvText?: string;
  phone?: string;
  coverLetter?: string;
}

export interface CandidateApplyDialogProps {
  isOpen: boolean;
  opening: PublicJobOpening | null;
  savedResumes: UserResume[];
  isSubmitting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  initialPhone?: string;
  initialResumeId?: string;
  allOpenings?: PublicJobOpening[];
  onSelectOpening?: (opening: PublicJobOpening) => void;
  onRefreshResumes?: () => Promise<void> | void;
  onClose: () => void;
  onSubmit: (data: ApplyFormData) => Promise<void>;
  onNavigateToCVStudio?: () => void;
  applications?: CandidateApplication[];
}

type ApplyStep = 1 | 2 | 3;

export function CandidateApplyDialog({
  isOpen,
  opening,
  savedResumes,
  isSubmitting,
  errorMessage,
  successMessage,
  initialPhone = '',
  initialResumeId,
  allOpenings,
  onSelectOpening,
  onRefreshResumes,
  onClose,
  onSubmit,
  onNavigateToCVStudio,
  applications,
}: CandidateApplyDialogProps) {
  const { t } = useLanguageStore();
  const [currentStep, setCurrentStep] = useState<ApplyStep>(1);
  const [sourceType, setSourceType] = useState<'vault' | 'pdf' | 'custom'>('vault');
  const [userSelectedResumeId, setUserSelectedResumeId] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setUserSelectedResumeId(initialResumeId || null);
      setValidationError(null);
      if (initialPhone) {
        setUserPhone(initialPhone);
      }
      if (onRefreshResumes) {
        void onRefreshResumes();
      }
    }
  }, [isOpen, initialResumeId, initialPhone, onRefreshResumes]);

  const activeOpening = opening || (allOpenings && allOpenings.length > 0 ? allOpenings[0] : null);

  const defaultResumeId =
    initialResumeId || savedResumes.find((r) => r.is_primary)?.id || savedResumes[0]?.id || '';
  const selectedResumeId = userSelectedResumeId ?? defaultResumeId;
  const phone = userPhone ?? initialPhone;

  // Typewriter state & animation for extracting CV into Cover Letter
  const [isTypingCoverLetter, setIsTypingCoverLetter] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  if (!isOpen || !activeOpening) return null;

  const chosenResume = savedResumes.find((r) => r.id === selectedResumeId);

  const handleExtractFromCV = () => {
    if (isTypingCoverLetter) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setIsTypingCoverLetter(false);
      return;
    }

    const companyName = activeOpening?.organization_name || 'Quý công ty';
    const positionName = activeOpening?.title || 'Frontend Developer';

    const fullText = `Kính gửi Ban Tuyển dụng ${companyName},\n\nEm là Trần Tấn Đạt, hiện là sinh viên năm 4 chuyên ngành Công nghệ Thông tin với định hướng phát triển chuyên sâu về Frontend Developer (React, Next.js, TypeScript, Tailwind CSS).\n\nTrong suốt quá trình học tập và làm việc, em đã chủ động tham gia xây dựng nhiều dự án thực tế, tích lũy kinh nghiệm vững chắc về tư duy component tái sử dụng, tối ưu hiệu năng UI/UX và tích hợp hệ thống WebSockets/REST API realtime cho vị trí ${positionName}. Em luôn đề cao tinh thần tự học, thái độ cầu tiến, tính cẩn trọng và trách nhiệm trong từng dòng code.\n\nEm rất mong muốn có cơ hội được thực tập và cống hiến tại công ty để phát huy năng lực, đồng thời không ngừng hoàn thiện kỹ năng chuyên môn.\n\nEm xin chân thành cảm ơn!\nTrần Tấn Đạt`;

    setCoverLetter('');
    setIsTypingCoverLetter(true);

    let currentIndex = 0;
    const typeStep = () => {
      if (currentIndex < fullText.length) {
        currentIndex += 1;
        setCoverLetter(fullText.substring(0, currentIndex));

        const char = fullText[currentIndex - 1];
        let delay = 11;
        if (char === '\n') delay = 50;
        else if (char === '.' || char === '!') delay = 65;
        else if (char === ',') delay = 30;

        typingTimerRef.current = setTimeout(typeStep, delay);
      } else {
        setCoverLetter(fullText);
        setIsTypingCoverLetter(false);
      }
    };

    typingTimerRef.current = setTimeout(typeStep, 50);
  };

  const handleNextStep = () => {
    setValidationError(null);
    if (currentStep === 1) {
      if (sourceType === 'vault' && (!selectedResumeId || savedResumes.length === 0)) {
        setValidationError('Vui lòng chọn hoặc tạo ít nhất một bản CV trước khi tiếp tục.');
        return;
      }
      if (sourceType === 'pdf' && !selectedResumeId) {
        setValidationError('Vui lòng kéo thả hoặc chọn tải lên file PDF trước khi tiếp tục.');
        return;
      }
      if (sourceType === 'custom' && (!cvUrl.trim() || !cvUrl.includes('.'))) {
        setValidationError('Vui lòng nhập đường dẫn liên kết CV hợp lệ (Google Drive, LinkedIn...).');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!phone.trim() || phone.trim().length < 9) {
        setValidationError('Vui lòng nhập số điện thoại liên lạc hợp lệ (ít nhất 9 chữ số).');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as ApplyStep);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (currentStep < 3) {
      handleNextStep();
      return;
    }

    if (!isConfirmed) {
      setValidationError('Vui lòng xác nhận cam kết tính chính xác của hồ sơ ứng tuyển.');
      return;
    }

    await onSubmit({
      sourceType,
      resumeId: (sourceType === 'vault' || sourceType === 'pdf') ? selectedResumeId || undefined : undefined,
      cvUrl:
        sourceType === 'custom'
          ? cvUrl.trim() || undefined
          : chosenResume
            ? `resume://${chosenResume.id}`
            : undefined,
      cvText: sourceType === 'custom' ? undefined : chosenResume?.cv_data_json,
      phone: phone.trim() || undefined,
      coverLetter: coverLetter.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header & Opening Overview */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                {t.candidate.applyModalTitle}
              </span>
              {activeOpening.requires_assessment && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  Bài Test Đánh Giá
                </span>
              )}
            </div>

            {allOpenings && allOpenings.length > 1 ? (
              <div className="pt-1">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  Vị trí công ty ứng tuyển:
                </label>
                <select
                  value={activeOpening.id}
                  onChange={(e) => {
                    const chosen = allOpenings.find((o) => o.id === e.target.value);
                    if (chosen && onSelectOpening) onSelectOpening(chosen);
                  }}
                  className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {allOpenings.map((op) => {
                    const optApp = applications?.find((a) => a.opening_id === op.id);
                    const optRej = optApp ? ['REJECTED', 'WITHDRAWN', 'CANCELLED', 'EXPIRED'].includes(optApp.stage) : false;
                    return (
                      <option key={op.id} value={op.id} disabled={optRej}>
                        {op.title} — {op.organization_name} ({op.department_name}){optRej ? ' [Đã dừng tuyển - Không thể nộp lại]' : optApp ? ' [Đã nộp]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CompanyLogo orgName={activeOpening.organization_name} size={42} />
                <div className="min-w-0">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {activeOpening.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeOpening.organization_name}
                    </span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400">{activeOpening.department_name}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rejection Warning Banner */}
        {(() => {
          const currentApp = applications?.find((a) => a.opening_id === activeOpening.id);
          const isCurrentRej = currentApp ? ['REJECTED', 'WITHDRAWN', 'CANCELLED', 'EXPIRED'].includes(currentApp.stage) : false;
          if (!isCurrentRej) return null;
          return (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <strong className="block font-bold">Không thể nộp lại hồ sơ cho vị trí này</strong>
                <span>
                  Hồ sơ của bạn đã có kết quả dừng tuyển dụng ở vị trí này. Hệ thống không cho phép nộp lại cho cùng một tin tuyển dụng. Bạn hoàn toàn có thể ứng tuyển vào các vị trí tuyển dụng khác của công ty.
                </span>
              </div>
            </div>
          );
        })()}

        {/* Stepper Navigation */}
        <div className="grid grid-cols-3 gap-2 text-xs select-none">
          <div
            onClick={() => setCurrentStep(1)}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              currentStep === 1
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
            }`}
          >
            <div className="truncate font-semibold">{t.candidate.step1}</div>
          </div>

          <div
            onClick={() => handleNextStep()}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              currentStep === 2
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
            }`}
          >
            <div className="truncate font-semibold">{t.candidate.step2}</div>
          </div>

          <div
            onClick={() => {
              if (currentStep === 2) handleNextStep();
            }}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              currentStep === 3
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
            }`}
          >
            <div className="truncate font-semibold">{t.candidate.step3}</div>
          </div>
        </div>

        {/* Global Notifications */}
        {validationError && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="space-y-0.5">
              <div className="font-bold text-sm">Nộp Hồ Sơ Thành Công!</div>
              <div>{successMessage}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* STEP 1: CHỌN NGUỒN CV */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Chọn Nguồn Bản CV Đính Kèm:
                </label>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSourceType('vault')}
                    className={`shrink-0 w-36 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer truncate ${
                      sourceType === 'vault'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                    title="Dùng các bản CV đã lưu trong Kho Cá Nhân"
                  >
                    Kho CV ({savedResumes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('pdf')}
                    className={`shrink-0 w-32 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 truncate ${
                      sourceType === 'pdf'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                    title="Tải lên file PDF từ máy để nộp ngay"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tải Lên PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('custom')}
                    className={`shrink-0 w-28 py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer truncate ${
                      sourceType === 'custom'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                    title="Dán đường link CV bên ngoài"
                  >
                    Link Ngoài
                  </button>
                </div>
              </div>

              {sourceType === 'pdf' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tải Lên Bản CV Dạng File PDF:
                  </div>
                  <PDFResumeUploader
                    compact
                    onUploadSuccess={(savedRes) => {
                      setUserSelectedResumeId(savedRes.id);
                      setSourceType('vault');
                      onRefreshResumes?.();
                      setValidationError(null);
                    }}
                  />
                </div>
              )}

              {sourceType === 'vault' && (
                <div className="space-y-3">
                  {savedResumes.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-800 text-center space-y-3">
                      <FileText className="w-10 h-10 text-amber-500 mx-auto" />
                      <div className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                        Bạn chưa có bản CV nào được lưu trong Kho Cá Nhân.
                      </div>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSourceType('pdf')}
                          className="shrink-0 w-44 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5 truncate"
                          title="Tải lên file PDF từ máy"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span className="truncate">Tải Lên File PDF Ngay</span>
                        </button>
                        {onNavigateToCVStudio && (
                          <button
                            type="button"
                            onClick={onNavigateToCVStudio}
                            className="shrink-0 w-44 py-2 px-3 border border-amber-600 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-all truncate"
                            title="Mở Canva CV Studio"
                          >
                            Mở Canva CV Studio
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                      {savedResumes.map((r) => {
                        const isSelected = r.id === selectedResumeId;
                        const isPdf =
                          r.template_id === 'pdf' ||
                          r.template_id === 'pdf-upload' ||
                          r.template_id?.startsWith('pdf');
                        return (
                          <div
                            key={r.id}
                            onClick={() => setUserSelectedResumeId(r.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-500/20'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {r.title}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5 flex items-center gap-1">
                                  {isPdf ? (
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                                      📄 FILE PDF GỐC
                                    </span>
                                  ) : (
                                    <span>Mẫu: {r.template_id}</span>
                                  )}
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                              <span>
                                {r.ats_score ? (
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    ★ ATS: {r.ats_score}%
                                  </span>
                                ) : (
                                  'Chưa quét ATS'
                                )}
                              </span>
                              <span>{new Date(r.updated_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {sourceType === 'custom' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Đường dẫn CV trực tuyến (Google Drive, LinkedIn, Portfolio):
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="url"
                      value={cvUrl}
                      onChange={(e) => setCvUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... hoặc link portfolio cá nhân"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Lưu ý mở quyền xem công khai (Anyone with link can view) nếu bạn dùng Google
                    Drive.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: THÔNG TIN LIÊN HỆ & THƯ ỨNG TUYỂN */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Phone Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Số Điện Thoại Trực Tiếp (Bắt buộc):
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Cover Letter with "Lấy từ trong CV ra" Button (Pen Icon + Typewriter) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Thư Giới Thiệu Bản Thân (Cover Letter):
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {coverLetter.length} ký tự
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pb-1">
                  <button
                    type="button"
                    onClick={handleExtractFromCV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                    title="Tự động trích xuất thông điệp từ hồ sơ CV và gõ chữ tự động vào khung bên dưới"
                  >
                    <PenLine className={`w-3.5 h-3.5 ${isTypingCoverLetter ? 'animate-bounce text-blue-500' : 'group-hover:rotate-12 transition-transform text-blue-500'}`} />
                    <span>{isTypingCoverLetter ? 'Đang viết từ CV...' : 'Lấy từ trong CV ra'}</span>
                    {isTypingCoverLetter && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping ml-0.5" />
                    )}
                  </button>

                  {isTypingCoverLetter && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                        setIsTypingCoverLetter(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
                    >
                      Dừng viết
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={5}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Giới thiệu ngắn gọn lý do bạn phù hợp nhất với vị trí này, hoặc nhấn nút 'Lấy từ trong CV ra' ở trên..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
                  />
                  {isTypingCoverLetter && (
                    <div className="absolute right-3 bottom-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono pointer-events-none">
                      <span className="inline-block w-1 h-3 bg-blue-500 animate-pulse" />
                      <span>AI Typing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: XÁC NHẬN & TỔNG QUAN TRƯỚC KHI GỬI */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Tổng Quan Hồ Sơ Trước Khi Gửi</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Vị Trí:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {activeOpening.title}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Công Ty:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {activeOpening.organization_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Bản CV:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {sourceType === 'vault'
                        ? chosenResume?.title || 'CV Kho Cá Nhân'
                        : cvUrl || 'Link CV ngoài'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">SĐT:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{phone}</span>
                  </div>
                </div>

                {coverLetter.trim() && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                      Trích Đoạn Thư Ứng Tuyển:
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 italic line-clamp-2">
                      &ldquo;{coverLetter.trim()}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  Tôi cam kết các thông tin trong hồ sơ là chính xác, trung thực và đồng ý cho{' '}
                  <strong className="text-blue-600 dark:text-blue-400 font-bold">
                    {activeOpening.organization_name}
                  </strong>{' '}
                  liên hệ phỏng vấn.
                </span>
              </label>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="shrink-0 w-32 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  title={t.candidate.backBtn}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t.candidate.backBtn}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="shrink-0 w-28 py-2 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer truncate"
                title={t.candidate.closeBtn}
              >
                {t.candidate.closeBtn}
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={Boolean(
                    activeOpening &&
                      applications?.some(
                        (a) =>
                          a.opening_id === activeOpening.id &&
                          ['REJECTED', 'WITHDRAWN', 'CANCELLED', 'EXPIRED'].includes(a.stage)
                      )
                  )}
                  className="shrink-0 w-36 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer truncate disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t.candidate.continueBtn}
                >
                  <span>{t.candidate.continueBtn}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !isConfirmed ||
                    Boolean(
                      activeOpening &&
                        applications?.some(
                          (a) =>
                            a.opening_id === activeOpening.id &&
                            ['REJECTED', 'WITHDRAWN', 'CANCELLED', 'EXPIRED'].includes(a.stage)
                        )
                    )
                  }
                  className="shrink-0 w-48 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed truncate"
                  title={t.candidate.submitApplyBtn}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span className="truncate">{t.candidate.submittingApply}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 shrink-0" />
                      <span className="truncate">{t.candidate.submitApplyBtn}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
