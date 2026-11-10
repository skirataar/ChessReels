import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkUserQuota, getTierConfig, ensureSettingsTable } from "@/lib/tierConfig";
import { isGuestUserId } from "@/lib/guestAccount";

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const userId = body.userId || sessionCookie;

    const config = await getTierConfig();

    if (!userId || isGuestUserId(userId)) {
      const currentRemaining = typeof body.currentPuzzlesRemaining === "number" ? body.currentPuzzlesRemaining : 0;
      const newRemaining = Math.min(config.freePuzzleLimit, currentRemaining + 3);
      return NextResponse.json({
        success: true,
        guest: true,
        puzzlesRemaining: newRemaining,
        windowLimit: config.freePuzzleLimit,
        windowHours: config.freeWindowHours,
        nextQuotaRefillTime: null,
        resetsInMs: 0,
      });
    }

    await ensureSettingsTable();

    // Authenticated user: authoritatively increment bonusQuota in PostgreSQL
    await prisma.user.update({
      where: { id: userId },
      data: {
        bonusQuota: {
          increment: 3,
        },
      },
    });

    const quota = await checkUserQuota(userId);

    return NextResponse.json({
      success: true,
      puzzlesRemaining: quota.puzzlesRemaining,
      windowLimit: quota.windowLimit,
      windowHours: quota.windowHours,
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

