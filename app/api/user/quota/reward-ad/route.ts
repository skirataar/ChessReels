import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkUserQuota, getTierConfig } from "@/lib/tierConfig";
import { isGuestUserId } from "@/lib/guestAccount";

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const userId = body.userId || sessionCookie;

    if (!userId || isGuestUserId(userId)) {
      const config = await getTierConfig();
      const currentRemaining = typeof body.currentPuzzlesRemaining === "number" ? body.currentPuzzlesRemaining : 0;
      const newRemaining = Math.min(config.freePuzzleLimit, currentRemaining + 3);
      return NextResponse.json({
        success: true,
        guest: true,
        puzzlesRemaining: newRemaining,
        nextQuotaRefillTime: null,
        resetsInMs: 0,
      });
    }

    const config = await getTierConfig();
    const windowDurationMs = config.freeWindowHours * 3600 * 1000;
    const windowStart = new Date(Date.now() - windowDurationMs);

    // Find solves in the active rolling window
    const recentSolves = await prisma.puzzleHistory.findMany({
      where: {
        userId,
        result: "win",
        solvedAt: { gte: windowStart },
      },
      orderBy: { solvedAt: "asc" },
      select: { id: true, solvedAt: true },
    });

    if (recentSolves.length > 0) {
      // Recharging 3 puzzles frees up to 3 slots in the rolling window
      const solvesToDelete = recentSolves.slice(0, 3).map((s) => s.id);
      await prisma.puzzleHistory.deleteMany({
        where: { id: { in: solvesToDelete } },
      });
    }

    const quota = await checkUserQuota(userId);

    return NextResponse.json({
      success: true,
      puzzlesRemaining: quota.puzzlesRemaining,
      nextQuotaRefillTime: quota.resetsAt,
      resetsInMs: quota.resetsInMs,
    });
  } catch (error) {
    console.error("[/api/user/quota/reward-ad POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to process reward recharge" },
      { status: 500 }
    );
  }
}

