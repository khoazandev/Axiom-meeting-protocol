'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Briefcase,
  Building2,
  Mail,
  User,
  Phone,
  Link as LinkIcon,
  FileText,
  Sparkles,
  PenLine,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  UploadCloud,
  Eye,
  Trash2,
  MapPin,
  GraduationCap,
  DollarSign,
  Calendar,
  Globe,
  Award,
  ShieldCheck,
  Tag,
  Plus,
  Loader2,
  FileCheck,
} from 'lucide-react';
import {
  publicCareersApi,
  PublicJobOpeningItem,
  PublicCandidateApplyResponse,
} from '@/lib/recruitment-api';
import { CompanyLogo } from '@/lib/companyLogos';
import { MatIcon } from '@/components/ui/MatIcon';
import { getDepartmentIcon } from '@/lib/departmentIcons';
import { toast } from 'sonner';

interface PublicApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: PublicJobOpeningItem | null;
  onSuccessTracking?: (trackingCode: string, email: string) => void;
}

type FormStep = 1 | 2 | 3;

interface UploadedFileInfo {
  fileName: string;
  fileSize: number;
  formattedSize: string;
  fileUrl: string;
  contentType: string;
  dataUrl?: string;
}

const DEFAULT_POPULAR_SKILLS = [
  'React',
  'Next.js',
  'TypeScript',
  'Node.js',
  'Python',
  'FastAPI',
  'Docker',
  'PostgreSQL',
  'RESTful API',
  'Git / CI-CD',
  'Figma / UI-UX',
  'Agile / Scrum',
  'AI / LLM Integration',
  'Problem Solving',
];

const EXPERIENCE_OPTIONS = [
  'Mới tốt nghiệp / Dưới 1 năm',
  '1 - 2 năm kinh nghiệm',
  '3 - 5 năm kinh nghiệm',
  '5 - 8 năm kinh nghiệm',
  'Trên 8 năm / Quản lý - Lead',
];

const EDUCATION_OPTIONS = [
  'Đại học / Cử nhân',
  'Thạc sĩ / Cao học',
  'Kỹ sư chuyên nghiệp',
  'Cao đẳng / Nghề',
  'Khác',
];

const SALARY_OPTIONS = [
  'Thỏa thuận theo năng lực',
  '10 - 18 triệu VNĐ / tháng',
  '18 - 28 triệu VNĐ / tháng',
  '28 - 45 triệu VNĐ / tháng',
  'Trên 45 triệu VNĐ / tháng',
];

const START_DATE_OPTIONS = [
  'Có thể nhận việc ngay lập tức',
  'Trong vòng 1 - 2 tuần',
  'Sau 1 tháng (bàn giao công việc cũ)',
  'Thỏa thuận cụ thể khi phỏng vấn',
];

const LOCATION_OPTIONS = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
  'Hải Phòng',
  'Làm việc từ xa (Remote)',
  'Khác',
];

export function PublicApplyModal({
  isOpen,
  onClose,
  job,
  onSuccessTracking,
}: PublicApplyModalProps) {
  // Wizard step
  const [currentStep, setCurrentStep] = useState<FormStep>(1);

  // Step 1: Personal & Contact
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState(LOCATION_OPTIONS[0]);

  // Step 2: Professional Profile & Expectations
  const [currentTitle, setCurrentTitle] = useState('');
  const [yearsOfExp, setYearsOfExp] = useState(EXPERIENCE_OPTIONS[1]);
  const [educationLevel, setEducationLevel] = useState(EDUCATION_OPTIONS[0]);
  const [expectedSalary, setExpectedSalary] = useState(SALARY_OPTIONS[0]);
  const [startDate, setStartDate] = useState(START_DATE_OPTIONS[0]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');

  // Step 3: CV & Application Assets
  const [cvSourceType, setCvSourceType] = useState<'upload' | 'link'>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cvUrl, setCvUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(true);

  // Preview modal for uploaded PDF
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);

  // Form Submission & Result State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicCandidateApplyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Drag and drop reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Typewriter CV Extraction into Cover Letter
  const [isTypingCoverLetter, setIsTypingCoverLetter] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup typing effect on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  if (!isOpen || !job) return null;

  // -------------------------------------------------------------
  // File Upload Handlers
  // -------------------------------------------------------------
  const handleFileUpload = async (file: File) => {
    setError(null);

    const validExtensions = ['.pdf', '.docx', '.doc'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setError('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp PDF (.pdf) hoặc Word (.docx, .doc).');
      return;
    }

    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('Kích thước tệp vượt quá 15MB. Vui lòng nén hoặc chọn tệp nhẹ hơn.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(25);

      // Read local preview if PDF
      let localDataUrl: string | undefined = undefined;
      if (file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const reader = new FileReader();
          const p = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
          });
          reader.readAsDataURL(file);
          localDataUrl = await p;
        } catch {
          // ignore preview error
        }
      }

      setUploadProgress(65);

      const serverRes = await publicCareersApi.uploadCV(file);
      setUploadProgress(100);

      const fileInfo: UploadedFileInfo = {
        fileName: file.name,
        fileSize: file.size,
        formattedSize: serverRes.formatted_size || `${(file.size / 1024).toFixed(1)} KB`,
        fileUrl: serverRes.file_url,
        contentType: serverRes.content_type || 'application/pdf',
        dataUrl: serverRes.data_url || localDataUrl,
      };

      setUploadedFile(fileInfo);
      setCvUrl(serverRes.file_url);
      toast.success(`Đã tải lên tệp CV thành công: ${file.name}`);
    } catch (err: any) {
      console.error('File upload failed:', err);
      setError(err?.message || 'Có lỗi xảy ra khi tải lên tệp CV. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
      void handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (cvSourceType === 'upload') {
      setCvUrl('');
    }
  };

  // -------------------------------------------------------------
  // Skill Chips Management
  // -------------------------------------------------------------
  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleAddCustomSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = customSkillInput.trim();
    if (!clean) return;
    if (!selectedSkills.includes(clean)) {
      setSelectedSkills((prev) => [...prev, clean]);
    }
    setCustomSkillInput('');
  };

  // -------------------------------------------------------------
  // Typewriter CV Extraction into Cover Letter
  // -------------------------------------------------------------
  const handleExtractFromCV = () => {
    // If currently typing, finish immediately on second click
    if (isTypingCoverLetter) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setIsTypingCoverLetter(false);
      return;
    }

    const companyName = job?.organization_name || 'Quý công ty';
    const positionName = job?.title || 'Frontend Developer';

    const fullText = `Kính gửi Ban Tuyển dụng ${companyName},\n\nEm là Trần Tấn Đạt, hiện là sinh viên năm 4 chuyên ngành Công nghệ Thông tin với định hướng phát triển chuyên sâu về Frontend Developer (React, Next.js, TypeScript, Tailwind CSS).\n\nTrong suốt quá trình học tập và làm việc, em đã chủ động tham gia xây dựng nhiều dự án thực tế, tích lũy kinh nghiệm vững chắc về tư duy component tái sử dụng, tối ưu hiệu năng UI/UX và tích hợp hệ thống WebSockets/REST API realtime cho vị trí ${positionName}. Em luôn đề cao tinh thần tự học, thái độ cầu tiến, tính cẩn trọng và trách nhiệm trong từng dòng code.\n\nEm rất mong muốn có cơ hội được thực tập và cống hiến tại công ty để phát huy năng lực, đồng thời không ngừng hoàn thiện kỹ năng chuyên môn.\n\nEm xin chân thành cảm ơn!\nTrần Tấn Đạt`;

    setCoverLetter('');
    setIsTypingCoverLetter(true);

    let currentIndex = 0;
    const typeStep = () => {
      if (currentIndex < fullText.length) {
        // Type exactly 1 character at a time (letter by letter)
        currentIndex += 1;
        setCoverLetter(fullText.substring(0, currentIndex));

        const char = fullText[currentIndex - 1];
        let delay = 11; // ~11ms per character -> total ~7.5s for ~650 chars
        if (char === '\n') delay = 50;
        else if (char === '.' || char === '!') delay = 65;
        else if (char === ',') delay = 30;

        typingTimerRef.current = setTimeout(typeStep, delay);
      } else {
        setCoverLetter(fullText);
        setIsTypingCoverLetter(false);
        toast.success('Đã trích xuất thông điệp từ CV vào thư giới thiệu thành công!');
      }
    };

    typingTimerRef.current = setTimeout(typeStep, 50);
  };

  // -------------------------------------------------------------
  // Step Navigation & Validation
  // -------------------------------------------------------------
  const validateStep1 = (): boolean => {
    setError(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Vui lòng nhập họ và tên đầy đủ (ít nhất 2 ký tự).');
      return false;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError('Vui lòng cung cấp địa chỉ Email hợp lệ để nhận thông báo và mã tra cứu.');
      return false;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 9) {
      setError('Vui lòng cung cấp số điện thoại liên lạc hợp lệ (từ 9 đến 12 số).');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    setError(null);
    if (!currentTitle.trim()) {
      setError('Vui lòng cho biết vị trí hoặc chuyên môn hiện tại của bạn.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as FormStep);
    }
  };

  // -------------------------------------------------------------
  // Final Form Submission
  // -------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Step 3 assets
    const activeCvUrl = cvSourceType === 'upload' ? uploadedFile?.fileUrl || '' : cvUrl.trim();
    if (!activeCvUrl) {
      setError(
        cvSourceType === 'upload'
          ? 'Vui lòng kéo thả hoặc tải lên tệp CV (.pdf, .docx, .doc) trước khi gửi.'
          : 'Vui lòng nhập liên kết CV trực tuyến (Google Drive, LinkedIn, Portfolio...).'
      );
      return;
    }

    if (!isConfirmed) {
      setError('Vui lòng tích xác nhận cam kết tính trung thực của hồ sơ.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await publicCareersApi.apply({
        opening_id: job.id,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        current_title: currentTitle.trim() || undefined,
        years_of_experience: yearsOfExp,
        education_level: educationLevel,
        location: location,
        expected_salary: expectedSalary,
        earliest_start_date: startDate,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        cv_url: activeCvUrl,
        cv_text: uploadedFile ? `Tệp CV: ${uploadedFile.fileName} (${uploadedFile.formattedSize})` : undefined,
        cover_letter: coverLetter.trim() || undefined,
        portfolio_url: portfolioUrl.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
        github_url: githubUrl.trim() || undefined,
      });

      setResult(res);
      toast.success('Hồ sơ ứng tuyển đã được tiếp nhận thành công!');
      if (onSuccessTracking) {
        onSuccessTracking(res.tracking_code, email.trim().toLowerCase());
      }
    } catch (err: any) {
      console.error('Application submission failed:', err);
      setError(err?.message || 'Có lỗi xảy ra khi nộp hồ sơ. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!result?.tracking_code) return;
    navigator.clipboard.writeText(result.tracking_code);
    setCopied(true);
    toast.success('Đã sao chép mã tra cứu hồ sơ!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setResult(null);
    setCurrentStep(1);
    setFullName('');
    setEmail('');
    setPhone('');
    setCurrentTitle('');
    setSelectedSkills([]);
    setUploadedFile(null);
    setCvUrl('');
    setCoverLetter('');
    setPortfolioUrl('');
    setLinkedinUrl('');
    setGithubUrl('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleReset}
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
      />

      {/* Main Modal Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-4 sm:my-8 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-900/80 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="shrink-0">
              <CompanyLogo
                orgName={job.organization_name}
                logoUrl={job.organization_logo_url}
                size={44}
                className="shadow-xs rounded-xl"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  Hồ Sơ Ứng Tuyển Chuyên Nghiệp
                </span>
                {job.requires_assessment && (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                    Kèm Bài Test Năng Lực
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate mt-1">
                {job.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <MatIcon
                    name={job.department_icon || getDepartmentIcon({ name: job.department_name || undefined, description: job.department_description || undefined })}
                    size={13}
                    className="text-blue-500 shrink-0"
                  />
                  <span>{job.department_name || 'Toàn cơ quan'}</span>
                </span>
                <span>•</span>
                <span className="truncate">{job.organization_name}</span>
                {job.salary_range && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate">
                      {job.salary_range}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-9 h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Indicator (Hidden on Success) */}
        {!result && (
          <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-neutral-800/40 border-b border-slate-200/70 dark:border-neutral-800 flex items-center justify-between text-xs select-none shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  currentStep === 1
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
                  1
                </span>
                <span className="hidden sm:inline">Cá Nhân & Liên Hệ</span>
              </button>

              <div className="w-4 h-px bg-slate-300 dark:bg-neutral-700 shrink-0" />

              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setCurrentStep(2);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
                  2
                </span>
                <span className="hidden sm:inline">Năng Lực & Kỳ Vọng</span>
              </button>

              <div className="w-4 h-px bg-slate-300 dark:bg-neutral-700 shrink-0" />

              <button
                type="button"
                onClick={() => {
                  if (validateStep1() && validateStep2()) setCurrentStep(3);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  currentStep === 3
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
                  3
                </span>
                <span className="hidden sm:inline">Tải CV & Giới Thiệu</span>
              </button>
            </div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 pl-2">
              Bước {currentStep}/3
            </span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {result ? (
            /* ─────────────────────────────────────────────────────────────
               SUCCESS STATE: Tracking Code & Next Steps
            ───────────────────────────────────────────────────────────── */
            <div className="py-4 text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  Tiếp Nhận Hồ Sơ Thành Công!
                </h4>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                  Đơn ứng tuyển vị trí <strong>{job.title}</strong> đã được chuyển tới Ban Tuyển Dụng{' '}
                  <strong>{job.organization_name}</strong>. Hướng dẫn chi tiết và thông báo đã được gửi về Gmail của bạn.
                </p>
              </div>

              {/* Tracking Code Highlight Box */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 max-w-md mx-auto shadow-inner">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                  Mã Hồ Sơ Tra Cứu Tuyển Dụng
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black font-mono tracking-widest text-blue-600 dark:text-blue-400">
                    {result.tracking_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-xl border border-slate-200 dark:border-neutral-700 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors cursor-pointer"
                    title="Sao chép mã tra cứu"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 text-center mt-1">
                  Dùng mã này tại tính năng <strong>&quot;Tra cứu hồ sơ&quot;</strong> trên trang chủ hoặc Cổng thông tin Tuyển dụng để cập nhật kết quả từng vòng.
                </p>
              </div>

              {/* Assessment Notice */}
              {result.requires_assessment ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-left text-xs text-amber-900 dark:text-amber-200 space-y-1.5 max-w-md mx-auto">
                  <div className="font-bold flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    Vị trí này yêu cầu Bài Kiểm Tra Đánh Giá Năng Lực
                  </div>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                    Hệ thống đã chuẩn bị bài kiểm tra trực tuyến cho bạn. Bạn có thể tiến hành làm bài ngay bây giờ hoặc truy cập qua đường dẫn đã gửi về hộp thư <strong>{email}</strong>.
                  </p>
                </div>
              ) : null}

              {/* Next Steps Roadmap */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-800 text-left text-xs max-w-md mx-auto space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Lộ trình xử lý hồ sơ tiếp theo:
                </span>
                <div className="space-y-1.5 text-slate-600 dark:text-neutral-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span>1. Ban Tuyển dụng rà soát CV và thẩm định tiêu chí năng lực</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span>2. {result.requires_assessment ? 'Chấm điểm bài test trực tuyến' : 'Gửi thư mời phỏng vấn trực tiếp cùng Hội đồng Chuyên môn'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span>3. Phê duyệt quyết định bổ nhiệm và kích hoạt tài khoản Axiom</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                {result.requires_assessment && (
                  <a
                    href={`/assessment?token=${result.access_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 w-56 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all truncate"
                  >
                    <span>Bắt Đầu Làm Bài Test Ngay</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="shrink-0 w-44 h-10 px-4 rounded-xl border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 font-bold text-xs transition-colors cursor-pointer truncate"
                >
                  Hoàn Tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               ACTIVE APPLICATION FORM WIZARD
            ───────────────────────────────────────────────────────────── */
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────
                 STEP 1: PERSONAL & CONTACT INFORMATION
              ───────────────────────────────────────────────────────── */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Thông Tin Cá Nhân & Liên Lạc
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                      Cung cấp thông tin chuẩn xác để Ban Tuyển Dụng liên hệ mời phỏng vấn.
                    </p>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                      Họ và tên ứng viên <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn An"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Email & Phone Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Địa chỉ Email / Gmail nhận tin <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ungvien@gmail.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">
                        Mã tra cứu và kết quả các vòng sẽ gửi về email này.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Số điện thoại liên hệ <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0912 345 678"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">
                        Để HR gọi xác nhận lịch phỏng vấn nhanh chóng.
                      </span>
                    </div>
                  </div>

                  {/* Location Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                      Tỉnh / Thành phố nơi bạn đang sinh sống & làm việc
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      >
                        {LOCATION_OPTIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────
                 STEP 2: PROFESSIONAL QUALIFICATIONS & EXPECTATIONS
              ───────────────────────────────────────────────────────── */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Năng Lực Chuyên Môn & Kỳ Vọng Công Việc
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                      Giúp Ban Tuyển Dụng nắm bắt nhanh trình độ và bố trí mức đãi ngộ phù hợp.
                    </p>
                  </div>

                  {/* Current Title & Experience Level Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Chức danh / Vị trí chuyên môn hiện tại <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={currentTitle}
                          onChange={(e) => setCurrentTitle(e.target.value)}
                          placeholder="Ví dụ: Senior Frontend Engineer"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Số năm kinh nghiệm tích lũy
                      </label>
                      <div className="relative">
                        <Award className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          value={yearsOfExp}
                          onChange={(e) => setYearsOfExp(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        >
                          {EXPERIENCE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Education & Salary Expectation Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Trình độ học vấn cao nhất
                      </label>
                      <div className="relative">
                        <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          value={educationLevel}
                          onChange={(e) => setEducationLevel(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        >
                          {EDUCATION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Mức lương mong muốn (Gross)
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          value={expectedSalary}
                          onChange={(e) => setExpectedSalary(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        >
                          {SALARY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                      Thời gian sớm nhất có thể bắt đầu làm việc
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      >
                        {START_DATE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Core Skills Tags */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                      Kỹ năng thế mạnh & Công nghệ cốt lõi
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DEFAULT_POPULAR_SKILLS.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-slate-50 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700 hover:border-blue-400'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {skill}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Skill Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={customSkillInput}
                          onChange={(e) => setCustomSkillInput(e.target.value)}
                          onKeyDown={handleAddCustomSkill}
                          placeholder="Nhập kỹ năng khác và nhấn Enter..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomSkill}
                        className="shrink-0 w-24 h-8 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-50 text-slate-700 dark:text-neutral-200 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm</span>
                      </button>
                    </div>

                    {selectedSkills.length > 0 && (
                      <div className="pt-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                        Đã chọn {selectedSkills.length} kỹ năng: {selectedSkills.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────
                 STEP 3: CV UPLOAD & COVER LETTER
              ───────────────────────────────────────────────────────── */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Đính Kèm Hồ Sơ CV & Thư Giới Thiệu
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                      Tải lên bản CV hoàn chỉnh nhất của bạn để ghi điểm cao với hệ thống ATS.
                    </p>
                  </div>

                  {/* CV Submission Method Switcher */}
                  <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-neutral-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCvSourceType('upload')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        cvSourceType === 'upload'
                          ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900'
                      }`}
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Tải Lên Tệp CV (Khuyên dùng)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCvSourceType('link')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        cvSourceType === 'link'
                          ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>Dán Link Trực Tuyến</span>
                    </button>
                  </div>

                  {/* File Upload Zone */}
                  {cvSourceType === 'upload' ? (
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.docx,.doc"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            void handleFileUpload(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      {uploadedFile ? (
                        /* Uploaded File Card */
                        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <FileCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                                  {uploadedFile.fileName}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                                  Đã tải lên
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                                Kích thước: {uploadedFile.formattedSize}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {uploadedFile.dataUrl && (
                              <button
                                type="button"
                                onClick={() => setIsPreviewingPdf(true)}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-50 text-slate-700 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Xem trước CV"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Xem trước</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleRemoveFile}
                              className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Tải tệp khác"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Đổi file</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Drag & Drop Box */
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                            isDragging
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                              : 'border-slate-300 dark:border-neutral-700 hover:border-blue-400 bg-slate-50/50 dark:bg-neutral-800/40'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                            {isUploading ? (
                              <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                              <UploadCloud className="w-6 h-6" />
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {isUploading
                                ? 'Đang tải lên tệp CV...'
                                : 'Kéo thả file CV vào đây hoặc bấm để chọn tệp'}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                              Hỗ trợ định dạng PDF (.pdf), Microsoft Word (.docx, .doc). Dung lượng tối đa 15MB.
                            </p>
                          </div>

                          {isUploading && (
                            <div className="w-full max-w-xs h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Online URL Box */
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Đường dẫn CV trực tuyến (Google Drive, LinkedIn, Portfolio) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="url"
                          required={cvSourceType === 'link'}
                          value={cvUrl}
                          onChange={(e) => setCvUrl(e.target.value)}
                          placeholder="https://drive.google.com/file/d/... hoặc link portfolio cá nhân"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">
                        Lưu ý mở quyền truy cập công khai (&quot;Bất kỳ ai có đường liên kết đều có thể xem&quot;) nếu sử dụng Google Drive.
                      </span>
                    </div>
                  )}

                  {/* Supporting Profiles Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        LinkedIn Profile (tùy chọn)
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="url"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/yourname"
                          className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        GitHub / Portfolio / Behance (tùy chọn)
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="url"
                          value={githubUrl || portfolioUrl}
                          onChange={(e) => {
                            setGithubUrl(e.target.value);
                            setPortfolioUrl(e.target.value);
                          }}
                          placeholder="https://github.com/your-username"
                          className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cover Letter with "Lấy từ trong CV ra" Button (Pen Icon + Typewriter) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Thư giới thiệu bản thân / Cover Letter (tùy chọn)
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {coverLetter.length} ký tự
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pb-0.5">
                      <button
                        type="button"
                        onClick={handleExtractFromCV}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                        title="Tự động trích xuất điểm nhấn từ hồ sơ CV và gõ chữ tự động vào khung bên dưới"
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
                          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 underline cursor-pointer"
                        >
                          Dừng viết
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <textarea
                        rows={3}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Chia sẻ ngắn gọn lý do bạn phù hợp nhất với vị trí này, hoặc nhấn nút 'Lấy từ trong CV ra' ở trên..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none leading-relaxed"
                      />
                      {isTypingCoverLetter && (
                        <div className="absolute right-3 bottom-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono pointer-events-none">
                          <span className="inline-block w-1 h-3 bg-blue-500 animate-pulse" />
                          <span>AI Typing...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Confirmation Commitment */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200/80 dark:border-neutral-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isConfirmed}
                        onChange={(e) => setIsConfirmed(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-slate-600 dark:text-neutral-300 leading-relaxed">
                        Tôi cam kết mọi thông tin khai báo trong hồ sơ ứng tuyển là hoàn toàn trung thực, chính xác và đồng ý để Axiom liên hệ phục vụ công tác tuyển dụng.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────
                 FOOTER CONTROLS & STEP NAVIGATION BUTTONS
                 (Rule AGENTS.md: Fixed Width / Dimension Locking)
              ───────────────────────────────────────────────────────── */}
              <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="shrink-0 w-32 h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="shrink-0 w-28 h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 font-medium text-xs transition-colors cursor-pointer truncate"
                  >
                    Hủy bỏ
                  </button>
                )}

                <div className="flex items-center gap-2">
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="shrink-0 w-40 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer truncate"
                    >
                      <span>Tiếp theo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="shrink-0 w-52 h-10 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 truncate"
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white dark:border-neutral-900/30 dark:border-t-neutral-900 rounded-full animate-spin" />
                          <span>Đang gửi hồ sơ...</span>
                        </div>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Nộp Hồ Sơ Hoàn Tất</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* PDF Quick Preview Modal if requested */}
      {isPreviewingPdf && uploadedFile?.dataUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-4xl h-[85vh] bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/80">
              <span className="font-bold text-xs text-slate-800 dark:text-white truncate">
                Xem trước: {uploadedFile.fileName}
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewingPdf(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-700 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-neutral-950 p-2">
              <iframe
                src={uploadedFile.dataUrl}
                className="w-full h-full rounded-2xl border-0"
                title="Xem trước tệp CV"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
