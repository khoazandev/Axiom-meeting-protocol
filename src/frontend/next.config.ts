import type { NextConfig } from 'next';
import path from 'path';

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname),
  skipTrailingSlashRedirect: true,
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/member',
        permanent: false,
      },
      {
        source: '/meetings',
        destination: '/member?tab=meetings',
        permanent: false,
      },
      {
        source: '/tasks',
        destination: '/member?tab=tasks',
        permanent: false,
      },
      {
        source: '/calendar',
        destination: '/member?tab=calendar',
        permanent: false,
      },
      {
        source: '/knowledge',
        destination: '/member?tab=knowledge',
        permanent: false,
      },
      {
        source: '/settings',
        destination: '/member?tab=settings',
        permanent: false,
      },
      {
        source: '/jira',
        destination: '/member?tab=jira',
        permanent: false,
      },
      {
        source: '/jira/:path*',
        destination: '/member?tab=jira',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
