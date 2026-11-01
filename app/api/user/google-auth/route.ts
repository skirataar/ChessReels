import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, googleId, avatar, skillLevel } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email address is required for Google authentication." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanGoogleId = googleId?.toString().trim() || `google_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;

    // 1. Check if user already exists by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: cleanGoogleId }, { email: cleanEmail }],
      },
      select: {
        id: true,
        email: true,
        googleId: true,
        username: true,
        displayName: true,
        avatar: true,
        skillTier: true,
        elo: true,
        peakElo: true,
        streak: true,
        bestStreak: true,
        isCalibrated: true,
        calibrationStep: true,
      },
    });

    if (user) {
      // If user exists but googleId was not linked yet, link it
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: cleanGoogleId },
          select: {
            id: true,
            email: true,
            googleId: true,
            username: true,
            displayName: true,
            avatar: true,
            skillTier: true,
            elo: true,
            peakElo: true,
            streak: true,
            bestStreak: true,
            isCalibrated: true,
            calibrationStep: true,
          },
        });
      }

      return NextResponse.json({
        success: true,
        isNewUser: false,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          elo: user.elo,
          isCalibrated: user.isCalibrated,
          calibrationStep: user.calibrationStep,
        },
      });
    }

    // 2. New user registration via Google:
    // Skill baseline calculation (Beginner: 600, Intermediate: 1200, Advanced: 1600)
    const initialSkill =
      skillLevel === "beginner"
        ? "beginner"
        : skillLevel === "advanced"
        ? "advanced"
        : "intermediate";
    const baseElo =
      initialSkill === "beginner" ? 600 : initialSkill === "advanced" ? 1600 : 1200;

    // Generate unique username from email prefix or name
    let baseUsername = (name || cleanEmail.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 15);

    if (baseUsername.length < 3) {
      baseUsername = `player_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let finalUsername = baseUsername;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
      finalUsername = `${baseUsername.slice(0, 14)}_${counter}`;
      counter++;
    }

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        googleId: cleanGoogleId,
        username: finalUsername,
        displayName: name?.trim() || finalUsername,
        avatar: avatar || "♚",
        skillTier: initialSkill,
        elo: baseElo,
        peakElo: baseElo,
        streak: 0,
        bestStreak: 0,
        isCalibrated: false,
        calibrationStep: 0,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        elo: true,
        isCalibrated: true,
        calibrationStep: true,
      },
    });

    return NextResponse.json({
      success: true,
      isNewUser: true,
      user: newUser,
    });
  } catch (error) {
    console.error("Google authentication failed:", error);
    return NextResponse.json(
      { error: "Google authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
