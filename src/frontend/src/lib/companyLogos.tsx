import React from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomIcon } from '@/components/AxiomLogo';

export interface CompanyBrand {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  logoUrl?: string;
  logoBg: string;
  accentColor: string;
  iconName: string;
  industry: string;
  website: string;
  headquarters: string;
  size: string;
}

export const COMPANY_BRANDS: Record<string, CompanyBrand> = {
  'Axiom Enterprise': {
    id: 'axiom-enterprise',
    name: 'Axiom Enterprise',
    shortName: 'AXIOM',
    tagline: 'Digital Enterprise Protocol & Sovereign Meeting OS',
    logoBg: 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-500',
    accentColor: '#3b82f6',
    iconName: 'shield_person',
    industry: 'Enterprise Software & Security',
    website: 'https://axiom.enterprise',
    headquarters: 'Keangnam Landmark 72, Hà Nội',
    size: '500 - 1.000 nhân viên',
  },
  'Axiom Digital Enterprise': {
    id: 'axiom-digital-enterprise',
    name: 'Axiom Digital Enterprise',
    shortName: 'AXIOM',
    tagline: 'Digital Enterprise Protocol & Sovereign Meeting OS',
    logoBg: 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-500',
    accentColor: '#3b82f6',
    iconName: 'shield_person',
    industry: 'Enterprise Software & Security',
    website: 'https://axiom.enterprise',
    headquarters: 'Keangnam Landmark 72, Hà Nội',
    size: '500 - 1.000 nhân viên',
  },
  'VNG Corporation': {
    id: 'vng-corp',
    name: 'VNG Corporation',
    shortName: 'VNG',
    tagline: 'Embracing Challenges, Connecting People',
    logoBg: 'bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400',
    accentColor: '#f97316',
    iconName: 'sports_esports',
    industry: 'Gaming, Fintech & Cloud',
    website: 'https://vng.com.vn',
    headquarters: 'VNG Campus, Quận 7, TP. Hồ Chí Minh',
    size: '3.500+ nhân viên',
  },
  'FPT Software': {
    id: 'fpt-software',
    name: 'FPT Software',
    shortName: 'FPT',
    tagline: 'Powering Digital Transformation Worldwide',
    logoBg: 'bg-gradient-to-tr from-blue-600 via-emerald-500 to-orange-500',
    accentColor: '#059669',
    iconName: 'code',
    industry: 'Information Technology & Global Outsourcing',
    website: 'https://fptsoftware.com',
    headquarters: 'FPT Tower, Cầu Giấy, Hà Nội',
    size: '30.000+ nhân viên',
  },
  'Viettel Solutions': {
    id: 'viettel-solutions',
    name: 'Viettel Solutions',
    shortName: 'VIETTEL',
    tagline: 'Tiên phong kiến tạo xã hội số',
    logoBg: 'bg-gradient-to-tr from-rose-700 via-red-600 to-amber-600',
    accentColor: '#e11d48',
    iconName: 'cell_tower',
    industry: 'Telecommunications & Smart City',
    website: 'https://solutions.viettel.vn',
    headquarters: 'Tòa nhà Viettel, Cầu Giấy, Hà Nội',
    size: '10.000+ nhân viên',
  },
  'VinAI Research': {
    id: 'vinai-research',
    name: 'VinAI Research',
    shortName: 'VINAI',
    tagline: 'Leading AI Innovations & Autonomous Systems',
    logoBg: 'bg-gradient-to-tr from-violet-700 via-purple-600 to-cyan-500',
    accentColor: '#8b5cf6',
    iconName: 'neurology',
    industry: 'Artificial Intelligence & Smart Mobility',
    website: 'https://vinai.io',
    headquarters: 'Vinhomes Riverside, Long Biên, Hà Nội',
    size: '200 - 500 chuyên gia AI',
  },
  'Techcombank Digital': {
    id: 'techcombank-digital',
    name: 'Techcombank Digital',
    shortName: 'TCB',
    tagline: 'Be Greater Everyday with Modern Digital Banking',
    logoBg: 'bg-gradient-to-tr from-red-600 via-rose-700 to-neutral-900',
    accentColor: '#dc2626',
    iconName: 'account_balance',
    industry: 'Digital Banking & Financial Services',
    website: 'https://techcombank.com',
    headquarters: 'Quang Trung, Hoàn Kiếm, Hà Nội',
    size: '12.000+ nhân viên',
  },
};

/**
 * Get company brand details by organization name.
 * If company is not in preset catalog, generates consistent brand styles.
 */
export function getCompanyBrand(orgName?: string | null): CompanyBrand {
  if (!orgName) {
    return COMPANY_BRANDS['Axiom Enterprise'];
  }

  // Exact match
  if (COMPANY_BRANDS[orgName]) {
    return COMPANY_BRANDS[orgName];
  }

  // Partial match
  const lower = orgName.toLowerCase();
  for (const [key, brand] of Object.entries(COMPANY_BRANDS)) {
    if (lower.includes(key.toLowerCase()) || lower.includes(brand.shortName.toLowerCase())) {
      return brand;
    }
  }

  // Generate dynamic branded configuration for any custom organization
  let hash = 0;
  for (let i = 0; i < orgName.length; i++) {
    hash = orgName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = [
    { bg: 'bg-gradient-to-tr from-blue-600 to-indigo-700', color: '#2563eb', icon: 'domain' },
    { bg: 'bg-gradient-to-tr from-emerald-600 to-teal-700', color: '#059669', icon: 'business' },
    { bg: 'bg-gradient-to-tr from-violet-600 to-purple-800', color: '#7c3aed', icon: 'corporate_fare' },
    { bg: 'bg-gradient-to-tr from-amber-600 to-orange-700', color: '#d97706', icon: 'apartment' },
    { bg: 'bg-gradient-to-tr from-rose-600 to-pink-700', color: '#e11d48', icon: 'hub' },
  ];
  const chosen = palettes[Math.abs(hash) % palettes.length];

  return {
    id: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: orgName,
    shortName: orgName.slice(0, 4).toUpperCase(),
    tagline: 'Doanh nghiệp đối tác tuyển dụng trên Axiom DX-OS',
    logoBg: chosen.bg,
    accentColor: chosen.color,
    iconName: chosen.icon,
    industry: 'Doanh nghiệp Công nghệ & Dịch vụ',
    website: 'https://enterprise.axiom.internal',
    headquarters: 'Việt Nam',
    size: '100 - 500 nhân viên',
  };
}

/**
 * Dedicated visual Company Logo Component
 */
export function CompanyLogo({
  orgName,
  logoUrl,
  size = 40,
  className = '',
}: {
  orgName?: string | null;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const brand = getCompanyBrand(orgName);
  const effectiveLogoUrl = logoUrl || brand.logoUrl;
  const [imgError, setImgError] = React.useState(false);

  if (effectiveLogoUrl && !imgError && (effectiveLogoUrl.startsWith('http') || effectiveLogoUrl.startsWith('data:') || effectiveLogoUrl.startsWith('/'))) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-center shrink-0 select-none ${className}`}
        title={brand.name}
      >
        <img
          src={effectiveLogoUrl}
          alt={brand.name}
          className="w-full h-full object-contain p-1"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Official Axiom vector logo fallback
  if (brand.name.toLowerCase().includes('axiom')) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-50 to-slate-100 dark:from-blue-950/40 dark:to-neutral-900 shadow-xs flex items-center justify-center shrink-0 select-none p-1.5 ${className}`}
        title={brand.name}
      >
        <AxiomIcon size={Math.round(size * 0.75)} />
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-2xl ${brand.logoBg} p-0.5 shadow-xs flex items-center justify-center shrink-0 select-none ${className}`}
      title={brand.name}
    >
      <div className="w-full h-full rounded-[14px] bg-white/10 dark:bg-black/20 backdrop-blur-xs flex items-center justify-center text-white font-black text-xs">
        <MatIcon name={brand.iconName || 'shield_person'} size={Math.round(size * 0.5)} className="text-white drop-shadow-xs" />
      </div>
    </div>
  );
}
