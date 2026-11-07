import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Proxy — handles API proxying and route protection.
 *
 * In standalone mode, `rewrites` from next.config.ts do NOT work.
 * This proxy forwards /api/* and /ws/* requests to the backend at runtime.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proxy /api/* and /ws/* to the backend
  if (pathname.startsWith('/api/') || pathname.startsWith('/ws/')) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const target = new URL(pathname + request.nextUrl.search, backendUrl);
    return NextResponse.rewrite(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/ws/:path*'],
};
