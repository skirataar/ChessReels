import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  activateSubscription,
  cancelSubscription,
  normalizePlan,
  parsePeriodEnd,
  verifyLemonSqueezySignature,
} from "@/lib/billing";


const ACTIVATION_EVENTS = new Set([
  "subscription_created",
  "subscription_resumed",
  "subscription_payment_success",
  "subscription_payment_recovered",
]);

const CANCELLATION_EVENTS = new Set(["subscription_cancelled", "subscription_expired"]);

interface LemonAttributes {
  status?: string;
  variant_id?: number | string | null;
  renews_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
}

interface LemonWebhook {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: LemonAttributes;
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function planFromVariant(variantId: unknown): "monthly" | "yearly" | null {
  if (variantId === undefined || variantId === null) return null;
  const id = String(variantId);
  if (id && id === String(process.env.LEMONSQUEEZY_VARIANT_MONTHLY_ID)) return "monthly";
  if (id && id === String(process.env.LEMONSQUEEZY_VARIANT_YEARLY_ID)) return "yearly";
  return null;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Lemon Squeezy webhook secret is not configured." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let payload: LemonWebhook;
  try {
    payload = JSON.parse(rawBody) as LemonWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const event = payload.meta?.event_name || "";
  const custom = payload.meta?.custom_data || {};
  const attributes = payload.data?.attributes || {};
  const providerSubscriptionId = readString(payload.data?.id);

  let userId = readString(custom.user_id) || readString(custom.userId);
  let plan =
    normalizePlan(readString(custom.plan)) ||
    planFromVariant(attributes.variant_id);

  const periodEnd = parsePeriodEnd(attributes.renews_at || attributes.ends_at);
  const status = (attributes.status || "").toLowerCase();

  try {
    const shouldActivate =
      ACTIVATION_EVENTS.has(event) ||
      (event === "subscription_updated" &&
        (status === "active" || status === "on_trial" || status === "paid"));

    if (shouldActivate) {
      if (!userId && providerSubscriptionId) {
        const existing = await prisma.user.findFirst({
          where: { providerSubscriptionId },
          select: { id: true, subscriptionPlan: true },
        });
        userId = existing?.id || null;
        if (!plan) plan = normalizePlan(existing?.subscriptionPlan);
      }

      if (!userId) {
        return NextResponse.json({ received: true, ignored: "user_not_found" });
      }

      const result = await activateSubscription({
        userId,
        plan: plan || "monthly",
        provider: "global",
        providerSubscriptionId,
        currentPeriodEnd: periodEnd,
      });

      return NextResponse.json({ received: true, event, subscription: result });
    }

    const shouldCancel =
      CANCELLATION_EVENTS.has(event) ||
      (event === "subscription_updated" &&
        (status === "cancelled" || status === "expired")) ||
      event === "subscription_paused";

    if (shouldCancel) {
      const result = await cancelSubscription({
        userId,
        providerSubscriptionId,
        provider: "global",
        status: "cancelled",
        currentPeriodEnd: periodEnd,
        revokeImmediately:
          event === "subscription_expired" || status === "expired",
      });

      if (!result) {
        return NextResponse.json({ received: true, ignored: "user_not_found" });
      }

      return NextResponse.json({ received: true, event, subscription: result });
    }

    if (event === "subscription_payment_failed") {
      const result = await cancelSubscription({
        userId,
        providerSubscriptionId,
        provider: "global",
        status: "past_due",
        currentPeriodEnd: periodEnd,
        revokeImmediately: false,
      });

      return NextResponse.json({ received: true, event, subscription: result });
    }

    return NextResponse.json({ received: true, event, ignored: "unhandled_event" });
  } catch (error) {
    console.error("[/api/webhooks/global] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
