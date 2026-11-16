import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import {
  createDodoCheckout,
  isDodoPaymentsConfigured,
  normalizePlan,
} from "@/lib/billing";

interface DodoCheckoutBody {
  plan?: string;
  returnUrl?: string;
  userId?: string;
}

function appOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as DodoCheckoutBody;
    const plan = normalizePlan(body.plan) || "monthly";

    const sessionUserId = request.cookies.get("chess_reel_session")?.value;
    const userId = sessionUserId || (typeof body.userId === "string" ? body.userId : null);

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in or create an account to start your Pro subscription." },
        { status: 401 }
      );
    }

    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
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
      returnUrl: body.returnUrl,
      country: countryHeader,
    });

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      gateway: "dodo",
      plan,
    });
  } catch (error: unknown) {
    console.error("[/api/checkout/dodo] Error:", error);
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
