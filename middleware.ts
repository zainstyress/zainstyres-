/**
 * middleware.ts (root level)
 * Protects /checkout, /track-order, and /admin routes.
 * Admin routes return 403 if authenticated but not admin.
 */
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const adminCookie = req.cookies.get('admin_session')?.value === 'true';

  // 1. Admin routes logic
  if (pathname.startsWith('/admin')) {
    const isAdmin = (session?.user as any)?.role === 'admin' || adminCookie;
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/khelgavalo', req.url));
    }
    return NextResponse.next();
  }

  // 2. Protected customer routes logic
  const protectedPaths = ['/checkout', '/track-order', '/order-confirmation'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/checkout/:path*', '/track-order/:path*', '/admin/:path*', '/order-confirmation/:path*'],
};
