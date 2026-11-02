import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    const targetUserId = guestId ?? userId ?? "guest-user";

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

    // Attempt to persist for user/guest in DB
    try {
      const existing = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      // Calculate true calendar daily streak (days of training, NOT consecutive puzzle wins)
      let nextStreak = existing?.streak ?? 0;
      if (typeof dailyStreak === "number" && dailyStreak > 0) {
        nextStreak = dailyStreak;
      } else {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const lastHistory = await prisma.puzzleHistory.findFirst({
          where: { userId: targetUserId },
          orderBy: { solvedAt: "desc" },
          select: { solvedAt: true },
        });

        if (!lastHistory) {
          nextStreak = 1;
        } else {
          const lastDateStr = lastHistory.solvedAt.toISOString().slice(0, 10);
          const d1 = new Date(lastDateStr + "T00:00:00Z");
          const d2 = new Date(todayStr + "T00:00:00Z");
          const diffDays = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            nextStreak = Math.max(1, existing?.streak ?? 1);
          } else if (diffDays === 1) {
            nextStreak = (existing?.streak ?? 0) + 1;
          } else {
            nextStreak = 1;
          }
        }
      }

      const nextBestStreak = Math.max(existing?.bestStreak ?? 0, nextStreak);
      const nextPeakElo = Math.max(existing?.peakElo ?? 800, newElo);

      const updatedUser = await prisma.user.upsert({
        where: { id: targetUserId },
        update: {
          elo: newElo,
          peakElo: nextPeakElo,
          streak: nextStreak,
          bestStreak: nextBestStreak,
        },
        create: {
          id: targetUserId,
          elo: newElo,
          peakElo: nextPeakElo,
          streak: nextStreak,
          bestStreak: nextBestStreak,
        },
      });

      return NextResponse.json({
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
