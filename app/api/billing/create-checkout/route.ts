import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import {
  createDodoCheckout,
  isDodoPaymentsConfigured,
  isRazorpayConfigured,
  normalizePlan,
} from "@/lib/billing";
import {
  createRazorpayOrderForPlan,
  isRazorpayOrdersConfigured,
  RazorpayRequestError,
} from "@/lib/razorpay";

interface CheckoutBody {
  plan?: string;
  gateway?: string;
}

function appOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return request.nextUrl.origin;
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
    const gateway =
      body.gateway === "razorpay"
        ? "razorpay"
        : body.gateway === "global" || body.gateway === "dodo"
        ? "global"
        : null;

    if (!plan || !gateway) {
      return NextResponse.json(
        { error: "A valid plan (monthly|yearly) and gateway (razorpay|global) are required." },
        { status: 400 }
      );
    }

    const userId = request.cookies.get("chess_reel_session")?.value;
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required to start checkout." },
        { status: 401 }
      );
    }

    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true, displayName: true },
      })
    );

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    if (gateway === "razorpay") {
      // Recurring subscriptions are preferred when plan ids are configured.
      if (isRazorpayConfigured()) {
        const result = await createRazorpaySubscription({ plan, userId: user.id });
        return NextResponse.json({
          checkoutMode: "subscription",
          ...result,
          gateway,
          plan,
        });
      }

      // Standard Checkout fallback: only the key pair is configured, so create
      // a one-time order and verify its signature on the client.
      if (isRazorpayOrdersConfigured()) {
        const order = await createRazorpayOrderForPlan({
          plan,
          userId: user.id,
        });
        return NextResponse.json({
          checkoutMode: "order",
          ...order,
          order_id: order.orderId,
          keyId: order.keyId,
          gateway,
          plan,
        });
      }

      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          mockMode: true,
          gateway,
          plan,
          reason: "razorpay_credentials_missing",
        });
      }
      return NextResponse.json(
        { error: "Razorpay is not configured on this deployment." },
        { status: 503 }
      );
    }

    if (!isDodoPaymentsConfigured()) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          mockMode: true,
          gateway: "dodo",
          plan,
          reason: "dodo_credentials_missing",
        });
      }
      return NextResponse.json(
        { error: "International checkout (Dodo Payments) is not configured on this deployment." },
        { status: 503 }
      );
    }

    const origin = appOrigin(request);
    const countryHeader =
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      "US";

    const result = await createDodoCheckout({
      plan,
      user,
      origin,
      country: countryHeader,
    });

    return NextResponse.json({ ...result, gateway: "dodo", plan });
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
