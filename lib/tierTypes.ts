export interface TierConfig {
  freePuzzleLimit: number;
  freeWindowHours: number;
  adFrequencyPuzzles: number;
  proMonthlyPrice: number; // in INR (₹)
  annualDiscountPercent: number; // e.g. 5 for 5% discount on annual plan
}

export const DEFAULT_TIER_CONFIG: TierConfig = {
  freePuzzleLimit: 15,
  freeWindowHours: 4,
  adFrequencyPuzzles: 2,
  proMonthlyPrice: 200, // 200rs/month
  annualDiscountPercent: 5, // 5% save on annual plans
};

export type SubscriptionStatus = "none" | "active" | "cancelled" | "past_due";
export type SubscriptionPlan = "monthly" | "yearly";

export interface SubscriptionFields {
  plan?: string | null;
  isPro?: boolean | null;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  paymentProvider?: string | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: string | Date | null;
}

export function isProPlan(plan?: string | null): boolean {
  if (!plan) return false;
  const clean = plan.toLowerCase().trim();
  return clean === "premium" || clean === "pro";
}

/**
 * Unified Pro entitlement check used by both the API and client UI.
 * Legacy `plan: "premium" | "pro"` accounts remain entitled; provider-backed
 * subscriptions are entitled only while `currentPeriodEnd` is in the future.
 */
export function isActiveProAccount(
  account?: SubscriptionFields | null,
  now: number = Date.now()
): boolean {
  if (!account) return false;

  // Legacy comped accounts (no provider linkage) keep plan-based access.
  // Provider-backed subscriptions must respect their billing period even if the
  // legacy display `plan` field still says "premium".
  if (!account.paymentProvider && isProPlan(account.plan)) return true;

  if (!account.isPro) return false;
  if (!account.currentPeriodEnd) return true;

  const end =
    account.currentPeriodEnd instanceof Date
      ? account.currentPeriodEnd.getTime()
      : new Date(account.currentPeriodEnd).getTime();

  return Number.isFinite(end) && end > now;
}
