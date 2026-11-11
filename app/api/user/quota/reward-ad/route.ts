import { NextRequest, NextResponse } from "next/server";
import { checkUserQuota, getTierConfig, ensureSettingsTable } from "@/lib/tierConfig";
import { addRewardedCharges } from "@/lib/quota";
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
        nextChargeInMs: 0,
        fullChargeInMs: 0,
      });
    }

    await ensureSettingsTable();

    // Authenticated user: authoritatively increment charges in PostgreSQL
    const quota = await addRewardedCharges(userId, 3);

    return NextResponse.json({
      success: true,
      puzzlesRemaining: quota.puzzlesRemaining,
      windowLimit: quota.windowLimit,
      windowHours: quota.windowHours,
      nextQuotaRefillTime: quota.resetsAt,
      resetsInMs: quota.resetsInMs,
      nextChargeInMs: quota.nextChargeInMs,
      fullChargeInMs: quota.fullChargeInMs,
    });
  } catch (error) {
    console.error("[/api/user/quota/reward-ad POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to process reward recharge" },
      { status: 500 }
    );
  }
}

