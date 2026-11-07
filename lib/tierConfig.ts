import prisma from "./prisma";
import {
  TierConfig,
  DEFAULT_TIER_CONFIG,
  isActiveProAccount,
  isProPlan,
} from "./tierTypes";

export type { TierConfig };
export { DEFAULT_TIER_CONFIG, isProPlan };

let cachedConfig: TierConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 1000; // 15 seconds cache

/**
 * Ensure the system_settings table exists in PostgreSQL.
 */
export async function ensureSettingsTable(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" VARCHAR(255) PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn("Could not ensure system_settings table:", err);
  }
}

/**
 * Fetch the live tier configuration from PostgreSQL system_settings.
 */
export async function getTierConfig(): Promise<TierConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    await ensureSettingsTable();

    const rows = await prisma.$queryRawUnsafe<
      Array<{ key: string; value: string }>
    >(`SELECT "key", "value" FROM "system_settings";`);

    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    const freePuzzleLimit = map.has("free_puzzle_limit")
      ? Math.max(1, parseInt(map.get("free_puzzle_limit")!, 10) || DEFAULT_TIER_CONFIG.freePuzzleLimit)
      : DEFAULT_TIER_CONFIG.freePuzzleLimit;

    const freeWindowHours = map.has("free_window_hours")
      ? Math.max(1, parseInt(map.get("free_window_hours")!, 10) || DEFAULT_TIER_CONFIG.freeWindowHours)
      : DEFAULT_TIER_CONFIG.freeWindowHours;

    const adFrequencyPuzzles = map.has("ad_frequency_puzzles")
      ? Math.max(1, parseInt(map.get("ad_frequency_puzzles")!, 10) || DEFAULT_TIER_CONFIG.adFrequencyPuzzles)
      : DEFAULT_TIER_CONFIG.adFrequencyPuzzles;

    const proMonthlyPrice = map.has("pro_monthly_price")
      ? Math.max(1, parseFloat(map.get("pro_monthly_price")!) || DEFAULT_TIER_CONFIG.proMonthlyPrice)
      : DEFAULT_TIER_CONFIG.proMonthlyPrice;

    const annualDiscountPercent = map.has("annual_discount_percent")
      ? Math.max(0, Math.min(90, parseFloat(map.get("annual_discount_percent")!) || DEFAULT_TIER_CONFIG.annualDiscountPercent))
      : DEFAULT_TIER_CONFIG.annualDiscountPercent;

    cachedConfig = {
      freePuzzleLimit,
      freeWindowHours,
      adFrequencyPuzzles,
      proMonthlyPrice,
      annualDiscountPercent,
    };
    lastFetchTime = now;
    return cachedConfig;
  } catch (err) {
    console.error("Error loading tier config from DB, using defaults:", err);
    return DEFAULT_TIER_CONFIG;
  }
}

/**
 * Update one or more tier settings in the database.
 */
export async function updateTierConfig(
  updates: Partial<TierConfig>
): Promise<TierConfig> {
  await ensureSettingsTable();

  const promises: Promise<any>[] = [];

  if (updates.freePuzzleLimit !== undefined) {
    const val = Math.max(1, Math.floor(updates.freePuzzleLimit)).toString();
    promises.push(
      prisma.$executeRawUnsafe(
        `INSERT INTO "system_settings" ("key", "value", "updated_at")
         VALUES ('free_puzzle_limit', $1, NOW())
         ON CONFLICT ("key") DO UPDATE SET "value" = $1, "updated_at" = NOW();`,
        val
      )
    );
  }

  if (updates.freeWindowHours !== undefined) {
    const val = Math.max(1, Math.floor(updates.freeWindowHours)).toString();
    promises.push(
      prisma.$executeRawUnsafe(
        `INSERT INTO "system_settings" ("key", "value", "updated_at")
         VALUES ('free_window_hours', $1, NOW())
         ON CONFLICT ("key") DO UPDATE SET "value" = $1, "updated_at" = NOW();`,
        val
      )
    );
  }

  if (updates.adFrequencyPuzzles !== undefined) {
    const val = Math.max(1, Math.floor(updates.adFrequencyPuzzles)).toString();
    promises.push(
      prisma.$executeRawUnsafe(
        `INSERT INTO "system_settings" ("key", "value", "updated_at")
         VALUES ('ad_frequency_puzzles', $1, NOW())
         ON CONFLICT ("key") DO UPDATE SET "value" = $1, "updated_at" = NOW();`,
        val
      )
    );
  }

  if (updates.proMonthlyPrice !== undefined) {
    const val = Math.max(1, updates.proMonthlyPrice).toString();
    promises.push(
      prisma.$executeRawUnsafe(
        `INSERT INTO "system_settings" ("key", "value", "updated_at")
         VALUES ('pro_monthly_price', $1, NOW())
         ON CONFLICT ("key") DO UPDATE SET "value" = $1, "updated_at" = NOW();`,
        val
      )
    );
  }

  if (updates.annualDiscountPercent !== undefined) {
    const val = Math.max(0, Math.min(90, Math.round(updates.annualDiscountPercent))).toString();
    promises.push(
      prisma.$executeRawUnsafe(
        `INSERT INTO "system_settings" ("key", "value", "updated_at")
         VALUES ('annual_discount_percent', $1, NOW())
         ON CONFLICT ("key") DO UPDATE SET "value" = $1, "updated_at" = NOW();`,
        val
      )
    );
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  // Bust cache
  cachedConfig = null;
  lastFetchTime = 0;

  return getTierConfig();
}

export interface UserQuotaStatus {
  isPro: boolean;
  canPlay: boolean;
  puzzlesRemaining: number;
  usedInWindow: number;
  windowLimit: number;
  windowHours: number;
  adFrequency: number;
  resetsInMs: number;
  resetsAt: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  paymentProvider: string | null;
  currentPeriodEnd: string | null;
}

/**
 * Check user quota based on recent PuzzleHistory solves/attempts.
 */
export async function checkUserQuota(
  userId: string,
  userPlan?: string | null
): Promise<UserQuotaStatus> {
  const config = await getTierConfig();

  // For registered users the database is authoritative (never trust a
  // client-supplied plan string). Guests have no DB row, so their local plan
  // flag remains a best-effort hint.
  let effectivePro = false;
  let subscriptionStatus = "none";
  let subscriptionPlan: string | null = null;
  let paymentProvider: string | null = null;
  let currentPeriodEnd: string | null = null;

  if (userId && !userId.startsWith("guest-")) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          plan: true,
          isPro: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          paymentProvider: true,
          currentPeriodEnd: true,
        },
      });
      effectivePro = isActiveProAccount(dbUser);
      subscriptionStatus = dbUser?.subscriptionStatus ?? "none";
      subscriptionPlan = dbUser?.subscriptionPlan ?? null;
      paymentProvider = dbUser?.paymentProvider ?? null;
      currentPeriodEnd = dbUser?.currentPeriodEnd?.toISOString() ?? null;
    } catch {
      effectivePro = isProPlan(userPlan);
    }
  } else {
    effectivePro = isProPlan(userPlan);
  }

  // Pro users have completely unlimited puzzles and zero ads
  if (effectivePro) {
    return {
      isPro: true,
      canPlay: true,
      puzzlesRemaining: 999999,
      usedInWindow: 0,
      windowLimit: config.freePuzzleLimit,
      windowHours: config.freeWindowHours,
      adFrequency: config.adFrequencyPuzzles,
      resetsInMs: 0,
      resetsAt: null,
      subscriptionStatus,
      subscriptionPlan,
      paymentProvider,
      currentPeriodEnd,
    };
  }

  const windowDurationMs = config.freeWindowHours * 3600 * 1000;
  const windowStart = new Date(Date.now() - windowDurationMs);

  try {
    // Find all solves recorded in the active rolling window (only successful solves count towards quota)
    const recentSolves = await prisma.puzzleHistory.findMany({
      where: {
        userId,
        result: "win",
        solvedAt: { gte: windowStart },
      },
      orderBy: { solvedAt: "asc" },
      select: { solvedAt: true },
    });

    const usedInWindow = recentSolves.length;
    const puzzlesRemaining = Math.max(0, config.freePuzzleLimit - usedInWindow);
    const canPlay = puzzlesRemaining > 0;

    let resetsInMs = 0;
    let resetsAt: string | null = null;

    if (usedInWindow >= config.freePuzzleLimit && recentSolves.length > 0) {
      // Time until the oldest solve exits the rolling window
      const oldestSolveTime = new Date(recentSolves[0].solvedAt).getTime();
      const resetTime = oldestSolveTime + windowDurationMs;
      resetsInMs = Math.max(0, resetTime - Date.now());
      resetsAt = new Date(resetTime).toISOString();
    }

    return {
      isPro: false,
      canPlay,
      puzzlesRemaining,
      usedInWindow,
      windowLimit: config.freePuzzleLimit,
      windowHours: config.freeWindowHours,
      adFrequency: config.adFrequencyPuzzles,
      resetsInMs,
      resetsAt,
      subscriptionStatus,
      subscriptionPlan,
      paymentProvider,
      currentPeriodEnd,
    };
  } catch (err) {
    console.error("Error computing user quota:", err);
    return {
      isPro: false,
      canPlay: true,
      puzzlesRemaining: config.freePuzzleLimit,
      usedInWindow: 0,
      windowLimit: config.freePuzzleLimit,
      windowHours: config.freeWindowHours,
      adFrequency: config.adFrequencyPuzzles,
      resetsInMs: 0,
      resetsAt: null,
      subscriptionStatus,
      subscriptionPlan,
      paymentProvider,
      currentPeriodEnd,
    };
  }
}
