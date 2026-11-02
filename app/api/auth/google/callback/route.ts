import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPublicBaseUrl, buildPublicRedirectUrl } from "@/lib/authUrl";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // 1. Decode state payload first to restore original initiating origin
  let stateData: {
    mode?: string;
    skillLevel?: string;
    startingElo?: number;
    targetElo?: number;
    theme?: string;
    guestId?: string;
    returnUrl?: string;
    origin?: string;
    redirectUri?: string;
  } = {};

  if (state) {
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    } catch {
      console.warn("Could not parse OAuth state parameter.");
    }
  }

  const originBase = stateData.origin || getPublicBaseUrl(request);
  const redirectUri = stateData.redirectUri || `${originBase}/api/auth/google/callback`;
  const mode = stateData.mode || "signup";
  const skillLevel = stateData.skillLevel || "intermediate";
  const returnTarget = stateData.returnUrl || "/play";

  // 2. Handle error returned by Google
  if (error) {
    console.error("Google OAuth returned an error:", error);
    const returnUrl = buildPublicRedirectUrl("/", request, originBase);
    returnUrl.searchParams.set("oauth_error", error);
    return NextResponse.redirect(returnUrl);
  }

  if (!code) {
    const returnUrl = buildPublicRedirectUrl(returnTarget, request, originBase);
    returnUrl.searchParams.set("oauth_error", "missing_authorization_code");
    return NextResponse.redirect(returnUrl);
  }

  try {
    let googleId: string;
    let email: string;
    let name: string;
    let avatar: string;

    if (code.startsWith("test_mock_code_") && process.env.NODE_ENV !== "production") {
      const mockSuffix = code.replace("test_mock_code_", "");
      googleId = `mock_gid_${mockSuffix}`;
      email = `test_${mockSuffix}@gmail.com`;
      name = `Mock User ${mockSuffix}`;
      avatar = "♟";
    } else {
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

      if (!clientId || !clientSecret) {
        const returnUrl = buildPublicRedirectUrl(returnTarget, request, originBase);
        returnUrl.searchParams.set("oauth_error", "missing_credentials");
        return NextResponse.redirect(returnUrl);
      }

      // 3. Exchange authorization code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        console.error("Failed to exchange code for token with Google:", errText);
        const returnUrl = buildPublicRedirectUrl(returnTarget, request, originBase);
        returnUrl.searchParams.set("oauth_error", "token_exchange_failed");
        return NextResponse.redirect(returnUrl);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // 4. Fetch user profile from Google UserInfo endpoint
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!userInfoResponse.ok) {
        const errText = await userInfoResponse.text();
        console.error("Failed to fetch userinfo from Google:", errText);
        const returnUrl = buildPublicRedirectUrl(returnTarget, request, originBase);
        returnUrl.searchParams.set("oauth_error", "userinfo_fetch_failed");
        return NextResponse.redirect(returnUrl);
      }

      const userInfo = await userInfoResponse.json();
      googleId = userInfo.sub;
      email = userInfo.email?.toLowerCase().trim();
      name = userInfo.name?.trim() || "";
      avatar = userInfo.picture?.trim() || "♟";
    }

    if (!email) {
      const returnUrl = buildPublicRedirectUrl(returnTarget, request, originBase);
      returnUrl.searchParams.set("oauth_error", "email_not_provided");
      return NextResponse.redirect(returnUrl);
    }

    // 5. Query / Upsert User in PostgreSQL database via Prisma
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      // If user was attempting to register during onboarding, but an account already exists:
      if (mode === "signup") {
        const loginUrl = buildPublicRedirectUrl("/", request, originBase);
        loginUrl.searchParams.set("step", "auth");
        loginUrl.searchParams.set("mode", "signin");
        loginUrl.searchParams.set("prefill", user.email || user.username || "");
        loginUrl.searchParams.set("error", "account_exists");
        return NextResponse.redirect(loginUrl);
      }

      // Existing user in signin mode: Link googleId if missing
      if (!user.googleId || !user.avatar || user.avatar === "♟") {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId || googleId,
            displayName: user.displayName || name,
            avatar: user.avatar && user.avatar !== "♟" ? user.avatar : avatar,
          },
        });
      }
    } else {
      // New user attempting to sign in: they have no account, so send through onboarding
      if (mode === "signin") {
        const onboardingUrl = buildPublicRedirectUrl("/", request, originBase);
        onboardingUrl.searchParams.set("step", "step-elo");
        onboardingUrl.searchParams.set("google_onboarding", "1");

        const response = NextResponse.redirect(onboardingUrl);

        // Save Google identity in cookie so onboarding flow can finalize the account
        response.cookies.set(
          "chess_reel_pending_google",
          JSON.stringify({
            googleId,
            email,
            name,
            avatar,
          }),
          {
            path: "/",
            httpOnly: false,
            secure: process.env.NODE_ENV === "production" || originBase.startsWith("https"),
            sameSite: "lax",
            maxAge: 60 * 15, // 15 minutes
          }
        );

        response.cookies.set("oauth_state", "", {
          path: "/",
          maxAge: 0,
        });

        return response;
      }

      // New user registering from onboarding: use calibrated starting Elo
      const baseElo = stateData.startingElo || (skillLevel === "beginner" ? 600 : skillLevel === "advanced" ? 1600 : 1200);
      const initialSkill =
        baseElo < 1000
          ? "beginner"
          : baseElo > 1500
          ? "advanced"
          : "intermediate";

      let baseUsername = (name || email.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 15);

      if (baseUsername.length < 3) {
        baseUsername = `player_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Check username uniqueness
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
        uniqueUsername = `${baseUsername.slice(0, 11)}_${counter++}`;
      }

      user = await prisma.user.create({
        data: {
          email,
          googleId,
          username: uniqueUsername,
          displayName: name || uniqueUsername,
          avatar,
          skillTier: initialSkill,
          elo: baseElo,
          peakElo: baseElo,
          streak: 0,
          bestStreak: 0,
          isCalibrated: false,
          calibrationStep: 0,
        },
      });
    }

    // 6. Set user cookie and redirect to client
    const clientUserPayload = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      elo: user.elo,
      isCalibrated: user.isCalibrated,
      calibrationStep: user.calibrationStep,
      plan: user.plan || "free",
    };

    const targetUrl = buildPublicRedirectUrl(returnTarget, request, originBase);
    targetUrl.searchParams.set("google_auth", "success");

    const response = NextResponse.redirect(targetUrl);

    // Save temporary oauth login cookie for app/page.tsx to ingest into localStorage
    response.cookies.set(
      "chess_reel_oauth_user",
      JSON.stringify(clientUserPayload),
      {
        path: "/",
        httpOnly: false, // Accessible to client-side script on page load
        secure: process.env.NODE_ENV === "production" || originBase.startsWith("https"),
        sameSite: "lax",
        maxAge: 60 * 5, // 5 minutes
      }
    );

    // Set permanent session cookie
    response.cookies.set("chess_reel_session", user.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Clear pending google cookie if any
    response.cookies.set("chess_reel_pending_google", "", {
      path: "/",
      maxAge: 0,
    });

    // Clear oauth_state cookie
    response.cookies.set("oauth_state", "", {
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Exception in Google OAuth callback:", err);
    const returnUrl = buildPublicRedirectUrl(returnTarget, request, originBase);
    returnUrl.searchParams.set("oauth_error", "internal_oauth_error");
    return NextResponse.redirect(returnUrl);
  }
}
