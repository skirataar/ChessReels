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
        targetElo: true,
        streak: true,
        bestStreak: true,
        lastSolvedDate: true,
        streakFreezes: true,
        perfectWeekCounter: true,
        isFrozenState: true,
        solvedPuzzleIds: true,
        savedPuzzleIds: true,
        likedPuzzleIds: true,
        autoAdvance: true,
        soundEnabled: true,
        showCoordinates: true,
        isCalibrated: true,
        calibrationStep: true,
        plan: true,
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
            targetElo: true,
            streak: true,
            bestStreak: true,
            lastSolvedDate: true,
            streakFreezes: true,
            perfectWeekCounter: true,
            isFrozenState: true,
            solvedPuzzleIds: true,
            savedPuzzleIds: true,
            likedPuzzleIds: true,
            autoAdvance: true,
            soundEnabled: true,
            showCoordinates: true,
            isCalibrated: true,
            calibrationStep: true,
            plan: true,
          },
        });
      }

      const response = NextResponse.json({
        success: true,
        isNewUser: false,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          elo: user.elo,
          peakElo: user.peakElo,
          targetElo: user.targetElo ?? 1500,
          streak: user.streak,
          bestStreak: user.bestStreak,
          lastSolvedDate: user.lastSolvedDate ?? null,
          streakFreezes: user.streakFreezes ?? 0,
          perfectWeekCounter: user.perfectWeekCounter ?? 0,
          isFrozenState: user.isFrozenState ?? false,
          solvedPuzzleIds: user.solvedPuzzleIds ?? [],
          savedPuzzleIds: user.savedPuzzleIds ?? [],
          likedPuzzleIds: user.likedPuzzleIds ?? [],
          autoAdvance: user.autoAdvance ?? false,
          soundEnabled: user.soundEnabled ?? true,
          showCoordinates: user.showCoordinates ?? true,
          isCalibrated: user.isCalibrated,
          calibrationStep: user.calibrationStep,
          plan: user.plan || "free",
        },
      });

      response.cookies.set("chess_reel_session", user.id, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      response.cookies.set("chess_reel_pending_google", "", {
        path: "/",
        maxAge: 0,
      });

      return response;
    }

    // 2. New user registration via Google:
    // Determine initial Elo (custom calibrated startingElo if supplied, else skill baseline)
    const initialSkill =
      skillLevel === "beginner"
        ? "beginner"
        : skillLevel === "advanced"
        ? "advanced"
        : "intermediate";
    const fallbackBaseElo =
      initialSkill === "beginner" ? 600 : initialSkill === "advanced" ? 1600 : 1200;

    const baseElo =
      typeof body.elo === "number"
        ? Math.max(400, Math.min(2600, body.elo))
        : typeof body.startingElo === "number"
        ? Math.max(400, Math.min(2600, body.startingElo))
        : fallbackBaseElo;

    // Generate unique username from custom input, name, or email prefix
    let preferredUsername = (body.username || name || cleanEmail.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 15);

    if (preferredUsername.length < 3) {
      preferredUsername = `player_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let finalUsername = preferredUsername;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
      finalUsername = `${preferredUsername.slice(0, 11)}_${counter}`;
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
        targetElo: 1500,
        lastSolvedDate: null,
        streakFreezes: 0,
        perfectWeekCounter: 0,
        isFrozenState: false,
        solvedPuzzleIds: [],
        savedPuzzleIds: [],
        likedPuzzleIds: [],
        autoAdvance: false,
        soundEnabled: true,
        showCoordinates: true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        elo: true,
        peakElo: true,
        targetElo: true,
        streak: true,
        bestStreak: true,
        lastSolvedDate: true,
        streakFreezes: true,
        perfectWeekCounter: true,
        isFrozenState: true,
        solvedPuzzleIds: true,
        savedPuzzleIds: true,
        likedPuzzleIds: true,
        autoAdvance: true,
        soundEnabled: true,
        showCoordinates: true,
        isCalibrated: true,
        calibrationStep: true,
        plan: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      isNewUser: true,
      user: newUser,
    });

    response.cookies.set("chess_reel_session", newUser.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set("chess_reel_pending_google", "", {
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Google authentication failed:", error);
    return NextResponse.json(
      { error: "Google authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
