import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isGuestUserId } from "@/lib/guestAccount";

interface UpdateEloBody {
  puzzleRating?: number;
  currentUserElo?: number;
  result?: "win" | "loss";
  userId?: string;
  guestId?: string;
  puzzleId?: string;
  dailyStreak?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateEloBody;
    const { puzzleRating, currentUserElo, result, userId, guestId, puzzleId, dailyStreak } = body;

    if (
      typeof puzzleRating !== "number" ||
      typeof currentUserElo !== "number" ||
      (result !== "win" && result !== "loss")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. Required: puzzleRating (number), currentUserElo (number), result ('win' | 'loss').",
        },
        { status: 400 }
      );
    }

    // Standard Elo calculation
    const K = 32;
    const S = result === "win" ? 1 : 0;
    const exponent = (puzzleRating - currentUserElo) / 400;
    const E = 1 / (1 + Math.pow(10, exponent));
    const eloChange = Math.round(K * (S - E));
    const newElo = Math.max(100, currentUserElo + eloChange);

    const targetUserId = userId || guestId || "";
    const calculated = {
      newElo,
      eloChange,
      expectedScore: Number(E.toFixed(4)),
      actualScore: S,
      userId: targetUserId || null,
    };

    if (!targetUserId || isGuestUserId(targetUserId)) {
      return NextResponse.json(calculated);
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    const isRegistered =
      existing &&
      (Boolean(existing.email) ||
        Boolean(existing.googleId) ||
        Boolean(existing.passwordHash)) &&
      existing.displayName !== "Guest Tactician";

    if (!isRegistered) {
      return NextResponse.json(calculated);
    }

    // Strict Backend Idempotency Guard: check if a solve record for (userId, puzzleId) already exists
    if (puzzleId && targetUserId) {
      const priorHistory = await prisma.puzzleHistory.findUnique({
        where: {
          userId_puzzleId: {
            userId: targetUserId,
            puzzleId,
          },
        },
      });

      if (priorHistory) {
        return NextResponse.json({
          alreadyRated: true,
          currentElo: existing.elo,
          newElo: existing.elo,
          eloChange: 0,
          userId: targetUserId,
          streak: existing.streak ?? 0,
          peakElo: existing.peakElo ?? 800,
        });
      }
    }

    // Record in PuzzleHistory for anti-repetition tracking
    if (puzzleId && targetUserId) {
      await prisma.puzzleHistory
        .upsert({
          where: {
            userId_puzzleId: {
              userId: targetUserId,
              puzzleId,
            },
          },
          update: {
            result,
            solvedAt: new Date(),
          },
          create: {
            userId: targetUserId,
            puzzleId,
            result,
            solvedAt: new Date(),
          },
        })
        .catch((histErr) => {
          console.warn("Could not record puzzle history:", histErr);
        });
    }

    // Persist Elo for registered accounts only
    try {
      // Calculate true calendar daily streak (days of training, NOT consecutive puzzle wins)
      // Priority: use client-provided dailyStreak (from useStreak.ts which tracks localStorage accurately)
      // Fallback: compute from puzzle history, excluding the current puzzle being submitted
      let nextStreak = existing?.streak ?? 0;
      if (typeof dailyStreak === "number" && dailyStreak > 0) {
        // Client sends the already-computed daily streak — most accurate source
        nextStreak = dailyStreak;
      } else {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        // Exclude the current puzzleId so we look at the PREVIOUS session's most recent entry
        const lastHistory = await prisma.puzzleHistory.findFirst({
          where: {
            userId: targetUserId,
            ...(puzzleId ? { puzzleId: { not: puzzleId } } : {}),
          },
          orderBy: { solvedAt: "desc" },
          select: { solvedAt: true },
        });

        if (!lastHistory) {
          // First ever puzzle — start streak at 1
          nextStreak = 1;
        } else {
          const lastDateStr = lastHistory.solvedAt.toISOString().slice(0, 10);
          const d1 = new Date(lastDateStr + "T00:00:00Z");
          const d2 = new Date(todayStr + "T00:00:00Z");
          const diffDays = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            // Already played today — keep existing streak (at least 1)
            nextStreak = Math.max(1, existing?.streak ?? 1);
          } else if (diffDays === 1) {
            // Played yesterday — extend streak
            nextStreak = (existing?.streak ?? 0) + 1;
          } else {
            // Gap > 1 day — reset streak to 1
            nextStreak = 1;
          }
        }
      }

      const nextBestStreak = Math.max(existing?.bestStreak ?? 0, nextStreak);
      const nextPeakElo = Math.max(existing?.peakElo ?? 800, newElo);

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          elo: newElo,
          peakElo: nextPeakElo,
          streak: nextStreak,
          bestStreak: nextBestStreak,
        },
      });

      return NextResponse.json({
        alreadyRated: false,
        newElo: updatedUser.elo,
        eloChange,
        expectedScore: Number(E.toFixed(4)),
        actualScore: S,
        userId: updatedUser.id,
        streak: updatedUser.streak,
        peakElo: updatedUser.peakElo,
      });
    } catch (dbError) {
      console.warn(
        "Could not persist Elo to database, returning calculated Elo:",
        dbError
      );
      return NextResponse.json({
        alreadyRated: false,
        newElo,
        eloChange,
        expectedScore: Number(E.toFixed(4)),
        actualScore: S,
        userId: targetUserId,
      });
    }
  } catch (error) {
    console.error("Error updating Elo:", error);
    return NextResponse.json(
      { error: "Internal server error calculating Elo update" },
      { status: 500 }
    );
  }
}
