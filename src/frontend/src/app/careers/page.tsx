'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Building2,
  Sparkles,
  Search,
  ArrowRight,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Award,
  Zap,
  Lock,
  Code2,
  Users2,
  TrendingUp,
  BrainCircuit,
  Compass,
  Check,
  Layers,
} from 'lucide-react';
import { HomeNavbar } from '@/components/home/HomeNavbar';
import { ChatAssistantFooter } from '@/components/home/ChatAssistantFooter';
import { PageFlipWrapper } from '@/components/home/PageFlipWrapper';
import { WholePageFlipWidget } from '@/components/home/WholePageFlipWidget';
import { PublicApplyModal } from '@/components/home/PublicApplyModal';
import { PublicTrackerModal } from '@/components/home/PublicTrackerModal';
import LottiePlayer from '@/components/LottiePlayer';
import animationData from '@/public/images/Monday Ahed.json';
import { CompanyLogo } from '@/lib/companyLogos';
import { MatIcon } from '@/components/ui/MatIcon';
import { getDepartmentIcon } from '@/lib/departmentIcons';
import {
  publicCareersApi,
  PublicJobOpeningItem,
  PublicDepartmentItem,
} from '@/lib/recruitment-api';

// Curated Enterprise Default Openings
const DEFAULT_OPENINGS: PublicJobOpeningItem[] = [
  {
    id: 'op-tech-fullstack',
    organization_id: 'org-axiom',
    organization_name: 'Axiom Digital Enterprise',
    department_id: 'dept-tech',
    department_name: 'Bộ Phận Kỹ Thuật & Công Nghệ',
    department_icon: 'code',
    title: 'Senior Fullstack Engineer (Next.js & Python FastAPI)',
    description: 'Thiết kế và tối ưu hóa nền tảng điều hành phân tán Axiom DX-OS, phát triển kiến trúc WebRTC đa luồng, tích hợp trợ lý AI agent và đồng bộ trạng thái thời gian thực.',
    requirements: '• 4+ năm kinh nghiệm phát triển phần mềm doanh nghiệp với Next.js/React và Python FastAPI.\n• Thành thạo kiến trúc Microservices, WebSockets, tối ưu hóa hiệu năng render.\n• Am hiểu an toàn thông tin, chuẩn mã hóa WebRTC/DTLS-SRTP và phân quyền RBAC.',
    salary_range: '38 - 58 Triệu VNĐ',
    level: 'Senior',
    work_type: 'Toàn thời gian (Hybrid)',
    location: 'Hà Nội / TP.HCM',
    benefits: '• Thưởng dự án và hiệu quả kinh doanh theo quý.\n• Cấp MacBook Pro M3 Max hoặc Workstation cao cấp.\n• Bảo hiểm sức khỏe VIP toàn diện PVI Diamond.',
    requires_assessment: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'op-tech-ai',
    organization_id: 'org-axiom',
    organization_name: 'Axiom Digital Enterprise',
    department_id: 'dept-tech',
    department_name: 'Bộ Phận Kỹ Thuật & Công Nghệ',
    department_icon: 'code',
    title: 'AI / LLM Systems Engineer (On-Premise Deployment)',
    description: 'Nghiên cứu, lượng tử hóa và triển khai các mô hình ngôn ngữ lớn (SLM/LLM) chạy on-premise an toàn nội bộ phục vụ bóc tách biên bản họp, trích xuất task Jira tự động.',
    requirements: '• Tối thiểu 2 năm kinh nghiệm thực chiến với PyTorch, vLLM, LangChain, RAG Pipelines.\n• Kinh nghiệm tối ưu hóa suy luận mô hình trên GPU NVIDIA (TensorRT-LLM, AWQ/GGUF).\n• Nắm vững các kỹ thuật tinh chỉnh LoRA/QLoRA cho tác vụ ngôn ngữ tiếng Việt.',
    salary_range: '42 - 68 Triệu VNĐ',
    level: 'Senior',
    work_type: 'Toàn thời gian',
    location: 'Hà Nội',
    benefits: '• Cụm máy chủ GPU NVIDIA chuyên dụng phục vụ nghiên cứu.\n• Cổ phần ESOP hấp dẫn dành cho kỹ sư nòng cốt.\n• Môi trường R&D độc lập và nguồn lực tối đa.',
    requires_assessment: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'op-biz-enterprise',
    organization_id: 'org-axiom',
    organization_name: 'Axiom Digital Enterprise',
    department_id: 'dept-biz',
    department_name: 'Bộ Phận Kinh Doanh & Tiếp Thị',
    department_icon: 'trending_up',
    title: 'Enterprise Solution Consultant (B2B SaaS / DX)',
    description: 'Tư vấn giải pháp chuyển đổi số toàn diện Axiom DX-OS cho các tập đoàn tài chính, ngân hàng và cơ quan ban ngành. Đàm phán và dẫn dắt các hợp đồng triển khai quy mô lớn.',
    requirements: '• 3+ năm kinh nghiệm bán hàng giải pháp B2B phần mềm doanh nghiệp hoặc hệ thống ERP.\n• Kỹ năng thuyết trình, lắng nghe và phân tích bài toán nghiệp vụ khách hàng xuất sắc.\n• Có mạng lưới quan hệ sâu rộng trong các doanh nghiệp vừa và lớn.',
    salary_range: '28 - 48 Triệu + Hoa hồng hấp dẫn',
    level: 'Senior',
    work_type: 'Toàn thời gian',
    location: 'Hà Nội / Toàn quốc',
    benefits: '• Cơ chế hoa hồng lũy tiến cao nhất thị trường.\n• Phụ cấp công tác và tiếp khách không giới hạn theo định mức.\n• Lộ trình thăng tiến lên Head of Enterprise Sales.',
    requires_assessment: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'op-hr-ta',
    organization_id: 'org-axiom',
    organization_name: 'Axiom Digital Enterprise',
    department_id: 'dept-hr',
    department_name: 'Bộ Phận Tài Chính & Nhân Sự',
    department_icon: 'badge',
    title: 'Talent Acquisition & People Operations Specialist',
    description: 'Vận hành quy trình tuyển dụng thông minh Axiom ATS, xây dựng khung năng lực rubric, điều phối hội đồng phỏng vấn và quản trị trải nghiệm ứng viên hàng đầu.',
    requirements: '• 2+ năm kinh nghiệm tuyển dụng kỹ thuật công nghệ (Tech TA) hoặc People Ops.\n• Thành thạo các phương pháp phỏng vấn theo hành vi (STAR) và đánh giá chuẩn khung năng lực.\n• Kỹ năng giao tiếp tinh tế, phong thái chuyên nghiệp và bảo mật thông tin.',
    salary_range: '20 - 30 Triệu VNĐ',
    level: 'Middle',
    work_type: 'Toàn thời gian',
    location: 'TP.HCM / Hà Nội',
    benefits: '• Tài trợ 100% chi phí các khóa học chứng chỉ nhân sự quốc tế (SHRM, HRCI).\n• Chế độ làm việc linh hoạt (Flexible Hours).\n• Khám sức khỏe định kỳ tại bệnh viện quốc tế.',
    requires_assessment: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'op-exec-strategy',
    organization_id: 'org-axiom',
    organization_name: 'Axiom Digital Enterprise',
    department_id: 'dept-exec',
    department_name: 'Ban Điều Hành',
    department_icon: 'corporate_fare',
    title: 'Chief Operating Officer / Enterprise Operations Lead',
    description: 'Đồng hành cùng Founder trong việc chuẩn hóa quy trình vận hành toàn diện, giám sát hiệu suất các bộ phận qua Axiom Command Dashboard và mở rộng quy mô tổ chức.',
    requirements: '• 5+ năm kinh nghiệm quản lý cấp cao tại các công ty công nghệ hoặc quỹ đầu tư.\n• Tư duy chiến lược xuất sắc, quyết đoán và có năng lực giải quyết các bài toán hóc búa.\n• Am hiểu sâu về quản trị tài chính, pháp lý doanh nghiệp và văn hóa tổ chức tinh gọn.',
    salary_range: 'Thỏa thuận theo năng lực & Cổ phần hóa',
    level: 'Lead / Executive',
    work_type: 'Toàn thời gian',
    location: 'Hà Nội',
    benefits: '• Gói cổ phần ESOP chiến lược.\n• Trực tiếp tham gia hoạch định tương lai sản phẩm và hệ sinh thái Axiom.\n• Toàn quyền tự chủ xây dựng đội ngũ vận hành.',
    requires_assessment: false,
    created_at: new Date().toISOString(),
  },
];

const LEVELS = [
  { id: 'all', label: 'Tất cả cấp bậc' },
  { id: 'Intern', label: 'Intern / Fresher' },
  { id: 'Junior', label: 'Junior' },
  { id: 'Middle', label: 'Middle' },
  { id: 'Senior', label: 'Senior' },
  { id: 'Lead', label: 'Lead / Principal' },
];

const getJobTechTags = (title: string, dept: string): string[] => {
  const t = title.toLowerCase();
  if (t.includes('fullstack')) return ['Next.js', 'React', 'Python', 'FastAPI', 'WebRTC', 'PostgreSQL'];
  if (t.includes('ai') || t.includes('llm')) return ['PyTorch', 'vLLM', 'LangChain', 'RAG Pipelines', 'NVIDIA GPU'];
  if (t.includes('b2b') || t.includes('consultant')) return ['B2B SaaS', 'Solution Selling', 'Enterprise DX', 'Negotiation'];
  if (t.includes('ta') || t.includes('talent') || t.includes('hr')) return ['Tech Recruiting', 'STAR Interviews', 'People Ops', 'Rubric ATS'];
  if (t.includes('coo') || t.includes('executive') || t.includes('lead')) return ['Operations', 'Strategy', 'Resource Allocation', 'DX Leadership'];
  return ['Enterprise OS', 'On-Premise', 'Collaboration'];
};

export default function CareersPage() {
  const [openings, setOpenings] = useState<PublicJobOpeningItem[]>(DEFAULT_OPENINGS);
  const [departmentsList, setDepartmentsList] = useState<PublicDepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Modals state
  const [applyingJob, setApplyingJob] = useState<PublicJobOpeningItem | null>(null);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [trackerCode, setTrackerCode] = useState<string>('');
  const [trackerEmail, setTrackerEmail] = useState<string>('');

  // Fetch openings & departments from API
  const loadOpenings = async () => {
    setIsLoading(true);
    try {
      const [openingsData, deptsData] = await Promise.all([
        publicCareersApi.getOpenings().catch(() => []),
        publicCareersApi.getDepartments().catch(() => []),
      ]);
      if (openingsData && openingsData.length > 0) {
        setOpenings(openingsData);
      } else {
        setOpenings(DEFAULT_OPENINGS);
      }
      if (deptsData && deptsData.length > 0) {
        setDepartmentsList(deptsData);
      }
    } catch {
      setOpenings(DEFAULT_OPENINGS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOpenings();
  }, []);

  // Dynamic Departments for filter pill tabs (loaded directly from Owner's department management)
  const displayedDepartments = useMemo(() => {
    const list: { id: string; name: string; icon: string }[] = [
      { id: 'all', name: 'Tất cả bộ phận', icon: 'apps' },
    ];
    if (departmentsList.length > 0) {
      departmentsList.forEach((d) => {
        list.push({
          id: d.id,
          name: d.name,
          icon: d.icon || getDepartmentIcon({ name: d.name, description: d.description }),
        });
      });
    } else {
      list.push(
        { id: 'dept-tech', name: 'Bộ Phận Kỹ Thuật & Công Nghệ', icon: 'code' },
        { id: 'dept-biz', name: 'Bộ Phận Kinh Doanh & Tiếp Thị', icon: 'trending_up' },
        { id: 'dept-hr', name: 'Bộ Phận Nhân Sự & Tuyển Dụng', icon: 'badge' },
        { id: 'dept-prod', name: 'Bộ Phận Sản Phẩm & Thiết Kế', icon: 'palette' },
        { id: 'dept-exec', name: 'Ban Điều Hành', icon: 'corporate_fare' }
      );
    }
    return list;
  }, [departmentsList]);

  // Filtered Openings
  const filteredOpenings = useMemo(() => {
    return openings.filter((job) => {
      // Department filter
      if (selectedDept !== 'all') {
        const selectedDeptObj = displayedDepartments.find((d) => d.id === selectedDept);
        const deptMatch =
          job.department_id === selectedDept ||
          (selectedDeptObj && job.department_name === selectedDeptObj.name) ||
          (selectedDept === 'dept-tech' && job.department_name?.includes('Kỹ Thuật')) ||
          (selectedDept === 'dept-biz' && job.department_name?.includes('Kinh Doanh')) ||
          (selectedDept === 'dept-hr' && (job.department_name?.includes('Nhân Sự') || job.department_name?.includes('Tài Chính'))) ||
          (selectedDept === 'dept-prod' && (job.department_name?.includes('Sản Phẩm') || job.department_name?.includes('Thiết Kế'))) ||
          (selectedDept === 'dept-exec' && job.department_name?.includes('Điều Hành'));
        if (!deptMatch) return false;
      }

      // Level filter
      if (selectedLevel !== 'all') {
        if (!job.level?.toLowerCase().includes(selectedLevel.toLowerCase())) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inTitle = job.title.toLowerCase().includes(query);
        const inDesc = (job.description || '').toLowerCase().includes(query);
        const inReq = (job.requirements || '').toLowerCase().includes(query);
        const inDept = (job.department_name || '').toLowerCase().includes(query);
        if (!inTitle && !inDesc && !inReq && !inDept) return false;
      }

      return true;
    });
  }, [openings, selectedDept, selectedLevel, searchQuery, displayedDepartments]);

  const handleApplySuccess = (code: string, email: string) => {
    setTrackerCode(code);
    setTrackerEmail(email);
    setApplyingJob(null);
    setIsTrackerOpen(true);
  };

  return (
    <PageFlipWrapper pageType="careers">
      <div className="min-h-screen bg-[#f8fafc] dark:bg-black text-slate-900 dark:text-neutral-100 selection:bg-indigo-600 selection:text-white transition-colors duration-300">
        <HomeNavbar />

        {/* 3D Whole Page Flip widget on the right edge */}
        <WholePageFlipWidget />

        <main className="pt-24 pb-20">
          {/* ── HERO BANNER: Digital Enterprise Recruiter ── */}
          <section className="relative px-6 sm:px-8 max-w-7xl mx-auto pt-6 pb-12 overflow-hidden">
            {/* Ambient Background Light Mesh */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[380px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/15 via-purple-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
              {/* Eyebrow Pill */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/5 dark:bg-white/10 border border-slate-300/80 dark:border-white/15 backdrop-blur-md text-[12px] font-semibold text-indigo-700 dark:text-indigo-300 mb-5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="uppercase tracking-widest font-mono">
                  Axiom Digital Enterprise • Cổng Tuyển Dụng
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.12]"
              >
                Gia Nhập Đội Ngũ Tiên Phong <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">
                  Hệ Điều Hành Doanh Nghiệp Axiom
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-5 text-base sm:text-lg text-slate-600 dark:text-neutral-300 max-w-2xl font-normal leading-relaxed"
              >
                Kiến tạo hạ tầng số on-premise bảo mật cao. Đánh giá thực chiến chuẩn rubric,
                tự động cấp quyền thành viên chính thức gửi qua Email.
              </motion.p>

              {/* CTA Action Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:gap-4 z-20"
              >
                <a
                  href="#openings-section"
                  className="flex items-center gap-2 h-12 px-6 rounded-full bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-slate-950 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
                >
                  <Briefcase className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                  <span>Xem Vị Trí Đang Mở ({filteredOpenings.length})</span>
                  <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center ml-1">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </a>

                <button
                  type="button"
                  onClick={() => setIsTrackerOpen(true)}
                  className="flex items-center gap-2 h-12 px-6 rounded-full border border-slate-300 dark:border-neutral-800 text-sm font-semibold text-slate-800 dark:text-neutral-200 bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
                >
                  <Search className="w-4 h-4 text-indigo-500" />
                  <span>Tra Cứu Hồ Sơ Ứng Tuyển</span>
                </button>
              </motion.div>

              {/* ── Walking Character (Monday Ahed) thay thế Trust Badges ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.35 }}
                className="relative w-full h-[280px] flex justify-center mt-6"
              >
                {/* Subtle Glow Background behind character */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[280px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-300/15 via-indigo-300/10 to-transparent blur-3xl rounded-full z-0 pointer-events-none" />

                {/* Central Walking Character */}
                <div className="relative z-10 w-[280px] flex items-end justify-center pb-2">
                  <LottiePlayer
                    animationData={animationData}
                    loop={true}
                    className="w-[260px] h-auto max-h-[260px]"
                  />
                </div>
              </motion.div>
            </div>
          </section>

          {/* ── SECTION: FILTER & DIRECTORY BAR (Zero CLS Compliant) ── */}
          <section id="openings-section" className="px-6 sm:px-8 max-w-7xl mx-auto py-4 scroll-mt-24">
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
              {/* Department Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-slate-100 dark:border-neutral-800/80 scrollbar-none">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 pl-1 pr-2 shrink-0">
                  Bộ Phận:
                </span>
                {displayedDepartments.map((dept) => {
                  const isSelected = selectedDept === dept.id;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setSelectedDept(dept.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                        isSelected
                          ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                          : 'bg-slate-100/80 dark:bg-neutral-800/70 text-slate-600 dark:text-neutral-300 hover:bg-slate-200/80 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <MatIcon
                        name={dept.icon}
                        size={16}
                        className={isSelected ? 'text-indigo-400 dark:text-indigo-600' : 'text-slate-400'}
                      />
                      <span>{dept.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Second Row: Search & Level Select */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo chức danh, kỹ năng (Next.js, Python, B2B, AI...)"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs font-medium text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {/* Level Dropdown */}
                <div className="w-full sm:w-48 shrink-0">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    title="Lọc theo cấp bậc ứng tuyển"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 truncate cursor-pointer"
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Refresh button */}
                <button
                  type="button"
                  onClick={loadOpenings}
                  disabled={isLoading}
                  title="Làm mới danh sách tin tuyển dụng"
                  className="w-11 h-11 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                >
                  <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Status counter */}
              <div className="flex items-center justify-between pt-3 text-[11px] text-slate-500 dark:text-neutral-400">
                <span>
                  Đang hiển thị <strong>{filteredOpenings.length}</strong> vị trí tuyển dụng chính thức
                </span>
                {(selectedDept !== 'all' || selectedLevel !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDept('all');
                      setSelectedLevel('all');
                      setSearchQuery('');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    Đặt lại bộ lọc
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ── SECTION: JOB OPENINGS LIST (Visual Rich with Company & Dept Logos) ── */}
          <section className="px-6 sm:px-8 max-w-7xl mx-auto py-6">
            {filteredOpenings.length === 0 ? (
              <div className="text-center py-20 bg-white/50 dark:bg-neutral-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-neutral-800">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-4">
                  <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Không tìm thấy vị trí phù hợp</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
                  Hãy thử điều chỉnh từ khóa tìm kiếm hoặc chọn &quot;Tất cả bộ phận&quot; để khám phá thêm cơ hội.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDept('all');
                    setSelectedLevel('all');
                    setSearchQuery('');
                  }}
                  className="mt-5 px-5 py-2.5 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold"
                >
                  Xem tất cả vị trí
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredOpenings.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  const isTech = job.department_name?.includes('Kỹ Thuật');
                  const isBiz = job.department_name?.includes('Kinh Doanh');
                  const isHR = job.department_name?.includes('Nhân Sự');
                  const isProd = job.department_name?.includes('Sản Phẩm') || job.department_name?.includes('Thiết Kế');

                  const deptIconName =
                    job.department_icon ||
                    getDepartmentIcon({
                      name: job.department_name || undefined,
                      description: job.department_description || undefined,
                    });

                  const deptColorClass = isTech
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
                    : isBiz
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60'
                    : isHR
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                    : isProd
                    ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/60'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60';

                  const techTags = getJobTechTags(job.title, job.department_name || '');

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      className="group p-1 rounded-3xl bg-gradient-to-b from-slate-200/70 via-slate-100/40 to-slate-200/50 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-900/70 border border-slate-300/60 dark:border-neutral-800 shadow-sm hover:shadow-xl transition-all duration-300"
                    >
                      <div className="p-6 sm:p-7 rounded-[calc(1.5rem-4px)] bg-white dark:bg-neutral-950 flex flex-col justify-between transition-colors">
                        {/* Top Row: Company Logo + Department Avatar + Title & Meta */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-neutral-800/80">
                          {/* Left: Logos & Title */}
                          <div className="flex items-start gap-4">
                            {/* Visual Company Logo */}
                            <div className="shrink-0">
                              <CompanyLogo
                                orgName={job.organization_name || 'Axiom Enterprise'}
                                logoUrl={job.organization_logo_url}
                                size={52}
                                className="shadow-xs"
                              />
                            </div>

                            {/* Title & Department Meta */}
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${deptColorClass}`}>
                                  <MatIcon name={deptIconName} size={14} className="shrink-0" />
                                  <span>{job.department_name || 'Bộ Phận Chuyên Môn'}</span>
                                </span>

                                {job.level && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                                    {job.level}
                                  </span>
                                )}

                                {job.requires_assessment && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    <span>Bài Test</span>
                                  </span>
                                )}
                              </div>

                              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {job.title}
                              </h2>

                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-neutral-400 pt-0.5">
                                {job.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{job.location}</span>
                                  </span>
                                )}
                                {job.work_type && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{job.work_type}</span>
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{job.organization_name || 'Axiom Digital Enterprise'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Salary & Apply Button */}
                          <div className="flex sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
                            {job.salary_range && (
                              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50 text-xs font-bold tracking-tight">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>{job.salary_range}</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setApplyingJob(job)}
                              className="flex items-center gap-2 h-10 pl-4 pr-2 rounded-full bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-slate-950 text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 group/btn"
                            >
                              <span>Ứng Tuyển Ngay</span>
                              <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center transition-transform group-hover/btn:translate-x-0.5">
                                <ArrowRight className="w-3 h-3" />
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Visual Tech Stack / Skill Badges (Chống tình trạng toàn chữ là chữ) */}
                        <div className="py-3 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-neutral-500 mr-1 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-indigo-500" />
                            Kỹ năng:
                          </span>
                          {techTags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 text-slate-700 dark:text-neutral-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Summary Description */}
                        {job.description && (
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-300 leading-relaxed my-2 font-normal">
                            {job.description}
                          </p>
                        )}

                        {/* Expandable Section: Full Requirements & Benefits */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                              className="overflow-hidden border-t border-slate-100 dark:border-neutral-800/80 pt-4 pb-2 space-y-4"
                            >
                              {/* Requirements */}
                              {job.requirements && (
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-2 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                    Yêu Cầu Chuyên Môn & Năng Lực
                                  </h4>
                                  <div className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line pl-2 bg-slate-50/80 dark:bg-neutral-900/60 p-4 rounded-xl border border-slate-200/60 dark:border-neutral-800">
                                    {job.requirements}
                                  </div>
                                </div>
                              )}

                              {/* Benefits */}
                              {job.benefits && (
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-2 flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                                    Quyền Lợi & Đãi Ngộ Dành Riêng
                                  </h4>
                                  <div className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line pl-2 bg-slate-50/80 dark:bg-neutral-900/60 p-4 rounded-xl border border-slate-200/60 dark:border-neutral-800">
                                    {job.benefits}
                                  </div>
                                </div>
                              )}

                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Card Action Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800/80">
                          {/* Toggle Expand */}
                          <button
                            type="button"
                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            <span>{isExpanded ? 'Thu gọn thông tin' : 'Xem chi tiết yêu cầu & đãi ngộ'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <div className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">
                            Đăng tuyển trực tiếp từ Bộ phận chuyên trách
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── SECTION: RECRUITMENT ROADMAP (Adaptive Light/Dark Theme - Sửa nền đen thành sáng/tối tự nhiên) ── */}
          <section className="px-6 sm:px-8 max-w-7xl mx-auto py-12">
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 shadow-sm relative overflow-hidden">
              {/* Subtle ambient light gradient */}
              <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl mb-10">
                <span className="text-xs font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                  QUY TRÌNH TUYỂN DỤNG MINH BẠCH
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-slate-950 dark:text-white">
                  5 Bước Gia Nhập Axiom Digital Enterprise
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 mt-2 font-normal leading-relaxed">
                  Chúng tôi tối giản hóa các thủ tục hành chính. Không cần tạo tài khoản trước, mọi thông báo và quyết định bổ nhiệm đều được xác thực minh bạch qua Email cá nhân của bạn.
                </p>
              </div>

              {/* 5-Step Adaptive Cards */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  {
                    step: '01',
                    title: 'Nộp Hồ Sơ',
                    desc: 'Điền form thông tin và link CV. Hệ thống tự động cấp mã Tracking AXM-... gửi qua email.',
                  },
                  {
                    step: '02',
                    title: 'Làm Bài Test',
                    desc: 'Thực hiện bài kiểm tra trắc nghiệm & năng lực thực tế. Giám sát tính liêm chính.',
                  },
                  {
                    step: '03',
                    title: 'Phỏng Vấn Online',
                    desc: 'Trao đổi chuyên môn qua phòng họp WebRTC bảo mật cao, có AI tóm tắt biên bản.',
                  },
                  {
                    step: '04',
                    title: 'Phê Duyệt Lãnh Đạo',
                    desc: 'Ban Điều Hành & Owner xem xét báo cáo tổng hợp năng lực và ký quyết định bổ nhiệm.',
                  },
                  {
                    step: '05',
                    title: 'Cấp Tài Khoản',
                    desc: 'Hệ thống tự động kích hoạt tài khoản Member, gửi thông tin và link magic login về Gmail.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex flex-col justify-between p-5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 relative hover:border-indigo-400/40 transition-colors"
                  >
                    <div>
                      <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mb-2 block">
                        {item.step}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{item.title}</h4>
                      <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed font-normal">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── SECTION: FAQ & COMMITMENT ── */}
          <section className="px-6 sm:px-8 max-w-7xl mx-auto py-10">
            <div className="max-w-3xl mx-auto text-center mb-8">
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Câu Hỏi Thường Gặp Về Cổng Tuyển Dụng
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Giải đáp mọi thắc mắc về cơ chế ứng tuyển, bài test và tài khoản nhân sự
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3.5">
              {[
                {
                  q: 'Tôi có cần đăng ký tài khoản trên Axiom trước khi ứng tuyển không?',
                  a: 'Không. Axiom hoạt động theo mô hình Doanh Nghiệp Số khép kín. Người ngoài không có quyền tự đăng ký tài khoản. Bạn chỉ cần chọn vị trí, điền họ tên, email, số điện thoại và link CV trên form ứng tuyển công khai để bắt đầu.',
                },
                {
                  q: 'Làm thế nào để theo dõi tiến độ hồ sơ của tôi?',
                  a: 'Sau khi nộp hồ sơ, bạn sẽ nhận được mã tra cứu (Tracking Code dạng AXM-XXXXX) gửi về Gmail. Bạn có thể bấm nút "Tra Cứu Hồ Sơ Ứng Tuyển" tại trang này và nhập email cùng mã để kiểm tra kết quả theo thời gian thực.',
                },
                {
                  q: 'Sau khi trúng tuyển, tôi sẽ nhận tài khoản làm việc như thế nào?',
                  a: 'Khi Owner và Ban Điều Hành phê duyệt quyết định bổ nhiệm, hệ thống tự động khởi tạo tài khoản User chính thức cho bạn với vai trò MEMBER. Thông tin đăng nhập kèm 1 link Đăng Nhập 1-Chạm (Magic Login) sẽ được gửi thẳng vào hòm thư Gmail của bạn.',
                },
                {
                  q: 'Chế độ giám sát bài test năng lực hoạt động ra sao?',
                  a: 'Các bài test yêu cầu ứng viên làm bài tập trung trên trình duyệt. Nếu phát hiện hành vi chuyển tab hoặc gian lận từ 3 lần trở lên, bài thi sẽ bị kết luận 0 điểm và tự động dừng ngay lập tức.',
                },
              ].map((faq, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-left"
                >
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                      Q
                    </span>
                    {faq.q}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-neutral-300 mt-2 pl-7 leading-relaxed font-normal">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* ── MODALS ── */}
        <PublicApplyModal
          isOpen={!!applyingJob}
          onClose={() => setApplyingJob(null)}
          job={applyingJob}
          onSuccessTracking={handleApplySuccess}
        />

        <PublicTrackerModal
          isOpen={isTrackerOpen}
          onClose={() => setIsTrackerOpen(false)}
          initialTrackingCode={trackerCode}
          initialEmail={trackerEmail}
        />

        <ChatAssistantFooter />
      </div>
    </PageFlipWrapper>
  );
}
