import prisma, { withDbRetry } from "./prisma";
import { isGuestUserId } from "./guestAccount";
import { isActiveProAccount } from "./tierTypes";

export const REFILL_INTERVAL_MS = 16 * 60 * 1000; // 16 minutes per single puzzle charge (~3.75 - 4 puzzles/hr)
export const MAX_CHARGES = 15;
export const FULL_REFILL_WINDOW_HOURS = 4; // 15 charges * 16 minutes = 240 minutes = 4 hours

export interface QuotaCalculationResult {
  puzzlesRemaining: number;
  windowLimit: number;
  windowHours: number;
  nextChargeInMs: number;
  fullChargeInMs: number;
  canPlay: boolean;
  isPro: boolean;
  resetsAt: string | null;
  resetsInMs: number;
  usedInWindow?: number;
  adFrequency?: number;
  subscriptionStatus?: string;
  subscriptionPlan?: string | null;
  paymentProvider?: string | null;
  currentPeriodEnd?: string | null;
}

/**
 * Calculates current user quota using the dynamic continuous 16-minute progressive refill model.
 * If charges have been earned since lastRefillTimestamp, authoritatively updates PostgreSQL.
 */
export async function calculateUserQuota(
  userId: string | null | undefined,
  userPlan?: string | null
): Promise<QuotaCalculationResult> {
  const now = Date.now();

  // Guest users have no DB row; client or local session handles local ticks
  if (!userId || isGuestUserId(userId)) {
    return {
      puzzlesRemaining: MAX_CHARGES,
      windowLimit: MAX_CHARGES,
      windowHours: FULL_REFILL_WINDOW_HOURS,
      nextChargeInMs: 0,
      fullChargeInMs: 0,
      canPlay: true,
      isPro: false,
      resetsAt: null,
      resetsInMs: 0,
      usedInWindow: 0,
      subscriptionStatus: "none",
      subscriptionPlan: null,
      paymentProvider: null,
      currentPeriodEnd: null,
    };
  }

  let dbUser: any = null;
  try {
    dbUser = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          plan: true,
          isPro: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          paymentProvider: true,
          currentPeriodEnd: true,
          puzzlesRemaining: true,
          lastRefillTimestamp: true,
          bonusQuota: true,
        },
      })
    );
  } catch (err) {
    console.error("[calculateUserQuota] DB lookup failed:", err);
  }

  if (!dbUser) {
    return {
      puzzlesRemaining: MAX_CHARGES,
      windowLimit: MAX_CHARGES,
      windowHours: FULL_REFILL_WINDOW_HOURS,
      nextChargeInMs: 0,
      fullChargeInMs: 0,
      canPlay: true,
      isPro: false,
      resetsAt: null,
      resetsInMs: 0,
    };
  }

  const isPro = isActiveProAccount(dbUser);
  const currentPeriodEnd = dbUser.currentPeriodEnd ? dbUser.currentPeriodEnd.toISOString() : null;

  if (isPro) {
    return {
      puzzlesRemaining: 999999,
      windowLimit: MAX_CHARGES,
      windowHours: FULL_REFILL_WINDOW_HOURS,
      nextChargeInMs: 0,
      fullChargeInMs: 0,
      canPlay: true,
      isPro: true,
      resetsAt: null,
      resetsInMs: 0,
      usedInWindow: 0,
      subscriptionStatus: dbUser.subscriptionStatus ?? "none",
      subscriptionPlan: dbUser.subscriptionPlan ?? null,
      paymentProvider: dbUser.paymentProvider ?? null,
      currentPeriodEnd,
    };
  }

  let currentRemaining =
    typeof dbUser.puzzlesRemaining === "number" ? dbUser.puzzlesRemaining : MAX_CHARGES;
  let lastRefillMs = dbUser.lastRefillTimestamp
    ? new Date(dbUser.lastRefillTimestamp).getTime()
    : now;

  // Progressive refill formula: 1 charge every 16 minutes
  const elapsed = Math.max(0, now - lastRefillMs);
  const earnedCharges = Math.floor(elapsed / REFILL_INTERVAL_MS);

  if (earnedCharges > 0 && currentRemaining < MAX_CHARGES) {
    const newRemaining = Math.min(MAX_CHARGES, currentRemaining + earnedCharges);
    // Shift timestamp forward by the exact consumed refill intervals so fractional progress is preserved
    const newTimestamp =
      newRemaining === MAX_CHARGES
        ? new Date(now)
        : new Date(lastRefillMs + earnedCharges * REFILL_INTERVAL_MS);

    currentRemaining = newRemaining;
    lastRefillMs = newTimestamp.getTime();

    await withDbRetry(() =>
      prisma.user.update({
        where: { id: dbUser.id },
        data: {
          puzzlesRemaining: newRemaining,
          lastRefillTimestamp: newTimestamp,
        },
      })
    ).catch((err) => {
      console.warn("[calculateUserQuota] Failed to persist refreshed quota:", err);
    });
  } else if (!dbUser.lastRefillTimestamp) {
    await withDbRetry(() =>
      prisma.user.update({
        where: { id: dbUser.id },
        data: {
          puzzlesRemaining: currentRemaining,
          lastRefillTimestamp: new Date(now),
        },
      })
    ).catch(() => {});
  }

  let nextChargeInMs = 0;
  let fullChargeInMs = 0;

  if (currentRemaining < MAX_CHARGES) {
    const timeSinceLastInterval = (now - lastRefillMs) % REFILL_INTERVAL_MS;
    nextChargeInMs = Math.max(0, REFILL_INTERVAL_MS - timeSinceLastInterval);
    const chargesNeeded = MAX_CHARGES - currentRemaining;
    fullChargeInMs = nextChargeInMs + Math.max(0, chargesNeeded - 1) * REFILL_INTERVAL_MS;
  }

  const nextQuotaRefillTime =
    fullChargeInMs > 0 ? new Date(now + fullChargeInMs).toISOString() : null;

  return {
    puzzlesRemaining: currentRemaining,
    windowLimit: MAX_CHARGES,
    windowHours: FULL_REFILL_WINDOW_HOURS,
    nextChargeInMs,
    fullChargeInMs,
    canPlay: currentRemaining > 0,
    isPro: false,
    resetsAt: nextQuotaRefillTime,
    resetsInMs: fullChargeInMs,
    usedInWindow: MAX_CHARGES - currentRemaining,
    subscriptionStatus: dbUser.subscriptionStatus ?? "none",
    subscriptionPlan: dbUser.subscriptionPlan ?? null,
    paymentProvider: dbUser.paymentProvider ?? null,
    currentPeriodEnd,
  };
}

/**
 * Consumes 1 charge upon solving a puzzle.
 * If user was at maximum (15), starts the 16-minute recharge timer immediately.
 */
export async function consumeUserCharge(userId: string): Promise<QuotaCalculationResult> {
  const now = Date.now();

  if (!userId || isGuestUserId(userId)) {
    return calculateUserQuota(userId);
  }

  const dbUser = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        isPro: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        paymentProvider: true,
        currentPeriodEnd: true,
        puzzlesRemaining: true,
        lastRefillTimestamp: true,
      },
    })
  ).catch(() => null);

  if (!dbUser || isActiveProAccount(dbUser)) {
    return calculateUserQuota(userId);
  }

  let currentRemaining =
    typeof dbUser.puzzlesRemaining === "number" ? dbUser.puzzlesRemaining : MAX_CHARGES;
  let lastRefillMs = dbUser.lastRefillTimestamp
    ? new Date(dbUser.lastRefillTimestamp).getTime()
    : now;

  // Compute any earned charges first
  const elapsed = Math.max(0, now - lastRefillMs);
  const earnedCharges = Math.floor(elapsed / REFILL_INTERVAL_MS);

  if (earnedCharges > 0 && currentRemaining < MAX_CHARGES) {
    currentRemaining = Math.min(MAX_CHARGES, currentRemaining + earnedCharges);
    lastRefillMs =
      currentRemaining === MAX_CHARGES
        ? now
        : lastRefillMs + earnedCharges * REFILL_INTERVAL_MS;
  }

  const wasFull = currentRemaining >= MAX_CHARGES;
  const newRemaining = Math.max(0, currentRemaining - 1);
  const newTimestamp = wasFull ? new Date(now) : new Date(lastRefillMs);

  await withDbRetry(() =>
    prisma.user.update({
      where: { id: dbUser.id },
      data: {
        puzzlesRemaining: newRemaining,
        lastRefillTimestamp: newTimestamp,
      },
    })
  ).catch((err) => {
    console.error("[consumeUserCharge] Failed to update user quota:", err);
  });

  return calculateUserQuota(userId);
}

/**
 * Adds bonus charges (e.g. +3 from watching a rewarded ad).
 */
export async function addRewardedCharges(
  userId: string,
  chargesToAdd: number = 3
): Promise<QuotaCalculationResult> {
  const now = Date.now();

  if (!userId || isGuestUserId(userId)) {
    return calculateUserQuota(userId);
  }

  const dbUser = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        isPro: true,
        subscriptionStatus: true,
        puzzlesRemaining: true,
        lastRefillTimestamp: true,
      },
    })
  ).catch(() => null);

  if (!dbUser || isActiveProAccount(dbUser)) {
    return calculateUserQuota(userId);
  }

  let currentRemaining =
    typeof dbUser.puzzlesRemaining === "number" ? dbUser.puzzlesRemaining : MAX_CHARGES;
  const newRemaining = Math.min(MAX_CHARGES, currentRemaining + chargesToAdd);
  const newTimestamp =
    newRemaining === MAX_CHARGES
      ? new Date(now)
      : dbUser.lastRefillTimestamp || new Date(now);

  await withDbRetry(() =>
    prisma.user.update({
      where: { id: dbUser.id },
      data: {
        puzzlesRemaining: newRemaining,
        lastRefillTimestamp: newTimestamp,
      },
    })
  ).catch((err) => {
    console.error("[addRewardedCharges] Failed to update user quota:", err);
  });

  return calculateUserQuota(userId);
}
