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

    const { estimatedElo, calibratedElo, isCalibrated, calibrationStep: stepParam, solvedCount, streak, solvedPuzzleIds, puzzleHistory } = body;

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

    const effectiveElo = typeof calibratedElo === "number" && calibratedElo > 0
      ? calibratedElo
      : typeof estimatedElo === "number" && estimatedElo > 0
      ? estimatedElo
      : user.elo;

    const targetElo = Math.round(effectiveElo);
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

    // Baseline calibration completion check
    const shouldMarkCalibrated =
      Boolean(isCalibrated) ||
      typeof calibratedElo === "number" ||
      (typeof stepParam === "number" && stepParam >= 6) ||
      (Array.isArray(puzzleHistory) && puzzleHistory.length >= 6) ||
      (typeof solvedCount === "number" && solvedCount >= 6) ||
      user.isCalibrated;

    const calibrationStep = shouldMarkCalibrated
      ? 6
      : Math.max(
          user.calibrationStep,
          typeof stepParam === "number" ? stepParam : typeof solvedCount === "number" ? Math.min(6, solvedCount) : 0
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

    // Persist puzzle history for newly transferred solved puzzles or detailed placement history
    try {
      if (Array.isArray(puzzleHistory) && puzzleHistory.length > 0) {
        await Promise.allSettled(
          puzzleHistory.map((item: any) => {
            const pid = String(item.puzzleId || "").trim();
            if (!pid) return Promise.resolve();
            const result = item.passed ? "win" : "loss";
            return prisma.puzzleHistory.upsert({
              where: {
                userId_puzzleId: {
                  userId,
                  puzzleId: pid,
                },
              },
              update: {
                result,
                solvedAt: new Date(),
              },
              create: {
                userId,
                puzzleId: pid,
                result,
                solvedAt: new Date(),
              },
            });
          })
        );
      } else if (Array.isArray(solvedPuzzleIds) && solvedPuzzleIds.length > 0) {
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
      }
    } catch (err) {
      console.warn("[/api/user/sync-guest] Non-blocking puzzleHistory sync notice:", err);
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

