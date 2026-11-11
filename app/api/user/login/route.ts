import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import { verifyPassword, hashSecurityCode } from "@/lib/auth";
import { sendSecurityOtpEmail } from "@/lib/mail";
import { isActiveProAccount } from "@/lib/tierTypes";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawIdentifier = body.username ?? body.email ?? body.identifier;
    const password = body.password;

    if (!rawIdentifier || typeof rawIdentifier !== "string") {
      return NextResponse.json(
        { error: "Username or email is required." },
        { status: 400 }
      );
    }

    const clean = rawIdentifier.trim();

    // Query user by username or email case-insensitively
    const user = await withDbRetry(() =>
      prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: clean, mode: "insensitive" } },
            { username: { equals: clean, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatar: true,
          elo: true,
          peakElo: true,
          targetElo: true,
          streak: true,
          bestStreak: true,
          lastSolvedDate: true,
          streakFreezes: true,
          perfectWeekCounter: true,
          isFrozenState: true,
          solvedPuzzleIds: true,
          savedPuzzleIds: true,
          likedPuzzleIds: true,
          autoAdvance: true,
          soundEnabled: true,
          showCoordinates: true,
          isCalibrated: true,
          calibrationStep: true,
          passwordHash: true,
          googleId: true,
          emailVerified: true,
          twoFactorEnabled: true,
          twoFactorCode: true,
          twoFactorExpires: true,
          verificationCode: true,
          verificationExp: true,
          plan: true,
          isPro: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          paymentProvider: true,
          currentPeriodEnd: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json(
        { error: `Account "${clean}" does not exist. Please check your credentials.` },
        { status: 404 }
      );
    }

    // Account Security Verification: Enforce password authentication
    if (user.passwordHash) {
      if (!password || typeof password !== "string") {
        return NextResponse.json(
          { error: "Password is required to sign in." },
          { status: 400 }
        );
      }

      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Incorrect password. Please try again." },
          { status: 401 }
        );
      }
    } else if (user.googleId) {
      return NextResponse.json(
        { error: "This account is linked with Google. Please use 'Continue with Google' to sign in." },
        { status: 401 }
      );
    } else {
      // Legacy account created before password enforcement:
      // Require user to set a password (min 6 characters) to access it
      if (!password || typeof password !== "string" || password.trim().length < 6) {
        return NextResponse.json(
          {
            error:
              "This account requires a password (minimum 6 characters) to sign in. Please enter a password to secure your account.",
          },
          { status: 401 }
        );
      }

      // Secure the account with the provided password
      const { hashPassword: hashPwd } = await import("@/lib/auth");
      const newHash = hashPwd(password);
      await withDbRetry(() =>
        prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        })
      );
    }

    // Security Check: automated test user always bypasses verification/2FA challenges
    const isDevTest = user.email === "devtest@doomchess.local" || user.username === "devtest";

    if (!isDevTest) {
      // 1. Unverified email requirement
      if (user.email && !user.emailVerified) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const hashed = hashSecurityCode(code);
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await withDbRetry(() =>
          prisma.user.update({
            where: { id: user.id },
            data: {
              verificationCode: hashed,
              verificationExp: expires,
            },
          })
        );

        await sendSecurityOtpEmail(user.email, code, "VERIFY_EMAIL");

        return NextResponse.json({
          success: true,
          requiresEmailVerification: true,
          email: user.email,
        });
      }

      // 2. Opt-in Two-Factor Authentication requirement
      if (user.twoFactorEnabled && user.email) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const hashed = hashSecurityCode(code);
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await withDbRetry(() =>
          prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorCode: hashed,
              twoFactorExpires: expires,
            },
          })
        );

        await sendSecurityOtpEmail(user.email, code, "2FA");

        return NextResponse.json({
          success: true,
          requires2FA: true,
          email: user.email,
        });
      }
    }

    // Sync guest placement results if completed during guest session
    let finalUser = user;
    const hasCompletedPlacement = Boolean(body.hasCompletedPlacement || body.calibratedElo);
    const guestCalibratedElo =
      typeof body.calibratedElo === "number"
        ? Math.max(600, Math.min(2200, Math.round(body.calibratedElo)))
        : null;

    if (hasCompletedPlacement && (!user.isCalibrated || guestCalibratedElo)) {
      const nextElo = guestCalibratedElo ?? user.elo;
      const nextPeak = Math.max(user.peakElo, nextElo);
      try {
        finalUser = await withDbRetry(() =>
          prisma.user.update({
            where: { id: user.id },
            data: {
              isCalibrated: true,
              calibrationStep: 6,
              elo: nextElo,
              peakElo: nextPeak,
            },
          })
        );
      } catch (err) {
        console.error("Failed to sync placement elo on login:", err);
      }
    }

    // Clean user response object without secret fields
    const isPro = isActiveProAccount(finalUser);
    const safeUser = {
      id: finalUser.id,
      username: finalUser.username || clean,
      displayName: finalUser.displayName || finalUser.username,
      avatar: finalUser.avatar || "P",
      email: finalUser.email,
      emailVerified: finalUser.emailVerified,
      twoFactorEnabled: Boolean(finalUser.twoFactorEnabled),
      elo: finalUser.elo,
      peakElo: finalUser.peakElo,
      targetElo: finalUser.targetElo ?? 1500,
      streak: finalUser.streak,
      bestStreak: finalUser.bestStreak,
      lastSolvedDate: finalUser.lastSolvedDate ?? null,
      streakFreezes: finalUser.streakFreezes ?? 0,
      perfectWeekCounter: finalUser.perfectWeekCounter ?? 0,
      isFrozenState: finalUser.isFrozenState ?? false,
      solvedPuzzleIds: finalUser.solvedPuzzleIds ?? [],
      savedPuzzleIds: finalUser.savedPuzzleIds ?? [],
      likedPuzzleIds: finalUser.likedPuzzleIds ?? [],
      autoAdvance: finalUser.autoAdvance ?? false,
      soundEnabled: finalUser.soundEnabled ?? true,
      showCoordinates: finalUser.showCoordinates ?? true,
      isCalibrated: finalUser.isCalibrated,
      calibrationStep: finalUser.calibrationStep,
      plan: isPro ? "premium" : "free",
      isPro,
      subscriptionStatus: finalUser.subscriptionStatus ?? "none",
      subscriptionPlan: finalUser.subscriptionPlan ?? null,
      paymentProvider: finalUser.paymentProvider ?? null,
      currentPeriodEnd: finalUser.currentPeriodEnd ?? null,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
    });

    // Set secure authentication cookie
    response.cookies.set("chess_reel_session", user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: sanitizeDbError(error) || "Failed to sign in. Please try again." },
      { status: 500 }
    );
  }
}
