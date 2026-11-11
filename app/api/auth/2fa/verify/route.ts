import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import { verifySecurityCode } from "@/lib/auth";
import { isActiveProAccount } from "@/lib/tierTypes";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const identifier = body.email || body.username || sessionCookie;
    const code = body.code;
    const isActivation = Boolean(body.isActivation);

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "Email or user identifier is required." },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string" || code.trim().length !== 6) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit security code." },
        { status: 400 }
      );
    }

    const clean = identifier.trim();

    const user = await withDbRetry(() =>
      prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: clean, mode: "insensitive" } },
            { username: { equals: clean, mode: "insensitive" } },
            { id: clean },
          ],
        },
      })
    );

    if (!user) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    if (user.twoFactorExpires && new Date() > user.twoFactorExpires) {
      return NextResponse.json(
        { error: "Security code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const isValid = verifySecurityCode(code, user.twoFactorCode);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid security code. Please check your email and try again." },
        { status: 400 }
      );
    }

    // On match: clear twoFactorCode and expires
    const updateData: any = {
      twoFactorCode: null,
      twoFactorExpires: null,
    };

    if (isActivation) {
      updateData.twoFactorEnabled = true;
    }

    const updated = await withDbRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: updateData,
      })
    );

    const isPro = isActiveProAccount(updated);
    const safeUser = {
      id: updated.id,
      username: updated.username || "tactician",
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
      twoFactorEnabled: Boolean(updated.twoFactorEnabled),
    });

    response.cookies.set("chess_reel_session", updated.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[/api/auth/2fa/verify POST] Error:", error);
    return NextResponse.json(
      { error: sanitizeDbError(error) || "Failed to verify security code." },
      { status: 500 }
    );
  }
}

