import { createHmac, timingSafeEqual } from "node:crypto";
import prisma, { withDbRetry } from "./prisma";
import { isActiveProAccount, SubscriptionFields } from "./tierTypes";

export type BillingProvider = "razorpay" | "global" | "dodo";
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

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_PLAN_MONTHLY_ID &&
      process.env.RAZORPAY_PLAN_YEARLY_ID
  );
}

export function getDodoBaseUrl(): string {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

export function getDodoProductId(plan: SubscriptionPlan): string | null {
  if (plan === "yearly") {
    return (
      process.env.DODO_PAYMENTS_PRO_YEARLY_PRODUCT_ID ||
      process.env.DODO_PAYMENTS_PRO_PRODUCT_ID ||
      null
    );
  }
  return (
    process.env.DODO_PAYMENTS_PRO_MONTHLY_PRODUCT_ID ||
    process.env.DODO_PAYMENTS_PRO_PRODUCT_ID ||
    null
  );
}

export function isDodoPaymentsConfigured(): boolean {
  return Boolean(
    process.env.DODO_PAYMENTS_API_KEY &&
      (process.env.DODO_PAYMENTS_PRO_PRODUCT_ID ||
        process.env.DODO_PAYMENTS_PRO_MONTHLY_PRODUCT_ID ||
        process.env.DODO_PAYMENTS_PRO_YEARLY_PRODUCT_ID)
  );
}

function formatDodoError(status: number, detail: string): string {
  try {
    const parsed = JSON.parse(detail);
    if (
      parsed.code === "MERCHANT_NOT_LIVE" ||
      parsed.message?.includes("Live payments not enabled")
    ) {
      return "Live payments are not yet enabled on your Dodo Payments account. Please complete verification in your Dodo dashboard (or switch to test mode with a test API key).";
    }
    if (parsed.error === "Unauthorized" || parsed.code === "UNAUTHORIZED") {
      return parsed.message || "Invalid Dodo Payments API key. Please check your credentials.";
    }
    if (parsed.message) {
      return `Dodo Payments: ${parsed.message}`;
    }
  } catch {
    // Ignore JSON parsing error and fallback
  }
  return `Dodo Payments checkout creation failed (${status}): ${detail.slice(0, 300)}`;
}

export async function createDodoCheckout(input: {
  plan: SubscriptionPlan;
  user: {
    id: string;
    email?: string | null;
    username?: string | null;
    displayName?: string | null;
  };
  origin: string;
  returnUrl?: string;
  country?: string | null;
}): Promise<{ checkoutUrl: string }> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error("Dodo Payments API key is not configured.");
  }

  const productId = getDodoProductId(input.plan);
  if (!productId) {
    throw new Error(
      `Dodo Payments product id for ${input.plan} plan is not configured.`
    );
  }

  const baseUrl = getDodoBaseUrl();
  const customerName =
    input.user.displayName || input.user.username || "Chess Rebel";
  const customerEmail =
    input.user.email || `player_${input.user.id.slice(0, 8)}@doomchess.local`;
  const returnUrl = input.returnUrl || `${input.origin}/?checkout=success`;
  const country = input.country || "US";

  // First, try standard checkout sessions endpoint (modern Dodo Payments API)
  try {
    const checkoutRes = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: {
          email: customerEmail,
          name: customerName,
        },
        billing_address: {
          country,
        },
        return_url: returnUrl,
        metadata: {
          userId: input.user.id,
          email: customerEmail,
          plan: input.plan,
        },
      }),
      cache: "no-store",
    });

    if (checkoutRes.ok) {
      const data = (await checkoutRes.json().catch(() => ({}))) as {
        checkout_url?: string;
        payment_link?: string;
        url?: string;
      };
      const url = data.checkout_url || data.payment_link || data.url;
      if (url) {
        return { checkoutUrl: url };
      }
    } else {
      const errText = await checkoutRes.text().catch(() => "");
      console.warn(`[createDodoCheckout] /checkouts returned ${checkoutRes.status}:`, errText);
      try {
        const parsed = JSON.parse(errText);
        if (
          parsed.code === "MERCHANT_NOT_LIVE" ||
          parsed.message?.includes("Live payments not enabled") ||
          parsed.error === "Unauthorized" ||
          parsed.code === "UNAUTHORIZED"
        ) {
          throw new Error(formatDodoError(checkoutRes.status, errText));
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.includes("Dodo Payments")) {
          throw parseErr;
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Dodo Payments")) {
      throw err;
    }
    console.warn("[createDodoCheckout] /checkouts endpoint attempt:", err);
  }

  // Fallback to /subscriptions endpoint
  const subRes = await fetch(`${baseUrl}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      billing: {
        country,
      },
      customer: {
        email: customerEmail,
        name: customerName,
      },
      payment_link: true,
      product_id: productId,
      quantity: 1,
      return_url: returnUrl,
      metadata: {
        userId: input.user.id,
        email: customerEmail,
        plan: input.plan,
      },
    }),
    cache: "no-store",
  });

  if (!subRes.ok) {
    const detail = await subRes.text().catch(() => "");
    throw new Error(formatDodoError(subRes.status, detail));
  }

  const data = (await subRes.json().catch(() => ({}))) as {
    payment_link?: string;
    url?: string;
    checkout_url?: string;
  };
  const url = data.payment_link || data.checkout_url || data.url;
  if (!url) {
    throw new Error("Dodo Payments did not return a checkout URL.");
  }

  return { checkoutUrl: url };
}

export function verifyDodoSignature(
  rawBody: string,
  headers: {
    webhookId?: string | null;
    webhookTimestamp?: string | null;
    webhookSignature?: string | null;
  },
  secret?: string | null
): boolean {
  const webhookSecret = secret || process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!rawBody || !webhookSecret) return false;

  const { webhookId, webhookTimestamp, webhookSignature } = headers;

  // 1. Standard Webhook verification (Svix / Standard Webhooks)
  if (webhookId && webhookTimestamp && webhookSignature) {
    const toSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;

    const rawSecret = webhookSecret.startsWith("whsec_")
      ? Buffer.from(webhookSecret.slice(6), "base64")
      : Buffer.from(webhookSecret, "utf8");

    const expectedBase64 = createHmac("sha256", rawSecret)
      .update(toSign, "utf8")
      .digest("base64");
    const expectedHex = createHmac("sha256", rawSecret)
      .update(toSign, "utf8")
      .digest("hex");

    const utf8Secret = Buffer.from(webhookSecret, "utf8");
    const expectedBase64Raw = createHmac("sha256", utf8Secret)
      .update(toSign, "utf8")
      .digest("base64");
    const expectedHexRaw = createHmac("sha256", utf8Secret)
      .update(toSign, "utf8")
      .digest("hex");

    const signatures: string[] = [];
    for (const part of webhookSignature.split(/\s+/)) {
      for (const item of part.split(",")) {
        const cleaned = item.trim().replace(/^v\d+[=,]/, "").trim();
        if (cleaned && cleaned !== "v1" && cleaned !== "v0") {
          signatures.push(cleaned);
        }
      }
    }

    for (const sig of signatures) {
      if (
        sig === expectedBase64 ||
        sig === expectedHex ||
        sig === expectedBase64Raw ||
        sig === expectedHexRaw
      ) {
        return true;
      }
    }
  }

  // 2. Direct HMAC fallback
  const directSig = webhookSignature || headers.webhookSignature;
  if (directSig) {
    const directExpected = createHmac("sha256", webhookSecret)
      .update(rawBody, "utf8")
      .digest("hex");
    const directExpectedBase64 = createHmac("sha256", webhookSecret)
      .update(rawBody, "utf8")
      .digest("base64");
    const cleanSig = directSig.trim().replace(/^v\d+[=,]/, "").trim().toLowerCase();
    if (
      cleanSig === directExpected.toLowerCase() ||
      directSig.trim() === directExpectedBase64 ||
      cleanSig === directExpectedBase64
    ) {
      return true;
    }
  }

  return false;
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
