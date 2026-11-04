import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username or email is required." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Query user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: cleanUsername },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
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
        passwordHash: true,
        googleId: true,
        plan: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: `Account "${cleanUsername}" does not exist. Please check your credentials.` },
        { status: 404 }
      );
    }

    // Account Security Verification: Enforce password authentication
    if (user.passwordHash) {
      if (!password || typeof password !== "string") {
        return NextResponse.json(
          { error: "Password is required to sign in." },
          { status: 400 }
        );
      }

      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Incorrect password. Please try again." },
          { status: 401 }
        );
      }
    } else if (user.googleId) {
      return NextResponse.json(
        { error: "This account is linked with Google. Please use 'Continue with Google' to sign in." },
        { status: 401 }
      );
    } else {
      // Legacy account created before password enforcement:
      // Require user to set a password (min 6 characters) to access it
      if (!password || typeof password !== "string" || password.trim().length < 6) {
        return NextResponse.json(
          {
            error:
              "This account requires a password (minimum 6 characters) to sign in. Please enter a password to secure your account.",
          },
          { status: 401 }
        );
      }

      // Secure the account with the provided password
      const { hashPassword } = await import("@/lib/auth");
      const newHash = hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
    }

    // Clean user response object without secret fields
    const safeUser = {
      id: user.id,
      username: user.username || cleanUsername,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "♟",
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
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
    });

    // Set secure authentication cookie
    response.cookies.set("chess_reel_session", user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Failed to sign in. Please try again." },
      { status: 500 }
    );
  }
}
