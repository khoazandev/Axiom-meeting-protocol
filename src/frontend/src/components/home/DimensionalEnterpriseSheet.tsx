'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCw,
  Briefcase,
  Building2,
  ShieldCheck,
  Cpu,
  Video,
  Kanban,
  Users,
  Search,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  Lock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  publicCareersApi,
  PublicJobOpeningItem,
} from '@/lib/recruitment-api';
import { PublicApplyModal } from './PublicApplyModal';
import { PublicTrackerModal } from './PublicTrackerModal';

// Sample enterprise job openings fallback
const FALLBACK_OPENINGS: PublicJobOpeningItem[] = [
  {
    id: 'op-1',
    organization_id: 'org-axiom',
    organization_name: 'Axiom Digital Enterprise',
    department_id: 'dept-tech',
    department_name: 'Kỹ Thuật & Công Nghệ',
    title: 'Senior Fullstack Engineer (Next.js & Python)',
    description: 'Xây dựng kiến trúc điều hành doanh nghiệp phân tán, tối ưu hóa WebRTC mesh và tích hợp mô hình AI agent cục bộ.',
    requirements: 'Tối thiểu 3 năm kinh nghiệm với React/Next.js, FastAPI hoặc Django, kiến trúc Microservices và WebSockets.',
    salary_range: '35 - 55 Triệu VNĐ',
    level: 'Senior',
    work_type: 'Full-time / Hybrid',
    location: 'Hà Nội / TP.HCM',
    benefits: 'Bảo hiểm cao cấp, Mac Studio M3 Max, thưởng dự án theo quý.',
    requires_assessment: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'op-2',
    organization_id: 'org-axiom',
    organization_name: 'Axiom Digital Enterprise',
    department_id: 'dept-tech',
    department_name: 'Kỹ Thuật & Công Nghệ',
    title: 'AI / LLM Systems Engineer',
    description: 'Nghiên cứu và tinh chỉnh các mô hình ngôn ngữ lớn (SLM/LLM) chạy on-premise phục vụ trích xuất biên bản họp và trợ lý điều hành.',
    requirements: 'Kinh nghiệm với PyTorch, vLLM, LangChain, RAG pipelines và tối ưu hóa suy luận mô hình trên GPU.',
    salary_range: '40 - 65 Triệu VNĐ',
    level: 'Middle / Senior',
    work_type: 'Full-time',
    location: 'Hà Nội',
    benefits: 'Cụm GPU máy chủ riêng, cơ hội dẫn dắt sản phẩm lõi AI Enterprise.',
    requires_assessment: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'op-3',
    organization_id: 'org-axiom',
    organization_name: 'Axiom Digital Enterprise',
    department_id: 'dept-hr',
    department_name: 'Tài Chính & Nhân Sự',
    title: 'Talent Acquisition & HR Operations Specialist',
    description: 'Vận hành quy trình tuyển dụng thông minh, điều phối phỏng vấn trực tuyến và quản trị trải nghiệm ứng viên.',
    requirements: 'Kinh nghiệm 2+ năm trong tuyển dụng ngành công nghệ, am hiểu các công cụ ATS và đánh giá năng lực theo khung rubric.',
    salary_range: '18 - 28 Triệu VNĐ',
    level: 'Middle',
    work_type: 'Full-time',
    location: 'TP.HCM',
    benefits: 'Phụ cấp đào tạo chuyên môn, chế độ làm việc linh hoạt.',
    requires_assessment: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'op-4',
    organization_id: 'org-axiom',
    organization_name: 'Axiom Digital Enterprise',
    department_id: 'dept-biz',
    department_name: 'Kinh Doanh & Tiếp Thị',
    title: 'Enterprise Solution Consultant (B2B)',
    description: 'Tư vấn giải pháp chuyển đổi số và triển khai Axiom OS cho các tập đoàn và cơ quan chính phủ.',
    requirements: 'Kỹ năng thuyết trình xuất sắc, am hiểu kiến trúc phần mềm doanh nghiệp và an toàn thông tin.',
    salary_range: '25 - 45 Triệu + Thưởng KPI',
    level: 'Senior',
    work_type: 'Full-time',
    location: 'Hà Nội / Toàn quốc',
    benefits: 'Hoa hồng doanh số hấp dẫn, hỗ trợ công tác phí tối đa.',
    requires_assessment: false,
    created_at: new Date().toISOString(),
  },
];

export function DimensionalEnterpriseSheet() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [openings, setOpenings] = useState<PublicJobOpeningItem[]>([]);
  const [loadingOpenings, setLoadingOpenings] = useState(false);

  // Filters
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedJobForApply, setSelectedJobForApply] = useState<PublicJobOpeningItem | null>(null);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [trackingPrefill, setTrackingPrefill] = useState({ code: '', email: '' });

  // Fetch openings
  useEffect(() => {
    async function loadOpenings() {
      try {
        setLoadingOpenings(true);
        const data = await publicCareersApi.getOpenings();
        if (data && data.length > 0) {
          setOpenings(data);
        } else {
          setOpenings(FALLBACK_OPENINGS);
        }
      } catch (err) {
        setOpenings(FALLBACK_OPENINGS);
      } finally {
        setLoadingOpenings(false);
      }
    }
    loadOpenings();
  }, []);

  // Filtered Openings
  const filteredOpenings = openings.filter((item) => {
    const matchDept = selectedDept === 'ALL' || item.department_name?.includes(selectedDept) || item.department_id === selectedDept;
    const matchLevel = selectedLevel === 'ALL' || item.level?.toLowerCase().includes(selectedLevel.toLowerCase());
    const matchSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.requirements?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchLevel && matchSearch;
  });

  const handleOpenTracker = (code = '', email = '') => {
    setTrackingPrefill({ code, email });
    setIsTrackerOpen(true);
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Dimensional Page Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        {/* Toggle Mode Segmented Controller */}
        <div className="flex items-center p-1 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 shadow-sm backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setIsFlipped(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !isFlipped
                ? 'bg-slate-900 dark:bg-white text-white dark:text-neutral-950 shadow-sm'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Mặt Trước: Giới Thiệu Doanh Nghiệp</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFlipped(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isFlipped
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Mặt Sau: Cơ Hội Việc Làm & Tuyển Dụng</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenTracker()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 hover:bg-slate-50 dark:hover:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-300 transition-colors shadow-2xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-blue-500" />
            <span>Tra Cứu Tiến Độ Hồ Sơ</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer group active:scale-95"
            title="Lật sang mặt đối diện của trang giấy"
          >
            <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            <span>Lật Trang (3D Flip)</span>
          </button>
        </div>
      </div>

      {/* 3D Dimensional Card Flip Container */}
      <div className="relative w-full [perspective:2600px] min-h-[920px]">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 1 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full h-full min-h-[920px] rounded-3xl"
        >
          {/* ══════════════════════════════════════════════════════════════════
              SIDE A: FRONT FACE — DIGITAL ENTERPRISE OS SHOWCASE
             ══════════════════════════════════════════════════════════════════ */}
          <div
            style={{ backfaceVisibility: 'hidden' }}
            className="w-full bg-white dark:bg-[#0a0a0c] border border-slate-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-10 md:p-14 shadow-2xl relative overflow-hidden"
          >
            {/* Interactive Corner Peel Tag (Lật trang nhanh) */}
            <div
              onClick={() => setIsFlipped(true)}
              className="absolute -top-1 -right-1 w-28 h-28 overflow-hidden z-20 cursor-pointer group"
              title="Click để lật trang xem tin tuyển dụng"
            >
              <div className="absolute top-0 right-0 w-0 h-0 border-t-[80px] border-t-blue-600/90 border-l-[80px] border-l-transparent group-hover:border-t-blue-500 transition-all drop-shadow-md" />
              <div className="absolute top-3 right-2 text-[10px] font-black text-white uppercase tracking-tighter rotate-45 select-none text-right leading-3">
                Tuyển dụng<br />2026 ↗
              </div>
            </div>

            {/* Ambient Background Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Front Hero Header */}
            <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5 pt-4 pb-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>AXIOM DIGITAL ENTERPRISE OS • NỀN TẢNG ĐIỀU HÀNH TỰ CHỦ</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                Hệ Điều Hành Doanh Nghiệp Toàn Diện
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 mt-1">
                  Chủ Quyền Dữ Liệu & AI Tự Trị
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
                Hợp nhất hội nghị truyền hình WebRTC bảo mật cao, trợ lý AI trích xuất biên bản tự động, quản trị phân quyền ma trận phòng ban và quản lý dự án Kanban trên một hạ tầng duy nhất.
              </p>

              {/* Action Buttons on Front */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFlipped(true)}
                  className="w-full sm:w-64 h-11 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                >
                  <span>Xem Cơ Hội Việc Làm (Mặt Sau)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  href="/login"
                  className="w-full sm:w-56 h-11 px-5 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đăng Nhập Không Gian Nội Bộ</span>
                </Link>
              </div>
            </div>

            {/* Bento Grid: 4 Core Pillars */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {/* Pillar 1: WebRTC Sovereign Mesh */}
              <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 space-y-3 group hover:border-blue-500/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sovereign WebRTC Mesh Conference
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Hạ tầng hội nghị truyền hình thời gian thực độ trễ dưới 100ms. Dữ liệu âm thanh và hình ảnh được mã hóa đầu cuối (E2EE), vận hành 100% tự chủ trên hạ tầng của doanh nghiệp mà không qua máy chủ bên thứ ba.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  <span>100% On-Premise Sovereignty</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>

              {/* Pillar 2: AI Meeting Protocol & Real-time MoM */}
              <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 space-y-3 group hover:border-indigo-500/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Meeting Co-Pilot & Real-time MoM
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Tự động chuyển âm thanh thành văn bản đa ngữ, định danh người phát biểu và trích xuất biên bản họp tức thì. Tự động phát hiện cam kết và chuyển hóa thành nhiệm vụ có deadline cụ thể.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  <span>Automated Minutes & Action Items</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>

              {/* Pillar 3: Department RBAC & Matrix Governance */}
              <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 space-y-3 group hover:border-emerald-500/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Phân Quyền Ma Trận & Quản Trị Bộ Phận
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Mô hình kiểm soát truy cập dựa trên vai trò nghiêm ngặt (OWNER, ADMIN, MANAGER, MEMBER). Đảm bảo từng phòng ban chỉ xem và quản lý dữ liệu thuộc phạm vi thẩm quyền được phân định.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span>Strict Zero-Trust RBAC</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>

              {/* Pillar 4: Enterprise Kanban & Sprint Execution */}
              <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 space-y-3 group hover:border-amber-500/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Kanban className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bảng Điều Phối Kanban & Sprint Trực Tuyến
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Tích hợp liền mạch giữa cuộc họp và tiến độ dự án. Kéo thả công việc, phân bổ người phụ trách, liên kết bằng chứng âm thanh trực tiếp vào từng issue để kiểm tra nguồn gốc quyết định.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <span>Agile & Meeting-Driven Tasks</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Bottom Flip Prompt Footer */}
            <div className="relative z-10 mt-8 pt-6 border-t border-slate-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Kiến trúc bảo mật cấp doanh nghiệp • Tuân thủ chuẩn ISO/IEC 27001</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <span>Xem thông tin tuyển dụng & Nộp CV tại mặt sau</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              SIDE B: BACK FACE (FLIPPED 180 DEG) — CAREERS & TALENT HUB
             ══════════════════════════════════════════════════════════════════ */}
          <div
            style={{
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
            }}
            className="absolute inset-0 w-full h-full bg-[#fafbfd] dark:bg-[#09090b] border border-blue-200/70 dark:border-neutral-800 rounded-3xl p-6 sm:p-10 md:p-12 shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            {/* Interactive Corner Peel Tag (Lật về mặt trước) */}
            <div
              onClick={() => setIsFlipped(false)}
              className="absolute -top-1 -right-1 w-28 h-28 overflow-hidden z-20 cursor-pointer group"
              title="Click để lật về trang giới thiệu"
            >
              <div className="absolute top-0 right-0 w-0 h-0 border-t-[80px] border-t-slate-800 dark:border-t-neutral-700 border-l-[80px] border-l-transparent group-hover:border-t-slate-900 transition-all drop-shadow-md" />
              <div className="absolute top-3 right-2 text-[10px] font-black text-white uppercase tracking-tighter rotate-45 select-none text-right leading-3">
                Axiom OS<br />Mặt trước ↖
              </div>
            </div>

            {/* Back Header */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-neutral-800">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wide mb-2">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>AXIOM TALENT & CAREERS HUB • ĐỢT TUYỂN DỤNG 2026</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    Cơ Hội Nghề Nghiệp & Gia Nhập Axiom
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 mt-1">
                    Ứng tuyển trực tiếp bằng biểu mẫu dưới đây (không cần tạo tài khoản). Kết quả đánh giá và tài khoản làm việc sẽ được chuyển giao qua Gmail.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenTracker()}
                    className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-blue-500" />
                    <span>Tra Cứu Hồ Sơ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFlipped(false)}
                    className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <span>↩ Lật Mặt Trước</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo chức danh, kỹ năng..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Dept Filter */}
                <div className="relative">
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Tất cả Bộ Phận</option>
                    <option value="Kỹ Thuật">Kỹ Thuật & Công Nghệ</option>
                    <option value="Nhân Sự">Tài Chính & Nhân Sự</option>
                    <option value="Kinh Doanh">Kinh Doanh & Tiếp Thị</option>
                    <option value="Ban Điều Hành">Ban Điều Hành</option>
                  </select>
                </div>

                {/* Level Filter */}
                <div className="relative">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Tất cả Cấp Bậc (Level)</option>
                    <option value="Intern">Thực tập sinh (Intern)</option>
                    <option value="Junior">Junior</option>
                    <option value="Middle">Middle</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead / Trưởng nhóm</option>
                  </select>
                </div>
              </div>

              {/* Job Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                {filteredOpenings.map((job) => (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between shadow-xs hover:shadow-md group"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10.5px] font-bold">
                          {job.department_name || 'Bộ Phận Chuyên Môn'}
                        </span>
                        {job.level && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-[10.5px] font-semibold">
                            {job.level}
                          </span>
                        )}
                        {job.requires_assessment && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Bài Test
                          </span>
                        )}
                      </div>

                      {/* Job Title */}
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {job.title}
                      </h4>

                      {/* Snippet Description */}
                      <p className="text-xs text-slate-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                        {job.description || job.requirements || 'Cơ hội phát triển nghề nghiệp cùng Axiom Digital Enterprise.'}
                      </p>

                      {/* Meta Pills (Salary, Location, Type) */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-neutral-400">
                        {job.salary_range && (
                          <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <DollarSign className="w-3 h-3" />
                            {job.salary_range}
                          </span>
                        )}
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {job.location}
                          </span>
                        )}
                        {job.work_type && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {job.work_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card CTA */}
                    <div className="pt-4 mt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                        {job.organization_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedJobForApply(job)}
                        className="w-36 h-8 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>Ứng Tuyển Ngay</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredOpenings.length === 0 && (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-700 dark:text-neutral-300">
                    Không tìm thấy vị trí tuyển dụng phù hợp với bộ lọc.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDept('ALL');
                      setSelectedLevel('ALL');
                      setSearchQuery('');
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Xóa bộ lọc tìm kiếm
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Sub-footer on Back */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-neutral-400">
              <span>
                Axiom Careers • Mọi thông tin ứng viên được mã hóa bảo mật và chỉ sử dụng cho mục đích thẩm định tuyển dụng.
              </span>
              <button
                type="button"
                onClick={() => setIsFlipped(false)}
                className="font-bold text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Quay lại Giới thiệu Doanh nghiệp ➔
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Public Application Modal */}
      <PublicApplyModal
        isOpen={Boolean(selectedJobForApply)}
        onClose={() => setSelectedJobForApply(null)}
        job={selectedJobForApply}
        onSuccessTracking={(code, email) => handleOpenTracker(code, email)}
      />

      {/* Public Tracking Modal */}
      <PublicTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        initialTrackingCode={trackingPrefill.code}
        initialEmail={trackingPrefill.email}
      />
    </div>
  );
}
