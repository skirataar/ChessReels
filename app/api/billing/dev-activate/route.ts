import { NextRequest, NextResponse } from "next/server";
import {
  activateSubscription,
  normalizePlan,
} from "@/lib/billing";


/**
 * POST /api/billing/dev-activate
 *
 * Development-only simulated checkout completion. This lets the full
 * subscription activation flow be exercised locally when provider keys are not
 * populated. It is hard-disabled in production.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      plan?: string;
      gateway?: string;
    };

    const plan = normalizePlan(body.plan);
    const gateway = body.gateway === "razorpay" ? "razorpay" : "global";

    if (!plan) {
      return NextResponse.json(
        { error: "A valid plan (monthly|yearly) is required." },
        { status: 400 }
      );
    }

    const userId = request.cookies.get("chess_reel_session")?.value;
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required to activate a subscription." },
        { status: 401 }
      );
    }

    const subscription = await activateSubscription({
      userId,
      plan,
      provider: gateway,
      providerSubscriptionId: `dev_${gateway}_${Date.now()}`,
    });

    if (!subscription) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      mockMode: true,
      subscription,
    });
  } catch (error) {
    console.error("[/api/billing/dev-activate] Error:", error);
    return NextResponse.json(
      { error: "Could not activate the development subscription." },
      { status: 500 }
    );
  }
}
