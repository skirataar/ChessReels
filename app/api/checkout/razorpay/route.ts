import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import { normalizePlan } from "@/lib/billing";
import {
  createRazorpayOrderForPlan,
  getPlanAmountPaise,
  isRazorpayOrdersConfigured,
  normalizeCurrency,
  RazorpayRequestError,
} from "@/lib/razorpay";
import { getPricingForCountry, normalizeCountryCode } from "@/lib/pricing";

interface RazorpayCheckoutBody {
  plan?: string;
  currency?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as RazorpayCheckoutBody;
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
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
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

    // Verify that this currency and plan have a supported subunit amount
    const amount = await getPlanAmountPaise(plan, currency);
    if (amount === null) {
      return NextResponse.json(
        {
          error: `Razorpay Standard Checkout does not support ${currency} for this plan.`,
        },
        { status: 400 }
      );
    }

    // Standard Checkout order creation
    if (isRazorpayOrdersConfigured()) {
      const order = await createRazorpayOrderForPlan({
        plan,
        userId: user.id,
        currency,
      });

      return NextResponse.json({
        checkoutMode: "order",
        orderId: order.orderId,
        order_id: order.orderId,
        keyId: order.keyId,
        key_id: order.keyId,
        amount: order.amount,
        currency: order.currency,
        gateway: "razorpay",
        plan,
      });
    }

    // Development fallback when Razorpay keys are not configured
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
    console.error("[/api/checkout/razorpay] Error:", error);

    if (error instanceof RazorpayRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? sanitizeDbError(error)
            : "Could not start checkout. Please try again.",
      },
      { status: 500 }
    );
  }
}
