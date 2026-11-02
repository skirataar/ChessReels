export interface TierConfig {
  freePuzzleLimit: number;
  freeWindowHours: number;
  adFrequencyPuzzles: number;
  proMonthlyPrice: number; // in INR (₹)
  annualDiscountPercent: number; // e.g. 5 for 5% discount on annual plan
}

export const DEFAULT_TIER_CONFIG: TierConfig = {
  freePuzzleLimit: 5,
  freeWindowHours: 4,
  adFrequencyPuzzles: 2,
  proMonthlyPrice: 200, // 200rs/month
  annualDiscountPercent: 5, // 5% save on annual plans
};

export function isProPlan(plan?: string | null): boolean {
  if (!plan) return false;
  const clean = plan.toLowerCase().trim();
  return clean === "premium" || clean === "pro";
}
