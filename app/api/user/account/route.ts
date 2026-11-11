import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import { isGuestUserId } from "@/lib/guestAccount";
import { isActiveProAccount } from "@/lib/tierTypes";
import { handleRegisterAccount } from "@/lib/registerAccount";

export async function POST(request: NextRequest) {
  return handleRegisterAccount(request);
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

    const user = await withDbRetry(() =>
      prisma.user.findFirst({
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
          isPro: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          paymentProvider: true,
          providerSubscriptionId: true,
          currentPeriodEnd: true,
          createdAt: true,
          email: true,
          emailVerified: true,
          twoFactorEnabled: true,
          googleId: true,
          passwordHash: true,
        },
      })
    );

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

    const sessionCookie = request.cookies.get("chess_reel_session")?.value;
    const isSelf = Boolean(sessionCookie && (sessionCookie === user.id || sessionCookie.startsWith(user.id)));

    const {
      email: _email,
      googleId: _googleId,
      passwordHash: _passwordHash,
      providerSubscriptionId: _providerSubscriptionId,
      ...safeUser
    } = user;

    const isPro = isActiveProAccount(user);

    return NextResponse.json({
      user: {
        ...safeUser,
        email: isSelf ? user.email : undefined,
        emailVerified: isSelf ? user.emailVerified : undefined,
        twoFactorEnabled: isSelf ? Boolean(user.twoFactorEnabled) : undefined,
        isPro,
        plan: isPro ? "premium" : "free",
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
      { error: sanitizeDbError(error) },
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
        isPro: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        paymentProvider: true,
        currentPeriodEnd: true,
      },
    });

    const isPro = isActiveProAccount(updatedUser);

    return NextResponse.json({
      success: true,
      user: { ...updatedUser, isPro, plan: isPro ? "premium" : "free" },
    });
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return NextResponse.json(
      { error: sanitizeDbError(error) || "Failed to update profile." },
      { status: 500 }
    );
  }
}
