import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry } from "@/lib/prisma";
import { isGuestUserId } from "@/lib/guestAccount";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const userId = body.userId || (sessionCookie ? decodeURIComponent(sessionCookie) : null);

    if (!userId || isGuestUserId(userId)) {
      return NextResponse.json(
        { error: "Valid authenticated userId is required to sync guest progress." },
        { status: 400 }
      );
    }

    const { estimatedElo, solvedCount, streak, solvedPuzzleIds } = body;

    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
      })
    );

    if (!user) {
      return NextResponse.json(
        { error: "Target user account not found." },
        { status: 404 }
      );
    }

    const targetElo = typeof estimatedElo === "number" && estimatedElo > 0
      ? Math.round(estimatedElo)
      : user.elo;

    const newPeakElo = Math.max(user.peakElo, user.elo, targetElo);
    const newStreak = Math.max(user.streak, typeof streak === "number" ? streak : 0);
    const newBestStreak = Math.max(user.bestStreak, user.streak, newStreak);

    // Merge solved puzzle IDs
    const existingSet = new Set(user.solvedPuzzleIds || []);
    if (Array.isArray(solvedPuzzleIds)) {
      for (const pid of solvedPuzzleIds) {
        if (typeof pid === "string" && pid.trim()) {
          existingSet.add(pid.trim());
        }
      }
    }
    const mergedSolvedIds = Array.from(existingSet);

    // If solvedCount >= 3, consider baseline calibration completed
    const shouldMarkCalibrated = (typeof solvedCount === "number" && solvedCount >= 3) || user.isCalibrated;
    const calibrationStep = Math.max(
      user.calibrationStep,
      typeof solvedCount === "number" ? Math.min(6, solvedCount) : 0
    );

    const updatedUser = await withDbRetry(() =>
      prisma.user.update({
        where: { id: userId },
        data: {
          elo: targetElo,
          peakElo: newPeakElo,
          streak: newStreak,
          bestStreak: newBestStreak,
          solvedPuzzleIds: mergedSolvedIds,
          isCalibrated: shouldMarkCalibrated,
          calibrationStep,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          skillTier: true,
          elo: true,
          peakElo: true,
          targetElo: true,
          streak: true,
          bestStreak: true,
          solvedPuzzleIds: true,
          isCalibrated: true,
          calibrationStep: true,
          plan: true,
          isPro: true,
        },
      })
    );

    // Persist puzzle history for newly transferred solved puzzles if any
    if (Array.isArray(solvedPuzzleIds) && solvedPuzzleIds.length > 0) {
      try {
        await Promise.allSettled(
          solvedPuzzleIds.map((pid: string) =>
            prisma.puzzleHistory.upsert({
              where: {
                userId_puzzleId: {
                  userId,
                  puzzleId: pid,
                },
              },
              update: {
                result: "win",
                solvedAt: new Date(),
              },
              create: {
                userId,
                puzzleId: pid,
                result: "win",
                solvedAt: new Date(),
              },
            })
          )
        );
      } catch (err) {
        console.warn("[/api/user/sync-guest] Non-blocking puzzleHistory sync notice:", err);
      }
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[/api/user/sync-guest] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sync guest session." },
      { status: 500 }
    );
  }
}

