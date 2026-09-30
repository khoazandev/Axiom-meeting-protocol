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
    description: 'Khuôn mẫu tuyển dụng Ivy-League quốc tế. Tối ưu 100% cho thuật toán quét ATS, nhấn mạnh số liệu định lượng.',
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
    description: 'Thiết kế 2 cột đương đại với thanh sidebar tối màu chứa học vấn & kỹ năng, thân bài tập trung vào dự án và công nghệ.',
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
    description: 'Phong thái trang trọng, thanh lịch dành cho Giám đốc, Quản lý bộ phận, HR Manager và các vị trí lãnh đạo doanh nghiệp.',
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
    description: 'Trường phái thiết kế Thụy Sĩ với typography sắc sảo, không viền rườm rà, tập trung tuyệt đối vào giá trị cốt lõi.',
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
    description: 'Bố cục sáng tạo phá cách với thẻ showcase sản phẩm, phù hợp cho Designer, Product Designer và Art Directors.',
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
    description: 'Nhấn mạnh các chỉ số tăng trưởng sản phẩm, mở rộng quy mô kinh doanh và khả năng dẫn dắt tổ chức Agile.',
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
    description: 'Cấu trúc khối hình học chuẩn mực, trang nghiêm phù hợp ngành Ngân hàng, Kiểm toán, Quỹ đầu tư và Tư vấn tài chính.',
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
    description: 'Tập trung hiển thị thành tựu bán hàng định lượng, hạn mức KPI đạt được và khả năng thương thảo hợp đồng đối tác.',
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
    description: 'Lấy cảm hứng từ giao diện lập trình code terminal và hồ sơ GitHub, làm nổi bật các tech stack và repository.',
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
    description: 'Trình bày tư duy phân tích yêu cầu phần mềm, mô hình hóa quy trình BPMN, phân tích dữ liệu và quản trị backlog.',
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
