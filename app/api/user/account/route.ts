import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { isGuestUserId } from "@/lib/guestAccount";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guestId, username, password, email, displayName, avatar, skillLevel, startingElo, elo } = body;

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

    // Email validation and uniqueness
    let cleanEmail: string | undefined;
    if (email && typeof email === "string") {
      cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 }
        );
      }
      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail && existingEmail.id !== guestId) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }
    }

    // Password validation for manual account creation
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing && existing.id !== guestId) {
      return NextResponse.json(
        { error: "This username is already taken. Please choose another." },
        { status: 409 }
      );
    }

    // Secure password hashing
    const passwordHash = hashPassword(password);

    // Calculate initial Elo baseline based on user self-selected starting Elo or skill level
    const userElo =
      typeof elo === "number"
        ? elo
        : typeof startingElo === "number"
        ? startingElo
        : undefined;
    const initialSkill =
      skillLevel === "beginner"
        ? "beginner"
        : skillLevel === "advanced"
        ? "advanced"
        : "intermediate";
    const fallbackBaseElo =
      initialSkill === "beginner" ? 600 : initialSkill === "advanced" ? 1600 : 1200;
    const baseElo =
      typeof userElo === "number"
        ? Math.max(400, Math.min(2600, userElo))
        : fallbackBaseElo;

    const isTest = Boolean(body?.isTestAccount);

    let user;

    // If a prior registered row exists under this id, upgrade it without inheriting guest Elo
    if (guestId && !isGuestUserId(guestId)) {
      const guestUser = await prisma.user.findUnique({
        where: { id: guestId },
      });

      if (guestUser) {
        user = await prisma.user.update({
          where: { id: guestId },
          data: {
            username: cleanUsername,
            displayName: displayName?.trim() || cleanUsername,
            email: cleanEmail || undefined,
            avatar: avatar || "♟",
            skillTier: initialSkill,
            elo: baseElo,
            peakElo: baseElo,
            streak: 0,
            bestStreak: 0,
            isCalibrated: Boolean(body.isCalibrated),
            calibrationStep: typeof body.calibrationStep === "number" ? body.calibrationStep : (body.isCalibrated ? 6 : 0),
            passwordHash,
            isTestAccount: isTest || Boolean(guestUser.isTestAccount),
            plan: guestUser.plan === "premium" || guestUser.plan === "pro" ? "premium" : "free",
          },
        });
      }
    }

    // Otherwise create a fresh user
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: cleanUsername,
          displayName: displayName?.trim() || cleanUsername,
          email: cleanEmail || undefined,
          avatar: avatar || "♟",
          skillTier: initialSkill,
          elo: baseElo,
          peakElo: baseElo,
          streak: 0,
          bestStreak: 0,
          isCalibrated: Boolean(body.isCalibrated),
          calibrationStep: typeof body.calibrationStep === "number" ? body.calibrationStep : (body.isCalibrated ? 6 : 0),
          passwordHash,
          isTestAccount: isTest,
          plan: "free",
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
      });
    }

    const safeUser = {
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
      isTestAccount: Boolean(user.isTestAccount),
      plan: user.plan || "free",
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
    });

    response.cookies.set("chess_reel_session", user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
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
        createdAt: true,
        email: true,
        googleId: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isGuest =
      isGuestUserId(user.id) ||
      user.displayName === "Guest Tactician" ||
      (!user.email && !user.googleId && !user.passwordHash);
    if (isGuest) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { email: _email, googleId: _googleId, passwordHash: _passwordHash, ...safeUser } = user;

    return NextResponse.json({
      user: {
        ...safeUser,
        targetElo: safeUser.targetElo ?? 1500,
        lastSolvedDate: safeUser.lastSolvedDate ?? null,
        streakFreezes: safeUser.streakFreezes ?? 0,
        perfectWeekCounter: safeUser.perfectWeekCounter ?? 0,
        isFrozenState: safeUser.isFrozenState ?? false,
        solvedPuzzleIds: safeUser.solvedPuzzleIds ?? [],
        savedPuzzleIds: safeUser.savedPuzzleIds ?? [],
        likedPuzzleIds: safeUser.likedPuzzleIds ?? [],
        autoAdvance: safeUser.autoAdvance ?? false,
        soundEnabled: safeUser.soundEnabled ?? true,
        showCoordinates: safeUser.showCoordinates ?? true,
      },
    });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      avatar,
      displayName,
      username,
      targetElo,
      autoAdvance,
      soundEnabled,
      showCoordinates,
      savedPuzzleIds,
      likedPuzzleIds,
      solvedPuzzleIds,
      streak,
      bestStreak,
      lastSolvedDate,
      streakFreezes,
      perfectWeekCounter,
      isFrozenState,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required." },
        { status: 400 }
      );
    }

    const dataToUpdate: Record<string, any> = {};
    if (avatar !== undefined) dataToUpdate.avatar = avatar;
    if (displayName !== undefined && typeof displayName === "string") {
      dataToUpdate.displayName = displayName.trim();
    }
    if (typeof targetElo === "number") dataToUpdate.targetElo = targetElo;
    if (typeof autoAdvance === "boolean") dataToUpdate.autoAdvance = autoAdvance;
    if (typeof soundEnabled === "boolean") dataToUpdate.soundEnabled = soundEnabled;
    if (typeof showCoordinates === "boolean") dataToUpdate.showCoordinates = showCoordinates;
    if (Array.isArray(savedPuzzleIds)) dataToUpdate.savedPuzzleIds = savedPuzzleIds;
    if (Array.isArray(likedPuzzleIds)) dataToUpdate.likedPuzzleIds = likedPuzzleIds;
    if (Array.isArray(solvedPuzzleIds)) dataToUpdate.solvedPuzzleIds = solvedPuzzleIds;
    if (typeof streak === "number") dataToUpdate.streak = Math.max(0, streak);
    if (typeof bestStreak === "number") dataToUpdate.bestStreak = Math.max(0, bestStreak);
    if (lastSolvedDate !== undefined) dataToUpdate.lastSolvedDate = lastSolvedDate;
    if (typeof streakFreezes === "number") {
      const freezes = Math.min(2, Math.max(0, streakFreezes));
      dataToUpdate.streakFreezes = freezes;
      if (freezes >= 2) dataToUpdate.perfectWeekCounter = 0;
    }
    if (typeof perfectWeekCounter === "number" && (dataToUpdate.streakFreezes ?? 0) < 2) {
      dataToUpdate.perfectWeekCounter = Math.min(7, Math.max(0, perfectWeekCounter));
    }
    if (typeof isFrozenState === "boolean") dataToUpdate.isFrozenState = isFrozenState;

    if (username !== undefined && typeof username === "string") {
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
        return NextResponse.json(
          {
            error:
              "Username must be 3-20 characters long and contain only letters, numbers, and underscores.",
          },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id: userId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "This username is already taken. Please choose another." },
          { status: 409 }
        );
      }

      dataToUpdate.username = cleanUsername;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
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

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
