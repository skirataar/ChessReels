import { createHmac, timingSafeEqual } from "node:crypto";
import prisma, { withDbRetry } from "./prisma";
import { isActiveProAccount, SubscriptionFields } from "./tierTypes";

export type BillingProvider = "razorpay" | "global";
export type SubscriptionPlan = "monthly" | "yearly";

export const PLAN_PERIOD_MS: Record<SubscriptionPlan, number> = {
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
};

export interface SubscriptionRecord extends SubscriptionFields {}

export interface SubscriptionSnapshot {
  isPro: boolean;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  paymentProvider: string | null;
  providerSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
}

const SUBSCRIPTION_SELECT = {
  id: true,
  plan: true,
  isPro: true,
  subscriptionStatus: true,
  subscriptionPlan: true,
  paymentProvider: true,
  providerSubscriptionId: true,
  currentPeriodEnd: true,
} as const;

/** True only while the subscription is paid-up and inside its billing period. */
export function isSubscriptionEntitled(
  record: SubscriptionRecord | null | undefined,
  now: number = Date.now()
): boolean {
  return isActiveProAccount(record, now);
}

export function normalizePlan(raw?: string | null): SubscriptionPlan | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (clean === "monthly" || clean === "month") return "monthly";
  if (clean === "yearly" || clean === "annual" || clean === "annually" || clean === "year") {
    return "yearly";
  }
  return null;
}

export function computePeriodEnd(
  plan: SubscriptionPlan,
  base: Date = new Date()
): Date {
  return new Date(base.getTime() + PLAN_PERIOD_MS[plan]);
}

/**
 * Activate (or renew) a subscription. Renewals extend from the existing paid
 * period when it has not lapsed yet, otherwise from now.
 */
export async function activateSubscription(input: {
  userId: string;
  plan: SubscriptionPlan;
  provider: BillingProvider;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
}): Promise<SubscriptionSnapshot | null> {
  const existing = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { currentPeriodEnd: true },
    })
  );

  if (!existing) return null;

  const now = Date.now();
  const existingEnd = existing.currentPeriodEnd
    ? new Date(existing.currentPeriodEnd).getTime()
    : 0;
  const base = existingEnd > now ? new Date(existingEnd) : new Date(now);
  const periodEnd =
    input.currentPeriodEnd && input.currentPeriodEnd.getTime() > now
      ? input.currentPeriodEnd
      : computePeriodEnd(input.plan, base);

  const user = await withDbRetry(() =>
    prisma.user.update({
      where: { id: input.userId },
      data: {
        isPro: true,
        subscriptionStatus: "active",
        subscriptionPlan: input.plan,
        paymentProvider: input.provider,
        providerSubscriptionId: input.providerSubscriptionId ?? undefined,
        currentPeriodEnd: periodEnd,
        // Keep the legacy field in sync for older UI that only knows "premium".
        plan: "premium",
      },
      select: SUBSCRIPTION_SELECT,
    })
  );

  return user as SubscriptionSnapshot;
}

/**
 * Mark a subscription as cancelled/halted/expired. Access is revoked only once
 * the paid period has actually ended.
 */
export async function cancelSubscription(input: {
  userId?: string | null;
  providerSubscriptionId?: string | null;
  provider: BillingProvider;
  status?: "cancelled" | "past_due";
  currentPeriodEnd?: Date | null;
  revokeImmediately?: boolean;
}): Promise<SubscriptionSnapshot | null> {
  let targetUserId = input.userId || null;

  if (!targetUserId && input.providerSubscriptionId) {
    const byProvider = await withDbRetry(() =>
      prisma.user.findFirst({
        where: { providerSubscriptionId: input.providerSubscriptionId },
        select: { id: true },
      })
    );
    targetUserId = byProvider?.id || null;
  }

  if (!targetUserId) return null;

  const existing = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { currentPeriodEnd: true, providerSubscriptionId: true },
    })
  );
  if (!existing) return null;

  const periodEnd = input.currentPeriodEnd ?? existing.currentPeriodEnd ?? null;
  const periodEndMs = periodEnd ? new Date(periodEnd).getTime() : 0;
  const stillEntitled = !input.revokeImmediately && periodEndMs > Date.now();

  const user = await withDbRetry(() =>
    prisma.user.update({
      where: { id: targetUserId },
      data: {
        subscriptionStatus: input.status ?? "cancelled",
        paymentProvider: input.provider,
        providerSubscriptionId:
          input.providerSubscriptionId ?? existing.providerSubscriptionId ?? undefined,
        currentPeriodEnd: periodEnd,
        isPro: stillEntitled,
        plan: stillEntitled ? "premium" : "free",
      },
      select: SUBSCRIPTION_SELECT,
    })
  );

  return user as SubscriptionSnapshot;
}

/** Constant-time HMAC-SHA256 hex comparison. */
export function verifyHmacSha256Hex(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | null | undefined
): boolean {
  if (!rawBody || !signature || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const received = signature.trim().toLowerCase();

  if (expected.length !== received.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"));
  } catch {
    return false;
  }
}

export function verifyRazorpaySignature(
  rawBody: string,
  signature: string | null | undefined
): boolean {
  return verifyHmacSha256Hex(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET);
}

export function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string | null | undefined
): boolean {
  return verifyHmacSha256Hex(
    rawBody,
    signature,
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  );
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_PLAN_MONTHLY_ID &&
      process.env.RAZORPAY_PLAN_YEARLY_ID
  );
}

export function isLemonSqueezyConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
      process.env.LEMONSQUEEZY_STORE_ID &&
      process.env.LEMONSQUEEZY_VARIANT_MONTHLY_ID &&
      process.env.LEMONSQUEEZY_VARIANT_YEARLY_ID
  );
}

export function parsePeriodEnd(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === "") return null;

  if (raw instanceof Date) {
    return Number.isFinite(raw.getTime()) ? raw : null;
  }

  if (typeof raw === "number") {
    // Unix timestamps may arrive in seconds or milliseconds.
    const ms = raw < 10_000_000_000 ? raw * 1000 : raw;
    const date = new Date(ms);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  if (typeof raw === "string") {
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && raw.trim() !== "") {
      return parsePeriodEnd(numeric);
    }
    const date = new Date(raw);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  return null;
}

export { SUBSCRIPTION_SELECT };
