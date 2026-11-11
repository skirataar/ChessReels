import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma and mail modules before importing handler
vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return {
    default: mockPrisma,
    withDbRetry: (fn: any) => fn(),
    sanitizeDbError: (err: any) => (err?.message ? String(err.message) : "Database error"),
  };
});

vi.mock("@/lib/mail", () => ({
  sendSecurityOtpEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn().mockReturnValue("mock_hashed_pw"),
  hashSecurityCode: vi.fn().mockReturnValue("mock_hashed_otp"),
  verifySecurityCode: vi.fn().mockReturnValue(true),
}));

import prisma from "@/lib/prisma";
import { handleRegisterAccount } from "@/lib/registerAccount";
import { NextRequest } from "next/server";

function createMockRequest(body: any): NextRequest {
  return new NextRequest("http://localhost:3000/api/user/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Registration & Unverified Collision Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks registration with 409 if username belongs to an already verified account", async () => {
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.username === "existinguser") {
        return {
          id: "verified-user-123",
          username: "existinguser",
          email: "existing@example.com",
          emailVerified: new Date("2025-01-01"),
        } as any;
      }
      return null;
    });

    const req = createMockRequest({
      username: "existinguser",
      email: "newemail@example.com",
      password: "validPassword123!",
    });

    const res = await handleRegisterAccount(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("Username or email is already taken.");
  });

  it("blocks registration with 409 if email belongs to an already verified account", async () => {
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.email === "verified@example.com") {
        return {
          id: "verified-user-456",
          username: "verifiedowner",
          email: "verified@example.com",
          emailVerified: new Date("2025-01-01"),
        } as any;
      }
      return null;
    });

    const req = createMockRequest({
      username: "brandnewuser",
      email: "verified@example.com",
      password: "validPassword123!",
    });

    const res = await handleRegisterAccount(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("Username or email is already taken.");
  });

  it("overwrites and updates unverified orphan record when emailVerified is null (e.g. user correcting typo)", async () => {
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.username === "tacticsguy") {
        return {
          id: "orphan-unverified-1",
          username: "tacticsguy",
          email: "typo@gmial.com", // Typo in initial registration attempt
          emailVerified: null,     // Unverified!
          peakElo: 1000,
          solvedPuzzleIds: [],
        } as any;
      }
      return null;
    });

    (prisma.user.update as any).mockResolvedValue({
      id: "orphan-unverified-1",
      username: "tacticsguy",
      displayName: "tacticsguy",
      email: "corrected@gmail.com",
      emailVerified: null,
      twoFactorEnabled: false,
      elo: 1400,
      peakElo: 1400,
      targetElo: 1500,
      streak: 0,
      bestStreak: 0,
      lastSolvedDate: null,
      streakFreezes: 0,
      perfectWeekCounter: 0,
      isFrozenState: false,
      solvedPuzzleIds: ["puzzle-1"],
      savedPuzzleIds: [],
      likedPuzzleIds: [],
      autoAdvance: false,
      soundEnabled: true,
      showCoordinates: true,
      isCalibrated: true,
      calibrationStep: 6,
      isTestAccount: false,
      plan: "free",
      isPro: false,
      subscriptionStatus: "none",
      subscriptionPlan: null,
      paymentProvider: null,
      currentPeriodEnd: null,
    } as any);

    const req = createMockRequest({
      username: "tacticsguy",
      email: "corrected@gmail.com",
      password: "validPassword123!",
      calibratedElo: 1400,
      isCalibrated: true,
      hasCompletedPlacement: true,
      calibrationStep: 6,
      puzzleHistory: [{ puzzleId: "puzzle-1", puzzleElo: 1000, solved: true }],
    });

    const res = await handleRegisterAccount(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    // Verification OTP required, safeUser returned, session cookie NOT set
    expect(data.requiresEmailVerification).toBe(true);
    expect(data.email).toBe("corrected@gmail.com");
    expect(data.user.isCalibrated).toBe(true);
    expect(data.user.elo).toBe(1400);

    // Verify update was called targeting the unverified orphan record ID
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "orphan-unverified-1" },
        data: expect.objectContaining({
          username: "tacticsguy",
          email: "corrected@gmail.com",
          isCalibrated: true,
          calibrationStep: 6,
          elo: 1400,
        }),
      })
    );
  });

  it("persists completed 6-puzzle placement calibration on fresh account signup", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    (prisma.user.create as any).mockResolvedValue({
      id: "fresh-user-789",
      username: "newchampion",
      displayName: "newchampion",
      email: "champion@example.com",
      emailVerified: null,
      twoFactorEnabled: false,
      elo: 1650,
      peakElo: 1650,
      targetElo: 1500,
      streak: 0,
      bestStreak: 0,
      lastSolvedDate: null,
      streakFreezes: 0,
      perfectWeekCounter: 0,
      isFrozenState: false,
      solvedPuzzleIds: ["p1", "p2", "p3", "p4", "p5", "p6"],
      savedPuzzleIds: [],
      likedPuzzleIds: [],
      autoAdvance: false,
      soundEnabled: true,
      showCoordinates: true,
      isCalibrated: true,
      calibrationStep: 6,
      isTestAccount: false,
      plan: "free",
      isPro: false,
      subscriptionStatus: "none",
      subscriptionPlan: null,
      paymentProvider: null,
      currentPeriodEnd: null,
    } as any);

    const req = createMockRequest({
      username: "newchampion",
      email: "champion@example.com",
      password: "validPassword123!",
      calibratedElo: 1650,
      hasCompletedPlacement: true,
      isCalibrated: true,
      calibrationStep: 6,
      puzzleHistory: [
        { puzzleId: "p1", solved: true },
        { puzzleId: "p2", solved: true },
        { puzzleId: "p3", solved: true },
        { puzzleId: "p4", solved: true },
        { puzzleId: "p5", solved: true },
        { puzzleId: "p6", solved: true },
      ],
    });

    const res = await handleRegisterAccount(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.requiresEmailVerification).toBe(true);
    expect(data.user.isCalibrated).toBe(true);
    expect(data.user.calibrationStep).toBe(6);
    expect(data.user.elo).toBe(1650);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: "newchampion",
          email: "champion@example.com",
          isCalibrated: true,
          calibrationStep: 6,
          elo: 1650,
          solvedPuzzleIds: ["p1", "p2", "p3", "p4", "p5", "p6"],
        }),
      })
    );
  });
});
