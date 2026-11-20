import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isValidAuthToken(token?: string | null): boolean {
  if (!token) return false;
  const decoded = decodeURIComponent(token).trim();
  if (!decoded || decoded === 'undefined' || decoded === 'null') return false;
  if (
    decoded === 'guest-user' ||
    decoded === 'anonymous-guest' ||
    decoded.startsWith('guest_') ||
    decoded.startsWith('guest-')
  ) {
    return false;
  }
  return true;
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/') {
    // 1. Never redirect search crawlers or AdSense bots
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    const isBot =
      /googlebot|adsbot|mediapartners-google|google-display-ads-bot|feedfetcher-google|bingbot|yandex|baiduspider|slurp|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|crawler|spider/i.test(
        userAgent
      );
    if (isBot) {
      return NextResponse.next();
    }

    // 2. If arriving with explicit onboarding or auth flow parameters, allow onboarding page to load
    const isExplicitFlow =
      searchParams.has('step') ||
      searchParams.has('mode') ||
      searchParams.has('google_onboarding') ||
      searchParams.has('oauth_error') ||
      searchParams.has('error');

    if (!isExplicitFlow) {
      // 3. Strictly redirect ONLY authenticated, non-guest users
      const sessionCookie = request.cookies.get('chess_reel_session')?.value;
      const betterAuthToken =
        request.cookies.get('better-auth.session_token')?.value ||
        request.cookies.get('__Secure-better-auth.session_token')?.value;
      const nextAuthToken =
        request.cookies.get('next-auth.session-token')?.value ||
        request.cookies.get('__Secure-next-auth.session-token')?.value;
      const doomchessToken = request.cookies.get('doomchess_token')?.value;
      const oauthUserCookie = request.cookies.get('chess_reel_oauth_user')?.value;

      const hasValidUserSession =
        isValidAuthToken(sessionCookie) ||
        isValidAuthToken(betterAuthToken) ||
        isValidAuthToken(nextAuthToken) ||
        isValidAuthToken(doomchessToken) ||
        isValidAuthToken(oauthUserCookie);

      if (hasValidUserSession) {
        return NextResponse.redirect(new URL('/play', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
