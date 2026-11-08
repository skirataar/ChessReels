import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { REGISTERED_USER_WHERE_CLAUSE } from "@/lib/communitySeed";
import { getTierConfig } from "@/lib/tierConfig";

// In-memory cache for the approximate 6.15M puzzle count so stats load fast.
// Exact COUNT(*) on the Puzzle table takes 10-12s because it scans every row.
let cachedPuzzleCount: number | null = null;
let lastPuzzleCountFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Approximate row count from the planner statistics in pg_class.
 * This is O(1) instead of a full table scan, and is accurate enough for the
 * admin dashboard. Returns null if the table has never been analyzed.
 */
async function getApproximatePuzzleCount(): Promise<number | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT c.reltuples::bigint AS count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'Puzzle'
        AND c.relkind = 'r'
        AND n.nspname = current_schema()
      LIMIT 1
    `;
    const value = Number(rows[0]?.count ?? -1);
    return value > 0 ? value : null;
  } catch (error) {
    console.error("Approximate puzzle count failed:", error);
    return null;
  }
}

/**
 * Number of distinct puzzles that have at least one like.
 * Scans the small PuzzleLike table instead of the 6.15M-row Puzzle table.
 */
async function getTopLikedPuzzleCount(): Promise<number> {
  try {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "puzzleId")::bigint AS count FROM "PuzzleLike"
    `;
    return Number(rows[0]?.count ?? 0);
  } catch (error) {
    console.error("Top-liked puzzle count failed:", error);
    return 0;
  }
}

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
    const needsPuzzleCount =
      !cachedPuzzleCount || now - lastPuzzleCountFetchTime > CACHE_TTL_MS;

    // Fetch the puzzle count and registered users concurrently to overlap
    // the two database round trips.
    const [registeredUsers, approximatePuzzleCount] = await Promise.all([
      prisma.user.findMany({
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
          subscriptionPlan: true,
          createdAt: true,
        },
      }),
      needsPuzzleCount ? getApproximatePuzzleCount() : Promise.resolve(null),
    ]);

    let totalPuzzles = cachedPuzzleCount;
    if (approximatePuzzleCount !== null) {
      totalPuzzles = approximatePuzzleCount;
      cachedPuzzleCount = approximatePuzzleCount;
      lastPuzzleCountFetchTime = now;
    }

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
      getTopLikedPuzzleCount(),
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

    const tierConfig = await getTierConfig();
    const monthlyAmount = tierConfig.proMonthlyPrice;
    const yearlyMonthlyAmount =
      monthlyAmount * 12 * (1 - tierConfig.annualDiscountPercent / 100) / 12;
    const estimatedMRR = registeredUsers.reduce((total, user) => {
      const isPro = user.plan === "premium";
      if (!isPro) return total;
      return total + (user.subscriptionPlan?.toLowerCase() === "yearly"
        ? yearlyMonthlyAmount
        : monthlyAmount);
    }, 0);
    const proConversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : "0";

    return NextResponse.json({
      metrics: {
        totalUsers,
        freeUsers: totalUsers - proUsers,
        proUsers,
        calibratedUsers,
        totalPuzzles: totalPuzzles ?? 6157341,
        topLikedPuzzles,
        estimatedMRR: Number(estimatedMRR.toFixed(2)),
        revenueCurrency: "INR",
        proMonthlyPrice: monthlyAmount,
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
