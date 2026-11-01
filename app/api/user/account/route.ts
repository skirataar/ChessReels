import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guestId, username, displayName, avatar, skillLevel } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Validate username format: alphanumeric and underscores, 3-20 chars
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-20 characters long and contain only letters, numbers, and underscores.",
        },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This username is already taken. Please choose another." },
        { status: 409 }
      );
    }

    // Calculate initial Elo baseline based on user self-selected skill level
    const initialSkill = skillLevel === "beginner" ? "beginner" : skillLevel === "advanced" ? "advanced" : "intermediate";
    const baseElo = initialSkill === "beginner" ? 600 : initialSkill === "advanced" ? 1600 : 1200;

    let user;

    // If guestId is provided and exists in DB, upgrade the user without inheriting guest Elo
    if (guestId) {
      const guestUser = await prisma.user.findUnique({
        where: { id: guestId },
      });

      if (guestUser) {
        user = await prisma.user.update({
          where: { id: guestId },
          data: {
            username: cleanUsername,
            displayName: displayName?.trim() || username.trim(),
            avatar: avatar || "♟",
            skillTier: initialSkill,
            elo: baseElo,
            peakElo: baseElo,
            streak: 0,
            bestStreak: 0,
            isCalibrated: false,
            calibrationStep: 0,
          },
        });
      }
    }

    // Otherwise create a fresh user
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: cleanUsername,
          displayName: displayName?.trim() || username.trim(),
          avatar: avatar || "♟",
          skillTier: initialSkill,
          elo: baseElo,
          peakElo: baseElo,
          streak: 0,
          bestStreak: 0,
          isCalibrated: false,
          calibrationStep: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        elo: user.elo,
        peakElo: user.peakElo,
        streak: user.streak,
        bestStreak: user.bestStreak,
        isCalibrated: user.isCalibrated,
        calibrationStep: user.calibrationStep,
      },
    });
  } catch (error) {
    console.error("Account creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const username = searchParams.get("username");

    if (!userId && !username) {
      return NextResponse.json(
        { error: "userId or username parameter required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: userId
        ? { id: userId }
        : { username: username?.trim().toLowerCase() },
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
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
