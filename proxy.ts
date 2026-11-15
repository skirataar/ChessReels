import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/') {
    // If arriving with explicit onboarding or auth flow parameters, allow onboarding page to load
    const isExplicitFlow =
      searchParams.has('step') ||
      searchParams.has('mode') ||
      searchParams.has('google_onboarding') ||
      searchParams.has('oauth_error') ||
      searchParams.has('error');

    if (!isExplicitFlow) {
      // Check for active authentication session cookies
      const hasSessionCookie =
        Boolean(request.cookies.get('chess_reel_session')?.value) ||
        Boolean(request.cookies.get('better-auth.session_token')?.value) ||
        Boolean(request.cookies.get('__Secure-better-auth.session_token')?.value) ||
        Boolean(request.cookies.get('next-auth.session-token')?.value) ||
        Boolean(request.cookies.get('__Secure-next-auth.session-token')?.value) ||
        Boolean(request.cookies.get('doomchess_token')?.value) ||
        Boolean(request.cookies.get('chess_reel_oauth_user')?.value);

      const isPwaSource = searchParams.get('source') === 'pwa' || searchParams.has('pwa');

      if (hasSessionCookie || isPwaSource) {
        return NextResponse.redirect(new URL('/play', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
