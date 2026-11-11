import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import { verifySecurityCode, hashSecurityCode } from "@/lib/auth";
import { sendSecurityOtpEmail } from "@/lib/mail";
import { isActiveProAccount } from "@/lib/tierTypes";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, resend } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await withDbRetry(() =>
      prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" } },
      })
    );

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    // Handle resending a new OTP
    if (resend) {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const newHash = hashSecurityCode(newOtp);
      const newExp = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await withDbRetry(() =>
        prisma.user.update({
          where: { id: user.id },
          data: {
            verificationCode: newHash,
            verificationExp: newExp,
          },
        })
      );

      await sendSecurityOtpEmail(cleanEmail, newOtp, "VERIFY_EMAIL");

      return NextResponse.json({
        success: true,
        message: "A new confirmation code has been sent to your email.",
      });
    }

    // Validate code submission
    if (!code || typeof code !== "string" || code.trim().length !== 6) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit confirmation code." },
        { status: 400 }
      );
    }

    // Check expiration
    if (user.verificationExp && new Date() > user.verificationExp) {
      return NextResponse.json(
        { error: "Confirmation code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Validate security code match
    const isValid = verifySecurityCode(code, user.verificationCode);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid confirmation code. Please check your email and try again." },
        { status: 400 }
      );
    }

    // Clear verification codes and mark email verified
    const updated = await withDbRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          verificationCode: null,
          verificationExp: null,
        },
      })
    );

    const isPro = isActiveProAccount(updated);
    const safeUser = {
      id: updated.id,
      username: updated.username || cleanEmail.split("@")[0],
      displayName: updated.displayName || updated.username,
      avatar: updated.avatar || "P",
      email: updated.email,
      emailVerified: updated.emailVerified,
      twoFactorEnabled: Boolean(updated.twoFactorEnabled),
      elo: updated.elo,
      peakElo: updated.peakElo,
      targetElo: updated.targetElo ?? 1500,
      streak: updated.streak,
      bestStreak: updated.bestStreak,
      lastSolvedDate: updated.lastSolvedDate ?? null,
      streakFreezes: updated.streakFreezes ?? 0,
      perfectWeekCounter: updated.perfectWeekCounter ?? 0,
      isFrozenState: updated.isFrozenState ?? false,
      solvedPuzzleIds: updated.solvedPuzzleIds ?? [],
      savedPuzzleIds: updated.savedPuzzleIds ?? [],
      likedPuzzleIds: updated.likedPuzzleIds ?? [],
      autoAdvance: updated.autoAdvance ?? false,
      soundEnabled: updated.soundEnabled ?? true,
      showCoordinates: updated.showCoordinates ?? true,
      isCalibrated: updated.isCalibrated,
      calibrationStep: updated.calibrationStep,
      plan: isPro ? "premium" : "free",
      isPro,
      subscriptionStatus: updated.subscriptionStatus ?? "none",
      subscriptionPlan: updated.subscriptionPlan ?? null,
      paymentProvider: updated.paymentProvider ?? null,
      currentPeriodEnd: updated.currentPeriodEnd ?? null,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
    });

    response.cookies.set("chess_reel_session", updated.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[/api/auth/verify-email POST] Error:", error);
    return NextResponse.json(
      { error: sanitizeDbError(error) || "Failed to verify email." },
      { status: 500 }
    );
  }
}

