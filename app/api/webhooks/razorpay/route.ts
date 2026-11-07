import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  activateSubscription,
  cancelSubscription,
  normalizePlan,
  parsePeriodEnd,
  verifyRazorpaySignature,
} from "@/lib/billing";


const ACTIVATION_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "subscription.resumed",
  "subscription.authenticated",
]);

const CANCELLATION_EVENTS = new Set([
  "subscription.cancelled",
  "subscription.halted",
  "subscription.paused",
  "subscription.expired",
]);

interface RazorpayEntity {
  id?: string;
  status?: string;
  current_end?: number | string | null;
  charge_at?: number | string | null;
  subscription_id?: string;
  notes?: Record<string, unknown>;
}

interface RazorpayWebhook {
  event?: string;
  payload?: {
    subscription?: { entity?: RazorpayEntity };
    payment?: { entity?: RazorpayEntity };
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Razorpay webhook secret is not configured." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpaySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let payload: RazorpayWebhook;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const event = payload.event || "";
  const subscription = payload.payload?.subscription?.entity;
  const payment = payload.payload?.payment?.entity;

  const notes = subscription?.notes || payment?.notes || {};
  const providerSubscriptionId =
    readString(subscription?.id) || readString(payment?.subscription_id);
  let userId =
    readString(notes.userId) || readString(notes.user_id) || null;

  let plan = normalizePlan(readString(notes.plan));

  if (!plan && userId) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true },
    });
    plan = normalizePlan(existing?.subscriptionPlan);
  }

  const periodEnd = parsePeriodEnd(
    subscription?.current_end ?? payment?.current_end ?? subscription?.charge_at
  );

  try {
    if (ACTIVATION_EVENTS.has(event)) {
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
        provider: "razorpay",
        providerSubscriptionId,
        currentPeriodEnd: periodEnd,
      });

      return NextResponse.json({ received: true, event, subscription: result });
    }

    if (CANCELLATION_EVENTS.has(event)) {
      const result = await cancelSubscription({
        userId,
        providerSubscriptionId,
        provider: "razorpay",
        status: "cancelled",
        currentPeriodEnd: periodEnd,
        revokeImmediately: event === "subscription.expired",
      });

      if (!result) {
        return NextResponse.json({ received: true, ignored: "user_not_found" });
      }

      return NextResponse.json({ received: true, event, subscription: result });
    }

    // Acknowledge other lifecycle events (pending, failed, etc.) without
    // mutating entitlement. Razorpay retries non-2xx responses.
    return NextResponse.json({ received: true, event, ignored: "unhandled_event" });
  } catch (error) {
    console.error("[/api/webhooks/razorpay] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
