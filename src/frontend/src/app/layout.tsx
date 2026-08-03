import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/shared/error-boundary';

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Axiom — Họp thông minh',
  description:
    'Họp video trực tuyến với AI ghi chú tự động, phụ đề thời gian thực và biên bản họp tự động. Không phụ thuộc cloud bên ngoài.',
  manifest: '/manifest.json',
  keywords: [
    'họp trực tuyến',
    'video conferencing',
    'AI ghi chú',
    'biên bản họp',
    'LiveKit',
    'WebRTC',
  ],
  openGraph: {
    title: 'Axiom — Họp thông minh',
    description:
      'Họp video trực tuyến với AI ghi chú tự động. Không phụ thuộc cloud bên ngoài.',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Axiom',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Axiom — Họp thông minh',
    description:
      'Họp video trực tuyến với AI ghi chú tự động. Không phụ thuộc cloud bên ngoài.',
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
    <html lang="vi" className={`${plusJakarta.variable} h-full antialiased dark`}>
      <head>
        {/* Anti-FOUC: set theme class before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('axiom_theme');if(t==='light')document.documentElement.classList.remove('dark');else if(t==='dark'||!t)document.documentElement.classList.add('dark');else if(t==='system'){if(window.matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg-base text-text-primary">
        <ErrorBoundary>{children}</ErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
