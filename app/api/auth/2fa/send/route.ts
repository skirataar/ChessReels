import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import { hashSecurityCode } from "@/lib/auth";
import { sendSecurityOtpEmail } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const identifier = body.email || body.username || sessionCookie;

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "Email or user identifier is required." },
        { status: 400 }
      );
    }

    const clean = identifier.trim();

    const user = await withDbRetry(() =>
      prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: clean, mode: "insensitive" } },
            { username: { equals: clean, mode: "insensitive" } },
            { id: clean },
          ],
        },
      })
    );

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "No email address linked to this account for two-factor authentication." },
        { status: 400 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = hashSecurityCode(code);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await withDbRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorCode: hashed,
          twoFactorExpires: expires,
        },
      })
    );

    await sendSecurityOtpEmail(user.email, code, "2FA");

    return NextResponse.json({
      success: true,
      email: user.email,
      message: "Security code sent to your registered email.",
    });
  } catch (error) {
    console.error("[/api/auth/2fa/send POST] Error:", error);
    return NextResponse.json(
      { error: sanitizeDbError(error) || "Failed to dispatch security code." },
      { status: 500 }
    );
  }
}

