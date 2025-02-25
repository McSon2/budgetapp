import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Get the token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Get the callback URL if it exists
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.some(
    route =>
      pathname === route ||
      pathname.startsWith('/api/') ||
      pathname.includes('/_next/') ||
      pathname.includes('/favicon.ico') ||
      pathname.includes('.png') ||
      pathname.includes('.jpg') ||
      pathname.includes('.svg')
  );

  // Si l'utilisateur est sur la page d'accueil, rediriger vers le dashboard ou login
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect logic
  if (!token && !isPublicRoute) {
    // Redirect to login if trying to access a protected route without a token
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  if (token && (pathname === '/login' || pathname === '/register')) {
    // Redirect to dashboard or callback URL if already logged in and trying to access login/register
    const redirectUrl = new URL(decodeURIComponent(callbackUrl), request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
