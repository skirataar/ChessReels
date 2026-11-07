/**
 * Geo-localized pricing for the dual-gateway Pro subscription.
 *
 * This module is intentionally dependency-free so it can be imported by both
 * server routes and client components.
 */

export type PricingGateway = "razorpay" | "global";

export type PricingCurrency = "INR" | "GBP" | "EUR" | "USD";

export interface GeoPrice {
  /** Numeric amount in the local currency (major units). */
  amount: number;
  /** Pre-formatted price, e.g. "₹2,280" or "$4.99". */
  display: string;
  /** Short qualifier shown under the price. */
  subtext: string;
  /** Monthly equivalent for yearly plans, e.g. "₹190". */
  monthlyEquivalent?: string;
}

export interface GeoPricing {
  country: string;
  gateway: PricingGateway;
  currency: PricingCurrency;
  symbol: string;
  monthly: GeoPrice;
  yearly: GeoPrice;
  /** Localized payment methods footer. */
  methods: string;
}

export const INDIA_PRICING: GeoPricing = {
  country: "IN",
  gateway: "razorpay",
  currency: "INR",
  symbol: "₹",
  monthly: {
    amount: 200,
    display: "₹200",
    subtext: "per month",
  },
  yearly: {
    amount: 2280,
    display: "₹2,280",
    monthlyEquivalent: "₹190",
    subtext: "₹190/mo billed annually",
  },
  methods: "UPI Autopay • GPay • PhonePe • Cards",
};

export const UK_PRICING: GeoPricing = {
  country: "GB",
  gateway: "global",
  currency: "GBP",
  symbol: "£",
  monthly: {
    amount: 3.99,
    display: "£3.99",
    subtext: "per month",
  },
  yearly: {
    amount: 38.28,
    display: "£38.28",
    monthlyEquivalent: "£3.19",
    subtext: "£3.19/mo billed annually",
  },
  methods: "Card • PayPal • Apple Pay",
};

export const EURO_PRICING: GeoPricing = {
  country: "EU",
  gateway: "global",
  currency: "EUR",
  symbol: "€",
  monthly: {
    amount: 4.99,
    display: "€4.99",
    subtext: "per month",
  },
  yearly: {
    amount: 47.88,
    display: "€47.88",
    monthlyEquivalent: "€3.99",
    subtext: "€3.99/mo billed annually",
  },
  methods: "Card • PayPal • Apple Pay",
};

export const GLOBAL_PRICING: GeoPricing = {
  country: "US",
  gateway: "global",
  currency: "USD",
  symbol: "$",
  monthly: {
    amount: 4.99,
    display: "$4.99",
    subtext: "per month",
  },
  yearly: {
    amount: 47.88,
    display: "$47.88",
    monthlyEquivalent: "$3.99",
    subtext: "$3.99/mo billed annually",
  },
  methods: "Card • PayPal • Apple Pay",
};

export const EUROZONE_COUNTRIES = [
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "IE",
  "AT",
  "BE",
  "FI",
  "PT",
  "GR",
] as const;

const EUROZONE_SET = new Set<string>(EUROZONE_COUNTRIES);

/** Normalize a raw country code from headers/query into a 2-letter code. */
export function normalizeCountryCode(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return null;
  // Cloudflare uses "XX" for unknown locations.
  if (clean === "XX" || clean === "T1") return null;
  return clean;
}

/** Resolve the pricing block for a country code. */
export function getPricingForCountry(rawCountry?: string | null): GeoPricing {
  const country = normalizeCountryCode(rawCountry) || "US";

  if (country === "IN") return { ...INDIA_PRICING };

  if (country === "GB") {
    return { ...UK_PRICING, country };
  }

  if (EUROZONE_SET.has(country)) {
    return { ...EURO_PRICING, country };
  }

  return { ...GLOBAL_PRICING, country };
}

/**
 * Best-effort country inference from an IANA timezone. Used on localhost where
 * there is no edge geo header; India is the important case for Razorpay.
 */
export function detectCountryFromTimezone(rawTimezone?: string | null): string | null {
  if (!rawTimezone) return null;
  const tz = rawTimezone.trim();

  if (tz === "Asia/Calcutta" || tz === "Asia/Kolkata") return "IN";

  if (tz === "Europe/London") return "GB";

  const eurozoneTimezones: Record<string, string> = {
    "Europe/Berlin": "DE",
    "Europe/Paris": "FR",
    "Europe/Madrid": "ES",
    "Europe/Rome": "IT",
    "Europe/Amsterdam": "NL",
    "Europe/Dublin": "IE",
    "Europe/Vienna": "AT",
    "Europe/Brussels": "BE",
    "Europe/Helsinki": "FI",
    "Europe/Lisbon": "PT",
    "Europe/Athens": "GR",
  };

  return eurozoneTimezones[tz] || null;
}

/**
 * Determine the country used for pricing, in priority order:
 * explicit query override → edge geo header → client timezone → US default.
 */
export function resolvePricingCountry(input: {
  countryOverride?: string | null;
  headerCountry?: string | null;
  timezone?: string | null;
}): { country: string; source: "override" | "header" | "timezone" | "default" } {
  const override = normalizeCountryCode(input.countryOverride);
  if (override) return { country: override, source: "override" };

  const header = normalizeCountryCode(input.headerCountry);
  if (header) return { country: header, source: "header" };

  const fromTimezone = detectCountryFromTimezone(input.timezone);
  if (fromTimezone) return { country: fromTimezone, source: "timezone" };

  return { country: "US", source: "default" };
}

/** Percentage saved by paying yearly, rounded to the nearest percent. */
export function getYearlySavingsPercent(pricing: GeoPricing): number {
  const fullYear = pricing.monthly.amount * 12;
  if (!fullYear) return 0;
  return Math.max(0, Math.round((1 - pricing.yearly.amount / fullYear) * 100));
}
