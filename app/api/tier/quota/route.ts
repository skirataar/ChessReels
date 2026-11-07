import { NextRequest, NextResponse } from "next/server";
import { checkUserQuota, getTierConfig } from "@/lib/tierConfig";
import prisma from "@/lib/prisma";
import { isGuestUserId } from "@/lib/guestAccount";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId") || searchParams.get("guestId");
    const plan = searchParams.get("plan");

    if (!userId) {
      return NextResponse.json(
        { error: "userId or guestId is required" },
        { status: 400 }
      );
    }

    const [quota, config] = await Promise.all([
      checkUserQuota(userId, plan),
      getTierConfig(),
    ]);

    return NextResponse.json({ quota, config });
  } catch (error) {
    console.error("Failed to fetch user quota:", error);
    return NextResponse.json({ error: "Failed to fetch user quota" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const userId = body.userId || sessionCookie;

    if (!userId || isGuestUserId(userId)) {
      return NextResponse.json({ success: true, guest: true });
    }

    if (body.puzzleId && body.result === "win") {
      await prisma.puzzleHistory.upsert({
        where: { userId_puzzleId: { userId, puzzleId: body.puzzleId } },
        update: { result: "win", solvedAt: new Date() },
        create: { userId, puzzleId: body.puzzleId, result: "win", solvedAt: new Date() },
      });
    }

    const [quota, config] = await Promise.all([
      checkUserQuota(userId),
      getTierConfig(),
    ]);

    return NextResponse.json({ success: true, quota, config });
  } catch (error) {
    console.error("[/api/tier/quota POST] Error:", error);
    return NextResponse.json({ error: "Failed to register puzzle play" }, { status: 500 });
  }
}
