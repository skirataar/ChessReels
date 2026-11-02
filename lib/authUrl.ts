import { NextRequest } from "next/server";

/**
 * Resolves the true base URL for OAuth callbacks and redirects dynamically based on where the user is calling from.
 * - If called from localhost:3000 directly: resolves to http://localhost:3000 (never leaks external tunnel).
 * - If called through Cloudflare tunnel / port forward / reverse proxy: resolves to the incoming proxy domain.
 * - If called from a custom production domain: resolves to that domain.
 */
export function getPublicBaseUrl(request: NextRequest): string {
  // 1. Check if request came through a reverse proxy / tunnel (Cloudflare, Nginx, Vercel, Caddy, etc.)
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedHost) {
    const isLocal = forwardedHost.startsWith("localhost") || forwardedHost.startsWith("127.0.0.1");
    const proto = forwardedProto || (isLocal ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }

  // 2. Direct host header from the caller's browser
  const hostHeader = request.headers.get("host")?.trim();
  if (hostHeader) {
    const isLocal = hostHeader.startsWith("localhost") || hostHeader.startsWith("127.0.0.1");
    const proto = forwardedProto || (isLocal ? "http" : "https");
    return `${proto}://${hostHeader}`;
  }

  // 3. Fallback to NEXT_PUBLIC_APP_URL if explicitly defined
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  // 4. Default fallback
  return request.nextUrl.origin || "http://localhost:3000";
}

/**
 * Builds a redirect URL guaranteed to match the caller's origin.
 * Accepts an optional overrideOrigin (e.g. preserved in OAuth state).
 */
export function buildPublicRedirectUrl(
  pathOrUrl: string,
  request: NextRequest,
  overrideOrigin?: string
): URL {
  const baseUrl = overrideOrigin || getPublicBaseUrl(request);

  try {
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
      const parsed = new URL(pathOrUrl);
      const isParsedLocalhost =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      const isBaseLocalhost =
        baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

      // Only rewrite if there is a mismatch between localhost and external proxy
      if (isParsedLocalhost && !isBaseLocalhost) {
        return new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, baseUrl);
      }
      return parsed;
    }

    const cleanPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return new URL(cleanPath, baseUrl);
  } catch {
    return new URL("/", baseUrl);
  }
}
