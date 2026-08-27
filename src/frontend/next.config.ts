import type { NextConfig } from 'next';
import path from 'path';

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname),
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: path.resolve(__dirname),
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
};

export default nextConfig;
