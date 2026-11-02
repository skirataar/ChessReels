import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { REGISTERED_USER_WHERE_CLAUSE } from "@/lib/communitySeed";

// In-memory cache for the 6.15M puzzle count so stats load in <20ms
let cachedPuzzleCount: number | null = null;
let lastPuzzleCountFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    const startTime = Date.now();

    // Check puzzle count cache
    const now = Date.now();
    let totalPuzzles = cachedPuzzleCount;
    if (!totalPuzzles || now - lastPuzzleCountFetchTime > CACHE_TTL_MS) {
      totalPuzzles = await prisma.puzzle.count();
      cachedPuzzleCount = totalPuzzles;
      lastPuzzleCountFetchTime = now;
    }

    // First fetch registered users
    const registeredUsers = await prisma.user.findMany({
      where: REGISTERED_USER_WHERE_CLAUSE,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        elo: true,
        peakElo: true,
        streak: true,
        plan: true,
        createdAt: true,
      },
    });

    const registeredUserIds = registeredUsers.map((u) => u.id);
    const userMap = new Map(registeredUsers.map((u) => [u.id, u]));

    const [
      totalUsers,
      proUsers,
      calibratedUsers,
      topLikedPuzzles,
      rawRecentSolves,
    ] = await Promise.all([
      prisma.user.count({ where: REGISTERED_USER_WHERE_CLAUSE }),
      prisma.user.count({
        where: {
          ...REGISTERED_USER_WHERE_CLAUSE,
          plan: "premium",
        },
      }),
      prisma.user.count({
        where: {
          ...REGISTERED_USER_WHERE_CLAUSE,
          isCalibrated: true,
        },
      }),
      prisma.puzzle.count({ where: { likes: { gt: 0 } } }),
      prisma.puzzleHistory.findMany({
        where: {
          result: "win",
          userId: { in: registeredUserIds },
        },
        take: 8,
        orderBy: { solvedAt: "desc" },
        select: {
          id: true,
          puzzleId: true,
          userId: true,
          solvedAt: true,
        },
      }),
    ]);

    const recentSolves = rawRecentSolves.map((solve) => ({
      ...solve,
      user: userMap.get(solve.userId) || null,
    }));

    // Sort registered users by Elo for top ranking
    const recentUsers = [...registeredUsers]
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 10);

    const dbLatencyMs = Date.now() - startTime;

    // Calculate MRR ($9.99/mo per Pro subscriber)
    const estimatedMRR = (proUsers * 9.99).toFixed(2);
    const proConversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : "0";

    return NextResponse.json({
      metrics: {
        totalUsers,
        freeUsers: totalUsers - proUsers,
        proUsers,
        calibratedUsers,
        totalPuzzles: totalPuzzles ?? 6157341,
        topLikedPuzzles,
        estimatedMRR: Number(estimatedMRR),
        proConversionRate: Number(proConversionRate),
        dbLatencyMs,
        status: "healthy",
      },
      recentUsers,
      recentSolves,
    });
  } catch (error) {
    console.error("Admin stats fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform metrics" },
      { status: 500 }
    );
  }
}
