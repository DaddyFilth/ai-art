import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED  = ['/dashboard', '/generate', '/wallet', '/profile'];
const ADMIN_ONLY = ['/admin'];
const AUTH_ONLY  = ['/login', '/register', '/verify-email'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CVE-2025-29927 FIX: block middleware bypass header ──
  if (request.headers.has('x-middleware-subrequest')) {
    return new NextResponse(null, { status: 403 });
  }

  const token = request.cookies.get('access_token')?.value;
  const role  = request.cookies.get('user_role')?.value;

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAdminOnly = ADMIN_ONLY.some(p => pathname.startsWith(p));
  const isAuthOnly  = AUTH_ONLY.some(p => pathname.startsWith(p));

  if ((isProtected || isAdminOnly) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminOnly && role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (isAuthOnly && token) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
