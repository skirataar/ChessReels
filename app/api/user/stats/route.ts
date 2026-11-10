import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isGuestUserId } from "@/lib/guestAccount";
import { isActiveProAccount } from "@/lib/tierTypes";
import { checkUserQuota } from "@/lib/tierConfig";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("userId");
    const targetUserId = queryUserId || sessionCookie;

    if (!targetUserId || isGuestUserId(targetUserId)) {
      return NextResponse.json({
        user: null,
        isPro: false,
        subscriptionStatus: "none",
        currentPeriodEnd: null,
        puzzlesRemaining: 15,
        nextQuotaRefillTime: null,
        windowLimit: 15,
        windowHours: 4,
        stats: {
          elo: 1200,
          currentStreak: 0,
          lastSolvedDate: null,
          streakFreezes: 0,
          isFrozenState: false,
          perfectWeekCounter: 0,
          comboCount: 0,
          isPro: false,
          subscriptionStatus: "none",
          currentPeriodEnd: null,
          puzzlesRemaining: 15,
          nextQuotaRefillTime: null,
        },
      }, { headers: NO_CACHE_HEADERS });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        elo: true,
        peakElo: true,
        streak: true,
        bestStreak: true,
        lastSolvedDate: true,
        streakFreezes: true,
        isFrozenState: true,
        perfectWeekCounter: true,
        isCalibrated: true,
        calibrationStep: true,
        plan: true,
        isPro: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        paymentProvider: true,
        currentPeriodEnd: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPro = isActiveProAccount(user);
    const currentPeriodEnd = user.currentPeriodEnd
      ? user.currentPeriodEnd.toISOString()
      : null;

    const quota = await checkUserQuota(targetUserId, user.plan);

    return NextResponse.json({
      success: true,
      user: { ...user, isPro, plan: isPro ? "premium" : "free" },
      isPro,
      subscriptionStatus: user.subscriptionStatus ?? "none",
      currentPeriodEnd,
      puzzlesRemaining: quota.puzzlesRemaining,
      nextQuotaRefillTime: quota.resetsAt,
      resetsInMs: quota.resetsInMs,
      canPlay: quota.canPlay,
      windowLimit: quota.windowLimit,
      windowHours: quota.windowHours,
      stats: {
        elo: user.elo,
        currentStreak: user.streak,
        lastSolvedDate: user.lastSolvedDate,
        streakFreezes: user.streakFreezes,
        isFrozenState: Boolean(user.isFrozenState),
        perfectWeekCounter: user.perfectWeekCounter,
        isPro,
        subscriptionStatus: user.subscriptionStatus ?? "none",
        subscriptionPlan: user.subscriptionPlan ?? null,
        currentPeriodEnd,
        puzzlesRemaining: quota.puzzlesRemaining,
        nextQuotaRefillTime: quota.resetsAt,
      },
    }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("[/api/user/stats GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const targetUserId = body.userId || sessionCookie;

    if (!targetUserId || isGuestUserId(targetUserId)) {
      return NextResponse.json({ success: true, guest: true, saved: body });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const nextElo = typeof body.elo === "number" ? Math.max(100, Math.round(body.elo)) : user.elo;
    const nextPeakElo = Math.max(user.peakElo || 800, nextElo);

    let nextStreak = user.streak;
    if (typeof body.currentStreak === "number") {
      nextStreak = Math.max(0, body.currentStreak);
    } else if (typeof body.streak === "number") {
      nextStreak = Math.max(0, body.streak);
    }
    const nextBestStreak = Math.max(user.bestStreak || 0, nextStreak);

    const nextLastSolvedDate =
      body.lastSolvedDate !== undefined ? body.lastSolvedDate : user.lastSolvedDate;

    const nextStreakFreezes =
      typeof body.streakFreezes === "number"
        ? Math.min(2, Math.max(0, body.streakFreezes))
        : user.streakFreezes;

    const nextPerfectWeek =
      typeof body.perfectWeekCounter === "number"
        ? Math.min(7, Math.max(0, body.perfectWeekCounter))
        : user.perfectWeekCounter;

    const nextIsFrozen =
      typeof body.isFrozenState === "boolean" ? body.isFrozenState : user.isFrozenState;

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        elo: nextElo,
        peakElo: nextPeakElo,
        streak: nextStreak,
        bestStreak: nextBestStreak,
        lastSolvedDate: nextLastSolvedDate,
        streakFreezes: nextStreakFreezes,
        perfectWeekCounter: nextPerfectWeek,
        isFrozenState: nextIsFrozen,
      },
      select: {
        id: true,
        elo: true,
        peakElo: true,
        streak: true,
        bestStreak: true,
        lastSolvedDate: true,
        streakFreezes: true,
        isFrozenState: true,
        perfectWeekCounter: true,
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        elo: updated.elo,
        currentStreak: updated.streak,
        lastSolvedDate: updated.lastSolvedDate,
        streakFreezes: updated.streakFreezes,
        isFrozenState: Boolean(updated.isFrozenState),
        perfectWeekCounter: updated.perfectWeekCounter,
      },
    });
  } catch (error) {
    console.error("[/api/user/stats POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

