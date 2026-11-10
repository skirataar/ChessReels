import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import {
  activateSubscription,
  computePeriodEnd,
  normalizePlan,
  parsePeriodEnd,
  type BillingProvider,
  type SubscriptionPlan,
} from "@/lib/billing";
import {
  fetchRazorpayPayment,
  fetchRazorpaySubscription,
  getPlanAmountPaise,
  getRazorpayCredentials,
  listRazorpayPayments,
  listRazorpaySubscriptions,
  RazorpayRequestError,
} from "@/lib/razorpay";
import { isActiveProAccount } from "@/lib/tierTypes";


interface RestoreCandidate {
  provider: BillingProvider;
  providerSubscriptionId: string;
  plan: SubscriptionPlan | null;
  currentPeriodEnd: Date | null;
  source: "subscription" | "payment";
}

interface LemonSubscriptionAttributes {
  status?: string;
  variant_id?: number | string | null;
  renews_at?: string | null;
  ends_at?: string | null;
  user_email?: string | null;
}

interface LemonSubscription {
  id?: string;
  attributes?: LemonSubscriptionAttributes;
}

const PAID_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "authenticated",
  "charged",
  "paid",
  "on_trial",
]);

const ACTIVE_LEMON_STATUSES = new Set(["active", "on_trial", "paid"]);

const USER_STATS_SELECT = {
  id: true,
  email: true,
  username: true,
  elo: true,
  streak: true,
  isPro: true,
  plan: true,
  subscriptionStatus: true,
  subscriptionPlan: true,
  paymentProvider: true,
  providerSubscriptionId: true,
  currentPeriodEnd: true,
} as const;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unixToDate(value: unknown): Date | null {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : NaN;

  if (!Number.isFinite(raw) || raw <= 0) return null;

  const date = new Date(raw < 10_000_000_000 ? raw * 1000 : raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function planFromNotes(
  notes: Record<string, unknown> | null | undefined
): SubscriptionPlan | null {
  if (!notes) return null;
  return normalizePlan(
    typeof notes.plan === "string"
      ? notes.plan
      : typeof notes.Plan === "string"
      ? notes.Plan
      : null
  );
}

function userIdFromNotes(
  notes: Record<string, unknown> | null | undefined
): string | null {
  if (!notes) return null;
  const raw = notes.userId ?? notes.user_id;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function planFromLemonVariant(
  variantId: number | string | null | undefined
): SubscriptionPlan | null {
  if (variantId === undefined || variantId === null) return null;
  const id = String(variantId);

  if (id === String(process.env.LEMONSQUEEZY_VARIANT_MONTHLY_ID)) {
    return "monthly";
  }
  if (id === String(process.env.LEMONSQUEEZY_VARIANT_YEARLY_ID)) {
    return "yearly";
  }
  return null;
}

async function inferPlanFromAmount(
  amount: unknown,
  currency: string
): Promise<SubscriptionPlan | null> {
  const paidAmount = Number(amount);
  if (!Number.isFinite(paidAmount)) return null;

  const monthly = await getPlanAmountPaise("monthly", currency);
  const yearly = await getPlanAmountPaise("yearly", currency);

  if (monthly !== null && paidAmount === monthly) return "monthly";
  if (yearly !== null && paidAmount === yearly) return "yearly";
  return null;
}

function pickBestCandidate(
  candidates: RestoreCandidate[]
): RestoreCandidate | null {
  if (candidates.length === 0) return null;

  const deduped = new Map<string, RestoreCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.provider}:${candidate.providerSubscriptionId}`;
    const existing = deduped.get(key);
    if (
      !existing ||
      (candidate.currentPeriodEnd?.getTime() ?? 0) >
        (existing.currentPeriodEnd?.getTime() ?? 0)
    ) {
      deduped.set(key, candidate);
    }
  }

  return (
    Array.from(deduped.values()).sort((a, b) => {
      if (a.source !== b.source) return a.source === "subscription" ? -1 : 1;
      return (
        (b.currentPeriodEnd?.getTime() ?? 0) -
        (a.currentPeriodEnd?.getTime() ?? 0)
      );
    })[0] || null
  );
}

async function findRazorpayCandidates(input: {
  userId: string;
  email: string | null;
  providerSubscriptionId: string | null;
}): Promise<RestoreCandidate[]> {
  if (!getRazorpayCredentials()) return [];

  const candidates: RestoreCandidate[] = [];

  // 1. The provider id already stored on the account is cheap to check first.
  if (input.providerSubscriptionId) {
    try {
      const subscription = await fetchRazorpaySubscription(
        input.providerSubscriptionId
      );
      const notes = (subscription.notes || {}) as Record<string, unknown>;
      const owner = userIdFromNotes(notes);
      const status = readString(subscription.status).toLowerCase();
      const periodEnd =
        unixToDate(subscription.current_end) ||
        unixToDate(subscription.charge_at);

      if (
        (!owner || owner === input.userId) &&
        (PAID_SUBSCRIPTION_STATUSES.has(status) ||
          Number(subscription.paid_count || 0) > 0)
      ) {
        candidates.push({
          provider: "razorpay",
          providerSubscriptionId: subscription.id,
          plan: planFromNotes(notes),
          currentPeriodEnd: periodEnd,
          source: "subscription",
        });
      }
    } catch {
      // It may be a one-time order id rather than a subscription id; fall
      // through to the history scan below.
    }
  }

  // 2. Scan recent subscriptions and match against the account in notes.
  try {
    for (let page = 0; page < 3; page++) {
      const result = await listRazorpaySubscriptions({
        count: 100,
        skip: page * 100,
      });
      const items = Array.isArray(result?.items) ? result.items : [];

      for (const subscription of items) {
        const notes = (subscription.notes || {}) as Record<string, unknown>;
        if (userIdFromNotes(notes) !== input.userId) continue;

        const status = readString(subscription.status).toLowerCase();
        const periodEnd =
          unixToDate(subscription.current_end) ||
          unixToDate(subscription.charge_at);
        if (
          !PAID_SUBSCRIPTION_STATUSES.has(status) &&
          Number(subscription.paid_count || 0) === 0
        ) {
          continue;
        }

        candidates.push({
          provider: "razorpay",
          providerSubscriptionId: subscription.id,
          plan: planFromNotes(notes),
          currentPeriodEnd: periodEnd,
          source: "subscription",
        });
      }

      if (items.length < 100) break;
    }
  } catch {
    // A provider outage should not prevent the stored-id check from working.
  }

  // 3. Scan recent captured payments and match notes, email or linked order.
  try {
    const from = Math.floor(
      Date.now() / 1000 - 400 * 24 * 60 * 60
    );

    for (let page = 0; page < 3; page++) {
      const result = await listRazorpayPayments({
        count: 100,
        skip: page * 100,
        from,
      });
      const items = Array.isArray(result?.items) ? result.items : [];

      for (const payment of items) {
        if (readString(payment.status).toLowerCase() !== "captured") continue;
        if (payment.captured === false) continue;

        const notes = (payment.notes || {}) as Record<string, unknown>;
        const notesOwner = userIdFromNotes(notes);
        const emailMatches =
          Boolean(input.email) &&
          readString(payment.email).toLowerCase() ===
            (input.email || "").toLowerCase();

        if (notesOwner !== input.userId && !emailMatches) continue;

        let plan = planFromNotes(notes);
        if (!plan) {
          plan = await inferPlanFromAmount(
            payment.amount,
            readString(payment.currency) || "INR"
          );
        }

        candidates.push({
          provider: "razorpay",
          providerSubscriptionId:
            readString(payment.subscription_id) ||
            readString(payment.order_id) ||
            payment.id,
          plan,
          currentPeriodEnd: unixToDate(payment.created_at),
          source: "payment",
        });
      }

      if (items.length < 100) break;
    }
  } catch {
    // Ignore payment history failures; subscriptions may still restore access.
  }

  return candidates;
}

async function fetchLemonSubscriptionById(
  subscriptionId: string
): Promise<LemonSubscription | null> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(
      subscriptionId
    )}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as {
    data?: LemonSubscription;
  } | null;
  return payload?.data || null;
}

async function findLemonCandidates(input: {
  userId: string;
  email: string | null;
  providerSubscriptionId: string | null;
}): Promise<RestoreCandidate[]> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) return [];

  const candidates: RestoreCandidate[] = [];

  if (input.providerSubscriptionId) {
    try {
      const subscription = await fetchLemonSubscriptionById(
        input.providerSubscriptionId
      );
      const status = readString(
        subscription?.attributes?.status
      ).toLowerCase();
      if (
        subscription?.id &&
        ACTIVE_LEMON_STATUSES.has(status) &&
        (!input.email ||
          !subscription.attributes?.user_email ||
          subscription.attributes.user_email.toLowerCase() ===
            input.email.toLowerCase())
      ) {
        candidates.push({
          provider: "global",
          providerSubscriptionId: subscription.id,
          plan: planFromLemonVariant(subscription.attributes?.variant_id),
          currentPeriodEnd: parsePeriodEnd(
            subscription.attributes?.renews_at ||
              subscription.attributes?.ends_at
          ),
          source: "subscription",
        });
      }
    } catch {
      // Ignore and fall through to the email-filtered list.
    }
  }

  if (input.email) {
    try {
      const response = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions?filter[user_email]=${encodeURIComponent(
          input.email
        )}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
          cache: "no-store",
        }
      );

      if (response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          data?: LemonSubscription[];
        } | null;

        for (const subscription of payload?.data || []) {
          const status = readString(
            subscription.attributes?.status
          ).toLowerCase();
          if (!subscription.id || !ACTIVE_LEMON_STATUSES.has(status)) continue;

          candidates.push({
            provider: "global",
            providerSubscriptionId: subscription.id,
            plan: planFromLemonVariant(subscription.attributes?.variant_id),
            currentPeriodEnd: parsePeriodEnd(
              subscription.attributes?.renews_at ||
                subscription.attributes?.ends_at
            ),
            source: "subscription",
          });
        }
      }
    } catch {
      // Ignore provider lookup failures and report "not found" to the client.
    }
  }

  return candidates;
}

/**
 * POST /api/billing/restore
 *
 * Authenticated, webhook-independent recovery for users who paid but never
 * received Pro (for example, the browser closed before verification, a mobile
 * network dropped the callback, or the webhook was not delivered).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = readString(
      request.cookies.get("chess_reel_session")?.value
    );
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to restore a purchase." },
        { status: 401 }
      );
    }

    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          subscriptionPlan: true,
          providerSubscriptionId: true,
          paymentProvider: true,
          isPro: true,
          currentPeriodEnd: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found." },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      plan?: string;
    };
    const requestedPlan = normalizePlan(body.plan);

    const [razorpayCandidates, lemonCandidates] = await Promise.all([
      findRazorpayCandidates({
        userId: user.id,
        email: user.email,
        providerSubscriptionId: user.providerSubscriptionId,
      }),
      findLemonCandidates({
        userId: user.id,
        email: user.email,
        providerSubscriptionId: user.providerSubscriptionId,
      }),
    ]);

    const candidate = pickBestCandidate([
      ...razorpayCandidates,
      ...lemonCandidates,
    ]);

    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          isPro: false,
          error:
            "No active or captured payment was found for this account. If money was deducted, please contact support with your payment id.",
        },
        { status: 404 }
      );
    }

    const plan: SubscriptionPlan =
      candidate.plan ||
      requestedPlan ||
      normalizePlan(user.subscriptionPlan) ||
      "monthly";

    const periodEnd =
      candidate.currentPeriodEnd && candidate.currentPeriodEnd.getTime() > Date.now()
        ? candidate.currentPeriodEnd
        : computePeriodEnd(plan);

    const alreadyActiveSameProvider =
      user.providerSubscriptionId === candidate.providerSubscriptionId &&
      isActiveProAccount({
        isPro: user.isPro,
        subscriptionStatus: "active",
        paymentProvider: candidate.provider,
        currentPeriodEnd: user.currentPeriodEnd,
      });

    const subscription = alreadyActiveSameProvider
      ? null
      : await activateSubscription({
          userId: user.id,
          plan,
          provider: candidate.provider,
          providerSubscriptionId: candidate.providerSubscriptionId,
          currentPeriodEnd: periodEnd,
        });

    if (!alreadyActiveSameProvider && !subscription) {
      return NextResponse.json(
        { success: false, error: "Could not activate the subscription." },
        { status: 500 }
      );
    }

    const updated = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: user.id },
        select: USER_STATS_SELECT,
      })
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "User account not found." },
        { status: 404 }
      );
    }

    const isPro = isActiveProAccount(updated);
    const currentPeriodEnd = updated.currentPeriodEnd
      ? new Date(updated.currentPeriodEnd).toISOString()
      : null;

    return NextResponse.json({
      success: true,
      restored: true,
      isPro,
      alreadyProcessed: alreadyActiveSameProvider,
      plan,
      paymentProvider: candidate.provider,
      providerSubscriptionId: candidate.providerSubscriptionId,
      currentPeriodEnd,
      user: {
        ...updated,
        isPro,
        plan: isPro ? "premium" : "free",
      },
      stats: {
        elo: updated.elo,
        currentStreak: updated.streak,
        isPro,
        subscriptionStatus: updated.subscriptionStatus ?? "none",
        subscriptionPlan: updated.subscriptionPlan ?? plan,
        currentPeriodEnd,
      },
    });
  } catch (error: unknown) {
    console.error("[/api/billing/restore] Error:", error);

    if (error instanceof RazorpayRequestError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: (error instanceof Error ? sanitizeDbError(error) : null) || "Could not restore the purchase. Please try again.",
      },
      { status: 500 }
    );
  }
}
