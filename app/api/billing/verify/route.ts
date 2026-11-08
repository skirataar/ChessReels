import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  activateSubscription,
  computePeriodEnd,
  normalizePlan,
  SUBSCRIPTION_SELECT,
  type SubscriptionPlan,
} from "@/lib/billing";
import {
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  fetchRazorpaySubscription,
  getPlanAmountPaise,
  getRazorpayCredentials,
  planFromOrderNotes,
  RazorpayRequestError,
  userIdFromOrderNotes,
  verifyRazorpayPaymentSignature,
  verifyRazorpaySubscriptionSignature,
} from "@/lib/razorpay";


interface VerifyBillingBody {
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  payment_id?: string;
  subscription_id?: string;
  order_id?: string;
  signature?: string;
  plan?: string;
}

const PAID_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "authenticated",
  "charged",
]);

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

  // Razorpay returns Unix timestamps in seconds.
  const date = new Date(raw < 10_000_000_000 ? raw * 1000 : raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function isFuture(date: Date | null): boolean {
  return Boolean(date && date.getTime() > Date.now());
}

/**
 * POST /api/billing/verify
 *
 * Synchronous, webhook-independent activation for Razorpay checkout.
 * Supports both recurring subscriptions (`payment|subscription` signature) and
 * one-time Standard Checkout orders (`order|payment` signature).
 *
 * The client calls this immediately from the Razorpay `handler` and retries on
 * mobile network wake-up failures, so Pro activates even when a webhook is
 * delayed, mis-configured, or fails to reach the deployment.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as VerifyBillingBody;

    const paymentId = readString(
      body.razorpay_payment_id || body.payment_id
    );
    const subscriptionId = readString(
      body.razorpay_subscription_id || body.subscription_id
    );
    const orderId = readString(body.razorpay_order_id || body.order_id);
    const signature = readString(
      body.razorpay_signature || body.signature
    );
    const requestedPlan = normalizePlan(body.plan);

    if (!paymentId || (!subscriptionId && !orderId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "razorpay_payment_id and either razorpay_subscription_id or razorpay_order_id are required.",
        },
        { status: 400 }
      );
    }

    if (!getRazorpayCredentials()) {
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay is not configured on this deployment.",
        },
        { status: 503 }
      );
    }

    const sessionUserId =
      readString(request.cookies.get("chess_reel_session")?.value) || null;

    let signatureValid = false;
    if (signature) {
      signatureValid = subscriptionId
        ? verifyRazorpaySubscriptionSignature({
            subscriptionId,
            paymentId,
            signature,
          }).valid
        : verifyRazorpayPaymentSignature({
            orderId,
            paymentId,
            signature,
          }).valid;
    }

    let providerUserId: string | null = null;
    let plan: SubscriptionPlan | null = null;
    let periodEnd: Date | null = null;
    let providerPaid = false;
    let providerId = subscriptionId || orderId;

    if (subscriptionId) {
      // Direct provider lookup is authoritative and does not depend on webhooks.
      let subscription: Awaited<
        ReturnType<typeof fetchRazorpaySubscription>
      > | null = null;
      try {
        subscription = await fetchRazorpaySubscription(subscriptionId);
      } catch {
        subscription = null;
      }

      if (subscription) {
        const notes = (subscription.notes || {}) as Record<string, unknown>;
        providerUserId = userIdFromOrderNotes(notes);
        plan = planFromOrderNotes(notes);
        periodEnd =
          unixToDate(subscription.current_end) ||
          unixToDate(subscription.charge_at);

        const status = readString(subscription.status).toLowerCase();
        const paidCount = Number(subscription.paid_count || 0);
        providerPaid =
          PAID_SUBSCRIPTION_STATUSES.has(status) ||
          paidCount > 0 ||
          isFuture(periodEnd);
      }

      // If the signature was absent/invalid, use the payment itself as a
      // second provider-side proof that the first charge was captured.
      if (!signatureValid && !providerPaid) {
        try {
          const payment = await fetchRazorpayPayment(paymentId);
          const notes = (payment.notes || {}) as Record<string, unknown>;
          const status = readString(payment.status).toLowerCase();
          const belongsToSubscription =
            !payment.subscription_id ||
            payment.subscription_id === subscriptionId;

          if (
            status === "captured" &&
            belongsToSubscription &&
            payment.captured !== false
          ) {
            providerPaid = true;
            providerUserId =
              providerUserId || userIdFromOrderNotes(notes);
            plan = plan || planFromOrderNotes(notes);
            periodEnd = periodEnd || unixToDate(payment.created_at);
          }
        } catch {
          // The subscription lookup already failed; report verification below.
        }
      }
    } else {
      // One-time Standard Checkout order flow.
      let order: Awaited<ReturnType<typeof fetchRazorpayOrder>> | null = null;
      try {
        order = await fetchRazorpayOrder(orderId);
      } catch {
        order = null;
      }

      if (order) {
        const notes = (order.notes || {}) as Record<string, unknown>;
        providerUserId = userIdFromOrderNotes(notes);
        plan = planFromOrderNotes(notes);
        const expectedAmount = plan
          ? await getPlanAmountPaise(plan, order.currency)
          : null;

        if (
          plan &&
          expectedAmount !== null &&
          Number(order.amount) !== expectedAmount
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "Order amount does not match the selected plan.",
            },
            { status: 400 }
          );
        }

        providerPaid =
          readString(order.status).toLowerCase() === "paid" ||
          Boolean((order as { paid?: boolean }).paid);
      }

      if (!signatureValid && !providerPaid) {
        try {
          const payment = await fetchRazorpayPayment(paymentId);
          const notes = (payment.notes || {}) as Record<string, unknown>;
          const status = readString(payment.status).toLowerCase();
          const belongsToOrder =
            !payment.order_id || payment.order_id === orderId;

          if (
            status === "captured" &&
            belongsToOrder &&
            payment.captured !== false
          ) {
            providerPaid = true;
            providerUserId =
              providerUserId || userIdFromOrderNotes(notes);
            plan = plan || planFromOrderNotes(notes);
            periodEnd = periodEnd || unixToDate(payment.created_at);
          }
        } catch {
          // Report verification failure below.
        }
      }
    }

    // A valid Razorpay signature is cryptographic proof of a completed checkout.
    if (!signatureValid && !providerPaid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment could not be verified. If money was deducted, use Restore Purchase or contact support.",
        },
        { status: 400 }
      );
    }

    // Never let a payment activate an account it does not belong to.
    if (
      providerUserId &&
      sessionUserId &&
      providerUserId !== sessionUserId
    ) {
      return NextResponse.json(
        { success: false, error: "This payment belongs to a different account." },
        { status: 403 }
      );
    }

    const userId = providerUserId || sessionUserId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to verify a payment." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscriptionPlan: true,
        providerSubscriptionId: true,
        isPro: true,
        currentPeriodEnd: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found for this payment." },
        { status: 404 }
      );
    }

    const resolvedPlan: SubscriptionPlan =
      plan ||
      requestedPlan ||
      normalizePlan(user.subscriptionPlan) ||
      "monthly";

    if (!periodEnd) {
      periodEnd = computePeriodEnd(resolvedPlan);
    }

    // Idempotency: repeated client retries / restore clicks must not stack
    // extra paid periods on the same provider subscription.
    const alreadyActiveSameProvider =
      user.providerSubscriptionId === providerId &&
      user.isPro &&
      (!user.currentPeriodEnd ||
        new Date(user.currentPeriodEnd).getTime() > Date.now());

    if (alreadyActiveSameProvider) {
      return NextResponse.json({
        success: true,
        isPro: true,
        activated: false,
        alreadyProcessed: true,
        plan: resolvedPlan,
        paymentId,
        subscriptionId: subscriptionId || undefined,
        orderId: orderId || undefined,
        currentPeriodEnd: user.currentPeriodEnd
          ? new Date(user.currentPeriodEnd).toISOString()
          : null,
      });
    }

    const subscription = await activateSubscription({
      userId,
      plan: resolvedPlan,
      provider: "razorpay",
      providerSubscriptionId: providerId,
      currentPeriodEnd: periodEnd,
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "User account not found for this payment." },
        { status: 404 }
      );
    }

    const currentPeriodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd).toISOString()
      : null;

    return NextResponse.json({
      success: true,
      isPro: true,
      activated: true,
      verified: true,
      plan: resolvedPlan,
      paymentId,
      subscriptionId: subscriptionId || undefined,
      orderId: orderId || undefined,
      currentPeriodEnd,
      subscription,
    });
  } catch (error: unknown) {
    console.error("[/api/billing/verify] Error:", error);

    if (error instanceof RazorpayRequestError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Could not verify the payment. Please try again.",
      },
      { status: 500 }
    );
  }
}
