import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry } from "@/lib/prisma";
import {
  computePeriodEnd,
  normalizePlan,
  parsePeriodEnd,
  verifyDodoSignature,
  type SubscriptionPlan,
} from "@/lib/billing";

const ACTIVATION_EVENTS = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.created",
  "subscription.resumed",
  "payment.succeeded",
  "checkout.session.completed",
]);

const CANCELLATION_EVENTS = new Set([
  "subscription.cancelled",
  "subscription.canceled",
  "subscription.expired",
  "subscription.failed",
  "subscription.on_hold",
  "subscription.paused",
  "payment.failed",
]);

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Dodo Payments webhook secret is not configured." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();

  const webhookId =
    request.headers.get("webhook-id") ||
    request.headers.get("webhook_id") ||
    request.headers.get("x-webhook-id");
  const webhookTimestamp =
    request.headers.get("webhook-timestamp") ||
    request.headers.get("webhook_timestamp") ||
    request.headers.get("x-webhook-timestamp");
  const webhookSignature =
    request.headers.get("webhook-signature") ||
    request.headers.get("webhook_signature") ||
    request.headers.get("x-webhook-signature") ||
    request.headers.get("x-signature");

  const isValid = verifyDodoSignature(
    rawBody,
    { webhookId, webhookTimestamp, webhookSignature },
    webhookSecret
  );

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const event = String(
    payload.type || payload.event_type || payload.event || ""
  ).toLowerCase();

  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : payload.metadata && typeof payload.metadata === "object"
      ? (payload.metadata as Record<string, unknown>)
      : {};

  const customer =
    data.customer && typeof data.customer === "object"
      ? (data.customer as Record<string, unknown>)
      : {};

  const providerSubscriptionId =
    readString(data.subscription_id) ||
    readString(data.id) ||
    readString(data.payment_id) ||
    null;

  let userId =
    readString(metadata.userId) ||
    readString(metadata.user_id) ||
    null;

  const customerEmail =
    readString(customer.email) ||
    readString(data.email) ||
    readString(metadata.email) ||
    null;

  const rawProductId = readString(data.product_id);
  let plan: SubscriptionPlan | null =
    normalizePlan(readString(metadata.plan)) ||
    (rawProductId &&
    rawProductId === process.env.DODO_PAYMENTS_PRO_YEARLY_PRODUCT_ID
      ? "yearly"
      : rawProductId &&
        rawProductId === process.env.DODO_PAYMENTS_PRO_MONTHLY_PRODUCT_ID
      ? "monthly"
      : null);

  const periodEnd = parsePeriodEnd(
    data.next_billing_date ||
      data.expires_at ||
      data.current_period_end ||
      data.renews_at ||
      data.ends_at
  );

  const status = String(data.status || "").toLowerCase();

  try {
    // Resolve user by subscription id or customer email if missing in metadata
    if (!userId && providerSubscriptionId) {
      const bySub = await withDbRetry(() =>
        prisma.user.findFirst({
          where: { providerSubscriptionId },
          select: { id: true, subscriptionPlan: true },
        })
      );
      if (bySub) {
        userId = bySub.id;
        if (!plan) plan = normalizePlan(bySub.subscriptionPlan);
      }
    }

    if (!userId && customerEmail) {
      const byEmail = await withDbRetry(() =>
        prisma.user.findUnique({
          where: { email: customerEmail },
          select: { id: true, subscriptionPlan: true },
        })
      );
      if (byEmail) {
        userId = byEmail.id;
        if (!plan) plan = normalizePlan(byEmail.subscriptionPlan);
      }
    }

    if (!userId) {
      return NextResponse.json({ received: true, ignored: "user_not_found" });
    }

    const resolvedUserId: string = userId;

    const shouldActivate =
      ACTIVATION_EVENTS.has(event) ||
      (event === "subscription.updated" &&
        (status === "active" || status === "paid" || status === "on_trial"));

    if (shouldActivate) {
      const finalPlan: SubscriptionPlan = plan || "monthly";
      const finalPeriodEnd =
        periodEnd && periodEnd.getTime() > Date.now()
          ? periodEnd
          : computePeriodEnd(finalPlan);

      const user = await withDbRetry(() =>
        prisma.user.update({
          where: { id: resolvedUserId },
          data: {
            isPro: true,
            plan: "pro",
            subscriptionPlan: finalPlan,
            subscriptionStatus: "active",
            paymentProvider: "dodo",
            providerSubscriptionId: providerSubscriptionId ?? undefined,
            currentPeriodEnd: finalPeriodEnd,
          },
          select: {
            id: true,
            isPro: true,
            subscriptionStatus: true,
            subscriptionPlan: true,
            paymentProvider: true,
            providerSubscriptionId: true,
            currentPeriodEnd: true,
          },
        })
      );

      return NextResponse.json({
        received: true,
        event,
        subscription: user,
      });
    }

    const shouldCancel =
      CANCELLATION_EVENTS.has(event) ||
      (event === "subscription.updated" &&
        (status === "cancelled" ||
          status === "canceled" ||
          status === "expired"));

    if (shouldCancel) {
      const isExpired =
        event === "subscription.expired" ||
        event === "subscription.failed" ||
        status === "expired";

      const user = await withDbRetry(() =>
        prisma.user.update({
          where: { id: resolvedUserId },
          data: {
            isPro: isExpired
              ? false
              : periodEnd
              ? periodEnd.getTime() > Date.now()
              : false,
            subscriptionStatus: isExpired ? "expired" : "cancelled",
            currentPeriodEnd: periodEnd ?? undefined,
          },
          select: {
            id: true,
            isPro: true,
            subscriptionStatus: true,
          },
        })
      );

      return NextResponse.json({
        received: true,
        event,
        subscription: user,
      });
    }

    return NextResponse.json({
      received: true,
      event,
      ignored: "unhandled_event",
    });
  } catch (error) {
    console.error("[/api/webhooks/dodo] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
