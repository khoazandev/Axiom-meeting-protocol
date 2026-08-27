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
  title: 'Axiom - Intelligent Meetings',
  description:
    'On-premise video conferencing with native AI intelligence. Enforce agendas, transcribe securely, and capture structural data.',
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
    title: 'Axiom - Intelligent Meetings',
    description: 'On-premise video conferencing with native AI intelligence.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Axiom',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Axiom - Intelligent Meetings',
    description: 'On-premise video conferencing with native AI intelligence.',
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
    <html lang="en" className={`${plusJakarta.variable} h-full antialiased`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: set theme class before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('axiom_theme');if(t==='dark')document.documentElement.classList.add('dark');else if(t==='light'||!t)document.documentElement.classList.remove('dark');else if(t==='system'){if(window.matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
