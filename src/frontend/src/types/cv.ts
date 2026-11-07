export type CVTemplateId =
  | 'harvard'
  | 'modern'
  | 'minimalist'
  | 'executive'
  | 'designer'
  | 'founder'
  | 'banking'
  | 'sales'
  | 'aesthetic'
  | 'ba'
  | 'blank';

export type CVSection =
  | 'personal'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'awards'
  | 'custom_text';

export interface SocialLink {
  id: string;
  network: 'LinkedIn' | 'GitHub' | 'Website' | 'Twitter' | 'Facebook' | 'Other';
  url: string;
}

export interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl?: string;
  socials: SocialLink[];
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  description?: string;
  location?: string;
}

export interface Skill {
  id: string;
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: 'technical' | 'soft';
}

export interface Project {
  id: string;
  name: string;
  role?: string;
  description: string;
  technologies: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
}

export interface Language {
  id: string;
  name: string;
  level: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface CustomBlock {
  id: string;
  title: string;
  content: string;
  x?: number;
  y?: number;
}

export interface CVData {
  id?: string;
  title?: string;
  templateId: CVTemplateId;
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  languages: Language[];
  certifications: Certification[];
  awards: Award[];
  customBlocks?: CustomBlock[];
  sectionOrder: CVSection[];
}

export const DEFAULT_SECTION_ORDER: CVSection[] = [
  'personal',
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
  'certifications',
  'languages',
];

export const CV_SECTIONS_META: { id: CVSection; label: string; icon: string }[] = [
  { id: 'personal', label: 'Thông Tin Cá Nhân', icon: 'User' },
  { id: 'summary', label: 'Tóm Tắt & Mục Tiêu', icon: 'FileText' },
  { id: 'experience', label: 'Kinh Nghiệm Làm Việc', icon: 'Briefcase' },
  { id: 'projects', label: 'Dự Án Nổi Bật', icon: 'FolderKanban' },
  { id: 'education', label: 'Học Vấn & Bằng Cấp', icon: 'GraduationCap' },
  { id: 'skills', label: 'Kỹ Năng Chuyên Môn', icon: 'Zap' },
  { id: 'certifications', label: 'Chứng Chỉ Nghề Nghiệp', icon: 'Award' },
  { id: 'languages', label: 'Ngoại Ngữ', icon: 'Globe' },
];

export interface TemplateCatalogItem {
  id: CVTemplateId;
  name: string;
  category: string;
  tags: string[];
  description: string;
  badge: string;
  badgeColor: string;
  atsScore: number;
  accentColor: string;
  imageUrl: string;
  isPopular?: boolean;
}

export const CV_TEMPLATES_CATALOG: TemplateCatalogItem[] = [
  {
    id: 'harvard',
    name: 'Harvard Ivy-League Standard',
    category: 'Harvard / Academic',
    tags: ['Harvard / Academic', '1 Cột Chuẩn Mực', 'ATS 99%', 'Học Thuật'],
    description:
      'Khuôn mẫu tuyển dụng Ivy-League quốc tế. Tối ưu 100% cho thuật toán quét ATS, nhấn mạnh số liệu định lượng.',
    badge: 'CHUẨN IVY-LEAGUE',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    atsScore: 99,
    accentColor: '#111827',
    imageUrl: '/templates/lapras.jpg',
    isPopular: true,
  },
  {
    id: 'modern',
    name: 'Modern Tech Lead & Engineer',
    category: 'Tech & IT',
    tags: ['Tech & IT', '2 Cột', 'Sidebar Nổi Bật', 'Dự Án'],
    description:
      'Thiết kế 2 cột đương đại với thanh sidebar tối màu chứa học vấn & kỹ năng, thân bài tập trung vào dự án và công nghệ.',
    badge: 'BEST FOR DEVS',
    badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    atsScore: 96,
    accentColor: '#4f46e5',
    imageUrl: '/templates/ditgar.jpg',
    isPopular: true,
  },
  {
    id: 'executive',
    name: 'Executive Corporate & HR',
    category: 'Executive / Quản Lý',
    tags: ['Executive / Quản Lý', 'Quản Trị Cấp Cao', 'Navy Blue', 'Lãnh Đạo'],
    description:
      'Phong thái trang trọng, thanh lịch dành cho Giám đốc, Quản lý bộ phận, HR Manager và các vị trí lãnh đạo doanh nghiệp.',
    badge: 'C-LEVEL & LEAD',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    atsScore: 97,
    accentColor: '#1e3a8a',
    imageUrl: '/templates/scizor.jpg',
    isPopular: true,
  },
  {
    id: 'minimalist',
    name: 'Minimal Clean Editorial',
    category: 'Minimalist / Đơn Giản',
    tags: ['Minimalist / Đơn Giản', 'Thụy Sĩ', 'Tối Giản', 'Tinh Tế'],
    description:
      'Trường phái thiết kế Thụy Sĩ với typography sắc sảo, không viền rườm rà, tập trung tuyệt đối vào giá trị cốt lõi.',
    badge: 'MINIMAL ELEGANT',
    badgeColor: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    atsScore: 95,
    accentColor: '#334155',
    imageUrl: '/templates/ditto.jpg',
  },
  {
    id: 'designer',
    name: 'Creative UI/UX & Art Portfolio',
    category: 'Creative & Design',
    tags: ['Creative & Design', 'Visual Grid', 'Portfolio', 'Màu Sắc'],
    description:
      'Bố cục sáng tạo phá cách với thẻ showcase sản phẩm, phù hợp cho Designer, Product Designer và Art Directors.',
    badge: 'CREATIVE CHOICE',
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    atsScore: 91,
    accentColor: '#9333ea',
    imageUrl: '/templates/chikorita.jpg',
  },
  {
    id: 'founder',
    name: 'Bold Founder & Product Lead',
    category: 'Startup & Founder',
    tags: ['Startup & Founder', 'ARR / Metrics', 'High Impact', 'Chiến Lược'],
    description:
      'Nhấn mạnh các chỉ số tăng trưởng sản phẩm, mở rộng quy mô kinh doanh và khả năng dẫn dắt tổ chức Agile.',
    badge: 'HIGH IMPACT',
    badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
    atsScore: 94,
    accentColor: '#ea580c',
    imageUrl: '/templates/gengar.jpg',
  },
  {
    id: 'banking',
    name: 'Geometric Finance & Banking',
    category: 'Banking & Finance',
    tags: ['Banking & Finance', 'Đối Xứng', 'Tài Chính', 'Chuẩn Mực'],
    description:
      'Cấu trúc khối hình học chuẩn mực, trang nghiêm phù hợp ngành Ngân hàng, Kiểm toán, Quỹ đầu tư và Tư vấn tài chính.',
    badge: 'FINANCE READY',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    atsScore: 98,
    accentColor: '#b45309',
    imageUrl: '/templates/bronzor.jpg',
  },
  {
    id: 'sales',
    name: 'Modern Sales & Business Dev',
    category: 'Modern Sales',
    tags: ['Modern Sales', 'KPI Doanh Thu', 'Chỉ Số', 'Tăng Trưởng'],
    description:
      'Tập trung hiển thị thành tựu bán hàng định lượng, hạn mức KPI đạt được và khả năng thương thảo hợp đồng đối tác.',
    badge: 'REVENUE FOCUSED',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    atsScore: 95,
    accentColor: '#059669',
    imageUrl: '/templates/kakuna.jpg',
  },
  {
    id: 'aesthetic',
    name: 'Aesthetic Terminal Developer',
    category: 'Tech & IT',
    tags: ['Tech & IT', 'Monospace', 'Code Snippets', 'Terminal'],
    description:
      'Lấy cảm hứng từ giao diện lập trình code terminal và hồ sơ GitHub, làm nổi bật các tech stack và repository.',
    badge: 'DEV TERMINAL',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    atsScore: 93,
    accentColor: '#0891b2',
    imageUrl: '/templates/azurill.jpg',
  },
  {
    id: 'ba',
    name: 'Business Analyst & Strategy',
    category: 'Creative & Design',
    tags: ['Creative & Design', 'Quy Trình', 'Sơ Đồ', 'Data Flow'],
    description:
      'Trình bày tư duy phân tích yêu cầu phần mềm, mô hình hóa quy trình BPMN, phân tích dữ liệu và quản trị backlog.',
    badge: 'ANALYST PRO',
    badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    atsScore: 96,
    accentColor: '#0d9488',
    imageUrl: '/templates/onyx.jpg',
  },
];

export interface CVIdentitySeed {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
}

export function createEmptyCVData(seed: CVIdentitySeed = {}): CVData {
  return {
    templateId: 'harvard',
    title: 'CV chưa đặt tên',
    personalInfo: {
      fullName: seed.fullName?.trim() ?? '',
      title: seed.title?.trim() ?? '',
      email: seed.email?.trim() ?? '',
      phone: seed.phone?.trim() ?? '',
      location: '',
      avatarUrl: '',
      socials: [],
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
    certifications: [],
    awards: [],
    customBlocks: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}

export function getTemplateSampleData(
  templateId: CVTemplateId = 'harvard',
  seed: CVIdentitySeed = {}
): CVData {
  const isDev = ['modern', 'aesthetic'].includes(templateId);
  const isFinance = templateId === 'banking';
  const isSales = templateId === 'sales';
  const isDesigner = templateId === 'designer';
  const isBA = templateId === 'ba';
  const isExec = templateId === 'executive' || templateId === 'founder';

  const defaultTitle = isSales
    ? 'Giám Đốc Phát Triển Kinh Doanh (Head of BD)'
    : isFinance
    ? 'Chuyên Viên Phân Tích Đầu Tư & Tài Chính Cấp Cao'
    : isDesigner
    ? 'Senior UI/UX & Product Designer'
    : isBA
    ? 'Lead Business Analyst & Product Owner'
    : isExec
    ? 'Head of Engineering / Technical Director'
    : 'Senior Fullstack Software Engineer';

  const defaultSummary = isSales
    ? 'Chuyên gia tăng trưởng doanh thu B2B với 6+ năm kinh nghiệm mở rộng thị trường SaaS doanh nghiệp, đạt 180% KPI trung bình liên tiếp 3 năm. Kỹ năng dẫn dắt đội ngũ 15 chuyên viên kinh doanh và đàm phán hợp đồng chiến lược quy mô 10+ tỷ VNĐ.'
    : isFinance
    ? 'Chuyên gia phân tích tài chính với 5+ năm kinh nghiệm định giá tài sản, thẩm định dòng tiền dự án và quản trị rủi ro tại các tổ chức ngân hàng hàng đầu. Thành thạo mô hình hóa tài chính DCF/LBO, báo cáo kiểm toán IFRS.'
    : isDesigner
    ? 'Nhà thiết kế sản phẩm số với 5+ năm kinh nghiệm kiến tạo trải nghiệm người dùng trực quan cho ứng dụng FinTech và SaaS. Thành thạo Figma Design System, Wireframing, User Journey Mapping và kiểm thử khả dụng sản phẩm.'
    : isBA
    ? 'Chuyên gia phân tích nghiệp vụ phần mềm với 5+ năm kinh nghiệm cầu nối giữa khối nghiệp vụ và kỹ thuật. Thành thạo mô hình hóa BPMN, quản trị Backlog Scrum/Agile và đặc tả tài liệu kỹ thuật BRD/SRS/User Stories chuẩn mực.'
    : 'Kỹ sư phần mềm cao cấp với hơn 5 năm kinh nghiệm thiết kế và mở rộng hệ thống microservices phân tán chịu tải cao (100k+ CCU). Thành thạo TypeScript, Next.js, Python FastAPI, PostgreSQL và Docker/Kubernetes. Đam mê tối ưu hiệu năng và ứng dụng AI thực tiễn.';

  return {
    templateId,
    title: `Bản CV Chuẩn Mẫu - ${seed.fullName || 'Ứng Viên Tiềm Năng'}`,
    personalInfo: {
      fullName: seed.fullName?.trim() || 'Nguyễn Văn An',
      title: seed.title?.trim() || defaultTitle,
      email: seed.email?.trim() || 'nguyen.an@example.com',
      phone: seed.phone?.trim() || '0912 345 678',
      location: 'Hà Nội / TP. Hồ Chí Minh, Việt Nam',
      avatarUrl: '',
      socials: [
        { id: 'soc_1', network: 'LinkedIn', url: 'linkedin.com/in/nguyen-an-pro' },
        { id: 'soc_2', network: 'GitHub', url: 'github.com/nguyenan-dev' },
      ],
    },
    summary: defaultSummary,
    experience: [
      {
        id: 'exp_1',
        company: 'Axiom Enterprise Vietnam',
        position: isSales
          ? 'Trưởng Phòng Phát Triển Thị Trường (Senior BD)'
          : isFinance
          ? 'Chuyên Viên Phân Tích Thẩm Định Cấp Cao'
          : isDesigner
          ? 'Lead Product Designer'
          : isBA
          ? 'Senior Business Analyst'
          : 'Lead Fullstack Software Engineer',
        location: 'Hà Nội, Việt Nam',
        startDate: '2023',
        endDate: 'Hiện tại',
        isCurrent: true,
        description: isSales
          ? '• Lãnh đạo đội ngũ kinh doanh mở rộng thị phần sản phẩm AI B2B tại khu vực miền Bắc, mang về hơn 18 tỷ VNĐ doanh thu năm 2024.\n• Thiết lập quy trình tiếp cận khách hàng trọng điểm (Key Accounts) và ký kết thành công 24 hợp đồng doanh nghiệp lớn.\n• Tối ưu tỷ lệ chốt sales từ 14% lên 28% qua việc tinh chỉnh giải pháp demo kỹ thuật.'
          : isFinance
          ? '• Thực hiện định giá danh mục đầu tư trị giá 450 tỷ VNĐ bằng mô hình DCF và phương pháp định giá so sánh P/E, P/B.\n• Xây dựng báo cáo thẩm định rủi ro tài chính phục vụ phê duyệt cấp tín dụng cho 30+ dự án công nghệ lớn.\n• Tối ưu quy trình báo cáo dòng tiền nội bộ giúp giảm 40% thời gian tổng hợp số liệu kế toán hàng quý.'
          : '• Chỉ đạo kiến trúc hệ thống họp trực tuyến bảo mật On-Premise kết hợp AI Whisper STT và Next.js.\n• Tối ưu thời gian phản hồi API xuống dưới 45ms, nâng khả năng chịu tải đồng thời lên hơn 250%.\n• Xây dựng và chuẩn hóa quy trình CI/CD Docker Compose tự động, giảm thời gian triển khai từ 4 giờ xuống còn 15 phút.',
      },
      {
        id: 'exp_2',
        company: 'VinTech Solutions JSC',
        position: isSales
          ? 'Chuyên Viên Bán Hàng Giải Pháp SaaS'
          : isFinance
          ? 'Chuyên Viên Tài Chính Dự Án'
          : isDesigner
          ? 'UI/UX Designer'
          : isBA
          ? 'Associate Business Analyst'
          : 'Senior Frontend & Backend Engineer',
        location: 'TP. Hồ Chí Minh',
        startDate: '2021',
        endDate: '2023',
        isCurrent: false,
        description:
          '• Trực tiếp phát triển và vận hành hệ thống dữ liệu doanh nghiệp phục vụ hơn 500,000 lượt truy cập hàng tháng.\n• Tối ưu chỉ số hiệu năng Web Vitals (LCP < 1.2s, CLS = 0), nâng điểm Google Lighthouse lên 98/100.\n• Phối hợp chặt chẽ cùng Product Manager và đội ngũ QA kiểm soát lỗi phát sinh trước khi release.',
      },
    ],
    education: [
      {
        id: 'edu_1',
        school: 'Đại Học Bách Khoa Hà Nội',
        degree: 'Kỹ sư Công Nghệ Thông Tin (GPA: 3.65/4.0)',
        field: 'Hệ Thống Thông Tin & Khoa Học Máy Tính',
        location: 'Hà Nội',
        startDate: '2016',
        endDate: '2021',
        description: 'Tốt nghiệp loại Giỏi. Đạt giải Ba cuộc thi Olympic Tin học sinh viên toàn quốc.',
      },
    ],
    skills: [
      { id: 'sk_1', name: 'TypeScript / JavaScript', category: 'technical', level: 'expert' },
      { id: 'sk_2', name: 'React / Next.js 15', category: 'technical', level: 'expert' },
      { id: 'sk_3', name: 'Python / FastAPI', category: 'technical', level: 'advanced' },
      { id: 'sk_4', name: 'PostgreSQL & Redis', category: 'technical', level: 'advanced' },
      { id: 'sk_5', name: 'Docker & Kubernetes', category: 'technical', level: 'advanced' },
      { id: 'sk_6', name: 'Giao Tiếp & Lãnh Đạo Nhóm', category: 'soft', level: 'expert' },
      { id: 'sk_7', name: 'Quản Trị Dự Án Agile / Scrum', category: 'soft', level: 'advanced' },
    ],
    projects: [
      {
        id: 'prj_1',
        name: 'Hệ Thống Họp Trực Tuyến Doanh Nghiệp Axiom',
        role: 'Lead Architect',
        description:
          'Nền tảng họp On-Premise thời gian thực với WebRTC, tích hợp AI trích xuất biên bản họp tự động và quản lý phòng ban an toàn.',
        technologies: ['TypeScript', 'Next.js', 'FastAPI', 'PostgreSQL', 'Docker Compose'],
        startDate: '2023',
        endDate: '2024',
        link: 'https://axiom-protocol.local',
      },
      {
        id: 'prj_2',
        name: 'Trợ Lý AI Thẩm Định ATS & CV Builder Trực Quan',
        role: 'Fullstack Engineer',
        description:
          'Module phân tích hồ sơ ứng viên theo thang điểm ATS, phát hiện thiếu sót từ khóa và cung cấp công cụ vẽ CV trực quan kiểu Canva.',
        technologies: ['React', 'TailwindCSS', 'OpenAI API', 'Zustand'],
        startDate: '2024',
        endDate: '2024',
      },
    ],
    languages: [
      { id: 'lang_1', name: 'Tiếng Việt', level: 'Bản ngữ' },
      { id: 'lang_2', name: 'Tiếng Anh', level: 'IELTS 7.5 (Làm việc chuyên nghiệp)' },
    ],
    certifications: [
      {
        id: 'cert_1',
        name: 'AWS Certified Solutions Architect – Associate',
        issuer: 'Amazon Web Services',
        date: '2023',
      },
      {
        id: 'cert_2',
        name: 'Scrum Master Professional (PSM I)',
        issuer: 'Scrum.org',
        date: '2022',
      },
    ],
    awards: [
      {
        id: 'aw_1',
        title: 'Nhân Viên Xuất Sắc Của Năm (Employee of the Year)',
        issuer: 'Axiom Tech Corporation',
        date: '2024',
        description: 'Đóng góp xuất sắc trong việc triển khai thành công cụm hệ thống họp trực tuyến bảo mật cao.',
      },
    ],
    customBlocks: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}

export function applyCandidateSeedToCV(cvData: CVData, seed: CVIdentitySeed): CVData {
  return {
    ...cvData,
    personalInfo: {
      ...cvData.personalInfo,
      fullName: seed.fullName?.trim() || cvData.personalInfo.fullName,
      email: seed.email?.trim() || cvData.personalInfo.email,
      phone: seed.phone?.trim() || cvData.personalInfo.phone,
      title: seed.title?.trim() || cvData.personalInfo.title,
    },
    title: seed.fullName ? `Bản CV - ${seed.fullName}` : cvData.title,
  };
}

