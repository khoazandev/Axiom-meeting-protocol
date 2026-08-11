import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';

const nextConfig: NextConfig = {
  output: 'standalone',
  skipTrailingSlashRedirect: true,
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
};

export default nextConfig;
