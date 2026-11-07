'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Download,
  Save,
  Eye,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Briefcase,
  GraduationCap,
  Zap,
  FolderKanban,
  Award,
  Globe,
  Settings2,
  FolderCheck,
  RefreshCw,
  Loader2,
  Share2,
  ExternalLink,
  Star,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SlidersHorizontal,
  Grid,
  Ruler,
  Move,
  ChevronLeft,
  Type,
  Copy,
  ArrowRight,
  ShieldCheck,
  LayoutTemplate,
  Layers,
  Edit3,
  Phone,
  Mail,
  MapPin,
  Link as LinkIcon,
  Code2,
  Minus,
  HelpCircle,
  Wand2,
  GripVertical,
  UploadCloud,
  FileUp,
} from 'lucide-react';
import {
  CVData,
  CVSection,
  CVTemplateId,
  DEFAULT_SECTION_ORDER,
  CV_SECTIONS_META,
  createEmptyCVData,
  getTemplateSampleData,
  applyCandidateSeedToCV,
  CV_TEMPLATES_CATALOG,
  Experience,
  Education,
  Skill,
  Project,
  Language,
  Certification,
  CustomBlock,
} from '@/types/cv';
import { CVTemplateGallery } from './CVTemplateGallery';
import { CVTemplateRenderer } from './CVTemplateRenderer';
import { CanvaRulers } from './canva/CanvaRulers';
import { CanvaPositionModal } from './canva/CanvaPositionModal';
import { CanvaFormatToolbar } from './canva/CanvaFormatToolbar';
import { CanvaMagicWriteModal } from './canva/CanvaMagicWriteModal';
import { PDFResumeUploader } from './PDFResumeUploader';
import { candidatePortalApi, UserResume, CVReviewResult } from '@/lib/recruitment-api';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface CVInteractiveStudioProps {
  initialResumeId?: string;
  initialViewMode?: 'gallery' | 'studio';
  onSelectResumeForApply?: (resume: UserResume) => void;
  onSaveSuccess?: (resume: UserResume) => void;
  onNavigateToVault?: () => void;
  onNavigateToJobs?: () => void;
  onNotify?: (msg: string) => void;
}

type StudioDrawerTab = 'templates' | 'elements' | 'text' | 'layout' | 'form';

export function CVInteractiveStudio({
  initialResumeId,
  initialViewMode,
  onSelectResumeForApply,
  onSaveSuccess,
  onNavigateToVault,
  onNavigateToJobs,
  onNotify,
}: CVInteractiveStudioProps) {
  const authUser = useAuthStore((state) => state.user);

  // View Mode: 'gallery' shows all 10 templates + blank canvas; 'studio' is the Canva canvas workspace
  const [viewMode, setViewMode] = useState<'gallery' | 'studio'>(
    initialViewMode ? initialViewMode : initialResumeId ? 'studio' : 'gallery'
  );

  // Active CV Data state - defaults to rich Harvard sample with user's identity
  const [cvData, setCvData] = useState<CVData>(() =>
    getTemplateSampleData('harvard', {
      fullName: authUser?.full_name,
      email: authUser?.email,
      phone: (authUser as { phone?: string | null })?.phone,
      title: (authUser as { job_title?: string | null })?.job_title,
    })
  );

  const [currentResumeId, setCurrentResumeId] = useState<string | null>(initialResumeId || null);
  const [resumeTitle, setResumeTitle] = useState(
    'Bản CV Cá Nhân - ' + (authUser?.full_name || 'Ứng Viên')
  );
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplateId>('harvard');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Canva Workspace Tooling State - Default 0.58 fits standard A4 (1123px) fully into screen height without scrolling!
  const [zoomScale, setZoomScale] = useState<number>(0.58);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState<boolean>(false);
  const [isMagicWriteOpen, setIsMagicWriteOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [activeDrawerTab, setActiveDrawerTab] = useState<StudioDrawerTab>('templates');
  const [activeFormTab, setActiveFormTab] = useState<CVSection>('personal');

  // Completion Confirmation & Evaluation Modal State
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionStep, setCompletionStep] = useState<'confirmed' | 'evaluation'>('confirmed');
  const [completedResume, setCompletedResume] = useState<UserResume | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // Canva Formatting State
  const [fontFamily, setFontFamily] = useState<string>('font-sans');
  const [fontSize, setFontSize] = useState<number>(13);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [textColor, setTextColor] = useState<string>('#0f172a');

  // Saved Resumes Vault
  const [savedResumes, setSavedResumes] = useState<UserResume[]>([]);
  const [isLoadingVault, setIsLoadingVault] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isSavingResume, setIsSavingResume] = useState(false);

  // AI ATS Review State
  const [isReviewingATS, setIsReviewingATS] = useState(false);
  const [atsReviewResult, setAtsReviewResult] = useState<CVReviewResult | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Toast / feedback message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    onNotify?.(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Load Saved Resumes
  const loadSavedVault = async () => {
    setIsLoadingVault(true);
    try {
      const list = await candidatePortalApi.getSavedResumes();
      setSavedResumes(list);
      if (initialResumeId) {
        const found = list.find((r) => r.id === initialResumeId);
        if (found) {
          try {
            const parsed = JSON.parse(found.cv_data_json);
            setCvData(parsed);
            setResumeTitle(found.title);
            setSelectedTemplate((found.template_id as CVTemplateId) || 'harvard');
            setCurrentResumeId(found.id);
            setViewMode('studio');
          } catch (e) {
            console.error('Error parsing resume data:', e);
          }
        }
      }
    } catch (err: any) {
      console.warn('Could not load saved resumes vault:', err);
    } finally {
      setIsLoadingVault(false);
    }
  };

  useEffect(() => {
    loadSavedVault();
  }, []);

  // Template change handler
  const handleTemplateChange = (tpl: CVTemplateId) => {
    setSelectedTemplate(tpl);
    setCvData((prev) => ({ ...prev, templateId: tpl }));
  };

  // Select template from Gallery with rich sample structure matching preview
  const handleSelectTemplateFromGallery = (tplId: CVTemplateId) => {
    setSelectedTemplate(tplId);
    const seed = {
      fullName: authUser?.full_name,
      email: authUser?.email,
      phone: (authUser as { phone?: string | null })?.phone,
      title: (authUser as { job_title?: string | null })?.job_title,
    };
    const sampleData = tplId === 'blank' ? createEmptyCVData(seed) : getTemplateSampleData(tplId, seed);
    setCvData(sampleData);
    setResumeTitle(`Bản CV (${tplId.toUpperCase()}) - ${authUser?.full_name || 'Ứng Viên'}`);
    setViewMode('studio');
    const catalogItem = CV_TEMPLATES_CATALOG.find((c) => c.id === tplId);
    notify(
      `Đã kích hoạt mẫu "${catalogItem?.name || tplId.toUpperCase()}". Đã nạp bố cục chuẩn khớp 100% hình mẫu!`
    );
  };

  // Auto-fill candidate's profile data into current CV template
  const handleAutoFillCandidateInfo = () => {
    const seed = {
      fullName: authUser?.full_name,
      email: authUser?.email,
      phone: (authUser as { phone?: string | null })?.phone,
      title: (authUser as { job_title?: string | null })?.job_title,
    };
    setCvData((prev) => applyCandidateSeedToCV(prev, seed));
    if (authUser?.full_name) {
      setResumeTitle(`Bản CV - ${authUser.full_name}`);
    }
    notify(`✨ Đã tự động điền thông tin cá nhân của bạn (${authUser?.full_name || 'Ứng viên'}) vào mẫu CV!`);
  };

  // Reload standard sample template data
  const handleReloadSampleData = () => {
    const seed = {
      fullName: authUser?.full_name,
      email: authUser?.email,
      phone: (authUser as { phone?: string | null })?.phone,
      title: (authUser as { job_title?: string | null })?.job_title,
    };
    const sample = getTemplateSampleData(selectedTemplate, seed);
    setCvData(sample);
    notify(`Đã nạp lại dữ liệu mẫu chuẩn cho mẫu ${selectedTemplate.toUpperCase()}!`);
  };

  // Zoom to fit full CV on screen without vertical scrolling
  const handleFitToScreen = () => {
    // Standard A4 is 1123px. Scale 0.58 fits perfectly in viewports ~660px
    setZoomScale(0.58);
    notify('Đã thu phóng vừa vặn toàn màn hình (không cần cuộn trang).');
  };

  // Save CV to Vault
  const handleSaveToVault = async (): Promise<UserResume | null> => {
    setIsSavingResume(true);
    try {
      const payloadData = {
        ...cvData,
        templateId: selectedTemplate,
        title: resumeTitle,
      };
      const jsonString = JSON.stringify(payloadData);
      let targetResume: UserResume;

      if (currentResumeId) {
        targetResume = await candidatePortalApi.updateResume(currentResumeId, {
          title: resumeTitle,
          template_id: selectedTemplate,
          cv_data_json: jsonString,
          ats_score: atsReviewResult?.overall_score || undefined,
        });
        notify(`Đã cập nhật bản CV "${targetResume.title}" vào Kho Cá Nhân.`);
      } else {
        targetResume = await candidatePortalApi.saveResume({
          title: resumeTitle,
          template_id: selectedTemplate,
          cv_data_json: jsonString,
          is_primary: savedResumes.length === 0,
          ats_score: atsReviewResult?.overall_score || undefined,
        });
        setCurrentResumeId(targetResume.id);
        notify(`Đã lưu bản CV mới "${targetResume.title}" thành công!`);
      }
      await loadSavedVault();
      onSaveSuccess?.(targetResume);
      return targetResume;
    } catch (err: any) {
      notify(`Lỗi khi lưu CV: ${err.message || 'Thao tác thất bại'}`);
      return null;
    } finally {
      setIsSavingResume(false);
    }
  };

  // Finish and Save CV handler - triggers completion confirmation, runs ATS evaluation, and shows evaluation report
  const handleFinishAndSaveCV = async () => {
    setIsFinishing(true);
    try {
      const saved = await handleSaveToVault();
      if (!saved) return;
      setCompletedResume(saved);

      const compiledText = compileCVToText(cvData);
      if (compiledText.trim().length >= 20) {
        try {
          const evalRes = await candidatePortalApi.reviewCV({
            cv_text: compiledText,
            target_role: cvData.personalInfo.title.trim() || undefined,
          });
          setAtsReviewResult(evalRes);
        } catch (e) {
          console.warn('Background ATS review failed:', e);
        }
      }
      setCompletionStep('confirmed');
      setIsCompletionModalOpen(true);
    } finally {
      setIsFinishing(false);
    }
  };

  // Direct Apply with this current CV
  const handleApplyWithCurrentCV = async () => {
    const resume = await handleSaveToVault();
    if (resume && onSelectResumeForApply) {
      onSelectResumeForApply(resume);
    }
  };

  // Load a selected saved CV
  const handleLoadResume = (resume: UserResume) => {
    try {
      const parsed = JSON.parse(resume.cv_data_json);
      setCvData(parsed);
      setResumeTitle(resume.title);
      setSelectedTemplate((resume.template_id as CVTemplateId) || 'harvard');
      setCurrentResumeId(resume.id);
      setIsVaultModalOpen(false);
      setViewMode('studio');
      notify(`Đã nạp bản CV: "${resume.title}" vào Studio`);
    } catch (e) {
      notify('Không thể phân tích dữ liệu bản CV đã lưu.');
    }
  };

  // Print / Export PDF
  const handlePrint = () => {
    window.print();
  };

  // Compile CV into text format for ATS scoring
  const compileCVToText = (data: CVData): string => {
    let text = `${data.personalInfo.fullName || ''} - ${data.personalInfo.title || ''}\n`;
    if (data.personalInfo.email || data.personalInfo.phone || data.personalInfo.location) {
      text += `Email: ${data.personalInfo.email} | SĐT: ${data.personalInfo.phone} | Địa chỉ: ${data.personalInfo.location}\n\n`;
    }
    if (data.summary?.trim()) {
      text += `MỤC TIÊU NGHỀ NGHIỆP:\n${data.summary}\n\n`;
    }
    if (data.experience.length > 0) {
      text += `KINH NGHIỆM LÀM VIỆC:\n`;
      data.experience.forEach((exp) => {
        text += `- ${exp.position} tại ${exp.company} (${exp.startDate} - ${exp.isCurrent ? 'Hiện tại' : exp.endDate})\n`;
        if (exp.description) text += `  ${exp.description}\n`;
      });
      text += '\n';
    }
    if (data.education.length > 0) {
      text += `HỌC VẤN:\n`;
      data.education.forEach((edu) => {
        text += `- ${edu.school}, ${edu.degree} chuyên ngành ${edu.field} (${edu.startDate} - ${edu.endDate})\n`;
        if (edu.description) text += `  ${edu.description}\n`;
      });
      text += '\n';
    }
    if (data.projects.length > 0) {
      text += `DỰ ÁN TIÊU BIỂU:\n`;
      data.projects.forEach((prj) => {
        text += `- ${prj.name}: ${prj.description} (Công nghệ: ${prj.technologies.join(', ')})\n`;
      });
      text += '\n';
    }
    if (data.skills.length > 0) {
      text += `KỸ NĂNG:\n`;
      text += data.skills.map((s) => s.name).join(', ') + '\n';
    }
    if (data.certifications && data.certifications.length > 0) {
      text += `\nCHỨNG CHỈ:\n`;
      data.certifications.forEach((c) => {
        text += `- ${c.name} (${c.issuer})\n`;
      });
    }
    if (data.languages && data.languages.length > 0) {
      text += `\nNGOẠI NGỮ:\n`;
      text += data.languages.map((l) => `${l.name} (${l.level})`).join(', ') + '\n';
    }
    return text;
  };

  // Trigger AI ATS Review
  const handleRunATSReview = async () => {
    const compiledText = compileCVToText(cvData);
    if (compiledText.trim().length < 20) {
      notify('Hồ sơ CV chưa có đủ thông tin (tối thiểu 20 ký tự). Hãy bổ sung thông tin kinh nghiệm hoặc kỹ năng trước khi chạy AI thẩm định.');
      return;
    }

    setIsReviewingATS(true);
    try {
      const res = await candidatePortalApi.reviewCV({
        cv_text: compiledText,
        target_role: cvData.personalInfo.title.trim() || undefined,
      });
      setAtsReviewResult(res);
      setIsReviewModalOpen(true);
      notify(`AI đã hoàn tất thẩm định ATS: ${res.overall_score}/100 điểm!`);
    } catch (err: unknown) {
      notify(`Lỗi khi AI đánh giá: ${err instanceof Error ? err.message : 'Thao tác thất bại'}`);
    } finally {
      setIsReviewingATS(false);
    }
  };

  // Section Reordering Helpers
  const [draggedSectionIdx, setDraggedSectionIdx] = useState<number | null>(null);

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    const list = [...cvData.sectionOrder];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setCvData({ ...cvData, sectionOrder: list });
  };

  const handleSectionDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedSectionIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSectionDrop = (targetIdx: number) => {
    if (draggedSectionIdx === null || draggedSectionIdx === targetIdx) {
      setDraggedSectionIdx(null);
      return;
    }
    const nextOrder = [...cvData.sectionOrder];
    const [removed] = nextOrder.splice(draggedSectionIdx, 1);
    nextOrder.splice(targetIdx, 0, removed);
    setCvData({ ...cvData, sectionOrder: nextOrder });
    setDraggedSectionIdx(null);
    notify('Đã kéo thả và cập nhật thứ tự phân mục CV.');
  };

  // Experience Handlers
  const addExperience = () => {
    const newExp: Experience = {
      id: 'exp_' + Date.now(),
      company: 'Công Ty Công Nghệ Mới',
      position: 'Kỹ Sư Phần Mềm / Quản Lý',
      location: 'TP. Hồ Chí Minh',
      startDate: '01/2023',
      endDate: 'Hiện tại',
      isCurrent: true,
      description:
        '• Trực tiếp thiết kế hệ thống và tối ưu thông lượng xử lý tăng 35%.\n• Hướng dẫn đội ngũ kỹ thuật áp dụng quy trình chuẩn Agile Scrum.',
    };
    setCvData({ ...cvData, experience: [newExp, ...cvData.experience] });
    notify('Đã thêm 1 mục kinh nghiệm mới vào CV.');
  };

  const removeExperience = (id: string) => {
    setCvData({ ...cvData, experience: cvData.experience.filter((x) => x.id !== id) });
  };

  const updateExperience = (id: string, field: keyof Experience, val: any) => {
    setCvData({
      ...cvData,
      experience: cvData.experience.map((x) => (x.id === id ? { ...x, [field]: val } : x)),
    });
  };

  // Education Handlers
  const addEducation = () => {
    const newEdu: Education = {
      id: 'edu_' + Date.now(),
      school: 'Trường Đại Học / Học Viện',
      degree: 'Cử Nhân / Kỹ Sư',
      field: 'Khoa Học Máy Tính & Phần Mềm',
      startDate: '2018',
      endDate: '2022',
      description: 'GPA: 3.6/4.0 — Tốt nghiệp loại Giỏi',
    };
    setCvData({ ...cvData, education: [...cvData.education, newEdu] });
    notify('Đã thêm 1 mục học vấn mới.');
  };

  const removeEducation = (id: string) => {
    setCvData({ ...cvData, education: cvData.education.filter((x) => x.id !== id) });
  };

  // Skill Handlers
  const addSkill = (name: string, category: 'technical' | 'soft' = 'technical') => {
    if (!name.trim()) return;
    const newSkill: Skill = {
      id: 'sk_' + Date.now(),
      name: name.trim(),
      category,
      level: 'advanced',
    };
    setCvData({ ...cvData, skills: [...cvData.skills, newSkill] });
  };

  const removeSkill = (id: string) => {
    setCvData({ ...cvData, skills: cvData.skills.filter((s) => s.id !== id) });
  };

  // Project Handlers
  const addProject = () => {
    const newProj: Project = {
      id: 'prj_' + Date.now(),
      name: 'Nền Tảng AI SaaS Trực Tuyến',
      role: 'Lead Architect',
      description:
        'Nền tảng phân tán với khả năng xử lý thời gian thực, tích hợp công nghệ AI và bảo mật chuẩn doanh nghiệp.',
      technologies: ['TypeScript', 'Next.js', 'PostgreSQL', 'Docker'],
      startDate: '2023',
      endDate: '2024',
    };
    setCvData({ ...cvData, projects: [...cvData.projects, newProj] });
    notify('Đã thêm 1 dự án mới.');
  };

  const removeProject = (id: string) => {
    setCvData({ ...cvData, projects: cvData.projects.filter((p) => p.id !== id) });
  };

  const updateProject = (id: string, field: keyof Project, val: any) => {
    setCvData({
      ...cvData,
      projects: cvData.projects.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    });
  };

  // Custom Block Handlers (Canva freeform)
  const addCustomBlock = (
    title = 'Khối Văn Bản Tự Do',
    content = 'Nhấp đúp chuột để chỉnh sửa nội dung...'
  ) => {
    const newBlock: CustomBlock = {
      id: 'block_' + Date.now(),
      title,
      content,
    };
    setCvData({
      ...cvData,
      customBlocks: [...(cvData.customBlocks || []), newBlock],
    });
    notify(`Đã thêm khối "${title}" vào bản vẽ.`);
  };

  // Magic Write text apply handler
  const handleApplyMagicText = (text: string) => {
    if (selectedElementId === 'summary') {
      setCvData({ ...cvData, summary: text });
      notify('Canva Magic Write™ đã cập nhật Tóm Tắt Mục Tiêu thành công!');
    } else {
      addCustomBlock('Canva Magic Write Polish', text);
    }
  };

  // Zoom helpers
  const handleZoom = (delta: number) => {
    setZoomScale((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.max(0.4, Math.min(1.5, next));
    });
  };

  const activeCatalogMeta = CV_TEMPLATES_CATALOG.find((c) => c.id === selectedTemplate);

  return (
    <div className="w-full space-y-4">
      {/* ── STATUS BANNER ────────────────────────────────────────────── */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs text-indigo-400 hover:text-indigo-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODE 1: CV TEMPLATE GALLERY (10 TEMPLATES + BLANK CANVAS)          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {viewMode === 'gallery' && (
        <div className="space-y-6">
          {/* Top Quick Action Bar in Gallery Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <LayoutTemplate className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Studio CV Trực Quan Phong Cách Canva
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chọn mẫu bên dưới để bắt đầu hoặc mở lại các bản CV đã lưu
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Upload PDF Button */}
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="shrink-0 w-44 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Tải lên file CV định dạng PDF đã có sẵn trên máy tính"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Tải Lên CV (File PDF)</span>
              </button>

              {/* Vault Button */}
              <button
                type="button"
                onClick={() => setIsVaultModalOpen(true)}
                className="shrink-0 w-44 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Xem danh sách các bản CV đã lưu trong kho cá nhân"
              >
                <FolderCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kho CV Cá Nhân ({savedResumes.length})</span>
              </button>

              {/* Jump to Studio Button if already editing */}
              <button
                type="button"
                onClick={() => setViewMode('studio')}
                className="shrink-0 w-44 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Chuyển sang bàn vẽ Canvas Studio"
              >
                <span>Vào Bàn Vẽ Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Render The Gallery Grid */}
          <CVTemplateGallery
            onSelectTemplate={handleSelectTemplateFromGallery}
            activeTemplateId={selectedTemplate}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODE 2: CANVA-STYLE VISUAL STUDIO & ARTBOARD WORKSPACE             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {viewMode === 'studio' && (
        <div className="space-y-2">
          {/* ── TOP PRIMARY CANVA NAVBAR ─────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
            {/* Left: Back to Gallery & Document Title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('gallery')}
                className="shrink-0 w-36 py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer truncate"
                title="Quay lại thư viện mẫu để chọn mẫu khác"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Thư Viện Mẫu</span>
              </button>

              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                  className="text-xs font-bold text-slate-900 dark:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-52 truncate"
                  placeholder="Tiêu đề bản CV..."
                  title="Nhấp để đổi tên bản CV"
                />

                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/50">
                  {selectedTemplate === 'blank'
                    ? 'Bản Vẽ Trắng'
                    : activeCatalogMeta?.name || selectedTemplate.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Middle: Canvas Tools (Zoom, Rulers, Grid, Position) */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
              {/* Zoom Out */}
              <button
                type="button"
                onClick={() => handleZoom(-0.1)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Thu nhỏ bản vẽ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 px-1 w-10 text-center">
                {Math.round(zoomScale * 100)}%
              </span>

              {/* Zoom In */}
              <button
                type="button"
                onClick={() => handleZoom(0.1)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Phóng to bản vẽ"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {/* Fit-to-screen button to see full CV without scrolling */}
              <button
                type="button"
                onClick={handleFitToScreen}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  zoomScale <= 0.60
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
                title="Tự động thu phóng để thấy trọn vẹn toàn bộ bản CV trên màn hình mà không cần lướt lên xuống"
              >
                Toàn Bộ CV
              </button>

              <button
                type="button"
                onClick={() => setZoomScale(0.85)}
                className={`text-[10px] font-bold px-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  zoomScale > 0.80 && zoomScale < 0.90
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
                title="Đặt về kích thước chuẩn A4 (85%)"
              >
                Chuẩn A4
              </button>

              <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              {/* Ruler Toggle */}
              <button
                type="button"
                onClick={() => setShowRulers(!showRulers)}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                  showRulers
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="Bật/Tắt Thước đo Milimet"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Thước</span>
              </button>

              {/* Grid Toggle */}
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                  showGrid
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="Bật/Tắt Lưới Căn Lề (Grid Overlay)"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Lưới</span>
              </button>

              {/* Position & Align Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsPositionModalOpen(!isPositionModalOpen)}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                  isPositionModalOpen
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="Căn chỉnh lề và lớp đối tượng (Align & Layers)"
              >
                <Move className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Vị trí</span>
              </button>
            </div>

            {/* Right: Actions (Candidate Auto-fill, PDF Upload, Finish & Save, Vault, Print) */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Auto-fill Candidate Info Button */}
              <button
                type="button"
                onClick={handleAutoFillCandidateInfo}
                className="shrink-0 w-44 py-2 px-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Tự động lấy thông tin từ tài khoản của bạn (họ tên, email, SĐT) điền vào bản CV mẫu"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="truncate">Điền Thông Tin Của Tôi</span>
              </button>

              {/* Upload PDF Button */}
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="shrink-0 w-36 py-2 px-2 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Tải lên file PDF từ máy tính để lưu và ứng tuyển"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate">Tải Lên File PDF</span>
              </button>

              {/* Primary Action: Hoàn Thành & Lưu CV (Triggers completion notification + assessment modal) */}
              <button
                type="button"
                onClick={handleFinishAndSaveCV}
                disabled={isFinishing || isSavingResume}
                className="shrink-0 w-44 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 truncate"
                title="Lưu bản CV vào kho cá nhân và nhận báo cáo đánh giá tiêu chuẩn ATS"
              >
                {isFinishing || isSavingResume ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span className="truncate">Hoàn Thành & Lưu CV</span>
              </button>

              {/* Open Vault Trigger */}
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToVault) {
                    onNavigateToVault();
                  } else {
                    setIsVaultModalOpen(true);
                  }
                }}
                className="shrink-0 w-30 py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Xem danh sách các bản CV đã lưu trong kho cá nhân"
              >
                <FolderCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Kho CV ({savedResumes.length})</span>
              </button>

              {/* Print / Export Trigger */}
              <button
                type="button"
                onClick={handlePrint}
                className="shrink-0 w-28 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Xuất file PDF hoặc In ấn A4 chuẩn"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── CANVA SECONDARY FORMATTING TOOLBAR ───────────────────────── */}
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
            <CanvaFormatToolbar
              selectedElementLabel={selectedElementId}
              fontFamily={fontFamily}
              onFontFamilyChange={setFontFamily}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
              isBold={isBold}
              onToggleBold={() => setIsBold(!isBold)}
              isItalic={isItalic}
              onToggleItalic={() => setIsItalic(!isItalic)}
              textAlign={textAlign}
              onTextAlignChange={setTextAlign}
              textColor={textColor}
              onTextColorChange={setTextColor}
              onMagicWrite={() => setIsMagicWriteOpen(true)}
            />
          </div>

          {/* ── WORKSPACE: CANVA SIDEBAR + CANVA ARTBOARD CANVAS ─────────── */}
          <div className="relative flex rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100/70 dark:bg-slate-900 h-[calc(100vh-170px)] min-h-[660px]">
            {/* Position Modal Overlay if Open */}
            <CanvaPositionModal
              isOpen={isPositionModalOpen}
              onClose={() => setIsPositionModalOpen(false)}
              selectedLabel={selectedElementId || 'Khối nội dung'}
              onAlign={(align) => {
                if (selectedElementId && typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('canva-align-element', {
                      detail: { id: selectedElementId, align },
                    })
                  );
                }
                notify(`Đã căn lề ${align.toUpperCase()} cho phần tử`);
                setIsPositionModalOpen(false);
              }}
              onLayerChange={(layer) => {
                notify(
                  `Đã chuyển lớp đối tượng ${layer === 'forward' ? 'LÊN TRÊN' : 'XUỐNG DƯỚI'}`
                );
                setIsPositionModalOpen(false);
              }}
            />

            {/* Magic Write Modal */}
            <CanvaMagicWriteModal
              isOpen={isMagicWriteOpen}
              onClose={() => setIsMagicWriteOpen(false)}
              initialText={selectedElementId === 'summary' ? cvData.summary : ''}
              onApplyText={handleApplyMagicText}
            />

            {/* 1. CANVA ICON RAIL (Narrow vertical sidebar on extreme left) */}
            <div className="w-18 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 p-2 flex flex-col items-center justify-between border-r border-slate-200 dark:border-slate-800 z-20 select-none shrink-0">
              <div className="space-y-4 pt-2 w-full flex flex-col items-center">
                {/* Tab: Templates */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDrawerTab('templates');
                    setIsDrawerOpen(true);
                  }}
                  className={`w-14 py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                    activeDrawerTab === 'templates' && isDrawerOpen
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                  }`}
                  title="Đổi mẫu giao diện CV"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  <span>Mẫu</span>
                </button>

                {/* Tab: Elements */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDrawerTab('elements');
                    setIsDrawerOpen(true);
                  }}
                  className={`w-14 py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                    activeDrawerTab === 'elements' && isDrawerOpen
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                  }`}
                  title="Thêm thành phần: Kinh nghiệm, Học vấn, Kỹ năng, Biểu tượng liên lạc"
                >
                  <Layers className="w-4 h-4" />
                  <span>Thành phần</span>
                </button>

                {/* Tab: Text */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDrawerTab('text');
                    setIsDrawerOpen(true);
                  }}
                  className={`w-14 py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                    activeDrawerTab === 'text' && isDrawerOpen
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                  }`}
                  title="Thêm tiêu đề và văn bản"
                >
                  <Type className="w-4 h-4" />
                  <span>Văn bản</span>
                </button>

                {/* Tab: Layout & Order */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDrawerTab('layout');
                    setIsDrawerOpen(true);
                  }}
                  className={`w-14 py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                    activeDrawerTab === 'layout' && isDrawerOpen
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                  }`}
                  title="Sắp xếp thứ tự các mục"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Bố cục</span>
                </button>

                {/* Tab: Form inputs */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDrawerTab('form');
                    setIsDrawerOpen(true);
                  }}
                  className={`w-14 py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                    activeDrawerTab === 'form' && isDrawerOpen
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                  }`}
                  title="Nhập liệu form chi tiết"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Form</span>
                </button>
              </div>

              {/* Toggle Drawer Expand/Collapse */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="w-12 py-2 text-[10px] font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 flex flex-col items-center gap-1 cursor-pointer"
                title={isDrawerOpen ? 'Thu gọn thanh công cụ' : 'Mở rộng thanh công cụ'}
              >
                <span>{isDrawerOpen ? '◀ Thu gọn' : 'Mở ▶'}</span>
              </button>
            </div>

            {/* 2. CANVA DRAWER CONTENT PANE (Expands next to Icon Rail) */}
            {isDrawerOpen && (
              <div className="w-80 bg-slate-50/95 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto text-slate-800 dark:text-slate-200 z-10 flex flex-col h-full shrink-0">
                {/* DRAWER TAB: TEMPLATES (Switch template on the fly) */}
                {activeDrawerTab === 'templates' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <LayoutTemplate className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Mẫu Thiết Kế (10+ Mẫu)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setViewMode('gallery')}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      >
                        Xem tất cả →
                      </button>
                    </div>

                    {/* Blank canvas option */}
                    <div
                      onClick={() => handleTemplateChange('blank')}
                      className={`p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-3 ${
                        selectedTemplate === 'blank'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Tự Tạo Mẫu Trắng (Blank)</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Bản vẽ tự do, tùy biến 100%
                        </div>
                      </div>
                    </div>

                    {/* 10 Catalog items in drawer with visual thumbnails */}
                    <div className="space-y-2.5">
                      {CV_TEMPLATES_CATALOG.map((cat) => {
                        const isCurrent = selectedTemplate === cat.id;
                        return (
                          <div
                            key={cat.id}
                            onClick={() => handleTemplateChange(cat.id)}
                            className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                              isCurrent
                                ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 ring-1 ring-indigo-500/50'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {/* Miniature A4 thumbnail */}
                            <div className="w-11 h-15 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
                              <img
                                src={cat.imageUrl}
                                alt={cat.name}
                                className="w-full h-full object-cover object-top"
                                loading="lazy"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {cat.name}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono shrink-0">
                                  {cat.atsScore}%
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {cat.category}
                              </p>
                              <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                                Nhấp để áp dụng mẫu
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DRAWER TAB: ELEMENTS (Quick Add blocks + Canva Graphics & Contact Icons) */}
                {activeDrawerTab === 'elements' && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Thành Phần & Đồ Họa Canva</span>
                      </h3>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
                        Nhấp để thêm ngay khối nội dung hoặc icon liên hệ vào bản vẽ.
                      </p>
                    </div>

                    {/* Structural Sections */}
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={addExperience}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-500 border border-slate-200 dark:border-slate-700 text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                          <div className="text-xs font-bold text-slate-800 dark:text-white">Thêm Kinh Nghiệm</div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
                      </button>

                      <button
                        type="button"
                        onClick={addProject}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                          <div className="text-xs font-bold text-slate-800 dark:text-white">Thêm Dự Án Trọng Điểm</div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
                      </button>

                      <button
                        type="button"
                        onClick={addEducation}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800/70 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-500 border border-slate-200 dark:border-slate-700 text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                          <div className="text-xs font-bold text-slate-800 dark:text-white">Thêm Học Vấn</div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const skill = prompt(
                            'Nhập tên kỹ năng mới (ví dụ: React, Python, Docker...):'
                          );
                          if (skill) addSkill(skill);
                        }}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800/70 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-500 border border-slate-200 dark:border-slate-700 text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                          <div className="text-xs font-bold text-slate-800 dark:text-white">Thêm Kỹ Năng</div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500" />
                      </button>
                    </div>

                    {/* Canva Contact Graphics / Badges */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Biểu Tượng Liên Hệ & Mạng Xã Hội:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => addCustomBlock('Liên Hệ Phone', '📞 0912 345 678')}
                          className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Điện Thoại</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addCustomBlock('Liên Hệ Email', '✉️ contact@gmail.com')}
                          className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Email</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addCustomBlock('Địa Điểm', '📍 TP. Hồ Chí Minh')}
                          className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Địa Chỉ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            addCustomBlock('LinkedIn Profile', '🔗 linkedin.com/in/profile')
                          }
                          className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span>LinkedIn</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            addCustomBlock('GitHub Portfolio', '🐙 github.com/username')
                          }
                          className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 col-span-2 border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          <Code2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>GitHub Repository</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* DRAWER TAB: TEXT */}
                {activeDrawerTab === 'text' && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Type className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Văn Bản Phong Cách Canva</span>
                      </h3>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
                        Nhấp đúp chuột vào bất kỳ chữ nào trên trang A4 để gõ chữ trực tiếp!
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          addCustomBlock('TIÊU ĐỀ LỚN', 'Nội dung tiêu đề lớn chuẩn thiết kế')
                        }
                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-left font-black text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
                      >
                        + Thêm Tiêu Đề Lớn (Heading)
                      </button>

                      <button
                        type="button"
                        onClick={() => addCustomBlock('Tiêu Đề Phụ', 'Nội dung phụ đề')}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-left font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
                      >
                        + Thêm Tiêu Đề Phụ (Subheading)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addCustomBlock('Đoạn văn bản', 'Nhấp đúp chuột để gõ văn bản chi tiết...')
                        }
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-left font-normal text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
                      >
                        + Thêm Đoạn Văn Bản Thường (Body Text)
                      </button>
                    </div>
                  </div>
                )}

                {/* DRAWER TAB: LAYOUT & REORDER */}
                {activeDrawerTab === 'layout' && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Thứ Tự Phân Mục (Kéo Thả)</span>
                      </h3>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
                        Nắm biểu tượng 6 chấm kéo thả hoặc bấm nút mũi tên để đổi vị trí phân mục.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      {cvData.sectionOrder.map((secKey, idx) => {
                        const meta = CV_SECTIONS_META.find((m) => m.id === secKey);
                        const isDragging = draggedSectionIdx === idx;
                        return (
                          <div
                            key={secKey}
                            draggable
                            onDragStart={(e) => handleSectionDragStart(e, idx)}
                            onDragOver={(e) => handleSectionDragOver(e, idx)}
                            onDrop={() => handleSectionDrop(idx)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
                              isDragging
                                ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-950/40 opacity-60 scale-98 shadow-inner'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 shadow-2xs'
                            } text-xs`}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                              <span className="font-semibold">{meta?.label || secKey}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveSection(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer text-slate-600 dark:text-slate-300"
                                title="Đưa lên"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSection(idx, 'down')}
                                disabled={idx === cvData.sectionOrder.length - 1}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer text-slate-600 dark:text-slate-300"
                                title="Đưa xuống"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DRAWER TAB: FORM (Detailed structured entry) */}
                {activeDrawerTab === 'form' && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Biên Tập Form Dữ Liệu</span>
                      </h3>
                    </div>

                    {/* Section tabs */}
                    <div className="flex flex-wrap gap-1">
                      {CV_SECTIONS_META.slice(0, 4).map((sec) => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setActiveFormTab(sec.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                            activeFormTab === sec.id
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {sec.label}
                        </button>
                      ))}
                    </div>

                    {/* Form for personal */}
                    {activeFormTab === 'personal' && (
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Họ và Tên</label>
                          <input
                            type="text"
                            value={cvData.personalInfo.fullName}
                            onChange={(e) =>
                              setCvData({
                                ...cvData,
                                personalInfo: { ...cvData.personalInfo, fullName: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mt-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Chức Danh / Vị Trí</label>
                          <input
                            type="text"
                            value={cvData.personalInfo.title}
                            onChange={(e) =>
                              setCvData({
                                ...cvData,
                                personalInfo: { ...cvData.personalInfo, title: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mt-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Email</label>
                          <input
                            type="email"
                            value={cvData.personalInfo.email}
                            onChange={(e) =>
                              setCvData({
                                ...cvData,
                                personalInfo: { ...cvData.personalInfo, email: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mt-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Số Điện Thoại</label>
                          <input
                            type="text"
                            value={cvData.personalInfo.phone}
                            onChange={(e) =>
                              setCvData({
                                ...cvData,
                                personalInfo: { ...cvData.personalInfo, phone: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mt-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Form for summary */}
                    {activeFormTab === 'summary' && (
                      <div className="space-y-2 text-xs">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          Tóm tắt mục tiêu / Năng lực
                        </label>
                        <textarea
                          rows={6}
                          value={cvData.summary}
                          onChange={(e) => setCvData({ ...cvData, summary: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. CENTRAL WORKSPACE: THE CANVA ARTBOARD CANVAS */}
            <div
              className="flex-1 bg-slate-100/80 dark:bg-slate-950 overflow-auto relative p-2 sm:p-3 flex flex-col items-center selection:bg-indigo-100 h-full"
              onClick={() => setSelectedElementId(null)}
            >
              {/* Millimeter Rulers & Snap Grid Overlays */}
              <CanvaRulers showRulers={showRulers} showGrid={showGrid} zoomScale={zoomScale} />

              {/* Scalable Container holding the A4 paper sheet - scaled to fit full screen without vertical scrolling */}
              <div
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className={`my-1 transition-all duration-150 ${fontFamily} ${isBold ? 'font-bold' : ''} ${isItalic ? 'italic' : ''}`}
              >
                {/* CV Template Renderer handles Harvard, Modern, Executive, Sales, Dev, BA, Blank... */}
                <CVTemplateRenderer
                  data={cvData}
                  onUpdate={(newData) => setCvData(newData)}
                  selectedElementId={selectedElementId}
                  onSelectElement={(id) => setSelectedElementId(id)}
                />
              </div>

              {/* 4. CANVA SIGNATURE BOTTOM STATUS BAR */}
              <div
                className="sticky bottom-3 w-full max-w-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs select-none z-20 mt-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left: Document Specs & Cloud Sync */}
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Trang 1 / 1</span>
                  <span>•</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Khổ A4 (210 × 297 mm)
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tự động lưu
                  </span>
                </div>

                {/* Center: Canva Pro Tip */}
                <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Nhấp đúp chuột vào chữ để sửa trực tiếp trên giấy A4</span>
                </div>

                {/* Right: Smooth Range Zoom Slider */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleZoom(-0.05)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                    title="Thu nhỏ"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="range"
                    min="40"
                    max="140"
                    step="5"
                    value={Math.round(zoomScale * 100)}
                    onChange={(e) => setZoomScale(Number(e.target.value) / 100)}
                    className="w-24 accent-indigo-600 cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => handleZoom(0.05)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                    title="Phóng to"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-10 text-center font-bold font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {Math.round(zoomScale * 100)}%
                  </span>

                  <button
                    type="button"
                    onClick={() => setZoomScale(0.85)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Vừa trang
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: 2-STEP CV COMPLETION & ATS ASSESSMENT FLOW ── */}
      {isCompletionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* STEP 1: CONFIRMATION OF COMPLETION ("thông báo xác nhận hoàn thành") */}
            {completionStep === 'confirmed' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-md ring-8 ring-emerald-50 dark:ring-emerald-900/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Hoàn Thành Xuất Sắc</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Bản CV Của Bạn Đã Sẵn Sàng!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Bản CV <strong className="text-slate-900 dark:text-white font-bold">&quot;{completedResume?.title || resumeTitle}&quot;</strong> đã được biên tập hoàn chỉnh và lưu trữ an toàn vào Kho CV Cá Nhân.
                  </p>
                </div>

                {/* CV Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left flex items-center justify-between gap-4 max-w-lg mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {completedResume?.title || resumeTitle}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Mẫu: {selectedTemplate.toUpperCase()} • Đã lưu vào Kho CV
                      </div>
                    </div>
                  </div>

                  {atsReviewResult && (
                    <div className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black shrink-0">
                      ATS: {atsReviewResult.overall_score}/100
                    </div>
                  )}
                </div>

                {/* Primary Button to proceed to Step 2: Evaluation */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCompletionStep('evaluation')}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Xem Báo Cáo Đánh Giá CV & Thẩm Định ATS →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCompletionModalOpen(false);
                      if (onNavigateToVault) {
                        onNavigateToVault();
                      } else {
                        setIsVaultModalOpen(true);
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-all"
                  >
                    Vào Kho CV Đã Lưu
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ATS EVALUATION & ASSESSMENT MODAL ("thông báo đánh giá cv") */}
            {completionStep === 'evaluation' && atsReviewResult && (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                        BÁO CÁO ĐÁNH GIÁ TIÊU CHUẨN ATS
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Đánh giá tự động</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                      <span>Điểm Hồ Sơ Đạt:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{atsReviewResult.overall_score}/100</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                        {atsReviewResult.overall_score >= 80 ? 'Xuất Sắc' : atsReviewResult.overall_score >= 65 ? 'Khá Tốt' : 'Cần Tối Ưu'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {atsReviewResult.summary_evaluation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCompletionModalOpen(false)}
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Score Pillars */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                      {atsReviewResult.ats_score}%
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                      Chuẩn ATS
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {atsReviewResult.metrics_score}%
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                      Mật Độ Số Liệu
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {atsReviewResult.structure_score}%
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                      Cấu Trúc STAR
                    </div>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Điểm Mạnh Hồ Sơ ({atsReviewResult.strengths.length})</span>
                    </h4>
                    <ul className="space-y-1 text-emerald-900 dark:text-emerald-200 text-[11px]">
                      {atsReviewResult.strengths.map((s, idx) => (
                        <li key={idx}>• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                    <h4 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Điểm Cần Tối Ưu ({atsReviewResult.weaknesses.length})</span>
                    </h4>
                    <ul className="space-y-1 text-amber-900 dark:text-amber-200 text-[11px]">
                      {atsReviewResult.weaknesses.map((w, idx) => (
                        <li key={idx}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Gợi Ý Nâng Cao Tỷ Lệ Trúng Tuyển</span>
                  </h4>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                    {atsReviewResult.suggestions.map((sugg, idx) => (
                      <li key={idx}>✓ {sugg}</li>
                    ))}
                  </ul>
                </div>

                {/* Modal Navigation Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCompletionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Tiếp Tục Chỉnh Sửa
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompletionModalOpen(false);
                        if (onNavigateToVault) {
                          onNavigateToVault();
                        } else {
                          setIsVaultModalOpen(true);
                        }
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    >
                      <FolderCheck className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Xem Trong Kho CV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCompletionModalOpen(false);
                        if (completedResume && onSelectResumeForApply) {
                          onSelectResumeForApply(completedResume);
                        } else if (onNavigateToJobs) {
                          onNavigateToJobs();
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Khám Phá Việc Làm & Ứng Tuyển</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: SAVED RESUMES VAULT ───────────────────────────────── */}
      {isVaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Kho Bản CV Cá Nhân Của Bạn
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVaultModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isLoadingVault ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải danh sách CV...</span>
              </div>
            ) : savedResumes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <p className="text-xs">Chưa có bản CV nào được lưu trong kho của bạn.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsVaultModalOpen(false);
                    handleSaveToVault();
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Lưu bản hiện tại ngay
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedResumes.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-indigo-400 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {r.title}
                        </span>
                        {r.is_primary && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-300">
                            Chính
                          </span>
                        )}
                        {r.ats_score && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full">
                            ATS: {r.ats_score}/100
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>Mẫu: {r.template_id}</span>
                        <span>•</span>
                        <span>Cập nhật: {new Date(r.updated_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadResume(r)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Nạp Vào Studio
                      </button>
                      {onSelectResumeForApply && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectResumeForApply(r);
                            setIsVaultModalOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Chọn Nộp Hồ Sơ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: UPLOAD FILE PDF TRỰC TIẾP ──────────────────────────── */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tải Lên Bản CV Định Dạng PDF
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    File PDF sẽ được lưu an toàn vào Kho Cá Nhân để xem trước và nộp đơn trực tiếp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <PDFResumeUploader
              onUploadSuccess={(savedRes) => {
                loadSavedVault();
                onSaveSuccess?.(savedRes);
                notify(`Đã lưu bản CV PDF "${savedRes.title}" vào Kho thành công!`);
                setIsPdfModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
