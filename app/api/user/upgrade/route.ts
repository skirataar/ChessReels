import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
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

    // Verify user exists in database
    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // Escalate account privilege in PostgreSQL to premium / pro
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        plan: "premium",
      },
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
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "Account upgraded to Pro successfully!",
      user: updatedUser,
      plan: "premium",
    });

    // Ensure session cookie is maintained
    response.cookies.set("chess_reel_session", updatedUser.id, {
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
