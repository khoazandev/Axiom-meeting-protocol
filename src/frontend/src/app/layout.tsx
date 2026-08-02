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
  title: 'Axiom — Enterprise Meeting Protocol',
  description:
    'On-premise video conferencing with AI intelligence. Enforce agendas, transcribe securely, and capture structural data — zero external cloud dependency.',
  keywords: [
    'enterprise meeting',
    'on-premise video conferencing',
    'AI transcription',
    'meeting protocol',
    'LiveKit',
    'WebRTC',
  ],
  openGraph: {
    title: 'Axiom — Enterprise Meeting Protocol',
    description:
      'On-premise video conferencing with AI intelligence. Zero external cloud dependency.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Axiom',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Axiom — Enterprise Meeting Protocol',
    description:
      'On-premise video conferencing with AI intelligence. Zero external cloud dependency.',
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
    <html lang="en" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
