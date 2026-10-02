import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { Toaster } from '@/components/ui/sonner';
import { GlobalErrorListener } from '@/components/shared/global-error-listener';

const beVietnam = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Axiom - Digital Enterprise OS',
  description:
    'Hệ điều hành doanh nghiệp số bảo mật On-Premise: Hội nghị WebRTC bảo mật, bóc tách công việc tự động với AI cục bộ, quản trị phòng ban và quy trình số.',
  manifest: '/manifest.json',
  keywords: [
    'doanh nghiệp số',
    'digital enterprise',
    'họp trực tuyến',
    'AI ghi chú',
    'biên bản họp',
    'LiveKit',
    'WebRTC',
  ],
  openGraph: {
    title: 'Axiom - Digital Enterprise OS',
    description: 'Nền tảng hệ điều hành doanh nghiệp số bảo mật on-premise với AI cục bộ.',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Axiom',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Axiom - Digital Enterprise OS',
    description: 'Nền tảng hệ điều hành doanh nghiệp số bảo mật on-premise với AI cục bộ.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${beVietnam.variable} ${plusJakarta.variable} h-full antialiased font-sans bg-background text-foreground`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols-Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Symbols-Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        {/* Anti-FOUC: set theme class before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('axiom_theme');var theme='dark';if(raw){if(raw.indexOf('{')===0){var data=JSON.parse(raw);theme=(data&&data.state&&data.state.theme)||'dark';}else{theme=raw;}}var isDark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(isDark){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster />
        <GlobalErrorListener />
      </body>
    </html>
  );
}
