import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { activateSubscription, SUBSCRIPTION_SELECT, type SubscriptionPlan } from "@/lib/billing";
import {
  fetchRazorpayOrder,
  getPlanAmountPaise,
  getRazorpayCredentials,
  planFromOrderNotes,
  RazorpayRequestError,
  userIdFromOrderNotes,
  verifyRazorpayPaymentSignature,
} from "@/lib/razorpay";

interface VerifyPaymentBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  order_id?: string;
  payment_id?: string;
  signature?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as VerifyPaymentBody;

    const orderId = (body.razorpay_order_id || body.order_id || "").trim();
    const paymentId = (body.razorpay_payment_id || body.payment_id || "").trim();
    const signature = (body.razorpay_signature || body.signature || "").trim();

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "razorpay_order_id, razorpay_payment_id and razorpay_signature are required.",
        },
        { status: 400 }
      );
    }

    if (!getRazorpayCredentials()) {
      return NextResponse.json(
        { success: false, error: "Razorpay is not configured on this deployment." },
        { status: 503 }
      );
    }

    const verification = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!verification.valid) {
      // Never mark an order as paid unless the HMAC matches.
      return NextResponse.json(
        { success: false, error: "Invalid payment signature." },
        { status: 400 }
      );
    }

    // Read the plan and user from the order we created server-side. Client input
    // cannot be trusted to decide who gets Pro or for how long.
    const order = await fetchRazorpayOrder(orderId);
    const notes = (order.notes || {}) as Record<string, unknown>;
    const userId = userIdFromOrderNotes(notes);
    const plan: SubscriptionPlan | null = planFromOrderNotes(notes);

    let subscription = null;

    if (userId && plan) {
      const expectedAmount = await getPlanAmountPaise(plan, order.currency);
      if (expectedAmount === null || Number(order.amount) !== expectedAmount) {
        return NextResponse.json(
          { success: false, error: "Order amount does not match the selected plan." },
          { status: 400 }
        );
      }

      // Idempotency: replaying the same order/payment/signature must not extend
      // Pro repeatedly. The order id is recorded as the provider id on the user.
      const alreadyProcessed = await prisma.user.findFirst({
        where: { providerSubscriptionId: orderId },
        select: SUBSCRIPTION_SELECT,
      });
      if (alreadyProcessed) {
        return NextResponse.json({
          success: true,
          verified: true,
          order_id: orderId,
          payment_id: paymentId,
          activated: false,
          alreadyProcessed: true,
          plan,
          subscription: alreadyProcessed,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "User account not found for this order." },
          { status: 404 }
        );
      }

      subscription = await activateSubscription({
        userId,
        plan,
        provider: "razorpay",
        // A one-time Standard Checkout order does not auto-renew; the paid
        // period is granted now and can be renewed with another order.
        providerSubscriptionId: orderId,
        currentPeriodEnd: null,
      });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      order_id: orderId,
      payment_id: paymentId,
      activated: Boolean(subscription),
      plan,
      subscription,
    });
  } catch (error: unknown) {
    console.error("[/api/verify-payment] Error:", error);

    if (error instanceof RazorpayRequestError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Could not verify the payment. Please try again." },
      { status: 500 }
    );
  }
}
