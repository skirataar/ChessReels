import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { getTierConfig } from "./tierConfig";
import { normalizePlan, SubscriptionPlan } from "./billing";

/**
 * Server-only Razorpay helpers.
 *
 * Two checkout modes are supported:
 *  - Subscriptions (when RAZORPAY_PLAN_*_ID is configured) — recurring.
 *  - Orders / Standard Checkout (when only KEY_ID + KEY_SECRET exist) — one-time.
 */

export const MIN_ORDER_AMOUNT_PAISE = 100;

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

export interface RazorpayOrderSummary {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  keyId: string;
}

let cachedClient: Razorpay | null = null;
let cachedClientKey: string | null = null;

export function getRazorpayCredentials(): RazorpayCredentials | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

/** True when the key pair needed for Standard Checkout orders is present. */
export function isRazorpayOrdersConfigured(): boolean {
  return getRazorpayCredentials() !== null;
}

export function getRazorpayClient(): Razorpay | null {
  const credentials = getRazorpayCredentials();
  if (!credentials) return null;

  const cacheKey = `${credentials.keyId}:${credentials.keySecret}`;
  if (!cachedClient || cachedClientKey !== cacheKey) {
    cachedClient = new Razorpay({
      key_id: credentials.keyId,
      key_secret: credentials.keySecret,
    });
    cachedClientKey = cacheKey;
  }

  return cachedClient;
}

export function normalizeCurrency(raw?: string | null): string | null {
  if (!raw) return "INR";
  const clean = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(clean) ? clean : null;
}

/**
 * Server-authoritative price for a Pro plan. The browser never decides how much
 * to charge; it only picks a plan, and the amount is derived here.
 */
export async function getPlanAmountPaise(
  plan: SubscriptionPlan,
  currency: string
): Promise<number | null> {
  if (currency !== "INR") return null;

  const tierConfig = await getTierConfig();
  const monthlyAmount = tierConfig.proMonthlyPrice;
  const yearlyAmount = Math.round(
    monthlyAmount * 12 * (1 - tierConfig.annualDiscountPercent / 100)
  );
  const amount = plan === "yearly" ? yearlyAmount : monthlyAmount;
  return Math.round(amount * 100);
}

export function buildReceipt(userId: string): string {
  const prefix = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  return `rcpt_${prefix}_${Date.now().toString(36)}`.slice(0, 40);
}

function isRazorpayError(error: unknown): error is {
  statusCode?: number | string;
  error?: { description?: string; code?: string };
} {
  return typeof error === "object" && error !== null;
}

export class RazorpayRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RazorpayRequestError";
    this.status = status;
  }
}

/** Create a Standard Checkout order for a Pro plan. */
export async function createRazorpayOrderForPlan(input: {
  userId: string;
  plan: SubscriptionPlan;
  currency?: string | null;
  receipt?: string | null;
}): Promise<RazorpayOrderSummary> {
  const credentials = getRazorpayCredentials();
  const client = getRazorpayClient();

  if (!credentials || !client) {
    throw new RazorpayRequestError(
      "Razorpay is not configured on this deployment.",
      503
    );
  }

  const currency = normalizeCurrency(input.currency);
  if (!currency) {
    throw new RazorpayRequestError("A valid ISO currency code is required.", 400);
  }

  const amount = await getPlanAmountPaise(input.plan, currency);
  if (amount === null) {
    throw new RazorpayRequestError(
      `Razorpay Standard Checkout does not support ${currency} for this plan.`,
      400
    );
  }

  return createRazorpayOrder({
    userId: input.userId,
    plan: input.plan,
    amount,
    currency,
    receipt: input.receipt || buildReceipt(input.userId),
    keyId: credentials.keyId,
    client,
  });
}

/** Low-level order creation used by /api/create-order and checkout fallback. */
export async function createRazorpayOrder(input: {
  userId: string;
  plan?: SubscriptionPlan | null;
  amount: number;
  currency: string;
  receipt?: string | null;
  keyId?: string;
  client?: Razorpay;
}): Promise<RazorpayOrderSummary> {
  const credentials = getRazorpayCredentials();
  const client = input.client ?? getRazorpayClient();
  const keyId = input.keyId ?? credentials?.keyId;

  if (!client || !keyId) {
    throw new RazorpayRequestError(
      "Razorpay is not configured on this deployment.",
      503
    );
  }

  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount < MIN_ORDER_AMOUNT_PAISE) {
    throw new RazorpayRequestError(
      `Amount must be at least ${MIN_ORDER_AMOUNT_PAISE} paise.`,
      400
    );
  }

  const currency = normalizeCurrency(input.currency);
  if (!currency) {
    throw new RazorpayRequestError("A valid ISO currency code is required.", 400);
  }

  const receipt = (input.receipt || buildReceipt(input.userId)).slice(0, 40);

  try {
    const order = await client.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        userId: input.userId,
        user_id: input.userId,
        plan: input.plan || "",
      },
    });

    return {
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      receipt: order.receipt || receipt,
      keyId,
    };
  } catch (error: unknown) {
    if (isRazorpayError(error)) {
      const statusCode = Number(error.statusCode);
      // Razorpay uses 401 for bad credentials; surface it as an auth failure.
      if (statusCode === 401 || statusCode === 403) {
        throw new RazorpayRequestError(
          "Razorpay authentication failed. Check the configured API keys.",
          401
        );
      }

      const description = error.error?.description;
      if (description) {
        throw new RazorpayRequestError(description, 500);
      }
    }

    throw new RazorpayRequestError(
      "Could not create the Razorpay order. Please try again.",
      500
    );
  }
}

/** Fetch an order so activation can trust server-side notes, not client input. */
export async function fetchRazorpayOrder(orderId: string) {
  const client = getRazorpayClient();
  if (!client) {
    throw new RazorpayRequestError(
      "Razorpay is not configured on this deployment.",
      503
    );
  }

  try {
    return await client.orders.fetch(orderId);
  } catch (error: unknown) {
    if (isRazorpayError(error) && Number(error.statusCode) === 404) {
      throw new RazorpayRequestError("Razorpay order was not found.", 404);
    }
    throw new RazorpayRequestError(
      "Could not confirm the Razorpay order. Please try again.",
      500
    );
  }
}

/** Fetch a subscription directly from Razorpay (webhook-independent recovery). */
export async function fetchRazorpaySubscription(subscriptionId: string) {
  const client = getRazorpayClient();
  if (!client) {
    throw new RazorpayRequestError(
      "Razorpay is not configured on this deployment.",
      503
    );
  }

  try {
    return await client.subscriptions.fetch(subscriptionId);
  } catch (error: unknown) {
    if (isRazorpayError(error) && Number(error.statusCode) === 404) {
      throw new RazorpayRequestError("Razorpay subscription was not found.", 404);
    }
    throw new RazorpayRequestError(
      "Could not confirm the Razorpay subscription. Please try again.",
      500
    );
  }
}

/** Fetch a payment directly from Razorpay (webhook-independent recovery). */
export async function fetchRazorpayPayment(paymentId: string) {
  const client = getRazorpayClient();
  if (!client) {
    throw new RazorpayRequestError(
      "Razorpay is not configured on this deployment.",
      503
    );
  }

  try {
    return await client.payments.fetch(paymentId);
  } catch (error: unknown) {
    if (isRazorpayError(error) && Number(error.statusCode) === 404) {
      throw new RazorpayRequestError("Razorpay payment was not found.", 404);
    }
    throw new RazorpayRequestError(
      "Could not confirm the Razorpay payment. Please try again.",
      500
    );
  }
}

/** List Razorpay subscriptions, newest first. */
export async function listRazorpaySubscriptions(params?: {
  count?: number;
  skip?: number;
}) {
  const client = getRazorpayClient();
  if (!client) {
    throw new RazorpayRequestError(
      "Razorpay is not configured on this deployment.",
      503
    );
  }

  try {
    return await client.subscriptions.all({
      count: params?.count ?? 100,
      skip: params?.skip ?? 0,
    });
  } catch {
    throw new RazorpayRequestError(
      "Could not list Razorpay subscriptions. Please try again.",
      500
    );
  }
}

/** List Razorpay payments, newest first. */
export async function listRazorpayPayments(params?: {
  count?: number;
  skip?: number;
  from?: number;
  to?: number;
}) {
  const client = getRazorpayClient();
  if (!client) {
    throw new RazorpayRequestError(
      "Razorpay is not configured on this deployment.",
      503
    );
  }

  try {
    return await client.payments.all({
      count: params?.count ?? 100,
      skip: params?.skip ?? 0,
      from: params?.from,
      to: params?.to,
    });
  } catch {
    throw new RazorpayRequestError(
      "Could not list Razorpay payments. Please try again.",
      500
    );
  }
}

export interface RazorpayPaymentVerification {
  valid: boolean;
  orderId: string;
  paymentId: string;
}

/**
 * Verify Standard Checkout: HMAC-SHA256(`${order_id}|${payment_id}`, KEY_SECRET).
 */
export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): RazorpayPaymentVerification {
  const credentials = getRazorpayCredentials();
  if (!credentials) {
    return { valid: false, orderId: input.orderId, paymentId: input.paymentId };
  }

  const expected = createHmac("sha256", credentials.keySecret)
    .update(`${input.orderId}|${input.paymentId}`, "utf8")
    .digest("hex");
  const received = input.signature.trim().toLowerCase();

  if (expected.length !== received.length) {
    return { valid: false, orderId: input.orderId, paymentId: input.paymentId };
  }

  let valid = false;
  try {
    valid = timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(received, "utf8")
    );
  } catch {
    valid = false;
  }

  return { valid, orderId: input.orderId, paymentId: input.paymentId };
}

/**
 * Verify a Razorpay Subscription checkout:
 * HMAC-SHA256(`${payment_id}|${subscription_id}`, KEY_SECRET).
 */
export function verifyRazorpaySubscriptionSignature(input: {
  subscriptionId: string;
  paymentId: string;
  signature: string;
}): RazorpayPaymentVerification {
  const credentials = getRazorpayCredentials();
  if (!credentials) {
    return {
      valid: false,
      orderId: input.subscriptionId,
      paymentId: input.paymentId,
    };
  }

  const expected = createHmac("sha256", credentials.keySecret)
    .update(`${input.paymentId}|${input.subscriptionId}`, "utf8")
    .digest("hex");
  const received = input.signature.trim().toLowerCase();

  if (expected.length !== received.length) {
    return {
      valid: false,
      orderId: input.subscriptionId,
      paymentId: input.paymentId,
    };
  }

  let valid = false;
  try {
    valid = timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(received, "utf8")
    );
  } catch {
    valid = false;
  }

  return {
    valid,
    orderId: input.subscriptionId,
    paymentId: input.paymentId,
  };
}

export function planFromOrderNotes(
  notes: Record<string, unknown> | null | undefined
): SubscriptionPlan | null {
  if (!notes) return null;
  const raw = notes.plan ?? notes.Plan;
  return typeof raw === "string" ? normalizePlan(raw) : null;
}

export function userIdFromOrderNotes(
  notes: Record<string, unknown> | null | undefined
): string | null {
  if (!notes) return null;
  const raw = notes.userId ?? notes.user_id;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
