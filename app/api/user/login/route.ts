import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        elo: true,
        peakElo: true,
        streak: true,
        bestStreak: true,
        isCalibrated: true,
        calibrationStep: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: `Account with username "${cleanUsername}" does not exist.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Failed to sign in. Please try again." },
      { status: 500 }
    );
  }
}
