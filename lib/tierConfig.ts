import prisma, { withDbRetry } from "./prisma";
import {
  TierConfig,
  DEFAULT_TIER_CONFIG,
  isActiveProAccount,
  isProPlan,
} from "./tierTypes";
import { calculateUserQuota } from "./quota";

export type { TierConfig };
export { DEFAULT_TIER_CONFIG, isProPlan };

let cachedConfig: TierConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 1000; // 15 seconds cache
let settingsTableEnsured = false;

/**
 * Ensure the system_settings table exists in PostgreSQL.
 */
export async function ensureSettingsTable(): Promise<void> {
  if (settingsTableEnsured) return;
  try {
    settingsTableEnsured = true;
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" VARCHAR(255) PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusQuota" INTEGER DEFAULT 0;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "puzzlesRemaining" INTEGER DEFAULT 15;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastRefillTimestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP WITH TIME ZONE;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationCode" TEXT;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationExp" TIMESTAMP WITH TIME ZONE;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorCode" TEXT;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorExpires" TIMESTAMP WITH TIME ZONE;
    `);
  } catch (err) {
    console.warn("Could not ensure system_settings table or bonusQuota column:", err);
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
      ? Math.max(15, parseInt(map.get("free_puzzle_limit")!, 10) || DEFAULT_TIER_CONFIG.freePuzzleLimit)
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
  nextChargeInMs?: number;
  fullChargeInMs?: number;
}

/**
 * Check user quota based on authoritative dynamic progressive battery recharge model.
 */
export async function checkUserQuota(
  userId: string,
  userPlan?: string | null
): Promise<UserQuotaStatus> {
  const config = await getTierConfig();
  const quota = await calculateUserQuota(userId, userPlan);

  return {
    isPro: quota.isPro,
    canPlay: quota.canPlay,
    puzzlesRemaining: quota.puzzlesRemaining,
    usedInWindow: quota.usedInWindow ?? Math.max(0, config.freePuzzleLimit - quota.puzzlesRemaining),
    windowLimit: config.freePuzzleLimit,
    windowHours: config.freeWindowHours,
    adFrequency: config.adFrequencyPuzzles,
    resetsInMs: quota.resetsInMs,
    resetsAt: quota.resetsAt,
    subscriptionStatus: quota.subscriptionStatus ?? "none",
    subscriptionPlan: quota.subscriptionPlan ?? null,
    paymentProvider: quota.paymentProvider ?? null,
    currentPeriodEnd: quota.currentPeriodEnd ?? null,
    nextChargeInMs: quota.nextChargeInMs,
    fullChargeInMs: quota.fullChargeInMs,
  };
}
