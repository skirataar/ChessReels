import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePlan } from "@/lib/billing";
import {
  createRazorpayOrder,
  getPlanAmountPaise,
  MIN_ORDER_AMOUNT_PAISE,
  normalizeCurrency,
  RazorpayRequestError,
} from "@/lib/razorpay";

interface CreateOrderBody {
  amount?: number | string;
  currency?: string;
  receipt?: string;
  plan?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateOrderBody;

    const userId = request.cookies.get("chess_reel_session")?.value;
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required to create an order." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const currency = normalizeCurrency(body.currency);
    if (!currency) {
      return NextResponse.json(
        { error: "A valid ISO currency code is required." },
        { status: 400 }
      );
    }

    const rawPlan = typeof body.plan === "string" ? body.plan.trim() : "";
    const plan = rawPlan ? normalizePlan(rawPlan) : null;
    if (rawPlan && !plan) {
      return NextResponse.json(
        { error: "plan must be either monthly or yearly." },
        { status: 400 }
      );
    }

    // For Pro purchases the price is always derived server-side; a client can
    // pick a plan but must never decide how much it costs.
    let amount: number;
    if (plan) {
      const derived = await getPlanAmountPaise(plan, currency);
      if (derived === null) {
        return NextResponse.json(
          { error: `Razorpay does not support ${currency} for this plan.` },
          { status: 400 }
        );
      }
      amount = derived;
    } else {
      amount = Number(body.amount);
    }

    if (!Number.isFinite(amount) || Math.round(amount) < MIN_ORDER_AMOUNT_PAISE) {
      return NextResponse.json(
        { error: `amount must be at least ${MIN_ORDER_AMOUNT_PAISE} paise.` },
        { status: 400 }
      );
    }

    const receipt =
      typeof body.receipt === "string" && body.receipt.trim()
        ? body.receipt.trim()
        : undefined;
    if (receipt && receipt.length > 40) {
      return NextResponse.json(
        { error: "receipt must be 40 characters or fewer." },
        { status: 400 }
      );
    }

    const order = await createRazorpayOrder({
      userId: user.id,
      plan,
      amount,
      currency,
      receipt,
    });

    return NextResponse.json({
      order_id: order.orderId,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: order.keyId,
      plan: plan || null,
    });
  } catch (error: unknown) {
    console.error("[/api/create-order] Error:", error);

    if (error instanceof RazorpayRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Could not create the Razorpay order. Please try again." },
      { status: 500 }
    );
  }
}
