import { NextRequest, NextResponse } from "next/server";
import { getPublicBaseUrl, buildPublicRedirectUrl } from "@/lib/authUrl";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const skillLevel = searchParams.get("skillLevel") || "intermediate";
  const guestId = searchParams.get("guestId") || "";
  const returnUrl = searchParams.get("returnUrl") || "/play";

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appUrl = getPublicBaseUrl(request);
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  // Encode state payload to maintain skill baseline, guest mapping, and initiating origin across OAuth redirect
  const statePayload = {
    nonce: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    skillLevel,
    guestId,
    returnUrl,
    origin: appUrl,
    redirectUri,
  };
  const encodedState = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  // Check if Google OAuth credentials are configured in environment
  if (!clientId || !clientSecret || clientId.includes("your-google-client-id")) {
    // If not configured, redirect back with informative message and offer setup instructions
    const fallbackUrl = buildPublicRedirectUrl(returnUrl, request);
    fallbackUrl.searchParams.set(
      "oauth_info",
      "google_credentials_required"
    );
    return NextResponse.redirect(fallbackUrl);
  }

  // Construct official Google OAuth 2.0 authorization URL
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", encodedState);
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("access_type", "online");

  const response = NextResponse.redirect(googleAuthUrl);

  // Store state in HTTP-only cookie for CSRF protection
  response.cookies.set("oauth_state", encodedState, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 15, // 15 minutes
  });

  return response;
}
