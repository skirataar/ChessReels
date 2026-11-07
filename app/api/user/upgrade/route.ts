import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { activateSubscription, normalizePlan } from "@/lib/billing";

/**
 * Legacy/demo upgrade endpoint.
 *
 * Kept for local development and onboarding demos. In production, Pro access
 * must go through `/api/billing/create-checkout` so entitlement is backed by a
 * verified provider webhook.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Direct upgrades are disabled. Start a subscription from the Pro upgrade modal.",
        checkoutRequired: true,
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const cookieSession = request.cookies.get("chess_reel_session")?.value;
    const targetUserId = body.userId || cookieSession;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Authentication required to upgrade account." },
        { status: 401 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    const plan = normalizePlan(body.plan) || "monthly";
    const gateway = body.gateway === "razorpay" ? "razorpay" : "global";

    const subscription = await activateSubscription({
      userId: existingUser.id,
      plan,
      provider: gateway,
      providerSubscriptionId: `legacy_dev_${gateway}_${Date.now()}`,
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatar: true,
        elo: true,
        peakElo: true,
        streak: true,
        bestStreak: true,
        isCalibrated: true,
        calibrationStep: true,
        plan: true,
        isPro: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        paymentProvider: true,
        currentPeriodEnd: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "Account upgraded to Pro successfully!",
      user: updatedUser,
      subscription,
      plan: "premium",
    });

    response.cookies.set("chess_reel_session", targetUserId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Failed to upgrade user:", error);
    return NextResponse.json(
      { error: "Failed to process upgrade" },
      { status: 500 }
    );
  }
}
