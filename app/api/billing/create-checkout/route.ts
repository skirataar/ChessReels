import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  isLemonSqueezyConfigured,
  isRazorpayConfigured,
  normalizePlan,
} from "@/lib/billing";


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

async function createLemonSqueezyCheckout(input: {
  plan: "monthly" | "yearly";
  userId: string;
  origin: string;
}): Promise<{ checkoutUrl: string }> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY as string;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID as string;
  const variantId =
    input.plan === "yearly"
      ? (process.env.LEMONSQUEEZY_VARIANT_YEARLY_ID as string)
      : (process.env.LEMONSQUEEZY_VARIANT_MONTHLY_ID as string);

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: {
              user_id: input.userId,
              userId: input.userId,
              plan: input.plan,
            },
          },
          product_options: {
            redirect_url: `${input.origin}/?checkout=success`,
            enabled_variants: [Number(variantId)],
          },
        },
        relationships: {
          store: {
            data: { type: "stores", id: storeId },
          },
          variant: {
            data: { type: "variants", id: variantId },
          },
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Lemon Squeezy checkout creation failed (${response.status}): ${detail.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as {
    data?: { attributes?: { url?: string } };
  };
  const url = data?.data?.attributes?.url;
  if (!url) {
    throw new Error("Lemon Squeezy did not return a checkout URL.");
  }

  return { checkoutUrl: url };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckoutBody;
    const plan = normalizePlan(body.plan);
    const gateway = body.gateway === "razorpay" ? "razorpay" : body.gateway === "global" ? "global" : null;

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    if (gateway === "razorpay") {
      if (!isRazorpayConfigured()) {
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

      const result = await createRazorpaySubscription({ plan, userId: user.id });
      return NextResponse.json({ ...result, gateway, plan });
    }

    if (!isLemonSqueezyConfigured()) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          mockMode: true,
          gateway,
          plan,
          reason: "lemonsqueezy_credentials_missing",
        });
      }
      return NextResponse.json(
        { error: "Global checkout is not configured on this deployment." },
        { status: 503 }
      );
    }

    const result = await createLemonSqueezyCheckout({
      plan,
      userId: user.id,
      origin: appOrigin(request),
    });

    return NextResponse.json({ ...result, gateway, plan });
  } catch (error: unknown) {
    console.error("[/api/billing/create-checkout] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not start checkout. Please try again.",
      },
      { status: 502 }
    );
  }
}
