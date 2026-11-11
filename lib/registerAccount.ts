import { NextRequest, NextResponse } from "next/server";
import prisma, { withDbRetry, sanitizeDbError } from "@/lib/prisma";
import { hashPassword, hashSecurityCode } from "@/lib/auth";
import { sendSecurityOtpEmail } from "@/lib/mail";
import { isGuestUserId } from "@/lib/guestAccount";
import { isActiveProAccount } from "@/lib/tierTypes";

export async function handleRegisterAccount(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      guestId,
      username,
      password,
      email,
      displayName,
      avatar,
      skillLevel,
      startingElo,
      elo,
      calibratedElo,
      isCalibrated,
      hasCompletedPlacement,
      calibrationStep,
      puzzleHistory,
    } = body;

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

    // Email validation
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
    }

    // Password validation for manual account creation
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check existing records by username and email
    const existingUsernameUser = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { username: cleanUsername },
      })
    );

    let existingEmailUser = null;
    if (cleanEmail) {
      existingEmailUser = await withDbRetry(() =>
        prisma.user.findUnique({
          where: { email: cleanEmail },
        })
      );
    }

    // Collision Check:
    // If existing record has emailVerified !== null, it is an active verified account -> block registration!
    if (existingUsernameUser && existingUsernameUser.emailVerified !== null && existingUsernameUser.id !== guestId) {
      return NextResponse.json(
        { error: "Username or email is already taken." },
        { status: 409 }
      );
    }

    if (existingEmailUser && existingEmailUser.emailVerified !== null && existingEmailUser.id !== guestId) {
      return NextResponse.json(
        { error: "Username or email is already taken." },
        { status: 409 }
      );
    }

    // Determine target record if updating an unverified orphan or guest record
    let targetUserId: string | null = null;

    if (existingUsernameUser && existingUsernameUser.emailVerified === null) {
      targetUserId = existingUsernameUser.id;
      // If there is ALSO a distinct unverified user matching cleanEmail, prune the duplicate unverified record
      if (existingEmailUser && existingEmailUser.id !== targetUserId && existingEmailUser.emailVerified === null) {
        await withDbRetry(() => prisma.user.delete({ where: { id: existingEmailUser.id } })).catch(() => {});
      }
    } else if (existingEmailUser && existingEmailUser.emailVerified === null) {
      targetUserId = existingEmailUser.id;
    } else if (guestId && !isGuestUserId(guestId)) {
      const guestUser = await withDbRetry(() => prisma.user.findUnique({ where: { id: guestId } }));
      if (guestUser) {
        targetUserId = guestUser.id;
      }
    }

    // Secure password hashing
    const passwordHash = hashPassword(password);

    // Calculate initial Elo baseline based on calibratedElo, elo, startingElo, or skill level
    const userElo =
      typeof calibratedElo === "number" && calibratedElo > 0
        ? calibratedElo
        : typeof elo === "number" && elo > 0
        ? elo
        : typeof startingElo === "number" && startingElo > 0
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
        ? Math.max(400, Math.min(2600, Math.round(userElo)))
        : fallbackBaseElo;

    const shouldMarkCalibrated =
      Boolean(isCalibrated) ||
      Boolean(hasCompletedPlacement) ||
      (typeof calibratedElo === "number" && calibratedElo > 0) ||
      (typeof calibrationStep === "number" && calibrationStep >= 6) ||
      (Array.isArray(puzzleHistory) && puzzleHistory.length >= 6);

    const finalCalibrationStep = shouldMarkCalibrated
      ? 6
      : typeof calibrationStep === "number"
      ? calibrationStep
      : 0;

    // Collect solved puzzle IDs from placement history
    const solvedPuzzleIdsFromHistory: string[] = [];
    if (Array.isArray(puzzleHistory)) {
      for (const item of puzzleHistory) {
        if (item && (item.solved || item.passed) && typeof item.puzzleId === "string") {
          solvedPuzzleIdsFromHistory.push(item.puzzleId);
        }
      }
    }

    const isTest = Boolean(body?.isTestAccount);
    const isDevTest = cleanEmail === "devtest@doomchess.local" || cleanUsername === "devtest";

    // Verification code generation if email provided
    let otpCode: string | null = null;
    let hashedVerificationCode: string | null = null;
    let verificationExp: Date | null = null;
    let emailVerifiedDate: Date | null = null;
    let requiresEmailVerification = false;

    if (cleanEmail) {
      if (isDevTest) {
        emailVerifiedDate = new Date();
      } else {
        otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        hashedVerificationCode = hashSecurityCode(otpCode);
        verificationExp = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        requiresEmailVerification = true;
      }
    }

    let user;

    if (targetUserId) {
      // Overwrite/update unverified orphan record or upgrade guest row
      const existingUser = await withDbRetry(() => prisma.user.findUnique({ where: { id: targetUserId } }));
      const mergedSolvedIds = Array.from(
        new Set([...(existingUser?.solvedPuzzleIds || []), ...solvedPuzzleIdsFromHistory])
      );

      user = await withDbRetry(() =>
        prisma.user.update({
          where: { id: targetUserId },
          data: {
            username: cleanUsername,
            displayName: displayName?.trim() || cleanUsername,
            email: cleanEmail || undefined,
            avatar: avatar || "♟",
            skillTier: initialSkill,
            elo: baseElo,
            peakElo: Math.max(existingUser?.peakElo || baseElo, baseElo),
            streak: existingUser?.streak ?? 0,
            bestStreak: existingUser?.bestStreak ?? 0,
            isCalibrated: shouldMarkCalibrated || Boolean(existingUser?.isCalibrated),
            calibrationStep: shouldMarkCalibrated ? 6 : Math.max(existingUser?.calibrationStep || 0, finalCalibrationStep),
            passwordHash,
            isTestAccount: isTest || Boolean(existingUser?.isTestAccount),
            plan: existingUser?.plan === "premium" || existingUser?.plan === "pro" ? "premium" : "free",
            emailVerified: emailVerifiedDate,
            verificationCode: hashedVerificationCode,
            verificationExp,
            twoFactorEnabled: false,
            solvedPuzzleIds: mergedSolvedIds,
          },
        })
      );
    } else {
      // Fresh user registration
      user = await withDbRetry(() =>
        prisma.user.create({
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
            isCalibrated: shouldMarkCalibrated,
            calibrationStep: finalCalibrationStep,
            passwordHash,
            isTestAccount: isTest,
            plan: "free",
            targetElo: 1500,
            lastSolvedDate: null,
            streakFreezes: 0,
            perfectWeekCounter: 0,
            isFrozenState: false,
            solvedPuzzleIds: solvedPuzzleIdsFromHistory,
            savedPuzzleIds: [],
            likedPuzzleIds: [],
            autoAdvance: false,
            soundEnabled: true,
            showCoordinates: true,
            emailVerified: emailVerifiedDate,
            verificationCode: hashedVerificationCode,
            verificationExp,
            twoFactorEnabled: false,
          },
        })
      );
    }

    const isPro = isActiveProAccount(user);
    const safeUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      email: user.email,
      emailVerified: user.emailVerified,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
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
      plan: isPro ? "premium" : "free",
      isPro,
      subscriptionStatus: user.subscriptionStatus ?? "none",
      subscriptionPlan: user.subscriptionPlan ?? null,
      paymentProvider: user.paymentProvider ?? null,
      currentPeriodEnd: user.currentPeriodEnd ?? null,
    };

    if (requiresEmailVerification && cleanEmail && otpCode) {
      await sendSecurityOtpEmail(cleanEmail, otpCode, "VERIFY_EMAIL");
      return NextResponse.json({
        success: true,
        requiresEmailVerification: true,
        email: cleanEmail,
        user: safeUser,
      });
    }

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
      { error: sanitizeDbError(error) || "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
