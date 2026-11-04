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
  isRequeued?: boolean;
  attemptCount?: number;
  streakFreezes?: number;
  perfectWeekCounter?: number;
  isFrozenState?: boolean;
  lastSolvedDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateEloBody;
    const { puzzleRating, currentUserElo, result, userId, guestId, puzzleId, dailyStreak, isRequeued, attemptCount } = body;

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

    const isRequeuedEffective = Boolean(isRequeued || (attemptCount && attemptCount > 1));

    // Standard Elo calculation
    const K = 32;
    const S = result === "win" ? 1 : 0;
    const exponent = (puzzleRating - currentUserElo) / 400;
    const E = 1 / (1 + Math.pow(10, exponent));
    let eloChange = Math.round(K * (S - E));

    // For requeued puzzles, award lesser Elo than normal (50% of standard win, minimum +1)
    if (isRequeuedEffective && result === "win") {
      eloChange = Math.max(1, Math.round(eloChange * 0.5));
    }
    const newElo = Math.max(100, currentUserElo + eloChange);

    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const targetUserId = userId || sessionCookie || guestId || "";
    const calculated = {
      newElo,
      eloChange,
      expectedScore: Number(E.toFixed(4)),
      actualScore: S,
      userId: targetUserId || null,
      isRequeued: isRequeuedEffective,
    };

    if (!targetUserId || isGuestUserId(targetUserId)) {
      return NextResponse.json(calculated);
    }

    let existing = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!existing && sessionCookie) {
      existing = await prisma.user.findUnique({
        where: { id: sessionCookie },
      });
    }
    const isRegistered =
      existing &&
      (Boolean(existing.email) ||
        Boolean(existing.googleId) ||
        Boolean(existing.passwordHash)) &&
      existing.displayName !== "Guest Tactician";

    if (!existing || !isRegistered) {
      return NextResponse.json(calculated);
    }

    const resolvedUserId = existing.id;

    // Strict Backend Idempotency Guard & Requeued Solve Rating:
    if (puzzleId && resolvedUserId) {
      const priorHistory = await prisma.puzzleHistory.findUnique({
        where: {
          userId_puzzleId: {
            userId: resolvedUserId,
            puzzleId,
          },
        },
      });

      if (priorHistory) {
        // If the prior attempt was already a WIN, block duplicate rating (strict anti-farming)
        if (priorHistory.result === "win") {
          return NextResponse.json({
            alreadyRated: true,
            currentElo: existing.elo,
            newElo: existing.elo,
            eloChange: 0,
            userId: resolvedUserId,
            streak: existing.streak ?? 0,
            peakElo: existing.peakElo ?? 800,
          });
        }

        // If priorHistory was a 'loss' and the new result is 'win', this is a requeued solve!
        // Award lesser Elo than normal (50% of standard win, minimum +1)
        if (result === "win") {
          const normalWinDelta = Math.round(K * (1 - E));
          const requeuedDelta = Math.max(1, Math.round(normalWinDelta * 0.5));
          calculated.eloChange = requeuedDelta;
          calculated.newElo = Math.max(100, currentUserElo + requeuedDelta);
          calculated.isRequeued = true;
        }
      }
    }

    // Record in PuzzleHistory for anti-repetition tracking
    if (puzzleId && resolvedUserId) {
      await prisma.puzzleHistory
        .upsert({
          where: {
            userId_puzzleId: {
              userId: resolvedUserId,
              puzzleId,
            },
          },
          update: {
            result,
            solvedAt: new Date(),
          },
          create: {
            userId: resolvedUserId,
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

      const finalElo = calculated.newElo;
      const finalEloChange = calculated.eloChange;
      const nextBestStreak = Math.max(existing?.bestStreak ?? 0, nextStreak);
      const nextPeakElo = Math.max(existing?.peakElo ?? 800, finalElo);

      const dataToUpdate: Record<string, any> = {
        elo: finalElo,
        peakElo: nextPeakElo,
        streak: nextStreak,
        bestStreak: nextBestStreak,
      };

      if (typeof body.streakFreezes === "number") {
        const freezes = Math.min(2, Math.max(0, body.streakFreezes));
        dataToUpdate.streakFreezes = freezes;
        if (freezes >= 2) dataToUpdate.perfectWeekCounter = 0;
      }
      if (
        typeof body.perfectWeekCounter === "number" &&
        (dataToUpdate.streakFreezes ?? existing.streakFreezes) < 2
      ) {
        dataToUpdate.perfectWeekCounter = Math.min(7, Math.max(0, body.perfectWeekCounter));
      }
      if (typeof body.isFrozenState === "boolean") {
        dataToUpdate.isFrozenState = body.isFrozenState;
      }
      if (body.lastSolvedDate) {
        dataToUpdate.lastSolvedDate = body.lastSolvedDate;
      } else if (result === "win") {
        dataToUpdate.lastSolvedDate = new Date().toISOString().slice(0, 10);
      }

      if (result === "win" && puzzleId) {
        const existingSolved = existing.solvedPuzzleIds || [];
        if (!existingSolved.includes(puzzleId)) {
          dataToUpdate.solvedPuzzleIds = [...existingSolved, puzzleId];
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: dataToUpdate,
      });

      return NextResponse.json({
        alreadyRated: false,
        newElo: updatedUser.elo,
        eloChange: finalEloChange,
        expectedScore: Number(E.toFixed(4)),
        actualScore: S,
        userId: updatedUser.id,
        streak: updatedUser.streak,
        peakElo: updatedUser.peakElo,
        isRequeued: calculated.isRequeued,
        streakFreezes: updatedUser.streakFreezes,
        perfectWeekCounter: updatedUser.perfectWeekCounter,
        isFrozenState: updatedUser.isFrozenState,
        lastSolvedDate: updatedUser.lastSolvedDate,
      });
    } catch (dbError) {
      console.warn(
        "Could not persist Elo to database, returning calculated Elo:",
        dbError
      );
      return NextResponse.json({
        alreadyRated: false,
        newElo: calculated.newElo,
        eloChange: calculated.eloChange,
        expectedScore: Number(E.toFixed(4)),
        actualScore: S,
        userId: targetUserId,
        isRequeued: calculated.isRequeued,
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
