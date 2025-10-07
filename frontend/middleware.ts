import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('admin_token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '') || '';

  // If visiting the dashboard root
  if (path === '/') {
    // Not logged in -> redirect to /login
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Logged in -> allow
    return NextResponse.next();
  }

  // If visiting the login page
  if (path === '/login') {
    // Logged in -> redirect to dashboard
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Not logged in -> allow
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login']
};
