import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import {
  isRazorpayConfigured,
  normalizePlan,
} from "@/lib/billing";
import {
  createRazorpayOrderForPlan,
  getPlanAmountPaise,
  isRazorpayOrdersConfigured,
  normalizeCurrency,
  RazorpayRequestError,
} from "@/lib/razorpay";
import { getPricingForCountry, normalizeCountryCode } from "@/lib/pricing";

interface CheckoutBody {
  plan?: string;
  gateway?: string;
  currency?: string;
  userId?: string;
}

async function createRazorpaySubscription(input: {
  plan: "monthly" | "yearly";
  userId: string;
}): Promise<{ subscriptionId: string; keyId: string }> {
  const keyId = process.env.RAZORPAY_KEY_ID as string;
  const keySecret = process.env.RAZORPAY_KEY_SECRET as string;
  const planId =
    input.plan === "yearly"
      ? (process.env.RAZORPAY_PLAN_YEARLY_ID as string)
      : (process.env.RAZORPAY_PLAN_MONTHLY_ID as string);

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      // Twelve monthly cycles / ten yearly cycles, renewable after that.
      total_count: input.plan === "yearly" ? 10 : 12,
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId: input.userId,
        user_id: input.userId,
        plan: input.plan,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Razorpay subscription creation failed (${response.status}): ${detail.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as { id?: string };
  if (!data?.id) {
    throw new Error("Razorpay did not return a subscription id.");
  }

  return { subscriptionId: data.id, keyId };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckoutBody;
    const plan = normalizePlan(body.plan);

    if (!plan) {
      return NextResponse.json(
        { error: "A valid plan (monthly|yearly) is required." },
        { status: 400 }
      );
    }

    const sessionUserId = request.cookies.get("chess_reel_session")?.value;
    const targetUserId =
      sessionUserId ||
      (typeof body.userId === "string" ? body.userId.trim() : null);

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Authentication required to start checkout." },
        { status: 401 }
      );
    }

    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, username: true, displayName: true },
      })
    );

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    // Determine currency: explicit parameter or edge geolocation headers
    let currency: string;
    if (body.currency) {
      const parsed = normalizeCurrency(body.currency);
      currency = parsed || "INR";
    } else {
      const countryHeader =
        request.headers.get("x-vercel-ip-country") ||
        request.headers.get("cf-ipcountry") ||
        request.headers.get("x-country-code");
      const resolvedCountry = normalizeCountryCode(countryHeader) || "US";
      const pricing = getPricingForCountry(resolvedCountry);
      currency = pricing.currency;
    }

    // Recurring subscriptions are preferred when plan ids are configured AND currency is INR.
    if (currency === "INR" && isRazorpayConfigured()) {
      const result = await createRazorpaySubscription({ plan, userId: user.id });
      return NextResponse.json({
        checkoutMode: "subscription",
        ...result,
        gateway: "razorpay",
        currency,
        plan,
      });
    }

    // Standard Checkout order creation: supported across INR, USD, GBP, EUR.
    if (isRazorpayOrdersConfigured()) {
      const amount = await getPlanAmountPaise(plan, currency);
      if (amount === null) {
        return NextResponse.json(
          {
            error: `Razorpay Standard Checkout does not support ${currency} for this plan.`,
          },
          { status: 400 }
        );
      }

      const order = await createRazorpayOrderForPlan({
        plan,
        userId: user.id,
        currency,
      });

      return NextResponse.json({
        checkoutMode: "order",
        ...order,
        order_id: order.orderId,
        keyId: order.keyId,
        key_id: order.keyId,
        gateway: "razorpay",
        currency: order.currency,
        plan,
      });
    }

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        mockMode: true,
        gateway: "razorpay",
        plan,
        currency,
        reason: "razorpay_credentials_missing",
      });
    }

    return NextResponse.json(
      { error: "Razorpay is not configured on this deployment." },
      { status: 503 }
    );
  } catch (error: unknown) {
    console.error("[/api/billing/create-checkout] Error:", error);

    if (error instanceof RazorpayRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? sanitizeDbError(error)
            : "Could not start checkout. Please try again.",
      },
      { status: 502 }
    );
  }
}
