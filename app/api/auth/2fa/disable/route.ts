import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const identifier = body.userId || body.email || sessionCookie;

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const clean = identifier.trim();

    const user = await withDbRetry(() =>
      prisma.user.findFirst({
        where: {
          OR: [
            { id: clean },
            { email: { equals: clean, mode: "insensitive" } },
          ],
        },
      })
    );

    if (!user) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    await withDbRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorCode: null,
          twoFactorExpires: null,
        },
      })
    );

    return NextResponse.json({
      success: true,
      twoFactorEnabled: false,
      message: "Two-factor authentication disabled.",
    });
  } catch (error) {
    console.error("[/api/auth/2fa/disable POST] Error:", error);
    return NextResponse.json(
      { error: sanitizeDbError(error) || "Failed to disable 2FA." },
      { status: 500 }
    );
  }
}

