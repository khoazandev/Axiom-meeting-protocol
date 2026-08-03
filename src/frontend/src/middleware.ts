import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected route patterns
  const isProtectedRoute = pathname.startsWith('/meetings');

  // Check for authentication token in cookies
  const token = request.cookies.get('axiom_token')?.value;

  if (isProtectedRoute && !token) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/meetings/:path*'],
};
